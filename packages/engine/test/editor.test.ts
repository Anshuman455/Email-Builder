import { describe, expect, it, vi } from "vitest";
import { setup, starterDocument } from "@email-builder/core";
import { createEditor } from "../src/editor";
import { createAutosave } from "../src/autosave";
import { createStore, createEmitter, select } from "../src/store";

const make = (overrides: any = {}) => {
  const { blocks, merge } = setup();
  return createEditor({ document: starterDocument(), blocks, merge, ...overrides });
};

describe("store", () => {
  it("only notifies a selector when its slice changes", () => {
    const store = createStore({ a: 1, b: 1 });
    const seen: number[] = [];
    select(store, (s) => s.a, (a) => seen.push(a));

    store.set((s) => ({ ...s, b: 2 }));
    store.set((s) => ({ ...s, a: 2 }));
    store.set((s) => ({ ...s, b: 3 }));

    expect(seen).toEqual([2]);
  });

  it("survives a listener that unsubscribes mid-emit", () => {
    const store = createStore(0);
    const off = store.subscribe(() => off());
    store.subscribe(() => {});
    expect(() => store.set(1)).not.toThrow();
  });

  it("does not let a throwing listener break the emitter", () => {
    const events = createEmitter<{ ping: number }>();
    const good = vi.fn();
    events.on("ping", () => {
      throw new Error("boom");
    });
    events.on("ping", good);
    expect(() => events.emit("ping", 1)).not.toThrow();
    expect(good).toHaveBeenCalledWith(1);
  });
});

describe("editor commands", () => {
  it("adds a block, selects it and flags undo", () => {
    const editor = make();
    const columnId = editor.getDocument().rows[0]!.columns[0]!.id;
    const block = editor.addBlock("heading", columnId);

    expect(block).not.toBeNull();
    expect(editor.getSelection()).toEqual({ kind: "block", id: block!.id });
    expect(editor.state.get().canUndo).toBe(true);
    expect(editor.getSelectedBlock()!.type).toBe("heading");
  });

  it("undoes and redoes back to the same document", () => {
    const editor = make();
    const before = editor.getDocument();
    editor.addBlock("text", before.rows[0]!.columns[0]!.id);
    const after = editor.getDocument();

    editor.undo();
    expect(editor.getDocument()).toBe(before);
    editor.redo();
    expect(editor.getDocument()).toBe(after);
  });

  it("coalesces a dragged slider into one undo step", () => {
    const editor = make();
    const block = editor.addBlock("heading", editor.getDocument().rows[0]!.columns[0]!.id)!;
    const baseline = editor.getDocument();

    for (let size = 20; size <= 40; size += 1) editor.updateStyle(block.id, { fontSize: size });

    editor.undo();
    expect(editor.getDocument()).toBe(baseline);
  });

  it("clears selection when the selected block is removed", () => {
    const editor = make();
    const block = editor.addBlock("text", editor.getDocument().rows[0]!.columns[0]!.id)!;
    editor.removeBlock(block.id);
    expect(editor.getSelection()).toBeNull();
  });

  it("exposes the selected block's declarative schema", () => {
    const editor = make();
    editor.addBlock("button", editor.getDocument().rows[0]!.columns[0]!.id);
    const groups = editor.getSchema();
    expect(groups.map((g) => g.title)).toContain("Button");
    expect(groups.find((g) => g.title === "Button")!.fields.map((f) => f.key)).toContain("href");
  });

  it("hides schema fields whose `when` guard fails", () => {
    const editor = make();
    const block = editor.addBlock("button", editor.getDocument().rows[0]!.columns[0]!.id)!;

    const alignVisible = () =>
      editor.getSchema().some((g) => g.fields.some((f) => f.key === "align"));

    expect(alignVisible()).toBe(true);
    editor.updateStyle(block.id, { fullWidth: true });
    expect(alignVisible()).toBe(false);
  });

  it("normalizes whatever a host hands it", () => {
    const { blocks, merge } = setup();
    const editor = createEditor({ document: { rows: "nonsense" }, blocks, merge });
    expect(editor.getDocument().schemaVersion).toBe(1);
    expect(editor.getDocument().rows).toHaveLength(1);
  });

  it("backfills a block saved before its definition grew a key", () => {
    const { blocks, merge } = setup();
    const editor = createEditor({
      blocks,
      merge,
      document: {
        rows: [{ layout: [1], columns: [{ blocks: [{ id: "blk_old", type: "button", content: { label: "Go" }, style: {} }] }] }],
      },
    });
    const block = editor.getDocument().rows[0]!.columns[0]!.blocks[0]!;
    expect(block.content.label).toBe("Go");
    expect(block.style.buttonColor).toBe("#2563eb");
  });
});

describe("drag → document", () => {
  it("moves a block between columns", () => {
    const editor = make();
    const row = editor.addRow([1, 1])!;
    const block = editor.addBlock("text", row.columns[0]!.id)!;

    editor.moveBlock(block.id, row.columns[1]!.id, 0);

    const after = editor.getDocument().rows.find((r) => r.id === row.id)!;
    expect(after.columns[0]!.blocks).toHaveLength(0);
    expect(after.columns[1]!.blocks[0]!.id).toBe(block.id);
  });

  it("registers and unregisters droppables without leaking", () => {
    const editor = make();
    const el = { } as HTMLElement;
    const off = editor.dnd.droppable(el, { kind: "row-slot", index: 0 });
    expect(typeof off).toBe("function");
    expect(() => off()).not.toThrow();
  });

  it("exposes an idle drag state until something is lifted", () => {
    const editor = make();
    expect(editor.dnd.state.get().active).toBeNull();
    editor.dnd.lift({ kind: "palette", blockType: "text" });
    expect(editor.dnd.state.get()).toMatchObject({ keyboard: true, active: { kind: "palette", blockType: "text" } });
    editor.dnd.cancel();
    expect(editor.dnd.state.get().active).toBeNull();
  });

  it("reorders rows by index, correcting for the removal shift", () => {
    const editor = make();
    const a = editor.getDocument().rows[0]!.id;
    const b = editor.addRow([1])!.id;
    const c = editor.addRow([1])!.id;
    expect(editor.getDocument().rows.map((r) => r.id)).toEqual([a, b, c]);

    editor.moveRow(a, 3);
    expect(editor.getDocument().rows.map((r) => r.id)).toEqual([b, c, a]);
  });
});

describe("autosave", () => {
  it("debounces, then writes once", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const autosave = createAutosave<string>({ debounceMs: 100, maxWaitMs: 1000, save });

    autosave.touch("a");
    autosave.touch("b");
    autosave.touch("c");
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(120);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("c");
    vi.useRealTimers();
  });

  it("honours the ceiling when editing never pauses", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const autosave = createAutosave<number>({ debounceMs: 500, maxWaitMs: 1000, save });

    /* An edit every 200ms: a pure debounce would never fire. */
    for (let i = 0; i < 10; i += 1) {
      autosave.touch(i);
      await vi.advanceTimersByTimeAsync(200);
    }

    expect(save).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("keeps the value when a save fails so the next attempt still has it", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const statuses: string[] = [];
    const autosave = createAutosave<string>({ debounceMs: 10, save, onStatus: (s) => statuses.push(s) });

    autosave.touch("work");
    await vi.advanceTimersByTimeAsync(30);
    expect(statuses).toContain("error");

    await vi.advanceTimersByTimeAsync(60);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith("work");
    vi.useRealTimers();
  });

  it("reports dirty through the editor's own state", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const editor = make({ save, autosave: { debounceMs: 5, maxWaitMs: 20 } });

    editor.addBlock("text", editor.getDocument().rows[0]!.columns[0]!.id);
    expect(editor.state.get().saveStatus).toBe("dirty");

    await editor.save();
    expect(save).toHaveBeenCalledTimes(1);
    expect(editor.state.get().saveStatus).toBe("saved");
  });
});

describe("compile through the editor", () => {
  it("produces HTML and text for the live document", () => {
    const editor = make();
    editor.addBlock("heading", editor.getDocument().rows[0]!.columns[0]!.id);
    const { html, text } = editor.compile();
    expect(html).toContain("<!DOCTYPE html");
    expect(text.length).toBeGreaterThan(0);
  });

  it("reports preflight issues for the live document", () => {
    const editor = make();
    editor.addBlock("button", editor.getDocument().rows[0]!.columns[0]!.id);
    expect(editor.preflight().some((i) => i.id.startsWith("button-href"))).toBe(true);
  });
});
