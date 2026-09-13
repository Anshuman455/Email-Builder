/* ══════════════════════════════ Compiler ══════════════════════════════
 *
 * design JSON → email-safe HTML + plain text.
 *
 * One implementation, used by the canvas preview and by the send path. What an author sees and
 * what a recipient gets differ only by the `preview` flag, so they cannot drift.
 *
 * ── Everything is a table ─────────────────────────────────────────────────────────────────────
 * Outlook 2007-2019 renders with Word's engine: no flexbox, no grid, no float, unreliable margins.
 * Nested tables with explicit pixel widths are the only layout primitive that behaves the same in
 * every inbox, and that is why this file looks like 2003.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

import type {
  Block,
  BlockDefinition,
  CompileOptions,
  CompileResult,
  DocumentSettings,
  EmailDocument,
  RenderContext,
  Row,
} from "../types";
import type { BlockRegistry } from "../registry";
import type { MergeRegistry } from "../merge/registry";
import { columnWidths } from "../document/operations";
import { escapeAttr, escapeHtml, minifyHtml, mso, notMso, safeUrl, stripTags, styleAttr } from "../util/html";
import { sanitizeBlockContent, sanitizeHtml } from "./sanitize";
import { wrapDocument } from "./shell";
import { toPlainText } from "./plain-text";

export interface CompilerDeps {
  blocks: BlockRegistry;
  merge?: MergeRegistry;
}

/* ────────────────────────────── Render context ────────────────────────────── */

function makeContext(
  block: Block,
  settings: DocumentSettings,
  width: number,
  preview: boolean,
  merge?: MergeRegistry,
): RenderContext {
  return {
    block,
    content: block.content ?? {},
    style: block.style ?? {},
    settings,
    width,
    esc: escapeHtml,
    escAttr: escapeAttr,
    url: (value) => safeUrl(value),
    styleAttr,
    preview,
    sample: merge ? (text: string) => merge.sample(text) : undefined,
  };
}

/* ────────────────────────────── Blocks ────────────────────────────── */

function renderBlock(
  block: Block,
  definition: BlockDefinition | null,
  settings: DocumentSettings,
  width: number,
  options: { preview: boolean; merge?: MergeRegistry },
): string {
  if (!definition) {
    /* An unregistered type is a host configuration problem, not a reason to lose the document.
       In preview it says so; in an email it renders nothing rather than a diagnostic. */
    return options.preview
      ? `<div class="eb-placeholder eb-placeholder--error">Unknown block type "${escapeHtml(block.type)}"</div>`
      : "";
  }

  const ctx = makeContext(block, settings, width, options.preview, options.merge);
  /* Rich-text fields hold author (or stored) HTML — clean them before any renderer, built-in or
     host-registered, can interpolate them. */
  ctx.content = sanitizeBlockContent(definition, ctx.content);
  const renderer = options.preview && definition.preview ? definition.preview : definition.render;

  let html: string;
  try {
    html = renderer(ctx) ?? "";
  } catch (error) {
    /* One broken custom block must not take the whole document with it. */
    html = options.preview
      ? `<div class="eb-placeholder eb-placeholder--error">"${escapeHtml(definition.label)}" failed to render</div>`
      : "";
  }

  /* Author-supplied markup is sanitised here rather than inside the block, so the policy is one
     decision and a host cannot opt out of it by registering its own block. */
  if (block.type === "html") html = sanitizeHtml(html);
  return html;
}

/* ────────────────────────────── Rows ────────────────────────────── */

function renderRow(
  row: Row,
  settings: DocumentSettings,
  deps: CompilerDeps,
  options: { preview: boolean },
): string {
  const widths = columnWidths(row, settings.contentWidth);
  const style = row.style;

  const columns = row.columns
    .map((column, index) => {
      const columnWidth = widths[index] ?? settings.contentWidth;
      const inner = Math.max(
        0,
        columnWidth - (column.style.padding.left || 0) - (column.style.padding.right || 0),
      );

      const blocks = column.blocks
        .map((block) =>
          renderBlock(block, deps.blocks.get(block.type), settings, inner, { preview: options.preview, merge: deps.merge }),
        )
        .filter(Boolean)
        .join("");

      const cellStyle = styleAttr({
        width: `${columnWidth}px`,
        padding: `${column.style.padding.top || 0}px ${column.style.padding.right || 0}px ${column.style.padding.bottom || 0}px ${column.style.padding.left || 0}px`,
        backgroundColor:
          column.style.backgroundColor && column.style.backgroundColor !== "transparent"
            ? column.style.backgroundColor
            : undefined,
        borderRadius: column.style.borderRadius ? `${column.style.borderRadius}px` : undefined,
        ...(column.style.border?.width && column.style.border.style !== "none"
          ? { border: `${column.style.border.width}px ${column.style.border.style} ${column.style.border.color}` }
          : {}),
        verticalAlign: column.style.verticalAlign || "top",
      });

      return `<td class="eb-col" width="${columnWidth}" valign="${column.style.verticalAlign || "top"}"${cellStyle}>${blocks || (options.preview ? "" : "&nbsp;")}</td>`;
    })
    .join("");

  const stackClass = style.stackOnMobile && row.columns.length > 1 ? " eb-stack" : "";
  const hideClasses = [style.hideOnMobile ? "eb-hide-mobile" : "", style.hideOnDesktop ? "eb-hide-desktop" : ""]
    .filter(Boolean)
    .join(" ");

  const innerTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="eb-row${stackClass}"><tr>${columns}</tr></table>`;

  const paddedStyle = styleAttr({
    padding: `${style.padding.top || 0}px ${style.padding.right || 0}px ${style.padding.bottom || 0}px ${style.padding.left || 0}px`,
    backgroundColor: style.backgroundColor && style.backgroundColor !== "transparent" ? style.backgroundColor : undefined,
    backgroundImage: style.backgroundImage ? `url('${style.backgroundImage}')` : undefined,
    backgroundSize: style.backgroundImage ? "cover" : undefined,
    backgroundPosition: style.backgroundImage ? "center" : undefined,
    borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
    ...(style.border?.width && style.border.style !== "none"
      ? { border: `${style.border.width}px ${style.border.style} ${style.border.color}` }
      : {}),
  });

  /* A full-width row paints edge to edge but keeps its content at `contentWidth`. Two tables: the
     outer one carries the colour, the inner one the width. */
  if (style.fullWidth) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClasses ? ` class="${hideClasses}"` : ""}${styleAttr({
      backgroundColor: style.backgroundColor !== "transparent" ? style.backgroundColor : undefined,
      backgroundImage: style.backgroundImage ? `url('${style.backgroundImage}')` : undefined,
      backgroundSize: style.backgroundImage ? "cover" : undefined,
    })}><tr><td align="center"><table role="presentation" width="${settings.contentWidth}" cellpadding="0" cellspacing="0" border="0" class="eb-container"${styleAttr({ width: `${settings.contentWidth}px`, maxWidth: `${settings.contentWidth}px` })}><tr><td${paddedStyle}>${innerTable}</td></tr></table></td></tr></table>`;
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClasses ? ` class="${hideClasses}"` : ""}><tr><td${paddedStyle}>${innerTable}</td></tr></table>`;
}

/* ────────────────────────────── Document ────────────────────────────── */

export function compileBody(doc: EmailDocument, deps: CompilerDeps, options: CompileOptions = {}): string {
  const settings = doc.settings;
  const preview = options.preview ?? false;

  const rows = doc.rows.map((row) => renderRow(row, settings, deps, { preview })).join("");
  const footer = options.footerHtml ?? "";

  /* The sheet: a fixed-width table centred in a full-width one. `align="center"` on the outer
     cell rather than `margin:0 auto`, because Outlook ignores auto margins. */
  const sheet = `<table role="presentation" width="${settings.contentWidth}" cellpadding="0" cellspacing="0" border="0" align="center" class="eb-container"${styleAttr({
    width: `${settings.contentWidth}px`,
    maxWidth: `${settings.contentWidth}px`,
    backgroundColor: settings.contentBackgroundColor,
    fontFamily: settings.fontFamily,
    color: settings.textColor,
  })}><tr><td>${rows}${footer}</td></tr></table>`;

  /* Outlook needs a fixed-width wrapper table or the centred sheet drifts left. */
  const outlookOpen = mso(
    `<table role="presentation" width="${settings.contentWidth}" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td>`,
  );
  const outlookClose = mso("</td></tr></table>");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${styleAttr({
    backgroundColor: settings.backgroundColor,
    width: "100%",
  })}><tr><td align="center"${styleAttr({ padding: "0" })}>${outlookOpen}${sheet}${outlookClose}</td></tr></table>`;
}

export function compile(doc: EmailDocument, deps: CompilerDeps, options: CompileOptions = {}): CompileResult {
  const body = compileBody(doc, deps, options);

  let html = options.fragment
    ? body
    : wrapDocument(body, doc.settings, {
        title: (doc.meta as any)?.subject ?? "",
        preheader: (doc.meta as any)?.preheader ?? "",
        headExtra: options.headExtra,
      });

  const merge = deps.merge;
  const usedTokens = merge ? merge.extract(html) : [];

  /* Resolution order matters: sample first (it fills from the catalog), real data second (it
     overrides with the recipient's values). Only one of the two is ever requested. */
  if (merge && options.sample) html = merge.sample(html);
  else if (merge && options.data) html = merge.render(html, options.data, { keepUnresolved: false, transform: escapeHtml });

  if (options.minify) html = minifyHtml(html);

  const text = toPlainText(doc, deps, options);

  return { html, text, usedTokens, bytes: byteLength(html) };
}

function byteLength(value: string): number {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value).length;
  return value.length;
}

/* ────────────────────────────── Layout assembly ──────────────────────────────
 *
 * A template compiled into a reusable frame. Deliberately a string substitution rather than a
 * document merge: it runs once per recipient on the send path, where a tree walk would not be
 * affordable, and the frame has already been compiled and cached by then.
 * ─────────────────────────────────────────────────────────────────────── */

export const CONTENT_SLOT_PLACEHOLDER = "<!--EB:CONTENT_SLOT-->";

export function applyLayout(layoutHtml: string, bodyHtml: string): string {
  if (!layoutHtml) return bodyHtml;
  if (!layoutHtml.includes(CONTENT_SLOT_PLACEHOLDER)) return layoutHtml;
  return layoutHtml.replace(CONTENT_SLOT_PLACEHOLDER, bodyHtml);
}
