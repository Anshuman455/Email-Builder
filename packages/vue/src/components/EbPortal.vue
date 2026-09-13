<script setup lang="ts">
/* ═══ EbPortal ═══
 *
 * Teleports to `document.body` for anything fixed (modals, drag layer, merge menu).
 *
 * The wrapper re-declares `.eb-root` because every `--eb-*` variable is defined there, and the
 * stylesheet only matches inside an `.eb-root` — nothing inherits into `document.body`.
 * `display: contents` keeps the root's layout rules from applying to the wrapper. */

import { Teleport } from "vue";
import { useBuilderTheme } from "../context";

const theme = useBuilderTheme();
</script>

<template>
  <Teleport to="body">
    <div class="eb-root" :data-eb-theme="theme" style="display: contents">
      <slot />
    </div>
  </Teleport>
</template>
