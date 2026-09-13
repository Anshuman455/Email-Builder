<script setup>
/* ══════════════════════════════ Vue Demo ══════════════════════════════
 *
 * Standalone Email Builder Vue 3 integration demo.
 * ════════════════════════════════════════════════════════════════════ */

import { ref, shallowRef } from "vue";
import { EmailBuilder } from "@email-builder/vue";
import { SYNTAX } from "@email-builder/core";
import { GENERIC_FIELDS, CUSTOM_BLOCKS, adapter, SEED } from "demo-shared";
import "@email-builder/styles";
import "./demo.css";

const STORAGE_KEY = "email-builder.vue.demo.v3";

/* Host buttons in the command bar. Wire onClick to your own file picker or AI assistant. */
const toolbarActions = [
  { id: "attach", label: "Attach file", icon: "attach_file", onClick: () => window.alert("Open your app's file picker here.") },
  { id: "ai", label: "Write with AI", icon: "auto_awesome", onClick: () => window.alert("Open your AI assistant here.") },
];

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : SEED;
  } catch {
    return SEED;
  }
}

const theme = ref("light");
const editor = shallowRef(null);
const seed = load();

async function onSave(design) {
  await new Promise((resolve) => setTimeout(resolve, 600));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
}
</script>

<template>
  <div class="app-container">
    <EmailBuilder
      :document="seed"
      :theme="theme"
      :blocks="CUSTOM_BLOCKS"
      :merge-fields="GENERIC_FIELDS"
      :merge-syntax="SYNTAX.handlebars"
      :adapter="adapter"
      :toolbar-actions="toolbarActions"
      :autosave="{ debounceMs: 2000, maxWaitMs: 10000 }"
      :on-save="onSave"
      @ready="editor = $event"
    />
  </div>
</template>
