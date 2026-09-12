<script setup lang="ts">
/* ═══ BuilderBlock ═══
 *
 * A block on the canvas matching Growtality:
 * Floating action bar:
 *  - Label: Image, Heading, etc.
 *  - drag_indicator
 *  - arrow_upward
 *  - arrow_downward
 *  - content_copy
 *  - delete
 */

import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { columnWidths } from "@email-builder/core";
import type { Block, Column, Row } from "@email-builder/core";
import { useEditor, useTranslator } from "../context";
import { useEditorSelector } from "../composables";
import { compileBlockPreview } from "../preview";
import { vDrag, vDrop } from "../directives";

const props = defineProps<{ block: Block; row: Row; column: Column; columnIndex: number }>();

const editor = useEditor();
const t = useTranslator(editor);

const definition = computed(() => editor.blocks.get(props.block.type));

const selected = useEditorSelector(
  (state) => state.selection?.kind === "block" && state.selection.id === props.block.id,
);
const landed = useEditorSelector((state) => state.landedId === props.block.id);
const editing = useEditorSelector((state) => state.editingBlockId === props.block.id);
const settings = useEditorSelector((state) => state.document.settings);

const blockIndex = computed(() => props.column.blocks.findIndex((b) => b.id === props.block.id));
const totalBlocks = computed(() => props.column.blocks.length);

function moveBlock(dir: number) {
  const target = blockIndex.value + dir;
  if (target >= 0 && target < totalBlocks.value) {
    editor.moveBlock(props.block.id, props.column.id, target);
  }
}

const html = computed(() => {
  const widths = columnWidths(props.row, settings.value.contentWidth);
  const columnWidth = widths[props.columnIndex] ?? settings.value.contentWidth;
  const padding = props.column.style.padding;
  const width = Math.max(0, columnWidth - (padding?.left ?? 0) - (padding?.right ?? 0));
  return compileBlockPreview({ editor, block: props.block, settings: settings.value, width });
});

const classes = computed(() =>
  [
    "builder-block",
    selected.value ? "builder-block--selected" : "",
    landed.value ? "builder-block--landed" : "",
    editing.value ? "builder-block--editing" : "",
  ]
    .filter(Boolean)
    .join(" "),
);

/* ── Inline editing ── */
const renderEl = ref<HTMLElement | null>(null);
let inlineCleanup: (() => void) | null = null;

function startInline() {
  const key = definition.value?.inlineEditKey;
  if (!key || !renderEl.value) return;
  const host = renderEl.value;
  const marked = host.querySelector<HTMLElement>("[data-eb-inline]");
  const cell = host.querySelector("td");
  const first = cell?.firstElementChild;
  const target = marked ?? (first instanceof HTMLElement ? first : null);
  if (!target) { editor.endInlineEdit(); return; }

  target.setAttribute("data-eb-inline", "");
  target.contentEditable = "true";
  target.focus();

  const commit = () => {
    editor.updateContent(props.block.id, { [key]: target.innerHTML }, "inline");
    editor.endInlineEdit();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault(); e.stopPropagation();
    commit();
  };
  target.addEventListener("blur", commit);
  target.addEventListener("keydown", onKeyDown);
  inlineCleanup = () => {
    target.removeEventListener("blur", commit);
    target.removeEventListener("keydown", onKeyDown);
    target.contentEditable = "false";
    target.removeAttribute("data-eb-inline");
  };
}

watch(editing, (isEditing) => {
  if (inlineCleanup) { inlineCleanup(); inlineCleanup = null; }
  if (isEditing) startInline();
});

onUnmounted(() => { inlineCleanup?.(); });
</script>

<template>
  <div
    v-drag="{ editor, data: { kind: 'block', blockId: block.id, columnId: column.id } }"
    v-drop="{
      editor,
      data: { kind: 'block', blockId: block.id, columnId: column.id },
      orientation: 'vertical'
    }"
    :class="classes"
    :aria-selected="selected"
    @click.stop="editor.select({ kind: 'block', id: block.id })"
    @dblclick="definition?.inlineEditKey && editor.beginInlineEdit(block.id)"
  >
    <!-- Floating Toolbar -->
    <div class="builder-block__toolbar" data-eb-no-drag>
      <span class="builder-block__label">{{ definition?.label ?? block.type }}</span>

      <button
        type="button"
        class="builder-block__action"
        aria-label="Move block"
        title="Move block"
      >
        <span class="material-symbols-outlined" aria-hidden="true">drag_indicator</span>
      </button>

      <button
        type="button"
        class="builder-block__action"
        aria-label="Move block up"
        :disabled="blockIndex === 0"
        title="Move block up"
        @click.stop="moveBlock(-1)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
      </button>

      <button
        type="button"
        class="builder-block__action"
        aria-label="Move block down"
        :disabled="blockIndex >= totalBlocks - 1"
        title="Move block down"
        @click.stop="moveBlock(1)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span>
      </button>

      <button
        type="button"
        class="builder-block__action"
        aria-label="Duplicate block"
        title="Duplicate block"
        @click.stop="editor.duplicateBlock(block.id)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">content_copy</span>
      </button>

      <button
        type="button"
        class="builder-block__action builder-block__action--danger"
        aria-label="Delete block"
        title="Delete block"
        @click.stop="editor.removeBlock(block.id)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">delete</span>
      </button>
    </div>

    <div ref="renderEl" class="eb-block__render" v-html="html" />
  </div>
</template>
