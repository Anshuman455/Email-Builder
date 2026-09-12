/* ═══ BuilderPalette ═══
 *
 * Left rail matching Growtality:
 * Two tabs: Blocks and Structure.
 * Blocks has:
 *  - Layouts: 6 thumbnail cards with span previews
 *  - Dynamically grouped generic blocks (Content, Layout, etc.)
 * All with Google Material Symbols Outlined icons.
 */

import { useMemo, useState } from "react";
import { useEditor } from "../context";
import { useEditorSelector } from "../hooks/useEditorState";
import { useDraggable } from "../hooks/useDnd";

const ROW_LAYOUTS = [
  { layout: "1", label: "Full width", spans: [1] },
  { layout: "1:1", label: "Two columns", spans: [1, 1] },
  { layout: "1:1:1", label: "Three columns", spans: [1, 1, 1] },
  { layout: "1:1:1:1", label: "Four columns", spans: [1, 1, 1, 1] },
  { layout: "1:2", label: "Narrow + wide", spans: [1, 2] },
  { layout: "2:1", label: "Wide + narrow", spans: [2, 1] },
];

const BUILTIN_ICONS: Record<string, string> = {
  heading: "title",
  text: "notes",
  image: "image",
  button: "smart_button",
  divider: "horizontal_rule",
  spacer: "height",
  social: "share",
  html: "code",
  rating: "star",
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

  return (
    <button
      ref={drag.setNode}
      type="button"
      className="palette-block"
      aria-label={`Add ${block.label} block`}
      onClick={add}
    >
      <span className="palette-block__icon">
        <span className="material-symbols-outlined" aria-hidden="true">{block.icon}</span>
      </span>
      <span className="palette-block__label">{block.label}</span>
    </button>
  );
}

export function BuilderPalette({ className }: { className?: string }) {
  const editor = useEditor();
  const [activeTab, setActiveTab] = useState<"blocks" | "structure">("blocks");
  const document = useEditorSelector((state) => state.document);
  const selection = useEditorSelector((state) => state.selection);

  const blockGroups = useMemo(() => {
    const rawGroups = editor.blocks.groups();
    return rawGroups.map((g) => ({
      key: g.group.toLowerCase(),
      label: g.group,
      blocks: g.blocks.map((def) => ({
        type: def.type,
        label: def.label || def.type,
        icon: BUILTIN_ICONS[def.type] || "widgets",
      })),
    }));
  }, [editor]);

  const paletteClasses = ["builder-palette", className ?? ""].filter(Boolean).join(" ");

  return (
    <aside className={paletteClasses} aria-label="Palette">
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
                <h3 className="palette-group__title">Layouts</h3>
                <span className="palette-group__count">{ROW_LAYOUTS.length}</span>
              </div>
              <div className="palette-layouts">
                {ROW_LAYOUTS.map((item) => (
                  <button
                    key={item.layout}
                    type="button"
                    className="palette-layout"
                    title={`Add ${item.label} row`}
                    onClick={() => editor.addRow(item.spans)}
                  >
                    <div className="palette-layout__preview">
                      {item.spans.map((span, sIndex) => (
                        <span
                          key={sIndex}
                          className="palette-layout__col"
                          style={{ flex: span }}
                        />
                      ))}
                    </div>
                    <span className="palette-layout__label">{{ ...item }.label}</span>
                  </button>
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
            {document.rows.map((row, rIndex) => (
              <div
                key={row.id}
                className={`structure-row${selection?.kind === "row" && selection.id === row.id ? " structure-row--selected" : ""}`}
                onClick={() => editor.select({ kind: "row", id: row.id })}
              >
                <div className="structure-row__header">
                  <span className="material-symbols-outlined" aria-hidden="true">table_rows</span>
                  <span>Row {rIndex + 1}</span>
                  <span className="structure-row__badge">{row.columns.length} col</span>
                </div>

                <div className="structure-row__columns">
                  {row.columns.map((col, cIndex) => (
                    <div key={col.id} className="structure-column">
                      <div
                        className={`structure-column__header${selection?.kind === "column" && selection.id === col.id ? " structure-column--selected" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          editor.select({ kind: "column", id: col.id });
                        }}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">view_column</span>
                        <span>Column {cIndex + 1}</span>
                        <span className="structure-column__badge">{col.blocks.length}</span>
                      </div>

                      {col.blocks.length > 0 && (
                        <div className="structure-column__blocks">
                          {col.blocks.map((b) => (
                            <div
                              key={b.id}
                              className={`structure-block${selection?.kind === "block" && selection.id === b.id ? " structure-block--selected" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                editor.select({ kind: "block", id: b.id });
                              }}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">
                                {BUILTIN_ICONS[b.type] || "widgets"}
                              </span>
                              <span>{editor.blocks.get(b.type)?.label || b.type}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
