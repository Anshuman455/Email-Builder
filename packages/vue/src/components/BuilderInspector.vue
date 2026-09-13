<script setup lang="ts">
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

import { computed, ref } from "vue";
import type { FieldGroup } from "@email-builder/core";
import { groupFields } from "@email-builder/engine";
import { useEditor, useTranslator } from "../context";
import { useEditorSelector } from "../composables";
import { rowGroups, columnGroups, LAYOUT_KEY, layoutValue, parseLayout } from "../schemas";
import BuilderField from "./BuilderField.vue";
import EbGlyph from "./EbGlyph.vue";

const props = defineProps<{ class?: string }>();

const editor = useEditor();
const t = useTranslator(editor);

const selection = useEditorSelector((state) => state.selection);
const document = useEditorSelector((state) => state.document);

const selectionKind = computed(() => selection.value?.kind ?? null);

/* ─── Block panel ─── */
const selectedBlock = computed(() => {
  const sel = selection.value;
  if (sel?.kind !== "block") return null;
  const doc = document.value;
  for (const row of doc.rows)
    for (const col of row.columns)
      for (const b of col.blocks) if (b.id === sel.id) return b;
  return null;
});

const blockSchema = computed<FieldGroup[]>(() => {
  if (!selectedBlock.value) return [];
  return editor.getSchema();
});

function blockValue(group: FieldGroup, key: string) {
  const b = selectedBlock.value;
  if (!b) return undefined;
  return group.target === "content" ? (b.content ?? {})[key] : (b.style ?? {})[key];
}

function blockChange(group: FieldGroup, key: string, value: unknown) {
  const b = selectedBlock.value;
  if (!b) return;
  if (group.target === "content") editor.updateContent(b.id, { [key]: value });
  else editor.updateStyle(b.id, { [key]: value });
}

/* ─── Row panel ─── */
const selectedRow = computed(() => {
  const sel = selection.value;
  if (sel?.kind !== "row") return null;
  return document.value.rows.find((r) => r.id === sel.id) ?? null;
});

const rowSchema = computed(() => rowGroups());

function rowValue(key: string): unknown {
  const row = selectedRow.value;
  if (!row) return undefined;
  if (key === LAYOUT_KEY) return layoutValue(row);
  return (row.style as any)?.[key];
}

function rowChange(key: string, value: unknown) {
  const row = selectedRow.value;
  if (!row) return;
  if (key === LAYOUT_KEY) editor.setRowLayout(row.id, parseLayout(value));
  else editor.updateRowStyle(row.id, { [key]: value });
}

/* ─── Column panel ─── */
const selectedColumn = computed(() => {
  const sel = selection.value;
  if (sel?.kind !== "column") return null;
  for (const row of document.value.rows) for (const col of row.columns) if (col.id === sel.id) return col;
  return null;
});
const columnSchema = computed(() => columnGroups());
function columnValue(key: string): unknown {
  return (selectedColumn.value?.style as unknown as Record<string, unknown> | undefined)?.[key];
}
function columnChange(key: string, value: unknown) {
  const column = selectedColumn.value;
  if (column) editor.updateColumnStyle(column.id, { [key]: value });
}

/* A selection with nothing to show — a column that was removed, a block deleted while selected —
   gets an explanation instead of a blank panel. */
const showEmpty = computed(
  () =>
    !!selectionKind.value &&
    selectionKind.value !== "settings" &&
    !selectedBlock.value &&
    !selectedRow.value &&
    !selectedColumn.value,
);

/* ─── Settings panel ─── */
const settings = computed(() => document.value.settings);

function updateSettings(changes: Record<string, unknown>) {
  editor.updateSettings(changes);
}

const isPaddingLinked = ref(true);

function updatePadding(side: "top" | "right" | "bottom" | "left", val: number) {
  const current = (settings.value as any)?.padding || { top: 24, right: 24, bottom: 24, left: 24 };
  if (isPaddingLinked.value) {
    updateSettings({ padding: { top: val, right: val, bottom: val, left: val } });
  } else {
    updateSettings({ padding: { ...current, [side]: val } });
  }
}

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

function deselect() {
  editor.select(null);
}
</script>

<template>
  <aside class="builder-inspector" :aria-label="t('inspector.label')">
    <!-- Email Settings Header (when nothing selected or settings) -->
    <header v-if="!selectionKind || selectionKind === 'settings'" class="builder-inspector__header">
      <div class="builder-inspector__header-title">
        <span class="builder-inspector__header-icon">
          <EbGlyph name="tune" />
        </span>
        <div>
          <span class="builder-inspector__title-main">Email Settings</span>
          <span class="builder-inspector__title-sub">Global styles &amp; frame</span>
        </div>
      </div>
    </header>

    <!-- Block Header -->
    <header v-else-if="selectionKind === 'block' && selectedBlock" class="builder-inspector__header">
      <div class="builder-inspector__header-title">
        <span class="builder-inspector__header-icon">
          <EbGlyph :name="ICONS_MAP[selectedBlock.type] || 'widgets'" />
        </span>
        <div>
          <span class="builder-inspector__title-main">
            {{ editor.blocks.get(selectedBlock.type)?.label || selectedBlock.type }}
          </span>
          <span class="builder-inspector__title-sub">Block properties</span>
        </div>
      </div>
      <button
        type="button"
        class="builder-inspector__nav-btn"
        :title="t('inspector.back')"
        @click="deselect"
      >
        <EbGlyph name="arrow_back" />
        <span>All Settings</span>
      </button>
    </header>

    <!-- Row Header -->
    <header v-else-if="selectionKind === 'row' && selectedRow" class="builder-inspector__header">
      <div class="builder-inspector__header-title">
        <span class="builder-inspector__header-icon">
          <EbGlyph name="table_rows" />
        </span>
        <div>
          <span class="builder-inspector__title-main">Row Settings</span>
          <span class="builder-inspector__title-sub">Columns &amp; layout</span>
        </div>
      </div>
      <button
        type="button"
        class="builder-inspector__nav-btn"
        :title="t('inspector.back')"
        @click="deselect"
      >
        <EbGlyph name="arrow_back" />
        <span>All Settings</span>
      </button>
    </header>

    <!-- Column Header -->
    <header v-else-if="selectionKind === 'column' && selectedColumn" class="builder-inspector__header">
      <div class="builder-inspector__header-title">
        <span class="builder-inspector__header-icon">
          <EbGlyph name="view_column" />
        </span>
        <div>
          <span class="builder-inspector__title-main">{{ t("inspector.columnTitle") }}</span>
          <span class="builder-inspector__title-sub">{{ t("inspector.columnSub") }}</span>
        </div>
      </div>
      <button type="button" class="builder-inspector__nav-btn" :title="t('inspector.back')" @click="deselect">
        <EbGlyph name="arrow_back" />
        <span>{{ t("inspector.allSettings") }}</span>
      </button>
    </header>

    <!-- Inspector Scroll Body -->
    <div class="builder-inspector__scroll">
      <!-- ─── Global Email Settings ─── -->
      <template v-if="!selectionKind || selectionKind === 'settings'">
        <!-- Canvas Quick Tips -->
        <div class="inspector-legend">
          <div class="inspector-legend__header">
            <EbGlyph name="lightbulb" class="inspector-legend__header-icon" />
            <span class="inspector-legend__header-title">Canvas Quick Tips</span>
          </div>
          <div class="inspector-legend__items">
            <div class="inspector-legend__item">
              <span class="inspector-legend__item-badge">
                <EbGlyph name="widgets" />
              </span>
              <span>Click any block to customize its text, styling &amp; colors</span>
            </div>
            <div class="inspector-legend__item">
              <span class="inspector-legend__item-badge">
                <EbGlyph name="table_rows" />
              </span>
              <span>Click outer space around content to edit row layout</span>
            </div>
          </div>
        </div>

        <!-- Brand Section -->
        <details class="eb-group" open>
          <summary class="eb-group__header">
            Brand
            <EbGlyph name="expand_more" style="font-size: 18px;" />
          </summary>
          <div class="eb-group__body" style="display: flex; flex-direction: column; gap: 14px; padding: 12px 16px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: var(--eb-text-secondary);">Font</label>
              <select
                :value="settings.fontFamily || GLOBAL_FONTS[0]!.value"
                style="width: 100%; height: 36px; border: 1px solid var(--eb-border); border-radius: 6px; padding: 0 10px; font-size: 13px; background: var(--eb-surface);"
                @change="updateSettings({ fontFamily: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="f in GLOBAL_FONTS" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
              <span style="display: block; font-size: 11px; color: var(--eb-text-subtle); margin-top: 4px;">
                Web-safe fonts only — custom fonts do not render in Outlook.
              </span>
            </div>

            <!-- Text Colour -->
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--eb-text-secondary);">Text colour</label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input
                  type="color"
                  :value="settings.textColor || '#333333'"
                  style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--eb-border); padding: 0; cursor: pointer;"
                  @input="updateSettings({ textColor: ($event.target as HTMLInputElement).value })"
                />
                <input
                  type="text"
                  :value="settings.textColor || '#333333'"
                  style="flex: 1; height: 32px; border: 1px solid var(--eb-border); border-radius: 6px; padding: 0 8px; font-family: monospace; font-size: 12px;"
                  @change="updateSettings({ textColor: ($event.target as HTMLInputElement).value })"
                />
              </div>
              <div style="display: flex; gap: 6px; margin-top: 8px;">
                <button
                  v-for="c in TEXT_COLORS"
                  :key="c"
                  type="button"
                  :style="{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: '1px solid color-mix(in srgb, var(--eb-shadow-color) 10%, transparent)',
                    cursor: 'pointer'
                  }"
                  @click="updateSettings({ textColor: c })"
                />
              </div>
            </div>

            <!-- Link Colour -->
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--eb-text-secondary);">Link colour</label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input
                  type="color"
                  :value="settings.linkColor || '#0066cc'"
                  style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--eb-border); padding: 0; cursor: pointer;"
                  @input="updateSettings({ linkColor: ($event.target as HTMLInputElement).value })"
                />
                <input
                  type="text"
                  :value="settings.linkColor || '#0066cc'"
                  style="flex: 1; height: 32px; border: 1px solid var(--eb-border); border-radius: 6px; padding: 0 8px; font-family: monospace; font-size: 12px;"
                  @change="updateSettings({ linkColor: ($event.target as HTMLInputElement).value })"
                />
              </div>
              <div style="display: flex; gap: 6px; margin-top: 8px;">
                <button
                  v-for="c in LINK_COLORS"
                  :key="c"
                  type="button"
                  :style="{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: '1px solid color-mix(in srgb, var(--eb-shadow-color) 10%, transparent)',
                    cursor: 'pointer'
                  }"
                  @click="updateSettings({ linkColor: c })"
                />
              </div>
            </div>
          </div>
        </details>

        <!-- Background Section -->
        <details class="eb-group">
          <summary class="eb-group__header">
            Background
            <EbGlyph name="expand_more" style="font-size: 18px;" />
          </summary>
          <div class="eb-group__body" style="display: flex; flex-direction: column; gap: 12px; padding: 12px 16px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--eb-text-secondary);">Page background</label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input
                  type="color"
                  :value="settings.backgroundColor || '#f4f4f5'"
                  style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--eb-border); padding: 0; cursor: pointer;"
                  @input="updateSettings({ backgroundColor: ($event.target as HTMLInputElement).value })"
                />
                <input
                  type="text"
                  :value="settings.backgroundColor || '#f4f4f5'"
                  style="flex: 1; height: 32px; border: 1px solid var(--eb-border); border-radius: 6px; padding: 0 8px; font-family: monospace; font-size: 12px;"
                  @change="updateSettings({ backgroundColor: ($event.target as HTMLInputElement).value })"
                />
              </div>
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--eb-text-secondary);">Email background</label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input
                  type="color"
                  :value="settings.contentBackgroundColor || '#ffffff'"
                  style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--eb-border); padding: 0; cursor: pointer;"
                  @input="updateSettings({ contentBackgroundColor: ($event.target as HTMLInputElement).value })"
                />
                <input
                  type="text"
                  :value="settings.contentBackgroundColor || '#ffffff'"
                  style="flex: 1; height: 32px; border: 1px solid var(--eb-border); border-radius: 6px; padding: 0 8px; font-family: monospace; font-size: 12px;"
                  @change="updateSettings({ contentBackgroundColor: ($event.target as HTMLInputElement).value })"
                />
              </div>
            </div>
          </div>
        </details>

        <!-- Canvas Sizing & Width Section -->
        <details class="eb-group" open>
          <summary class="eb-group__header">
            Canvas Sizing &amp; Width
            <EbGlyph name="expand_more" style="font-size: 18px;" />
          </summary>
          <div class="eb-group__body" style="display: flex; flex-direction: column; gap: 14px; padding: 12px 16px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: var(--eb-text-secondary);">Width</label>
              <div style="display: flex; align-items: center; gap: 4px;">
                <input
                  type="number"
                  :value="settings.contentWidth || 600"
                  min="320"
                  max="800"
                  style="width: 100%; height: 36px; border: 1px solid var(--eb-border); border-radius: 6px; padding: 0 10px; font-size: 13px;"
                  @change="updateSettings({ contentWidth: Number(($event.target as HTMLInputElement).value) })"
                />
                <span style="font-size: 12px; color: var(--eb-text-muted); font-weight: 500;">px</span>
              </div>
              <span style="display: block; font-size: 11px; color: var(--eb-text-subtle); margin-top: 4px;">
                600px is what every email client agrees on. Change it only if you know why.
              </span>
            </div>

            <!-- Padding TRBL -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--eb-text-secondary);">Padding</label>
                <button
                  type="button"
                  :style="{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: isPaddingLinked ? 'var(--eb-accent)' : 'var(--eb-text-subtle)'
                  }"
                  :title="isPaddingLinked ? 'Unlink padding sides' : 'Link all padding sides'"
                  @click="isPaddingLinked = !isPaddingLinked"
                >
                  <EbGlyph :name="isPaddingLinked ? 'link' : 'link_off'" style="font-size: 16px;" />
                </button>
              </div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center;">
                <div>
                  <span style="font-size: 10px; color: var(--eb-text-subtle); display: block;">T</span>
                  <input
                    type="number"
                    :value="(settings as any)?.padding?.top ?? 24"
                    style="width: 100%; height: 32px; border: 1px solid var(--eb-border); border-radius: 6px; text-align: center; font-size: 12px;"
                    @change="updatePadding('top', Number(($event.target as HTMLInputElement).value))"
                  />
                </div>
                <div>
                  <span style="font-size: 10px; color: var(--eb-text-subtle); display: block;">R</span>
                  <input
                    type="number"
                    :value="(settings as any)?.padding?.right ?? 24"
                    style="width: 100%; height: 32px; border: 1px solid var(--eb-border); border-radius: 6px; text-align: center; font-size: 12px;"
                    @change="updatePadding('right', Number(($event.target as HTMLInputElement).value))"
                  />
                </div>
                <div>
                  <span style="font-size: 10px; color: var(--eb-text-subtle); display: block;">B</span>
                  <input
                    type="number"
                    :value="(settings as any)?.padding?.bottom ?? 24"
                    style="width: 100%; height: 32px; border: 1px solid var(--eb-border); border-radius: 6px; text-align: center; font-size: 12px;"
                    @change="updatePadding('bottom', Number(($event.target as HTMLInputElement).value))"
                  />
                </div>
                <div>
                  <span style="font-size: 10px; color: var(--eb-text-subtle); display: block;">L</span>
                  <input
                    type="number"
                    :value="(settings as any)?.padding?.left ?? 24"
                    style="width: 100%; height: 32px; border: 1px solid var(--eb-border); border-radius: 6px; text-align: center; font-size: 12px;"
                    @change="updatePadding('left', Number(($event.target as HTMLInputElement).value))"
                  />
                </div>
              </div>
            </div>
          </div>
        </details>
      </template>

      <!-- ─── Selected Block ─── -->
      <template v-else-if="selectionKind === 'block' && selectedBlock">
        <details
          v-for="group in blockSchema"
          :key="group.title"
          class="eb-group"
          open
        >
          <summary class="eb-group__header">
            {{ group.title }}
            <EbGlyph name="expand_more" style="font-size: 18px;" />
          </summary>
          <div class="eb-group__body">
            <!-- Paired fields (Size | Weight) share a two-column row; the rest are full width. -->
            <template v-for="(run, runIndex) in groupFields(group.fields)" :key="runIndex">
              <div v-if="run.inline" class="eb-field-row">
                <BuilderField
                  v-for="field in run.fields"
                  :key="field.key"
                  :field="field"
                  :value="blockValue(group, field.key)"
                  :block="selectedBlock"
                  @change="blockChange(group, field.key, $event)"
                />
              </div>
              <template v-else>
                <BuilderField
                  v-for="field in run.fields"
                  :key="field.key"
                  :field="field"
                  :value="blockValue(group, field.key)"
                  :block="selectedBlock"
                  @change="blockChange(group, field.key, $event)"
                />
              </template>
            </template>
          </div>
        </details>
      </template>

      <!-- ─── Selected Row ─── -->
      <template v-else-if="selectionKind === 'row' && selectedRow">
        <details
          v-for="group in rowSchema"
          :key="group.title"
          class="eb-group"
          :open="!group.collapsed"
        >
          <summary class="eb-group__header">
            {{ group.title }}
            <EbGlyph name="expand_more" style="font-size: 18px;" />
          </summary>
          <div class="eb-group__body">
            <BuilderField
              v-for="field in group.fields"
              :key="field.key"
              :field="field"
              :value="rowValue(field.key)"
              @change="rowChange(field.key, $event)"
            />
          </div>
        </details>
      </template>
      <!-- ─── Selected Column ─── -->
      <template v-else-if="selectionKind === 'column' && selectedColumn">
        <details v-for="group in columnSchema" :key="group.title" class="eb-group" :open="!group.collapsed">
          <summary class="eb-group__header">
            {{ group.title }}
            <EbGlyph name="expand_more" style="font-size: 18px;" />
          </summary>
          <div class="eb-group__body">
            <template v-for="(run, runIndex) in groupFields(group.fields)" :key="runIndex">
              <div v-if="run.inline" class="eb-field-row">
                <BuilderField
                  v-for="field in run.fields"
                  :key="field.key"
                  :field="field"
                  :value="columnValue(field.key)"
                  @change="columnChange(field.key, $event)"
                />
              </div>
              <template v-else>
                <BuilderField
                  v-for="field in run.fields"
                  :key="field.key"
                  :field="field"
                  :value="columnValue(field.key)"
                  @change="columnChange(field.key, $event)"
                />
              </template>
            </template>
          </div>
        </details>
      </template>

      <!-- ─── Nothing to edit ─── -->
      <div v-if="showEmpty" class="eb-inspector__empty" role="status">
        <span class="eb-inspector__empty-icon">
          <EbGlyph name="tune" />
        </span>
        <p class="eb-inspector__empty-title">{{ t("inspector.emptyTitle") }}</p>
        <p class="eb-inspector__empty-text">{{ t("inspector.empty") }}</p>
        <button type="button" class="eb-btn eb-btn--outline" @click="deselect">
          <EbGlyph name="arrow_back" />
          {{ t("inspector.back") }}
        </button>
      </div>
    </div>
  </aside>
</template>

