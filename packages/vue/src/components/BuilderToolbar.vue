<script setup lang="ts">
/* ═══ BuilderToolbar ═══
 *
 * The command bar above the email: history on the left, the viewport switch in the
 * middle, output actions on the right. It lives in the canvas column rather than across the top of
 * the page, so the builder brings no app header of its own into a host's layout.
 *
 * `v-model:device` binds the viewport; `preview` and `code` are emitted. */

import { computed } from "vue";
import type { ToolbarAction } from "@email-builder/engine";
import { useEditor, useTranslator } from "../context";
import { useEditorSelector } from "../composables";
import EbGlyph from "./EbGlyph.vue";

const props = withDefaults(
  defineProps<{ device: "desktop" | "mobile"; width: number; actions?: ToolbarAction[] }>(),
  { actions: () => [] },
);

const emit = defineEmits<{
  "update:device": [device: "desktop" | "mobile"];
  preview: [];
  code: [];
}>();

const editor = useEditor();
const t = useTranslator(editor);

const canUndo = useEditorSelector((state) => state.canUndo);
const canRedo = useEditorSelector((state) => state.canRedo);

const DEVICES = ["desktop", "mobile"] as const;

/* Host buttons — attachments, AI, anything. "start" sits by undo/redo, everything else before Code. */
const startActions = computed(() => props.actions.filter((action) => action.placement === "start"));
const endActions = computed(() => props.actions.filter((action) => action.placement !== "start"));

function actionClass(action: ToolbarAction) {
  return [
    "eb-commandbar__btn",
    "eb-commandbar__btn--icon",
    action.primary ? "eb-commandbar__btn--primary" : "",
    action.active ? "eb-commandbar__btn--active" : "",
  ];
}
</script>

<template>
  <div class="eb-commandbar" role="toolbar" :aria-label="t('toolbar.label')" @click.stop>
    <div class="eb-commandbar__start">
      <div class="eb-commandbar__group">
        <button
          type="button"
          class="eb-commandbar__icon-btn"
          :disabled="!canUndo"
          :aria-label="t('toolbar.undo')"
          :title="`${t('toolbar.undo')} (⌘Z)`"
          @click="editor.undo()"
        >
          <EbGlyph name="undo" />
        </button>
        <button
          type="button"
          class="eb-commandbar__icon-btn"
          :disabled="!canRedo"
          :aria-label="t('toolbar.redo')"
          :title="`${t('toolbar.redo')} (⌘⇧Z)`"
          @click="editor.redo()"
        >
          <EbGlyph name="redo" />
        </button>
      </div>
      <button
        v-for="action in startActions"
        :key="action.id"
        type="button"
        :class="actionClass(action)"
        :aria-label="action.label"
        :title="action.label"
        :aria-pressed="action.active"
        :disabled="action.disabled"
        @click="action.onClick(editor)"
      >
        <EbGlyph :name="action.icon" />
      </button>
    </div>

    <div class="eb-commandbar__center">
      <div class="eb-commandbar__segmented" role="radiogroup" :aria-label="t('toolbar.viewport')">
        <button
          v-for="option in DEVICES"
          :key="option"
          type="button"
          role="radio"
          :aria-checked="device === option"
          :class="['eb-commandbar__segment', device === option ? 'eb-commandbar__segment--active' : '']"
          :title="t(`toolbar.${option}`)"
          @click="emit('update:device', option)"
        >
          <EbGlyph :name="option === 'desktop' ? 'desktop' : 'smartphone'" />
          <span class="eb-commandbar__label">{{ t(`toolbar.${option}`) }}</span>
        </button>
      </div>
      <span class="eb-commandbar__width">{{ width }}px</span>
    </div>

    <div class="eb-commandbar__end">
      <button
        v-for="action in endActions"
        :key="action.id"
        type="button"
        :class="actionClass(action)"
        :aria-label="action.label"
        :title="action.label"
        :aria-pressed="action.active"
        :disabled="action.disabled"
        @click="action.onClick(editor)"
      >
        <EbGlyph :name="action.icon" />
      </button>
      <button type="button" class="eb-commandbar__btn" :title="t('toolbar.code')" @click="emit('code')">
        <EbGlyph name="code" />
        <span class="eb-commandbar__label">{{ t("toolbar.code") }}</span>
      </button>
      <button
        type="button"
        class="eb-commandbar__btn eb-commandbar__btn--primary"
        :title="`${t('toolbar.preview')} (⌘P)`"
        @click="emit('preview')"
      >
        <EbGlyph name="visibility" />
        <span class="eb-commandbar__label">{{ t("toolbar.preview") }}</span>
      </button>
    </div>
  </div>
</template>
