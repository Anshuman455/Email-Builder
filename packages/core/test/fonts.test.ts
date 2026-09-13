import { describe, expect, it } from "vitest";
import { compile, fontStack, insertBlock, normalizeFonts, setup, starterDocument } from "../src/index";

const INTER = { label: "Inter", family: "Inter", fallback: "Arial, Helvetica, sans-serif", url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" };
const LORA = { label: "Lora", family: "Lora", fallback: "Georgia, serif", url: "https://fonts.googleapis.com/css2?family=Lora" };

describe("fonts", () => {
  it("stores a family with its web-safe fallback", () => {
    expect(fontStack(INTER)).toBe("'Inter', Arial, Helvetica, sans-serif");
  });

  it("drops fonts without a family and stylesheets that aren't HTTPS", () => {
    const fonts = normalizeFonts([INTER, { label: "x", family: " ", fallback: "Arial" }, { label: "Bad", family: "Bad", fallback: "Arial", url: "http://insecure.test/font.css" }]);
    expect(fonts.map((f) => f.family)).toEqual(["Inter", "Bad"]);
    expect(fonts[1]!.url).toBeUndefined();
  });

  it("returns registered fonts from setup", () => {
    expect(setup({ fonts: [INTER] }).fonts).toHaveLength(1);
  });

  it("links only the fonts an email uses, hidden from Outlook", () => {
    const { blocks, merge, fonts } = setup({ fonts: [INTER, LORA] });
    let doc = starterDocument();
    doc = { ...doc, settings: { ...doc.settings, fontFamily: fontStack(INTER) } };
    const heading = blocks.create("heading")!;
    heading.style = { ...heading.style, fontFamily: fontStack(INTER) };
    doc = insertBlock(doc, heading, doc.rows[0]!.columns[0]!.id);

    const html = compile(doc, { blocks, merge, fonts }).html;
    expect(html).toContain("<!--[if !mso]><!--><link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;display=swap\"");
    expect(html).toContain("@import url(");
    expect(html).not.toContain("family=Lora");
    expect(html.match(/rel="stylesheet"/g)).toHaveLength(1);
  });

  it("adds nothing when no registered font is used", () => {
    const { blocks, merge, fonts } = setup({ fonts: [INTER] });
    expect(compile(starterDocument(), { blocks, merge, fonts }).html).not.toContain("rel=\"stylesheet\"");
  });
});
