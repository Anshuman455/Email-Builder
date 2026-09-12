/* ══════════════════════════════ Undo / redo ══════════════════════════════
 *
 * `present` IS the document — there is no second source of truth to keep in step. Because
 * `operations.ts` clones only the path that changed, two neighbouring entries share almost all of
 * their structure, and a deep stack costs very little.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  limit: number;
  /** Set by `push` when it coalesced into the previous entry rather than adding one. */
  lastLabel?: string;
  lastAt: number;
}

export const DEFAULT_LIMIT = 100;

/** Consecutive edits with the same label inside this window collapse into one undo step — a colour
 *  slider dragged for three seconds is one undo, not ninety. */
export const COALESCE_MS = 600;

export function createHistory<T>(present: T, limit = DEFAULT_LIMIT): History<T> {
  return { past: [], present, future: [], limit, lastAt: 0 };
}

export interface PushOptions {
  /** Edits sharing a label coalesce. Distinct actions must use distinct labels. */
  label?: string;
  /** Replace `present` without touching the stack — used for remote/collaborative merges. */
  silent?: boolean;
  now?: number;
}

export function pushHistory<T>(history: History<T>, next: T, options: PushOptions = {}): History<T> {
  if (next === history.present) return history;
  const now = options.now ?? Date.now();

  if (options.silent) return { ...history, present: next, lastAt: now };

  const coalesce =
    !!options.label &&
    options.label === history.lastLabel &&
    now - history.lastAt < COALESCE_MS &&
    history.past.length > 0;

  if (coalesce) {
    return { ...history, present: next, future: [], lastLabel: options.label, lastAt: now };
  }

  const past = [...history.past, history.present];
  if (past.length > history.limit) past.splice(0, past.length - history.limit);
  return { ...history, past, present: next, future: [], lastLabel: options.label, lastAt: now };
}

export function undo<T>(history: History<T>): History<T> {
  if (!history.past.length) return history;
  const past = history.past.slice();
  const present = past.pop()!;
  return { ...history, past, present, future: [history.present, ...history.future], lastLabel: undefined, lastAt: 0 };
}

export function redo<T>(history: History<T>): History<T> {
  if (!history.future.length) return history;
  const future = history.future.slice();
  const present = future.shift()!;
  return { ...history, past: [...history.past, history.present], present, future, lastLabel: undefined, lastAt: 0 };
}

export const canUndo = <T,>(history: History<T>) => history.past.length > 0;
export const canRedo = <T,>(history: History<T>) => history.future.length > 0;
