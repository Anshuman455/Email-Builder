/* ═══ DragLayer ═══
 *
 * Fixed, portalled overlay that follows the pointer during a drag. A ghost shows what is moving;
 * an indicator shows exactly where it will land. Both are read from the engine's drag store, never
 * recomputed by the view. */

import { Portal } from "./Portal";
import { useDragState } from "../hooks/useDnd";
import { useEditor } from "../context";
import { ICONS } from "@email-builder/core";
import { RowIcon } from "../icons";

export function DragLayer() {
  const drag = useDragState();
  const editor = useEditor();

  if (!drag.active || !drag.pointer) return null;

  const { x, y } = drag.pointer;
  const ghostStyle: React.CSSProperties = {
    transform: `translate3d(${x + 12}px,${y + 12}px,0)`,
  };

  /* Label + icon for the ghost label. */
  let label = "";
  let iconSvg = "";
  if (drag.active.kind === "block") {
    const definition = editor.blocks.get(drag.active.blockId);
    label = definition?.label ?? drag.active.blockId;
    iconSvg = definition ? ICONS[definition.icon as keyof typeof ICONS] ?? "" : "";
  } else if (drag.active.kind === "palette") {
    const definition = editor.blocks.get(drag.active.blockType);
    label = definition?.label ?? drag.active.blockType;
    iconSvg = definition ? ICONS[definition.icon as keyof typeof ICONS] ?? "" : "";
  } else if (drag.active.kind === "row") {
    label = "Row";
  }

  const ind = drag.indicator;
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
          ) : drag.active.kind === "row" ? (
            <RowIcon />
          ) : null}
          {label}
        </div>
      </div>
      {indicatorStyle && <div className={indicatorClass} style={indicatorStyle} />}
    </Portal>
  );
}
