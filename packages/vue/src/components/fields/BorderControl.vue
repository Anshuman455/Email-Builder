<script setup lang="ts">
/* ═══ Border field ═══ Width, style and colour on one grid row, because they are never chosen
   independently — a width without a style renders nothing. */

import type { Border } from "@email-builder/core";
import ColorSwatch from "./ColorSwatch.vue";

const props = defineProps<{ value: Border | undefined; label?: string }>();
const emit = defineEmits<{ change: [value: Border] }>();

const STYLES: Border["style"][] = ["none", "solid", "dashed", "dotted"];

const current = (): Border => ({
  width: props.value?.width ?? 0,
  style: props.value?.style ?? "none",
  color: props.value?.color ?? "#e2e8f0",
});

const patch = (changes: Partial<Border>) => emit("change", { ...current(), ...changes });
</script>

<template>
  <div class="eb-border" role="group" :aria-label="props.label">
    <div class="eb-number">
      <input
        type="number"
        class="eb-input"
        min="0"
        max="20"
        :value="current().width"
        :aria-label="`${props.label ?? 'Border'} width`"
        @input="patch({ width: Math.max(0, Number(($event.target as HTMLInputElement).value) || 0) })"
      />
      <span class="eb-number__suffix">px</span>
    </div>

    <select
      class="eb-select"
      :value="current().style"
      :aria-label="`${props.label ?? 'Border'} style`"
      @change="patch({ style: ($event.target as HTMLSelectElement).value as Border['style'] })"
    >
      <option v-for="style in STYLES" :key="style" :value="style">{{ style }}</option>
    </select>

    <ColorSwatch
      :value="current().color"
      :aria-label="`${props.label ?? 'Border'} colour`"
      @change="patch({ color: $event })"
    />
  </div>
</template>
