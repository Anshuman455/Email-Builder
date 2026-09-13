import { describe, expect, it } from "vitest";
import { compile, insertBlock, setup, starterDocument } from "../src/index";

const { blocks, merge } = setup();

function imageTag(style: Record<string, unknown>): string {
  let doc = starterDocument();
  const block = blocks.create("image")!;
  block.content = { ...block.content, src: "https://cdn.test/photo.png", alt: "Photo" };
  block.style = { ...block.style, ...style };
  doc = insertBlock(doc, block, doc.rows[0]!.columns[0]!.id);
  const html = compile(doc, { blocks, merge }).html;
  return /<img [^>]*src="https:\/\/cdn\.test\/photo\.png"[^>]*>/.exec(html)![0];
}

const widthOf = (tag: string) => Number(/ width="(\d+)"/.exec(tag)![1]);

describe("image block size", () => {
  it("defaults to the full column width with automatic height", () => {
    const tag = imageTag({});
    expect(tag).toMatch(/height:\s*auto/);
    expect(tag).not.toMatch(/ height="/);
  });

  it("sizes by percentage of the column", () => {
    const full = widthOf(imageTag({ widthUnit: "%", widthPercent: 100 }));
    expect(widthOf(imageTag({ widthUnit: "%", widthPercent: 50 }))).toBe(Math.round(full / 2));
  });

  it("sizes by fixed pixels, never wider than the column", () => {
    const full = widthOf(imageTag({}));
    expect(widthOf(imageTag({ widthUnit: "px", widthPx: 200 }))).toBe(200);
    expect(widthOf(imageTag({ widthUnit: "px", widthPx: 5000 }))).toBe(full);
  });

  it("applies a fixed height in both the attribute and the style", () => {
    const tag = imageTag({ height: 150 });
    expect(tag).toContain(' height="150"');
    expect(tag).toMatch(/height:\s*150px/);
    expect(tag).toMatch(/object-fit:\s*cover/);
  });

  it("keeps the focal point in view when a fixed height crops the image", () => {
    expect(imageTag({ height: 150, focalX: 20, focalY: 80 })).toMatch(/object-position:\s*20% 80%/);
    expect(imageTag({ focalX: 20, focalY: 80 })).not.toMatch(/object-position/);
  });
});
