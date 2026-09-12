/* ══════════════════════════════ Plain text ══════════════════════════════
 *
 * The `text/plain` half of a multipart message. Built from the document rather than by stripping
 * the compiled HTML: a block knows how it wants to read as text, and a stripped table is a wall of
 * run-together words.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

import type { CompileOptions, EmailDocument } from "../types";
import type { CompilerDeps } from "./compile";
import { columnWidths } from "../document/operations";
import { escapeHtml, safeUrl, stripTags, styleAttr } from "../util/html";

export function toPlainText(doc: EmailDocument, deps: CompilerDeps, options: CompileOptions = {}): string {
  const chunks: string[] = [];

  for (const row of doc.rows) {
    if (row.style.hideOnDesktop) continue;
    const widths = columnWidths(row, doc.settings.contentWidth);

    for (let i = 0; i < row.columns.length; i += 1) {
      for (const block of row.columns[i]!.blocks) {
        const definition = deps.blocks.get(block.type);
        if (!definition) continue;

        const ctx = {
          block,
          content: block.content ?? {},
          style: block.style ?? {},
          settings: doc.settings,
          width: widths[i] ?? doc.settings.contentWidth,
          esc: escapeHtml,
          escAttr: escapeHtml,
          url: (value: unknown) => safeUrl(value),
          styleAttr,
          preview: false,
        };

        let text: string;
        try {
          text = definition.text ? definition.text(ctx as any) : stripTags(definition.render(ctx as any));
        } catch {
          text = "";
        }
        const trimmed = stripTags(text).trim();
        if (trimmed) chunks.push(trimmed);
      }
    }
  }

  let out = chunks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();

  const merge = deps.merge;
  if (merge && options.sample) out = merge.sample(out);
  else if (merge && options.data) out = merge.render(out, options.data);

  return out;
}
