/* Field-schema fragments shared by the built-in blocks. Hosts import these so a custom block's
   spacing and typography controls look and behave exactly like a built-in one's. */

import type { Field, FieldGroup } from "../types";

export const ALIGN_OPTIONS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
];

export const FONT_STACKS = [
  { label: "System sans", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Times", value: "'Times New Roman', Times, serif" },
  { label: "Courier", value: "'Courier New', Courier, monospace" },
  { label: "Trebuchet", value: "'Trebuchet MS', Tahoma, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Verdana, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
];

export const WEIGHT_OPTIONS = [
  { label: "Regular", value: "400" },
  { label: "Medium", value: "500" },
  { label: "Semibold", value: "600" },
  { label: "Bold", value: "700" },
];

export const paddingField = (key = "padding", label = "Padding"): Field => ({ kind: "padding", key, label });
export const alignField = (key = "align", label = "Alignment"): Field => ({ kind: "align", key, label });
export const colorField = (key: string, label: string): Field => ({ kind: "color", key, label, allowTransparent: true });

export const typographyFields = (): Field[] => [
  { kind: "font", key: "fontFamily", label: "Font" },
  { kind: "number", key: "fontSize", label: "Size", min: 8, max: 72, suffix: "px", inline: true },
  { kind: "select", key: "fontWeight", label: "Weight", options: WEIGHT_OPTIONS, inline: true },
  { kind: "color", key: "color", label: "Colour" },
  { kind: "number", key: "lineHeight", label: "Line height", min: 1, max: 3, step: 0.1, inline: true },
  { kind: "number", key: "letterSpacing", label: "Letter spacing", min: -2, max: 10, step: 0.1, suffix: "px", inline: true },
];

export const spacingGroup = (extra: Field[] = []): FieldGroup => ({
  title: "Spacing & background",
  target: "style",
  fields: [paddingField(), colorField("backgroundColor", "Background"), ...extra],
});

export const visibilityGroup = (): FieldGroup => ({
  title: "Visibility",
  target: "style",
  fields: [
    { kind: "toggle", key: "hideOnMobile", label: "Hide on mobile" },
    { kind: "toggle", key: "hideOnDesktop", label: "Hide on desktop" },
  ],
});

/** The outer `<td>` wrapper every block shares — padding, background, alignment and the
 *  responsive hide classes. Keeping it in one place is what makes blocks composable. */
export function blockShellStyles(style: Record<string, any>): Record<string, any> {
  const p = style.padding ?? { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    padding: `${p.top || 0}px ${p.right || 0}px ${p.bottom || 0}px ${p.left || 0}px`,
    backgroundColor: style.backgroundColor && style.backgroundColor !== "transparent" ? style.backgroundColor : undefined,
    textAlign: style.align || undefined,
  };
}

export function hideClass(style: Record<string, any>): string {
  const classes: string[] = [];
  if (style.hideOnMobile) classes.push("eb-hide-mobile");
  if (style.hideOnDesktop) classes.push("eb-hide-desktop");
  return classes.length ? ` class="${classes.join(" ")}"` : "";
}

/* ── Mobile overrides ──
 *
 * A block can look different on phones: another font size, alignment or padding. Desktop stays
 * inline-styled as always; the overrides ship as one media query in the email's <style>, keyed to
 * a class on the block's outer table (`eb-m-<id>`), so clients that ignore media queries still get
 * the desktop design. */

export const mobileDefaults = () => ({
  /** 0 keeps the desktop size. */
  mobileFontSize: 0,
  /** "" keeps the desktop alignment. */
  mobileAlign: "",
  mobilePaddingEnabled: false,
  mobilePadding: { top: 12, right: 16, bottom: 12, left: 16 },
});

export const mobileGroup = (options: { typography?: boolean } = {}): FieldGroup => ({
  title: "Mobile",
  target: "style",
  collapsed: true,
  fields: [
    ...(options.typography
      ? [{ kind: "number", key: "mobileFontSize", label: "Font size on mobile", min: 0, max: 72, suffix: "px", help: "0 keeps the desktop size." } as Field]
      : []),
    {
      kind: "segmented",
      key: "mobileAlign",
      label: "Alignment on mobile",
      options: [
        { label: "Same", value: "" },
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    { kind: "toggle", key: "mobilePaddingEnabled", label: "Different padding on mobile" },
    { kind: "padding", key: "mobilePadding", label: "Padding on mobile", when: (_value, block) => !!block.style?.mobilePaddingEnabled },
  ],
});

const MOBILE_ALIGN = new Set(["left", "center", "right"]);

export function hasMobileOverrides(style: Record<string, any> | undefined): boolean {
  if (!style) return false;
  return Number(style.mobileFontSize) > 0 || MOBILE_ALIGN.has(style.mobileAlign) || (!!style.mobilePaddingEnabled && !!style.mobilePadding);
}

/** The block's style as it renders on mobile — used by the canvas's Mobile preview. */
export function applyMobileStyle<S extends Record<string, any>>(style: S): S {
  if (!hasMobileOverrides(style)) return style;
  return {
    ...style,
    ...(Number(style.mobileFontSize) > 0 ? { fontSize: Number(style.mobileFontSize) } : {}),
    ...(MOBILE_ALIGN.has(style.mobileAlign) ? { align: style.mobileAlign } : {}),
    ...(style.mobilePaddingEnabled && style.mobilePadding ? { padding: style.mobilePadding } : {}),
  };
}

export function mobileClass(blockId: string): string {
  return `eb-m-${blockId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** CSS for one block's overrides, to sit inside the mobile media query. Empty when it has none. */
export function mobileRules(block: { id: string; style?: Record<string, any> }): string {
  const style = block.style ?? {};
  if (!hasMobileOverrides(style)) return "";
  const cls = mobileClass(block.id);
  const rules: string[] = [];
  if (style.mobilePaddingEnabled && style.mobilePadding) {
    const p = style.mobilePadding;
    rules.push(`.${cls}>tbody>tr>td,.${cls}>tr>td{padding:${num(p.top)}px ${num(p.right)}px ${num(p.bottom)}px ${num(p.left)}px!important}`);
  }
  const inner: string[] = [];
  if (MOBILE_ALIGN.has(style.mobileAlign)) inner.push(`text-align:${style.mobileAlign}!important`);
  if (Number(style.mobileFontSize) > 0) inner.push(`font-size:${num(style.mobileFontSize)}px!important`);
  if (inner.length) rules.push(`.${cls},.${cls} *{${inner.join(";")}}`);
  return rules.join("");
}

function num(value: unknown): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
