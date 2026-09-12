<script setup lang="ts">
/* ═══ BuilderRow ═══
 *
 * One row on the canvas matching Growtality:
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
import { useEditor } from "../context";
import { useEditorSelector } from "../composables";
import { vDrag, vDrop } from "../directives";
import BuilderColumn from "./BuilderColumn.vue";

const props = defineProps<{ row: Row; index: number }>();

const editor = useEditor();

const totalRows = useEditorSelector((state) => state.document.rows.length);
const selected = useEditorSelector(
  (state) => state.selection?.kind === "row" && state.selection.id === props.row.id,
);
const landed = useEditorSelector((state) => state.landedId === props.row.id);

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
    <!-- Left floating toolbar -->
    <div class="builder-row__toolbar" :aria-label="`Row ${index + 1} actions`">
      <button
        type="button"
        class="builder-row__grip"
        :aria-label="`Move row ${index + 1}`"
      >
        <span class="material-symbols-outlined" aria-hidden="true">drag_indicator</span>
      </button>

      <div class="builder-row__actions">
        <button
          type="button"
          class="builder-row__action"
          aria-label="Move row up"
          :disabled="index === 0"
          title="Move row up"
          @click.stop="moveRow(-1)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
        </button>
        <button
          type="button"
          class="builder-row__action"
          aria-label="Move row down"
          :disabled="index >= totalRows - 1"
          title="Move row down"
          @click.stop="moveRow(1)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span>
        </button>
        <button
          type="button"
          class="builder-row__action"
          aria-label="Change row layout"
          title="Change row layout"
          @click.stop="editor.select({ kind: 'row', id: row.id })"
        >
          <span class="material-symbols-outlined" aria-hidden="true">view_column</span>
        </button>
        <button
          type="button"
          class="builder-row__action"
          aria-label="Duplicate row"
          title="Duplicate row"
          @click.stop="editor.duplicateRow(row.id)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">content_copy</span>
        </button>
        <button
          type="button"
          class="builder-row__action builder-row__action--danger"
          aria-label="Delete row"
          title="Delete row"
          @click.stop="editor.removeRow(row.id)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">delete</span>
        </button>
      </div>
    </div>

    <div class="builder-row__columns">
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

