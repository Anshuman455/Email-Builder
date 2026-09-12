/* ═══ Padding control ═══
 *
 * Four cells in T R B L order plus a link-all toggle. Linked is the common case — an author who
 * wants 24px around a block should type it once. */

import { useState } from "react";
import type { Padding } from "@email-builder/core";
import { useTranslator } from "../../context";
import { asNumber } from "../../types";

const SIDES = ["top", "right", "bottom", "left"] as const;
type Side = (typeof SIDES)[number];

const EMPTY: Padding = { top: 0, right: 0, bottom: 0, left: 0 };

export interface PaddingControlProps {
  value: unknown;
  onChange: (value: Padding) => void;
}

export function PaddingControl({ value, onChange }: PaddingControlProps) {
  const t = useTranslator();
  const padding = normalize(value);
  const [linked, setLinked] = useState(() => isUniform(padding));

  const set = (side: Side, next: number) => {
    onChange(linked ? { top: next, right: next, bottom: next, left: next } : { ...padding, [side]: next });
  };

  return (
    <div className="eb-padding">
      {SIDES.map((side) => (
        <div key={side} className="eb-padding__cell">
          <span className="eb-padding__cell-label">{side.charAt(0)}</span>
          <input
            className="eb-input"
            type="number"
            inputMode="numeric"
            min={0}
            value={padding[side]}
            aria-label={t(`field.padding.${side}`, side)}
            onChange={(event) => set(side, Math.max(0, asNumber(event.target.value)))}
          />
        </div>
      ))}
      <label className="eb-padding__link">
        <input
          type="checkbox"
          checked={linked}
          onChange={(event) => {
            setLinked(event.target.checked);
            if (event.target.checked) {
              const next = padding.top;
              onChange({ top: next, right: next, bottom: next, left: next });
            }
          }}
        />
        {t("field.linkSides", "Link all sides")}
      </label>
    </div>
  );
}

function normalize(value: unknown): Padding {
  if (!value || typeof value !== "object") return EMPTY;
  const raw = value as Partial<Record<Side, unknown>>;
  return {
    top: asNumber(raw.top),
    right: asNumber(raw.right),
    bottom: asNumber(raw.bottom),
    left: asNumber(raw.left),
  };
}

const isUniform = (padding: Padding): boolean =>
  padding.top === padding.right && padding.right === padding.bottom && padding.bottom === padding.left;
