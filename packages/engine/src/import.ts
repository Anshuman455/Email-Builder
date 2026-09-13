/* ═══ HTML import ═══
 *
 * Turns outside HTML — a pasted web page, an exported email, the builder's own output — into rows of
 * ordinary, editable blocks: headings, text, images, buttons, lists and dividers. Everything else is
 * dropped rather than carried along as opaque markup.
 *
 * Uses the browser's own parser (`DOMParser`), not regexes: a document created that way is inert —
 * scripts do not run and images do not load — and it reads markup exactly as the browser would.
 * Where there is no DOM (Node, workers), `htmlToRows` returns null and the caller falls back to a
 * single sanitised HTML block. */

import type { Block, BlockRegistry } from "@email-builder/core";

export interface ImportedRow {
  /** Column weights for `addRow`, e.g. `[1]` or `[1, 1]`. */
  spans: number[];
  /** Blocks per column, in order. */
  columns: Block[][];
}

/** Page chrome and app UI that never belongs in an email. */
const NOISE = [
  "script", "style", "link", "meta", "noscript", "template", "svg", "math", "iframe", "object", "embed",
  "form", "input", "select", "textarea", "label", "button", "nav", "aside", "dialog", "canvas", "video", "audio",
  "[hidden]", '[aria-hidden="true"]', '[role="navigation"]', '[role="button"]',
  /* Icon fonts render their glyph name as text ("dashboard", "chevron_right") without the font. */
  '[class*="material-symbols"]', '[class*="material-icons"]', 'i[class*="icon"]', 'span[class*="icon"]', 'i[class*="fa-"]',
].join(",");

const INLINE = new Set(["a", "b", "strong", "i", "em", "u", "s", "span", "br", "small", "sup", "sub", "font", "code", "mark", "abbr", "time"]);
const KEEP_INLINE = new Set(["b", "strong", "i", "em", "u", "s", "br", "sup", "sub", "small", "code", "mark"]);
const TEXT_BLOCK = new Set(["p", "blockquote", "pre", "address", "figcaption", "dd", "dt"]);
const HEADING = /^h[1-6]$/;

export function htmlToRows(html: string, blocks: BlockRegistry): ImportedRow[] | null {
  if (typeof DOMParser === "undefined") return null;

  /* Parsed raw, not pre-sanitised: a regex pass would unwrap <head> and <title> and leak their text
     into the body. Nothing from this document is reused as markup — blocks are rebuilt from
     text, whitelisted inline tags and checked URLs. */
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll(NOISE).forEach((element) => element.remove());
  doc.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(element.getAttribute("style") ?? "")) element.remove();
  });

  const rows: ImportedRow[] = [];
  let flow: Block[] | null = null;
  let inline: Node[] = [];
  const headingLevels = levelsOf(blocks);

  const place = (block: Block | null) => {
    if (!block) return;
    if (!flow) {
      flow = [];
      rows.push({ spans: [1], columns: [flow] });
    }
    flow.push(block);
  };

  const flushInline = (context: Element) => {
    const nodes = inline;
    inline = [];
    const markup = nodes.map(inlineHtml).join("").replace(/\s+/g, " ").trim();
    if (!stripTags(markup)) return;
    place(textBlock(blocks, markup, alignOf(context)));
  };

  const walk = (parent: Element, sink: (block: Block | null) => void) => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === 3) {
        inline.push(node);
        continue;
      }
      if (node.nodeType !== 1) continue;
      const element = node as Element;
      const tag = element.tagName.toLowerCase();

      if (tag === "img") {
        flushInline(parent);
        sink(imageBlock(blocks, element, null));
      } else if (tag === "a" && isImageLink(element)) {
        flushInline(parent);
        sink(imageBlock(blocks, element.querySelector("img")!, element));
      } else if (tag === "a" && looksLikeButton(element)) {
        flushInline(parent);
        sink(buttonBlock(blocks, element));
      } else if (INLINE.has(tag)) {
        inline.push(element);
      } else if (HEADING.test(tag)) {
        flushInline(parent);
        sink(headingBlock(blocks, element, headingLevels));
      } else if (TEXT_BLOCK.has(tag)) {
        flushInline(parent);
        if (element.querySelector("img") && !stripTags(element.textContent ?? "")) walk(element, sink);
        else {
          const markup = Array.from(element.childNodes).map(inlineHtml).join("").replace(/\s+/g, " ").trim();
          if (stripTags(markup)) sink(textBlock(blocks, markup, alignOf(element)));
        }
      } else if (tag === "ul" || tag === "ol") {
        flushInline(parent);
        sink(listBlock(blocks, element, tag === "ol"));
      } else if (tag === "hr") {
        flushInline(parent);
        sink(blocks.create("divider"));
      } else if (tag === "tr" && sink === place && splitColumns(element)) {
        flushInline(parent);
      } else {
        /* A container — div, section, table, td… — is a paragraph boundary on both sides. */
        flushInline(parent);
        walk(element, sink);
        flushInline(element);
      }
    }
  };

  /* A table row with 2–4 cells that each hold content becomes a multi-column row. */
  const splitColumns = (tr: Element): boolean => {
    const cells = Array.from(tr.children).filter((cell) => /^t[dh]$/i.test(cell.tagName));
    if (cells.length < 2 || cells.length > 4) return false;
    const columns = cells.map((cell) => {
      const collected: Block[] = [];
      const saved = inline;
      inline = [];
      const sink = (block: Block | null) => block && collected.push(block);
      walkInto(cell, sink);
      const rest = inline.map(inlineHtml).join("").replace(/\s+/g, " ").trim();
      if (stripTags(rest)) collected.push(textBlock(blocks, rest, alignOf(cell))!);
      inline = saved;
      return collected.filter(Boolean);
    });
    if (columns.filter((column) => column.length).length < 2) return false;
    flow = null;
    rows.push({ spans: cells.map((cell) => weightOf(cell)), columns });
    return true;
  };

  const walkInto = (element: Element, sink: (block: Block | null) => void) => walk(element, sink);

  walk(doc.body, place);
  flushInline(doc.body);
  return rows.filter((row) => row.columns.some((column) => column.length));
}

/* ── Block builders ── */

function textBlock(blocks: BlockRegistry, html: string, align: string | null): Block | null {
  const block = blocks.create("text");
  if (!block) return null;
  block.content = { ...block.content, html: `<p>${html}</p>` };
  if (align) block.style = { ...block.style, align };
  return block;
}

function headingBlock(blocks: BlockRegistry, element: Element, levels: string[]): Block | null {
  const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  const block = text ? blocks.create("heading") : null;
  if (!block) return null;
  const wanted = Number(element.tagName.slice(1));
  const level = levels.find((l) => Number(l.slice(1)) >= wanted) ?? levels[levels.length - 1] ?? "h2";
  block.content = { ...block.content, text, level };
  const align = alignOf(element);
  if (align) block.style = { ...block.style, align };
  return block;
}

function imageBlock(blocks: BlockRegistry, image: Element, link: Element | null): Block | null {
  const src = (image.getAttribute("src") ?? "").trim();
  if (!isSafeImageSource(src)) return null;
  const block = blocks.create("image");
  if (!block) return null;
  block.content = { ...block.content, src, alt: image.getAttribute("alt") ?? "", href: safeHref(link?.getAttribute("href")) };
  const align = alignOf(image);
  if (align) block.style = { ...block.style, align };
  return block;
}

function buttonBlock(blocks: BlockRegistry, link: Element): Block | null {
  const label = (link.textContent ?? "").replace(/\s+/g, " ").trim();
  const block = label ? blocks.create("button") : null;
  if (!block) return null;
  block.content = { ...block.content, label, href: safeHref(link.getAttribute("href")) || "https://" };
  const style = link.getAttribute("style") ?? "";
  const background = /background(?:-color)?\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\))/i.exec(style)?.[1];
  const color = /(?:^|;)\s*color\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\))/i.exec(style)?.[1];
  block.style = { ...block.style, ...(background ? { buttonColor: background } : {}), ...(color ? { textColor: color } : {}) };
  const align = alignOf(link);
  if (align) block.style = { ...block.style, align };
  return block;
}

function listBlock(blocks: BlockRegistry, list: Element, ordered: boolean): Block | null {
  const items = Array.from(list.children)
    .filter((item) => item.tagName.toLowerCase() === "li")
    .map((item) => ({ text: (item.textContent ?? "").replace(/\s+/g, " ").trim() }))
    .filter((item) => item.text);
  const block = items.length ? blocks.create("list") : null;
  if (!block) return null;
  block.content = { ...block.content, style: ordered ? "number" : "bullet", items };
  return block;
}

/* ── Helpers ── */

/** Inline markup only: bold, italic, links and line breaks survive; every other tag keeps its text. */
function inlineHtml(node: Node): string {
  if (node.nodeType === 3) return escapeText(node.textContent ?? "");
  if (node.nodeType !== 1) return "";
  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  const inner = Array.from(element.childNodes).map(inlineHtml).join("");
  if (tag === "br") return "<br>";
  if (tag === "a") {
    const href = safeHref(element.getAttribute("href"));
    return href ? `<a href="${escapeAttribute(href)}">${inner}</a>` : inner;
  }
  return KEEP_INLINE.has(tag) ? `<${tag}>${inner}</${tag}>` : inner;
}

function looksLikeButton(link: Element): boolean {
  const text = (link.textContent ?? "").trim();
  if (!text || text.length > 60 || link.querySelector("img")) return false;
  const style = link.getAttribute("style") ?? "";
  const className = link.getAttribute("class") ?? "";
  return /\b(btn|button|cta)\b/i.test(className) || /background(-color)?\s*:\s*(?!transparent|none)/i.test(style) || link.getAttribute("role") === "button";
}

function isImageLink(link: Element): boolean {
  return !!link.querySelector("img") && !(link.textContent ?? "").trim();
}

function alignOf(element: Element | null): string | null {
  for (let node = element; node && node.tagName && node.tagName.toLowerCase() !== "body"; node = node.parentElement) {
    const align = /text-align\s*:\s*(left|center|right)/i.exec(node.getAttribute("style") ?? "")?.[1] ?? node.getAttribute("align");
    if (align && /^(left|center|right)$/i.test(align)) return align.toLowerCase();
  }
  return null;
}

function weightOf(cell: Element): number {
  const width = cell.getAttribute("width") ?? /(?:^|;)\s*width\s*:\s*([\d.]+%?)/i.exec(cell.getAttribute("style") ?? "")?.[1] ?? "";
  const value = parseFloat(width);
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.round(value)) : 1;
}

function levelsOf(blocks: BlockRegistry): string[] {
  const definition = blocks.get("heading");
  for (const group of definition?.schema ?? []) {
    for (const field of group.fields as Array<{ key: string; options?: Array<{ value: unknown }> }>) {
      if (field.key === "level" && field.options?.length) {
        return field.options.map((option) => String(option.value)).filter((value) => /^h[1-6]$/.test(value)).sort();
      }
    }
  }
  return ["h1", "h2", "h3"];
}

function safeHref(value: string | null | undefined): string {
  const href = (value ?? "").trim();
  return /^(https?:|mailto:|tel:|\{\{|#)/i.test(href) ? href : "";
}

/** Web and protocol-relative URLs, and raster data URLs. Never `javascript:` or SVG data. */
function isSafeImageSource(src: string): boolean {
  return /^(https?:\/\/|\/\/)/i.test(src) || /^data:image\/(png|jpe?g|gif|webp|avif);/i.test(src);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(text: string): string {
  return escapeText(text).replace(/"/g, "&quot;");
}
