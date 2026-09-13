/* ═══ RichTextToolbar ═══
 *
 * Floating formatting bar shown above a block while its rich-text field is edited inline. All
 * formatting logic lives in @email-builder/engine (shared with Vue); this is the view.
 *
 * Buttons use `onMouseDown={preventDefault}` so clicking them never takes focus from the text —
 * losing focus is what ends inline editing and saves the block. The link box and colour picker do
 * need focus, so the block's blur handler ignores focus moving into `.eb-rte`, and this toolbar
 * hands focus back (and so saves) when the author leaves it for somewhere else. */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import {
  readRichTextState,
  removeLink,
  restoreSelection,
  runRichTextCommand,
  selectionIn,
  setLink,
  setTextColor,
  type RichTextCommand,
  type RichTextState,
} from "@email-builder/engine";
import { useTranslator } from "../context";
import { Glyph } from "./Glyph";

const FORMAT: Array<{ command: RichTextCommand; icon: string; label: string; shortcut?: string }> = [
  { command: "bold", icon: "format_bold", label: "rte.bold", shortcut: "⌘B" },
  { command: "italic", icon: "format_italic", label: "rte.italic", shortcut: "⌘I" },
  { command: "underline", icon: "format_underlined", label: "rte.underline", shortcut: "⌘U" },
  { command: "strikeThrough", icon: "strikethrough_s", label: "rte.strike" },
];

const LISTS: Array<{ command: RichTextCommand; icon: string; label: string }> = [
  { command: "insertUnorderedList", icon: "format_list_bulleted", label: "rte.bulletList" },
  { command: "insertOrderedList", icon: "format_list_numbered", label: "rte.numberList" },
];

const keepFocus = (event: MouseEvent) => event.preventDefault();

export interface RichTextToolbarProps {
  /** The block's rendered element; the editable text is the `[data-eb-inline]` inside it. */
  host: { current: HTMLElement | null };
}

export function RichTextToolbar({ host }: RichTextToolbarProps) {
  const t = useTranslator();
  const root = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  const [state, setState] = useState<RichTextState | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [below, setBelow] = useState(false);

  const target = useCallback(() => host.current?.querySelector<HTMLElement>("[data-eb-inline]") ?? null, [host]);

  const refresh = useCallback(() => {
    const element = target();
    if (element) setState(readRichTextState(element));
  }, [target]);

  const openLink = useCallback(() => {
    const element = target();
    if (!element) return;
    saved.current = selectionIn(element);
    setLinkValue(readRichTextState(element).link ?? "");
    setLinkInvalid(false);
    setLinkOpen(true);
  }, [target]);

  useEffect(() => {
    const frame = requestAnimationFrame(refresh);
    document.addEventListener("selectionchange", refresh);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", refresh);
    };
  }, [refresh]);

  /* ⌘K / Ctrl+K opens the link box. Listened for on the block, which exists before the editable
     element inside it is marked. */
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openLink();
      }
    };
    element.addEventListener("keydown", onKeyDown);
    return () => element.removeEventListener("keydown", onKeyDown);
  }, [host, openLink]);

  /* Blocks at the very top of the canvas show the bar underneath, so it isn't cut off. */
  useLayoutEffect(() => {
    const block = root.current?.parentElement;
    const scroller = root.current?.closest(".builder-canvas__scroll");
    if (block && scroller) setBelow(block.getBoundingClientRect().top - scroller.getBoundingClientRect().top < 56);
  }, []);

  const run = (command: RichTextCommand) => {
    const element = target();
    if (!element) return;
    runRichTextCommand(element, command);
    refresh();
  };

  const closeLink = () => {
    const element = target();
    setLinkOpen(false);
    if (element) restoreSelection(element, saved.current);
  };

  const applyLink = () => {
    const element = target();
    if (!element) return;
    if (!setLink(element, linkValue, saved.current)) {
      setLinkInvalid(true);
      return;
    }
    setLinkOpen(false);
    refresh();
  };

  const unlink = () => {
    const element = target();
    if (!element) return;
    removeLink(element, saved.current);
    setLinkOpen(false);
    refresh();
  };

  /* Focus left the toolbar for somewhere other than the text: end the edit the normal way. */
  const onBlur = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    const element = target();
    if (!element || (next && (root.current?.contains(next) || element.contains(next)))) return;
    element.focus();
    element.blur();
  };

  return (
    <div
      ref={root}
      className={`eb-rte${below ? " eb-rte--below" : ""}`}
      role="toolbar"
      aria-label={t("rte.toolbar")}
      data-eb-no-drag
      onClick={(event) => event.stopPropagation()}
      onBlur={onBlur}
    >
      {linkOpen ? (
        <div className="eb-rte__link">
          <input
            autoFocus
            type="text"
            value={linkValue}
            placeholder={t("rte.linkPlaceholder")}
            aria-label={t("rte.link")}
            aria-invalid={linkInvalid}
            title={linkInvalid ? t("rte.invalidLink") : undefined}
            onChange={(event) => {
              setLinkValue(event.target.value);
              setLinkInvalid(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                closeLink();
              }
            }}
          />
          <button type="button" className="eb-rte__apply" onMouseDown={keepFocus} onClick={applyLink}>
            {t("rte.apply")}
          </button>
          {state?.link && (
            <button type="button" className="eb-rte__btn" title={t("rte.unlink")} aria-label={t("rte.unlink")} onMouseDown={keepFocus} onClick={unlink}>
              <Glyph name="link_off" />
            </button>
          )}
          <button type="button" className="eb-rte__btn" title={t("toolbar.close")} aria-label={t("toolbar.close")} onMouseDown={keepFocus} onClick={closeLink}>
            <Glyph name="close" />
          </button>
        </div>
      ) : (
        <>
          {FORMAT.map((item) => (
            <button
              key={item.command}
              type="button"
              className={`eb-rte__btn${state?.[item.command as keyof RichTextState] ? " eb-rte__btn--active" : ""}`}
              title={item.shortcut ? `${t(item.label)} (${item.shortcut})` : t(item.label)}
              aria-label={t(item.label)}
              aria-pressed={!!state?.[item.command as keyof RichTextState]}
              onMouseDown={keepFocus}
              onClick={() => run(item.command)}
            >
              <Glyph name={item.icon} />
            </button>
          ))}
          <span className="eb-rte__sep" aria-hidden="true" />
          {LISTS.map((item) => (
            <button
              key={item.command}
              type="button"
              className={`eb-rte__btn${state?.[item.command as keyof RichTextState] ? " eb-rte__btn--active" : ""}`}
              title={t(item.label)}
              aria-label={t(item.label)}
              aria-pressed={!!state?.[item.command as keyof RichTextState]}
              onMouseDown={keepFocus}
              onClick={() => run(item.command)}
            >
              <Glyph name={item.icon} />
            </button>
          ))}
          <span className="eb-rte__sep" aria-hidden="true" />
          <button
            type="button"
            className={`eb-rte__btn${state?.link ? " eb-rte__btn--active" : ""}`}
            title={`${t("rte.link")} (⌘K)`}
            aria-label={t("rte.link")}
            aria-pressed={!!state?.link}
            onMouseDown={keepFocus}
            onClick={openLink}
          >
            <Glyph name="link" />
          </button>
          <label
            className="eb-rte__btn"
            title={t("rte.color")}
            onMouseDown={() => {
              const element = target();
              if (element) saved.current = selectionIn(element);
            }}
          >
            <Glyph name="format_color_text" />
            <input
              type="color"
              aria-label={t("rte.color")}
              onChange={(event) => {
                const element = target();
                if (element) saved.current = setTextColor(element, event.target.value, saved.current);
              }}
            />
          </label>
          <button type="button" className="eb-rte__btn" title={t("rte.clear")} aria-label={t("rte.clear")} onMouseDown={keepFocus} onClick={() => run("removeFormat")}>
            <Glyph name="format_clear" />
          </button>
        </>
      )}
    </div>
  );
}
