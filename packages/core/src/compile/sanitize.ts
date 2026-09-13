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

/** Tags removed along with everything inside them.
 *
 *  `svg` and `math` are here on purpose: they switch the HTML parser into foreign-content mode,
 *  which is where most parser-differential ("mXSS") payloads live, and animation elements inside
 *  SVG can rewrite `href` after sanitising. No major email client renders inline SVG anyway. */
const DROP_WITH_CONTENT = [
  "script", "iframe", "frame", "frameset", "object", "embed", "applet", "noscript", "noembed",
  "template", "base", "form", "svg", "math", "portal",
];

/** Tags removed, contents kept — `<link>` and `<meta>` inside a body are noise, not content. */
const DROP_TAG_ONLY = ["link", "meta", "html", "head", "body", "title"];

/** Attributes whose value is fetched or navigated to. */
const URL_ATTRIBUTES = new Set(["href", "src", "xlink:href", "action", "formaction", "background", "poster", "cite", "longdesc", "lowsrc", "dynsrc"]);

/** An opening or closing tag, with quoted attribute values honoured so `title=">"` cannot end the
 *  tag early and push a real attribute out of the sanitiser's view. */
const TAG = /<(\/?)([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;

/** One attribute inside a tag: name, then an optional value in any of the three HTML forms. */
/* Unquoted values may contain `=` (HTML allows it), so `src=x/onerror=y` stays one value — the same
   split the browser makes. Diverging from the browser here is how sanitisers get bypassed. */
const ATTRIBUTE = /([^\s"'<>\/=]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'<>`]+))?/g;

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

  /* Repeat until nothing changes: removing `<script>` from `<scr<script></script>ipt>` would
     otherwise reassemble a tag that a single pass never looks at again. */
  for (let pass = 0; pass < 10; pass++) {
    const before = html;
    for (const tag of withContent) {
      html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), "");
      /* Unclosed or self-closed form of the same tag. */
      html = html.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"), "");
    }
    for (const tag of DROP_TAG_ONLY) {
      html = html.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"), "");
    }
    if (html === before) break;
  }

  /* Every remaining tag is rebuilt from its attributes: event handlers go, dangerous URLs are
     neutralised, and styles are cleaned. Attributes that survive keep their original text, so
     Outlook's VML (`xmlns:v`, `arcsize`) is untouched. */
  html = html.replace(TAG, (_match, slash: string, name: string, rest: string) => {
    if (slash) return `</${name}>`;
    const selfClosing = /\/\s*$/.test(rest);
    const kept: string[] = [];
    for (const attribute of rest.matchAll(ATTRIBUTE)) {
      const raw = attribute[0];
      const attrName = attribute[1]!.toLowerCase();
      const value = unquote(attribute[2]);
      if (attrName.startsWith("on")) continue;
      if (attrName === "srcdoc") continue;
      if (URL_ATTRIBUTES.has(attrName) && value !== null && !isSafeUrl(value)) {
        kept.push(`${attribute[1]}="#"`);
        continue;
      }
      if (attrName === "style" && value !== null) {
        kept.push(`style="${escapeQuotes(cleanCss(decodeEntities(value)))}"`);
        continue;
      }
      kept.push(raw);
    }
    return `<${name}${kept.length ? " " + kept.join(" ") : ""}${selfClosing ? " /" : ""}>`;
  });

  /* `<!--[if …]>` must survive: the Outlook fallbacks depend on it. Every other comment goes, so a
     stored `<!-- <script> -->` cannot be un-commented downstream. */
  html = html.replace(/<!--(?!\[if|<!\[endif)[\s\S]*?-->/g, "");

  return html;
}

function unquote(value: string | undefined): string | null {
  if (value === undefined) return null;
  const first = value[0];
  return (first === '"' || first === "'") && value.endsWith(first) ? value.slice(1, -1) : value;
}

function escapeQuotes(value: string): string {
  return value.replace(/"/g, "&quot;");
}

const NAMED_ENTITIES: Record<string, string> = {
  colon: ":", tab: "\t", newline: "\n", nbsp: "\u00a0", lpar: "(", rpar: ")", sol: "/", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">",
};

/** What the browser will see after parsing: numeric and the scheme-relevant named entities. */
function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** A URL is unsafe if, once decoded and stripped of the whitespace and control characters browsers
 *  ignore inside a scheme, it starts with a script-capable scheme. Raster `data:image/*` is allowed
 *  (inline images are common in email); SVG data URLs are not. */
function isSafeUrl(value: string): boolean {
  const normalised = decodeEntities(value).replace(/[\u0000-\u0020\u007f-\u009f]/g, "").toLowerCase();
  if (/^(javascript|vbscript|file|livescript|mocha):/.test(normalised)) return false;
  if (normalised.startsWith("data:")) return /^data:image\/(png|jpe?g|gif|webp|avif|bmp);/.test(normalised);
  return true;
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
