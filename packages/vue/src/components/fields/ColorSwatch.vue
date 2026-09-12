<script setup lang="ts">
/* ═══ Colour swatch ═══
 *
 * A <label> rather than a <div>: `.eb-color__fill` sits on top of the transparent colour input, so
 * without the label wrapper the checker would swallow every click aimed at the picker. */

import { computed } from "vue";

const props = defineProps<{ value: string; ariaLabel?: string }>();
const emit = defineEmits<{ change: [value: string] }>();

/* A native colour input has no concept of "unset" — it must be handed a hex. */
const picker = computed(() => (/^#[0-9a-f]{6}$/i.test(props.value ?? "") ? props.value : "#ffffff"));
const fill = computed(() => (props.value && props.value !== "transparent" ? props.value : "transparent"));
</script>

<template>
  <label class="eb-color__swatch">
    <input
      type="color"
      :value="picker"
      :aria-label="ariaLabel"
      @input="emit('change', ($event.target as HTMLInputElement).value)"
    />
    <span class="eb-color__fill" :style="{ background: fill }" />
  </label>
</template>
