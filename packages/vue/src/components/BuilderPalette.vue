<script setup lang="ts">
/* ═══ BuilderPalette ═══
 *
 * Left rail palette:
 * - Two top tabs: Blocks and Structure
 * - Under Blocks:
 *   - Layouts (6 visual cards with column span bars)
 *   - Dynamically grouped generic blocks (Content, Layout, etc.)
 * - Under Structure:
 *   - Tree view of document rows and columns
 */

import { computed, ref } from "vue";
import { useEditor, useTranslator } from "../context";
import { useEditorSelector } from "../composables";
import { vDrag } from "../directives";
import EbGlyph from "./EbGlyph.vue";
import { selectFromClick } from "@email-builder/engine";

const props = defineProps<{ class?: string }>();

const editor = useEditor();
const t = useTranslator(editor);

const document = useEditorSelector((state) => state.document);
const selection = useEditorSelector((state) => state.selection);
const selectedIds = useEditorSelector((state) => state.selectedIds);

function isSelected(kind: "row" | "block", id: string) {
  return selection.value?.kind === kind && (selection.value.id === id || selectedIds.value.includes(id));
}

const activeTab = ref<"blocks" | "structure">("blocks");

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

const blockGroups = computed(() => {
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
});

function onAddRow(spans: number[]) {
  editor.addRow(spans);
}

function addBlock(type: string) {
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

  const newBlock = editor.blocks.create(type);
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
</script>

<template>
  <aside class="builder-palette" :aria-label="t('palette.label')">
    <!-- Palette Tabs -->
    <div
      class="builder-palette__tabs"
      role="tablist"
      :style="{ '--tab-count': 2, '--tab-index': activeTab === 'blocks' ? 0 : 1 }"
    >
      <span class="builder-palette__tab-pill" aria-hidden="true" />
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'blocks'"
        :class="['builder-palette__tab', activeTab === 'blocks' ? 'builder-palette__tab--active' : '']"
        @click="activeTab = 'blocks'"
      >
        Blocks
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'structure'"
        :class="['builder-palette__tab', activeTab === 'structure' ? 'builder-palette__tab--active' : '']"
        @click="activeTab = 'structure'"
      >
        Structure
      </button>
    </div>

    <div class="builder-palette__scroll">
      <!-- Blocks Tab -->
      <template v-if="activeTab === 'blocks'">
        <!-- LAYOUTS Section -->
        <section class="palette-group">
          <div class="palette-group__header">
            <h3 class="palette-group__title">Row Layouts</h3>
            <span class="palette-group__count">{{ ROW_LAYOUTS.length }}</span>
          </div>
          <div class="palette-layouts">
            <div
              v-for="item in ROW_LAYOUTS"
              :key="item.layout"
              v-drag="{ editor, data: { kind: 'palette-row', spans: item.spans, label: item.label } }"
              role="button"
              tabindex="0"
              class="palette-layout"
              :title="`Add or drag ${item.label} row`"
              @click="onAddRow(item.spans)"
              @keydown.enter.prevent="onAddRow(item.spans)"
              @keydown.space.prevent="onAddRow(item.spans)"
            >
              <div class="palette-layout__preview" aria-hidden="true">
                <span
                  v-for="(span, sIndex) in item.spans"
                  :key="sIndex"
                  class="palette-layout__cell"
                  :style="{ flex: span }"
                />
              </div>
              <span class="palette-layout__label">{{ item.label }}</span>
            </div>
          </div>
        </section>

        <!-- Dynamically Grouped Blocks -->
        <section
          v-for="grp in blockGroups"
          :key="grp.key"
          class="palette-group"
        >
          <div class="palette-group__header">
            <h3 class="palette-group__title">{{ grp.label }}</h3>
            <span class="palette-group__count">{{ grp.blocks.length }}</span>
          </div>
          <div class="palette-blocks">
            <div
              v-for="b in grp.blocks"
              :key="b.type"
              v-drag="{ editor, data: { kind: 'palette', blockType: b.type } }"
              role="button"
              tabindex="0"
              class="palette-block"
              :aria-label="`Add ${b.label} block`"
              @click="addBlock(b.type)"
              @keydown.enter.prevent="addBlock(b.type)"
              @keydown.space.prevent="addBlock(b.type)"
            >
              <span class="palette-block__icon-wrap">
                <span
                  v-if="b.icon && b.icon.trim().startsWith('<')"
                  class="palette-block__svg-host"
                  v-html="b.icon"
                />
                <EbGlyph :name="b.icon || BLOCK_ICONS[b.type] || 'widgets'" v-else />
              </span>
              <span class="palette-block__label">{{ b.label }}</span>
            </div>
          </div>
        </section>
      </template>

      <!-- Structure Tab -->
      <template v-else>
        <div class="structure-tree">
          <p v-if="document.rows.length === 0" class="structure-tree__empty">{{ t("structure.empty") }}</p>
          <div
            v-for="(row, rIndex) in document.rows"
            :key="row.id"
            :class="['structure-row', isSelected('row', row.id) ? 'structure-row--selected' : '']"
          >
            <button
              type="button"
              class="structure-row__header"
              :aria-pressed="isSelected('row', row.id)"
              @click="selectFromClick(editor, $event, { kind: 'row', id: row.id })"
            >
              <EbGlyph name="table_rows" />
              <span class="structure-row__title">{{ t("structure.row") }} {{ rIndex + 1 }}</span>
              <span class="structure-row__badge">
                {{ row.columns.length }} {{ row.columns.length === 1 ? t("structure.column") : t("structure.columns") }}
              </span>
            </button>

            <div class="structure-row__columns">
              <div v-for="(col, cIndex) in row.columns" :key="col.id" class="structure-column">
                <!-- A single-column row needs no column level: its blocks sit directly under the row. -->
                <button
                  v-if="row.columns.length > 1"
                  type="button"
                  :class="['structure-column__header', selection?.kind === 'column' && selection.id === col.id ? 'structure-column--selected' : '']"
                  :aria-pressed="selection?.kind === 'column' && selection.id === col.id"
                  @click="editor.select({ kind: 'column', id: col.id })"
                >
                  <EbGlyph name="view_column" />
                  <span class="structure-column__title">{{ t("structure.columnLabel") }} {{ cIndex + 1 }}</span>
                  <span class="structure-column__badge">{{ col.blocks.length }}</span>
                </button>

                <div :class="['structure-column__blocks', row.columns.length === 1 ? 'structure-column__blocks--flat' : '']">
                  <span v-if="col.blocks.length === 0" class="structure-block structure-block--empty">{{ t("structure.emptyColumn") }}</span>
                  <button
                    v-for="b in col.blocks"
                    v-else
                    :key="b.id"
                    type="button"
                    :class="['structure-block', isSelected('block', b.id) ? 'structure-block--selected' : '']"
                    :aria-pressed="isSelected('block', b.id)"
                    @click="selectFromClick(editor, $event, { kind: 'block', id: b.id })"
                  >
                    <EbGlyph :name="BLOCK_ICONS[b.type] || 'widgets'" />
                    <span class="structure-block__label">{{ editor.blocks.get(b.type)?.label || b.type }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>
