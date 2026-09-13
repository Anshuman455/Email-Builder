<script setup lang="ts">
/* ═══ BuilderCodeView ═══
 *
 * The HTML window, in two tabs:
 *   View    the email's HTML formatted for reading. Copy and Download take the exact compiled
 *           output, not the formatted text — whitespace can matter in email.
 *   Import  paste HTML, drop or choose an .html file, or start from this email via "Edit as HTML",
 *           then add it to the email or replace the email with it. By default it is converted into
 *           editable blocks; unticking "Convert" keeps it as one HTML block (editor.importHtml). */

import { computed, ref } from "vue";
import { formatHtml } from "@email-builder/core";
import { useEditor, useTranslator } from "../context";
import EbGlyph from "./EbGlyph.vue";
import EbPortal from "./EbPortal.vue";

const props = withDefaults(defineProps<{ initialTab?: "view" | "import" }>(), { initialTab: "view" });
const emit = defineEmits<{ close: [] }>();

const editor = useEditor();
const t = useTranslator(editor);

const tab = ref<"view" | "import">(props.initialTab);
const copied = ref(false);
const draft = ref("");
const confirmReplace = ref(false);
const convert = ref(true);
const nothingFound = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

/* Merge tokens are left in place: this is the HTML an ESP receives, not a sample render. */
let compiled = "";
try {
  compiled = editor.compile().html;
} catch {
  compiled = "";
}
const html = compiled;
const formatted = formatHtml(html);
const hasDraft = computed(() => draft.value.trim().length > 0);
const TABS = ["view", "import"] as const;

function updateDraft(value: string) {
  draft.value = value;
  confirmReplace.value = false;
  nothingFound.value = false;
}

async function copy() {
  try {
    await navigator.clipboard.writeText(html);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    /* Clipboard access is blocked outside secure contexts; the text stays selectable. */
  }
}

function download() {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "email.html";
  link.click();
  URL.revokeObjectURL(url);
}

function editAsHtml() {
  let body = "";
  try {
    body = editor.compile({ fragment: true }).html;
  } catch {
    /* Leave the editor empty rather than failing the tab switch. */
  }
  updateDraft(formatHtml(body));
  tab.value = "import";
}

async function readFile(file: File | undefined | null) {
  if (file) updateDraft(await file.text());
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  void readFile(input.files?.[0]);
  input.value = "";
}

function onDrop(event: DragEvent) {
  void readFile(event.dataTransfer?.files[0]);
}

function importAs(mode: "append" | "replace") {
  if (mode === "replace" && !confirmReplace.value) {
    confirmReplace.value = true;
    return;
  }
  if (editor.importHtml(draft.value, { mode, as: convert.value ? "blocks" : "html" }).length) emit("close");
  else nothingFound.value = true;
}
</script>

<template>
  <EbPortal>
    <div class="eb-modal-backdrop" @click.self="emit('close')">
      <div class="eb-modal eb-modal--wide eb-codeview" role="dialog" aria-modal="true" :aria-label="t('code.title')">
        <div class="eb-modal__header">
          <span class="eb-modal__title">{{ t("code.title") }}</span>
          <div class="eb-segmented" role="tablist">
            <button
              v-for="name in TABS"
              :key="name"
              type="button"
              role="tab"
              :aria-selected="tab === name"
              :class="['eb-segmented__item', tab === name ? 'eb-segmented__item--active' : '']"
              @click="tab = name"
            >
              {{ t(`code.${name}`) }}
            </button>
          </div>
          <button type="button" class="eb-btn eb-btn--icon" :aria-label="t('toolbar.close')" @click="emit('close')">
            <EbGlyph name="close" />
          </button>
        </div>

        <template v-if="tab === 'view'">
          <div class="eb-modal__body eb-modal__body--flush">
            <pre class="eb-code">{{ formatted }}</pre>
          </div>
          <div class="eb-modal__footer">
            <button type="button" class="eb-btn" @click="editAsHtml">
              <EbGlyph name="edit" />
              {{ t("code.editAsHtml") }}
            </button>
            <span class="eb-codeview__spacer" />
            <button type="button" class="eb-btn eb-btn--outline" @click="download">
              <EbGlyph name="file_download" />
              {{ t("code.download") }}
            </button>
            <button type="button" class="eb-btn eb-btn--primary" @click="copy">
              <EbGlyph :name="copied ? 'check' : 'content_copy'" />
              {{ copied ? t("code.copied") : t("code.copy") }}
            </button>
          </div>
        </template>

        <template v-else>
          <div class="eb-modal__body eb-codeview__import">
            <textarea
              class="eb-textarea eb-codeview__editor"
              :value="draft"
              spellcheck="false"
              :placeholder="t('code.pastePlaceholder')"
              :aria-label="t('code.pastePlaceholder')"
              @input="updateDraft(($event.target as HTMLTextAreaElement).value)"
              @dragover.prevent
              @drop.prevent="onDrop"
            />
            <label class="eb-codeview__option">
              <input v-model="convert" type="checkbox" />
              {{ t("code.convert") }}
            </label>
            <p :class="['eb-field__help', nothingFound ? 'eb-codeview__error' : '']" :role="nothingFound ? 'alert' : undefined">
              {{ nothingFound ? t("code.nothingFound") : convert ? t("code.convertHint") : t("code.importHint") }}
            </p>
          </div>
          <div class="eb-modal__footer">
            <input ref="fileInput" type="file" accept=".html,.htm,text/html" hidden @change="onFileChange" />
            <button type="button" class="eb-btn" @click="fileInput?.click()">
              <EbGlyph name="file_upload" />
              {{ t("code.chooseFile") }}
            </button>
            <span class="eb-codeview__spacer" />
            <button
              type="button"
              :class="['eb-btn eb-btn--outline', confirmReplace ? 'eb-btn--danger' : '']"
              :disabled="!hasDraft"
              @click="importAs('replace')"
            >
              {{ confirmReplace ? t("code.replaceConfirm") : t("code.replace") }}
            </button>
            <button type="button" class="eb-btn eb-btn--primary" :disabled="!hasDraft" @click="importAs('append')">
              {{ t("code.addBlock") }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </EbPortal>
</template>
