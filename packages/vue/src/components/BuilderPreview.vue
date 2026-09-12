<script setup lang="ts">
/* ═══ BuilderPreview ═══
 *
 * Modal with the compiled HTML in an iframe. Mobile toggle switches between full-width and 375px. */

import { onMounted, ref } from "vue";
import { Teleport } from "vue";
import { useEditor, useTranslator } from "../context";
import { UI_ICONS } from "../icons";
import EbIcon from "./EbIcon.vue";

const emit = defineEmits<{ close: [] }>();

const editor = useEditor();
const t = useTranslator(editor);

const mobile = ref(false);
const iframeRef = ref<HTMLIFrameElement | null>(null);

onMounted(() => {
  const { html } = editor.compile({ preview: true, sample: true });
  const iframe = iframeRef.value;
  if (!iframe) return;
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
});
</script>

<template>
  <Teleport to="body">
    <div class="eb-modal-backdrop" @click.self="emit('close')">
      <div class="eb-modal eb-modal--wide">
        <div class="eb-modal__header">
          <span class="eb-modal__title">{{ t('preview.title') }}</span>
          <button
            type="button"
            :class="['eb-btn eb-btn--icon', !mobile ? 'eb-btn--active' : '']"
            :aria-label="t('toolbar.desktop')"
            @click="mobile = false"
          >
            <EbIcon :svg="UI_ICONS.desktop" />
          </button>
          <button
            type="button"
            :class="['eb-btn eb-btn--icon', mobile ? 'eb-btn--active' : '']"
            :aria-label="t('toolbar.mobile')"
            @click="mobile = true"
          >
            <EbIcon :svg="UI_ICONS.mobile" />
          </button>
          <button type="button" class="eb-btn eb-btn--icon" :aria-label="t('toolbar.close')" @click="emit('close')">
            <EbIcon :svg="UI_ICONS.close" />
          </button>
        </div>
        <div class="eb-modal__body eb-modal__body--flush">
          <div class="eb-preview__stage" style="display:flex;justify-content:center;padding:20px;overflow:auto;">
            <iframe
              ref="iframeRef"
              :title="t('preview.title')"
              :class="['eb-preview__frame', mobile ? 'eb-preview__frame--mobile' : '']"
              style="border:0;background:#fff;border-radius:4px;"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
