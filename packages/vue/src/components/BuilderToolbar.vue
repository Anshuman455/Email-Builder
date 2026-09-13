<script setup lang="ts">
/* ═══ BuilderToolbar ═══
 *
 * The command bar above the email: history on the left, the viewport switch in the
 * middle, output actions on the right. It lives in the canvas column rather than across the top of
 * the page, so the builder brings no app header of its own into a host's layout.
 *
 * `v-model:device` binds the viewport; `preview` and `code` are emitted. */

import { useEditor, useTranslator } from "../context";
import { useEditorSelector } from "../composables";
import EbGlyph from "./EbGlyph.vue";

defineProps<{ device: "desktop" | "mobile"; width: number }>();

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
