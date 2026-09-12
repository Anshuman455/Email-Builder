/* ═══ Non-block inspector schemas ═══
 *
 * Blocks describe their own editing UI; the document, a row and a column do not, because they are
 * part of the builder rather than part of the catalogue. Declaring them as the same `Field` shape
 * means one inspector renders all four and there is no second set of controls to keep in step. */

import { ALIGN_OPTIONS, FONT_STACKS, ROW_LAYOUTS, type Field, type Row } from "@email-builder/core";

export interface PanelGroup {
  title: string;
  fields: Field[];
  collapsed?: boolean;
}

/** Layout is stored as weights, not a scalar, so the select trades in a joined string. */
export const LAYOUT_KEY = "layout";
export const layoutValue = (row: Row): string => row.layout.join(",");
export const parseLayout = (value: unknown): number[] =>
  String(value ?? "1")
    .split(",")
    .map((part) => Number(part) || 1);

export function settingsGroups(): PanelGroup[] {
  return [
    {
      title: "Layout",
      fields: [
        { kind: "number", key: "contentWidth", label: "Content width", min: 320, max: 800, step: 10, suffix: "px" },
        { kind: "color", key: "backgroundColor", label: "Page background" },
        { kind: "color", key: "contentBackgroundColor", label: "Email background" },
      ],
    },
    {
      title: "Typography",
      fields: [
        { kind: "font", key: "fontFamily", label: "Font" },
        { kind: "number", key: "baseFontSize", label: "Base size", min: 10, max: 24, suffix: "px" },
        { kind: "number", key: "lineHeight", label: "Line height", min: 1, max: 2.4, step: 0.05, inline: true },
        { kind: "color", key: "textColor", label: "Text" },
        { kind: "color", key: "headingColor", label: "Headings", inline: true },
        { kind: "color", key: "linkColor", label: "Links" },
      ],
    },
    {
      title: "Locale",
      collapsed: true,
      fields: [
        { kind: "text", key: "language", label: "Language", placeholder: "en" },
        {
          kind: "select",
          key: "direction",
          label: "Direction",
          inline: true,
          options: [
            { label: "Left to right", value: "ltr" },
            { label: "Right to left", value: "rtl" },
          ],
        },
      ],
    },
  ];
}

export function rowGroups(): PanelGroup[] {
  return [
    {
      title: "Layout",
      fields: [
        {
          kind: "select",
          key: LAYOUT_KEY,
          label: "Columns",
          options: ROW_LAYOUTS.map((entry) => ({ label: entry.label, value: entry.layout.join(",") })),
        },
        { kind: "toggle", key: "fullWidth", label: "Full-width background" },
        { kind: "toggle", key: "stackOnMobile", label: "Stack on mobile" },
      ],
    },
    {
      title: "Background",
      fields: [
        { kind: "color", key: "backgroundColor", label: "Colour", allowTransparent: true },
        { kind: "image", key: "backgroundImage", label: "Image" },
      ],
    },
    {
      title: "Spacing",
      fields: [
        { kind: "padding", key: "padding", label: "Padding" },
        { kind: "border", key: "border", label: "Border" },
        { kind: "number", key: "borderRadius", label: "Corner radius", min: 0, max: 48, suffix: "px" },
      ],
    },
    {
      title: "Visibility",
      collapsed: true,
      fields: [
        { kind: "toggle", key: "hideOnMobile", label: "Hide on mobile" },
        { kind: "toggle", key: "hideOnDesktop", label: "Hide on desktop" },
      ],
    },
  ];
}

export function columnGroups(): PanelGroup[] {
  return [
    {
      title: "Appearance",
      fields: [
        { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true },
        {
          kind: "segmented",
          key: "verticalAlign",
          label: "Vertical alignment",
          options: [
            { label: "Top", value: "top" },
            { label: "Middle", value: "middle" },
            { label: "Bottom", value: "bottom" },
          ],
        },
        { kind: "number", key: "borderRadius", label: "Corner radius", min: 0, max: 48, suffix: "px" },
      ],
    },
    {
      title: "Spacing",
      fields: [
        { kind: "padding", key: "padding", label: "Padding" },
        { kind: "border", key: "border", label: "Border" },
      ],
    },
  ];
}

/* Re-exported so the field components share core's option lists rather than declaring their own. */
export { ALIGN_OPTIONS, FONT_STACKS };
