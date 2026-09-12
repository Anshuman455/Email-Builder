<script setup lang="ts">
/* ═══ Image field ═══
 *
 * Three ways in, because hosts differ: the host's own media library when `adapter.assets.browse`
 * exists, a file picker (or a drop) when only `upload` does, and a plain URL box always — a tenant
 * with no asset adapter must still be able to point at an image it already hosts. */

import { computed, ref } from "vue";
import { useEditor, useTranslator } from "../../context";
import { UI_ICONS } from "../../icons";
import EbIcon from "../EbIcon.vue";

const props = defineProps<{ value: string; label?: string; contextId: string; fieldKey: string }>();
const emit = defineEmits<{ change: [value: string] }>();

const editor = useEditor();
const t = useTranslator(editor);

const file = ref<HTMLInputElement | null>(null);
const over = ref(false);
const uploading = ref(false);

const assets = computed(() => editor.adapter.assets);
const accept = computed(() => assets.value?.accept ?? "image/*");

async function choose() {
  const adapter = assets.value;
  if (adapter?.browse) {
    const asset = await adapter.browse({ blockId: props.contextId, field: props.fieldKey });
    if (asset) emit("change", asset.url);
    return;
  }
  if (adapter) file.value?.click();
}

async function send(selected: File | undefined | null) {
  const adapter = assets.value;
  if (!adapter || !selected) return;
  if (adapter.maxBytes && selected.size > adapter.maxBytes) {
    const limit = `${Math.round(adapter.maxBytes / 1024)} KB`;
    editor.adapter.notify?.error?.(`${t("field.imageTooLarge", "That file is over the limit of")} ${limit}.`);
    return;
  }
  uploading.value = true;
  try {
    const asset = await adapter.upload(selected, { blockId: props.contextId, field: props.fieldKey });
    emit("change", asset.url);
  } catch {
    editor.adapter.notify?.error?.(t("field.imageFailed", "That image could not be uploaded."));
  } finally {
    uploading.value = false;
  }
}

function onDrop(event: DragEvent) {
  over.value = false;
  void send(event.dataTransfer?.files?.[0]);
}
</script>

<template>
  <div class="eb-image-field">
    <div
      class="eb-image-field__preview"
      :class="{ 'eb-image-field__preview--over': over }"
      role="button"
      tabindex="0"
      :aria-label="props.value ? t('field.replaceImage') : t('field.chooseImage')"
      @click="choose"
      @keydown.enter.prevent="choose"
      @keydown.space.prevent="choose"
      @dragover.prevent="over = true"
      @dragenter.prevent="over = true"
      @dragleave="over = false"
      @drop.prevent="onDrop"
    >
      <img v-if="props.value" :src="props.value" :alt="props.label ?? ''" />
      <div v-else class="eb-image-field__hint">
        <EbIcon :svg="UI_ICONS.upload" />
        {{ t("field.chooseImage") }}
      </div>
      <div v-if="uploading" class="eb-image-field__progress" :style="{ width: '100%' }" />
    </div>

    <div v-if="props.value" class="eb-image-field__actions">
      <button type="button" class="eb-btn" @click="choose">{{ t("field.replaceImage") }}</button>
      <button type="button" class="eb-btn eb-btn--danger" @click="emit('change', '')">
        {{ t("field.removeImage") }}
      </button>
    </div>

    <input
      type="text"
      class="eb-input"
      spellcheck="false"
      placeholder="https://…"
      :value="props.value"
      :aria-label="props.label"
      @change="emit('change', ($event.target as HTMLInputElement).value.trim())"
    />

    <input
      ref="file"
      type="file"
      class="eb-sr-only"
      :accept="accept"
      @change="send(($event.target as HTMLInputElement).files?.[0])"
    />
  </div>
</template>
