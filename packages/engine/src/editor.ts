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

export interface EditorState {
  document: EmailDocument;
  selection: Selection;
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
  getSchema(): FieldGroup[];
  /** Apply a drop exactly as a pointer drop would — for custom drag UIs, keyboard flows and tests. */
  drop(event: DropEvent): void;
  compile(options?: CompileOptions): CompileResult;
  preflight(): PreflightIssue[];

  /* Selection */
  select(selection: Selection): void;
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

  function select(selection: Selection) {
    state.set((current) => ({
      ...current,
      selection,
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

    compile: (compileOptions) => compile(history.present, { blocks, merge }, compileOptions),
    preflight: () => preflightDoc(history.present, { blocks, merge }),

    select,

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
      state.set((current) => ({ ...current, selection: { kind: "block", id: blockId }, editingBlockId: blockId }));
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
