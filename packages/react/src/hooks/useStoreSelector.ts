/* ═══ Store subscription ═══
 *
 * `useSyncExternalStore` demands a snapshot that is referentially stable between store writes.
 * A selector that derives an object would return a fresh one on every read and spin React
 * forever, so the selected value is memoised per store state and compared before it is replaced.
 * This is why the package needs no `use-sync-external-store` dependency. */

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Store } from "@email-builder/engine";

interface Cache<T, S> {
  state: T;
  value: S;
}

export function useStoreSelector<T, S>(
  store: Store<T>,
  selector: (state: T) => S,
  isEqual: (a: S, b: S) => boolean = Object.is,
): S {
  /* Held in refs, not in the `getSnapshot` closure: an inline arrow selector would otherwise
     change identity every render and force a resubscribe on each one. */
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const equalRef = useRef(isEqual);
  equalRef.current = isEqual;

  const cache = useRef<Cache<T, S> | null>(null);

  const getSnapshot = useCallback(() => {
    const state = store.get();
    const previous = cache.current;
    if (previous && previous.state === state) return previous.value;
    const next = selectorRef.current(state);
    if (previous && equalRef.current(previous.value, next)) {
      cache.current = { state, value: previous.value };
      return previous.value;
    }
    cache.current = { state, value: next };
    return next;
  }, [store]);

  const subscribe = useCallback((onChange: () => void) => store.subscribe(onChange), [store]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Shallow array comparison, for selectors that project a list of ids. */
export function shallowArrayEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (!Object.is(a[i], b[i])) return false;
  return true;
}
