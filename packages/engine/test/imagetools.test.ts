import { describe, expect, it } from "vitest";
import { aspectCrop, moveCrop, resizeCrop } from "../src/imagetools";

const close = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 6);

describe("crop geometry", () => {
  it("fits the largest centred box for an aspect ratio", () => {
    /* A 2:1 image (1000×500) cropped square: full height, half the width, centred. */
    const square = aspectCrop(1, 2);
    close(square.width, 0.5);
    close(square.height, 1);
    close(square.x, 0.25);
    close(square.y, 0);

    /* A square image cropped 16:9: full width, shorter height. */
    const wide = aspectCrop(16 / 9, 1);
    close(wide.width, 1);
    close(wide.height, 9 / 16);
  });

  it("moves the box but never outside the image", () => {
    const rect = { x: 0.2, y: 0.2, width: 0.5, height: 0.5 };
    expect(moveCrop(rect, 0.1, -0.1)).toEqual({ x: 0.30000000000000004, y: 0.1, width: 0.5, height: 0.5 });
    expect(moveCrop(rect, 5, 5)).toMatchObject({ x: 0.5, y: 0.5 });
    expect(moveCrop(rect, -5, -5)).toMatchObject({ x: 0, y: 0 });
  });

  it("resizes from a corner, keeping the opposite corner fixed", () => {
    const rect = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
    const bigger = resizeCrop(rect, "se", 0.1, 0.2, null, 1);
    close(bigger.x, 0.2);
    close(bigger.y, 0.2);
    close(bigger.width, 0.5);
    close(bigger.height, 0.6);

    const fromTopLeft = resizeCrop(rect, "nw", -0.1, -0.1, null, 1);
    close(fromTopLeft.x, 0.1);
    close(fromTopLeft.y, 0.1);
    close(fromTopLeft.x + fromTopLeft.width, 0.6);
  });

  it("keeps the aspect ratio and stays inside the image", () => {
    const rect = { x: 0, y: 0.5, width: 0.3, height: 0.3 };
    const locked = resizeCrop(rect, "se", 0.9, 0, 1, 1);
    close(locked.width / locked.height, 1);
    expect(locked.y + locked.height).toBeLessThanOrEqual(1 + 1e-9);
    expect(locked.x + locked.width).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("never shrinks below a grabbable size", () => {
    const tiny = resizeCrop({ x: 0.4, y: 0.4, width: 0.2, height: 0.2 }, "se", -1, -1, null, 1);
    expect(tiny.width).toBeGreaterThan(0.04);
    expect(tiny.height).toBeGreaterThan(0.04);
  });
});
