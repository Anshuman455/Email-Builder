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

const STORAGE_KEY = "email-builder.vue.demo.v2";

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
      title="Monthly Newsletter"
      subtitle="A monthly update for our community"
      badge-label="EMAIL TEMPLATE"
      back-label="Templates"
      :theme="theme"
      :blocks="CUSTOM_BLOCKS"
      :merge-fields="GENERIC_FIELDS"
      :merge-syntax="SYNTAX.handlebars"
      :adapter="adapter"
      :autosave="{ debounceMs: 2000, maxWaitMs: 10000 }"
      :on-save="onSave"
      @ready="editor = $event"
    />
  </div>
</template>
