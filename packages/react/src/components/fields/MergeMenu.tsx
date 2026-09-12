/* ═══ Merge-field picker ═══
 *
 * Portalled to the body and positioned from the trigger's own rect: below 1100px the inspector is
 * a `translateX`-animated sheet, and a transformed ancestor turns `position: fixed` into
 * something relative to that ancestor. */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEditor, useTranslator } from "../../context";
import { MergeIcon } from "../../icons";
import { Portal } from "../Portal";

type TextControl = HTMLInputElement | HTMLTextAreaElement;

export interface MergeTriggerProps {
  /** The control the token is inserted into. */
  control: { current: TextControl | HTMLElement | null };
  value: string;
  onChange: (next: string) => void;
}

export function MergeTrigger({ control, value, onChange }: MergeTriggerProps) {
  const editor = useEditor();
  const t = useTranslator();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  /* Captured on open: focusing the search box destroys the caret we are meant to insert at. */
  const caret = useRef<number | null>(null);

  const openMenu = useCallback(() => {
    const node = control.current;
    caret.current = isTextControl(node) ? node.selectionStart : null;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.bottom + 6, left: rect.right - 268 });
    setSearch("");
    setOpen(true);
  }, [control]);

  const insert = useCallback(
    (token: string) => {
      const formatted = editor.merge?.format(token) ?? token;
      const at = caret.current;
      const next =
        at === null ? `${value}${formatted}` : `${value.slice(0, at)}${formatted}${value.slice(at)}`;
      onChange(next);
      setOpen(false);
      const node = control.current;
      if (isTextControl(node)) {
        const position = (at ?? value.length) + formatted.length;
        requestAnimationFrame(() => {
          node.focus();
          node.setSelectionRange(position, position);
        });
      }
    },
    [control, editor.merge, onChange, value],
  );

  if (!editor.merge) return null;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="eb-merge__trigger"
        /* The label element around it would steal the click and focus the input instead. */
        onMouseDown={(event) => event.preventDefault()}
        onClick={openMenu}
        aria-label={t("field.insertField")}
        aria-expanded={open}
      >
        <MergeIcon />
        {t("field.insertField")}
      </button>
      {open && anchor ? (
        <MergeMenu
          anchor={anchor}
          search={search}
          onSearch={setSearch}
          onPick={insert}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

interface MergeMenuProps {
  anchor: { top: number; left: number };
  search: string;
  onSearch: (value: string) => void;
  onPick: (token: string) => void;
  onClose: () => void;
}

function MergeMenu({ anchor, search, onSearch, onPick, onClose }: MergeMenuProps) {
  const editor = useEditor();
  const t = useTranslator();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(anchor);

  /* Nudged back inside the viewport once it has a measured height — a menu opened from a field
     near the bottom of the inspector would otherwise hang off the screen. */
  useLayoutEffect(() => {
    const node = menuRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const top = Math.min(anchor.top, Math.max(8, window.innerHeight - rect.height - 8));
    const left = Math.min(Math.max(8, anchor.left), Math.max(8, window.innerWidth - rect.width - 8));
    setPosition({ top, left });
  }, [anchor]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onClose]);

  const needle = search.trim().toLowerCase();
  const groups = (editor.merge?.groups() ?? [])
    .map((group) => ({
      group: group.group,
      fields: group.fields.filter(
        (entry) =>
          !needle ||
          entry.label.toLowerCase().includes(needle) ||
          entry.token.toLowerCase().includes(needle),
      ),
    }))
    .filter((group) => group.fields.length > 0);

  return (
    <Portal>
      <div
        ref={menuRef}
        className="eb-merge__menu"
        style={{ top: position.top, left: position.left }}
        role="dialog"
        aria-label={t("field.insertField")}
      >
        <div className="eb-merge__search">
          <input
            className="eb-input"
            autoFocus
            value={search}
            placeholder={t("field.searchRecords")}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
        <div className="eb-merge__list">
          {groups.length === 0 ? (
            <div className="eb-merge__empty">{t("field.noRecords")}</div>
          ) : (
            groups.map((group) => (
              <div key={group.group}>
                <div className="eb-merge__group-title">{group.group}</div>
                {group.fields.map((entry) => (
                  <button
                    key={entry.token}
                    type="button"
                    className="eb-merge__option"
                    onClick={() => onPick(entry.token)}
                  >
                    <span className="eb-merge__option-label">{entry.label}</span>
                    <span className="eb-merge__option-token">
                      {editor.merge?.format(entry.token) ?? entry.token}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </Portal>
  );
}

function isTextControl(node: unknown): node is TextControl {
  return node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement;
}
