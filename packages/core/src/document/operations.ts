/* ══════════════════════════════ Document operations ══════════════════════════════
 *
 * Every function here is pure: document in, NEW document out, and only the path that changed is
 * cloned. Untouched rows keep their identity, so a view layer can memoise on reference and undo
 * is a pointer swap rather than a deep diff.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

import type { Block, Column, ColumnStyle, DocumentSettings, EmailDocument, Row, RowStyle } from "../types";
import { blockId, colId, rowId } from "../util/id";
import { createColumn, createRow } from "./defaults";

/* ────────────────────────────── Lookups ────────────────────────────── */

export function findRow(doc: EmailDocument, id: string): Row | null {
  return doc.rows.find((r) => r.id === id) ?? null;
}

export function findRowIndex(doc: EmailDocument, id: string): number {
  return doc.rows.findIndex((r) => r.id === id);
}

export interface ColumnLocation {
  row: Row;
  rowIndex: number;
  column: Column;
  columnIndex: number;
}

export function findColumn(doc: EmailDocument, id: string): ColumnLocation | null {
  for (let rowIndex = 0; rowIndex < doc.rows.length; rowIndex += 1) {
    const row = doc.rows[rowIndex]!;
    const columnIndex = row.columns.findIndex((c) => c.id === id);
    if (columnIndex !== -1) return { row, rowIndex, column: row.columns[columnIndex]!, columnIndex };
  }
  return null;
}

export interface BlockLocation extends ColumnLocation {
  block: Block;
  blockIndex: number;
}

export function findBlock(doc: EmailDocument, id: string): BlockLocation | null {
  for (let rowIndex = 0; rowIndex < doc.rows.length; rowIndex += 1) {
    const row = doc.rows[rowIndex]!;
    for (let columnIndex = 0; columnIndex < row.columns.length; columnIndex += 1) {
      const column = row.columns[columnIndex]!;
      const blockIndex = column.blocks.findIndex((b) => b.id === id);
      if (blockIndex !== -1) {
        return { row, rowIndex, column, columnIndex, block: column.blocks[blockIndex]!, blockIndex };
      }
    }
  }
  return null;
}

export function eachBlock(doc: EmailDocument, visit: (location: BlockLocation) => void): void {
  doc.rows.forEach((row, rowIndex) => {
    row.columns.forEach((column, columnIndex) => {
      column.blocks.forEach((block, blockIndex) => {
        visit({ row, rowIndex, column, columnIndex, block, blockIndex });
      });
    });
  });
}

export function countBlocks(doc: EmailDocument, type?: string): number {
  let n = 0;
  eachBlock(doc, ({ block }) => {
    if (!type || block.type === type) n += 1;
  });
  return n;
}

/* ────────────────────────────── Internal writers ────────────────────────────── */

function replaceRow(doc: EmailDocument, index: number, row: Row): EmailDocument {
  const rows = doc.rows.slice();
  rows[index] = row;
  return { ...doc, rows };
}

function replaceColumn(doc: EmailDocument, rowIndex: number, columnIndex: number, column: Column): EmailDocument {
  const row = doc.rows[rowIndex]!;
  const columns = row.columns.slice();
  columns[columnIndex] = column;
  return replaceRow(doc, rowIndex, { ...row, columns });
}

function clampIndex(index: number | undefined, length: number): number {
  if (index === undefined || index === null || index < 0 || index > length) return length;
  return index;
}

/* ────────────────────────────── Rows ────────────────────────────── */

export function addRow(doc: EmailDocument, layout: number[] = [1], index?: number): { doc: EmailDocument; row: Row } {
  const row = createRow(layout);
  const rows = doc.rows.slice();
  rows.splice(clampIndex(index, rows.length), 0, row);
  return { doc: { ...doc, rows }, row };
}

export function insertRow(doc: EmailDocument, row: Row, index?: number): EmailDocument {
  const rows = doc.rows.slice();
  rows.splice(clampIndex(index, rows.length), 0, row);
  return { ...doc, rows };
}

export function removeRow(doc: EmailDocument, id: string): EmailDocument {
  const index = findRowIndex(doc, id);
  if (index === -1) return doc;
  const rows = doc.rows.slice();
  rows.splice(index, 1);
  return { ...doc, rows };
}

export function moveRow(doc: EmailDocument, id: string, toIndex: number): EmailDocument {
  const from = findRowIndex(doc, id);
  if (from === -1) return doc;
  const rows = doc.rows.slice();
  const [row] = rows.splice(from, 1);
  /* Removing first shifts every later index down by one — correct for the target the same way,
     or a downward move always lands one slot short. */
  const to = Math.max(0, Math.min(rows.length, from < toIndex ? toIndex - 1 : toIndex));
  rows.splice(to, 0, row!);
  return { ...doc, rows };
}

export function duplicateRow(doc: EmailDocument, id: string): { doc: EmailDocument; row: Row | null } {
  const index = findRowIndex(doc, id);
  if (index === -1) return { doc, row: null };
  const copy = reidentifyRow(doc.rows[index]!);
  const rows = doc.rows.slice();
  rows.splice(index + 1, 0, copy);
  return { doc: { ...doc, rows }, row: copy };
}

/** Fresh ids all the way down. A duplicated row that shared ids would make selection ambiguous. */
export function reidentifyRow(row: Row): Row {
  return {
    ...row,
    id: rowId(),
    style: { ...row.style, padding: { ...row.style.padding }, border: { ...row.style.border } },
    columns: row.columns.map((column) => ({
      ...column,
      id: colId(),
      style: { ...column.style, padding: { ...column.style.padding }, border: { ...column.style.border } },
      blocks: column.blocks.map(reidentifyBlock),
    })),
  };
}

export function reidentifyBlock(block: Block): Block {
  return { ...block, id: blockId(), content: structuredCloneish(block.content), style: structuredCloneish(block.style) };
}

function structuredCloneish<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? {})) as T;
}

export function updateRowStyle(doc: EmailDocument, id: string, changes: Partial<RowStyle>): EmailDocument {
  const index = findRowIndex(doc, id);
  if (index === -1) return doc;
  const row = doc.rows[index]!;
  return replaceRow(doc, index, { ...row, style: { ...row.style, ...changes } });
}

export function updateRowMeta(doc: EmailDocument, id: string, meta: Record<string, any>): EmailDocument {
  const index = findRowIndex(doc, id);
  if (index === -1) return doc;
  const row = doc.rows[index]!;
  return replaceRow(doc, index, { ...row, meta: { ...(row.meta ?? {}), ...meta } });
}

/* ────────────────────────────── Layout changes ──────────────────────────────
 *
 * Changing a row from three columns to two must not silently delete a column's worth of work.
 * Surplus columns are emptied into the last surviving one, in order.
 * ─────────────────────────────────────────────────────────────────────── */

export function setRowLayout(doc: EmailDocument, id: string, layout: number[]): EmailDocument {
  const index = findRowIndex(doc, id);
  if (index === -1 || !layout.length) return doc;
  const row = doc.rows[index]!;

  const columns: Column[] = [];
  for (let i = 0; i < layout.length; i += 1) columns.push(row.columns[i] ?? createColumn());

  if (row.columns.length > layout.length) {
    const target = columns[columns.length - 1]!;
    const orphaned = row.columns.slice(layout.length).flatMap((c) => c.blocks);
    columns[columns.length - 1] = { ...target, blocks: [...target.blocks, ...orphaned] };
  }

  return replaceRow(doc, index, { ...row, layout: [...layout], columns });
}

/* ────────────────────────────── Columns ────────────────────────────── */

export function updateColumnStyle(doc: EmailDocument, id: string, changes: Partial<ColumnStyle>): EmailDocument {
  const found = findColumn(doc, id);
  if (!found) return doc;
  return replaceColumn(doc, found.rowIndex, found.columnIndex, {
    ...found.column,
    style: { ...found.column.style, ...changes },
  });
}

/* ────────────────────────────── Blocks ────────────────────────────── */

export function insertBlock(doc: EmailDocument, block: Block, columnId: string, index?: number): EmailDocument {
  const found = findColumn(doc, columnId);
  if (!found) return doc;
  const blocks = found.column.blocks.slice();
  blocks.splice(clampIndex(index, blocks.length), 0, block);
  return replaceColumn(doc, found.rowIndex, found.columnIndex, { ...found.column, blocks });
}

export function removeBlock(doc: EmailDocument, id: string): EmailDocument {
  const found = findBlock(doc, id);
  if (!found) return doc;
  const blocks = found.column.blocks.slice();
  blocks.splice(found.blockIndex, 1);
  return replaceColumn(doc, found.rowIndex, found.columnIndex, { ...found.column, blocks });
}

export function moveBlock(doc: EmailDocument, id: string, toColumnId: string, toIndex?: number): EmailDocument {
  const from = findBlock(doc, id);
  if (!from) return doc;
  const target = findColumn(doc, toColumnId);
  if (!target) return doc;

  /* Same column: one splice pair, with the same index correction `moveRow` needs. */
  if (from.column.id === toColumnId) {
    const blocks = from.column.blocks.slice();
    const [block] = blocks.splice(from.blockIndex, 1);
    const desired = clampIndex(toIndex, blocks.length + 1);
    const to = Math.max(0, Math.min(blocks.length, from.blockIndex < desired ? desired - 1 : desired));
    blocks.splice(to, 0, block!);
    return replaceColumn(doc, from.rowIndex, from.columnIndex, { ...from.column, blocks });
  }

  const sourceBlocks = from.column.blocks.slice();
  const [block] = sourceBlocks.splice(from.blockIndex, 1);
  let next = replaceColumn(doc, from.rowIndex, from.columnIndex, { ...from.column, blocks: sourceBlocks });

  /* Re-find: the column object identity changed in the line above. */
  const landing = findColumn(next, toColumnId)!;
  const targetBlocks = landing.column.blocks.slice();
  targetBlocks.splice(clampIndex(toIndex, targetBlocks.length), 0, block!);
  next = replaceColumn(next, landing.rowIndex, landing.columnIndex, { ...landing.column, blocks: targetBlocks });
  return next;
}

export function duplicateBlock(doc: EmailDocument, id: string): { doc: EmailDocument; block: Block | null } {
  const found = findBlock(doc, id);
  if (!found) return { doc, block: null };
  const copy = reidentifyBlock(found.block);
  const blocks = found.column.blocks.slice();
  blocks.splice(found.blockIndex + 1, 0, copy);
  return { doc: replaceColumn(doc, found.rowIndex, found.columnIndex, { ...found.column, blocks }), block: copy };
}

export function updateBlock(doc: EmailDocument, id: string, changes: Partial<Block>): EmailDocument {
  const found = findBlock(doc, id);
  if (!found) return doc;
  const blocks = found.column.blocks.slice();
  blocks[found.blockIndex] = { ...found.block, ...changes };
  return replaceColumn(doc, found.rowIndex, found.columnIndex, { ...found.column, blocks });
}

export function updateBlockContent(doc: EmailDocument, id: string, changes: Record<string, any>): EmailDocument {
  const found = findBlock(doc, id);
  if (!found) return doc;
  return updateBlock(doc, id, { content: { ...found.block.content, ...changes } });
}

export function updateBlockStyle(doc: EmailDocument, id: string, changes: Record<string, any>): EmailDocument {
  const found = findBlock(doc, id);
  if (!found) return doc;
  return updateBlock(doc, id, { style: { ...found.block.style, ...changes } });
}

/* ────────────────────────────── Settings ────────────────────────────── */

export function updateSettings(doc: EmailDocument, changes: Partial<DocumentSettings>): EmailDocument {
  return { ...doc, settings: { ...doc.settings, ...changes } };
}

export function updateMeta(doc: EmailDocument, changes: Record<string, any>): EmailDocument {
  return { ...doc, meta: { ...(doc.meta ?? {}), ...changes } };
}

/* ────────────────────────────── Geometry ──────────────────────────────
 *
 * The pixel width of each column, after the row's own padding is taken out. Blocks need this at
 * render time — an image sized "100%" has to become a hard `width` attribute for Outlook.
 * ─────────────────────────────────────────────────────────────────────── */

export function columnWidths(row: Row, contentWidth: number): number[] {
  const inner = Math.max(0, contentWidth - (row.style.padding.left || 0) - (row.style.padding.right || 0));
  const total = row.layout.reduce((sum, n) => sum + (n || 0), 0) || row.layout.length || 1;
  const widths = row.layout.map((weight) => Math.floor((inner * (weight || 0)) / total));
  /* Hand the rounding remainder to the last column so the row always sums to `inner`. */
  const drift = inner - widths.reduce((sum, n) => sum + n, 0);
  if (widths.length) widths[widths.length - 1] = (widths[widths.length - 1] ?? 0) + drift;
  return widths;
}

/** Column width minus the column's own padding — what a block actually gets to fill. */
export function blockWidth(row: Row, columnIndex: number, contentWidth: number): number {
  const column = row.columns[columnIndex];
  const width = columnWidths(row, contentWidth)[columnIndex] ?? contentWidth;
  if (!column) return width;
  return Math.max(0, width - (column.style.padding.left || 0) - (column.style.padding.right || 0));
}
