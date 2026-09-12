/* ═══ Colour control ═══
 *
 * The native picker only speaks `#rrggbb`, but a document may legitimately hold `transparent` or
 * a named colour, so the text input stays the source of truth and the swatch is a shortcut. */

import { useTranslator } from "../../context";
import { CloseIcon } from "../../icons";
import { asString } from "../../types";

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export interface ColorControlProps {
  value: unknown;
  onChange: (value: string) => void;
  label: string;
  allowTransparent?: boolean;
}

export function ColorControl({ value, onChange, label, allowTransparent }: ColorControlProps) {
  const t = useTranslator();
  const text = asString(value);
  const swatch = HEX.test(text) ? text : "#ffffff";

  return (
    <div className="eb-color">
      <label className="eb-color__swatch">
        <input
          type="color"
          value={swatch}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
        {/* The only inline style here is the value itself; the checkerboard behind it is the class. */}
        <span className="eb-color__fill" style={{ background: text || "transparent" }} />
      </label>
      <input
        className="eb-input"
        value={text}
        placeholder={allowTransparent ? t("field.transparent") : "#000000"}
        onChange={(event) => onChange(event.target.value)}
      />
      {allowTransparent ? (
        <button
          type="button"
          className="eb-color__clear"
          aria-label={t("field.transparent")}
          onClick={() => onChange("transparent")}
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}
