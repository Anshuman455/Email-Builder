<script setup lang="ts">
/* ═══ Record picker ═══
 *
 * Pulls rows from the host's CRM through `adapter.records` and turns the chosen one into block
 * content. It emits a whole content patch rather than a single value, because one pick fills a
 * title, a price, an image and a link at once.
 *
 * The result rows are placeholders shaped like the real option while the request is in flight —
 * never a spinner, so the panel does not jump when the rows land. */

import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { Field } from "@email-builder/core";
import type { RecordOption } from "@email-builder/engine";
import { useEditor, useTranslator } from "../../context";

type RecordField = Extract<Field, { kind: "record" }>;

const props = defineProps<{ field: RecordField }>();
const emit = defineEmits<{ patch: [changes: Record<string, unknown>] }>();

const editor = useEditor();
const t = useTranslator(editor);

const search = ref("");
const options = ref<RecordOption[]>([]);
const loading = ref(false);
const failed = ref(false);

const records = computed(() => editor.adapter.records);

let timer: ReturnType<typeof setTimeout> | null = null;
/* Every request tagged, so a slow early response cannot overwrite a fast later one. */
let generation = 0;

async function run(query: string) {
  const adapter = records.value;
  if (!adapter) return;
  const ticket = ++generation;
  loading.value = true;
  failed.value = false;
  try {
    const rows = await adapter.list(props.field.source, { search: query, limit: 20 });
    if (ticket !== generation) return;
    options.value = rows;
  } catch {
    if (ticket !== generation) return;
    failed.value = true;
    options.value = [];
  } finally {
    if (ticket === generation) loading.value = false;
  }
}

watch(
  search,
  (query) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void run(query), 250);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  generation += 1;
});

function pick(option: RecordOption) {
  const mapped =
    props.field.mapToContent?.(option.raw ?? option) ?? records.value?.map?.(props.field.source, option) ?? {};
  emit("patch", mapped);
}
</script>

<template>
  <div class="eb-record">
    <input
      v-model="search"
      type="search"
      class="eb-input"
      :placeholder="t('field.searchRecords')"
      :aria-label="t('field.searchRecords')"
    />

    <template v-if="loading">
      <div v-for="row in 3" :key="row" class="eb-record__option" aria-hidden="true">
        <span class="eb-skeleton eb-record__thumb" />
        <span class="eb-skeleton" style="width: 60%; height: 13px" />
      </div>
    </template>

    <template v-else>
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        class="eb-record__option"
        @click="pick(option)"
      >
        <img v-if="option.image" class="eb-record__thumb" :src="option.image" :alt="''" />
        <!-- The stylesheet styles the label and the description but not their stack. -->
        <span style="display: grid; min-width: 0">
          <span class="eb-record__label">{{ option.label }}</span>
          <span v-if="option.description" class="eb-record__desc">{{ option.description }}</span>
        </span>
      </button>

      <p v-if="!options.length" class="eb-field__help">
        {{ failed ? t("field.recordsFailed", "That list could not be loaded.") : t("field.noRecords") }}
      </p>
    </template>
  </div>
</template>
