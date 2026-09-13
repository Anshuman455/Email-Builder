// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { setup } from "@email-builder/core";
import { createEditor } from "../src/editor";

function make() {
  const { blocks } = setup({});
  const editor = createEditor({ blocks });
  editor.replaceDocument({ rows: [] }, { silent: true });
  return editor;
}

/* A document never has zero rows — normalising an empty one yields a blank starter row — so empty
   rows are left out of the comparison. */
const rowsOf = (editor: ReturnType<typeof make>) =>
  editor
    .getDocument()
    .rows.map((row) => row.columns.map((column) => column.blocks.map((block) => block.type)))
    .filter((row) => row.some((column) => column.length));

const blockCount = (editor: ReturnType<typeof make>) =>
  editor.getDocument().rows.reduce((sum, row) => sum + row.columns.reduce((n, column) => n + column.blocks.length, 0), 0);

const PAGE = `<!doctype html><html><head><title>App</title><link rel="stylesheet" href="app.css"><style>body{}</style></head>
<body>
  <nav><a href="/overview"><span class="material-symbols-outlined">dashboard</span> Overview</a></nav>
  <main>
    <h1 style="text-align:center">Growtality</h1>
    <p>Hi <b>there</b>, <span onclick="steal()">friend</span> — <a href="javascript:alert(1)">bad</a> <a href="https://ok.test">good</a></p>
    <button><span class="material-symbols-outlined">notifications</span></button>
    <a href="https://ok.test/img"><img src="https://ok.test/a.png" alt="Chef"></a>
    <a class="btn" href="https://ok.test/start" style="background-color:#1d4ed8;color:#ffffff">Get started</a>
    <ol><li>One</li><li>Two</li></ol>
    <hr>
    <script>steal()</script>
    <form><input value="x"></form>
  </main>
</body></html>`;

describe("editor.importHtml — convert to blocks", () => {
  it("turns page content into editable blocks and drops the page chrome", () => {
    const editor = make();
    const added = editor.importHtml(PAGE);

    expect(added.map((block) => block.type)).toEqual(["heading", "text", "image", "button", "list", "divider"]);
    const [heading, text, image, button, list] = added;
    expect(heading!.content).toMatchObject({ text: "Growtality" });
    expect(heading!.style.align).toBe("center");
    expect(text!.content.html).toBe('<p>Hi <b>there</b>, friend — bad <a href="https://ok.test">good</a></p>');
    expect(image!.content).toMatchObject({ src: "https://ok.test/a.png", alt: "Chef", href: "https://ok.test/img" });
    expect(button!.content).toMatchObject({ label: "Get started", href: "https://ok.test/start" });
    expect(button!.style).toMatchObject({ buttonColor: "#1d4ed8", textColor: "#ffffff" });
    expect(list!.content).toMatchObject({ style: "number", items: [{ text: "One" }, { text: "Two" }] });

    const everything = JSON.stringify(editor.getDocument());
    for (const noise of ["dashboard", "Overview", "notifications", "steal", "javascript:", "app.css"]) {
      expect(everything).not.toContain(noise);
    }
  });

  it("turns side-by-side table cells into a multi-column row", () => {
    const editor = make();
    editor.importHtml(`<table><tr>
      <td width="50%"><h3>Guides</h3><p>Read the docs.</p></td>
      <td width="50%"><h3>Support</h3><p>Ask us anything.</p></td>
    </tr></table>`);

    expect(rowsOf(editor)).toEqual([[["heading", "text"], ["heading", "text"]]]);
  });

  it("replaces the design in one undo step", () => {
    const editor = make();
    editor.importHtml("<p>Existing</p>");
    editor.importHtml("<h2>New</h2><p>Body</p>", { mode: "replace" });
    expect(rowsOf(editor)).toEqual([[["heading", "text"]]]);

    editor.undo();
    expect(rowsOf(editor)).toEqual([[["text"]]]);
  });

  it("keeps everything as one sanitised HTML block when asked", () => {
    const editor = make();
    const added = editor.importHtml('<body><p onclick="x()">Hello</p><script>bad()</script></body>', { as: "html" });

    expect(added).toHaveLength(1);
    expect(added[0]!.type).toBe("html");
    expect(added[0]!.content.html).toBe("<p>Hello</p>");
  });

  it("returns nothing for input without usable content", () => {
    const editor = make();
    expect(editor.importHtml("   ")).toEqual([]);
    expect(editor.importHtml("<script>only()</script><nav>menu</nav>")).toEqual([]);
    expect(blockCount(editor)).toBe(0);
  });
});
