import { describe, expect, it } from "vitest";
import { applyMobileStyle, compile, insertBlock, mobileClass, setup, starterDocument } from "../src/index";

const { blocks, merge } = setup();

function compileWith(type: string, style: Record<string, unknown>) {
  let doc = starterDocument();
  const block = blocks.create(type)!;
  block.style = { ...block.style, ...style };
  doc = insertBlock(doc, block, doc.rows[0]!.columns[0]!.id);
  return { html: compile(doc, { blocks, merge }).html, block };
}

describe("mobile overrides", () => {
  it("adds nothing when a block has no overrides", () => {
    const { html, block } = compileWith("text", {});
    expect(html).not.toContain(mobileClass(block.id));
  });

  it("emits a media query and a class hook for font size, alignment and padding", () => {
    const { html, block } = compileWith("text", {
      mobileFontSize: 14,
      mobileAlign: "center",
      mobilePaddingEnabled: true,
      mobilePadding: { top: 4, right: 8, bottom: 4, left: 8 },
    });
    const cls = mobileClass(block.id);
    expect(html).toMatch(new RegExp(`<table[^>]*class="[^"]*${cls}`));
    /* The email already has a base mobile media query; the overrides get their own, so look for the
       style block that carries this block's class rather than the first media query. */
    const media = [...html.matchAll(/<style type="text\/css">(@media[^<]*)<\/style>/g)].map((m) => m[1]).find((css) => css!.includes(cls)) ?? "";
    expect(media).toMatch(/^@media only screen and \(max-width:600px\)\{/);
    expect(media).toContain(`.${cls}>tbody>tr>td,.${cls}>tr>td{padding:4px 8px 4px 8px!important}`);
    expect(media).toContain(`.${cls},.${cls} *{text-align:center!important;font-size:14px!important}`);
  });

  it("ignores padding while the toggle is off", () => {
    const { html } = compileWith("button", { mobilePaddingEnabled: false, mobilePadding: { top: 1, right: 1, bottom: 1, left: 1 } });
    expect(html).not.toContain("padding:1px 1px 1px 1px!important");
  });

  it("applies overrides to a style for the canvas's mobile preview", () => {
    const desktop = { fontSize: 18, align: "left", padding: { top: 12, right: 24, bottom: 12, left: 24 } };
    expect(applyMobileStyle(desktop)).toBe(desktop);
    expect(applyMobileStyle({ ...desktop, mobileFontSize: 14, mobileAlign: "center", mobilePaddingEnabled: true, mobilePadding: { top: 0, right: 0, bottom: 0, left: 0 } })).toMatchObject({
      fontSize: 14,
      align: "center",
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  });
});
