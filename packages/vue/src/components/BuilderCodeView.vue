<script setup lang="ts">
/* ═══ BuilderCodeView ═══
 *
 * Modal showing the compiled HTML source with a copy-to-clipboard button. */

import { onMounted, ref } from "vue";
import { Teleport } from "vue";
import { useEditor, useTranslator } from "../context";
import { UI_ICONS } from "../icons";
import EbIcon from "./EbIcon.vue";
import EbPortal from "./EbPortal.vue";

const emit = defineEmits<{ close: [] }>();

const editor = useEditor();
const t = useTranslator(editor);

const html = ref("");
const copied = ref(false);

onMounted(() => {
  const result = editor.compile({ sample: true, minify: false });
  html.value = result.html;
});

async function copy() {
  await navigator.clipboard.writeText(html.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
  <EbPortal>
    <div class="eb-modal-backdrop" @click.self="emit('close')">
      <div class="eb-modal eb-modal--wide">
        <div class="eb-modal__header">
          <span class="eb-modal__title">{{ t('code.title') }}</span>
          <button type="button" class="eb-btn" @click="copy">
            <EbIcon :svg="UI_ICONS.copy" />
            {{ copied ? t('code.copied') : t('code.copy') }}
          </button>
          <button type="button" class="eb-btn eb-btn--icon" :aria-label="t('toolbar.close')" @click="emit('close')">
            <EbIcon :svg="UI_ICONS.close" />
          </button>
        </div>
        <div class="eb-modal__body eb-modal__body--flush" style="overflow-y:auto">
          <pre class="eb-code">{{ html }}</pre>
        </div>
      </div>
    </div>
  </EbPortal>
</template>
