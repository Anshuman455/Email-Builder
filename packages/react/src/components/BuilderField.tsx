/* ═══ BuilderField ═══
 *
 * One declarative field from a block's schema. Every `Field["kind"]` is handled here, which is
 * what lets a host's custom block get controls identical to a built-in's without writing UI.
 *
 * The markup per kind is dictated by `packages/styles/src/fields.css` — the class names are the
 * spec, and nothing here invents one. */

import { useId, useRef, type ReactNode } from "react";
import { FONT_STACKS, type Border, type FieldOption, type Padding } from "@email-builder/core";
import { useEditor, useTranslator } from "../context";
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from "../icons";
import { asBoolean, asNumber, asString, type BuilderFieldProps, type CustomWidgetProps } from "../types";
import { BorderControl } from "./fields/BorderField";
import { ColorControl } from "./fields/ColorField";
import { ImageControl } from "./fields/ImageField";
import { ListControl } from "./fields/ListField";
import { MergeTrigger } from "./fields/MergeMenu";
import { PaddingControl } from "./fields/PaddingField";
import { RecordControl } from "./fields/RecordField";
import { RichTextControl } from "./fields/RichTextField";

const ALIGN_ICONS = {
  left: AlignLeftIcon,
  center: AlignCenterIcon,
  right: AlignRightIcon,
} as const;

export function BuilderField({ field, value, onChange, block }: BuilderFieldProps) {
  const id = useId();
  /* Held so the merge picker can insert at the caret of whatever control this field rendered. */
  const control = useRef<HTMLElement | null>(null);
  const label = field.label ?? field.key;
  const mergeable = "mergeable" in field && field.mergeable === true;

  /* The toggle carries its own label inside `.eb-toggle`, so a second one above it would read as
     two separate controls. */
  const showLabel = field.kind !== "toggle";

  return (
    <div className="eb-field">
      {showLabel ? (
        <label className="eb-field__label" htmlFor={id}>
          <span>{label}</span>
          {mergeable ? (
            <MergeTrigger control={control} value={asString(value)} onChange={onChange} />
          ) : null}
        </label>
      ) : null}

      <Control
        field={field}
        value={value}
        onChange={onChange}
        block={block}
        id={id}
        label={label}
        control={control}
      />

      {field.help ? <span className="eb-field__help">{field.help}</span> : null}
    </div>
  );
}

interface ControlProps extends BuilderFieldProps {
  id: string;
  label: string;
  control: { current: HTMLElement | null };
}

function Control({ field, value, onChange, block, id, label, control }: ControlProps): ReactNode {
  const editor = useEditor();
  const t = useTranslator();

  switch (field.kind) {
    /* ── Text-like ── */
    case "text":
    case "url":
      return (
        <input
          id={id}
          ref={(element) => {
            control.current = element;
          }}
          className="eb-input"
          type={field.kind === "url" ? "url" : "text"}
          value={asString(value)}
          maxLength={field.kind === "text" ? field.maxLength : undefined}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "textarea":
      return (
        <textarea
          id={id}
          ref={(element) => {
            control.current = element;
          }}
          /* `--code` for an HTML block: proportional type makes markup unreadable. */
          className={`eb-textarea${field.key === "html" ? " eb-textarea--code" : ""}`}
          rows={field.rows}
          value={asString(value)}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "richtext":
      return (
        <RichTextControl
          value={value}
          label={label}
          placeholder={field.placeholder}
          onChange={onChange}
        />
      );

    /* ── Numeric ── */
    case "number":
      return (
        <div className="eb-number">
          <input
            id={id}
            className="eb-input"
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
            value={asString(value)}
            onChange={(event) =>
              onChange(event.target.value === "" ? undefined : asNumber(event.target.value))
            }
          />
          {field.suffix ? <span className="eb-number__suffix">{field.suffix}</span> : null}
        </div>
      );

    case "range":
      return (
        <div className="eb-range">
          <input
            id={id}
            className="eb-range__input"
            type="range"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={asNumber(value, field.min)}
            onChange={(event) => onChange(asNumber(event.target.value, field.min))}
          />
          <span className="eb-range__value">
            {asNumber(value, field.min)}
            {field.suffix}
          </span>
        </div>
      );

    /* ── Colour, toggle, choice ── */
    case "color":
      return (
        <ColorControl
          value={value}
          label={label}
          allowTransparent={field.allowTransparent}
          onChange={onChange}
        />
      );

    case "toggle":
      return (
        <label className="eb-toggle">
          <span>{label}</span>
          <input
            id={id}
            type="checkbox"
            checked={asBoolean(value)}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span className="eb-toggle__track">
            <span className="eb-toggle__thumb" />
          </span>
        </label>
      );

    /* A native select, deliberately: the one control that is fully accessible and fully native on
       mobile without a library. */
    case "select":
      return (
        <select
          id={id}
          className="eb-select"
          value={asString(value)}
          onChange={(event) => onChange(decodeOption(field.options, event.target.value))}
        >
          {field.options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case "segmented":
      return (
        <div className="eb-segmented" role="group" aria-label={label}>
          {field.options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              className="eb-segmented__item"
              aria-pressed={asString(value) === String(option.value)}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      );

    case "align":
      return (
        <div className="eb-align" role="group" aria-label={label}>
          {(["left", "center", "right"] as const).map((alignment) => {
            const Icon = ALIGN_ICONS[alignment];
            return (
              <button
                key={alignment}
                type="button"
                className="eb-align__btn"
                aria-pressed={asString(value) === alignment}
                aria-label={t(`field.align.${alignment}`, alignment)}
                onClick={() => onChange(alignment)}
              >
                <Icon />
              </button>
            );
          })}
        </div>
      );

    case "font":
      return (
        <select
          id={id}
          className="eb-select"
          value={asString(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          {FONT_STACKS.map((stack) => (
            <option key={stack.value} value={stack.value}>
              {stack.label}
            </option>
          ))}
        </select>
      );

    /* ── Composite ── */
    case "padding":
      return <PaddingControl value={value} onChange={onChange as (value: Padding) => void} />;

    case "border":
      return (
        <BorderControl value={value} label={label} onChange={onChange as (value: Border) => void} />
      );

    case "image":
      return <ImageControl value={value} fieldKey={field.key} block={block} onChange={onChange} />;

    case "list":
      return <ListControl field={field} value={value} block={block} onChange={onChange} />;

    case "record":
      return <RecordControl field={field} value={value} block={block} onChange={onChange} />;

    /* ── Host escape hatch ── */
    case "custom": {
      const Widget = editor.adapter.widgets?.[field.widget] as
        | ((props: CustomWidgetProps) => ReactNode)
        | undefined;
      if (!Widget) return null;
      return <Widget field={field} value={value} onChange={onChange} block={block} editor={editor} />;
    }

    default:
      return null;
  }
}

/** `FieldOption.value` may be a number or a boolean; a `<select>` only ever gives back a string. */
function decodeOption(options: FieldOption[], raw: string): unknown {
  const match = options.find((option) => String(option.value) === raw);
  return match ? match.value : raw;
}
