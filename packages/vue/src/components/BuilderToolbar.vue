<script setup lang="ts">
/* ═══ BuilderToolbar ═══
 *
 * Modern top toolbar:
 * Left: Back button (optional), Title, "EMAIL TEMPLATE" badge, Subtitle, Undo/Redo pill group, Save status
 * Right: AI Assistant (optional), Import (optional), Code, Ready status, Preview
 */

import { computed, useAttrs } from "vue";
import { useEditor, useTranslator } from "../context";
import { useEditorSelector } from "../composables";

const props = withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    badgeLabel?: string;
    backLabel?: string;
    onBack?: () => void;
    class?: string;
  }>(),
  {
    title: "Monthly Newsletter",
    subtitle: "A monthly update for our community",
    badgeLabel: "EMAIL TEMPLATE",
    backLabel: "Templates",
  },
);

const emit = defineEmits<{
  preview: [];
  code: [];
  preflight: [];
  import: [];
  ai: [];
  back: [];
}>();

const attrs = useAttrs();
const hasBack = computed(() => Boolean(props.onBack || attrs.onBack));
const hasAi = computed(() => Boolean(attrs.onAi));
const hasImport = computed(() => Boolean(attrs.onImport));

const editor = useEditor();
const t = useTranslator(editor);

const canUndo = useEditorSelector((state) => state.canUndo);
const canRedo = useEditorSelector((state) => state.canRedo);
const saveStatus = useEditorSelector((state) => state.saveStatus);

const statusTone = computed(() => {
  const s = saveStatus.value;
  if (s === "error") return "error";
  if (s === "saving") return "busy";
  if (s === "dirty") return "dirty";
  return "saved";
});

const statusIcon = computed(() => {
  const s = saveStatus.value;
  if (s === "error") return "error";
  if (s === "saving") return "sync";
  if (s === "dirty") return "edit";
  return "cloud_done";
});

const statusLabel = computed(() => {
  const s = saveStatus.value;
  if (s === "dirty") return "Unsaved changes";
  if (s === "saving") return "Saving…";
  if (s === "error") return "Save error";
  return "Saved 30s ago";
});

function handleBack() {
  if (props.onBack) props.onBack();
  else emit("back");
}
</script>

<template>
  <header class="builder-toolbar">
    <!-- Left: Back button, Title & Badge, Undo/Redo, Save status -->
    <div class="builder-toolbar__side">
      <template v-if="hasBack">
        <button
          type="button"
          class="builder-toolbar__back-btn"
          :title="`Back to ${backLabel}`"
          @click="handleBack"
        >
          <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          <span class="builder-toolbar__back-label">{{ backLabel }}</span>
        </button>

        <span class="builder-toolbar__divider" aria-hidden="true" />
      </template>

      <div class="builder-toolbar__title-meta">
        <div class="builder-toolbar__title-row">
          <span class="builder-toolbar__title-text" :title="title">{{ title }}</span>
          <span v-if="badgeLabel" class="builder-toolbar__badge">{{ badgeLabel }}</span>
        </div>
        <span v-if="subtitle" class="builder-toolbar__subtitle-text" :title="subtitle">
          {{ subtitle }}
        </span>
      </div>

      <span class="builder-toolbar__divider" aria-hidden="true" />

      <!-- Undo / Redo group -->
      <div class="builder-toolbar__undo-group" role="group" aria-label="Undo and Redo">
        <button
          type="button"
          class="builder-toolbar__undo-btn"
          :disabled="!canUndo"
          aria-label="Undo (⌘Z)"
          title="Undo (⌘Z)"
          @click="editor.undo()"
        >
          <span class="material-symbols-outlined" aria-hidden="true">undo</span>
        </button>
        <span class="builder-toolbar__undo-sep" aria-hidden="true" />
        <button
          type="button"
          class="builder-toolbar__undo-btn"
          :disabled="!canRedo"
          aria-label="Redo (⌘⇧Z)"
          title="Redo (⌘⇧Z)"
          @click="editor.redo()"
        >
          <span class="material-symbols-outlined" aria-hidden="true">redo</span>
        </button>
      </div>

      <span class="builder-toolbar__divider" aria-hidden="true" />

      <!-- Save status badge -->
      <div :class="['builder-toolbar__status', `builder-toolbar__status--${statusTone}`]">
        <span class="material-symbols-outlined builder-toolbar__status-icon" aria-hidden="true">
          {{ statusIcon }}
        </span>
        <span class="builder-toolbar__status-label">{{ statusLabel }}</span>
      </div>
    </div>

    <!-- Right: AI, Import, Code, Ready, Preview -->
    <div class="builder-toolbar__side builder-toolbar__side--end">
      <div class="builder-toolbar__group">
        <button
          v-if="hasAi"
          type="button"
          class="builder-toolbar__pill builder-toolbar__pill--ai"
          title="Write or polish with AI Assistant"
          @click="emit('ai')"
        >
          <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
          <span class="builder-toolbar__pill-label">AI Assistant</span>
        </button>

        <button
          v-if="hasImport"
          type="button"
          class="builder-toolbar__pill"
          title="Import Template"
          @click="emit('import')"
        >
          <span class="material-symbols-outlined" aria-hidden="true">file_upload</span>
          <span class="builder-toolbar__pill-label">Import</span>
        </button>

        <button
          type="button"
          class="builder-toolbar__pill"
          title="View Code"
          @click="emit('code')"
        >
          <span class="material-symbols-outlined" aria-hidden="true">code</span>
          <span class="builder-toolbar__pill-label">Code</span>
        </button>

        <button
          type="button"
          class="builder-toolbar__pill builder-toolbar__pill--preflight builder-toolbar__pill--ready"
          title="Preflight checks"
          @click="emit('preflight')"
        >
          <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
          <span class="builder-toolbar__pill-label">Ready</span>
        </button>

        <button
          type="button"
          class="builder-toolbar__pill builder-toolbar__pill--preview"
          title="Preview (⌘P)"
          @click="emit('preview')"
        >
          <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
          <span class="builder-toolbar__pill-label">Preview</span>
        </button>
      </div>
    </div>
  </header>
</template>

