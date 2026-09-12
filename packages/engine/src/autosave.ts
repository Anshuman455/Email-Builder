/* ══════════════════════════════ Autosave ══════════════════════════════
 *
 * A debounce with a ceiling.
 *
 * The debounce alone is wrong for an editor: someone dragging a padding slider for two minutes is
 * continuously "still editing", so a pure debounce writes nothing for two minutes. The ceiling is
 * the guarantee that unsaved work is never older than `maxWaitMs` no matter how continuous the
 * editing is.
 *
 * The debounce alone is also wrong in the other direction if it is too short: a save round-trips
 * in about a second, so a 2s debounce leaves the status pill cycling "Unsaved → Saving… → Saved"
 * for a third of every editing minute. Five seconds is roughly one save per natural pause.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export interface AutosaveOptions<T> {
  /** Quiet period after the last edit. */
  debounceMs?: number;
  /** Hard ceiling on the age of unsaved work. */
  maxWaitMs?: number;
  save: (value: T) => Promise<void> | void;
  onStatus?: (status: SaveStatus, error?: unknown) => void;
  /** Off by default — a host that saves manually still wants the dirty flag. */
  enabled?: boolean;
}

export interface Autosave<T> {
  /** Call on every change. Starts or extends the debounce. */
  touch(value: T): void;
  /** Write now, cancelling any pending timer. Resolves when the write settles. */
  flush(): Promise<void>;
  /** Forget pending work — the document was replaced from outside. */
  reset(value: T): void;
  cancel(): void;
  status(): SaveStatus;
  isDirty(): boolean;
  destroy(): void;
}

export const DEFAULT_DEBOUNCE_MS = 5_000;
export const DEFAULT_MAX_WAIT_MS = 20_000;

export function createAutosave<T>(options: AutosaveOptions<T>): Autosave<T> {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | null = null;
  let savedValue: T | null = null;
  let dirtySince = 0;
  let status: SaveStatus = "idle";
  /* One write at a time. Two overlapping saves can land out of order, and the loser silently
     overwrites newer work with older. */
  let inFlight = false;
  let destroyed = false;

  const setStatus = (next: SaveStatus, error?: unknown) => {
    if (status === next && next !== "error") return;
    status = next;
    options.onStatus?.(next, error);
  };

  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  async function write(): Promise<void> {
    if (destroyed || inFlight || pending === null) return;
    const value = pending;
    pending = null;
    inFlight = true;
    setStatus("saving");

    try {
      await options.save(value);
      savedValue = value;
      dirtySince = 0;
      /* Another edit arrived while the write was in flight — go straight back to dirty rather
         than flashing "Saved" for work that is already stale. */
      setStatus(pending !== null ? "dirty" : "saved");
    } catch (error) {
      /* Put the value back so the next attempt still has it. A failed save must not lose work. */
      if (pending === null) pending = value;
      setStatus("error", error);
    } finally {
      inFlight = false;
      if (pending !== null && !destroyed) schedule();
    }
  }

  function schedule() {
    clear();
    const age = dirtySince ? Date.now() - dirtySince : 0;
    /* The ceiling wins whenever it is closer than the debounce. */
    const delay = Math.max(0, Math.min(debounceMs, maxWaitMs - age));
    timer = setTimeout(() => void write(), delay);
  }

  return {
    touch(value) {
      if (destroyed) return;
      if (value === savedValue) return;
      pending = value;
      if (!dirtySince) dirtySince = Date.now();
      setStatus(inFlight ? "saving" : "dirty");
      if (options.enabled === false) return;
      schedule();
    },

    async flush() {
      if (destroyed) return;
      clear();
      if (inFlight) {
        /* Wait out the current write, then take the newer value with it. */
        while (inFlight) await new Promise((resolve) => setTimeout(resolve, 30));
      }
      await write();
    },

    reset(value) {
      clear();
      pending = null;
      savedValue = value;
      dirtySince = 0;
      setStatus("idle");
    },

    cancel() {
      clear();
      pending = null;
      dirtySince = 0;
      setStatus(savedValue === null ? "idle" : "saved");
    },

    status: () => status,
    isDirty: () => pending !== null,

    destroy() {
      destroyed = true;
      clear();
    },
  };
}
