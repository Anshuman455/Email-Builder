<script setup lang="ts">
/* ═══ BuilderColumn ═══
 *
 * A droppable container. Columns take flex-basis from their fractional weight relative to the
 * row total so they narrow correctly in mobile preview. */

import { computed } from "vue";
import { columnWidths, type Column, type Row } from "@email-builder/core";
import { useEditor, useTranslator } from "../context";
import { useDragState, useEditorSelector } from "../composables";
import { vDrop } from "../directives";
import BuilderBlock from "./BuilderBlock.vue";

const props = defineProps<{ row: Row; column: Column; columnIndex: number }>();

const editor = useEditor();
const t = useTranslator(editor);

const selected = useEditorSelector(
  (state) => state.selection?.kind === "column" && state.selection.id === props.column.id,
);
const contentWidth = useEditorSelector((state) => state.document.settings.contentWidth);

/* Percentage flex-basis so the columns shrink together in mobile preview. */
const basis = computed(() => {
  const widths = columnWidths(props.row, contentWidth.value);
  const total = widths.reduce((s, w) => s + w, 0) || 1;
  return `${((widths[props.columnIndex] ?? total) / total) * 100}%`;
});

const empty = computed(() => props.column.blocks.length === 0);

const dragState = useDragState();

/* Track isOver via the engine's dnd state (DragState), not EditorState */
const isOver = computed(() => {
  const ds = dragState.value;
  return !!ds.active && ds.over?.kind === "column" && (ds.over as any).columnId === props.column.id;
});

const classes = computed(() =>
  [
    "eb-column",
    empty.value ? "eb-column--empty" : "",
    selected.value ? "eb-column--selected" : "",
    isOver.value ? "eb-column--over" : "",
  ]
    .filter(Boolean)
    .join(" "),
);
</script>

<template>
  <div
    v-drop="{
      editor,
      data: { kind: 'column', columnId: column.id, rowId: row.id },
      container: true
    }"
    :class="classes"
    :style="{ flex: `0 0 ${basis}`, maxWidth: basis }"
    @click.stop="editor.select({ kind: 'column', id: column.id })"
  >
    <div v-if="empty" :class="['builder-column__drop-zone', isOver ? 'builder-column__drop-zone--over' : '']">
      <span class="material-symbols-outlined" style="font-size: 16px;">add_circle</span>
      <span>{{ isOver ? "Drop block here" : (t('canvas.emptyColumn') || "Drop block here") }}</span>
    </div>
    <BuilderBlock
      v-for="(block, bi) in column.blocks"
      :key="block.id"
      :block="block"
      :row="row"
      :column="column"
      :column-index="columnIndex"
    />
  </div>
</template>
