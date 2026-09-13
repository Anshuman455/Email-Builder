/* ═══ Canvas styles ═══
 *
 * The canvas draws rows and columns as live DOM, not as the email's tables, so the styles the
 * compiler puts on a column's `<td>` have to be mirrored here — otherwise changing a column's
 * background or padding in the settings panel changes the email but not what the author sees.
 * Framework-neutral CSS objects (camelCase keys), usable as a React `style` or a Vue `:style`. */

import { borderValue, paddingValue, type ColumnStyle, type RowStyle } from "@email-builder/core";

const JUSTIFY: Record<string, string> = { top: "flex-start", middle: "center", bottom: "flex-end" };

export function columnCanvasStyle(style: Partial<ColumnStyle> | undefined): Record<string, string> {
  const out: Record<string, string> = {
    /* Vertical alignment: the column stretches to the row's height, and its blocks sit at the top,
       middle or bottom of it — what `valign` does in the email. */
    display: "flex",
    flexDirection: "column",
    justifyContent: JUSTIFY[style?.verticalAlign ?? "top"] ?? "flex-start",
  };
  if (!style) return out;
  if (style.padding) out.padding = paddingValue(style.padding);
  if (style.backgroundColor && style.backgroundColor !== "transparent") out.backgroundColor = style.backgroundColor;
  if (style.borderRadius) out.borderRadius = `${style.borderRadius}px`;
  const border = borderValue(style.border);
  if (border) out.border = border;
  return out;
}

/** A row's padding, background (colour or image), border and radius, as the compiler applies them.
 *  `fullWidth` has no canvas equivalent — the canvas is already exactly the email's width. */
export function rowCanvasStyle(style: Partial<RowStyle> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!style) return out;
  if (style.padding) out.padding = paddingValue(style.padding);
  if (style.backgroundColor && style.backgroundColor !== "transparent") out.backgroundColor = style.backgroundColor;
  if (style.backgroundImage) {
    out.backgroundImage = `url("${style.backgroundImage.replace(/["\\\n\r]/g, "")}")`;
    out.backgroundSize = "cover";
    out.backgroundPosition = "center";
  }
  if (style.borderRadius) out.borderRadius = `${style.borderRadius}px`;
  const border = borderValue(style.border);
  if (border) out.border = border;
  return out;
}
