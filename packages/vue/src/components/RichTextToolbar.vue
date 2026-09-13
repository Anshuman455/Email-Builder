<script setup lang="ts">
/* ═══ RichTextToolbar ═══
 *
 * Floating formatting bar shown above a block while its rich-text field is edited inline. All
 * formatting logic lives in @email-builder/engine (shared with React); this is the view.
 *
 * Buttons use `@mousedown.prevent` so clicking them never takes focus from the text — losing
 * focus is what ends inline editing and saves the block. The link box and colour picker do need
 * focus, so the block's blur handler ignores focus moving into `.eb-rte`, and this toolbar hands
 * focus back (and so saves) when the author leaves it for somewhere else. */

import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import {
  readRichTextState,
  removeLink,
  restoreSelection,
  runRichTextCommand,
  selectionIn,
  setLink,
  setTextColor,
  type RichTextCommand,
  type RichTextState,
} from "@email-builder/engine";
import { useTranslator } from "../context";
import EbGlyph from "./EbGlyph.vue";

const props = defineProps<{
  /** The block's rendered element; the editable text is the `[data-eb-inline]` inside it. */
  host: HTMLElement | null;
}>();

const t = useTranslator();

const FORMAT: Array<{ command: RichTextCommand; icon: string; label: string; shortcut?: string }> = [
  { command: "bold", icon: "format_bold", label: "rte.bold", shortcut: "⌘B" },
  { command: "italic", icon: "format_italic", label: "rte.italic", shortcut: "⌘I" },
  { command: "underline", icon: "format_underlined", label: "rte.underline", shortcut: "⌘U" },
  { command: "strikeThrough", icon: "strikethrough_s", label: "rte.strike" },
];

const LISTS: Array<{ command: RichTextCommand; icon: string; label: string }> = [
  { command: "insertUnorderedList", icon: "format_list_bulleted", label: "rte.bulletList" },
  { command: "insertOrderedList", icon: "format_list_numbered", label: "rte.numberList" },
];

const root = ref<HTMLDivElement | null>(null);
const linkInput = ref<HTMLInputElement | null>(null);
const state = ref<RichTextState | null>(null);
const linkOpen = ref(false);
const linkValue = ref("");
const linkInvalid = ref(false);
const below = ref(false);
let saved: Range | null = null;

const target = () => props.host?.querySelector<HTMLElement>("[data-eb-inline]") ?? null;

function refresh() {
  const element = target();
  if (element) state.value = readRichTextState(element);
}

function isActive(command: RichTextCommand) {
  return !!state.value?.[command as keyof RichTextState];
}

async function openLink() {
  const element = target();
  if (!element) return;
  saved = selectionIn(element);
  linkValue.value = readRichTextState(element).link ?? "";
  linkInvalid.value = false;
  linkOpen.value = true;
  await nextTick();
  linkInput.value?.focus();
}

/* ⌘K / Ctrl+K opens the link box. Listened for on the block, which exists before the editable
   element inside it is marked. */
function onHostKeyDown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    void openLink();
  }
}

watch(
  () => props.host,
  (next, previous) => {
    previous?.removeEventListener("keydown", onHostKeyDown);
    next?.addEventListener("keydown", onHostKeyDown);
  },
  { immediate: true },
);

onMounted(() => {
  requestAnimationFrame(refresh);
  document.addEventListener("selectionchange", refresh);
  /* Blocks at the very top of the canvas show the bar underneath, so it isn't cut off. */
  const block = root.value?.parentElement;
  const scroller = root.value?.closest(".builder-canvas__scroll");
  if (block && scroller) below.value = block.getBoundingClientRect().top - scroller.getBoundingClientRect().top < 56;
});

onUnmounted(() => {
  document.removeEventListener("selectionchange", refresh);
  props.host?.removeEventListener("keydown", onHostKeyDown);
});

function run(command: RichTextCommand) {
  const element = target();
  if (!element) return;
  runRichTextCommand(element, command);
  refresh();
}

function closeLink() {
  const element = target();
  linkOpen.value = false;
  if (element) restoreSelection(element, saved);
}

function applyLink() {
  const element = target();
  if (!element) return;
  if (!setLink(element, linkValue.value, saved)) {
    linkInvalid.value = true;
    return;
  }
  linkOpen.value = false;
  refresh();
}

function unlink() {
  const element = target();
  if (!element) return;
  removeLink(element, saved);
  linkOpen.value = false;
  refresh();
}

function saveForColor() {
  const element = target();
  if (element) saved = selectionIn(element);
}

function applyColor(event: Event) {
  const element = target();
  if (element) saved = setTextColor(element, (event.target as HTMLInputElement).value, saved);
}

/* Focus left the toolbar for somewhere other than the text: end the edit the normal way. */
function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget as Node | null;
  const element = target();
  if (!element || (next && (root.value?.contains(next) || element.contains(next)))) return;
  element.focus();
  element.blur();
}

function onLinkKeyDown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault();
    applyLink();
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeLink();
  }
}
</script>

<template>
  <div
    ref="root"
    :class="['eb-rte', below ? 'eb-rte--below' : '']"
    role="toolbar"
    :aria-label="t('rte.toolbar')"
    data-eb-no-drag
    @click.stop
    @focusout="onFocusOut"
  >
    <div v-if="linkOpen" class="eb-rte__link">
      <input
        ref="linkInput"
        v-model="linkValue"
        type="text"
        :placeholder="t('rte.linkPlaceholder')"
        :aria-label="t('rte.link')"
        :aria-invalid="linkInvalid"
        :title="linkInvalid ? t('rte.invalidLink') : undefined"
        @input="linkInvalid = false"
        @keydown="onLinkKeyDown"
      />
      <button type="button" class="eb-rte__apply" @mousedown.prevent @click="applyLink">{{ t("rte.apply") }}</button>
      <button
        v-if="state?.link"
        type="button"
        class="eb-rte__btn"
        :title="t('rte.unlink')"
        :aria-label="t('rte.unlink')"
        @mousedown.prevent
        @click="unlink"
      >
        <EbGlyph name="link_off" />
      </button>
      <button type="button" class="eb-rte__btn" :title="t('toolbar.close')" :aria-label="t('toolbar.close')" @mousedown.prevent @click="closeLink">
        <EbGlyph name="close" />
      </button>
    </div>

    <template v-else>
      <button
        v-for="item in FORMAT"
        :key="item.command"
        type="button"
        :class="['eb-rte__btn', isActive(item.command) ? 'eb-rte__btn--active' : '']"
        :title="item.shortcut ? `${t(item.label)} (${item.shortcut})` : t(item.label)"
        :aria-label="t(item.label)"
        :aria-pressed="isActive(item.command)"
        @mousedown.prevent
        @click="run(item.command)"
      >
        <EbGlyph :name="item.icon" />
      </button>
      <span class="eb-rte__sep" aria-hidden="true" />
      <button
        v-for="item in LISTS"
        :key="item.command"
        type="button"
        :class="['eb-rte__btn', isActive(item.command) ? 'eb-rte__btn--active' : '']"
        :title="t(item.label)"
        :aria-label="t(item.label)"
        :aria-pressed="isActive(item.command)"
        @mousedown.prevent
        @click="run(item.command)"
      >
        <EbGlyph :name="item.icon" />
      </button>
      <span class="eb-rte__sep" aria-hidden="true" />
      <button
        type="button"
        :class="['eb-rte__btn', state?.link ? 'eb-rte__btn--active' : '']"
        :title="`${t('rte.link')} (⌘K)`"
        :aria-label="t('rte.link')"
        :aria-pressed="!!state?.link"
        @mousedown.prevent
        @click="openLink"
      >
        <EbGlyph name="link" />
      </button>
      <label class="eb-rte__btn" :title="t('rte.color')" @mousedown="saveForColor">
        <EbGlyph name="format_color_text" />
        <input type="color" :aria-label="t('rte.color')" @input="applyColor" />
      </label>
      <button type="button" class="eb-rte__btn" :title="t('rte.clear')" :aria-label="t('rte.clear')" @mousedown.prevent @click="run('removeFormat')">
        <EbGlyph name="format_clear" />
      </button>
    </template>
  </div>
</template>
