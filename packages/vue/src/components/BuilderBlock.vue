<script setup lang="ts">
/* ═══ BuilderBlock ═══
 *
 * A block on the canvas:
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
import type { Block, Column, MergeField, Row } from "@email-builder/core";
import { useEditor, useTranslator } from "../context";
import { useDragState, useEditorSelector } from "../composables";
import { compileBlockPreview } from "../preview";
import { vDrag, vDrop } from "../directives";
import MentionMenu from "./MentionMenu.vue";

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

const dragState = useDragState(editor);
const isOver = computed(() => {
  const over = dragState.value.over;
  return over?.kind === "block" && (over as any).blockId === props.block.id;
});
const edge = computed(() => {
  if (!isOver.value) return null;
  return dragState.value.indicator?.edge ?? "inside";
});

const blockIndex = computed(() =>
  props.column.blocks.findIndex((b) => b.id === props.block.id),
);
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
    "eb-block",
    selected.value ? "builder-block--selected eb-block--selected" : "",
    landed.value ? "builder-block--landed eb-block--landed" : "",
    editing.value ? "builder-block--editing eb-block--editing" : "",
  ]
    .filter(Boolean)
    .join(" "),
);

/* ── Inline editing & @ Mention State ── */
const renderEl = ref<HTMLElement | null>(null);
const currentTarget = ref<HTMLElement | null>(null);
let inlineCleanup: (() => void) | null = null;

const mentionState = ref<{
  open: boolean;
  coords: { top: number; left: number };
  query: string;
  atIndex: number;
  textNode: Node | null;
}>({
  open: false,
  coords: { top: 0, left: 0 },
  query: "",
  atIndex: -1,
  textNode: null,
});

function onClickBlock() {
  editor.select({ kind: "block", id: props.block.id });
  if (definition.value?.inlineEditKey) {
    editor.beginInlineEdit(props.block.id);
  }
}

function checkMention(target: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) {
    if (mentionState.value.open) mentionState.value.open = false;
    return;
  }
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) {
    if (mentionState.value.open) mentionState.value.open = false;
    return;
  }

  const text = node.textContent ?? "";
  const offset = range.startOffset;
  const textBefore = text.slice(0, offset);
  const atIndex = textBefore.lastIndexOf("@");
  if (atIndex === -1) {
    if (mentionState.value.open) mentionState.value.open = false;
    return;
  }

  const query = textBefore.slice(atIndex + 1);
  if (/[\s\n\r]/.test(query)) {
    if (mentionState.value.open) mentionState.value.open = false;
    return;
  }

  let coords = { top: 0, left: 0 };
  try {
    const cloneRange = range.cloneRange();
    cloneRange.setStart(node, atIndex);
    cloneRange.setEnd(node, offset);
    const rect = cloneRange.getBoundingClientRect();
    if (rect && rect.top > 0) {
      coords = { top: rect.bottom, left: rect.left };
    } else {
      const tRect = target.getBoundingClientRect();
      coords = { top: tRect.bottom, left: tRect.left + 20 };
    }
  } catch {
    const tRect = target.getBoundingClientRect();
    coords = { top: tRect.bottom, left: tRect.left + 20 };
  }

  mentionState.value = {
    open: true,
    coords,
    query,
    atIndex,
    textNode: node,
  };
}

function startInline() {
  const key = definition.value?.inlineEditKey;
  if (!key || !renderEl.value) return;
  const host = renderEl.value;
  const marked = host.querySelector<HTMLElement>("[data-eb-inline]");
  const cell = host.querySelector("td");
  const first = cell?.firstElementChild;
  const target = marked ?? (first instanceof HTMLElement ? first : null);
  if (!target) {
    editor.endInlineEdit();
    return;
  }
  currentTarget.value = target;

  target.setAttribute("data-eb-inline", "");
  target.contentEditable = "true";
  if (document.activeElement !== target) {
    target.focus();
  }

  const commit = () => {
    const isHeading = props.block.type === "heading";
    const val = isHeading ? (target.innerText || target.textContent || "") : target.innerHTML;
    editor.updateContent(props.block.id, { [key]: val }, "inline");
    editor.endInlineEdit();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (mentionState.value.open) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === "Tab"
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        mentionState.value.open = false;
        return;
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      commit();
    }
  };

  const onInput = () => {
    checkMention(target);
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      checkMention(target);
    }
  };

  const onBlur = (e: FocusEvent) => {
    if ((e.relatedTarget as HTMLElement)?.closest?.(".eb-mention-menu")) return;
    if (mentionState.value.open) return;
    commit();
  };

  target.addEventListener("blur", onBlur);
  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("input", onInput);
  target.addEventListener("keyup", onKeyUp);

  inlineCleanup = () => {
    target.removeEventListener("blur", onBlur);
    target.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("input", onInput);
    target.removeEventListener("keyup", onKeyUp);
    target.contentEditable = "false";
    target.removeAttribute("data-eb-inline");
    currentTarget.value = null;
  };
}

function handleSelectMention(field: MergeField) {
  const key = definition.value?.inlineEditKey;
  const state = mentionState.value;
  const target = currentTarget.value;
  if (!state.open || !state.textNode || !target || !key) return;

  const formatted = editor.merge ? editor.merge.format(field.token) : `{{${field.token}}}`;

  const textNode = state.textNode;
  const fullText = textNode.textContent ?? "";
  const before = fullText.slice(0, state.atIndex);
  const after = fullText.slice(state.atIndex + 1 + state.query.length);
  const newText = before + formatted + " " + after;
  textNode.textContent = newText;

  // Move caret after inserted token
  const sel = window.getSelection();
  if (sel) {
    try {
      const newRange = document.createRange();
      const newOffset = Math.min(before.length + formatted.length + 1, textNode.textContent.length);
      newRange.setStart(textNode, newOffset);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } catch {
      // Fallback
    }
  }

  // Save content change to editor
  const isHeading = props.block.type === "heading";
  const val = isHeading ? (target.innerText || target.textContent || "") : target.innerHTML;
  editor.updateContent(props.block.id, { [key]: val }, "inline");

  mentionState.value.open = false;
  target.focus();
}

function handleCloseMention() {
  mentionState.value.open = false;
  currentTarget.value?.focus();
}

watch(editing, (isEditing) => {
  if (inlineCleanup) {
    inlineCleanup();
    inlineCleanup = null;
  }
  if (isEditing) startInline();
});

onUnmounted(() => {
  inlineCleanup?.();
});
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
    @click.stop="onClickBlock"
    @dblclick="definition?.inlineEditKey && editor.beginInlineEdit(block.id)"
  >
    <div
      v-if="isOver"
      :class="['builder-drop-indicator', edge === 'after' ? 'builder-drop-indicator--end' : '']"
    >
      <div class="builder-drop-indicator__line" />
      <span class="builder-drop-indicator__pip builder-drop-indicator__pip--left" />
      <span class="builder-drop-indicator__pill">
        <span class="material-symbols-outlined" style="font-size: 13px; margin-right: 4px;">add</span>
        Drop block {{ edge === 'after' ? 'below' : 'above' }}
      </span>
      <span class="builder-drop-indicator__pip builder-drop-indicator__pip--right" />
    </div>

    <!-- Floating Toolbar -->
    <div class="builder-block__toolbar eb-block__toolbar" data-eb-no-drag>
      <span class="builder-block__label eb-block__label">{{ definition?.label ?? block.type }}</span>

      <button
        type="button"
        class="builder-block__action eb-block__toolbar-btn eb-block__toolbar-btn--drag"
        aria-label="Move block"
        title="Move block"
      >
        <span class="material-symbols-outlined" aria-hidden="true">drag_indicator</span>
      </button>

      <button
        type="button"
        class="builder-block__action eb-block__toolbar-btn"
        aria-label="Move block up"
        :disabled="blockIndex === 0"
        title="Move block up"
        @click.stop="moveBlock(-1)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
      </button>

      <button
        type="button"
        class="builder-block__action eb-block__toolbar-btn"
        aria-label="Move block down"
        :disabled="blockIndex >= totalBlocks - 1"
        title="Move block down"
        @click.stop="moveBlock(1)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span>
      </button>

      <button
        type="button"
        class="builder-block__action eb-block__toolbar-btn"
        aria-label="Duplicate block"
        title="Duplicate block"
        @click.stop="editor.duplicateBlock(block.id)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">content_copy</span>
      </button>

      <button
        type="button"
        class="builder-block__action eb-block__toolbar-btn builder-block__action--danger eb-block__toolbar-btn--danger"
        aria-label="Delete block"
        title="Delete block"
        @click.stop="editor.removeBlock(block.id)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">delete</span>
      </button>
    </div>

    <div ref="renderEl" class="eb-block__render" v-html="html" />

    <MentionMenu
      v-if="mentionState.open"
      :editor="editor"
      :coords="mentionState.coords"
      :query="mentionState.query"
      @select="handleSelectMention"
      @close="handleCloseMention"
    />
  </div>
</template>
