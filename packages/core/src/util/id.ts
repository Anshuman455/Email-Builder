/* Stable, collision-resistant ids that work in Node and the browser without a polyfill. */

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  const c: Crypto | undefined = (globalThis as any).crypto;
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < length; i += 1) out[i] = Math.floor(Math.random() * 256);
  return out;
}

/** `blk_k3f9a2x1` — prefixed so a stray id in a log says what it belongs to. */
export function createId(prefix: string): string {
  const bytes = randomBytes(9);
  let id = "";
  for (let i = 0; i < bytes.length; i += 1) id += ALPHABET[bytes[i]! % ALPHABET.length];
  return `${prefix}_${id}`;
}

export const rowId = () => createId("row");
export const colId = () => createId("col");
export const blockId = () => createId("blk");
