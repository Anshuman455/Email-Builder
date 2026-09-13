/* ══════════════════════════════ Fonts ══════════════════════════════
 *
 * Brand and web fonts a host registers, alongside the built-in web-safe stacks. Each font carries a
 * web-safe fallback, because Outlook and several webmail clients never load web fonts: the stored
 * value is always a full CSS stack (`'Inter', Arial, sans-serif`), so those clients use the
 * fallback and everyone else gets the brand font.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

import type { EmailDocument } from "./types";

export interface FontDefinition {
  /** Shown in font pickers, e.g. "Inter". */
  label: string;
  /** The CSS family name the stylesheet defines, e.g. "Inter". */
  family: string;
  /** Web-safe stack for clients that can't load it, e.g. "Arial, Helvetica, sans-serif". */
  fallback: string;
  /** Stylesheet that defines the family — Google Fonts, Adobe Fonts, or your own @font-face CSS. HTTPS only. */
  url?: string;
}

/** The value stored on a block or the email: the family first, then its fallback. */
export function fontStack(font: FontDefinition): string {
  const family = font.family.replace(/['"\\;{}<>]/g, "").trim();
  const fallback = font.fallback.replace(/[;{}<>]/g, "").trim() || "Arial, sans-serif";
  return `'${family}', ${fallback}`;
}

/** Only fonts with a usable family, and only HTTPS stylesheets — anything else is dropped. */
export function normalizeFonts(fonts: readonly FontDefinition[] | undefined): FontDefinition[] {
  return (fonts ?? [])
    .filter((font) => font && typeof font.family === "string" && font.family.trim())
    .map((font) => ({
      label: font.label || font.family,
      family: font.family,
      fallback: font.fallback || "Arial, sans-serif",
      url: typeof font.url === "string" && /^https:\/\//i.test(font.url.trim()) ? font.url.trim() : undefined,
    }));
}

/** Every font-family value the email uses: its default font and each block's. */
function usedStacks(doc: EmailDocument): Set<string> {
  const stacks = new Set<string>();
  if (doc.settings.fontFamily) stacks.add(doc.settings.fontFamily);
  for (const row of doc.rows)
    for (const column of row.columns)
      for (const block of column.blocks) {
        const value = (block.style as Record<string, unknown> | undefined)?.fontFamily;
        if (typeof value === "string" && value) stacks.add(value);
      }
  return stacks;
}

/** Stylesheet tags for the registered fonts this email actually uses. Hidden from Outlook (which
 *  would otherwise stall on them) with a `<!--[if !mso]>` wrapper; `@import` covers clients that
 *  drop `<link>` from the head. */
export function fontHeadHtml(doc: EmailDocument, fonts: readonly FontDefinition[] | undefined): string {
  const registered = normalizeFonts(fonts).filter((font) => font.url);
  if (!registered.length) return "";
  const used = usedStacks(doc);
  const urls = new Set<string>();
  for (const font of registered) if (used.has(fontStack(font))) urls.add(font.url!);
  if (!urls.size) return "";
  const tags = [...urls]
    .map((url) => {
      const safe = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<link href="${safe}" rel="stylesheet" type="text/css" /><style type="text/css">@import url("${safe}");</style>`;
    })
    .join("");
  return `<!--[if !mso]><!-->${tags}<!--<![endif]-->`;
}
