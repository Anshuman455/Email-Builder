/* ═══ Small shared helpers ═══ */

let counter = 0;

/** Monotonic id for label/control pairing. Module-scoped so two panels cannot collide. */
export const nextId = (): string => `${(counter += 1).toString(36)}`;

/** Keyboard events that belong to whatever has focus, not to the editor's shortcuts. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || !element.tagName) return false;
  if (element.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}
