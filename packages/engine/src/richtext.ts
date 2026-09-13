/* ═══ Rich text ═══
 *
 * The formatting behind the canvas's text toolbar, shared by React and Vue: bold, italic,
 * underline, strikethrough, lists, links and text colour on the current selection inside an
 * inline-editable element.
 *
 * Built on the browser's own editing commands (`execCommand`), which every browser still ships
 * for contenteditable and which produce the simple inline tags email clients understand. Colour
 * is the exception: it wraps the selection in a styled <span> directly, because re-focusing the
 * text to run a command would close the colour picker after the first change. */

export type RichTextCommand =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "removeFormat";

export interface RichTextState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  insertUnorderedList: boolean;
  insertOrderedList: boolean;
  /** `href` of the link at the cursor, or null. */
  link: string | null;
}

const STATE_COMMANDS = ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList"] as const;

const EMPTY_STATE: RichTextState = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  link: null,
};

interface SchemaLike {
  schema?: ReadonlyArray<{ target?: string; fields: ReadonlyArray<{ kind: string; key: string }> }>;
}

/** Whether a block's inline-editable key holds rich text. Plain-text fields (headings, button
 *  labels) are stored as text, so formatting them would be silently thrown away. */
export function isRichTextField(definition: SchemaLike | null | undefined, key: string | undefined): boolean {
  if (!definition?.schema || !key) return false;
  return definition.schema.some(
    (group) => (!group.target || group.target === "content") && group.fields.some((field) => field.key === key && field.kind === "richtext"),
  );
}

/** A link destination the email may carry: web, mailto:, tel:, or a merge tag. A bare domain gets
 *  `https://`. Anything else — `javascript:`, relative paths — is refused. */
export function safeLinkHref(value: string): string | null {
  const href = value.trim();
  if (!href) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) return href;
  if (/^(\{\{[^{}]+\}\}|\*\|[^|]+\|\*|\{![^{}]+\})$/.test(href)) return href;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(href)) return `https://${href}`;
  return null;
}

/** The current selection, if it lies inside `host`. */
export function selectionIn(host: HTMLElement): Range | null {
  const selection = host.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  return host.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
}

/** Put focus and the given selection back into `host` — after a toolbar input took focus. */
export function restoreSelection(host: HTMLElement, range?: Range | null): void {
  host.focus();
  if (!range) return;
  const selection = host.ownerDocument.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

export function runRichTextCommand(host: HTMLElement, command: RichTextCommand, range?: Range | null): void {
  restoreSelection(host, range);
  exec(host, command);
}

export function readRichTextState(host: HTMLElement): RichTextState {
  const range = selectionIn(host);
  if (!range) return { ...EMPTY_STATE };
  const state = { ...EMPTY_STATE };
  for (const command of STATE_COMMANDS) {
    try {
      state[command] = host.ownerDocument.queryCommandState(command);
    } catch {
      state[command] = false;
    }
  }
  state.link = linkAt(host, range)?.getAttribute("href") ?? null;
  return state;
}

/** Link the selection, update the link at the cursor, or — with nothing selected — insert the
 *  address as linked text. Returns false when the destination is not allowed. */
export function setLink(host: HTMLElement, value: string, range?: Range | null): boolean {
  const href = safeLinkHref(value);
  if (!href) return false;
  restoreSelection(host, range);
  const active = selectionIn(host);
  const existing = active ? linkAt(host, active) : null;
  if (existing && active?.collapsed) {
    existing.setAttribute("href", href);
    notifyInput(host);
    return true;
  }
  if (!active || active.collapsed) {
    exec(host, "insertHTML", `<a href="${escapeAttribute(href)}">${escapeText(href)}</a>`);
    return true;
  }
  exec(host, "createLink", href);
  return true;
}

export function removeLink(host: HTMLElement, range?: Range | null): void {
  restoreSelection(host, range);
  const active = selectionIn(host);
  const existing = active ? linkAt(host, active) : null;
  if (existing && active?.collapsed) {
    const whole = host.ownerDocument.createRange();
    whole.selectNodeContents(existing);
    const selection = host.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(whole);
  }
  exec(host, "unlink");
}

/** Colour the selected text. Works without focus, so a colour picker can stay open while the
 *  author tries values. Returns the range covering the coloured text, for the next change. */
export function setTextColor(host: HTMLElement, color: string, range?: Range | null): Range | null {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return range ?? null;
  const target = range && host.contains(range.commonAncestorContainer) ? range : selectionIn(host);
  if (!target || target.collapsed) return target ?? null;

  const doc = host.ownerDocument;
  /* Re-colouring the same text again (dragging through the picker) updates its span instead of
     nesting a new one. The range may sit on the span itself or on the text node inside it. */
  const container = target.commonAncestorContainer;
  const owner = container.nodeType === 1 ? (container as HTMLElement) : container.parentElement;
  if (owner && owner !== host && owner.tagName === "SPAN" && target.toString() === (owner.textContent ?? "")) {
    owner.style.color = color;
    notifyInput(host);
    return target;
  }
  const span = doc.createElement("span");
  span.style.color = color;
  span.appendChild(target.extractContents());
  target.insertNode(span);
  const covered = doc.createRange();
  covered.selectNodeContents(span);
  notifyInput(host);
  return covered;
}

/* ── Helpers ── */

function exec(host: HTMLElement, command: string, value?: string): boolean {
  try {
    return host.ownerDocument.execCommand(command, false, value);
  } catch {
    return false;
  }
}

function linkAt(host: HTMLElement, range: Range): HTMLAnchorElement | null {
  for (let node: Node | null = range.startContainer; node && node !== host; node = node.parentNode) {
    if (node.nodeType === 1 && (node as Element).tagName === "A") return node as HTMLAnchorElement;
  }
  return null;
}

/** DOM edits made without execCommand don't fire `input`; the editor's listeners rely on it. */
function notifyInput(host: HTMLElement): void {
  host.dispatchEvent(new Event("input", { bubbles: true }));
}

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(text: string): string {
  return escapeText(text).replace(/"/g, "&quot;");
}
