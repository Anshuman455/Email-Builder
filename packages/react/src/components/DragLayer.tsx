/* ═══ DragLayer ═══
 *
 * Fixed, portalled overlay that follows the pointer during a drag. A ghost shows what is moving;
 * an indicator shows exactly where it will land. Both are read from the engine's drag store, never
 * recomputed by the view. */

import { Portal } from "./Portal";
import { useDragState } from "../hooks/useDnd";
import { useEditor, useTranslator } from "../context";
import { ICONS } from "@email-builder/core";
import { RowIcon } from "../icons";

export function DragLayer() {
  const drag = useDragState();
  const editor = useEditor();
  const t = useTranslator();

  if (!drag.active || !drag.pointer) return null;

  const { x, y } = drag.pointer;
  const ghostStyle: React.CSSProperties = {
    transform: `translate3d(${x + 12}px,${y + 12}px,0)`,
  };

  /* Label + icon for the ghost label. */
  let label = "";
  let iconSvg = "";
  if (drag.active.kind === "block") {
    /* A block drag carries the instance id, not the type — look the type up in the document. */
    const definition = editor.blocks.get(blockTypeOf(editor, drag.active.blockId) ?? "");
    label = definition?.label ?? "Block";
    const selected = editor.getSelectedIds();
    if (selected.length > 1 && selected.includes(drag.active.blockId)) label = `${selected.length} ${t("drag.blocks")}`;
    iconSvg = definition ? ICONS[definition.icon as keyof typeof ICONS] ?? "" : "";
  } else if (drag.active.kind === "palette") {
    const definition = editor.blocks.get(drag.active.blockType);
    label = definition?.label ?? drag.active.blockType;
    iconSvg = definition ? ICONS[definition.icon as keyof typeof ICONS] ?? "" : "";
  } else if (drag.active.kind === "row") {
    label = "Row";
  } else if (drag.active.kind === "palette-row") {
    label = drag.active.label ? `Row (${drag.active.label})` : "Row";
  }

  /* An empty column's drop zone is its own "inside" feedback; a second box on top is noise. */
  const overColumnId =
    drag.over?.kind === "column" ? (drag.over as { columnId: string }).columnId : null;
  const overEmptyColumn =
    overColumnId !== null &&
    editor.state
      .get()
      .document.rows.some((row) =>
        row.columns.some((column) => column.id === overColumnId && column.blocks.length === 0),
      );

  const ind = overEmptyColumn ? null : drag.indicator;
  let indicatorStyle: React.CSSProperties | null = null;
  let indicatorClass = "eb-indicator";
  if (ind) {
    const { rect, edge } = ind;
    const rectBottom = rect.top + rect.height;
    const rectRight = rect.left + rect.width;
    if (edge === "inside") {
      indicatorClass = "eb-indicator eb-indicator--inside";
      indicatorStyle = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    } else if (edge === "before" || edge === "after") {
      /* Horizontal indicator — above / below a block or row. */
      indicatorClass = "eb-indicator eb-indicator--vertical";
      indicatorStyle = {
        top: edge === "before" ? rect.top : rectBottom,
        left: rect.left,
        width: rect.width,
        height: 3,
      };
    } else {
      indicatorClass = "eb-indicator eb-indicator--horizontal";
      indicatorStyle = {
        top: rect.top,
        left: edge === "left" ? rect.left : rectRight,
        width: 3,
        height: rect.height,
      };
    }
  }

  return (
    <Portal>
      <div className="eb-ghost" style={ghostStyle}>
        <div className="eb-ghost__inner">
          {iconSvg ? (
            <span dangerouslySetInnerHTML={{ __html: iconSvg }} style={{ display: "contents" }} />
          ) : drag.active.kind === "row" || drag.active.kind === "palette-row" ? (
            <RowIcon />
          ) : null}
          {label}
        </div>
      </div>
      {indicatorStyle && <div className={indicatorClass} style={indicatorStyle} />}
    </Portal>
  );
}

function blockTypeOf(editor: ReturnType<typeof useEditor>, id: string): string | null {
  for (const row of editor.getDocument().rows)
    for (const column of row.columns)
      for (const block of column.blocks) if (block.id === id) return block.type;
  return null;
}
