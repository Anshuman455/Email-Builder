<script setup lang="ts">
/* ═══ EmailBuilder ═══
 *
 * The one component most hosts need. Builds the editor, provides context, mounts the full chrome
 * and handles keyboard shortcuts. Props are identical to the React counterpart (VIEW-CONTRACT.md).
 *
 * Emits: save, change, ready, select. */

import { onMounted, onUnmounted, ref, toRef, watch } from "vue";
import type { BlockDefinition, FontDefinition, MergeField, MergeSyntax } from "@email-builder/core";
import type { Adapter, ToolbarAction } from "@email-builder/engine";
import { provideEditor, provideTheme } from "../context";
import { useEmailBuilder } from "../composables";
import BuilderPalette from "./BuilderPalette.vue";
import BuilderCanvas from "./BuilderCanvas.vue";
import BuilderInspector from "./BuilderInspector.vue";
import BuilderPreview from "./BuilderPreview.vue";
import BuilderCodeView from "./BuilderCodeView.vue";
import DragLayer from "./DragLayer.vue";
import { isTypingTarget } from "../util";
import { handleEditorCopy, handleEditorPaste, loadFonts } from "@email-builder/engine";

const props = withDefaults(
  defineProps<{
    document?: unknown;
    blocks?: BlockDefinition[];
    excludeBlocks?: string[];
    mergeFields?: MergeField[];
    mergeSyntax?: MergeSyntax;
    /** Brand and web fonts, each with a web-safe fallback for clients that can't load them. */
    fonts?: FontDefinition[];
    adapter?: Adapter;
    mode?: string;
    theme?: "light" | "dark" | "auto";
    autosave?: { debounceMs?: number; maxWaitMs?: number; enabled?: boolean };
    showPalette?: boolean;
    showInspector?: boolean;
    showToolbar?: boolean;
    /** Extra icon buttons in the command bar — attachments, AI, anything. */
    toolbarActions?: ToolbarAction[];
    class?: string;
    /* Vue callback props */
    onSave?: (doc: unknown) => Promise<void> | void;
    onChange?: (doc: unknown) => void;
    onReady?: (editor: any) => void;
  }>(),
  {
    theme: "light",
    showPalette: true,
    showInspector: true,
    showToolbar: true,
  },
);

const emit = defineEmits<{
  save: [doc: unknown];
  change: [doc: unknown];
  ready: [editor: any];
  select: [selection: any];
}>();

const editor = useEmailBuilder({
  document: props.document,
  blocks: props.blocks,
  excludeBlocks: props.excludeBlocks,
  mergeFields: props.mergeFields,
  mergeSyntax: props.mergeSyntax,
  fonts: props.fonts,
  adapter: props.adapter,
  mode: props.mode,
  autosave: props.autosave,
  onSave: props.onSave ?? ((doc) => emit("save", doc)),
  onChange: props.onChange ?? ((doc) => emit("change", doc)),
  onReady: props.onReady ?? ((e) => emit("ready", e)),
});

/* Teleported overlays (EbPortal) read the theme to re-declare it outside the root element. */
provideTheme(toRef(props, "theme"));

/* Listen to select events so the host can react */
editor.events.on("select", (sel) => emit("select", sel));

/* ── Keyboard shortcuts ── */
const rootRef = ref<HTMLDivElement | null>(null);

function onKeyDown(event: KeyboardEvent) {
  if (isTypingTarget(event.target)) return;
  const mod = event.metaKey || event.ctrlKey;
  if (mod && event.key === "z" && !event.shiftKey) {
    event.preventDefault(); editor.undo();
  } else if (mod && (event.key === "y" || (event.key === "z" && event.shiftKey))) {
    event.preventDefault(); editor.redo();
  } else if (mod && event.key === "s") {
    event.preventDefault(); editor.save();
  } else if (mod && event.key === "d") {
    event.preventDefault();
    editor.duplicateSelected();
  } else if (event.key === "Delete" || event.key === "Backspace") {
    /* Every selected block or row, not just the last one clicked. */
    if (editor.removeSelected()) event.preventDefault();
  } else if (event.key === "Escape") {
    event.preventDefault();
    editor.endInlineEdit();
    editor.select(null);
  } else if (event.key === "Tab") {
    event.preventDefault();
    editor.selectNext(event.shiftKey ? -1 : 1);
  } else if (event.key === "Enter") {
    const sel = editor.getSelection();
    if (sel?.kind === "block") { event.preventDefault(); editor.beginInlineEdit(sel.id); }
  }
}

/* Copy, cut and paste blocks or rows — between emails too — through the system clipboard. */
const onCopy = (event: ClipboardEvent) => handleEditorCopy(editor, event);
const onCut = (event: ClipboardEvent) => handleEditorCopy(editor, event, true);
const onPaste = (event: ClipboardEvent) => handleEditorPaste(editor, event);

onMounted(() => {
  const root = rootRef.value;
  root?.addEventListener("keydown", onKeyDown);
  root?.addEventListener("copy", onCopy);
  root?.addEventListener("cut", onCut);
  root?.addEventListener("paste", onPaste);
  /* Load brand fonts into the page so the canvas shows them. */
  loadFonts(editor.fonts);
});
onUnmounted(() => {
  const root = rootRef.value;
  root?.removeEventListener("keydown", onKeyDown);
  root?.removeEventListener("copy", onCopy);
  root?.removeEventListener("cut", onCut);
  root?.removeEventListener("paste", onPaste);
});

type Overlay = "preview" | "code" | null;
const overlay = ref<Overlay>(null);

const rootClasses = ["email-builder", "eb-root", props.class ?? ""].filter(Boolean).join(" ");
</script>

<template>
  <div
    ref="rootRef"
    :class="rootClasses"
    :data-eb-theme="theme"
    tabindex="-1"
  >
    <div class="email-builder__body eb-body">
      <BuilderPalette v-if="showPalette" />
      <BuilderCanvas :show-toolbar="showToolbar" :toolbar-actions="toolbarActions" @preview="overlay = 'preview'" @code="overlay = 'code'" />
      <BuilderInspector v-if="showInspector" />
    </div>
    <DragLayer />
    <BuilderPreview v-if="overlay === 'preview'" @close="overlay = null" />
    <BuilderCodeView v-if="overlay === 'code'" @close="overlay = null" />
  </div>
</template>
