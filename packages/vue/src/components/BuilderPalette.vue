<script setup lang="ts">
/* ═══ BuilderPalette ═══
 *
 * Left rail matching Growtality:
 * - Two top tabs: Blocks and Structure
 * - Under Blocks:
 *   - Layouts (6 visual cards with column span bars)
 *   - Dynamically grouped generic blocks (Content, Layout, etc.)
 * - Under Structure:
 *   - Tree view of document rows and columns
 */

import { computed, ref } from "vue";
import { useEditor } from "../context";
import { useEditorSelector } from "../composables";
import { vDrag } from "../directives";

const props = defineProps<{ class?: string }>();

const editor = useEditor();

const document = useEditorSelector((state) => state.document);
const selection = useEditorSelector((state) => state.selection);

const activeTab = ref<"blocks" | "structure">("blocks");

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

const blockGroups = computed(() => {
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
  <aside class="builder-palette" aria-label="Palette">
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
            <h3 class="palette-group__title">Layouts</h3>
            <span class="palette-group__count">{{ ROW_LAYOUTS.length }}</span>
          </div>
          <div class="palette-layouts">
            <button
              v-for="item in ROW_LAYOUTS"
              :key="item.layout"
              type="button"
              class="palette-layout"
              :title="`Add ${item.label} row`"
              @click="onAddRow(item.spans)"
            >
              <div class="palette-layout__preview">
                <span
                  v-for="(span, sIndex) in item.spans"
                  :key="sIndex"
                  class="palette-layout__col"
                  :style="{ flex: span }"
                />
              </div>
              <span class="palette-layout__label">{{ item.label }}</span>
            </button>
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
            <button
              v-for="b in grp.blocks"
              :key="b.type"
              v-drag="{ editor, data: { kind: 'palette', blockType: b.type } }"
              type="button"
              class="palette-block"
              :aria-label="`Add ${b.label} block`"
              @click="addBlock(b.type)"
            >
              <span class="palette-block__icon">
                <span class="material-symbols-outlined" aria-hidden="true">{{ b.icon }}</span>
              </span>
              <span class="palette-block__label">{{ b.label }}</span>
            </button>
          </div>
        </section>
      </template>

      <!-- Structure Tab -->
      <template v-else>
        <div class="structure-tree">
          <div
            v-for="(row, rIndex) in document.rows"
            :key="row.id"
            :class="['structure-row', selection?.kind === 'row' && selection.id === row.id ? 'structure-row--selected' : '']"
            @click="editor.select({ kind: 'row', id: row.id })"
          >
            <div class="structure-row__header">
              <span class="material-symbols-outlined" aria-hidden="true">table_rows</span>
              <span>Row {{ rIndex + 1 }}</span>
              <span class="structure-row__badge">{{ row.columns.length }} col</span>
            </div>

            <div class="structure-row__columns">
              <div
                v-for="(col, cIndex) in row.columns"
                :key="col.id"
                class="structure-column"
              >
                <div
                  :class="['structure-column__header', selection?.kind === 'column' && selection.id === col.id ? 'structure-column--selected' : '']"
                  @click.stop="editor.select({ kind: 'column', id: col.id })"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">view_column</span>
                  <span>Column {{ cIndex + 1 }}</span>
                  <span class="structure-column__badge">{{ col.blocks.length }}</span>
                </div>

                <div v-if="col.blocks.length > 0" class="structure-column__blocks">
                  <div
                    v-for="b in col.blocks"
                    :key="b.id"
                    :class="['structure-block', selection?.kind === 'block' && selection.id === b.id ? 'structure-block--selected' : '']"
                    @click.stop="editor.select({ kind: 'block', id: b.id })"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">
                      {{ BUILTIN_ICONS[b.type] || 'widgets' }}
                    </span>
                    <span>{{ editor.blocks.get(b.type)?.label || b.type }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>
