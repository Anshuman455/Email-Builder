/* ═══ BuilderPalette ═══
 *
 * Left rail palette:
 * Two tabs: Blocks and Structure.
 * Blocks has:
 *  - Layouts: 6 thumbnail cards with span previews
 *  - Dynamically grouped generic blocks (Content, Layout, etc.)
 * Icons are the engine's inline SVG set (see Glyph) — no icon font to load.
 */

import { useMemo, useState } from "react";
import { useEditor, useTranslator } from "../context";
import { useEditorSelector } from "../hooks/useEditorState";
import { useDraggable } from "../hooks/useDnd";
import { Glyph } from "./Glyph";
import { selectFromClick } from "@email-builder/engine";

const ROW_LAYOUTS = [
  { layout: "1", label: "Full width", spans: [1] },
  { layout: "1:1", label: "Two columns", spans: [1, 1] },
  { layout: "1:1:1", label: "Three columns", spans: [1, 1, 1] },
  { layout: "1:1:1:1", label: "Four columns", spans: [1, 1, 1, 1] },
  { layout: "1:2", label: "Narrow + wide", spans: [1, 2] },
  { layout: "2:1", label: "Wide + narrow", spans: [2, 1] },
];

const BLOCK_ICONS: Record<string, string> = {
  heading: "title",
  text: "notes",
  list: "format_list_bulleted",
  button: "smart_button",
  image: "image",
  video: "smart_display",
  card: "dashboard_customize",
  social: "share",
  rating: "star",
  slot: "view_quilt",
  "content-slot": "view_quilt",
  divider: "horizontal_rule",
  spacer: "height",
  footer: "vertical_align_bottom",
  html: "code",
  columns: "view_column",
};

function PaletteBlock({ block }: { block: { type: string; label: string; icon: string } }) {
  const editor = useEditor();
  const drag = useDraggable({ kind: "palette", blockType: block.type });

  function add() {
    const doc = editor.getDocument();
    const sel = editor.getSelection();
    let columnId = "";
    if (sel?.kind === "column") columnId = sel.id;
    else if (sel?.kind === "block") {
      for (const row of doc.rows)
        for (const col of row.columns)
          if (col.blocks.some((b) => b.id === sel.id)) { columnId = col.id; break; }
    } else if (doc.rows.length > 0 && doc.rows[0]?.columns.length) {
      columnId = doc.rows[0].columns[0]!.id;
    }

    const newBlock = editor.blocks.create(block.type);
    if (!newBlock) return;

    if (columnId) {
      editor.insertBlock(newBlock, columnId);
    } else {
      editor.addRow([1]);
      const updated = editor.getDocument();
      const firstCol = updated.rows[updated.rows.length - 1]?.columns[0];
      if (firstCol) editor.insertBlock(newBlock, firstCol.id);
    }
  }

  const isHtml = block.icon && block.icon.trim().startsWith("<");

  return (
    <div
      ref={drag.setNode}
      role="button"
      tabIndex={0}
      className="palette-block"
      aria-label={`Add ${block.label} block`}
      onClick={add}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          add();
        }
      }}
    >
      <span className="palette-block__icon-wrap">
        {isHtml ? (
          <span
            className="palette-block__svg-host"
            dangerouslySetInnerHTML={{ __html: block.icon }}
          />
        ) : (
          <Glyph name={block.icon || BLOCK_ICONS[block.type] || "widgets"} />
        )}
      </span>
      <span className="palette-block__label">{block.label}</span>
    </div>
  );
}

function PaletteRowItem({ item }: { item: { layout: string; label: string; spans: number[] } }) {
  const editor = useEditor();
  const drag = useDraggable({ kind: "palette-row", spans: item.spans, label: item.label });

  const addRow = () => editor.addRow(item.spans);

  return (
    <div
      ref={drag.setNode}
      role="button"
      tabIndex={0}
      className={`palette-layout${drag.isDragging ? " palette-layout--dragging" : ""}`}
      title={`Add or drag ${item.label} row`}
      onClick={addRow}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          addRow();
        }
      }}
    >
      <div className="palette-layout__preview" aria-hidden="true">
        {item.spans.map((span, sIndex) => (
          <span
            key={sIndex}
            className="palette-layout__cell"
            style={{ flex: span }}
          />
        ))}
      </div>
      <span className="palette-layout__label">{item.label}</span>
    </div>
  );
}

export function BuilderPalette({ className }: { className?: string }) {
  const editor = useEditor();
  const t = useTranslator();
  const [activeTab, setActiveTab] = useState<"blocks" | "structure">("blocks");
  const document = useEditorSelector((state) => state.document);
  const selection = useEditorSelector((state) => state.selection);
  const selectedIds = useEditorSelector((state) => state.selectedIds);

  const blockGroups = useMemo(() => {
    const rawGroups = editor.blocks.groups();
    return rawGroups.map((g) => ({
      key: g.group.toLowerCase(),
      label: g.group,
      blocks: g.blocks.map((def) => ({
        type: def.type,
        label: def.label || def.type,
        icon: def.icon || BLOCK_ICONS[def.type] || "widgets",
      })),
    }));
  }, [editor]);

  const paletteClasses = ["builder-palette", className ?? ""].filter(Boolean).join(" ");

  return (
    <aside className={paletteClasses} aria-label={t("palette.label")}>
      {/* Tabs */}
      <div
        className="builder-palette__tabs"
        role="tablist"
        style={{
          ["--tab-count" as any]: 2,
          ["--tab-index" as any]: activeTab === "blocks" ? 0 : 1,
        }}
      >
        <span className="builder-palette__tab-pill" aria-hidden="true" />
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "blocks"}
          className={`builder-palette__tab${activeTab === "blocks" ? " builder-palette__tab--active" : ""}`}
          onClick={() => setActiveTab("blocks")}
        >
          Blocks
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "structure"}
          className={`builder-palette__tab${activeTab === "structure" ? " builder-palette__tab--active" : ""}`}
          onClick={() => setActiveTab("structure")}
        >
          Structure
        </button>
      </div>

      <div className="builder-palette__scroll">
        {activeTab === "blocks" ? (
          <>
            {/* Layouts Section */}
            <section className="palette-group">
              <div className="palette-group__header">
                <h3 className="palette-group__title">Row Layouts</h3>
                <span className="palette-group__count">{ROW_LAYOUTS.length}</span>
              </div>
              <div className="palette-layouts">
                {ROW_LAYOUTS.map((item) => (
                  <PaletteRowItem key={item.layout} item={item} />
                ))}
              </div>
            </section>

            {/* Dynamically Grouped Blocks */}
            {blockGroups.map((grp) => (
              <section key={grp.key} className="palette-group">
                <div className="palette-group__header">
                  <h3 className="palette-group__title">{{ ...grp }.label}</h3>
                  <span className="palette-group__count">{grp.blocks.length}</span>
                </div>
                <div className="palette-blocks">
                  {grp.blocks.map((b) => (
                    <PaletteBlock key={b.type} block={b} />
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : (
          /* Structure Tab */
          <div className="structure-tree">
            {document.rows.length === 0 && <p className="structure-tree__empty">{t("structure.empty")}</p>}
            {document.rows.map((row, rIndex) => {
              const rowSelected = selection?.kind === "row" && (selection.id === row.id || selectedIds.includes(row.id));
              const single = row.columns.length === 1;
              return (
                <div key={row.id} className={`structure-row${rowSelected ? " structure-row--selected" : ""}`}>
                  <button
                    type="button"
                    className="structure-row__header"
                    aria-pressed={rowSelected}
                    onClick={(event) => selectFromClick(editor, event, { kind: "row", id: row.id })}
                  >
                    <Glyph name="table_rows" />
                    <span className="structure-row__title">
                      {t("structure.row")} {rIndex + 1}
                    </span>
                    <span className="structure-row__badge">
                      {row.columns.length} {single ? t("structure.column") : t("structure.columns")}
                    </span>
                  </button>

                  <div className="structure-row__columns">
                    {row.columns.map((col, cIndex) => {
                      const columnSelected = selection?.kind === "column" && selection.id === col.id;
                      return (
                        <div key={col.id} className="structure-column">
                          {/* A single-column row needs no column level: its blocks sit directly under the row. */}
                          {!single && (
                            <button
                              type="button"
                              className={`structure-column__header${columnSelected ? " structure-column--selected" : ""}`}
                              aria-pressed={columnSelected}
                              onClick={() => editor.select({ kind: "column", id: col.id })}
                            >
                              <Glyph name="view_column" />
                              <span className="structure-column__title">
                                {t("structure.columnLabel")} {cIndex + 1}
                              </span>
                              <span className="structure-column__badge">{col.blocks.length}</span>
                            </button>
                          )}

                          <div className={`structure-column__blocks${single ? " structure-column__blocks--flat" : ""}`}>
                            {col.blocks.length === 0 ? (
                              <span className="structure-block structure-block--empty">{t("structure.emptyColumn")}</span>
                            ) : (
                              col.blocks.map((b) => {
                                const blockSelected = selection?.kind === "block" && (selection.id === b.id || selectedIds.includes(b.id));
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    className={`structure-block${blockSelected ? " structure-block--selected" : ""}`}
                                    aria-pressed={blockSelected}
                                    onClick={(event) => selectFromClick(editor, event, { kind: "block", id: b.id })}
                                  >
                                    <Glyph name={BLOCK_ICONS[b.type] || "widgets"} />
                                    <span className="structure-block__label">{editor.blocks.get(b.type)?.label || b.type}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
