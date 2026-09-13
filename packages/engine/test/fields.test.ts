import { describe, expect, it } from "vitest";
import type { Field } from "@email-builder/core";
import { groupFields } from "../src/fields";

const field = (key: string, inline = false) => ({ kind: "text", key, label: key, ...(inline ? { inline } : {}) }) as Field;
const shape = (fields: Field[]) => groupFields(fields).map((run) => `${run.inline ? "row" : "full"}:${run.fields.map((f) => f.key).join("+")}`);

describe("groupFields", () => {
  it("pairs consecutive inline fields and keeps the rest full width", () => {
    expect(shape([field("align"), field("font"), field("size", true), field("weight", true), field("colour"), field("lineHeight", true), field("letterSpacing", true)])).toEqual([
      "full:align",
      "full:font",
      "row:size+weight",
      "full:colour",
      "row:lineHeight+letterSpacing",
    ]);
  });

  it("never leaves a lone inline field at half width, and splits long inline runs into pairs", () => {
    expect(shape([field("a", true), field("b")])).toEqual(["full:a", "full:b"]);
    expect(shape([field("a", true), field("b", true), field("c", true)])).toEqual(["row:a+b", "full:c"]);
  });
});
