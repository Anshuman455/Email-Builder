/* ═══ Block preview ═══
 *
 * The canvas paints one block at a time, so it cannot use `compile()` — that returns the whole
 * document. This builds the same RenderContext the compiler builds, with `preview: true`, so the
 * canvas and the inbox render from one code path and cannot drift.
 *
 * A block that throws must cost the author that block, not the document, hence the try/catch. */

import {
  escapeAttr,
  escapeHtml,
  safeUrl,
  sanitizeHtml,
  styleAttr,
  type Block,
  type DocumentSettings,
  type RenderContext,
} from "@email-builder/core";
import type { Editor } from "@email-builder/engine";

export interface BlockPreviewOptions {
  editor: Editor;
  block: Block;
  settings: DocumentSettings;
  /** Column width minus the column's own horizontal padding — what the block gets to fill. */
  width: number;
}

export function compileBlockPreview({ editor, block, settings, width }: BlockPreviewOptions): string {
  const definition = editor.blocks.get(block.type);

  /* An unregistered type is a host configuration problem, not a reason to lose the document. */
  if (!definition) {
    return `<div class="eb-placeholder eb-placeholder--error">Unknown block type "${escapeHtml(block.type)}"</div>`;
  }

  const merge = editor.merge;
  const context: RenderContext = {
    block,
    content: block.content ?? {},
    style: block.style ?? {},
    settings,
    width,
    esc: escapeHtml,
    escAttr: escapeAttr,
    url: (value) => safeUrl(value),
    styleAttr,
    preview: true,
    sample: merge ? (text: string) => merge.sample(text) : undefined,
  };

  try {
    const html = (definition.preview ?? definition.render)(context) ?? "";
    /* Author-supplied markup is sanitised on the way to the canvas exactly as the compiler
       sanitises it on the way to the inbox. */
    return block.type === "html" ? sanitizeHtml(html) : html;
  } catch {
    return `<div class="eb-placeholder eb-placeholder--error">"${escapeHtml(definition.label)}" failed to render</div>`;
  }
}
