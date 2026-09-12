<script setup lang="ts">
/* ═══ Colour field ═══ Swatch, hex, and a clear button only where "no colour" is a legal value. */

import { useTranslator } from "../../context";
import { UI_ICONS } from "../../icons";
import EbIcon from "../EbIcon.vue";
import ColorSwatch from "./ColorSwatch.vue";

const props = defineProps<{ value: string; label?: string; allowTransparent?: boolean }>();
const emit = defineEmits<{ change: [value: string] }>();

const t = useTranslator();

const onText = (event: Event) => emit("change", (event.target as HTMLInputElement).value.trim());
</script>

<template>
  <div class="eb-color">
    <ColorSwatch :value="props.value" :aria-label="props.label" @change="emit('change', $event)" />
    <input
      type="text"
      class="eb-input"
      spellcheck="false"
      :value="props.value"
      :placeholder="props.allowTransparent ? t('field.transparent') : '#000000'"
      :aria-label="props.label"
      @change="onText"
    />
    <button
      v-if="props.allowTransparent"
      type="button"
      class="eb-color__clear"
      :aria-label="t('field.transparent')"
      :title="t('field.transparent')"
      @click="emit('change', 'transparent')"
    >
      <EbIcon :svg="UI_ICONS.close" />
    </button>
  </div>
</template>
