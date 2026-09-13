/* ═══ useEmailBuilder ═══
 *
 * Builds the registries and the engine editor, exactly once, and keeps the host's callbacks in
 * refs: an inline `onChange={doc => …}` must not tear down the editor and lose the undo stack on
 * every render. */

import { useEffect, useRef, useState } from "react";
import {
  setup,
  type BlockDefinition,
  type EmailDocument,
  type MergeField,
  type MergeSyntax,
} from "@email-builder/core";
import { createEditor, type Adapter, type Editor } from "@email-builder/engine";
import type { FontDefinition } from "@email-builder/core";

export interface UseEmailBuilderOptions {
  /** Any shape; normalized and back-filled by the engine. */
  document?: unknown;
  /** Added on top of the built-ins. */
  blocks?: BlockDefinition[];
  excludeBlocks?: string[];
  mergeFields?: MergeField[];
  mergeSyntax?: MergeSyntax;
  /** Brand and web fonts, each with a web-safe fallback. */
  fonts?: FontDefinition[];
  adapter?: Adapter;
  mode?: string;
  onSave?: (document: EmailDocument) => Promise<void> | void;
  onChange?: (document: EmailDocument) => void;
  onReady?: (editor: Editor) => void;
  autosave?: { debounceMs?: number; maxWaitMs?: number; enabled?: boolean };
}

export function useEmailBuilder(options: UseEmailBuilderOptions = {}): Editor {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /* ── Build, destroy, rebuild ──
     `destroy()` detaches the drag engine's window listeners for good, so a remount (React's
     development double-invoke, or an Offscreen tree waking up) has to build a fresh editor
     rather than reuse the corpse. */
  const [generation, setGeneration] = useState(0);
  const cache = useRef<{ generation: number; editor: Editor } | null>(null);
  const destroyed = useRef(false);

  if (!cache.current || cache.current.generation !== generation) {
    cache.current = { generation, editor: build(optionsRef) };
    destroyed.current = false;
  }
  const editor = cache.current.editor;

  useEffect(() => {
    if (destroyed.current) {
      setGeneration((value) => value + 1);
      return;
    }
    optionsRef.current.onReady?.(editor);
    return () => {
      destroyed.current = true;
      editor.destroy();
    };
  }, [editor]);

  /* ── Document handed in from outside ──
     Silent, because a document arriving from the host (a fetch resolving, a different template
     picked) is not an author edit and must not become an undo step. */
  const lastDocument = useRef(options.document);
  useEffect(() => {
    if (options.document === undefined || options.document === lastDocument.current) return;
    lastDocument.current = options.document;
    editor.replaceDocument(options.document, { silent: true });
  }, [editor, options.document]);

  return editor;
}

function build(optionsRef: { current: UseEmailBuilderOptions }): Editor {
  const options = optionsRef.current;
  const { blocks, merge, fonts } = setup({
    blocks: options.blocks,
    excludeBlocks: options.excludeBlocks,
    mergeFields: options.mergeFields,
    mergeSyntax: options.mergeSyntax,
    fonts: options.fonts,
  });

  return createEditor({
    document: options.document,
    blocks,
    merge,
    fonts,
    adapter: options.adapter,
    mode: options.mode,
    autosave: options.autosave,
    /* Passed only when the host actually saves — the engine enables autosave off the presence of
       this callback, and a no-op save would report "Saved" for work nobody persisted. */
    save: options.onSave ? (document) => optionsRef.current.onSave?.(document) : undefined,
    onChange: (document) => optionsRef.current.onChange?.(document),
  });
}
