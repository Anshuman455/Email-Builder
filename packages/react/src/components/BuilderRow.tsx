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
import { useEditor, useTranslator } from "../context";
import { useDraggable, useDroppable } from "../hooks/useDnd";
import { useEditorSelector } from "../hooks/useEditorState";
import { BuilderColumn } from "./BuilderColumn";

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
            <span className="material-symbols-outlined" style={{ fontSize: 13, marginRight: 4 }}>add</span>
            Insert row {drop.edge === "after" ? "below" : "above"}
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
          <span className="material-symbols-outlined" aria-hidden="true">drag_indicator</span>
        </button>

        <div className="builder-row__actions">
          <button
            type="button"
            className="builder-row__action"
            aria-label="Move row up"
            disabled={index === 0}
            title="Move row up"
            onClick={(event) => {
              event.stopPropagation();
              moveRow(-1);
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
          </button>
          <button
            type="button"
            className="builder-row__action"
            aria-label="Move row down"
            disabled={index >= totalRows - 1}
            title="Move row down"
            onClick={(event) => {
              event.stopPropagation();
              moveRow(1);
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">arrow_downward</span>
          </button>
          <button
            type="button"
            className="builder-row__action"
            aria-label="Change row layout"
            title="Change row layout"
            onClick={(event) => {
              event.stopPropagation();
              editor.select({ kind: "row", id: row.id });
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">view_column</span>
          </button>
          <button
            type="button"
            className="builder-row__action"
            aria-label="Duplicate row"
            title="Duplicate row"
            onClick={(event) => {
              event.stopPropagation();
              editor.duplicateRow(row.id);
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
          </button>
          <button
            type="button"
            className="builder-row__action builder-row__action--danger"
            aria-label="Delete row"
            title="Delete row"
            onClick={(event) => {
              event.stopPropagation();
              editor.removeRow(row.id);
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
        </div>
      </div>

      <div className="builder-row__columns eb-row__columns">
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
