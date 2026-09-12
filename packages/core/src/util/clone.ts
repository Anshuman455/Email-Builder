/** Deep clone for plain-JSON documents. `structuredClone` where available, JSON otherwise. */
export function clone<T>(value: T): T {
  const sc = (globalThis as any).structuredClone;
  if (typeof sc === "function") {
    try {
      return sc(value);
    } catch {
      /* Functions in host `meta` — fall through. */
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Shallow merge that treats `undefined` as "leave alone" rather than "clear". */
export function patch<T extends object>(base: T, changes: Partial<T>): T {
  const next = { ...base } as T;
  for (const key of Object.keys(changes) as (keyof T)[]) {
    const value = changes[key];
    if (value !== undefined) (next as any)[key] = value;
  }
  return next;
}
