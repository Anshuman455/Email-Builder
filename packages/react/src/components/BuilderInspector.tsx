/* ═══ BuilderInspector ═══
 *
 * Right rail matching Growtality:
 * When nothing selected:
 *  - Email Settings (Global styles & frame)
 *  - Canvas Quick Tips
 *  - Brand (Font, Text colour swatches, Link colour swatches)
 *  - Background
 *  - Canvas Sizing & Width (Width 600px, Padding TRBL)
 * When item selected:
 *  - Header with Back to All Settings button
 *  - Block properties / Row properties
 */

import { useState } from "react";
import type { FieldGroup } from "@email-builder/core";
import { useEditor } from "../context";
import { useEditorSelector } from "../hooks/useEditorState";
import { BuilderField } from "./BuilderField";
import {
  ROW_GROUPS,
  COLUMN_GROUPS,
  encodeLayout,
  decodeLayout,
} from "../schemas";

const GLOBAL_FONTS = [
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "Helvetica, Arial, sans-serif", label: "Helvetica" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
  { value: "Tahoma, Geneva, sans-serif", label: "Tahoma" },
  { value: "'Trebuchet MS', Helvetica, sans-serif", label: "Trebuchet MS" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia" },
  { value: "'Times New Roman', Times, serif", label: "Times New Roman" },
  { value: "'Courier New', Courier, monospace", label: "Courier New" },
];

const TEXT_COLORS = ["#333333", "#666666", "#2563eb", "#cbd5e1", "#0f172a"];
const LINK_COLORS = ["#0f172a", "#1e40af", "#0066cc", "#60a5fa", "#06b6d4"];

const ICONS_MAP: Record<string, string> = {
  heading: "title",
  text: "notes",
  image: "image",
  button: "smart_button",
  divider: "horizontal_rule",
  spacer: "height",
  social: "share",
  html: "code",
  menu_item: "restaurant_menu",
  coupon: "confirmation_number",
  reserve_cta: "calendar_month",
  review_request: "star",
};

export function BuilderInspector({ className }: { className?: string }) {
  const editor = useEditor();
  const selection = useEditorSelector((state) => state.selection);
  const selectionKind = selection?.kind ?? null;
  const settings = useEditorSelector((state) => state.document.settings);

  const [isPaddingLinked, setIsPaddingLinked] = useState(true);

  const selectedBlock = useEditorSelector((state) => {
    const sel = state.selection;
    if (sel?.kind !== "block") return null;
    for (const row of state.document.rows)
      for (const col of row.columns)
        for (const b of col.blocks) if (b.id === sel.id) return b;
    return null;
  });

  const blockSchema = useEditorSelector((state) => {
    const sel = state.selection;
    if (sel?.kind !== "block") return [] as FieldGroup[];
    return editor.getSchema();
  });

  const selectedRow = useEditorSelector((state) => {
    const sel = state.selection;
    if (sel?.kind !== "row") return null;
    return state.document.rows.find((r) => r.id === sel.id) ?? null;
  });

  const updateSettings = (changes: Record<string, unknown>) => {
    editor.updateSettings(changes);
  };

  const updatePadding = (side: "top" | "right" | "bottom" | "left", val: number) => {
    const current = (settings as any)?.padding || { top: 24, right: 24, bottom: 24, left: 24 };
    if (isPaddingLinked) {
      updateSettings({ padding: { top: val, right: val, bottom: val, left: val } });
    } else {
      updateSettings({ padding: { ...current, [side]: val } });
    }
  };

  const deselect = () => {
    editor.select(null);
  };

  const inspectorClasses = ["builder-inspector", "eb-inspector", className ?? ""].filter(Boolean).join(" ");

  return (
    <aside className={inspectorClasses} aria-label="Inspector">
      {/* Email Settings Header */}
      {(!selectionKind || selectionKind === "settings") && (
        <header className="builder-inspector__header">
          <div className="builder-inspector__header-title">
            <span className="builder-inspector__header-icon">
              <span className="material-symbols-outlined" aria-hidden="true">tune</span>
            </span>
            <div>
              <span className="builder-inspector__title-main">Email Settings</span>
              <span className="builder-inspector__title-sub">Global styles &amp; frame</span>
            </div>
          </div>
        </header>
      )}

      {/* Block Header */}
      {selectionKind === "block" && selectedBlock && (
        <header className="builder-inspector__header">
          <div className="builder-inspector__header-title">
            <span className="builder-inspector__header-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                {ICONS_MAP[selectedBlock.type] || "widgets"}
              </span>
            </span>
            <div>
              <span className="builder-inspector__title-main">
                {editor.blocks.get(selectedBlock.type)?.label || selectedBlock.type}
              </span>
              <span className="builder-inspector__title-sub">Block properties</span>
            </div>
          </div>
          <button
            type="button"
            className="builder-inspector__nav-btn"
            title="Back to Email Settings"
            onClick={deselect}
          >
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            <span>All Settings</span>
          </button>
        </header>
      )}

      {/* Row Header */}
      {selectionKind === "row" && selectedRow && (
        <header className="builder-inspector__header">
          <div className="builder-inspector__header-title">
            <span className="builder-inspector__header-icon">
              <span className="material-symbols-outlined" aria-hidden="true">table_rows</span>
            </span>
            <div>
              <span className="builder-inspector__title-main">Row Settings</span>
              <span className="builder-inspector__title-sub">Columns &amp; layout</span>
            </div>
          </div>
          <button
            type="button"
            className="builder-inspector__nav-btn"
            title="Back to Email Settings"
            onClick={deselect}
          >
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            <span>All Settings</span>
          </button>
        </header>
      )}

      {/* Inspector Scroll Body */}
      <div className="builder-inspector__scroll eb-inspector__scroll">
        {/* ─── Global Email Settings ─── */}
        {(!selectionKind || selectionKind === "settings") && (
          <>
            {/* Canvas Quick Tips */}
            <div className="inspector-legend">
              <div className="inspector-legend__header">
                <span className="material-symbols-outlined inspector-legend__header-icon" aria-hidden="true">
                  lightbulb
                </span>
                <span className="inspector-legend__header-title">Canvas Quick Tips</span>
              </div>
              <div className="inspector-legend__items">
                <div className="inspector-legend__item">
                  <span className="inspector-legend__item-badge">
                    <span className="material-symbols-outlined" aria-hidden="true">widgets</span>
                  </span>
                  <span>Click any block to customize its text, styling &amp; colors</span>
                </div>
                <div className="inspector-legend__item">
                  <span className="inspector-legend__item-badge">
                    <span className="material-symbols-outlined" aria-hidden="true">table_rows</span>
                  </span>
                  <span>Click outer space around content to edit row layout</span>
                </div>
              </div>
            </div>

            {/* Brand Section */}
            <details className="eb-group" open>
              <summary className="eb-group__header">
                Brand
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
              </summary>
              <div className="eb-group__body" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "12px 16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>Font</label>
                  <select
                    value={settings.fontFamily || GLOBAL_FONTS[0]!.value}
                    style={{ width: "100%", height: 36, border: "1px solid #e5e7eb", borderRadius: 6, padding: "0 10px", fontSize: 13, background: "#fff" }}
                    onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                  >
                    {GLOBAL_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <span style={{ display: "block", fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                    Web-safe fonts only — custom fonts do not render in Outlook.
                  </span>
                </div>

                {/* Text Colour */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" }}>Text colour</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={settings.textColor || "#333333"}
                      style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #e5e7eb", padding: 0, cursor: "pointer" }}
                      onChange={(e) => updateSettings({ textColor: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.textColor || "#333333"}
                      style={{ flex: 1, height: 32, border: "1px solid #e5e7eb", borderRadius: 6, padding: "0 8px", fontFamily: "monospace", fontSize: 12 }}
                      onChange={(e) => updateSettings({ textColor: e.target.value })}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          backgroundColor: c,
                          border: "1px solid rgba(0,0,0,0.1)",
                          cursor: "pointer",
                        }}
                        onClick={() => updateSettings({ textColor: c })}
                      />
                    ))}
                  </div>
                </div>

                {/* Link Colour */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" }}>Link colour</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={settings.linkColor || "#0066cc"}
                      style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #e5e7eb", padding: 0, cursor: "pointer" }}
                      onChange={(e) => updateSettings({ linkColor: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.linkColor || "#0066cc"}
                      style={{ flex: 1, height: 32, border: "1px solid #e5e7eb", borderRadius: 6, padding: "0 8px", fontFamily: "monospace", fontSize: 12 }}
                      onChange={(e) => updateSettings({ linkColor: e.target.value })}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {LINK_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          backgroundColor: c,
                          border: "1px solid rgba(0,0,0,0.1)",
                          cursor: "pointer",
                        }}
                        onClick={() => updateSettings({ linkColor: c })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </details>

            {/* Background Section */}
            <details className="eb-group">
              <summary className="eb-group__header">
                Background
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
              </summary>
              <div className="eb-group__body" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" }}>Page background</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={settings.backgroundColor || "#f4f4f5"}
                      style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #e5e7eb", padding: 0, cursor: "pointer" }}
                      onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.backgroundColor || "#f4f4f5"}
                      style={{ flex: 1, height: 32, border: "1px solid #e5e7eb", borderRadius: 6, padding: "0 8px", fontFamily: "monospace", fontSize: 12 }}
                      onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" }}>Email background</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={settings.contentBackgroundColor || "#ffffff"}
                      style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #e5e7eb", padding: 0, cursor: "pointer" }}
                      onChange={(e) => updateSettings({ contentBackgroundColor: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.contentBackgroundColor || "#ffffff"}
                      style={{ flex: 1, height: 32, border: "1px solid #e5e7eb", borderRadius: 6, padding: "0 8px", fontFamily: "monospace", fontSize: 12 }}
                      onChange={(e) => updateSettings({ contentBackgroundColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </details>

            {/* Canvas Sizing & Width Section */}
            <details className="eb-group" open>
              <summary className="eb-group__header">
                Canvas Sizing &amp; Width
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
              </summary>
              <div className="eb-group__body" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "12px 16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>Width</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="number"
                      value={settings.contentWidth || 600}
                      min={320}
                      max={800}
                      style={{ width: "100%", height: 36, border: "1px solid #e5e7eb", borderRadius: 6, padding: "0 10px", fontSize: 13 }}
                      onChange={(e) => updateSettings({ contentWidth: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>px</span>
                  </div>
                  <span style={{ display: "block", fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                    600px is what every email client agrees on. Change it only if you know why.
                  </span>
                </div>

                {/* Padding TRBL */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Padding</label>
                    <button
                      type="button"
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: isPaddingLinked ? "#2563eb" : "#9ca3af",
                      }}
                      title={isPaddingLinked ? "Unlink padding sides" : "Link all padding sides"}
                      onClick={() => setIsPaddingLinked(!isPaddingLinked)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        {isPaddingLinked ? "link" : "link_off"}
                      </span>
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, textAlign: "center" }}>
                    <div>
                      <span style={{ fontSize: 10, color: "#9ca3af", display: "block" }}>T</span>
                      <input
                        type="number"
                        value={(settings as any)?.padding?.top ?? 24}
                        style={{ width: "100%", height: 32, border: "1px solid #e5e7eb", borderRadius: 6, textAlign: "center", fontSize: 12 }}
                        onChange={(e) => updatePadding("top", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "#9ca3af", display: "block" }}>R</span>
                      <input
                        type="number"
                        value={(settings as any)?.padding?.right ?? 24}
                        style={{ width: "100%", height: 32, border: "1px solid #e5e7eb", borderRadius: 6, textAlign: "center", fontSize: 12 }}
                        onChange={(e) => updatePadding("right", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "#9ca3af", display: "block" }}>B</span>
                      <input
                        type="number"
                        value={(settings as any)?.padding?.bottom ?? 24}
                        style={{ width: "100%", height: 32, border: "1px solid #e5e7eb", borderRadius: 6, textAlign: "center", fontSize: 12 }}
                        onChange={(e) => updatePadding("bottom", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "#9ca3af", display: "block" }}>L</span>
                      <input
                        type="number"
                        value={(settings as any)?.padding?.left ?? 24}
                        style={{ width: "100%", height: 32, border: "1px solid #e5e7eb", borderRadius: 6, textAlign: "center", fontSize: 12 }}
                        onChange={(e) => updatePadding("left", Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </>
        )}

        {/* ─── Selected Block ─── */}
        {selectionKind === "block" && selectedBlock && (
          <>
            {blockSchema.map((group) => (
              <details key={group.title} className="eb-group" open>
                <summary className="eb-group__header">
                  {group.title}
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
                </summary>
                <div className="eb-group__body">
                  {group.fields.map((field) => {
                    const value =
                      group.target === "content"
                        ? (selectedBlock.content ?? {})[field.key]
                        : (selectedBlock.style ?? {})[field.key];
                    const onChange = (v: unknown) =>
                      group.target === "content"
                        ? editor.updateContent(selectedBlock.id, { [field.key]: v })
                        : editor.updateStyle(selectedBlock.id, { [field.key]: v });
                    return (
                      <BuilderField
                        key={field.key}
                        field={field}
                        value={value}
                        onChange={onChange}
                        block={selectedBlock}
                      />
                    );
                  })}
                </div>
              </details>
            ))}
          </>
        )}

        {/* ─── Selected Row ─── */}
        {selectionKind === "row" && selectedRow && (
          <>
            {ROW_GROUPS.map((group) => (
              <details key={group.title} className="eb-group" open={!group.collapsed}>
                <summary className="eb-group__header">
                  {group.title}
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
                </summary>
                <div className="eb-group__body">
                  {group.fields.map((field) => {
                    let value: unknown;
                    let onChange: (v: unknown) => void;
                    if (field.key === "layout") {
                      value = encodeLayout(selectedRow.layout);
                      onChange = (v) => editor.setRowLayout(selectedRow.id, decodeLayout(v));
                    } else if (group.target === "style") {
                      value = (selectedRow.style as any)?.[field.key];
                      onChange = (v) => editor.updateRowStyle(selectedRow.id, { [field.key]: v });
                    } else {
                      value = (selectedRow as any)[field.key];
                      onChange = (v) => editor.updateRowStyle(selectedRow.id, { [field.key]: v });
                    }
                    return (
                      <BuilderField
                        key={field.key}
                        field={field}
                        value={value}
                        onChange={onChange}
                        block={null}
                      />
                    );
                  })}
                </div>
              </details>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
