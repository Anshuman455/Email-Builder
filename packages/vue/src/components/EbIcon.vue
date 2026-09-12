<script setup lang="ts">
/* ═══ Icon ═══
 *
 * Icons are SVG strings, so they need a host element. `display: contents` makes that host
 * disappear from layout, which is what lets the stylesheet's own `.eb-btn svg` / `.eb-issue__icon`
 * rules keep working without a wrapper class nobody defined.
 *
 * `svgClass` lands on the <svg> itself rather than the host, because the classes that size an
 * icon — `.eb-group__chevron`, `.eb-issue__icon` — are written against the svg. */

import { computed } from "vue";

const props = defineProps<{ svg: string; svgClass?: string }>();

const markup = computed(() =>
  props.svgClass ? props.svg.replace("<svg ", `<svg class="${props.svgClass}" `) : props.svg,
);
</script>

<template>
  <span style="display: contents" v-html="markup" />
</template>
