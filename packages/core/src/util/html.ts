/* ══════════════════════════════ HTML primitives ══════════════════════════════
 *
 * Every string that reaches an inbox passes through one of these. Blocks never concatenate raw
 * user input — the render context hands them `esc`, `escAttr` and `url` instead.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => ENTITIES[c]!);
}

export function escapeAttr(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, "&#10;");
}

/* Only these schemes may appear in an href or src. `javascript:` and `data:` (outside images)
   are the two that turn an email into an attack surface. */
const SAFE_SCHEME = /^(https?:|mailto:|tel:|sms:|#|\/|\{\{|\[%|\$\{)/i;
const SAFE_IMAGE_SCHEME = /^(https?:|\/|data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,|\{\{)/i;

export function safeUrl(value: unknown, fallback = "#"): string {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  return SAFE_SCHEME.test(raw) ? raw : fallback;
}

export function safeImageUrl(value: unknown, fallback = ""): string {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  return SAFE_IMAGE_SCHEME.test(raw) ? raw : fallback;
}

/** `42` → `"42px"`; strings pass through so callers can send `"auto"` or `"100%"`. */
export function px(value: number | string | undefined | null): string {
  if (value === null || value === undefined || value === "") return "";
  return typeof value === "number" ? `${value}px` : String(value);
}

const CAMEL = /[A-Z]/g;
const toKebab = (key: string) => key.replace(CAMEL, (c) => `-${c.toLowerCase()}`);

export type StyleMap = Record<string, string | number | undefined | null | false>;

/** Serialises to `style="a:1;b:2"`, or `""` when nothing survives. Falsy values are dropped, but
 *  `0` is kept — a zero padding is a real instruction. */
export function styleAttr(styles: StyleMap): string {
  const body = declarations(styles);
  return body ? ` style="${escapeAttr(body)}"` : "";
}

export function declarations(styles: StyleMap): string {
  const out: string[] = [];
  for (const key of Object.keys(styles)) {
    const value = styles[key];
    if (value === undefined || value === null || value === false || value === "") continue;
    out.push(`${toKebab(key)}:${typeof value === "number" ? value : String(value).trim()}`);
  }
  return out.join(";");
}

export function paddingValue(p: { top: number; right: number; bottom: number; left: number } | undefined): string {
  if (!p) return "0";
  return `${p.top || 0}px ${p.right || 0}px ${p.bottom || 0}px ${p.left || 0}px`;
}

export function borderValue(b: { width: number; style: string; color: string } | undefined): string | undefined {
  if (!b || !b.width || b.style === "none") return undefined;
  return `${b.width}px ${b.style} ${b.color}`;
}

/** Strips tags and collapses whitespace. The fallback path for `toPlainText`. */
export function stripTags(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Collapses inter-tag whitespace. Safe for table-based email markup, which has no inline
 *  significant whitespace of its own once text nodes are left alone. */
export function minifyHtml(html: string): string {
  return html.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
}

/** Conditional comment for Outlook (mso). */
export function mso(inner: string): string {
  return `<!--[if mso]>${inner}<![endif]-->`;
}

export function notMso(inner: string): string {
  return `<!--[if !mso]><!-->${inner}<!--<![endif]-->`;
}
