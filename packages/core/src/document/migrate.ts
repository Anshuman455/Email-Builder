/* ══════════════════════════════ Schema migrations ══════════════════════════════
 *
 * Once a host stores documents, the builder can no longer change their shape freely. Every
 * breaking change adds a step here; `normalize` runs them in order and is safe to call on any
 * document, of any age, any number of times.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

import type { EmailDocument, Row } from "../types";
import { DEFAULT_COLUMN_STYLE, DEFAULT_ROW_STYLE, DEFAULT_SETTINGS, NO_BORDER, SCHEMA_VERSION, createRow } from "./defaults";
import { blockId, colId, rowId } from "../util/id";

export type Migration = (doc: any) => any;

/** Keyed by the version they migrate FROM. `1` is the first published shape, so nothing yet. */
export const MIGRATIONS: Record<number, Migration> = {};

export function registerMigration(fromVersion: number, migration: Migration): void {
  MIGRATIONS[fromVersion] = migration;
}

/* ────────────────────────────── Normalisation ──────────────────────────────
 *
 * Separate from migration on purpose. Migration handles known version steps; normalisation repairs
 * documents that are merely INCOMPLETE — hand-written fixtures, AI output, a block whose
 * definition gained a style key since the document was saved. It never throws.
 * ─────────────────────────────────────────────────────────────────────── */

export function normalize(input: any): EmailDocument {
  let doc = input && typeof input === "object" ? input : {};

  let version = Number(doc.schemaVersion) || 1;
  while (version < SCHEMA_VERSION && MIGRATIONS[version]) {
    doc = MIGRATIONS[version]!(doc);
    version += 1;
  }

  const settings = { ...DEFAULT_SETTINGS, ...(doc.settings ?? {}) };
  settings.contentWidth = clamp(Number(settings.contentWidth) || DEFAULT_SETTINGS.contentWidth, 320, 900);

  const rows: Row[] = Array.isArray(doc.rows) ? doc.rows.map(normalizeRow).filter(Boolean) : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    settings,
    rows: rows.length ? rows : [createRow([1])],
    ...(doc.meta ? { meta: doc.meta } : {}),
  };
}

function normalizeRow(input: any): Row {
  const layout: number[] =
    Array.isArray(input?.layout) && input.layout.length
      ? input.layout.map((n: any) => Math.max(1, Number(n) || 1))
      : [1];

  const style = {
    ...DEFAULT_ROW_STYLE,
    ...(input?.style ?? {}),
    padding: { ...DEFAULT_ROW_STYLE.padding, ...(input?.style?.padding ?? {}) },
    border: { ...NO_BORDER, ...(input?.style?.border ?? {}) },
  };

  const columns = layout.map((_, index) => {
    const source = Array.isArray(input?.columns) ? input.columns[index] : undefined;
    return {
      id: String(source?.id || colId()),
      blocks: Array.isArray(source?.blocks) ? source.blocks.map(normalizeBlock).filter(Boolean) : [],
      style: {
        ...DEFAULT_COLUMN_STYLE,
        ...(source?.style ?? {}),
        padding: { ...DEFAULT_COLUMN_STYLE.padding, ...(source?.style?.padding ?? {}) },
        border: { ...NO_BORDER, ...(source?.style?.border ?? {}) },
      },
    };
  });

  return { id: String(input?.id || rowId()), layout, columns, style, ...(input?.meta ? { meta: input.meta } : {}) };
}

function normalizeBlock(input: any): any {
  if (!input || typeof input !== "object" || !input.type) return null;
  return {
    id: String(input.id || blockId()),
    type: String(input.type),
    content: input.content && typeof input.content === "object" ? input.content : {},
    style: input.style && typeof input.style === "object" ? input.style : {},
    ...(input.meta ? { meta: input.meta } : {}),
  };
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/* ────────────────────────────── Definition backfill ──────────────────────────────
 *
 * A block saved before its definition gained a key would render with `undefined` in a style slot.
 * Backfilling against the registry's current defaults is what makes adding a field to a custom
 * block a non-breaking change for the host.
 * ─────────────────────────────────────────────────────────────────────── */

export function backfill(doc: EmailDocument, defaultsFor: (type: string) => { content: any; style: any } | null): EmailDocument {
  return {
    ...doc,
    rows: doc.rows.map((row) => ({
      ...row,
      columns: row.columns.map((column) => ({
        ...column,
        blocks: column.blocks.map((block) => {
          const defaults = defaultsFor(block.type);
          if (!defaults) return block;
          return {
            ...block,
            content: { ...defaults.content, ...block.content },
            style: { ...defaults.style, ...block.style },
          };
        }),
      })),
    })),
  };
}
