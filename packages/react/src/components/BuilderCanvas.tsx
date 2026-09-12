/* ═══ BuilderCanvas ═══
 *
 * Generic email builder canvas:
 * 1. Viewport bar at top (Desktop 600px / Mobile 360px toggle)
 * 2. Email sheet container (responsive width, custom background & font)
 * 3. Rows with slots
 * 4. Footer with "Add row" and compliance notice
 */

import { useEditor, useTranslator } from "../context";
import { useDroppable } from "../hooks/useDnd";
import { useEditorSelector } from "../hooks/useEditorState";
import { useIsDragging } from "../hooks/useDnd";
import { BuilderRow } from "./BuilderRow";

export interface BuilderCanvasProps {
  className?: string;
}

function RowSlot({ index }: { index: number }) {
  const editor = useEditor();
  const t = useTranslator();
  const drop = useDroppable({ kind: "row-slot", index }, { orientation: "horizontal" });

  return (
    <div ref={drop.setNode} className="eb-row-slot">
      <div className="eb-row-slot__add">
        <button
          type="button"
          className="eb-row-slot__add-btn"
          aria-label={t("canvas.addRow")}
          title="Add row"
          onClick={(e) => {
            e.stopPropagation();
            editor.addRow([1], index);
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
        </button>
      </div>
    </div>
  );
}

export function BuilderCanvas({ className }: BuilderCanvasProps) {
  const editor = useEditor();
  const t = useTranslator();
  const rows = useEditorSelector((state) => state.document.rows);
  const settings = useEditorSelector((state) => state.document.settings);
  const contentWidth = settings.contentWidth || 600;
  const device = useEditorSelector((state) => state.device);
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
      aria-label="Email Canvas"
      onClick={() => editor.select(null)}
    >
      {/* Viewport Switcher Bar */}
      <div className="builder-canvas__viewport-bar" onClick={(e) => e.stopPropagation()}>
        <div className="builder-canvas__viewport-segmented" role="radiogroup" aria-label="Canvas preview mode">
          <button
            type="button"
            className={`builder-canvas__viewport-btn${device === "desktop" ? " builder-canvas__viewport-btn--active" : ""}`}
            role="radio"
            aria-checked={device === "desktop"}
            title="Desktop Preview (600px)"
            onClick={() => editor.setDevice("desktop")}
          >
            <span className="material-symbols-outlined" aria-hidden="true">desktop_windows</span>
            <span className="builder-canvas__viewport-label">Desktop</span>
          </button>
          <button
            type="button"
            className={`builder-canvas__viewport-btn${device === "mobile" ? " builder-canvas__viewport-btn--active" : ""}`}
            role="radio"
            aria-checked={device === "mobile"}
            title="Mobile Preview (360px)"
            onClick={() => editor.setDevice("mobile")}
          >
            <span className="material-symbols-outlined" aria-hidden="true">smartphone</span>
            <span className="builder-canvas__viewport-label">Mobile</span>
          </button>
        </div>

        <div className="builder-canvas__viewport-info">
          {device === "mobile" ? "360px" : `${contentWidth}px`}
        </div>
      </div>

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
            <span className="material-symbols-outlined" aria-hidden="true">add_box</span>
            <p className="builder-canvas__empty-title">Start with a row</p>
            <p className="builder-canvas__empty-hint">Pick a layout on the left, then drag blocks into it.</p>
            <button
              type="button"
              className="btn-secondary"
              style={{
                marginTop: 12,
                padding: "8px 16px",
                background: "#394648",
                color: "#fff",
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
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            Add row
          </button>

          <div className="builder-canvas__locked-footer">
            <span className="material-symbols-outlined" aria-hidden="true">lock</span>
            <span>
              An unsubscribe link and postal address will be included with your email automatically.
            </span>
          </div>
        </div>
      )}
    </main>
  );
}
