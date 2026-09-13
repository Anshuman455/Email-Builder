<script setup lang="ts">
/* ═══ EbGlyph ═══
 *
 * A chrome icon by name. Renders the engine's SVG inside a `.eb-glyph` span that is sized by
 * `font-size`, so every stylesheet rule written for the old icon font keeps working unchanged.
 * `class` and `style` fall through onto the span. */

import { computed } from "vue";
import { editorIcon } from "@email-builder/engine";

const props = defineProps<{ name: string }>();

const markup = computed(() => editorIcon(props.name));
</script>

<template>
  <span class="eb-glyph" aria-hidden="true" v-html="markup" />
</template>
