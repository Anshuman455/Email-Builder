/* ══════════════════════════════ Drag engine ══════════════════════════════
 *
 * Pointer Events on plain DOM nodes. No framework, no virtual DOM, no dnd-kit — that library is
 * React-only, and it is the single reason an editor built on it cannot ship to Vue.
 *
 * ── Registration, not rendering ───────────────────────────────────────────────────────────────
 * A view hands the engine an element and says what it is. The engine never creates or removes
 * anything a framework owns; it reads geometry, tracks the pointer and writes state back into a
 * store. Both view layers then draw the indicator themselves, in their own idiom.
 *
 * ── Innermost registered target wins ──────────────────────────────────────────────────────────
 * `elementsFromPoint` returns the whole stack under the pointer, front to back. Taking the first
 * registered one gives "pointer is inside this target" semantics. The nearest-centre algorithms
 * every generic library defaults to resolve badly here, because the layout nests 24px drop
 * spacers inside 400px rows and the nearest centre is routinely the wrong one.
 *
 * ── Activation distance ───────────────────────────────────────────────────────────────────────
 * A click that wobbled must stay a click. Below the threshold nothing starts, so selecting a
 * block on a trackpad still works.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

import { createStore, type Store } from "./store";

export type DragSource =
  | { kind: "palette"; blockType: string }
  | { kind: "palette-row"; spans: number[]; label?: string }
  | { kind: "block"; blockId: string; columnId: string }
  | { kind: "row"; rowId: string };

export type DropTarget =
  | { kind: "column"; columnId: string; rowId: string }
  | { kind: "block"; blockId: string; columnId: string }
  | { kind: "row-slot"; index: number }
  | { kind: "row"; rowId: string; index: number };

export type Edge = "before" | "after" | "inside";

export interface DragIndicator {
  targetId: string;
  edge: Edge;
  /** Viewport-relative, for a floating indicator layer. */
  rect: { top: number; left: number; width: number; height: number };
  orientation: "horizontal" | "vertical";
}

export interface DragState {
  active: DragSource | null;
  /** Live pointer position, for the ghost. */
  pointer: { x: number; y: number } | null;
  over: DropTarget | null;
  indicator: DragIndicator | null;
  /** Set while a keyboard drag is in progress — views dim differently for it. */
  keyboard: boolean;
}

const IDLE: DragState = { active: null, pointer: null, over: null, indicator: null, keyboard: false };

export interface DropEvent {
  source: DragSource;
  target: DropTarget;
  edge: Edge;
}

export interface DragEngineOptions {
  /** Distance in px the pointer must travel before a drag begins. */
  activationDistance?: number;
  /** Delay before a touch drag starts, so a swipe still scrolls the page. */
  touchDelay?: number;
  onDrop: (event: DropEvent) => void;
  onDragStart?: (source: DragSource) => void;
  onDragEnd?: (dropped: boolean) => void;
}

interface Registration {
  element: HTMLElement;
  data: DropTarget;
  /** Vertical targets split before/after on the Y midpoint; horizontal ones on X. */
  orientation: "horizontal" | "vertical";
  /** A container accepts a drop anywhere inside it rather than splitting at a midpoint. */
  container: boolean;
  accepts?: (source: DragSource) => boolean;
}

export interface DragEngine {
  state: Store<DragState>;
  draggable(element: HTMLElement, data: DragSource, options?: DraggableOptions): () => void;
  droppable(element: HTMLElement, data: DropTarget, options?: DroppableOptions): () => void;
  /** Start a drag from the keyboard, with no pointer involved. */
  lift(source: DragSource): void;
  cancel(): void;
  destroy(): void;
}

export interface DraggableOptions {
  /** Only this child starts a drag. Without it, the whole element is a handle. */
  handle?: HTMLElement | null;
  disabled?: boolean;
}

export interface DroppableOptions {
  orientation?: "horizontal" | "vertical";
  container?: boolean;
  accepts?: (source: DragSource) => boolean;
}

/* The builder is mounted by Next and Nuxt, both of which evaluate components on the server.
   Nothing here needs the DOM until a drag actually starts, so every touch of it is guarded rather
   than the module refusing to load. */
const hasDom = () => typeof document !== "undefined";

const AUTOSCROLL_ZONE = 72;
const AUTOSCROLL_MAX = 18;

export function createDragEngine(options: DragEngineOptions): DragEngine {
  const state = createStore<DragState>(IDLE);
  const droppables = new Map<HTMLElement, Registration>();
  const activation = options.activationDistance ?? 4;
  const touchDelay = options.touchDelay ?? 180;

  let pending: { source: DragSource; x: number; y: number; pointerId: number; timer: number | null } | null = null;
  /* Draggables nest — a block inside a row that is draggable as a whole. One pointerdown bubbles
     through both, and the outer listener would overwrite `pending`, so grabbing a block would
     drag its row. The innermost draggable (the first to hear the event) claims it. */
  const claimed = new WeakSet<Event>();
  let dragging = false;
  let scrollFrame: number | null = null;
  let scrollTarget: Element | null = null;
  let scrollSpeed = 0;

  /* ────────────────────────────── Hit testing ────────────────────────────── */

  function hitTest(x: number, y: number): { registration: Registration; edge: Edge } | null {
    const source = state.get().active;
    if (!source || !hasDom()) return null;

    const stack = document.elementsFromPoint(x, y);
    for (const element of stack) {
      /* Walk up from each hit: the pointer is usually over a text node deep inside the
         registered element, not the element itself. */
      let node: Element | null = element;
      while (node) {
        const registration = droppables.get(node as HTMLElement);
        if (registration) {
          if (registration.accepts && !registration.accepts(source)) break;
          if (!isSelfDrop(source, registration.data)) {
            return { registration, edge: edgeFor(registration, x, y) };
          }
          break;
        }
        node = node.parentElement;
      }
    }
    return null;
  }

  /** A block cannot drop onto itself, and a row cannot drop into its own slot — both are no-ops
   *  that would otherwise light up the indicator and look like they did something. */
  function isSelfDrop(source: DragSource, target: DropTarget): boolean {
    if (source.kind === "block" && target.kind === "block") return source.blockId === target.blockId;
    if (source.kind === "row" && target.kind === "row") return source.rowId === target.rowId;
    return false;
  }

  function edgeFor(registration: Registration, x: number, y: number): Edge {
    if (registration.container) return "inside";
    const rect = registration.element.getBoundingClientRect();
    if (registration.orientation === "horizontal") {
      return x < rect.left + rect.width / 2 ? "before" : "after";
    }
    return y < rect.top + rect.height / 2 ? "before" : "after";
  }

  function indicatorFor(registration: Registration, edge: Edge): DragIndicator {
    const rect = registration.element.getBoundingClientRect();
    const id = targetId(registration.data);

    if (edge === "inside") {
      return {
        targetId: id,
        edge,
        orientation: registration.orientation,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      };
    }

    /* A 2px line drawn at the seam the block would land in — not a highlight of the neighbour,
       which leaves "above or below?" unanswered. */
    if (registration.orientation === "horizontal") {
      return {
        targetId: id,
        edge,
        orientation: "horizontal",
        rect: { top: rect.top, left: edge === "before" ? rect.left : rect.right, width: 0, height: rect.height },
      };
    }
    return {
      targetId: id,
      edge,
      orientation: "vertical",
      rect: { top: edge === "before" ? rect.top : rect.bottom, left: rect.left, width: rect.width, height: 0 },
    };
  }

  /* ────────────────────────────── Auto-scroll ──────────────────────────────
   *
   * Dragging to the bottom of a long email has to be possible without letting go. The scroller is
   * whichever ancestor of the pointer actually overflows.
   * ─────────────────────────────────────────────────────────────────────── */

  function scrollableAt(x: number, y: number): Element | null {
    if (!hasDom()) return null;
    let node: Element | null = document.elementFromPoint(x, y);
    while (node) {
      const style = getComputedStyle(node);
      const overflows = /(auto|scroll|overlay)/.test(style.overflowY);
      if (overflows && node.scrollHeight > node.clientHeight + 2) return node;
      node = node.parentElement;
    }
    return document.scrollingElement;
  }

  function updateAutoScroll(y: number, x: number) {
    scrollTarget = scrollableAt(x, y);
    if (!scrollTarget) {
      scrollSpeed = 0;
      return;
    }
    const rect =
      scrollTarget === document.scrollingElement
        ? { top: 0, bottom: window.innerHeight }
        : scrollTarget.getBoundingClientRect();

    const fromTop = y - rect.top;
    const fromBottom = rect.bottom - y;

    if (fromTop < AUTOSCROLL_ZONE) scrollSpeed = -ease(1 - fromTop / AUTOSCROLL_ZONE);
    else if (fromBottom < AUTOSCROLL_ZONE) scrollSpeed = ease(1 - fromBottom / AUTOSCROLL_ZONE);
    else scrollSpeed = 0;

    if (scrollSpeed !== 0 && scrollFrame === null) tickScroll();
  }

  const ease = (t: number) => Math.round(Math.max(0, Math.min(1, t)) ** 2 * AUTOSCROLL_MAX);

  function tickScroll() {
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      if (!dragging || !scrollTarget || scrollSpeed === 0) return;
      scrollTarget.scrollTop += scrollSpeed;
      /* Geometry moved under a stationary pointer — re-hit-test or the indicator lies. */
      const pointer = state.get().pointer;
      if (pointer) applyPointer(pointer.x, pointer.y, false);
      tickScroll();
    });
  }

  /* ────────────────────────────── Pointer lifecycle ────────────────────────────── */

  function applyPointer(x: number, y: number, scroll = true) {
    const hit = hitTest(x, y);
    state.set((current) => ({
      ...current,
      pointer: { x, y },
      over: hit?.registration.data ?? null,
      indicator: hit ? indicatorFor(hit.registration, hit.edge) : null,
    }));
    if (scroll) updateAutoScroll(y, x);
  }

  function begin(source: DragSource, keyboard = false) {
    dragging = true;
    state.set({ active: source, pointer: null, over: null, indicator: null, keyboard });
    if (hasDom()) document.body.classList.add("eb-dragging");
    options.onDragStart?.(source);
  }

  function finish(commit: boolean) {
    const { active, over, indicator } = state.get();
    const dropped = commit && !!active && !!over;
    if (dropped) options.onDrop({ source: active!, target: over!, edge: indicator?.edge ?? "inside" });

    dragging = false;
    scrollSpeed = 0;
    scrollTarget = null;
    if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
    scrollFrame = null;
    pending = null;
    state.set(IDLE);
    if (hasDom()) document.body.classList.remove("eb-dragging");
    options.onDragEnd?.(dropped);
  }

  /* ────────────────────────────── Public registration ────────────────────────────── */

  function draggable(element: HTMLElement, data: DragSource, draggableOptions: DraggableOptions = {}): () => void {
    const handle = draggableOptions.handle ?? element;

    const onPointerDown = (event: PointerEvent) => {
      if (draggableOptions.disabled) return;
      /* Left button / primary contact only. A right-click opening a context menu mid-drag is a
         broken state nothing recovers from cleanly. */
      if (event.button !== 0) return;
      /* `data-eb-no-drag` keeps toolbar buttons clickable inside a draggable block; an element
         marked `data-eb-drag-handle` (the toolbar's grip) opts back in. Without the opt-in, the
         grip — the one control whose job is dragging — could never start a drag. */
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-eb-no-drag]") && !target.closest("[data-eb-drag-handle]")) return;
      if (claimed.has(event)) return;
      claimed.add(event);

      pending = { source: data, x: event.clientX, y: event.clientY, pointerId: event.pointerId, timer: null };

      /* Touch waits: an immediate start would hijack every vertical swipe. Mouse does not. */
      if (event.pointerType === "touch") {
        pending.timer = window.setTimeout(() => {
          if (!pending) return;
          handle.setPointerCapture?.(event.pointerId);
          begin(data);
          applyPointer(pending.x, pending.y);
        }, touchDelay);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (draggableOptions.disabled) return;
      if (event.key !== " " && event.key !== "Enter") return;
      /* Only a key pressed on the handle itself starts a keyboard drag. When the whole block is the
         handle, keys typed into its inline-editable text bubble up here too — cancelling those ate
         every space and every Enter / Shift+Enter the author typed. */
      if (event.target !== handle) return;
      if (dragging) return;
      event.preventDefault();
      /* The same keypress bubbles on to the window listener, which reads Space/Enter as "drop" —
         claim it so the drag it just started isn't immediately finished. */
      claimed.add(event);
      begin(data, true);
    };

    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("keydown", onKeyDown);
    handle.setAttribute("draggable", "false");
    /* Without this a touch drag scrolls the page instead of moving the block. */
    handle.style.touchAction = "none";

    return () => {
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("keydown", onKeyDown);
    };
  }

  function droppable(element: HTMLElement, data: DropTarget, droppableOptions: DroppableOptions = {}): () => void {
    droppables.set(element, {
      element,
      data,
      orientation: droppableOptions.orientation ?? "vertical",
      container: droppableOptions.container ?? false,
      accepts: droppableOptions.accepts,
    });
    return () => void droppables.delete(element);
  }

  /* ────────────────────────────── Window listeners ────────────────────────────── */

  const onPointerMove = (event: PointerEvent) => {
    if (pending && !dragging) {
      const distance = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
      if (distance < activation) return;
      if (pending.timer !== null) {
        /* Moved before the touch delay elapsed — that is a scroll, not a drag. */
        clearTimeout(pending.timer);
        pending = null;
        return;
      }
      begin(pending.source);
    }
    if (!dragging) return;
    event.preventDefault();
    applyPointer(event.clientX, event.clientY);
  };

  const onPointerUp = () => {
    if (pending?.timer !== null && pending?.timer !== undefined) clearTimeout(pending.timer);
    if (!dragging) {
      pending = null;
      return;
    }
    if (state.get().keyboard) return;
    finish(true);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!dragging) return;
    if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
      return;
    }
    if (!state.get().keyboard) return;
    if (claimed.has(event)) return;

    /* Keyboard dragging walks the registered targets in document order. It is the only path that
       does not need a pointer, and the only one a screen-reader user has. */
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      step(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      finish(true);
    }
  };

  function step(direction: 1 | -1) {
    const source = state.get().active;
    if (!source) return;

    const candidates = [...droppables.values()]
      .filter((r) => !r.accepts || r.accepts(source))
      .filter((r) => !isSelfDrop(source, r.data))
      .filter((r) => r.element.isConnected)
      .sort((a, b) => {
        const ra = a.element.getBoundingClientRect();
        const rb = b.element.getBoundingClientRect();
        return ra.top - rb.top || ra.left - rb.left;
      });
    if (!candidates.length) return;

    const currentId = state.get().indicator?.targetId;
    const index = candidates.findIndex((r) => targetId(r.data) === currentId);
    const next = candidates[Math.max(0, Math.min(candidates.length - 1, index + direction))]!;
    const edge: Edge = next.container ? "inside" : "before";

    state.set((current) => ({ ...current, over: next.data, indicator: indicatorFor(next, edge) }));
    next.element.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  const onBlur = () => {
    if (dragging) finish(false);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onBlur);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
  }

  return {
    state,
    draggable,
    droppable,
    lift: (source) => begin(source, true),
    cancel: () => finish(false),
    destroy() {
      if (typeof window === "undefined") return;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onBlur);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      droppables.clear();
    },
  };
}

export function targetId(target: DropTarget): string {
  switch (target.kind) {
    case "column":
      return `column:${target.columnId}`;
    case "block":
      return `block:${target.blockId}`;
    case "row":
      return `row:${target.rowId}`;
    case "row-slot":
      return `row-slot:${target.index}`;
  }
}
