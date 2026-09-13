// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { isRichTextField, readRichTextState, safeLinkHref, selectionIn, setTextColor } from "../src/richtext";

function editable(html: string) {
  const host = document.createElement("div");
  host.setAttribute("contenteditable", "true");
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

function select(node: Node, start: number, end: number) {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const selection = document.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return range;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("safeLinkHref", () => {
  it("accepts web, mailto, tel and merge-tag destinations", () => {
    expect(safeLinkHref("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeLinkHref("mailto:hi@example.com")).toBe("mailto:hi@example.com");
    expect(safeLinkHref("tel:+15551234")).toBe("tel:+15551234");
    expect(safeLinkHref("{{company.website}}")).toBe("{{company.website}}");
    expect(safeLinkHref("  example.com/pricing ")).toBe("https://example.com/pricing");
  });

  it("refuses scripts, relative paths and empty input", () => {
    for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "/relative", "", "   ", "not a link"]) {
      expect(safeLinkHref(bad)).toBeNull();
    }
  });
});

describe("isRichTextField", () => {
  const text = { schema: [{ target: "content", fields: [{ kind: "richtext", key: "html" }] }] };
  const heading = { schema: [{ target: "content", fields: [{ kind: "text", key: "text" }] }] };

  it("is true only for a richtext content field", () => {
    expect(isRichTextField(text, "html")).toBe(true);
    expect(isRichTextField(heading, "text")).toBe(false);
    expect(isRichTextField(text, undefined)).toBe(false);
    expect(isRichTextField(undefined, "html")).toBe(false);
  });
});

describe("selection helpers", () => {
  it("only reports a selection that lies inside the host", () => {
    const host = editable("<p>Hello</p>");
    const outside = document.createElement("p");
    outside.textContent = "Elsewhere";
    document.body.append(outside);

    select(outside.firstChild!, 0, 4);
    expect(selectionIn(host)).toBeNull();
    expect(readRichTextState(host).link).toBeNull();

    select(host.querySelector("p")!.firstChild!, 0, 5);
    expect(selectionIn(host)).not.toBeNull();
  });

  it("reports the link under the cursor", () => {
    const host = editable('<p>Read <a href="https://example.com">the guide</a></p>');
    select(host.querySelector("a")!.firstChild!, 2, 2);
    expect(readRichTextState(host).link).toBe("https://example.com");
  });

  it("colours only the selected text, and recolours it in place", () => {
    const host = editable("<p>Hello world</p>");
    const range = select(host.querySelector("p")!.firstChild!, 6, 11);

    const covered = setTextColor(host, "#ff0000", range);
    expect(host.innerHTML).toBe('<p>Hello <span style="color: rgb(255, 0, 0);">world</span></p>'.replace("rgb(255, 0, 0)", host.querySelector("span")!.style.color));
    expect(host.querySelectorAll("span")).toHaveLength(1);

    setTextColor(host, "#00ff00", covered);
    expect(host.querySelectorAll("span")).toHaveLength(1);
    expect(host.querySelector("span")!.textContent).toBe("world");
  });

  it("ignores invalid colours and empty selections", () => {
    const host = editable("<p>Hello</p>");
    const text = host.querySelector("p")!.firstChild!;
    setTextColor(host, "red; background:url(x)", select(text, 0, 5));
    setTextColor(host, "#ff0000", select(text, 2, 2));
    expect(host.innerHTML).toBe("<p>Hello</p>");
  });
});
