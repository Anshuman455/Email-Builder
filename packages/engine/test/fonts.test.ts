// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { FONT_STACKS, fontStack } from "@email-builder/core";
import { fontOptions, loadFonts } from "../src/fonts";

const INTER = { label: "Inter", family: "Inter", fallback: "Arial, sans-serif", url: "https://fonts.googleapis.com/css2?family=Inter" };

describe("fontOptions", () => {
  it("lists brand fonts first, then the web-safe stacks", () => {
    const options = fontOptions([INTER]);
    expect(options[0]).toEqual({ label: "Inter", value: fontStack(INTER) });
    expect(options.slice(1)).toEqual(FONT_STACKS);
  });

  it("is just the web-safe stacks without registered fonts", () => {
    expect(fontOptions(undefined)).toEqual(FONT_STACKS);
  });
});

describe("loadFonts", () => {
  it("adds each HTTPS stylesheet to the page once", () => {
    loadFonts([INTER, { label: "Bad", family: "Bad", fallback: "Arial", url: "http://insecure.test/x.css" }]);
    loadFonts([INTER]);
    const links = document.head.querySelectorAll("link[data-eb-font]");
    expect(links).toHaveLength(1);
    expect(links[0]!.getAttribute("href")).toBe(INTER.url);
  });
});
