import { describe, expect, it } from "vitest";
import { setup } from "@email-builder/core";
import { createEditor, type Editor } from "../src/editor";

/* Drops are resolved by the engine, not the DOM, so they are tested through `editor.drop` — the
   same path a pointer drop takes once hit testing has picked a target. */

function scene() {
  const { blocks } = setup({});
  const editor = createEditor({ blocks });
  const row = editor.addRow([1])!;
  const columnId = row.columns[0]!.id;
  const heading = editor.addBlock("heading", columnId)!;
  const html = editor.addBlock("html", columnId, 0)!;
  return { editor, row, columnId, heading, html };
}

const rowIndex = (editor: Editor, id: string) => editor.getDocument().rows.findIndex((r) => r.id === id);
const typesIn = (editor: Editor, columnId: string) =>
  editor
    .getDocument()
    .rows.flatMap((r) => r.columns)
    .find((c) => c.id === columnId)!
    .blocks.map((b) => b.type);

describe("editor.drop", () => {
  it("moves a block below a sibling in the same column", () => {
    const { editor, columnId, heading, html } = scene();
    expect(typesIn(editor, columnId)).toEqual(["html", "heading"]);

    editor.drop({
      source: { kind: "block", blockId: html.id, columnId },
      target: { kind: "block", blockId: heading.id, columnId },
      edge: "after",
    });

    expect(typesIn(editor, columnId)).toEqual(["heading", "html"]);
  });

  it("moves a block dropped on a row gap into a new row, as one undo step", () => {
    const { editor, row, columnId, html } = scene();
    const before = editor.getDocument().rows.length;
    const index = rowIndex(editor, row.id) + 1;

    editor.drop({ source: { kind: "block", blockId: html.id, columnId }, target: { kind: "row-slot", index }, edge: "before" });

    const rows = editor.getDocument().rows;
    expect(rows).toHaveLength(before + 1);
    expect(rows[index]!.columns[0]!.blocks.map((b) => b.type)).toEqual(["html"]);
    expect(typesIn(editor, columnId)).toEqual(["heading"]);

    editor.undo();
    expect(editor.getDocument().rows).toHaveLength(before);
    expect(typesIn(editor, columnId)).toEqual(["html", "heading"]);
  });

  it("respects the edge when a block is dropped on a row", () => {
    const { editor, row, columnId, html } = scene();
    const index = rowIndex(editor, row.id);

    editor.drop({ source: { kind: "block", blockId: html.id, columnId }, target: { kind: "row", rowId: row.id, index }, edge: "after" });

    const rows = editor.getDocument().rows;
    expect(rows[index]!.id).toBe(row.id);
    expect(rows[index + 1]!.columns[0]!.blocks.map((b) => b.type)).toEqual(["html"]);
  });

  it("adds a palette block dropped on a row gap", () => {
    const { editor } = scene();
    const before = editor.getDocument().rows.length;

    editor.drop({ source: { kind: "palette", blockType: "text" }, target: { kind: "row-slot", index: 0 }, edge: "before" });

    const rows = editor.getDocument().rows;
    expect(rows).toHaveLength(before + 1);
    expect(rows[0]!.columns[0]!.blocks.map((b) => b.type)).toEqual(["text"]);
  });
});
