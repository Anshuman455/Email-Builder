// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { createDragEngine } from "../src/drag";

const source = { kind: "block" as const, blockId: "b1", columnId: "c1" };

function press(target: Element, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe("drag engine keyboard handling", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does not swallow Space, Enter or Shift+Enter typed into editable text inside a draggable", () => {
    const engine = createDragEngine({ onDrop() {} });
    const block = document.createElement("div");
    const text = document.createElement("p");
    text.setAttribute("contenteditable", "true");
    block.append(text);
    document.body.append(block);
    engine.draggable(block, source);

    expect(press(text, " ").defaultPrevented).toBe(false);
    expect(press(text, "Enter").defaultPrevented).toBe(false);
    expect(press(text, "Enter", { shiftKey: true }).defaultPrevented).toBe(false);
    expect(engine.state.get().active).toBeNull();
    engine.destroy();
  });

  it("still starts a keyboard drag when the handle itself has focus", () => {
    const engine = createDragEngine({ onDrop() {} });
    const block = document.createElement("div");
    const grip = document.createElement("button");
    block.append(grip);
    document.body.append(block);
    engine.draggable(block, source, { handle: grip });

    expect(press(grip, " ").defaultPrevented).toBe(true);
    expect(engine.state.get().active).toEqual(source);
    engine.cancel();
    engine.destroy();
  });
});
