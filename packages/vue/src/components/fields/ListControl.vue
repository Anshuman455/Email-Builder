<script setup lang="ts">
/* ═══ List field ═══
 *
 * Repeating sub-records: social links, list items, product cards. One item is expanded at a time —
 * a list of six cards with every field open is a panel nobody can navigate.
 *
 * The item fields are rendered through a slot rather than by importing BuilderField here, which
 * keeps the recursion (field → list → field) out of the module graph. */

import { computed, ref } from "vue";
import type { Field } from "@email-builder/core";
import { useTranslator } from "../../context";
import { UI_ICONS } from "../../icons";
import EbIcon from "../EbIcon.vue";

type ListField = Extract<Field, { kind: "list" }>;
type Item = Record<string, unknown>;

const props = defineProps<{ field: ListField; value: unknown }>();
const emit = defineEmits<{ change: [value: Item[]] }>();

defineSlots<{
  field(props: { field: Field; value: unknown; update: (next: unknown) => void }): unknown;
}>();

const t = useTranslator();

const items = computed<Item[]>(() => (Array.isArray(props.value) ? (props.value as Item[]) : []));
const open = ref<number | null>(0);
const full = computed(() => props.field.max !== undefined && items.value.length >= props.field.max);

const labelFor = (item: Item, index: number) =>
  props.field.itemLabel?.(item, index) ?? String(item.label ?? item.text ?? item.title ?? `Item ${index + 1}`);

/* A new row needs every key present, or the first keystroke in one field would be the only key the
   block's renderer ever sees. */
function blank(): Item {
  const item: Item = {};
  for (const field of props.field.itemFields) {
    item[field.key] = field.kind === "toggle" ? false : field.kind === "number" || field.kind === "range" ? 0 : "";
  }
  return item;
}

function add() {
  const next = [...items.value, blank()];
  open.value = next.length - 1;
  emit("change", next);
}

function remove(index: number) {
  emit("change", items.value.filter((_, at) => at !== index));
  if (open.value === index) open.value = null;
}

function update(index: number, key: string, value: unknown) {
  emit(
    "change",
    items.value.map((item, at) => (at === index ? { ...item, [key]: value } : item)),
  );
}
</script>

<template>
  <div class="eb-list">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="eb-list__item"
      :class="{ 'eb-list__item--collapsed': open !== index }"
    >
      <div class="eb-list__item-header">
        <button
          type="button"
          class="eb-list__item-label"
          :aria-expanded="open === index"
          @click="open = open === index ? null : index"
        >
          {{ labelFor(item, index) }}
        </button>
        <button type="button" class="eb-list__remove" :aria-label="t('field.removeItem')" @click="remove(index)">
          <EbIcon :svg="UI_ICONS.trash" />
        </button>
      </div>

      <div class="eb-list__item-body">
        <template v-for="itemField in props.field.itemFields" :key="itemField.key">
          <slot
            name="field"
            :field="itemField"
            :value="item[itemField.key]"
            :update="(next: unknown) => update(index, itemField.key, next)"
          />
        </template>
      </div>
    </div>

    <button v-if="!full" type="button" class="eb-list__add" @click="add">
      <EbIcon :svg="UI_ICONS.plus" />
      {{ props.field.addLabel ?? t("field.addItem") }}
    </button>
  </div>
</template>
