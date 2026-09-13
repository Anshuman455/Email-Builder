/* ═══ EmailBuilder ═══
 *
 * The one component most hosts need. Wires the engine, provides context, mounts the full editor
 * chrome (palette, canvas with its command bar, inspector, drag layer) and handles keyboard shortcuts.
 *
 * Props are identical in React and Vue (VIEW-CONTRACT.md). */

import { useEffect, useRef, useState } from "react";
import type { BlockDefinition, MergeField, MergeSyntax } from "@email-builder/core";
import type { Adapter, Editor, ToolbarAction } from "@email-builder/engine";
import { EditorProvider, type BuilderTheme } from "../context";
import { useEmailBuilder } from "../hooks/useEmailBuilder";
import { BuilderPalette } from "./BuilderPalette";
import { BuilderCanvas } from "./BuilderCanvas";
import { BuilderInspector } from "./BuilderInspector";
import { BuilderPreview } from "./BuilderPreview";
import { BuilderCodeView } from "./BuilderCodeView";
import { DragLayer } from "./DragLayer";
import type { FontDefinition } from "@email-builder/core";
import { handleEditorCopy, handleEditorPaste, loadFonts } from "@email-builder/engine";

export interface EmailBuilderProps {
  document?: unknown;
  blocks?: BlockDefinition[];
  excludeBlocks?: string[];
  mergeFields?: MergeField[];
  mergeSyntax?: MergeSyntax;
  /** Brand and web fonts, each with a web-safe fallback for clients that can't load them. */
  fonts?: FontDefinition[];
  adapter?: Adapter;
  mode?: string;
  theme?: BuilderTheme;
  onSave?: (doc: unknown) => Promise<void> | void;
  onChange?: (doc: unknown) => void;
  onReady?: (editor: Editor) => void;
  autosave?: { debounceMs?: number; maxWaitMs?: number; enabled?: boolean };
  showPalette?: boolean;
  showInspector?: boolean;
  /** Show the command bar (undo/redo, Desktop/Mobile, Code, Preview) above the email. Default true. */
  showToolbar?: boolean;
  /** Extra icon buttons in the command bar — attachments, AI, anything. */
  toolbarActions?: ToolbarAction[];
  className?: string;
}

type OverlayKind = "preview" | "code" | null;

export function EmailBuilder({
  document,
  blocks,
  excludeBlocks,
  mergeFields,
  mergeSyntax,
  fonts,
  adapter,
  mode,
  theme = "light",
  onSave,
  onChange,
  onReady,
  autosave,
  showPalette = true,
  showInspector = true,
  showToolbar = true,
  toolbarActions,
  className,
}: EmailBuilderProps) {
  const editor = useEmailBuilder({
    document,
    blocks,
    excludeBlocks,
    mergeFields,
    mergeSyntax,
    fonts,
    adapter,
    mode,
    onSave,
    onChange,
    onReady,
    autosave,
  });

  const [overlay, setOverlay] = useState<OverlayKind>(null);

  /* Load brand fonts into the page so the canvas shows them. */
  useEffect(() => loadFonts(editor.fonts), [editor]);
  const rootRef = useRef<HTMLDivElement>(null);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      )
        return;

      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        editor.undo();
      } else if (mod && (event.key === "y" || (event.key === "z" && event.shiftKey))) {
        event.preventDefault();
        editor.redo();
      } else if (mod && event.key === "s") {
        event.preventDefault();
        editor.save();
      } else if (mod && event.key === "d") {
        event.preventDefault();
        editor.duplicateSelected();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        /* Every selected block or row, not just the last one clicked. */
        if (editor.removeSelected()) event.preventDefault();
      } else if (event.key === "Escape") {
        event.preventDefault();
        editor.endInlineEdit();
        editor.select(null);
      } else if (event.key === "Tab") {
        event.preventDefault();
        editor.selectNext(event.shiftKey ? -1 : 1);
      } else if (event.key === "Enter") {
        const sel = editor.getSelection();
        if (sel?.kind === "block") {
          event.preventDefault();
          editor.beginInlineEdit(sel.id);
        }
      }
    };

    /* Copy, cut and paste blocks or rows — between emails too — through the system clipboard. */
    const onCopy = (event: ClipboardEvent) => handleEditorCopy(editor, event);
    const onCut = (event: ClipboardEvent) => handleEditorCopy(editor, event, true);
    const onPaste = (event: ClipboardEvent) => handleEditorPaste(editor, event);

    root.addEventListener("keydown", onKeyDown);
    root.addEventListener("copy", onCopy);
    root.addEventListener("cut", onCut);
    root.addEventListener("paste", onPaste);
    return () => {
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("copy", onCopy);
      root.removeEventListener("cut", onCut);
      root.removeEventListener("paste", onPaste);
    };
  }, [editor]);

  const rootClasses = ["email-builder", "eb-root", className ?? ""].filter(Boolean).join(" ");

  return (
    <EditorProvider editor={editor} theme={theme}>
      <div
        ref={rootRef}
        className={rootClasses}
        data-eb-theme={theme}
        tabIndex={-1}
      >
        <div className="email-builder__body eb-body">
          {showPalette && <BuilderPalette />}
          <BuilderCanvas
            showToolbar={showToolbar}
            toolbarActions={toolbarActions}
            onPreview={() => setOverlay("preview")}
            onCodeView={() => setOverlay("code")}
          />
          {showInspector && <BuilderInspector />}
        </div>
        <DragLayer />
        {overlay === "preview" && <BuilderPreview onClose={() => setOverlay(null)} />}
        {overlay === "code" && <BuilderCodeView onClose={() => setOverlay(null)} />}
      </div>
    </EditorProvider>
  );
}
