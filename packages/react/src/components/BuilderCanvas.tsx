/* ═══ BuilderCanvas ═══
 *
 * Generic email builder canvas:
 * 1. Command bar (undo/redo, Desktop/Mobile, Code, Preview)
 * 2. Email sheet container (responsive width, custom background & font)
 * 3. Rows with slots
 * 4. Footer with "Add row"
 */

import { useState } from "react";
import { useEditor, useTranslator } from "../context";
import { useDroppable } from "../hooks/useDnd";
import { useEditorSelector } from "../hooks/useEditorState";
import { useIsDragging } from "../hooks/useDnd";
import { BuilderRow } from "./BuilderRow";
import type { ToolbarAction } from "@email-builder/engine";
import { BuilderToolbar, type BuilderDevice } from "./BuilderToolbar";
import { Glyph } from "./Glyph";

export interface BuilderCanvasProps {
  className?: string;
  /** Show the command bar above the email. Default true. */
  showToolbar?: boolean;
  onPreview?: () => void;
  onCodeView?: () => void;
  /** Extra icon buttons in the command bar. */
  toolbarActions?: ToolbarAction[];
}

function RowSlot({ index }: { index: number }) {
  const editor = useEditor();
  const t = useTranslator();
  const drop = useDroppable({ kind: "row-slot", index }, { orientation: "vertical" });

  return (
    <div ref={drop.setNode} className={`eb-row-slot${drop.isOver ? " eb-row-slot--over" : ""}`}>
      <div className="eb-row-slot__guideline" />
      {drop.isOver && (
        <div className="builder-drop-indicator builder-drop-indicator--row">
          <div className="builder-drop-indicator__line" />
          <span className="builder-drop-indicator__pip builder-drop-indicator__pip--left" />
          <span className="builder-drop-indicator__pill">
            <Glyph name="add" style={{ fontSize: 13, marginRight: 4 }} />
            {t("canvas.insertRow")}
          </span>
          <span className="builder-drop-indicator__pip builder-drop-indicator__pip--right" />
        </div>
      )}
      <div className="eb-row-slot__add">
        <button
          type="button"
          className="eb-row-slot__add-btn"
          aria-label={t("canvas.addRow")}
          title={t("canvas.addRow")}
          onClick={(e) => {
            e.stopPropagation();
            editor.addRow([1], index);
          }}
        >
          <Glyph name="add" style={{ fontSize: 14 }} />
        </button>
      </div>
    </div>
  );
}

export function BuilderCanvas({ className, showToolbar = true, onPreview, onCodeView, toolbarActions }: BuilderCanvasProps) {
  const editor = useEditor();
  const t = useTranslator();
  const [device, setDevice] = useState<BuilderDevice>("desktop");
  const rows = useEditorSelector((state) => state.document.rows);
  const settings = useEditorSelector((state) => state.document.settings);
  const contentWidth = settings.contentWidth || 600;
  const isDragging = useIsDragging();

  const targetWidth = device === "mobile" ? 360 : contentWidth;

  const emptyDrop = useDroppable({ kind: "row-slot", index: 0 }, { container: true });

  const canvasClasses = [
    "builder-canvas",
    "eb-canvas",
    isDragging ? "eb-dragging" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const sheetStyle: React.CSSProperties = {
    maxWidth: `${targetWidth}px`,
    backgroundColor: settings.contentBackgroundColor || "#ffffff",
    fontFamily: settings.fontFamily || "Arial, sans-serif",
    color: settings.textColor || "#333333",
  };

  return (
    <main
      className={canvasClasses}
      role="region"
      aria-label={t("canvas.label")}
      onClick={() => editor.select(null)}
    >
      {showToolbar && (
        <BuilderToolbar
          device={device}
          onDeviceChange={(next) => {
            setDevice(next);
            editor.setDevice(next); // blocks read it to preview their mobile overrides
          }}
          width={targetWidth}
          actions={toolbarActions}
          onPreview={onPreview}
          onCodeView={onCodeView}
        />
      )}

      {/* Only the email scrolls; the command bar above stays put. */}
      <div className="builder-canvas__scroll">
        {/* Email Sheet */}
        <div
          className={`builder-canvas__sheet eb-sheet${device === "mobile" ? " builder-canvas__sheet--mobile eb-sheet--mobile" : ""}`}
          style={sheetStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {rows.length === 0 ? (
            <div
              ref={emptyDrop.setNode}
              className={`builder-canvas__empty${emptyDrop.isOver ? " builder-canvas__empty--over" : ""}`}
            >
              <Glyph name="add_box" />
              <p className="builder-canvas__empty-title">Start with a row</p>
              <p className="builder-canvas__empty-hint">Pick a layout on the left, then drag blocks into it.</p>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  marginTop: 12,
                  padding: "8px 16px",
                  background: "var(--eb-accent)",
                  color: "var(--eb-text-inverse)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
                onClick={() => editor.addRow([1])}
              >
                Add a full-width row
              </button>
            </div>
          ) : (
            <>
              {rows.map((row, index) => (
                <div key={row.id}>
                  <RowSlot index={index} />
                  <BuilderRow row={row} index={index} />
                </div>
              ))}
              <RowSlot index={rows.length} />
            </>
          )}
        </div>

        {/* Canvas Footer */}
        {rows.length > 0 && (
          <div className="builder-canvas__footer" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="builder-canvas__add-row"
              onClick={() => editor.addRow([1])}
            >
              <Glyph name="add" />
              {t("canvas.addRow")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
