<script setup lang="ts">
/* ═══ MentionMenu (Vue) ═══
 *
 * Floating autocomplete menu for mapping / merge fields triggered by typing '@'
 * inside text and heading blocks.
 */

import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { COMMON_FIELDS, type MergeField } from "@email-builder/core";
import type { Editor } from "@email-builder/engine";

const props = defineProps<{
  editor: Editor;
  coords: { top: number; left: number };
  query: string;
}>();

const emit = defineEmits<{
  select: [field: MergeField];
  close: [];
}>();

const menuRef = ref<HTMLDivElement | null>(null);
const activeIndex = ref(0);

// Group fields from editor.merge, or fallback to COMMON_FIELDS
const groups = computed(() => {
  let sourceGroups = props.editor.merge?.groups() ?? [];
  if (!sourceGroups || sourceGroups.length === 0) {
    const map = new Map<string, MergeField[]>();
    for (const field of COMMON_FIELDS) {
      const grp = field.group || "Fields";
      if (!map.has(grp)) map.set(grp, []);
      map.get(grp)!.push(field);
    }
    sourceGroups = Array.from(map.entries()).map(([group, fields]) => ({ group, fields }));
  }

  const q = props.query.trim().toLowerCase();
  if (!q) return sourceGroups;

  return sourceGroups
    .map((g) => ({
      group: g.group,
      fields: g.fields.filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          f.token.toLowerCase().includes(q) ||
          (f.sample && f.sample.toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.fields.length > 0);
});

// Flatten for keyboard navigation
const flatFields = computed(() => {
  const list: MergeField[] = [];
  for (const g of groups.value) {
    for (const f of g.fields) {
      list.push(f);
    }
  }
  return list;
});

watch(
  () => props.query,
  () => {
    activeIndex.value = 0;
  },
);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    e.stopPropagation();
    activeIndex.value = flatFields.value.length
      ? (activeIndex.value + 1) % flatFields.value.length
      : 0;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    e.stopPropagation();
    activeIndex.value = flatFields.value.length
      ? (activeIndex.value - 1 + flatFields.value.length) % flatFields.value.length
      : 0;
  } else if (e.key === "Enter" || e.key === "Tab") {
    if (flatFields.value.length > 0 && flatFields.value[activeIndex.value]) {
      e.preventDefault();
      e.stopPropagation();
      emit("select", flatFields.value[activeIndex.value]!);
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    emit("close");
  }
}

function onClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit("close");
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("mousedown", onClickOutside, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeyDown, true);
  window.removeEventListener("mousedown", onClickOutside, true);
});

const menuStyle = computed(() => {
  const width = 290;
  const height = 340;
  let left = props.coords.left;
  let top = props.coords.top + 20;

  if (left + width > window.innerWidth - 12) {
    left = Math.max(12, window.innerWidth - width - 12);
  }
  if (top + height > window.innerHeight - 12) {
    top = Math.max(12, props.coords.top - height - 8);
  }

  return {
    top: `${top}px`,
    left: `${left}px`,
  };
});

function formatToken(token: string) {
  return props.editor.merge?.format(token) ?? `{{${token}}}`;
}
</script>

<template>
  <div ref="menuRef" class="eb-mention-menu" :style="menuStyle" data-eb-no-drag>
    <div class="eb-mention-menu__header">
      <div class="eb-mention-menu__header-left">
        <span class="eb-mention-menu__badge">@</span>
        <span class="eb-mention-menu__title">Mapping Fields</span>
      </div>
      <span class="eb-mention-menu__hint">Tab/Enter to insert</span>
    </div>

    <div v-if="query" class="eb-mention-menu__search">
      <span class="material-symbols-outlined" style="font-size: 14px; color: #94a3b8;">
        search
      </span>
      <span style="font-size: 12px; color: #64748b;">Filter: &ldquo;{{ query }}&rdquo;</span>
    </div>

    <div class="eb-mention-menu__list">
      <div v-if="flatFields.length === 0" class="eb-mention-menu__empty">
        No matching mapping fields
      </div>
      <template v-else>
        <div v-for="group in groups" :key="group.group">
          <div class="eb-mention-menu__group-title">{{ group.group }}</div>
          <button
            v-for="field in group.fields"
            :key="field.token"
            type="button"
            :class="[
              'eb-mention-menu__item',
              flatFields[activeIndex]?.token === field.token ? 'eb-mention-menu__item--active' : '',
            ]"
            @mousedown.prevent
            @click.prevent.stop="emit('select', field)"
            @mouseenter="activeIndex = flatFields.findIndex((f) => f.token === field.token)"
          >
            <div class="eb-mention-menu__item-left">
              <span class="eb-mention-menu__label">{{ field.label }}</span>
              <span v-if="field.sample" class="eb-mention-menu__sample">
                e.g. {{ field.sample }}
              </span>
            </div>
            <span class="eb-mention-menu__token">{{ formatToken(field.token) }}</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
