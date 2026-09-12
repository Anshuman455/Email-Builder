/* ══════════════════════════════ Store ══════════════════════════════
 *
 * A ~40-line observable. Not a dependency, because the contract both frameworks need is exactly
 * this: read a snapshot, subscribe, get told when it changed.
 *
 * The snapshot is replaced wholesale on every change, so `useSyncExternalStore` and Vue's
 * `shallowRef` both detect it by identity and neither needs a proxy.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

export type Listener<T> = (state: T, previous: T) => void;

export interface Store<T> {
  get(): T;
  set(next: T | ((current: T) => T)): void;
  subscribe(listener: Listener<T>): () => void;
  /** Fires listeners without changing state — for imperative signals like "scroll to this". */
  notify(): void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener<T>>();

  const emit = (previous: T) => {
    /* Copy before iterating: a listener that unsubscribes during the loop is normal (a component
       unmounting in response to the very change being announced). */
    for (const listener of [...listeners]) listener(state, previous);
  };

  return {
    get: () => state,
    set(next) {
      const value = typeof next === "function" ? (next as (c: T) => T)(state) : next;
      if (value === state) return;
      const previous = state;
      state = value;
      emit(previous);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify() {
      emit(state);
    },
  };
}

/* ────────────────────────────── Selectors ──────────────────────────────
 *
 * A view that re-renders on every keystroke anywhere in the document is the default failure mode
 * of a single-store editor. `select` narrows a subscription to one derived value and only fires
 * when that value changes by identity.
 * ─────────────────────────────────────────────────────────────────────── */

export function select<T, S>(store: Store<T>, selector: (state: T) => S, listener: (value: S) => void): () => void {
  let current = selector(store.get());
  return store.subscribe((state) => {
    const next = selector(state);
    if (next === current) return;
    current = next;
    listener(next);
  });
}

/* ────────────────────────────── Emitter ────────────────────────────── */

export type EventMap = Record<string, any>;

export interface Emitter<E extends EventMap> {
  on<K extends keyof E>(event: K, handler: (payload: E[K]) => void): () => void;
  once<K extends keyof E>(event: K, handler: (payload: E[K]) => void): () => void;
  emit<K extends keyof E>(event: K, payload: E[K]): void;
  clear(): void;
}

export function createEmitter<E extends EventMap>(): Emitter<E> {
  const handlers = new Map<keyof E, Set<(payload: any) => void>>();

  const off = (event: keyof E, handler: (payload: any) => void) => {
    handlers.get(event)?.delete(handler);
  };

  return {
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler as any);
      return () => off(event, handler as any);
    },
    once(event, handler) {
      const wrapped = (payload: any) => {
        off(event, wrapped);
        (handler as any)(payload);
      };
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(wrapped);
      return () => off(event, wrapped);
    },
    emit(event, payload) {
      for (const handler of [...(handlers.get(event) ?? [])]) {
        try {
          handler(payload);
        } catch (error) {
          /* A host listener that throws must not break the editor's own flow. */
          if (typeof console !== "undefined") console.error(`[email-builder] listener for "${String(event)}" threw`, error);
        }
      }
    },
    clear() {
      handlers.clear();
    },
  };
}
