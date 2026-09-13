/* ══════════════════════════════ Sanitiser ══════════════════════════════
 *
 * Regex-based on purpose: this runs in Node during a send as well as in the browser, and pulling a
 * DOM parser into the send path for markup an author typed themselves is a poor trade.
 *
 * The threat model is narrow and worth stating. Nothing here executes — no email client runs
 * JavaScript. What this prevents is a stored payload travelling through the builder's own preview
 * (a real DOM, in the host's origin) and through any web-view "view in browser" page the host
 * serves. Both are same-origin surfaces, and both render this string.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

/** Tags removed along with everything inside them. */
const DROP_WITH_CONTENT = ["script", "iframe", "object", "embed", "applet", "noscript", "template", "base", "form"];

/** Tags removed, contents kept — `<link>` and `<meta>` inside a body are noise, not content. */
const DROP_TAG_ONLY = ["link", "meta", "html", "head", "body", "title"];

export interface SanitizeOptions {
  /** Keep `<style>` blocks. On for the document shell, off for author-supplied HTML blocks. */
  allowStyleTag?: boolean;
  /** Extra tags to drop with their contents. */
  drop?: string[];
}

export function sanitizeHtml(input: string, options: SanitizeOptions = {}): string {
  if (!input || typeof input !== "string") return "";
  let html = input;

  const withContent = [...DROP_WITH_CONTENT, ...(options.drop ?? [])];
  if (!options.allowStyleTag) withContent.push("style");

  for (const tag of withContent) {
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), "");
    /* Unclosed or self-closed form of the same tag. */
    html = html.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
  }

  for (const tag of DROP_TAG_ONLY) {
    html = html.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"), "");
  }

  /* Event handlers, quoted and bare. */
  html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  html = html.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  html = html.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");

  /* Dangerous URL schemes in any attribute. `data:image/*` survives — inline images are legitimate
     and common; every other `data:` does not. */
  html = html.replace(/(href|src|xlink:href|action|background|poster)\s*=\s*(["']?)\s*(javascript|vbscript|file|data)\s*:/gi, (match, attr, quote, scheme) => {
    if (String(scheme).toLowerCase() === "data" && /data\s*:\s*image\//i.test(match)) return match;
    return `${attr}=${quote}#`;
  });

  /* `expression()` and `url(javascript:…)` inside style attributes. */
  html = html.replace(/style\s*=\s*"([^"]*)"/gi, (_m, css: string) => `style="${cleanCss(css)}"`);
  html = html.replace(/style\s*=\s*'([^']*)'/gi, (_m, css: string) => `style='${cleanCss(css)}'`);

  /* `<!--[if …]>` must survive: the Outlook fallbacks depend on it. Every other comment goes, so a
     stored `<!-- <script> -->` cannot be un-commented downstream. */
  html = html.replace(/<!--(?!\[if|<!\[endif)[\s\S]*?-->/g, "");

  return html;
}

function cleanCss(css: string): string {
  return css
    .replace(/expression\s*\(/gi, "")
    .replace(/url\s*\(\s*["']?\s*(javascript|vbscript|data:text)/gi, "url(")
    .replace(/behavior\s*:/gi, "")
    .replace(/@import/gi, "");
}

/** The slice of a block definition this needs — structural, so the sanitiser stays import-free. */
interface SchemaLike {
  schema?: ReadonlyArray<{ target?: string; fields: ReadonlyArray<{ kind: string; key: string }> }>;
}

/** Author-editable markup kinds. `richtext` is HTML typed on the canvas; a stored document can put
 *  anything in it, so it is cleaned before any renderer sees it. */
const MARKUP_KINDS = new Set(["richtext"]);

/** A copy of `content` with every markup field sanitised. Used by the compiler and by both canvas
 *  previews, so the inbox and the editor render the same cleaned string. */
export function sanitizeBlockContent<T extends Record<string, unknown>>(definition: SchemaLike | null | undefined, content: T): T {
  if (!definition?.schema) return content;
  let next: Record<string, unknown> | null = null;
  for (const group of definition.schema) {
    if (group.target && group.target !== "content") continue;
    for (const field of group.fields) {
      if (!MARKUP_KINDS.has(field.kind)) continue;
      const value = content[field.key];
      if (typeof value !== "string") continue;
      const clean = sanitizeHtml(value);
      if (clean !== value) (next ??= { ...content })[field.key] = clean;
    }
  }
  return (next ?? content) as T;
}

/** Whether a string would change under sanitisation — used by preflight to warn rather than
 *  silently rewriting an author's markup. */
export function isSanitary(input: string, options?: SanitizeOptions): boolean {
  return sanitizeHtml(input, options) === input;
}
