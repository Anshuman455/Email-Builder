import type { Border, Column, ColumnStyle, DocumentSettings, EmailDocument, Padding, Row, RowStyle } from "../types";
import { colId, rowId } from "../util/id";

export const SCHEMA_VERSION = 1;

export const NO_BORDER: Border = { width: 0, style: "none", color: "#e2e8f0" };

export const padding = (top = 0, right = top, bottom = top, left = right): Padding => ({ top, right, bottom, left });

export const DEFAULT_SETTINGS: DocumentSettings = {
  contentWidth: 600,
  backgroundColor: "#f4f5f7",
  contentBackgroundColor: "#ffffff",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  textColor: "#334155",
  headingColor: "#0f172a",
  linkColor: "#2563eb",
  baseFontSize: 16,
  lineHeight: 1.6,
  language: "en",
  direction: "ltr",
};

export const DEFAULT_ROW_STYLE: RowStyle = {
  backgroundColor: "transparent",
  backgroundImage: "",
  padding: padding(24, 24, 24, 24),
  border: { ...NO_BORDER },
  borderRadius: 0,
  fullWidth: false,
  stackOnMobile: true,
  hideOnMobile: false,
  hideOnDesktop: false,
};

export const DEFAULT_COLUMN_STYLE: ColumnStyle = {
  backgroundColor: "transparent",
  padding: padding(0),
  border: { ...NO_BORDER },
  borderRadius: 0,
  verticalAlign: "top",
};

/* Palette of row shapes. Weights, not percentages — the compiler resolves them against
   `contentWidth`, so a 640px document and a 600px one both stay exact. */
export const ROW_LAYOUTS: { label: string; layout: number[] }[] = [
  { label: "1 column", layout: [1] },
  { label: "2 columns", layout: [1, 1] },
  { label: "3 columns", layout: [1, 1, 1] },
  { label: "4 columns", layout: [1, 1, 1, 1] },
  { label: "2 : 1", layout: [2, 1] },
  { label: "1 : 2", layout: [1, 2] },
  { label: "1 : 3", layout: [1, 3] },
  { label: "3 : 1", layout: [3, 1] },
];

export function createColumn(): Column {
  return { id: colId(), blocks: [], style: { ...DEFAULT_COLUMN_STYLE, padding: padding(0), border: { ...NO_BORDER } } };
}

export function createRow(layout: number[] = [1]): Row {
  const safe = layout.length ? layout : [1];
  return {
    id: rowId(),
    layout: [...safe],
    columns: safe.map(() => createColumn()),
    style: { ...DEFAULT_ROW_STYLE, padding: { ...DEFAULT_ROW_STYLE.padding }, border: { ...NO_BORDER } },
  };
}

export function createDocument(settings: Partial<DocumentSettings> = {}): EmailDocument {
  return { schemaVersion: SCHEMA_VERSION, settings: { ...DEFAULT_SETTINGS, ...settings }, rows: [] };
}

/** A document that looks like something the moment it opens. An empty canvas reads as broken. */
export function starterDocument(settings: Partial<DocumentSettings> = {}): EmailDocument {
  const doc = createDocument(settings);
  doc.rows = [createRow([1])];
  return doc;
}
