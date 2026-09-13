<script setup lang="ts">
/* ═══ Merge-field picker ═══
 *
 * Emits a formatted token; the field that owns the caret decides where it lands. The menu is
 * `position: fixed` in the stylesheet and positioned from the trigger's viewport rect, so it
 * escapes the inspector's `overflow-y: auto` instead of being clipped by it. */

import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useEditor, useTranslator } from "../../context";
import { UI_ICONS } from "../../icons";
import EbIcon from "../EbIcon.vue";
import EbPortal from "../EbPortal.vue";

const emit = defineEmits<{ insert: [token: string] }>();

const editor = useEditor();
const t = useTranslator(editor);

const open = ref(false);
const search = ref("");
const anchor = ref({ top: 0, left: 0 });
const trigger = ref<HTMLButtonElement | null>(null);

const groups = computed(() => {
  const all = editor.merge?.groups() ?? [];
  const query = search.value.trim().toLowerCase();
  if (!query) return all;
  return all
    .map((group) => ({
      group: group.group,
      fields: group.fields.filter(
        (field) =>
          field.label.toLowerCase().includes(query) || field.token.toLowerCase().includes(query),
      ),
    }))
    .filter((group) => group.fields.length > 0);
});

const empty = computed(() => groups.value.length === 0);

const MENU_WIDTH = 268;
const MENU_HEIGHT = 320;

function toggle() {
  if (open.value) {
    open.value = false;
    return;
  }
  const rect = trigger.value?.getBoundingClientRect();
  if (rect) {
    /* Flip above the trigger when the menu would fall off the bottom of the window. */
    const below = rect.bottom + 6;
    const top = below + MENU_HEIGHT > window.innerHeight ? Math.max(8, rect.top - MENU_HEIGHT - 6) : below;
    anchor.value = { top, left: Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8)) };
  }
  search.value = "";
  open.value = true;
}

function pick(token: string) {
  emit("insert", editor.merge?.format(token) ?? token);
  open.value = false;
}

/* Any pointer press outside the menu dismisses it — a picker that needs its own trigger clicked
   again to close is the most common way one gets left hanging over the canvas. */
const onDocumentPointerDown = (event: PointerEvent) => {
  const target = event.target as Node | null;
  if (!target) return;
  if (trigger.value?.contains(target)) return;
  if ((target as Element).closest?.(".eb-merge__menu")) return;
  open.value = false;
};

const onDocumentKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape") open.value = false;
};

watch(open, (isOpen) => {
  if (isOpen) {
    window.addEventListener("pointerdown", onDocumentPointerDown, true);
    window.addEventListener("keydown", onDocumentKeyDown);
  } else {
    window.removeEventListener("pointerdown", onDocumentPointerDown, true);
    window.removeEventListener("keydown", onDocumentKeyDown);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("pointerdown", onDocumentPointerDown, true);
  window.removeEventListener("keydown", onDocumentKeyDown);
});
</script>

<template>
  <span class="eb-merge">
    <button
      ref="trigger"
      type="button"
      class="eb-merge__trigger"
      :aria-label="t('field.insertField')"
      :aria-expanded="open"
      @click.stop="toggle"
    >
      <EbIcon :svg="UI_ICONS.merge" />
      {{ t("field.insertField") }}
    </button>

    <EbPortal>
      <div
        v-if="open"
        class="eb-merge__menu"
        role="dialog"
        :aria-label="t('field.insertField')"
        :style="{ top: `${anchor.top}px`, left: `${anchor.left}px` }"
      >
        <div class="eb-merge__search">
          <input
            v-model="search"
            type="search"
            class="eb-input"
            :placeholder="t('field.searchRecords')"
            :aria-label="t('field.searchRecords')"
          />
        </div>
        <div class="eb-merge__list">
          <p v-if="empty" class="eb-merge__empty">{{ t("field.noRecords") }}</p>
          <template v-for="group in groups" :key="group.group">
            <div class="eb-merge__group-title">{{ group.group }}</div>
            <button
              v-for="field in group.fields"
              :key="field.token"
              type="button"
              class="eb-merge__option"
              @click="pick(field.token)"
            >
              <span class="eb-merge__option-label">{{ field.label }}</span>
              <span class="eb-merge__option-token">{{ editor.merge?.format(field.token) }}</span>
            </button>
          </template>
        </div>
      </div>
    </EbPortal>
  </span>
</template>
