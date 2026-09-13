/* ═══ BuilderColumn ═══
 *
 * A drop container, not a drop seam: dropping onto a column appends to it, while dropping onto a
 * block inside it inserts at that block's edge. The engine's `container: true` is what encodes
 * that difference. */

import { useMemo } from "react";
import { columnWidths, type Column, type Row } from "@email-builder/core";
import { useEditor, useTranslator } from "../context";
import { useDroppable } from "../hooks/useDnd";
import { useEditorSelector } from "../hooks/useEditorState";
import { BuilderBlock } from "./BuilderBlock";

export interface BuilderColumnProps {
  row: Row;
  column: Column;
  columnIndex: number;
}

export function BuilderColumn({ row, column, columnIndex }: BuilderColumnProps) {
  const editor = useEditor();
  const t = useTranslator();
  const selected = useEditorSelector(
    (state) => state.selection?.kind === "column" && state.selection.id === column.id,
  );
  const contentWidth = useEditorSelector((state) => state.document.settings.contentWidth);

  const drop = useDroppable(
    { kind: "column", columnId: column.id, rowId: row.id },
    { container: true },
  );

  /* Percentages rather than the px widths core emits: the sheet narrows to 375px in mobile
     preview, and the columns have to narrow with it. */
  const basis = useMemo(() => {
    const widths = columnWidths(row, contentWidth);
    const total = widths.reduce((sum, width) => sum + width, 0) || 1;
    return `${((widths[columnIndex] ?? total) / total) * 100}%`;
  }, [row, contentWidth, columnIndex]);

  const empty = column.blocks.length === 0;
  const classes = [
    "eb-column",
    empty ? "eb-column--empty" : "",
    selected ? "eb-column--selected" : "",
    drop.isOver ? "eb-column--over" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={drop.setNode}
      className={classes}
      style={{ flex: `0 0 ${basis}`, maxWidth: basis }}
      onClick={(event) => {
        event.stopPropagation();
        editor.select({ kind: "column", id: column.id });
      }}
    >
      {empty ? (
        <div className={`builder-column__drop-zone${drop.isOver ? " builder-column__drop-zone--over" : ""}`}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
          <span>{drop.isOver ? "Drop block here" : (t("canvas.emptyColumn") || "Drop block here")}</span>
        </div>
      ) : (
        column.blocks.map((block) => (
          <BuilderBlock
            key={block.id}
            block={block}
            row={row}
            column={column}
            columnIndex={columnIndex}
          />
        ))
      )}
    </div>
  );
}
