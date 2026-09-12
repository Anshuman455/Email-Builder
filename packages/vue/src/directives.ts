/* ═══ Drag registration ═══
 *
 * Directives, not components: the engine wants a real element and a cleanup function, which is
 * exactly what a directive's mounted/unmounted pair is for. Wrapping it in a component would add
 * a DOM node the stylesheet does not know about.
 *
 * The editor travels in the binding value because a directive has no injection context. */

import type { Directive } from "vue";
import type { DragSource, DropTarget, Editor } from "@email-builder/engine";

export interface DragBinding {
  editor: Editor;
  data: DragSource;
  disabled?: boolean;
  /** Restrict the drag to a child of the bound element. Omit and the element is its own handle. */
  handle?: HTMLElement | null;
}

export interface DropBinding {
  editor: Editor;
  data: DropTarget;
  orientation?: "horizontal" | "vertical";
  /** Accept a drop anywhere inside rather than splitting on the midpoint. */
  container?: boolean;
  accepts?: (source: DragSource) => boolean;
}

const dragCleanups = new WeakMap<HTMLElement, () => void>();
const dropCleanups = new WeakMap<HTMLElement, () => void>();

/* Registrations carry data — a row slot's index, a block's column — that changes as the document
   is edited, so a cheap structural compare of just that data decides whether to re-register. The
   editor and the callbacks are deliberately not compared: one is cyclic, the others are new
   closures on every render and would force a pointless re-registration each time. */
const sameData = (a: DragBinding | DropBinding, b: DragBinding | DropBinding | null | undefined) =>
  !!b && a.editor === b.editor && JSON.stringify(a.data) === JSON.stringify(b.data);

const register = (element: HTMLElement, binding: DragBinding) => {
  const { editor, data, disabled, handle } = binding;
  dragCleanups.set(element, editor.dnd.draggable(element, data, { disabled, handle: handle ?? undefined }));
};

const observe = (element: HTMLElement, binding: DropBinding) => {
  const { editor, data, orientation, container, accepts } = binding;
  dropCleanups.set(element, editor.dnd.droppable(element, data, { orientation, container, accepts }));
};

export const vDrag: Directive<HTMLElement, DragBinding> = {
  mounted(element, binding) {
    register(element, binding.value);
  },
  updated(element, binding) {
    if (sameData(binding.value, binding.oldValue) && binding.value.disabled === binding.oldValue?.disabled) return;
    dragCleanups.get(element)?.();
    register(element, binding.value);
  },
  unmounted(element) {
    dragCleanups.get(element)?.();
    dragCleanups.delete(element);
  },
};

export const vDrop: Directive<HTMLElement, DropBinding> = {
  mounted(element, binding) {
    observe(element, binding.value);
  },
  updated(element, binding) {
    if (sameData(binding.value, binding.oldValue) && binding.value.container === binding.oldValue?.container) return;
    dropCleanups.get(element)?.();
    observe(element, binding.value);
  },
  unmounted(element) {
    dropCleanups.get(element)?.();
    dropCleanups.delete(element);
  },
};
