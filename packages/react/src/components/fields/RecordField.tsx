/* ═══ Record picker ═══
 *
 * Pulls rows from the host's own data through `adapter.records`. Picking one writes several
 * content keys at once — a product card is a title, an image, a price and a link — so the patch
 * goes through `editor.updateContent` rather than through this field's own `onChange`. */

import { useEffect, useRef, useState } from "react";
import type { Block, Field } from "@email-builder/core";
import type { RecordOption } from "@email-builder/engine";
import { useEditor, useTranslator } from "../../context";
import { asString } from "../../types";

const DEBOUNCE_MS = 220;

export interface RecordControlProps {
  field: Extract<Field, { kind: "record" }>;
  value: unknown;
  onChange: (value: string) => void;
  block: Block | null;
}

export function RecordControl({ field, value, onChange, block }: RecordControlProps) {
  const editor = useEditor();
  const t = useTranslator();
  const records = editor.adapter.records;
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<RecordOption[]>([]);
  const [loading, setLoading] = useState(false);
  /* Guards against an earlier, slower response overwriting a later one. */
  const request = useRef(0);

  useEffect(() => {
    if (!records) return;
    const ticket = (request.current += 1);
    const timer = window.setTimeout(() => {
      setLoading(true);
      Promise.resolve(records.list(field.source, { search, limit: 20 }))
        .then((rows) => {
          if (ticket === request.current) setOptions(rows);
        })
        .catch((error) => {
          if (ticket === request.current) setOptions([]);
          editor.events.emit("error", { error, where: "records.list" });
        })
        .finally(() => {
          if (ticket === request.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [editor, records, field.source, search]);

  const pick = (option: RecordOption) => {
    onChange(option.id);
    if (!block) return;
    const patch =
      field.mapToContent?.(option.raw ?? option) ?? records?.map?.(field.source, option) ?? {};
    if (Object.keys(patch).length > 0) editor.updateContent(block.id, patch, "record");
  };

  if (!records) return null;

  const selected = asString(value);

  return (
    <div className="eb-record">
      <input
        className="eb-input"
        value={search}
        placeholder={t("field.searchRecords")}
        onChange={(event) => setSearch(event.target.value)}
      />
      {options.length === 0 && !loading ? (
        <div className="eb-merge__empty">{t("field.noRecords")}</div>
      ) : (
        options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="eb-record__option"
            aria-pressed={option.id === selected}
            onClick={() => pick(option)}
          >
            {option.image ? <img className="eb-record__thumb" src={option.image} alt="" /> : null}
            <span>
              <span className="eb-record__label">{option.label}</span>
              {option.description ? (
                <span className="eb-record__desc"> {option.description}</span>
              ) : null}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
