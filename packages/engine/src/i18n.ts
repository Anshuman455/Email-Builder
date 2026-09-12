/* Every user-facing string the view packages render. A host overrides any of them through
   `adapter.labels`, which is also the translation hook — one flat map, no i18n dependency. */

export const LABELS = {
  "palette.title": "Blocks",
  "palette.search": "Search blocks",
  "palette.layouts": "Layouts",
  "palette.empty": "No blocks match",
  "canvas.empty": "Drag a block here to begin",
  "canvas.emptyColumn": "Drop a block",
  "canvas.addRow": "Add row",
  "inspector.empty": "Select something on the canvas to edit it.",
  "inspector.settings": "Email settings",
  "inspector.row": "Row",
  "inspector.column": "Column",
  "inspector.block": "Block",
  "toolbar.undo": "Undo",
  "toolbar.redo": "Redo",
  "toolbar.preview": "Preview",
  "toolbar.code": "HTML",
  "toolbar.issues": "Issues",
  "toolbar.save": "Save",
  "toolbar.desktop": "Desktop",
  "toolbar.mobile": "Mobile",
  "status.idle": "All changes saved",
  "status.dirty": "Unsaved changes",
  "status.saving": "Saving…",
  "status.saved": "Saved",
  "status.error": "Could not save",
  "block.duplicate": "Duplicate",
  "block.delete": "Delete",
  "block.move": "Drag to move",
  "block.settings": "Settings",
  "row.duplicate": "Duplicate row",
  "row.delete": "Delete row",
  "row.layout": "Column layout",
  "field.insertField": "Insert field",
  "field.chooseImage": "Choose image",
  "field.replaceImage": "Replace",
  "field.removeImage": "Remove",
  "field.addItem": "Add item",
  "field.removeItem": "Remove",
  "field.searchRecords": "Search…",
  "field.noRecords": "Nothing found",
  "field.transparent": "Transparent",
  "preflight.clean": "No issues found.",
  "preflight.title": "Pre-flight",
} as const;

export type LabelKey = keyof typeof LABELS;

export function createTranslator(overrides: Record<string, string> = {}) {
  return (key: LabelKey | string, fallback?: string): string =>
    overrides[key] ?? (LABELS as Record<string, string>)[key] ?? fallback ?? key;
}
