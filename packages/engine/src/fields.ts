/* ═══ Field layout ═══
 *
 * How the settings panel lays out a group's fields, decided once for React and Vue: consecutive
 * fields marked `inline` share a two-column row (Size | Weight, Line height | Letter spacing);
 * everything else — and an inline field with no partner — gets a full-width line. */

import type { Field } from "@email-builder/core";

export interface FieldRun {
  /** True when the run is a two-column row. */
  inline: boolean;
  fields: Field[];
}

export function groupFields(fields: readonly Field[]): FieldRun[] {
  const runs: FieldRun[] = [];
  for (const field of fields) {
    const last = runs[runs.length - 1];
    if (field.inline && last?.inline && last.fields.length < 2) last.fields.push(field);
    else runs.push({ inline: !!field.inline, fields: [field] });
  }
  /* A row with one field would leave half the panel empty. */
  for (const run of runs) if (run.fields.length < 2) run.inline = false;
  return runs;
}
