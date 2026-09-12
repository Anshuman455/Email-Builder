/* ═══ Chrome schemas ═══
 *
 * `editor.getSchema()` covers blocks only — a block's editing UI belongs to its definition. Rows,
 * columns and document settings have no definition, so the view declares their field groups here
 * and runs them through the same `BuilderField`. Declaring them rather than hand-writing controls
 * is what keeps the inspector one code path. */

import {
  ALIGN_OPTIONS,
  ROW_LAYOUTS,
  paddingField,
  visibilityGroup,
  type Field,
  type FieldGroup,
} from "@email-builder/core";

/** Serialised layout weights — `FieldOption.value` is a scalar, and `[2,1]` is not. */
export const LAYOUT_SEPARATOR = ",";

export const encodeLayout = (layout: number[]): string => layout.join(LAYOUT_SEPARATOR);

export const decodeLayout = (value: unknown): number[] =>
  String(value ?? "1")
    .split(LAYOUT_SEPARATOR)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part) && part > 0);

const borderRadiusField: Field = {
  kind: "number",
  key: "borderRadius",
  label: "Corner radius",
  min: 0,
  max: 48,
  suffix: "px",
};

/* ── Row ──
 * `layout` is the one row field that is not a style key, so it sits in a `content`-targeted group
 * and the inspector routes it to `editor.setRowLayout`. */
export const ROW_GROUPS: FieldGroup[] = [
  {
    title: "Columns",
    target: "content",
    fields: [
      {
        kind: "select",
        key: "layout",
        label: "Column layout",
        options: ROW_LAYOUTS.map((entry) => ({
          label: entry.label,
          value: encodeLayout(entry.layout),
        })),
      },
    ],
  },
  {
    title: "Background",
    target: "style",
    fields: [
      { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true },
      { kind: "url", key: "backgroundImage", label: "Background image" },
      { kind: "toggle", key: "fullWidth", label: "Background spans full width" },
    ],
  },
  {
    title: "Spacing & border",
    target: "style",
    fields: [paddingField(), { kind: "border", key: "border", label: "Border" }, borderRadiusField],
  },
  {
    title: "Responsive",
    target: "style",
    fields: [
      { kind: "toggle", key: "stackOnMobile", label: "Stack columns on mobile" },
      ...visibilityGroup().fields,
    ],
  },
];

/* ── Column ── */
export const COLUMN_GROUPS: FieldGroup[] = [
  {
    title: "Column",
    target: "style",
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
    ],
  },
  {
    title: "Spacing & border",
    target: "style",
    fields: [paddingField(), { kind: "border", key: "border", label: "Border" }, borderRadiusField],
  },
];

/* ── Document settings ──
 * Targets are cosmetic here: the inspector routes every settings change through
 * `editor.updateSettings`. */
export const SETTINGS_GROUPS: FieldGroup[] = [
  {
    title: "Canvas",
    target: "content",
    fields: [
      {
        kind: "number",
        key: "contentWidth",
        label: "Content width",
        min: 320,
        max: 900,
        suffix: "px",
        help: "600px is the safe ceiling for Outlook.",
      },
      { kind: "color", key: "backgroundColor", label: "Page background" },
      { kind: "color", key: "contentBackgroundColor", label: "Email background" },
    ],
  },
  {
    title: "Typography",
    target: "content",
    fields: [
      { kind: "font", key: "fontFamily", label: "Font" },
      { kind: "number", key: "baseFontSize", label: "Base size", min: 10, max: 24, suffix: "px", inline: true },
      { kind: "number", key: "lineHeight", label: "Line height", min: 1, max: 3, step: 0.1, inline: true },
      { kind: "color", key: "textColor", label: "Text", inline: true },
      { kind: "color", key: "headingColor", label: "Headings", inline: true },
      { kind: "color", key: "linkColor", label: "Links" },
    ],
  },
  {
    title: "Locale",
    target: "content",
    fields: [
      { kind: "text", key: "language", label: "Language", placeholder: "en" },
      {
        kind: "segmented",
        key: "direction",
        label: "Direction",
        options: [
          { label: "LTR", value: "ltr" },
          { label: "RTL", value: "rtl" },
        ],
      },
    ],
  },
];

/** Re-exported so the align field and the toolbar agree on the three options. */
export { ALIGN_OPTIONS };
