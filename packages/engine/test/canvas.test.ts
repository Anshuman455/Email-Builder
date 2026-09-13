import { describe, expect, it } from "vitest";
import { columnCanvasStyle, rowCanvasStyle } from "../src/canvas";

describe("columnCanvasStyle", () => {
  it("mirrors the column settings the compiler applies to the email", () => {
    expect(
      columnCanvasStyle({
        backgroundColor: "#f50000",
        padding: { top: 128, right: 12, bottom: 8, left: 4 },
        borderRadius: 6,
        border: { width: 2, style: "dashed", color: "#111111" },
        verticalAlign: "middle",
      }),
    ).toEqual({
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "128px 12px 8px 4px",
      backgroundColor: "#f50000",
      borderRadius: "6px",
      border: "2px dashed #111111",
    });
  });

  it("leaves out transparent backgrounds, zero radius and 'none' borders", () => {
    const style = columnCanvasStyle({
      backgroundColor: "transparent",
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      borderRadius: 0,
      border: { width: 1, style: "none", color: "#000000" },
      verticalAlign: "bottom",
    });
    expect(style).toEqual({ display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0px 0px 0px 0px" });
  });
});

describe("rowCanvasStyle", () => {
  it("mirrors the row settings the compiler applies to the email", () => {
    expect(
      rowCanvasStyle({
        backgroundColor: "#fef3c7",
        backgroundImage: "https://cdn.test/bg.png",
        padding: { top: 20, right: 24, bottom: 20, left: 24 },
        borderRadius: 8,
        border: { width: 1, style: "solid", color: "#e5e7eb" },
      }),
    ).toEqual({
      padding: "20px 24px 20px 24px",
      backgroundColor: "#fef3c7",
      backgroundImage: 'url("https://cdn.test/bg.png")',
      backgroundSize: "cover",
      backgroundPosition: "center",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
    });
  });

  it("returns nothing for an unstyled row, and strips quotes from image URLs", () => {
    expect(rowCanvasStyle(undefined)).toEqual({});
    expect(rowCanvasStyle({ backgroundImage: 'https://x.test/a.png") , url("evil' }).backgroundImage).toBe('url("https://x.test/a.png) , url(evil")');
  });
});
