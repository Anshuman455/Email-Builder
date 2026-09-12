/* ═══ Drag bindings ═══
 *
 * Every drag decision — activation distance, hit testing, edges, auto-scroll — lives in the
 * engine. These hooks only hand it elements and read its state back.
 *
 * Elements arrive through `useState` rather than a plain ref so that registration re-runs when
 * the node actually changes; a ref mutation is invisible to an effect. */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  targetId,
  type DragSource,
  type DragState,
  type DropTarget,
  type Edge,
} from "@email-builder/engine";
import { useEditor } from "../context";
import { useStoreSelector } from "./useStoreSelector";

export interface UseDraggableResult {
  /** The element that gets dragged. */
  setNode: (element: HTMLElement | null) => void;
  /** Optional grip. Without it the whole node is the handle. */
  setHandle: (element: HTMLElement | null) => void;
  isDragging: boolean;
}

export function useDraggable(
  source: DragSource | null,
  options: { disabled?: boolean } = {},
): UseDraggableResult {
  const editor = useEditor();
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [handle, setHandle] = useState<HTMLElement | null>(null);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  /* Serialised so an equal-but-new object literal does not re-register on every render. */
  const key = source ? JSON.stringify(source) : null;
  const disabled = options.disabled ?? false;

  useEffect(() => {
    const data = sourceRef.current;
    if (!node || !data || disabled) return;
    return editor.dnd.draggable(node, data, { handle });
  }, [editor, node, handle, key, disabled]);

  const isDragging = useStoreSelector(editor.dnd.state, (state) =>
    sameSource(state.active, sourceRef.current),
  );

  return { setNode, setHandle, isDragging };
}

export interface UseDroppableResult {
  setNode: (element: HTMLElement | null) => void;
  isOver: boolean;
  /** Which seam the engine currently points at, or null when this target is not hovered. */
  edge: Edge | null;
}

export function useDroppable(
  target: DropTarget | null,
  options: {
    orientation?: "horizontal" | "vertical";
    container?: boolean;
    accepts?: (source: DragSource) => boolean;
  } = {},
): UseDroppableResult {
  const editor = useEditor();
  const [node, setNode] = useState<HTMLElement | null>(null);
  const targetRef = useRef(target);
  targetRef.current = target;
  const acceptsRef = useRef(options.accepts);
  acceptsRef.current = options.accepts;

  /* The full target, not `targetId`: a row's `index` changes when rows are reordered and the
     engine drops against whatever object was registered. */
  const key = target ? JSON.stringify(target) : null;
  const { orientation, container } = options;

  useEffect(() => {
    const data = targetRef.current;
    if (!node || !data) return;
    return editor.dnd.droppable(node, data, {
      orientation,
      container,
      accepts: acceptsRef.current ? (source) => acceptsRef.current?.(source) ?? true : undefined,
    });
  }, [editor, node, key, orientation, container]);

  const id = target ? targetId(target) : null;
  const edge = useStoreSelector(editor.dnd.state, (state) =>
    id !== null && state.over !== null && targetId(state.over) === id
      ? state.indicator?.edge ?? "inside"
      : null,
  );

  return { setNode, isOver: edge !== null, edge };
}

/** The whole drag state — for the ghost, the indicator and the "is anything moving" checks. */
export function useDragState(): DragState {
  const editor = useEditor();
  return useStoreSelector(editor.dnd.state, identity);
}

export function useIsDragging(): boolean {
  const editor = useEditor();
  return useStoreSelector(editor.dnd.state, (state) => state.active !== null);
}

/** Keeps a local ref alongside a hook's `setNode`, for components that need the node too. */
export function useNodeRef(
  setNode: (element: HTMLElement | null) => void,
  local: { current: HTMLElement | null },
): (element: HTMLElement | null) => void {
  return useCallback(
    (element: HTMLElement | null) => {
      local.current = element;
      setNode(element);
    },
    [setNode, local],
  );
}

const identity = (state: DragState): DragState => state;

/** Field comparison rather than `JSON.stringify`: this runs for every draggable on the page on
 *  every pointer move of a drag. */
function sameSource(a: DragSource | null, b: DragSource | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "palette" && b.kind === "palette") return a.blockType === b.blockType;
  if (a.kind === "block" && b.kind === "block") return a.blockId === b.blockId;
  if (a.kind === "row" && b.kind === "row") return a.rowId === b.rowId;
  return false;
}
