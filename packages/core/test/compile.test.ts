import { describe, expect, it } from "vitest";
import {
  setup,
  starterDocument,
  addRow,
  insertBlock,
  moveBlock,
  setRowLayout,
  normalize,
  compile,
  preflight,
  createHistory,
  pushHistory,
  undo,
  redo,
  defineBlock,
  createMergeRegistry,
  SYNTAX,
  columnWidths,
} from "../src/index";

const { blocks, merge } = setup();
const deps = { blocks, merge };

function docWith(...types: string[]) {
  let doc = starterDocument();
  const columnId = doc.rows[0]!.columns[0]!.id;
  for (const type of types) doc = insertBlock(doc, blocks.create(type)!, columnId);
  return doc;
}

describe("compile", () => {
  it("produces a full HTML document", () => {
    const { html, text } = compile(docWith("heading", "text", "button"), deps);
    expect(html).toContain("<!DOCTYPE html");
    expect(html).toContain("</html>");
    expect(html).toContain("<h2");
    expect(html).toMatch(/<table[^>]+role="presentation"/);
    expect(text).toContain("A headline that earns the open");
  });

  it("never emits a script tag, even from an HTML block", () => {
    let doc = starterDocument();
    const columnId = doc.rows[0]!.columns[0]!.id;
    const block = blocks.create("html")!;
    block.content = { html: '<div onclick="steal()">hi</div><script>alert(1)</script>' };
    doc = insertBlock(doc, block, columnId);
    const { html } = compile(doc, deps);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).toContain("hi");
  });

  it("gives Outlook a VML twin for every button", () => {
    const { html } = compile(docWith("button"), deps);
    expect(html).toContain("v:roundrect");
    expect(html).toContain("<!--[if mso]>");
  });

  it("leaves merge tokens alone by default and resolves them on request", () => {
    let doc = starterDocument();
    const columnId = doc.rows[0]!.columns[0]!.id;
    const block = blocks.create("heading")!;
    block.content = { text: "Hi {{contact.first_name}}", level: "h1" };
    doc = insertBlock(doc, block, columnId);

    expect(compile(doc, deps).html).toContain("{{contact.first_name}}");
    expect(compile(doc, deps).usedTokens).toContain("contact.first_name");
    expect(compile(doc, deps, { sample: true }).html).toContain("Jordan");
    expect(compile(doc, deps, { data: { contact: { first_name: "Ada" } } }).html).toContain("Ada");
  });

  it("falls back per the catalog when a recipient has no value", () => {
    const registry = createMergeRegistry({ fields: [{ token: "name", label: "Name", fallback: "there" }] });
    expect(registry.render("Hi {{name}}", {})).toBe("Hi there");
    expect(registry.render("Hi {{name}}", { name: "Ada" })).toBe("Hi Ada");
    expect(registry.render("Hi {{name|friend}}", {})).toBe("Hi friend");
  });

  it("supports other ESP token syntaxes", () => {
    const mc = createMergeRegistry({ syntax: SYNTAX.mailchimp, fields: [{ token: "FNAME", label: "First" }] });
    expect(mc.format("FNAME")).toBe("*|FNAME|*");
    expect(mc.extract("Hi *|FNAME|*")).toEqual(["FNAME"]);
    expect(mc.render("Hi *|FNAME|*", { FNAME: "Ada" })).toBe("Hi Ada");
  });
});

describe("document operations", () => {
  it("keeps untouched rows referentially identical", () => {
    const doc = addRow(addRow(starterDocument(), [1]).doc, [1, 1]).doc;
    const next = setRowLayout(doc, doc.rows[2]!.id, [1]);
    expect(next.rows[0]).toBe(doc.rows[0]);
    expect(next.rows[1]).toBe(doc.rows[1]);
    expect(next.rows[2]).not.toBe(doc.rows[2]);
  });

  it("rehomes orphaned blocks when a row loses a column", () => {
    let doc = addRow(starterDocument(), [1, 1]).doc;
    const row = doc.rows[1]!;
    doc = insertBlock(doc, blocks.create("text")!, row.columns[0]!.id);
    doc = insertBlock(doc, blocks.create("button")!, row.columns[1]!.id);

    const next = setRowLayout(doc, row.id, [1]);
    expect(next.rows[1]!.columns).toHaveLength(1);
    expect(next.rows[1]!.columns[0]!.blocks.map((b) => b.type)).toEqual(["text", "button"]);
  });

  it("moves a block between columns without losing it", () => {
    let doc = addRow(starterDocument(), [1, 1]).doc;
    const row = doc.rows[1]!;
    const block = blocks.create("text")!;
    doc = insertBlock(doc, block, row.columns[0]!.id);

    const next = moveBlock(doc, block.id, row.columns[1]!.id, 0);
    expect(next.rows[1]!.columns[0]!.blocks).toHaveLength(0);
    expect(next.rows[1]!.columns[1]!.blocks[0]!.id).toBe(block.id);
  });

  it("splits column widths exactly, remainder and all", () => {
    const doc = addRow(starterDocument(), [2, 1]).doc;
    const widths = columnWidths(doc.rows[1]!, 600);
    expect(widths.reduce((a, b) => a + b, 0)).toBe(600 - 48);
  });
});

describe("history", () => {
  it("coalesces same-label edits and separates distinct ones", () => {
    let h = createHistory("a");
    h = pushHistory(h, "b", { label: "color", now: 1000 });
    h = pushHistory(h, "c", { label: "color", now: 1100 });
    expect(h.past).toHaveLength(1);

    h = pushHistory(h, "d", { label: "text", now: 5000 });
    expect(h.past).toHaveLength(2);
    expect(undo(h).present).toBe("c");
    expect(redo(undo(h)).present).toBe("d");
  });
});

describe("normalize", () => {
  it("repairs a half-written document without throwing", () => {
    const doc = normalize({ rows: [{ layout: [1, 1], columns: [{ blocks: [{ type: "text" }] }] }] });
    expect(doc.schemaVersion).toBe(1);
    expect(doc.rows[0]!.columns).toHaveLength(2);
    expect(doc.rows[0]!.columns[0]!.blocks[0]!.id).toMatch(/^blk_/);
    expect(doc.settings.contentWidth).toBe(600);
  });

  it("turns garbage into an empty-but-valid document", () => {
    expect(normalize(null).rows).toHaveLength(1);
    expect(normalize("nonsense" as any).settings.contentWidth).toBe(600);
  });
});

describe("preflight", () => {
  it("flags a missing button destination", () => {
    const issues = preflight(docWith("button"), deps);
    expect(issues.some((i) => i.id.startsWith("button-href"))).toBe(true);
  });

  it("only requires a footer block when asked to", () => {
    expect(preflight(docWith("button"), deps).some((i) => i.id === "no-footer")).toBe(false);
    const required = preflight(docWith("button"), deps, { requireFooter: true }).find((i) => i.id === "no-footer");
    expect(required?.severity).toBe("error");
  });

  it("flags an unknown merge token", () => {
    let doc = starterDocument();
    const block = blocks.create("text")!;
    block.content = { html: "<p>{{not.a.field}}</p>" };
    doc = insertBlock(doc, block, doc.rows[0]!.columns[0]!.id);
    expect(preflight(doc, deps).some((i) => i.id === "unknown-token-not.a.field")).toBe(true);
  });
});

describe("custom blocks", () => {
  const nps = defineBlock({
    type: "nps",
    label: "NPS",
    group: "Content",
    defaultContent: () => ({ question: "How likely are you to recommend us?" }),
    defaultStyle: () => ({ accent: "#111827" }),
    schema: [{ title: "Question", target: "content", fields: [{ kind: "text", key: "question", label: "Question" }] }],
    render: ({ content, style, esc }) => `<div data-nps style="color:${style.accent}">${esc(content.question)}</div>`,
  });

  it("renders a host-registered block with no changes to the library", () => {
    const custom = setup({ blocks: [nps] });
    let doc = starterDocument();
    doc = insertBlock(doc, custom.blocks.create("nps")!, doc.rows[0]!.columns[0]!.id);
    const { html } = compile(doc, { blocks: custom.blocks, merge: custom.merge });
    expect(html).toContain("data-nps");
    expect(html).toContain("How likely are you");
  });

  it("shows the block in the palette under its group", () => {
    const custom = setup({ blocks: [nps] });
    const group = custom.blocks.groups().find((g) => g.group === "Content");
    expect(group!.blocks.map((b) => b.type)).toContain("nps");
  });

  it("survives a block whose render throws", () => {
    const broken = defineBlock({
      type: "broken",
      label: "Broken",
      defaultContent: () => ({}),
      defaultStyle: () => ({}),
      schema: [],
      render: () => {
        throw new Error("boom");
      },
    });
    const custom = setup({ blocks: [broken] });
    let doc = starterDocument();
    doc = insertBlock(doc, custom.blocks.create("broken")!, doc.rows[0]!.columns[0]!.id);
    expect(() => compile(doc, { blocks: custom.blocks })).not.toThrow();
  });

  it("honours excludeBlocks for locked-down tenants", () => {
    const locked = setup({ excludeBlocks: ["html"] });
    expect(locked.blocks.has("html")).toBe(false);
    expect(locked.blocks.create("html")).toBeNull();
  });
});
