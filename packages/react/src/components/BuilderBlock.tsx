/* ═══ BuilderBlock ═══
 *
 * A block on the canvas matching Growtality:
 * Floating action bar:
 *  - Label: Image, Heading, etc.
 *  - drag_indicator
 *  - arrow_upward
 *  - arrow_downward
 *  - content_copy
 *  - delete
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Block, Column, Row } from "@email-builder/core";
import type { Editor } from "@email-builder/engine";
import { useEditor, useTranslator } from "../context";
import { useDraggable, useDroppable } from "../hooks/useDnd";
import { useEditorSelector } from "../hooks/useEditorState";
import { compileBlockPreview } from "../preview";

export interface BuilderBlockProps {
  block: Block;
  row: Row;
  column: Column;
  columnIndex: number;
}

export function BuilderBlock({ block, row, column, columnIndex }: BuilderBlockProps) {
  const editor = useEditor();
  const t = useTranslator();
  const definition = editor.blocks.get(block.type);

  const selected = useEditorSelector(
    (state) => state.selection?.kind === "block" && state.selection.id === block.id,
  );
  const landed = useEditorSelector((state) => state.landedId === block.id);
  const editing = useEditorSelector((state) => state.editingBlockId === block.id);
  const settings = useEditorSelector((state) => state.document.settings);

  const blockIndex = column.blocks.findIndex((b) => b.id === block.id);
  const totalBlocks = column.blocks.length;

  const moveBlock = (dir: number) => {
    const target = blockIndex + dir;
    if (target >= 0 && target < totalBlocks) {
      editor.moveBlock(block.id, column.id, target);
    }
  };

  const drop = useDroppable(
    { kind: "block", blockId: block.id, columnId: column.id },
    { orientation: "vertical" },
  );
  const drag = useDraggable({ kind: "block", blockId: block.id, columnId: column.id });

  const setNode = useCallback(
    (element: HTMLDivElement | null) => {
      drop.setNode(element);
      drag.setNode(element);
    },
    [drop.setNode, drag.setNode],
  );

  const html = useMemo(
    () => compileBlockPreview({ editor, block, row, columnIndex }),
    [editor, block, row, columnIndex, settings],
  );

  const render = useRef<HTMLDivElement | null>(null);
  useInlineEdit({ editor, block, editing, inlineEditKey: definition?.inlineEditKey, host: render });

  const classes = [
    "builder-block",
    "eb-block",
    selected ? "builder-block--selected eb-block--selected" : "",
    landed ? "builder-block--landed eb-block--landed" : "",
    editing ? "builder-block--editing eb-block--editing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={setNode}
      className={classes}
      aria-selected={selected}
      onClick={(event) => {
        event.stopPropagation();
        editor.select({ kind: "block", id: block.id });
      }}
      onDoubleClick={() => {
        if (definition?.inlineEditKey) editor.beginInlineEdit(block.id);
      }}
    >
      {/* Floating Toolbar */}
      <div className="builder-block__toolbar eb-block__toolbar" data-eb-no-drag>
        <span className="builder-block__label eb-block__label">{definition?.label ?? block.type}</span>

        <button
          type="button"
          ref={drag.setHandle}
          className="builder-block__action eb-block__toolbar-btn eb-block__toolbar-btn--drag"
          aria-label={t("block.move")}
          title="Move block"
          aria-roledescription="draggable"
        >
          <span className="material-symbols-outlined" aria-hidden="true">drag_indicator</span>
        </button>

        <button
          type="button"
          className="builder-block__action"
          aria-label="Move block up"
          disabled={blockIndex === 0}
          title="Move block up"
          onClick={(event) => {
            event.stopPropagation();
            moveBlock(-1);
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
        </button>

        <button
          type="button"
          className="builder-block__action"
          aria-label="Move block down"
          disabled={blockIndex >= totalBlocks - 1}
          title="Move block down"
          onClick={(event) => {
            event.stopPropagation();
            moveBlock(1);
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">arrow_downward</span>
        </button>

        <button
          type="button"
          className="builder-block__action eb-block__toolbar-btn"
          aria-label={t("block.duplicate")}
          title="Duplicate block"
          onClick={(event) => {
            event.stopPropagation();
            editor.duplicateBlock(block.id);
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
        </button>

        <button
          type="button"
          className="builder-block__action builder-block__action--danger eb-block__toolbar-btn eb-block__toolbar-btn--danger"
          aria-label={t("block.delete")}
          title="Delete block"
          onClick={(event) => {
            event.stopPropagation();
            editor.removeBlock(block.id);
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">delete</span>
        </button>
      </div>

      <div className="eb-block__render" ref={render} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/* ── Inline editing ── */
interface InlineEditInput {
  editor: Editor;
  block: Block;
  editing: boolean;
  inlineEditKey: string | undefined;
  host: { current: HTMLElement | null };
}

function useInlineEdit({ editor, block, editing, inlineEditKey, host }: InlineEditInput) {
  useEffect(() => {
    if (!editing || !inlineEditKey) return;
    const target = resolveInlineTarget(host.current);
    if (!target) {
      editor.endInlineEdit();
      return;
    }

    target.setAttribute("data-eb-inline", "");
    target.contentEditable = "true";
    target.focus();

    const commit = () => {
      editor.updateContent(block.id, { [inlineEditKey]: target.innerHTML }, "inline");
      editor.endInlineEdit();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      commit();
    };

    target.addEventListener("blur", commit);
    target.addEventListener("keydown", onKeyDown);

    return () => {
      target.removeEventListener("blur", commit);
      target.removeEventListener("keydown", onKeyDown);
      target.contentEditable = "false";
      target.removeAttribute("data-eb-inline");
    };
  }, [editor, block.id, editing, inlineEditKey, host]);
}

function resolveInlineTarget(host: HTMLElement | null): HTMLElement | null {
  if (!host) return null;
  const marked = host.querySelector<HTMLElement>("[data-eb-inline]");
  if (marked) return marked;
  const cell = host.querySelector("td");
  const first = cell?.firstElementChild;
  return first instanceof HTMLElement ? first : null;
}
