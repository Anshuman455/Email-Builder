/* ═══ BuilderRow ═══
 *
 * One row on the canvas:
 * Left floating toolbar handle:
 *  - drag_indicator grip
 *  - arrow_upward (move up)
 *  - arrow_downward (move down)
 *  - view_column (edit layout)
 *  - content_copy (duplicate)
 *  - delete (delete row)
 */

import { useCallback } from "react";
import type { Row } from "@email-builder/core";
import { rowCanvasStyle } from "@email-builder/engine";
import { useEditor, useTranslator } from "../context";
import { useDraggable, useDroppable } from "../hooks/useDnd";
import { useEditorSelector } from "../hooks/useEditorState";
import { BuilderColumn } from "./BuilderColumn";
import { Glyph } from "./Glyph";

export interface BuilderRowProps {
  row: Row;
  index: number;
}

export function BuilderRow({ row, index }: BuilderRowProps) {
  const editor = useEditor();
  const t = useTranslator();

  const totalRows = useEditorSelector((state) => state.document.rows.length);
  const selected = useEditorSelector(
    (state) => state.selection?.kind === "row" && state.selection.id === row.id,
  );
  const landed = useEditorSelector((state) => state.landedId === row.id);

  const drop = useDroppable(
    { kind: "row", rowId: row.id, index },
    { orientation: "vertical" },
  );
  const drag = useDraggable({ kind: "row", rowId: row.id });

  const setNode = useCallback(
    (element: HTMLDivElement | null) => {
      drop.setNode(element);
      drag.setNode(element);
    },
    [drop.setNode, drag.setNode],
  );

  const moveRow = (dir: number) => {
    const target = index + dir;
    if (target >= 0 && target < totalRows) {
      editor.moveRow(row.id, target);
    }
  };

  const classes = [
    "builder-row",
    "eb-row",
    selected ? "builder-row--selected eb-row--selected" : "",
    landed ? "builder-row--landed eb-row--landed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={setNode}
      className={classes}
      onClick={(event) => {
        event.stopPropagation();
        editor.select({ kind: "row", id: row.id });
      }}
    >
      {drop.isOver && (
        <div className={`builder-drop-indicator builder-drop-indicator--row ${drop.edge === "after" ? "builder-drop-indicator--end" : ""}`}>
          <div className="builder-drop-indicator__line" />
          <span className="builder-drop-indicator__pip builder-drop-indicator__pip--left" />
          <span className="builder-drop-indicator__pill">
            <Glyph name="add" style={{ fontSize: 13, marginRight: 4 }} />
            {t(drop.edge === "after" ? "row.insertBelow" : "row.insertAbove")}
          </span>
          <span className="builder-drop-indicator__pip builder-drop-indicator__pip--right" />
        </div>
      )}

      {/* Left floating toolbar */}
      <div className="builder-row__toolbar" aria-label={`Row ${index + 1} actions`}>
        <button
          type="button"
          ref={drag.setHandle}
          className="builder-row__grip"
          aria-label={`Move row ${index + 1}`}
        >
          <Glyph name="drag_indicator" />
        </button>

        <div className="builder-row__actions">
          <button
            type="button"
            className="builder-row__action"
            aria-label={t("row.moveUp")}
            disabled={index === 0}
            title={t("row.moveUp")}
            onClick={(event) => {
              event.stopPropagation();
              moveRow(-1);
            }}
          >
            <Glyph name="arrow_upward" />
          </button>
          <button
            type="button"
            className="builder-row__action"
            aria-label={t("row.moveDown")}
            disabled={index >= totalRows - 1}
            title={t("row.moveDown")}
            onClick={(event) => {
              event.stopPropagation();
              moveRow(1);
            }}
          >
            <Glyph name="arrow_downward" />
          </button>
          <button
            type="button"
            className="builder-row__action"
            aria-label={t("row.layout")}
            title={t("row.layout")}
            onClick={(event) => {
              event.stopPropagation();
              editor.select({ kind: "row", id: row.id });
            }}
          >
            <Glyph name="view_column" />
          </button>
          <button
            type="button"
            className="builder-row__action"
            aria-label={t("row.duplicate")}
            title={t("row.duplicate")}
            onClick={(event) => {
              event.stopPropagation();
              editor.duplicateRow(row.id);
            }}
          >
            <Glyph name="content_copy" />
          </button>
          <button
            type="button"
            className="builder-row__action builder-row__action--danger"
            aria-label={t("row.delete")}
            title={t("row.delete")}
            onClick={(event) => {
              event.stopPropagation();
              editor.removeRow(row.id);
            }}
          >
            <Glyph name="delete" />
          </button>
        </div>
      </div>

      <div className="builder-row__columns eb-row__columns" style={rowCanvasStyle(row.style)}>
        {row.columns.map((column, columnIndex) => (
          <BuilderColumn
            key={column.id}
            row={row}
            column={column}
            columnIndex={columnIndex}
          />
        ))}
      </div>
    </div>
  );
}
