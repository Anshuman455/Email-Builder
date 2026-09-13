/* ══════════════════════════════ Editor ══════════════════════════════
 *
 * The headless builder. Owns the document, history, selection, drag and autosave; owns no DOM and
 * no framework. `@email-builder/react` and `@email-builder/vue` are thin bindings over this —
 * which is the whole reason the editor can exist in two frameworks without two implementations.
 *
 * ── History wraps the document ────────────────────────────────────────────────────────────────
 * `history.present` IS the document. A separate document field would be a second source of truth
 * that has to be kept in step on every undo, and that is where undo bugs come from.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

import type { FontDefinition } from "@email-builder/core";
import { reidentifyBlock, reidentifyRow } from "@email-builder/core";
import { htmlToRows } from "./import";
import { sanitizeHtml } from "@email-builder/core";
import {
  addRow as addRowOp,
  backfill,
  canRedo,
  canUndo,
  compile,
  createHistory,
  duplicateBlock as duplicateBlockOp,
  duplicateRow as duplicateRowOp,
  findBlock,
  findColumn,
  findRow,
  insertBlock as insertBlockOp,
  insertRow as insertRowOp,
  moveBlock as moveBlockOp,
  moveRow as moveRowOp,
  normalize,
  preflight as preflightDoc,
  pushHistory,
  redo as redoHistory,
  removeBlock as removeBlockOp,
  removeRow as removeRowOp,
  setRowLayout as setRowLayoutOp,
  undo as undoHistory,
  updateBlockContent as updateBlockContentOp,
  updateBlockStyle as updateBlockStyleOp,
  updateColumnStyle as updateColumnStyleOp,
  updateMeta as updateMetaOp,
  updateRowStyle as updateRowStyleOp,
  updateSettings as updateSettingsOp,
  type Block,
  type BlockRegistry,
  type CompileOptions,
  type CompileResult,
  type DocumentSettings,
  type EmailDocument,
  type FieldGroup,
  type History,
  type MergeRegistry,
  type PreflightIssue,
  type Row,
} from "@email-builder/core";

import { createEmitter, createStore, type Emitter, type Store } from "./store";
import { createDragEngine, type DragEngine, type DragState, type DropEvent } from "./drag";
import { createAutosave, type Autosave, type SaveStatus } from "./autosave";
import type { Adapter } from "./adapter";

/* ────────────────────────────── State ────────────────────────────── */

export type Selection =
  | { kind: "block"; id: string }
  | { kind: "row"; id: string }
  | { kind: "column"; id: string }
  | { kind: "settings" }
  | null;

/** A block or row that can join a multi-selection. */
export interface SelectableTarget {
  kind: "block" | "row";
  id: string;
}

/** Marks clipboard text written by `copySelection`, so paste can tell it from anything else. */
export const CLIPBOARD_FORMAT = "email-builder/clipboard";

export interface EditorState {
  document: EmailDocument;
  selection: Selection;
  /** Every block or row in the selection, in document order — more than one after ⌘/Ctrl- or
   *  Shift-click. Same kind as `selection`, which is the item clicked last. */
  selectedIds: string[];
  /** Flashes whatever was just added, duplicated or moved — after a drop the eye is on the
   *  pointer, not on the row the block landed in. */
  landedId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  saveStatus: SaveStatus;
  saveError: unknown;
  /** Preview device width, or null for the editing canvas. */
  device: string;
  mode: string;
  /** Block whose primary text is being edited in place. */
  editingBlockId: string | null;
}

export interface EditorEvents {
  change: { document: EmailDocument; reason: string };
  select: Selection;
  drop: DropEvent;
  save: { document: EmailDocument };
  error: { error: unknown; where: string };
  "block:add": { block: Block; columnId: string };
  "block:remove": { blockId: string };
  "row:add": { row: Row; index: number };
}

export interface EditorOptions {
  document?: EmailDocument | unknown;
  blocks: BlockRegistry;
  merge?: MergeRegistry;
  adapter?: Adapter;
  /** `"email"` offers every block; `"layout"` offers the content slot and hides composition. */
  mode?: string;
  /** Registered brand fonts — offered in font pickers and linked in the compiled email. */
  fonts?: FontDefinition[];
  save?: (document: EmailDocument) => Promise<void> | void;
  autosave?: { debounceMs?: number; maxWaitMs?: number; enabled?: boolean };
  historyLimit?: number;
  onChange?: (document: EmailDocument) => void;
}

export interface Editor {
  state: Store<EditorState>;
  events: Emitter<EditorEvents>;
  dnd: DragEngine;
  blocks: BlockRegistry;
  merge: MergeRegistry | undefined;
  adapter: Adapter;
  mode: string;

  /* Reads */
  getDocument(): EmailDocument;
  getSelection(): Selection;
  getSelectedBlock(): Block | null;
  getSelectedRow(): Row | null;
  /** Brand fonts registered with the editor. */
  readonly fonts: FontDefinition[];
  getSchema(): FieldGroup[];
  /** Apply a drop exactly as a pointer drop would — for custom drag UIs, keyboard flows and tests. */
  drop(event: DropEvent): void;
  /** Bring outside HTML into the design — pasted markup, an uploaded file, or an email's own HTML
   *  edited by hand.
   *
   *  `as: "blocks"` (default) converts it into editable heading, text, image, button, list and
   *  divider blocks, with side-by-side table cells as multi-column rows; page chrome such as
   *  navigation, forms and icon fonts is dropped. `as: "html"` keeps it as one sanitised HTML block.
   *  Where there is no DOM to parse with (Node), conversion falls back to `"html"`.
   *
   *  `mode: "append"` (default) adds the content after the existing rows; `"replace"` swaps the whole
   *  design for it. One undo step either way. Returns the blocks added — empty when nothing usable
   *  was found. */
  importHtml(html: string, options?: { mode?: "append" | "replace"; as?: "blocks" | "html" }): Block[];
  compile(options?: CompileOptions): CompileResult;
  preflight(): PreflightIssue[];

  /* Selection */
  select(selection: Selection): void;
  /** Add or remove a block or row from the selection (⌘/Ctrl-click). Another kind starts over. */
  toggleSelection(target: SelectableTarget): void;
  /** Select everything between the current item and this one, in document order (Shift-click). */
  selectRange(target: SelectableTarget): void;
  /** Ids of the selected blocks or rows, in document order. */
  getSelectedIds(): string[];
  /** Delete every selected block or row, as one undo step. Returns false when nothing was deletable. */
  removeSelected(): boolean;
  /** Duplicate every selected block or row next to its original, as one undo step. */
  duplicateSelected(): void;
  /** The selection as clipboard text (JSON), or null when nothing copyable is selected. */
  copySelection(): string | null;
  /** Paste clipboard text from `copySelection` — from this email or another — after the selection.
   *  Other text is ignored; `html` from elsewhere is imported as blocks. Returns true when something
   *  was added. */
  paste(text: string, html?: string): boolean;
  selectNext(direction: 1 | -1): void;
  beginInlineEdit(blockId: string): void;
  endInlineEdit(): void;
  setDevice(device: string): void;

  /* Rows */
  addRow(layout?: number[], index?: number): Row | null;
  removeRow(id: string): void;
  moveRow(id: string, toIndex: number): void;
  duplicateRow(id: string): void;
  setRowLayout(id: string, layout: number[]): void;
  updateRowStyle(id: string, changes: Record<string, any>, label?: string): void;
  updateColumnStyle(id: string, changes: Record<string, any>, label?: string): void;

  /* Blocks */
  addBlock(type: string, columnId: string, index?: number): Block | null;
  insertBlock(block: Block, columnId: string, index?: number): void;
  removeBlock(id: string): void;
  duplicateBlock(id: string): void;
  moveBlock(id: string, toColumnId: string, index?: number): void;
  updateContent(id: string, changes: Record<string, any>, label?: string): void;
  updateStyle(id: string, changes: Record<string, any>, label?: string): void;

  /* Document */
  updateSettings(changes: Partial<DocumentSettings>, label?: string): void;
  updateMeta(changes: Record<string, any>): void;
  replaceDocument(document: EmailDocument | unknown, options?: { silent?: boolean }): void;

  /* History & persistence */
  undo(): void;
  redo(): void;
  save(): Promise<void>;
  isDirty(): boolean;

  destroy(): void;
}

/* ────────────────────────────── Implementation ────────────────────────────── */

export function createEditor(options: EditorOptions): Editor {
  const blocks = options.blocks;
  const merge = options.merge;
  const adapter = options.adapter ?? {};
  const mode = options.mode ?? "email";

  const initial = backfill(normalize(options.document), (type) => blocks.defaultsFor(type));
  let history: History<EmailDocument> = createHistory(initial, options.historyLimit);

  const state = createStore<EditorState>({
    document: initial,
    selection: null,
    selectedIds: [],
    landedId: null,
    canUndo: false,
    canRedo: false,
    saveStatus: "idle",
    saveError: null,
    device: "desktop",
    mode,
    editingBlockId: null,
  });

  const events = createEmitter<EditorEvents>();
  let landingTimer: ReturnType<typeof setTimeout> | null = null;

  /* ── Commit ──
   *
   * The single write path. Everything that changes the document goes through here, so history,
   * autosave, the store and the `change` event can never disagree about what the document is. */
  function commit(next: EmailDocument, reason: string, label?: string) {
    if (next === history.present) return;
    history = pushHistory(history, next, { label });
    publish(reason);
    autosave.touch(next);
    options.onChange?.(next);
  }

  function publish(reason: string) {
    state.set((current) => ({
      ...current,
      document: history.present,
      canUndo: canUndo(history),
      canRedo: canRedo(history),
    }));
    events.emit("change", { document: history.present, reason });
  }

  function land(id: string | null) {
    if (landingTimer) clearTimeout(landingTimer);
    state.set((current) => ({ ...current, landedId: id }));
    if (!id) return;
    landingTimer = setTimeout(() => state.set((current) => ({ ...current, landedId: null })), 620);
  }

  /* ── Autosave ── */

  const autosave: Autosave<EmailDocument> = createAutosave<EmailDocument>({
    debounceMs: options.autosave?.debounceMs,
    maxWaitMs: options.autosave?.maxWaitMs,
    enabled: options.autosave?.enabled !== false && !!options.save,
    save: async (document) => {
      if (!options.save) return;
      await options.save(document);
      events.emit("save", { document });
    },
    onStatus: (status, error) => {
      state.set((current) => ({ ...current, saveStatus: status, saveError: error ?? null }));
      if (status === "error") {
        events.emit("error", { error, where: "save" });
        adapter.notify?.error?.("Could not save your changes.");
      }
    },
  });
  autosave.reset(initial);

  /* ── Drag ──
   *
   * The engine reports "this source landed on that target, on this edge"; translating that into a
   * document operation is the editor's job, because only the editor knows what a row slot means. */

  const dnd = createDragEngine({
    onDrop: (event) => {
      events.emit("drop", event);
      applyDrop(event);
    },
  });

  function applyDrop({ source, target, edge }: DropEvent) {
    const doc = history.present;

    /* A new block from the palette. */
    if (source.kind === "palette") {
      const block = blocks.create(source.blockType);
      if (!block) return;
      const landing = resolveBlockLanding(doc, target, edge);
      if (!landing) return;
      commit(insertBlockOp(landing.doc, block, landing.columnId, landing.index), "block:add");
      select({ kind: "block", id: block.id });
      land(block.id);
      events.emit("block:add", { block, columnId: landing.columnId });
      return;
    }

    /* An existing block moving. */
    if (source.kind === "block") {
      /* Dragging one of several selected blocks moves all of them, in document order. */
      const group = currentSelection();
      if (group?.kind === "block" && group.ids.length > 1 && group.ids.includes(source.blockId)) {
        if (target.kind === "block" && group.ids.includes(target.blockId)) return;
        const moving = group.ids.map((id) => findBlock(doc, id)?.block).filter((block): block is Block => !!block);
        const without = group.ids.reduce((working, id) => removeBlockOp(working, id), doc);
        const landing = resolveBlockLanding(without, target, edge);
        if (!landing) return;
        let next = landing.doc;
        moving.forEach((block, offset) => {
          next = insertBlockOp(next, block, landing.columnId, landing.index + offset);
        });
        commit(next, "block:move");
        land(source.blockId);
        return;
      }
      const landing = resolveBlockLanding(doc, target, edge);
      if (!landing) return;
      commit(moveBlockOp(landing.doc, source.blockId, landing.columnId, landing.index), "block:move");
      land(source.blockId);
      return;
    }

    /* A new row from the palette. */
    if (source.kind === "palette-row") {
      let index: number = doc.rows.length;
      if (target.kind === "row-slot") {
        index = target.index;
      } else if (target.kind === "row") {
        index = edge === "before" ? target.index : target.index + 1;
      } else if (target.kind === "column") {
        const found = findColumn(doc, target.columnId);
        if (found) index = edge === "before" ? found.rowIndex : found.rowIndex + 1;
      } else if (target.kind === "block") {
        const found = findBlock(doc, target.blockId);
        if (found) index = edge === "before" ? found.rowIndex : found.rowIndex + 1;
      }
      const { doc: withRow, row } = addRowOp(doc, source.spans, index);
      commit(withRow, "row:add");
      select({ kind: "row", id: row.id });
      land(row.id);
      events.emit("row:add", { row, index });
      return;
    }

    /* A whole row reordering. */
    if (source.kind === "row") {
      let index: number | null = null;
      if (target.kind === "row-slot") index = target.index;
      else if (target.kind === "row") index = edge === "before" ? target.index : target.index + 1;
      else if (target.kind === "column") {
        const found = findColumn(doc, target.columnId);
        if (found) index = edge === "before" ? found.rowIndex : found.rowIndex + 1;
      } else if (target.kind === "block") {
        const found = findBlock(doc, target.blockId);
        if (found) index = edge === "before" ? found.rowIndex : found.rowIndex + 1;
      }
      if (index === null) return;
      commit(moveRowOp(doc, source.rowId, index), "row:move");
      land(source.rowId);
      return;
    }
  }

  function resolveBlockLanding(
    doc: EmailDocument,
    target: DropEvent["target"],
    edge: DropEvent["edge"],
  ): { doc: EmailDocument; columnId: string; index: number } | null {
    if (target.kind === "column") {
      const found = findColumn(doc, target.columnId);
      return found ? { doc, columnId: target.columnId, index: found.column.blocks.length } : null;
    }
    if (target.kind === "block") {
      const found = findBlock(doc, target.blockId);
      if (!found) return null;
      return { doc, columnId: found.column.id, index: edge === "before" ? found.blockIndex : found.blockIndex + 1 };
    }
    /* A block dropped on a row slot (or a row's own edge) gets a row of its own — the alternative
       is silently discarding the drop, which reads as the editor being broken.
       The new row is returned inside `doc` rather than committed here: the caller's insert or
       move must operate on the document that contains the row. Operating on the original `doc`
       could not find the new column, returned it unchanged, and threw the drop away. It also
       keeps "add row + place block" as one undo step. */
    if (target.kind === "row-slot" || target.kind === "row") {
      const index = target.kind === "row" && edge === "after" ? target.index + 1 : target.index;
      const { doc: withRow, row } = addRowOp(doc, [1], index);
      return { doc: withRow, columnId: row.columns[0]!.id, index: 0 };
    }
    return null;
  }

  /* ── Selection ── */

  /* ── Multi-selection & clipboard helpers ── */

  function orderedIds(doc: EmailDocument, kind: "block" | "row"): string[] {
    if (kind === "row") return doc.rows.map((row) => row.id);
    const ids: string[] = [];
    for (const row of doc.rows) for (const column of row.columns) for (const block of column.blocks) ids.push(block.id);
    return ids;
  }

  /** The selection as a set of existing ids, in document order — or null for no block/row selection. */
  function currentSelection(): { kind: "block" | "row"; ids: string[] } | null {
    const { selection, selectedIds } = state.get();
    if (!selection || (selection.kind !== "block" && selection.kind !== "row")) return null;
    const wanted = new Set([...selectedIds, selection.id]);
    const ids = orderedIds(history.present, selection.kind).filter((id) => wanted.has(id));
    return ids.length ? { kind: selection.kind, ids } : null;
  }

  function selectMany(kind: "block" | "row", ids: string[], primary: string) {
    state.set((current) => ({ ...current, selection: { kind, id: primary } as Selection, selectedIds: ids, editingBlockId: null }));
    events.emit("select", state.get().selection);
  }

  function readClipboard(text: string): { kind: "block" | "row"; items: unknown[] } | null {
    if (!text || !text.includes(CLIPBOARD_FORMAT)) return null;
    try {
      const data = JSON.parse(text);
      if (data?.format !== CLIPBOARD_FORMAT || (data.kind !== "block" && data.kind !== "row") || !Array.isArray(data.items)) return null;
      return { kind: data.kind, items: data.items };
    } catch {
      return null;
    }
  }

  /** Content from another email may predate keys this version's blocks expect. */
  function withDefaults(block: Block): Block {
    const defaults = blocks.defaultsFor(block.type);
    return defaults ? { ...block, content: { ...defaults.content, ...block.content }, style: { ...defaults.style, ...block.style } } : block;
  }

  function select(selection: Selection) {
    state.set((current) => ({
      ...current,
      selection,
      selectedIds: selection && (selection.kind === "block" || selection.kind === "row") ? [selection.id] : [],
      editingBlockId: selection?.kind === "block" && current.editingBlockId === selection.id ? current.editingBlockId : null,
    }));
    events.emit("select", selection);
  }

  /* ── Commands ── */

  const editor: Editor = {
    state,
    events,
    dnd,
    blocks,
    merge,
    adapter,
    mode,

    getDocument: () => history.present,
    getSelection: () => state.get().selection,

    getSelectedBlock() {
      const selection = state.get().selection;
      if (selection?.kind !== "block") return null;
      return findBlock(history.present, selection.id)?.block ?? null;
    },

    getSelectedRow() {
      const selection = state.get().selection;
      if (selection?.kind !== "row") return null;
      return findRow(history.present, selection.id);
    },

    getSchema() {
      const block = editor.getSelectedBlock();
      if (!block) return [];
      return blocks.schemaFor(block, history.present);
    },

    drop: (event) => applyDrop(event),

    importHtml(html, importOptions = {}) {
      const replace = importOptions.mode === "replace";
      let rows = importOptions.as === "html" ? null : htmlToRows(html, blocks);

      if (!rows) {
        const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html);
        const markup = sanitizeHtml((body ? body[1]! : html).trim());
        const block = markup.trim() ? blocks.create("html") : null;
        if (!block) return [];
        block.content = { ...block.content, html: markup };
        rows = [{ spans: [1], columns: [[block]] }];
      }
      if (!rows.length) return [];

      let doc = replace ? { ...history.present, rows: [] } : history.present;
      const added: Block[] = [];
      for (const imported of rows) {
        const { doc: withRow, row } = addRowOp(doc, imported.spans, doc.rows.length);
        doc = withRow;
        imported.columns.forEach((column, columnIndex) => {
          column.forEach((block, blockIndex) => {
            doc = insertBlockOp(doc, block, row.columns[columnIndex]!.id, blockIndex);
            added.push(block);
          });
        });
      }
      if (!added.length) return [];

      commit(doc, "block:add", replace ? "import:replace" : "import:append");
      select({ kind: "block", id: added[0]!.id });
      land(added[0]!.id);
      return added;
    },

    fonts: options.fonts ?? [],

    compile: (compileOptions) => compile(history.present, { blocks, merge, fonts: options.fonts }, compileOptions),
    preflight: () => preflightDoc(history.present, { blocks, merge }),

    select,

    toggleSelection(target) {
      const current = currentSelection();
      if (!current || current.kind !== target.kind) return select(target as Selection);
      const next = current.ids.includes(target.id) ? current.ids.filter((id) => id !== target.id) : [...current.ids, target.id];
      const ordered = orderedIds(history.present, target.kind).filter((id) => next.includes(id));
      if (!ordered.length) return select(null);
      selectMany(target.kind, ordered, ordered.includes(target.id) ? target.id : ordered[ordered.length - 1]!);
    },

    selectRange(target) {
      const current = currentSelection();
      const anchor = state.get().selection;
      if (!current || !anchor || current.kind !== target.kind) return select(target as Selection);
      const order = orderedIds(history.present, target.kind);
      const from = order.indexOf((anchor as { id: string }).id);
      const to = order.indexOf(target.id);
      if (from === -1 || to === -1) return select(target as Selection);
      selectMany(target.kind, order.slice(Math.min(from, to), Math.max(from, to) + 1), (anchor as { id: string }).id);
    },

    getSelectedIds: () => currentSelection()?.ids ?? [],

    removeSelected() {
      const current = currentSelection();
      if (!current) return false;
      const doc = current.ids.reduce((working, id) => (current.kind === "block" ? removeBlockOp(working, id) : removeRowOp(working, id)), history.present);
      commit(doc, `${current.kind}:remove`);
      select(null);
      return true;
    },

    duplicateSelected() {
      const current = currentSelection();
      if (!current) return;
      let doc = history.present;
      const copies: string[] = [];
      for (const id of current.ids) {
        if (current.kind === "block") {
          const result = duplicateBlockOp(doc, id);
          doc = result.doc;
          if (result.block) copies.push(result.block.id);
        } else {
          const result = duplicateRowOp(doc, id);
          doc = result.doc;
          if (result.row) copies.push(result.row.id);
        }
      }
      if (!copies.length) return;
      commit(doc, `${current.kind}:duplicate`);
      const ordered = orderedIds(doc, current.kind).filter((id) => copies.includes(id));
      selectMany(current.kind, ordered, ordered[ordered.length - 1]!);
      land(ordered[ordered.length - 1] ?? null);
    },

    copySelection() {
      const current = currentSelection();
      if (!current) return null;
      const doc = history.present;
      const items =
        current.kind === "block"
          ? current.ids.map((id) => findBlock(doc, id)?.block).filter(Boolean)
          : current.ids.map((id) => doc.rows.find((row) => row.id === id)).filter(Boolean);
      if (!items.length) return null;
      return JSON.stringify({ format: CLIPBOARD_FORMAT, version: 1, kind: current.kind, items });
    },

    paste(text, html) {
      const payload = readClipboard(text);
      if (!payload) return html && html.trim() ? editor.importHtml(html).length > 0 : false;

      let doc = history.present;
      const current = currentSelection();
      const selection = state.get().selection;

      if (payload.kind === "block") {
        const pasted = (payload.items as Block[])
          .filter((block) => block && typeof block.type === "string" && blocks.get(block.type))
          .map((block) => withDefaults(reidentifyBlock(block)));
        if (!pasted.length) return false;

        let columnId: string | null = null;
        let index = 0;
        if (current?.kind === "block") {
          const last = findBlock(doc, current.ids[current.ids.length - 1]!);
          if (last) {
            columnId = last.column.id;
            index = last.blockIndex + 1;
          }
        } else if (selection?.kind === "column") {
          const column = findColumn(doc, selection.id);
          if (column) {
            columnId = column.column.id;
            index = column.column.blocks.length;
          }
        }
        if (!columnId) {
          const at = current?.kind === "row" ? doc.rows.findIndex((row) => row.id === current.ids[current.ids.length - 1]) + 1 : doc.rows.length;
          const { doc: withRow, row } = addRowOp(doc, [1], at);
          doc = withRow;
          columnId = row.columns[0]!.id;
        }
        pasted.forEach((block, offset) => {
          doc = insertBlockOp(doc, block, columnId!, index + offset);
        });
        commit(doc, "block:add");
        const ids = pasted.map((block) => block.id);
        selectMany("block", ids, ids[ids.length - 1]!);
        land(ids[ids.length - 1]!);
        return true;
      }

      const rows = (payload.items as Row[])
        .filter((row) => row && Array.isArray(row.columns))
        .map((row) =>
          reidentifyRow({
            ...row,
            columns: row.columns.map((column) => ({ ...column, blocks: (column.blocks ?? []).filter((block) => block && blocks.get(block.type)).map(withDefaults) })),
          }),
        );
      if (!rows.length) return false;
      let at = doc.rows.length;
      if (current?.kind === "row") at = doc.rows.findIndex((row) => row.id === current.ids[current.ids.length - 1]) + 1;
      else if (current?.kind === "block") {
        const last = findBlock(doc, current.ids[current.ids.length - 1]!);
        if (last) at = last.rowIndex + 1;
      }
      rows.forEach((row, offset) => {
        doc = insertRowOp(doc, row, at + offset);
      });
      commit(doc, "row:add");
      const ids = rows.map((row) => row.id);
      selectMany("row", ids, ids[ids.length - 1]!);
      land(ids[ids.length - 1]!);
      return true;
    },

    /** Tab-order traversal of every block, so the inspector is reachable without a pointer. */
    selectNext(direction) {
      const doc = history.present;
      const ids: string[] = [];
      for (const row of doc.rows) for (const column of row.columns) for (const block of column.blocks) ids.push(block.id);
      if (!ids.length) return;
      const selection = state.get().selection;
      const at = selection?.kind === "block" ? ids.indexOf(selection.id) : -1;
      const next = ids[(at + direction + ids.length) % ids.length]!;
      select({ kind: "block", id: next });
    },

    beginInlineEdit(blockId) {
      const definition = blocks.get(findBlock(history.present, blockId)?.block.type ?? "");
      if (!definition?.inlineEditKey) return;
      state.set((current) => ({ ...current, selection: { kind: "block", id: blockId }, selectedIds: [blockId], editingBlockId: blockId }));
    },

    endInlineEdit() {
      state.set((current) => (current.editingBlockId === null ? current : { ...current, editingBlockId: null }));
    },

    setDevice: (device) => state.set((current) => ({ ...current, device })),

    addRow(layout = [1], index) {
      const { doc, row } = addRowOp(history.present, layout, index);
      commit(doc, "row:add");
      select({ kind: "row", id: row.id });
      land(row.id);
      return row;
    },

    removeRow(id) {
      commit(removeRowOp(history.present, id), "row:remove");
      if (state.get().selection?.kind === "row" && (state.get().selection as any).id === id) select(null);
    },

    moveRow: (id, toIndex) => commit(moveRowOp(history.present, id, toIndex), "row:move"),

    duplicateRow(id) {
      const { doc, row } = duplicateRowOp(history.present, id);
      if (!row) return;
      commit(doc, "row:duplicate");
      select({ kind: "row", id: row.id });
      land(row.id);
    },

    setRowLayout: (id, layout) => commit(setRowLayoutOp(history.present, id, layout), "row:layout"),
    updateRowStyle: (id, changes, label) => commit(updateRowStyleOp(history.present, id, changes as any), "row:style", label ?? `row:${id}:${Object.keys(changes).join()}`),
    updateColumnStyle: (id, changes, label) => commit(updateColumnStyleOp(history.present, id, changes as any), "column:style", label ?? `col:${id}:${Object.keys(changes).join()}`),

    addBlock(type, columnId, index) {
      const block = blocks.create(type);
      if (!block) return null;
      commit(insertBlockOp(history.present, block, columnId, index), "block:add");
      select({ kind: "block", id: block.id });
      land(block.id);
      events.emit("block:add", { block, columnId });
      return block;
    },

    insertBlock(block, columnId, index) {
      commit(insertBlockOp(history.present, block, columnId, index), "block:add");
      select({ kind: "block", id: block.id });
      land(block.id);
      events.emit("block:add", { block, columnId });
    },

    removeBlock(id) {
      commit(removeBlockOp(history.present, id), "block:remove");
      events.emit("block:remove", { blockId: id });
      const selection = state.get().selection;
      if (selection?.kind === "block" && selection.id === id) select(null);
    },

    duplicateBlock(id) {
      const { doc, block } = duplicateBlockOp(history.present, id);
      if (!block) return;
      commit(doc, "block:duplicate");
      select({ kind: "block", id: block.id });
      land(block.id);
    },

    moveBlock: (id, toColumnId, index) => commit(moveBlockOp(history.present, id, toColumnId, index), "block:move"),

    /* The label defaults to block+keys, which is what makes a dragged slider one undo step
       instead of ninety. */
    updateContent: (id, changes, label) =>
      commit(updateBlockContentOp(history.present, id, changes), "block:content", label ?? `content:${id}:${Object.keys(changes).join()}`),
    updateStyle: (id, changes, label) =>
      commit(updateBlockStyleOp(history.present, id, changes), "block:style", label ?? `style:${id}:${Object.keys(changes).join()}`),

    updateSettings: (changes, label) =>
      commit(updateSettingsOp(history.present, changes), "settings", label ?? `settings:${Object.keys(changes).join()}`),
    updateMeta: (changes) => commit(updateMetaOp(history.present, changes), "meta"),

    replaceDocument(document, replaceOptions = {}) {
      const next = backfill(normalize(document), (type) => blocks.defaultsFor(type));
      history = replaceOptions.silent
        ? pushHistory(history, next, { silent: true })
        : pushHistory(history, next, { label: "replace" });
      publish("replace");
      if (replaceOptions.silent) autosave.reset(next);
      else autosave.touch(next);
    },

    undo() {
      history = undoHistory(history);
      publish("undo");
      autosave.touch(history.present);
    },

    redo() {
      history = redoHistory(history);
      publish("redo");
      autosave.touch(history.present);
    },

    save: () => autosave.flush(),
    isDirty: () => autosave.isDirty(),

    destroy() {
      if (landingTimer) clearTimeout(landingTimer);
      autosave.destroy();
      dnd.destroy();
      events.clear();
    },
  };

  return editor;
}

export type { DragState, DropEvent, SaveStatus };
