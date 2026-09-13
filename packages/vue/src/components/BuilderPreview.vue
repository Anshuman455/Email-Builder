<script setup lang="ts">
/* ═══ BuilderPreview ═══
 *
 * Modal with the compiled HTML in an iframe. Mobile toggle switches between full-width and 375px. */

import { ref } from "vue";
import { useEditor, useTranslator } from "../context";
import { UI_ICONS } from "../icons";
import EbIcon from "./EbIcon.vue";
import EbPortal from "./EbPortal.vue";

const emit = defineEmits<{ close: [] }>();

const editor = useEditor();
const t = useTranslator(editor);

const mobile = ref(false);

let initialHtml = "";
try {
  initialHtml = editor.compile({ preview: true, sample: true }).html;
} catch {
  // Fallback
}
const previewHtml = ref(initialHtml);
</script>

<template>
  <EbPortal>
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
          <div class="eb-preview">
            <div class="eb-preview__stage">
              <!-- `sandbox` without `allow-same-origin` or `allow-scripts`: the preview is an opaque
                   origin that cannot run script or reach the host page, whatever the email holds.
                   Popups stay allowed so links in the email still open in a new tab. -->
              <iframe
                :title="t('preview.title')"
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                :srcdoc="previewHtml"
                :class="['eb-preview__frame', mobile ? 'eb-preview__frame--mobile' : '']"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </EbPortal>
</template>
