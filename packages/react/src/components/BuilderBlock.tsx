/* ═══ BuilderBlock ═══
 *
 * A block on the canvas:
 * Floating action bar:
 *  - Label: Image, Heading, etc.
 *  - drag_indicator
 *  - arrow_upward
 *  - arrow_downward
 *  - content_copy
 *  - delete
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Block, Column, MergeField, Row } from "@email-builder/core";
import { isRichTextField, type Editor } from "@email-builder/engine";
import { useEditor, useTranslator } from "../context";
import { useDraggable, useDroppable } from "../hooks/useDnd";
import { useEditorSelector } from "../hooks/useEditorState";
import { compileBlockPreview } from "../preview";
import { MentionMenu } from "./MentionMenu";
import { Glyph } from "./Glyph";
import { RichTextToolbar } from "./RichTextToolbar";

export interface BuilderBlockProps {
  block: Block;
  row: Row;
  column: Column;
  columnIndex: number;
}

export function BuilderBlock({ block, row, column, columnIndex }: BuilderBlockProps) {
  const editor = useEditor();
  const t = useTranslator();
  const definition = editor.blocks.get(block.type);

  const selected = useEditorSelector(
    (state) => state.selection?.kind === "block" && state.selection.id === block.id,
  );
  const landed = useEditorSelector((state) => state.landedId === block.id);
  const editing = useEditorSelector((state) => state.editingBlockId === block.id);
  const settings = useEditorSelector((state) => state.document.settings);

  const blockIndex = column.blocks.findIndex((b) => b.id === block.id);
  const totalBlocks = column.blocks.length;

  const moveBlock = (dir: number) => {
    const target = blockIndex + dir;
    if (target >= 0 && target < totalBlocks) {
      editor.moveBlock(block.id, column.id, target);
    }
  };

  const drop = useDroppable(
    { kind: "block", blockId: block.id, columnId: column.id },
    { orientation: "vertical" },
  );
  const drag = useDraggable({ kind: "block", blockId: block.id, columnId: column.id });

  const setNode = useCallback(
    (element: HTMLDivElement | null) => {
      drop.setNode(element);
      drag.setNode(element);
    },
    [drop.setNode, drag.setNode],
  );

  const html = useMemo(
    () => compileBlockPreview({ editor, block, row, columnIndex }),
    [editor, block, row, columnIndex, settings],
  );

  const render = useRef<HTMLDivElement | null>(null);
  const { mentionState, handleSelectMention, handleCloseMention } = useInlineEdit({
    editor,
    block,
    editing,
    inlineEditKey: definition?.inlineEditKey,
    host: render,
  });

  const classes = [
    "builder-block",
    "eb-block",
    selected ? "builder-block--selected eb-block--selected" : "",
    landed ? "builder-block--landed eb-block--landed" : "",
    editing ? "builder-block--editing eb-block--editing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={setNode}
      className={classes}
      aria-selected={selected}
      onClick={(event) => {
        event.stopPropagation();
        editor.select({ kind: "block", id: block.id });
        if (definition?.inlineEditKey) {
          editor.beginInlineEdit(block.id);
        }
      }}
      onDoubleClick={() => {
        if (definition?.inlineEditKey) editor.beginInlineEdit(block.id);
      }}
    >
      {drop.isOver && (
        <div className={`builder-drop-indicator ${drop.edge === "after" ? "builder-drop-indicator--end" : ""}`}>
          <div className="builder-drop-indicator__line" />
          <span className="builder-drop-indicator__pip builder-drop-indicator__pip--left" />
          <span className="builder-drop-indicator__pill">
            <Glyph name="add" style={{ fontSize: 13, marginRight: 4 }} />
            {t(drop.edge === "after" ? "block.dropBelow" : "block.dropAbove")}
          </span>
          <span className="builder-drop-indicator__pip builder-drop-indicator__pip--right" />
        </div>
      )}

      {/* Floating Toolbar */}
      <div className="builder-block__toolbar eb-block__toolbar" data-eb-no-drag>
        <span className="builder-block__label eb-block__label">{definition?.label ?? block.type}</span>

        <button
          type="button"
          ref={drag.setHandle}
          data-eb-drag-handle
          className="builder-block__action eb-block__toolbar-btn eb-block__toolbar-btn--drag"
          aria-label={t("block.move")}
          title={t("block.move")}
          aria-roledescription="draggable"
        >
          <Glyph name="drag_indicator" />
        </button>

        <button
          type="button"
          className="builder-block__action eb-block__toolbar-btn"
          aria-label={t("block.moveUp")}
          disabled={blockIndex === 0}
          title={t("block.moveUp")}
          onClick={(event) => {
            event.stopPropagation();
            moveBlock(-1);
          }}
        >
          <Glyph name="arrow_upward" />
        </button>

        <button
          type="button"
          className="builder-block__action eb-block__toolbar-btn"
          aria-label={t("block.moveDown")}
          disabled={blockIndex >= totalBlocks - 1}
          title={t("block.moveDown")}
          onClick={(event) => {
            event.stopPropagation();
            moveBlock(1);
          }}
        >
          <Glyph name="arrow_downward" />
        </button>

        <button
          type="button"
          className="builder-block__action eb-block__toolbar-btn"
          aria-label={t("block.duplicate")}
          title={t("block.duplicate")}
          onClick={(event) => {
            event.stopPropagation();
            editor.duplicateBlock(block.id);
          }}
        >
          <Glyph name="content_copy" />
        </button>

        <button
          type="button"
          className="builder-block__action eb-block__toolbar-btn builder-block__action--delete eb-block__toolbar-btn--danger"
          aria-label={t("block.delete")}
          title={t("block.delete")}
          onClick={(event) => {
            event.stopPropagation();
            editor.removeBlock(block.id);
          }}
        >
          <Glyph name="delete" />
        </button>
      </div>

      <div className="eb-block__render" ref={render} dangerouslySetInnerHTML={{ __html: html }} />

      {/* Formatting bar — only for rich-text fields; headings and labels are stored as plain text. */}
      {editing && isRichTextField(definition, definition?.inlineEditKey) && <RichTextToolbar host={render} />}

      {mentionState.open && (
        <MentionMenu
          editor={editor}
          coords={mentionState.coords}
          query={mentionState.query}
          onSelect={handleSelectMention}
          onClose={handleCloseMention}
        />
      )}
    </div>
  );
}

/* ── Inline editing ── */
interface InlineEditInput {
  editor: Editor;
  block: Block;
  editing: boolean;
  inlineEditKey: string | undefined;
  host: { current: HTMLElement | null };
}

interface MentionState {
  open: boolean;
  coords: { top: number; left: number };
  query: string;
  atIndex: number;
  textNode: Node | null;
}

function useInlineEdit({ editor, block, editing, inlineEditKey, host }: InlineEditInput) {
  const [mentionState, setMentionState] = useState<MentionState>({
    open: false,
    coords: { top: 0, left: 0 },
    query: "",
    atIndex: -1,
    textNode: null,
  });

  const mentionStateRef = useRef(mentionState);
  mentionStateRef.current = mentionState;

  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!editing || !inlineEditKey) return;
    const target = resolveInlineTarget(host.current);
    if (!target) {
      editor.endInlineEdit();
      return;
    }
    targetRef.current = target;

    target.setAttribute("data-eb-inline", "");
    target.contentEditable = "true";

    // Focus immediately if not already focused
    if (document.activeElement !== target) {
      target.focus();
    }

    const checkMention = () => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !sel.isCollapsed) {
        setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
        return;
      }
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) {
        setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
        return;
      }

      const text = node.textContent ?? "";
      const offset = range.startOffset;
      const textBefore = text.slice(0, offset);
      const atIndex = textBefore.lastIndexOf("@");
      if (atIndex === -1) {
        setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
        return;
      }

      const query = textBefore.slice(atIndex + 1);
      if (/[\s\n\r]/.test(query)) {
        setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
        return;
      }

      let coords = { top: 0, left: 0 };
      try {
        const cloneRange = range.cloneRange();
        cloneRange.setStart(node, atIndex);
        cloneRange.setEnd(node, offset);
        const rect = cloneRange.getBoundingClientRect();
        if (rect && rect.top > 0) {
          coords = { top: rect.bottom, left: rect.left };
        } else {
          const tRect = target.getBoundingClientRect();
          coords = { top: tRect.bottom, left: tRect.left + 20 };
        }
      } catch {
        const tRect = target.getBoundingClientRect();
        coords = { top: tRect.bottom, left: tRect.left + 20 };
      }

      setMentionState({
        open: true,
        coords,
        query,
        atIndex,
        textNode: node,
      });
    };

    const commit = () => {
      const isHeading = block.type === "heading";
      const val = isHeading ? (target.innerText || target.textContent || "") : target.innerHTML;
      editor.updateContent(block.id, { [inlineEditKey]: val }, "inline");
      editor.endInlineEdit();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (mentionStateRef.current.open) {
        if (
          event.key === "ArrowDown" ||
          event.key === "ArrowUp" ||
          event.key === "Enter" ||
          event.key === "Tab"
        ) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setMentionState((prev) => ({ ...prev, open: false }));
          return;
        }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        commit();
      }
    };

    const onInput = () => {
      checkMention();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        checkMention();
      }
    };

    const onBlur = (event: FocusEvent) => {
      /* Focus moving into the merge menu or the formatting bar is still part of this edit. */
      if ((event.relatedTarget as HTMLElement)?.closest?.(".eb-mention-menu, .eb-rte")) return;
      if (mentionStateRef.current.open) return;
      commit();
    };

    target.addEventListener("blur", onBlur);
    target.addEventListener("keydown", onKeyDown);
    target.addEventListener("input", onInput);
    target.addEventListener("keyup", onKeyUp);

    return () => {
      target.removeEventListener("blur", onBlur);
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("input", onInput);
      target.removeEventListener("keyup", onKeyUp);
      target.contentEditable = "false";
      target.removeAttribute("data-eb-inline");
    };
  }, [editor, block.id, block.type, editing, inlineEditKey, host]);

  const handleSelectMention = (field: MergeField) => {
    const state = mentionStateRef.current;
    const target = targetRef.current;
    if (!state.open || !state.textNode || !target || !inlineEditKey) return;

    const formatted = editor.merge ? editor.merge.format(field.token) : `{{${field.token}}}`;

    const textNode = state.textNode;
    const fullText = textNode.textContent ?? "";
    const before = fullText.slice(0, state.atIndex);
    const after = fullText.slice(state.atIndex + 1 + state.query.length);
    const newText = before + formatted + " " + after;
    textNode.textContent = newText;

    // Move caret after inserted token
    const sel = window.getSelection();
    if (sel) {
      try {
        const newRange = document.createRange();
        const newOffset = Math.min(before.length + formatted.length + 1, textNode.textContent.length);
        newRange.setStart(textNode, newOffset);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } catch {
        // Fallback
      }
    }

    // Save content change to editor
    const isHeading = block.type === "heading";
    const val = isHeading ? (target.innerText || target.textContent || "") : target.innerHTML;
    editor.updateContent(block.id, { [inlineEditKey]: val }, "inline");

    setMentionState((prev) => ({ ...prev, open: false }));
    target.focus();
  };

  const handleCloseMention = () => {
    setMentionState((prev) => ({ ...prev, open: false }));
    targetRef.current?.focus();
  };

  return {
    mentionState,
    handleSelectMention,
    handleCloseMention,
  };
}

function resolveInlineTarget(host: HTMLElement | null): HTMLElement | null {
  if (!host) return null;
  const marked = host.querySelector<HTMLElement>("[data-eb-inline]");
  if (marked) return marked;
  const cell = host.querySelector("td");
  const first = cell?.firstElementChild;
  return first instanceof HTMLElement ? first : null;
}
