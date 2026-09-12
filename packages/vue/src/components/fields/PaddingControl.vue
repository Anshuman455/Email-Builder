<script setup lang="ts">
/* ═══ Padding field ═══
 *
 * Four cells in T R B L order — the shape of the thing being edited, so the author recognises it
 * instead of reading labels. The link toggle is local state: it is a way of typing, not a property
 * of the document. */

import { ref } from "vue";
import type { Padding } from "@email-builder/core";
import { useTranslator } from "../../context";

const props = defineProps<{ value: Padding | undefined; label?: string }>();
const emit = defineEmits<{ change: [value: Padding] }>();

const SIDES = [
  { key: "top", label: "T" },
  { key: "right", label: "R" },
  { key: "bottom", label: "B" },
  { key: "left", label: "L" },
] as const;

const t = useTranslator();
const linked = ref(false);

const current = (): Padding => ({
  top: props.value?.top ?? 0,
  right: props.value?.right ?? 0,
  bottom: props.value?.bottom ?? 0,
  left: props.value?.left ?? 0,
});

const at = (side: (typeof SIDES)[number]["key"]) => current()[side];

function set(side: (typeof SIDES)[number]["key"], raw: string) {
  const next = Math.max(0, Number(raw) || 0);
  emit("change", linked.value ? { top: next, right: next, bottom: next, left: next } : { ...current(), [side]: next });
}
</script>

<template>
  <div class="eb-padding" role="group" :aria-label="props.label">
    <div v-for="side in SIDES" :key="side.key" class="eb-padding__cell">
      <span class="eb-padding__cell-label">{{ side.label }}</span>
      <input
        type="number"
        class="eb-input"
        min="0"
        :value="at(side.key)"
        :aria-label="`${props.label ?? 'Padding'} ${side.key}`"
        @input="set(side.key, ($event.target as HTMLInputElement).value)"
      />
    </div>
    <label class="eb-padding__link">
      <input v-model="linked" type="checkbox" />
      {{ t("field.linkSides", "Link all sides") }}
    </label>
  </div>
</template>
