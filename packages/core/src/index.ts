/* ══════════════════════════════ @email-builder/core ══════════════════════════════
 *
 * Document model, block registry, merge-field registry and email compiler.
 * Zero dependencies. Zero framework. Runs in Node and the browser unchanged.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

export * from "./types";

/* ── Registry ── */
export { createBlockRegistry, defineBlock } from "./registry";
export type { BlockRegistry, RegistryOptions } from "./registry";

/* ── Built-in blocks ── */
export * from "./blocks";

/* ── Document ── */
export {
  SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  DEFAULT_ROW_STYLE,
  DEFAULT_COLUMN_STYLE,
  NO_BORDER,
  ROW_LAYOUTS,
  padding,
  createColumn,
  createRow,
  createDocument,
  starterDocument,
} from "./document/defaults";

export {
  findRow,
  findRowIndex,
  findColumn,
  findBlock,
  eachBlock,
  countBlocks,
  addRow,
  insertRow,
  removeRow,
  moveRow,
  duplicateRow,
  reidentifyRow,
  reidentifyBlock,
  updateRowStyle,
  updateRowMeta,
  setRowLayout,
  updateColumnStyle,
  insertBlock,
  removeBlock,
  moveBlock,
  duplicateBlock,
  updateBlock,
  updateBlockContent,
  updateBlockStyle,
  updateSettings,
  updateMeta,
  columnWidths,
  blockWidth,
} from "./document/operations";
export type { BlockLocation, ColumnLocation } from "./document/operations";

export {
  createHistory,
  pushHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  COALESCE_MS,
} from "./document/history";
export type { History, PushOptions } from "./document/history";

export { normalize, backfill, registerMigration, MIGRATIONS } from "./document/migrate";
export type { Migration } from "./document/migrate";

/* ── Merge fields ── */
export { createMergeRegistry, lookup, COMMON_FIELDS, SYNTAX, DEFAULT_SYNTAX } from "./merge/registry";
export type { MergeRegistry, MergeRegistryOptions, RenderOptions } from "./merge/registry";

/* ── Compile ── */
export { compile, compileBody, applyLayout, CONTENT_SLOT_PLACEHOLDER as SLOT } from "./compile/compile";
export type { CompilerDeps } from "./compile/compile";
export { wrapDocument, resetCss, preheaderHtml } from "./compile/shell";
export type { ShellOptions } from "./compile/shell";
export { toPlainText } from "./compile/plain-text";
export { sanitizeBlockContent, sanitizeHtml, isSanitary } from "./compile/sanitize";
export type { SanitizeOptions } from "./compile/sanitize";
export {
  preflight,
  contrastRatio,
  parseColor,
  groupIssues,
  GMAIL_CLIP_BYTES,
  MIN_CONTRAST,
} from "./compile/preflight";
export type { PreflightOptions } from "./compile/preflight";

/* ── Utilities ── */
export {
  escapeHtml,
  escapeAttr,
  safeUrl,
  safeImageUrl,
  styleAttr,
  declarations,
  paddingValue,
  borderValue,
  stripTags,
  minifyHtml,
  px,
  mso,
  notMso,
} from "./util/html";
export { createId, rowId, colId, blockId } from "./util/id";
export { clone, patch } from "./util/clone";
export { formatHtml } from "./util/format";

/* ── One-call setup ──────────────────────────────────────────────────────────────────────────
 *
 * The 90% path: built-in blocks, common merge fields, sensible syntax. A host that wants more
 * control composes the pieces above instead.
 * ─────────────────────────────────────────────────────────────────────── */

import { createBlockRegistry } from "./registry";
import { createMergeRegistry, COMMON_FIELDS } from "./merge/registry";
import { BLOCK_GROUP_ORDER, BUILTIN_BLOCKS } from "./blocks";
import type { BlockDefinition, MergeField, MergeSyntax } from "./types";

export interface SetupOptions {
  /** Added on top of the built-ins. */
  blocks?: BlockDefinition[];
  /** Built-in types to drop. */
  excludeBlocks?: string[];
  /** Replaces the built-in set entirely. */
  replaceBlocks?: BlockDefinition[];
  mergeFields?: MergeField[];
  /** Replaces `COMMON_FIELDS` rather than extending it. */
  replaceMergeFields?: MergeField[];
  mergeSyntax?: MergeSyntax;
  loadMergeFields?: () => Promise<MergeField[]>;
}

export function setup(options: SetupOptions = {}) {
  const blocks = createBlockRegistry({
    blocks: options.replaceBlocks ?? [...BUILTIN_BLOCKS, ...(options.blocks ?? [])],
    exclude: options.excludeBlocks,
    groupOrder: BLOCK_GROUP_ORDER,
  });

  const merge = createMergeRegistry({
    syntax: options.mergeSyntax,
    fields: options.replaceMergeFields ?? [...COMMON_FIELDS, ...(options.mergeFields ?? [])],
    load: options.loadMergeFields,
    groupOrder: ["Contact", "Account", "Sender", "Organisation", "System"],
  });

  return { blocks, merge };
}
