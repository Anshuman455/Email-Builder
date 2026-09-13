/* ═══ Rich-text control ═══
 *
 * `contenteditable` must stay uncontrolled: writing `innerHTML` on every keystroke moves the
 * caret to the end. The DOM is only synced when the incoming value differs from what is already
 * rendered — which happens on undo, on a merge-token insert, or when the selection changes. */

import { useEffect, useRef } from "react";
import { asString } from "../../types";
import { sanitizeHtml } from "@email-builder/core";

export interface RichTextControlProps {
  value: unknown;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}

export function RichTextControl({ value, onChange, placeholder, label }: RichTextControlProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const html = asString(value);

  useEffect(() => {
    const node = ref.current;
    /* The value comes from a stored document — clean it before it becomes live DOM. */
    const clean = sanitizeHtml(html);
    if (!node || node.innerHTML === clean) return;
    node.innerHTML = clean;
  }, [html]);

  return (
    <div
      ref={ref}
      className="eb-textarea"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={label}
      data-placeholder={placeholder}
      onBlur={(event) => onChange(event.currentTarget.innerHTML)}
      onKeyDown={(event) => {
        /* Escape commits and gets out; the canvas keyboard map must not see it either. */
        if (event.key === "Escape") {
          event.stopPropagation();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
