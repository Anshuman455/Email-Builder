/* ═══ Fonts in the editor ═══
 *
 * The font picker's options (registered brand fonts first, then the web-safe stacks) and loading
 * those fonts into the page so the canvas shows them. The email itself links them at compile time
 * (see core's `fontHeadHtml`). */

import { FONT_STACKS, fontStack, type FontDefinition } from "@email-builder/core";

export interface FontOption {
  label: string;
  value: string;
}

export function fontOptions(fonts: readonly FontDefinition[] | undefined): FontOption[] {
  const brand = (fonts ?? []).map((font) => ({ label: font.label, value: fontStack(font) }));
  const seen = new Set(brand.map((option) => option.value));
  return [...brand, ...FONT_STACKS.filter((option) => !seen.has(option.value))];
}

/** Add each font's stylesheet to the page once. Safe to call repeatedly and on the server. */
export function loadFonts(fonts: readonly FontDefinition[] | undefined, doc: Document | undefined = typeof document === "undefined" ? undefined : document): void {
  if (!doc?.head) return;
  for (const font of fonts ?? []) {
    if (!font.url || !/^https:\/\//i.test(font.url)) continue;
    const already = [...doc.head.querySelectorAll<HTMLLinkElement>("link[data-eb-font]")].some((link) => link.getAttribute("href") === font.url);
    if (already) continue;
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = font.url;
    link.setAttribute("data-eb-font", font.family);
    doc.head.append(link);
  }
}
