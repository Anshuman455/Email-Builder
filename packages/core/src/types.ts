/* ══════════════════════════════ Document & registry types ══════════════════════════════
 *
 * The document is plain JSON — no classes, no cycles, structurally cloneable. Everything a host
 * stores, versions or diffs is one of the shapes below.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

export type Padding = { top: number; right: number; bottom: number; left: number };

export type Border = {
  width: number;
  style: "none" | "solid" | "dashed" | "dotted";
  color: string;
};

export type Align = "left" | "center" | "right";
export type VerticalAlign = "top" | "middle" | "bottom";

/* ────────────────────────────── Document ────────────────────────────── */

export interface DocumentSettings {
  /** Width of the email body in px. 600 is the safe ceiling for Outlook. */
  contentWidth: number;
  /** The area outside the email sheet. */
  backgroundColor: string;
  /** The sheet itself. */
  contentBackgroundColor: string;
  fontFamily: string;
  textColor: string;
  headingColor: string;
  linkColor: string;
  baseFontSize: number;
  lineHeight: number;
  /** Language + direction land on the outer <html>. */
  language: string;
  direction: "ltr" | "rtl";
}

export interface Block<C = Record<string, any>, S = Record<string, any>> {
  id: string;
  type: string;
  content: C;
  style: S;
  /** Host-defined passthrough. Never read by the builder; survives round-trips. */
  meta?: Record<string, any>;
}

export interface ColumnStyle {
  backgroundColor: string;
  padding: Padding;
  border: Border;
  borderRadius: number;
  verticalAlign: VerticalAlign;
}

export interface Column {
  id: string;
  blocks: Block[];
  style: ColumnStyle;
}

export interface RowStyle {
  backgroundColor: string;
  backgroundImage: string;
  padding: Padding;
  border: Border;
  borderRadius: number;
  /** Paint `backgroundColor` edge-to-edge while the content stays at `contentWidth`. */
  fullWidth: boolean;
  /** Columns become full-width stacked rows under ~480px. */
  stackOnMobile: boolean;
  hideOnMobile: boolean;
  hideOnDesktop: boolean;
}

export interface Row {
  id: string;
  /** Relative column weights. `[1,1]` is a even split, `[2,1]` a two-thirds / one-third. */
  layout: number[];
  columns: Column[];
  style: RowStyle;
  meta?: Record<string, any>;
}

export interface EmailDocument {
  schemaVersion: number;
  settings: DocumentSettings;
  rows: Row[];
  /** Host passthrough — campaign ids, locale tags, anything. */
  meta?: Record<string, any>;
}

/* ────────────────────────────── Inspector field schema ──────────────────────────────
 *
 * Blocks describe their editing UI declaratively so that a block registered by a host works in
 * React AND Vue without either framework knowing anything about it. Adding a field kind is the
 * only thing that requires touching both view packages.
 * ─────────────────────────────────────────────────────────────────────── */

export interface FieldBase {
  key: string;
  label?: string;
  help?: string;
  /** Hide the field unless this returns true. Receives the block being edited. */
  when?: (value: any, block: Block, doc: EmailDocument) => boolean;
  /** Lay this field beside the previous one instead of below it. */
  inline?: boolean;
}

export type Field =
  | (FieldBase & { kind: "text"; placeholder?: string; mergeable?: boolean; maxLength?: number })
  | (FieldBase & { kind: "textarea"; placeholder?: string; mergeable?: boolean; rows?: number })
  | (FieldBase & { kind: "richtext"; placeholder?: string; mergeable?: boolean })
  | (FieldBase & { kind: "number"; min?: number; max?: number; step?: number; suffix?: string })
  | (FieldBase & { kind: "range"; min: number; max: number; step?: number; suffix?: string })
  | (FieldBase & { kind: "color"; allowTransparent?: boolean })
  | (FieldBase & { kind: "toggle" })
  | (FieldBase & { kind: "select"; options: FieldOption[] })
  | (FieldBase & { kind: "segmented"; options: FieldOption[] })
  | (FieldBase & { kind: "align" })
  | (FieldBase & { kind: "padding" })
  | (FieldBase & { kind: "border" })
  | (FieldBase & { kind: "font" })
  | (FieldBase & { kind: "url"; placeholder?: string; mergeable?: boolean })
  /** Opens the host's asset picker / uploader via `adapter.assets`. */
  | (FieldBase & { kind: "image" })
  /** Repeating sub-records — social links, list items, product cards. */
  | (FieldBase & { kind: "list"; itemFields: Field[]; itemLabel?: (item: any, i: number) => string; max?: number; addLabel?: string })
  /** Pulls rows from the host CRM via `adapter.records.list(source)`. */
  | (FieldBase & { kind: "record"; source: string; multiple?: boolean; mapToContent?: (record: any) => Record<string, any> })
  /** Escape hatch: the host registers a widget by id in `adapter.widgets`. */
  | (FieldBase & { kind: "custom"; widget: string; props?: Record<string, any> });

export interface FieldOption {
  label: string;
  value: string | number | boolean;
  icon?: string;
}

export interface FieldGroup {
  title: string;
  /** Which half of the block this group writes into. */
  target: "content" | "style";
  fields: Field[];
  collapsed?: boolean;
  when?: (block: Block, doc: EmailDocument) => boolean;
}

/* ────────────────────────────── Block definitions ────────────────────────────── */

export interface RenderContext<C = any, S = any> {
  block: Block<C, S>;
  content: C;
  style: S;
  settings: DocumentSettings;
  /** Column width in px, already resolved from the row layout. */
  width: number;
  /** HTML-escape helper, exposed so host blocks never hand-roll one. */
  esc: (value: unknown) => string;
  /** Attribute-escape helper. */
  escAttr: (value: unknown) => string;
  /** Scheme-checked URL, or "#" when the value is unsafe. */
  url: (value: unknown) => string;
  /** Serialise a style object to an inline `style="…"` attribute (or ""). */
  styleAttr: (styles: Record<string, string | number | undefined | null | false>) => string;
  /** True while painting the editor canvas rather than the email. */
  preview: boolean;
  /** Resolve merge tokens to sample values. Only populated when `preview` is true. */
  sample?: (text: string) => string;
}

export interface PreflightContext<C = any, S = any> extends RenderContext<C, S> {
  rowId: string;
  columnId: string;
}

export interface BlockDefinition<C = any, S = any> {
  type: string;
  label: string;
  /** Inline SVG string (24×24 viewBox) shown in the palette. */
  icon?: string;
  /** Palette grouping key — free text; groups render in first-seen order. */
  group?: string;
  description?: string;
  keywords?: string[];
  /** Palette ordering within a group. Lower first. */
  order?: number;

  defaultContent: () => C;
  defaultStyle: () => S;
  /** Editing UI. Rendered identically by the React and Vue inspectors. */
  schema: FieldGroup[];

  /** design → email-safe HTML. Must be table-based and inline-styled. */
  render: (ctx: RenderContext<C, S>) => string;
  /** design → plain text. Defaults to a tag-strip of `render`. */
  text?: (ctx: RenderContext<C, S>) => string;
  /** Canvas preview HTML. Defaults to `render` with `preview: true`. */
  preview?: (ctx: RenderContext<C, S>) => string;
  /** Extra lint rules on top of the built-in ones. */
  validate?: (ctx: PreflightContext<C, S>) => PreflightIssue[];

  /** Content keys that accept merge tokens. Drives the "insert field" affordance. */
  mergeableFields?: string[];
  /** At most one per document — content slots, unsubscribe blocks. */
  singleton?: boolean;
  /** Hide from the palette; still renders if present in a document. */
  hidden?: boolean;
  /** Only offered when the editor runs in one of these modes. */
  modes?: string[];
  /** Which content key holds the block's primary editable text, for inline editing. */
  inlineEditKey?: string;
}

/* ────────────────────────────── Merge fields ────────────────────────────── */

export interface MergeField {
  /** The bare path, without delimiters — e.g. `contact.first_name`. */
  token: string;
  label: string;
  group?: string;
  /** Shown in previews and test sends. */
  sample?: string;
  /** Used when the recipient has no value. */
  fallback?: string;
  description?: string;
  /** Free-form hint for hosts: "string" | "number" | "date" | "url" | "currency". */
  type?: string;
}

export interface MergeSyntax {
  open: string;
  close: string;
  /** `{{first_name|there}}`. Omit to disable inline fallbacks. */
  fallbackSeparator?: string;
}

/* ────────────────────────────── Preflight ────────────────────────────── */

export const SEVERITY = { ERROR: "error", WARNING: "warning", INFO: "info" } as const;
export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

export interface PreflightIssue {
  id: string;
  severity: Severity;
  message: string;
  hint?: string;
  /** Where to jump when the issue is clicked. */
  target?: { kind: "row" | "column" | "block" | "settings"; id?: string };
}

/* ────────────────────────────── Compile ────────────────────────────── */

export interface CompileOptions {
  /** Resolve merge tokens against this data. Omit to leave tokens in place for the ESP. */
  data?: Record<string, any>;
  /** Substitute sample values instead of real data. */
  sample?: boolean;
  /** Injected verbatim before `</head>`. */
  headExtra?: string;
  /** Appended inside the sheet, after the last row — unsubscribe footers live here. */
  footerHtml?: string;
  /** Skip the `<html>` shell and return the sheet only. */
  fragment?: boolean;
  /** Minify whitespace between tags. */
  minify?: boolean;
  preview?: boolean;
}

export interface CompileResult {
  html: string;
  text: string;
  /** Every merge token the document actually uses. */
  usedTokens: string[];
  /** Approximate gzip-free byte size of `html`. */
  bytes: number;
}
