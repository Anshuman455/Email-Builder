/* ═══ Border control ═══
 *
 * Width, style and colour in one row, because a border is one decision — editing them as three
 * separate fields makes an author set a width against an invisible `none`. */

import { NO_BORDER, type Border } from "@email-builder/core";
import { useTranslator } from "../../context";
import { asNumber, asString } from "../../types";
import { ColorControl } from "./ColorField";

const STYLES: Border["style"][] = ["none", "solid", "dashed", "dotted"];

export interface BorderControlProps {
  value: unknown;
  onChange: (value: Border) => void;
  label: string;
}

export function BorderControl({ value, onChange, label }: BorderControlProps) {
  const t = useTranslator();
  const border = normalize(value);

  return (
    <div className="eb-border">
      <input
        className="eb-input"
        type="number"
        min={0}
        max={24}
        value={border.width}
        aria-label={t("field.borderWidth", "Border width")}
        /* Setting a width on a `none` border would do nothing visible, so it implies `solid`. */
        onChange={(event) => {
          const width = Math.max(0, asNumber(event.target.value));
          onChange({
            ...border,
            width,
            style: width > 0 && border.style === "none" ? "solid" : border.style,
          });
        }}
      />
      <select
        className="eb-select"
        value={border.style}
        aria-label={t("field.borderStyle", "Border style")}
        onChange={(event) => onChange({ ...border, style: event.target.value as Border["style"] })}
      >
        {STYLES.map((style) => (
          <option key={style} value={style}>
            {t(`field.border.${style}`, style.charAt(0).toUpperCase() + style.slice(1))}
          </option>
        ))}
      </select>
      <ColorControl
        value={border.color}
        label={label}
        onChange={(color) => onChange({ ...border, color })}
      />
    </div>
  );
}

function normalize(value: unknown): Border {
  if (!value || typeof value !== "object") return { ...NO_BORDER };
  const raw = value as Partial<Border>;
  return {
    width: asNumber(raw.width),
    style: STYLES.includes(raw.style as Border["style"]) ? (raw.style as Border["style"]) : "none",
    color: asString(raw.color) || NO_BORDER.color,
  };
}
