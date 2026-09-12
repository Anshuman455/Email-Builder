/* ═══ List control ═══
 *
 * Repeating sub-records — social links, list items. Items are collapsed by default: a footer
 * with six social links otherwise buries every other field in the inspector. */

import { useState } from "react";
import { NO_BORDER, padding as emptyPadding, type Block, type Field } from "@email-builder/core";
import { useTranslator } from "../../context";
import { CloseIcon, PlusIcon } from "../../icons";
import { BuilderField } from "../BuilderField";

type Item = Record<string, unknown>;

export interface ListControlProps {
  field: Extract<Field, { kind: "list" }>;
  value: unknown;
  onChange: (value: Item[]) => void;
  block: Block | null;
}

export function ListControl({ field, value, onChange, block }: ListControlProps) {
  const t = useTranslator();
  const items = Array.isArray(value) ? (value as Item[]) : [];
  const [open, setOpen] = useState<number | null>(items.length === 1 ? 0 : null);

  const patch = (index: number, changes: Item) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    setOpen(null);
  };

  const add = () => {
    onChange([...items, blank(field.itemFields)]);
    setOpen(items.length);
  };

  return (
    <div className="eb-list">
      {items.map((item, index) => {
        const collapsed = open !== index;
        return (
          <div
            key={index}
            className={`eb-list__item${collapsed ? " eb-list__item--collapsed" : ""}`}
          >
            <div className="eb-list__item-header">
              <button
                type="button"
                className="eb-list__item-label"
                aria-expanded={!collapsed}
                onClick={() => setOpen(collapsed ? index : null)}
              >
                {label(field, item, index)}
              </button>
              <button
                type="button"
                className="eb-list__remove"
                aria-label={t("field.removeItem")}
                onClick={() => remove(index)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="eb-list__item-body">
              {field.itemFields.map((itemField) => (
                <BuilderField
                  key={itemField.key}
                  field={itemField}
                  value={item[itemField.key]}
                  block={block}
                  onChange={(next) => patch(index, { [itemField.key]: next })}
                />
              ))}
            </div>
          </div>
        );
      })}

      {field.max !== undefined && items.length >= field.max ? null : (
        <button type="button" className="eb-list__add" onClick={add}>
          <PlusIcon />
          {field.addLabel ?? t("field.addItem")}
        </button>
      )}
    </div>
  );
}

function label(field: Extract<Field, { kind: "list" }>, item: Item, index: number): string {
  if (field.itemLabel) return field.itemLabel(item, index);
  /* Falls back to the first non-empty string in the record — a social link reads better as
     "Instagram" than as "Item 3". */
  for (const candidate of field.itemFields) {
    const value = item[candidate.key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return `${index + 1}`;
}

function blank(fields: Field[]): Item {
  const item: Item = {};
  for (const field of fields) item[field.key] = defaultFor(field);
  return item;
}

function defaultFor(field: Field): unknown {
  switch (field.kind) {
    case "toggle":
      return false;
    case "number":
    case "range":
      return 0;
    case "padding":
      return emptyPadding(0);
    case "border":
      return { ...NO_BORDER };
    case "list":
      return [];
    case "select":
    case "segmented":
      return field.options[0]?.value ?? "";
    default:
      return "";
  }
}
