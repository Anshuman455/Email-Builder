/* ═══ Pointer & clipboard interactions ═══
 *
 * The small bits of DOM glue both view layers need for multi-selection and copy/paste, kept here so
 * React and Vue behave identically. */

import type { Editor, SelectableTarget } from "./editor";

/** Selects `target` the way a click should: ⌘/Ctrl adds or removes it, Shift selects a range, a
 *  plain click selects just it. Returns true when a modifier was used — the caller then skips its
 *  plain-click behaviour (like starting inline editing). */
export function selectFromClick(editor: Editor, event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }, target: SelectableTarget): boolean {
  if (event.shiftKey) {
    editor.selectRange(target);
    return true;
  }
  if (event.metaKey || event.ctrlKey) {
    editor.toggleSelection(target);
    return true;
  }
  editor.select(target);
  return false;
}

/** Focus is in something the user types into — its clipboard belongs to the text, not the editor. */
export function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || !element.tagName) return false;
  return element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

function hasTextSelection(): boolean {
  return typeof window !== "undefined" && !!window.getSelection?.()?.toString();
}

/** `copy` / `cut` on the editor root: put the selected blocks or rows on the clipboard. */
export function handleEditorCopy(editor: Editor, event: ClipboardEvent, cut = false): void {
  if (isEditableTarget(event.target) || hasTextSelection()) return;
  const payload = editor.copySelection();
  if (!payload || !event.clipboardData) return;
  event.preventDefault();
  event.clipboardData.setData("text/plain", payload);
  if (cut) editor.removeSelected();
}

/** `paste` on the editor root: blocks or rows copied from any email, or HTML from elsewhere. */
export function handleEditorPaste(editor: Editor, event: ClipboardEvent): void {
  if (isEditableTarget(event.target) || !event.clipboardData) return;
  const text = event.clipboardData.getData("text/plain");
  const html = event.clipboardData.getData("text/html");
  if (editor.paste(text, html)) event.preventDefault();
}
