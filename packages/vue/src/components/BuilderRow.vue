<script setup lang="ts">
/* ═══ BuilderRow ═══
 *
 * One row on the canvas:
 * Left floating toolbar handle:
 *  - drag_indicator grip
 *  - arrow_upward (move up)
 *  - arrow_downward (move down)
 *  - view_column (edit layout)
 *  - content_copy (duplicate)
 *  - delete (delete row)
 */

import { computed } from "vue";
import type { Row } from "@email-builder/core";
import { useEditor, useTranslator } from "../context";
import { useDragState, useEditorSelector } from "../composables";
import { vDrag, vDrop } from "../directives";
import BuilderColumn from "./BuilderColumn.vue";
import EbGlyph from "./EbGlyph.vue";
import { rowCanvasStyle } from "@email-builder/engine";

const props = defineProps<{ row: Row; index: number }>();

const editor = useEditor();

const t = useTranslator(editor);
const totalRows = useEditorSelector((state) => state.document.rows.length);
const selected = useEditorSelector(
  (state) => state.selection?.kind === "row" && state.selection.id === props.row.id,
);
const landed = useEditorSelector((state) => state.landedId === props.row.id);

const dragState = useDragState();
const isOver = computed(() => {
  const over = dragState.value.over;
  return over?.kind === "row" && (over as any).rowId === props.row.id;
});
const edge = computed(() => {
  if (!isOver.value) return null;
  return dragState.value.indicator?.edge ?? "inside";
});

const classes = computed(() =>
  [
    "builder-row",
    selected.value ? "builder-row--selected" : "",
    landed.value ? "builder-row--landed" : "",
  ]
    .filter(Boolean)
    .join(" "),
);

function moveRow(dir: number) {
  const target = props.index + dir;
  if (target >= 0 && target < totalRows.value) {
    editor.moveRow(props.row.id, target);
  }
}
</script>

<template>
  <div
    v-drag="{ editor, data: { kind: 'row', rowId: row.id } }"
    v-drop="{ editor, data: { kind: 'row', rowId: row.id, index }, orientation: 'vertical' }"
    :class="classes"
    @click.stop="editor.select({ kind: 'row', id: row.id })"
  >
    <div
      v-if="isOver"
      :class="['builder-drop-indicator builder-drop-indicator--row', edge === 'after' ? 'builder-drop-indicator--end' : '']"
    >
      <div class="builder-drop-indicator__line" />
      <span class="builder-drop-indicator__pip builder-drop-indicator__pip--left" />
      <span class="builder-drop-indicator__pill">
        <EbGlyph name="add" style="font-size: 13px; margin-right: 4px;" />
        {{ t(edge === 'after' ? 'row.insertBelow' : 'row.insertAbove') }}
      </span>
      <span class="builder-drop-indicator__pip builder-drop-indicator__pip--right" />
    </div>

    <!-- Left floating toolbar -->
    <div class="builder-row__toolbar" :aria-label="`Row ${index + 1} actions`">
      <button
        type="button"
        class="builder-row__grip"
        :aria-label="`Move row ${index + 1}`"
      >
        <EbGlyph name="drag_indicator" />
      </button>

      <div class="builder-row__actions">
        <button
          type="button"
          class="builder-row__action"
          :aria-label="t('row.moveUp')"
          :disabled="index === 0"
          :title="t('row.moveUp')"
          @click.stop="moveRow(-1)"
        >
          <EbGlyph name="arrow_upward" />
        </button>
        <button
          type="button"
          class="builder-row__action"
          :aria-label="t('row.moveDown')"
          :disabled="index >= totalRows - 1"
          :title="t('row.moveDown')"
          @click.stop="moveRow(1)"
        >
          <EbGlyph name="arrow_downward" />
        </button>
        <button
          type="button"
          class="builder-row__action"
          :aria-label="t('row.layout')"
          :title="t('row.layout')"
          @click.stop="editor.select({ kind: 'row', id: row.id })"
        >
          <EbGlyph name="view_column" />
        </button>
        <button
          type="button"
          class="builder-row__action"
          :aria-label="t('row.duplicate')"
          :title="t('row.duplicate')"
          @click.stop="editor.duplicateRow(row.id)"
        >
          <EbGlyph name="content_copy" />
        </button>
        <button
          type="button"
          class="builder-row__action builder-row__action--danger"
          :aria-label="t('row.delete')"
          :title="t('row.delete')"
          @click.stop="editor.removeRow(row.id)"
        >
          <EbGlyph name="delete" />
        </button>
      </div>
    </div>

    <div class="builder-row__columns" :style="rowCanvasStyle(row.style)">
      <BuilderColumn
        v-for="(column, ci) in row.columns"
        :key="column.id"
        :row="row"
        :column="column"
        :column-index="ci"
      />
    </div>
  </div>
</template>

