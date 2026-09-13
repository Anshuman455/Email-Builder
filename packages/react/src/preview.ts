/* ═══ Block preview ═══
 *
 * The canvas paints one block at a time, so it cannot use `editor.compile()` — that returns the
 * whole document. This builds the same `RenderContext` core's compiler builds, with `preview`
 * on and `sample` bound to the merge registry, so what the author sees on the canvas is the
 * markup that will be mailed.
 *
 * A block's `render` is host-supplied code. A throw here would take the whole canvas down, so a
 * failure degrades to the same placeholder core's compiler emits. */

import {
  columnWidths,
  escapeAttr,
  escapeHtml,
  applyMobileStyle,
  safeUrl,
  sanitizeBlockContent,
  sanitizeHtml,
  styleAttr,
  type Block,
  type BlockDefinition,
  type EmailDocument,
  type RenderContext,
  type Row,
} from "@email-builder/core";
import type { Editor } from "@email-builder/engine";

export interface BlockPreviewInput {
  editor: Editor;
  block: Block;
  row: Row;
  columnIndex: number;
}

export function compileBlockPreview({ editor, block, row, columnIndex }: BlockPreviewInput): string {
  const definition = editor.blocks.get(block.type);
  if (!definition) {
    return `<div class="eb-placeholder eb-placeholder--error">Unknown block type "${escapeHtml(block.type)}"</div>`;
  }

  const document = editor.getDocument();
  const context = makeContext(editor, document, block, row, columnIndex);
  /* Same policy as core's compiler: rich-text fields are cleaned before rendering, and an HTML
     block's output is cleaned after. This canvas is a live DOM in the host's origin. */
  context.content = sanitizeBlockContent(definition, context.content);
  /* In the canvas's Mobile view, show the block with its mobile overrides applied. */
  if (editor.state.get().device === "mobile") context.style = applyMobileStyle(context.style);
  const render = definition.preview ?? definition.render;

  try {
    const html = render(context) ?? "";
    return block.type === "html" ? sanitizeHtml(html) : html;
  } catch {
    return `<div class="eb-placeholder eb-placeholder--error">"${escapeHtml(definition.label)}" failed to render</div>`;
  }
}

/** Identical to core's `makeContext`, plus the column-width arithmetic core's row renderer does:
 *  the width a block may fill is its column minus that column's own horizontal padding. */
function makeContext(
  editor: Editor,
  document: EmailDocument,
  block: Block,
  row: Row,
  columnIndex: number,
): RenderContext {
  const settings = document.settings;
  const widths = columnWidths(row, settings.contentWidth);
  const column = row.columns[columnIndex];
  const columnWidth = widths[columnIndex] ?? settings.contentWidth;
  const padding = column?.style.padding;
  const width = Math.max(0, columnWidth - (padding?.left ?? 0) - (padding?.right ?? 0));
  const merge = editor.merge;

  return {
    block,
    content: block.content ?? {},
    style: block.style ?? {},
    settings,
    width,
    esc: escapeHtml,
    escAttr: escapeAttr,
    url: (value: unknown) => safeUrl(value),
    styleAttr,
    preview: true,
    sample: undefined,
  };
}

/** The label the palette and the drag ghost show for a block type. */
export function blockLabel(definition: BlockDefinition | null, fallback: string): string {
  return definition?.label ?? fallback;
}
