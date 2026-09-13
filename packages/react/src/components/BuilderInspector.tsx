/* ═══ BuilderInspector ═══
 *
 * Right rail inspector:
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
import { useEditor, useTranslator } from "../context";
import { useEditorSelector } from "../hooks/useEditorState";
import { BuilderField } from "./BuilderField";
import {
  ROW_GROUPS,
  COLUMN_GROUPS,
  encodeLayout,
  decodeLayout,
} from "../schemas";
import { Glyph } from "./Glyph";
import { groupFields } from "@email-builder/engine";
import { fontStack } from "@email-builder/core";

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
  const t = useTranslator();
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

  const selectedColumn = useEditorSelector((state) => {
    const sel = state.selection;
    if (sel?.kind !== "column") return null;
    for (const row of state.document.rows) for (const col of row.columns) if (col.id === sel.id) return col;
    return null;
  });

  const selectedIds = useEditorSelector((state) => state.selectedIds);
  /* Several blocks or rows at once get the shared actions instead of one item's settings. */
  const multi = selectedIds.length > 1;
  const [copied, setCopied] = useState(false);
  const copySelected = () => {
    const payload = editor.copySelection();
    if (!payload || !navigator.clipboard) return;
    void navigator.clipboard.writeText(payload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  /* A selection with nothing to show — a column that was removed, a block deleted while selected —
     gets an explanation instead of a blank panel. */
  const showEmpty = !!selectionKind && selectionKind !== "settings" && !selectedBlock && !selectedRow && !selectedColumn;

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
    <aside className={inspectorClasses} aria-label={t("inspector.label")}>
      {/* Email Settings Header */}
      {(!selectionKind || selectionKind === "settings") && (
        <header className="builder-inspector__header">
          <div className="builder-inspector__header-title">
            <span className="builder-inspector__header-icon">
              <Glyph name="tune" />
            </span>
            <div>
              <span className="builder-inspector__title-main">Email Settings</span>
              <span className="builder-inspector__title-sub">Global styles &amp; frame</span>
            </div>
          </div>
        </header>
      )}

      {/* Block Header */}
      {!multi && selectionKind === "block" && selectedBlock && (
        <header className="builder-inspector__header">
          <div className="builder-inspector__header-title">
            <span className="builder-inspector__header-icon">
              <Glyph name={ICONS_MAP[selectedBlock.type] || "widgets"} />
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
            title={t("inspector.back")}
            onClick={deselect}
          >
            <Glyph name="arrow_back" />
            <span>All Settings</span>
          </button>
        </header>
      )}

      {/* Row Header */}
      {!multi && selectionKind === "row" && selectedRow && (
        <header className="builder-inspector__header">
          <div className="builder-inspector__header-title">
            <span className="builder-inspector__header-icon">
              <Glyph name="table_rows" />
            </span>
            <div>
              <span className="builder-inspector__title-main">Row Settings</span>
              <span className="builder-inspector__title-sub">Columns &amp; layout</span>
            </div>
          </div>
          <button
            type="button"
            className="builder-inspector__nav-btn"
            title={t("inspector.back")}
            onClick={deselect}
          >
            <Glyph name="arrow_back" />
            <span>All Settings</span>
          </button>
        </header>
      )}

      {/* Multi-selection Header */}
      {multi && (
        <header className="builder-inspector__header">
          <div className="builder-inspector__header-title">
            <span className="builder-inspector__header-icon">
              <Glyph name={selectionKind === "row" ? "table_rows" : "widgets"} />
            </span>
            <div>
              <span className="builder-inspector__title-main">
                {selectedIds.length} {selectionKind === "row" ? t("selection.rows") : t("selection.blocks")}
              </span>
              <span className="builder-inspector__title-sub">{t("selection.sub")}</span>
            </div>
          </div>
          <button type="button" className="builder-inspector__nav-btn" title={t("inspector.back")} onClick={deselect}>
            <Glyph name="arrow_back" />
            <span>{t("inspector.allSettings")}</span>
          </button>
        </header>
      )}

      {/* Column Header */}
      {selectionKind === "column" && selectedColumn && (
        <header className="builder-inspector__header">
          <div className="builder-inspector__header-title">
            <span className="builder-inspector__header-icon">
              <Glyph name="view_column" />
            </span>
            <div>
              <span className="builder-inspector__title-main">{t("inspector.columnTitle")}</span>
              <span className="builder-inspector__title-sub">{t("inspector.columnSub")}</span>
            </div>
          </div>
          <button type="button" className="builder-inspector__nav-btn" title={t("inspector.back")} onClick={deselect}>
            <Glyph name="arrow_back" />
            <span>{t("inspector.allSettings")}</span>
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
                <Glyph name="lightbulb" className="inspector-legend__header-icon" />
                <span className="inspector-legend__header-title">Canvas Quick Tips</span>
              </div>
              <div className="inspector-legend__items">
                <div className="inspector-legend__item">
                  <span className="inspector-legend__item-badge">
                    <Glyph name="widgets" />
                  </span>
                  <span>Click any block to customize its text, styling &amp; colors</span>
                </div>
                <div className="inspector-legend__item">
                  <span className="inspector-legend__item-badge">
                    <Glyph name="table_rows" />
                  </span>
                  <span>Click outer space around content to edit row layout</span>
                </div>
              </div>
            </div>

            {/* Brand Section */}
            <details className="eb-group" open>
              <summary className="eb-group__header">
                Brand
                <Glyph name="expand_more" style={{ fontSize: 18 }} />
              </summary>
              <div className="eb-group__body" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "12px 16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--eb-text-secondary)" }}>Font</label>
                  <select
                    value={settings.fontFamily || GLOBAL_FONTS[0]!.value}
                    style={{ width: "100%", height: 36, border: "1px solid var(--eb-border)", borderRadius: 6, padding: "0 10px", fontSize: 13, background: "var(--eb-surface)" }}
                    onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                  >
                    {[...editor.fonts.map((font) => ({ value: fontStack(font), label: font.label })), ...GLOBAL_FONTS].map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <span style={{ display: "block", fontSize: 11, color: "var(--eb-text-subtle)", marginTop: 4 }}>
                    Brand fonts show in most inboxes; Outlook uses their web-safe fallback.
                  </span>
                </div>

                {/* Text Colour */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--eb-text-secondary)" }}>Text colour</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={settings.textColor || "#333333"}
                      style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--eb-border)", padding: 0, cursor: "pointer" }}
                      onChange={(e) => updateSettings({ textColor: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.textColor || "#333333"}
                      style={{ flex: 1, height: 32, border: "1px solid var(--eb-border)", borderRadius: 6, padding: "0 8px", fontFamily: "monospace", fontSize: 12 }}
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
                          border: "1px solid color-mix(in srgb, var(--eb-shadow-color) 10%, transparent)",
                          cursor: "pointer",
                        }}
                        onClick={() => updateSettings({ textColor: c })}
                      />
                    ))}
                  </div>
                </div>

                {/* Link Colour */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--eb-text-secondary)" }}>Link colour</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={settings.linkColor || "#0066cc"}
                      style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--eb-border)", padding: 0, cursor: "pointer" }}
                      onChange={(e) => updateSettings({ linkColor: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.linkColor || "#0066cc"}
                      style={{ flex: 1, height: 32, border: "1px solid var(--eb-border)", borderRadius: 6, padding: "0 8px", fontFamily: "monospace", fontSize: 12 }}
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
                          border: "1px solid color-mix(in srgb, var(--eb-shadow-color) 10%, transparent)",
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
                <Glyph name="expand_more" style={{ fontSize: 18 }} />
              </summary>
              <div className="eb-group__body" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--eb-text-secondary)" }}>Page background</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={settings.backgroundColor || "#f4f4f5"}
                      style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--eb-border)", padding: 0, cursor: "pointer" }}
                      onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.backgroundColor || "#f4f4f5"}
                      style={{ flex: 1, height: 32, border: "1px solid var(--eb-border)", borderRadius: 6, padding: "0 8px", fontFamily: "monospace", fontSize: 12 }}
                      onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--eb-text-secondary)" }}>Email background</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={settings.contentBackgroundColor || "#ffffff"}
                      style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--eb-border)", padding: 0, cursor: "pointer" }}
                      onChange={(e) => updateSettings({ contentBackgroundColor: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.contentBackgroundColor || "#ffffff"}
                      style={{ flex: 1, height: 32, border: "1px solid var(--eb-border)", borderRadius: 6, padding: "0 8px", fontFamily: "monospace", fontSize: 12 }}
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
                <Glyph name="expand_more" style={{ fontSize: 18 }} />
              </summary>
              <div className="eb-group__body" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "12px 16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--eb-text-secondary)" }}>Width</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="number"
                      value={settings.contentWidth || 600}
                      min={320}
                      max={800}
                      style={{ width: "100%", height: 36, border: "1px solid var(--eb-border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }}
                      onChange={(e) => updateSettings({ contentWidth: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: 12, color: "var(--eb-text-muted)", fontWeight: 500 }}>px</span>
                  </div>
                  <span style={{ display: "block", fontSize: 11, color: "var(--eb-text-subtle)", marginTop: 4 }}>
                    600px is what every email client agrees on. Change it only if you know why.
                  </span>
                </div>

                {/* Padding TRBL */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--eb-text-secondary)" }}>Padding</label>
                    <button
                      type="button"
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: isPaddingLinked ? "var(--eb-accent)" : "var(--eb-text-subtle)",
                      }}
                      title={isPaddingLinked ? "Unlink padding sides" : "Link all padding sides"}
                      onClick={() => setIsPaddingLinked(!isPaddingLinked)}
                    >
                      <Glyph name={isPaddingLinked ? "link" : "link_off"} style={{ fontSize: 16 }} />
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, textAlign: "center" }}>
                    <div>
                      <span style={{ fontSize: 10, color: "var(--eb-text-subtle)", display: "block" }}>T</span>
                      <input
                        type="number"
                        value={(settings as any)?.padding?.top ?? 24}
                        style={{ width: "100%", height: 32, border: "1px solid var(--eb-border)", borderRadius: 6, textAlign: "center", fontSize: 12 }}
                        onChange={(e) => updatePadding("top", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "var(--eb-text-subtle)", display: "block" }}>R</span>
                      <input
                        type="number"
                        value={(settings as any)?.padding?.right ?? 24}
                        style={{ width: "100%", height: 32, border: "1px solid var(--eb-border)", borderRadius: 6, textAlign: "center", fontSize: 12 }}
                        onChange={(e) => updatePadding("right", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "var(--eb-text-subtle)", display: "block" }}>B</span>
                      <input
                        type="number"
                        value={(settings as any)?.padding?.bottom ?? 24}
                        style={{ width: "100%", height: 32, border: "1px solid var(--eb-border)", borderRadius: 6, textAlign: "center", fontSize: 12 }}
                        onChange={(e) => updatePadding("bottom", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "var(--eb-text-subtle)", display: "block" }}>L</span>
                      <input
                        type="number"
                        value={(settings as any)?.padding?.left ?? 24}
                        style={{ width: "100%", height: 32, border: "1px solid var(--eb-border)", borderRadius: 6, textAlign: "center", fontSize: 12 }}
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
        {!multi && selectionKind === "block" && selectedBlock && (
          <>
            {blockSchema.map((group) => (
              <details key={group.title} className="eb-group" open>
                <summary className="eb-group__header">
                  {group.title}
                  <Glyph name="expand_more" style={{ fontSize: 18 }} />
                </summary>
                <div className="eb-group__body">
                  {groupFields(group.fields).map((run, runIndex) => {
                    const renderField = (field: (typeof run.fields)[number]) => {
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
                    };
                    /* Paired fields (Size | Weight) share a two-column row; the rest are full width. */
                    return run.inline ? (
                      <div key={`row-${runIndex}`} className="eb-field-row">
                        {run.fields.map(renderField)}
                      </div>
                    ) : (
                      run.fields.map(renderField)
                    );
                  })}
                </div>
              </details>
            ))}
          </>
        )}

        {/* ─── Selected Row ─── */}
        {!multi && selectionKind === "row" && selectedRow && (
          <>
            {ROW_GROUPS.map((group) => (
              <details key={group.title} className="eb-group" open={!group.collapsed}>
                <summary className="eb-group__header">
                  {group.title}
                  <Glyph name="expand_more" style={{ fontSize: 18 }} />
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
        {/* ─── Multi-selection ─── */}
        {multi && (
          <div className="eb-inspector__multi">
            <div className="eb-inspector__multi-actions">
              <button type="button" className="eb-btn eb-btn--outline" onClick={() => editor.duplicateSelected()}>
                <Glyph name="add_box" />
                {t("selection.duplicate")}
              </button>
              <button type="button" className="eb-btn eb-btn--outline" onClick={copySelected}>
                <Glyph name={copied ? "check" : "content_copy"} />
                {copied ? t("selection.copied") : t("selection.copy")}
              </button>
              <button type="button" className="eb-btn eb-btn--danger" onClick={() => editor.removeSelected()}>
                <Glyph name="delete" />
                {t("selection.delete")}
              </button>
            </div>
            <p className="eb-field__help">{t("selection.hint")}</p>
          </div>
        )}

        {/* ─── Selected Column ─── */}
        {selectionKind === "column" && selectedColumn && (
          <>
            {COLUMN_GROUPS.map((group) => (
              <details key={group.title} className="eb-group" open={!group.collapsed}>
                <summary className="eb-group__header">
                  {group.title}
                  <Glyph name="expand_more" style={{ fontSize: 18 }} />
                </summary>
                <div className="eb-group__body">
                  {groupFields(group.fields).map((run, runIndex) => {
                    const renderField = (field: (typeof run.fields)[number]) => (
                      <BuilderField
                        key={field.key}
                        field={field}
                        value={(selectedColumn.style as unknown as Record<string, unknown> | undefined)?.[field.key]}
                        onChange={(v) => editor.updateColumnStyle(selectedColumn.id, { [field.key]: v })}
                        block={null}
                      />
                    );
                    return run.inline ? (
                      <div key={`row-${runIndex}`} className="eb-field-row">
                        {run.fields.map(renderField)}
                      </div>
                    ) : (
                      run.fields.map(renderField)
                    );
                  })}
                </div>
              </details>
            ))}
          </>
        )}

        {/* ─── Nothing to edit ─── */}
        {showEmpty && (
          <div className="eb-inspector__empty" role="status">
            <span className="eb-inspector__empty-icon">
              <Glyph name="tune" />
            </span>
            <p className="eb-inspector__empty-title">{t("inspector.emptyTitle")}</p>
            <p className="eb-inspector__empty-text">{t("inspector.empty")}</p>
            <button type="button" className="eb-btn eb-btn--outline" onClick={deselect}>
              <Glyph name="arrow_back" />
              {t("inspector.back")}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
