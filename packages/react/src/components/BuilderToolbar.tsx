/* ═══ BuilderToolbar ═══
 *
 * The command bar above the email: history on the left, the viewport switch in the
 * middle, output actions on the right. It lives in the canvas column rather than across the top of
 * the page, so the builder brings no app header of its own into a host's layout. */

import type { ToolbarAction } from "@email-builder/engine";
import { useEditor, useTranslator } from "../context";
import { useEditorSelector } from "../hooks/useEditorState";
import { Glyph } from "./Glyph";

export type BuilderDevice = "desktop" | "mobile";

export interface BuilderToolbarProps {
  device: BuilderDevice;
  onDeviceChange: (device: BuilderDevice) => void;
  /** Width the canvas is currently previewing, in px. */
  width: number;
  onPreview?: () => void;
  onCodeView?: () => void;
  /** Host buttons — attachments, AI, anything. See `ToolbarAction`. */
  actions?: ToolbarAction[];
  className?: string;
}

const NO_ACTIONS: ToolbarAction[] = [];

const DEVICES: BuilderDevice[] = ["desktop", "mobile"];

export function BuilderToolbar({ device, onDeviceChange, width, onPreview, onCodeView, actions = NO_ACTIONS, className }: BuilderToolbarProps) {
  const editor = useEditor();
  const t = useTranslator();
  const canUndo = useEditorSelector((state) => state.canUndo);
  const canRedo = useEditorSelector((state) => state.canRedo);

  const renderAction = (action: ToolbarAction) => (
    <button
      key={action.id}
      type="button"
      className={[
        "eb-commandbar__btn",
        "eb-commandbar__btn--icon",
        action.primary ? "eb-commandbar__btn--primary" : "",
        action.active ? "eb-commandbar__btn--active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={action.label}
      title={action.label}
      aria-pressed={action.active}
      disabled={action.disabled}
      onClick={() => action.onClick(editor)}
    >
      <Glyph name={action.icon} />
    </button>
  );

  return (
    <div
      className={className ? `eb-commandbar ${className}` : "eb-commandbar"}
      role="toolbar"
      aria-label={t("toolbar.label")}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="eb-commandbar__start">
        <div className="eb-commandbar__group">
          <button
            type="button"
            className="eb-commandbar__icon-btn"
            disabled={!canUndo}
            aria-label={t("toolbar.undo")}
            title={`${t("toolbar.undo")} (⌘Z)`}
            onClick={() => editor.undo()}
          >
            <Glyph name="undo" />
          </button>
          <button
            type="button"
            className="eb-commandbar__icon-btn"
            disabled={!canRedo}
            aria-label={t("toolbar.redo")}
            title={`${t("toolbar.redo")} (⌘⇧Z)`}
            onClick={() => editor.redo()}
          >
            <Glyph name="redo" />
          </button>
        </div>
        {actions.filter((action) => action.placement === "start").map(renderAction)}
      </div>

      <div className="eb-commandbar__center">
        <div className="eb-commandbar__segmented" role="radiogroup" aria-label={t("toolbar.viewport")}>
          {DEVICES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={device === option}
              className={`eb-commandbar__segment${device === option ? " eb-commandbar__segment--active" : ""}`}
              title={t(`toolbar.${option}`)}
              onClick={() => onDeviceChange(option)}
            >
              <Glyph name={option === "desktop" ? "desktop" : "smartphone"} />
              <span className="eb-commandbar__label">{t(`toolbar.${option}`)}</span>
            </button>
          ))}
        </div>
        <span className="eb-commandbar__width">{width}px</span>
      </div>

      <div className="eb-commandbar__end">
        {actions.filter((action) => action.placement !== "start").map(renderAction)}
        {onCodeView && (
          <button type="button" className="eb-commandbar__btn" title={t("toolbar.code")} onClick={onCodeView}>
            <Glyph name="code" />
            <span className="eb-commandbar__label">{t("toolbar.code")}</span>
          </button>
        )}
        {onPreview && (
          <button
            type="button"
            className="eb-commandbar__btn eb-commandbar__btn--primary"
            title={`${t("toolbar.preview")} (⌘P)`}
            onClick={onPreview}
          >
            <Glyph name="visibility" />
            <span className="eb-commandbar__label">{t("toolbar.preview")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
