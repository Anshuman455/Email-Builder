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
