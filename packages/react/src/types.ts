/* ═══ Shared view types ═══
 *
 * Field values are the one genuinely untyped seam in the library: a field's value is whatever
 * its block's content or style key holds. `unknown` at the boundary, narrowed per kind inside
 * each control. */

import type { Block, Field } from "@email-builder/core";
import type { Editor } from "@email-builder/engine";

export interface BuilderFieldProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Null when the inspector is editing a row, a column or the document settings. */
  block: Block | null;
}

/** What a host widget registered in `adapter.widgets` is called with. */
export interface CustomWidgetProps extends BuilderFieldProps {
  editor: Editor;
}

export const asString = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

export const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const asBoolean = (value: unknown): boolean => value === true;
