// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { setup } from "@email-builder/core";
import { createEditor } from "../src/editor";

function scene() {
  const { blocks } = setup({});
  const editor = createEditor({ blocks });
  editor.replaceDocument({ rows: [] }, { silent: true });
  const row = editor.addRow([1])!;
  const columnId = row.columns[0]!.id;
  const a = editor.addBlock("heading", columnId)!;
  const b = editor.addBlock("text", columnId)!;
  const c = editor.addBlock("button", columnId)!;
  return { editor, row, columnId, a, b, c };
}

const types = (editor: ReturnType<typeof createEditor>) =>
  editor.getDocument().rows.map((row) => row.columns.flatMap((column) => column.blocks.map((block) => block.type))).filter((row) => row.length);

describe("multi-selection", () => {
  it("toggles items with ⌘/Ctrl-click and keeps document order", () => {
    const { editor, a, b, c } = scene();
    editor.select({ kind: "block", id: c.id });
    editor.toggleSelection({ kind: "block", id: a.id });
    expect(editor.getSelectedIds()).toEqual([a.id, c.id]);
    editor.toggleSelection({ kind: "block", id: c.id });
    expect(editor.getSelectedIds()).toEqual([a.id]);
    expect(b.id).toBeTruthy();
  });

  it("selects a range with Shift-click, and a different kind starts over", () => {
    const { editor, row, a, b, c } = scene();
    editor.select({ kind: "block", id: a.id });
    editor.selectRange({ kind: "block", id: c.id });
    expect(editor.getSelectedIds()).toEqual([a.id, b.id, c.id]);
    editor.toggleSelection({ kind: "row", id: row.id });
    expect(editor.getSelectedIds()).toEqual([row.id]);
  });

  it("deletes and duplicates the whole selection as single undo steps", () => {
    const { editor, a, c } = scene();
    editor.select({ kind: "block", id: a.id });
    editor.toggleSelection({ kind: "block", id: c.id });
    editor.duplicateSelected();
    expect(types(editor)).toEqual([["heading", "heading", "text", "button", "button"]]);
    expect(editor.getSelectedIds()).toHaveLength(2);

    editor.removeSelected();
    expect(types(editor)).toEqual([["heading", "text", "button"]]);
    editor.undo();
    expect(types(editor)).toEqual([["heading", "heading", "text", "button", "button"]]);
  });

  it("drags several selected blocks together", () => {
    const { editor, columnId, a, b, c } = scene();
    editor.select({ kind: "block", id: a.id });
    editor.toggleSelection({ kind: "block", id: b.id });
    editor.drop({ source: { kind: "block", blockId: a.id, columnId }, target: { kind: "block", blockId: c.id, columnId }, edge: "after" });
    expect(types(editor)).toEqual([["button", "heading", "text"]]);
  });
});

describe("copy and paste", () => {
  it("pastes copied blocks after the selection with fresh ids", () => {
    const { editor, a, b } = scene();
    editor.select({ kind: "block", id: a.id });
    editor.toggleSelection({ kind: "block", id: b.id });
    const clip = editor.copySelection()!;

    editor.select({ kind: "block", id: a.id });
    expect(editor.paste(clip)).toBe(true);
    expect(types(editor)).toEqual([["heading", "heading", "text", "text", "button"]]);
    const ids = editor.getDocument().rows.flatMap((row) => row.columns.flatMap((column) => column.blocks.map((block) => block.id)));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("pastes into a different email, dropping block types it doesn't have", () => {
    const { editor, a, b } = scene();
    editor.select({ kind: "block", id: a.id });
    editor.toggleSelection({ kind: "block", id: b.id });
    const clip = JSON.parse(editor.copySelection()!);
    clip.items.push({ id: "x", type: "not-registered", content: {}, style: {} });

    const other = createEditor({ blocks: setup({}).blocks });
    other.replaceDocument({ rows: [] }, { silent: true });
    expect(other.paste(JSON.stringify(clip))).toBe(true);
    expect(types(other)).toEqual([["heading", "text"]]);
  });

  it("copies and pastes whole rows after the selected row", () => {
    const { editor, row } = scene();
    editor.addRow([1, 1]);
    editor.select({ kind: "row", id: row.id });
    expect(editor.paste(editor.copySelection()!)).toBe(true);
    const rows = editor.getDocument().rows.filter((r) => r.columns.some((c) => c.blocks.length) || r.columns.length === 2);
    expect(rows.map((r) => r.columns.length)).toEqual([1, 1, 2]);
  });

  it("imports pasted HTML from elsewhere and ignores plain text", () => {
    const { editor } = scene();
    expect(editor.paste("just some words")).toBe(false);
    expect(editor.paste("", "<h2>From a web page</h2><p>Body</p>")).toBe(true);
  });
});
