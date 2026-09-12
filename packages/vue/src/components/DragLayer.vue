<script setup lang="ts">
/* ═══ DragLayer ═══
 *
 * Fixed layer portalled to `document.body` that follows the pointer during a drag.
 * Ghost + indicator are driven entirely by the engine's drag store — no local state. */

import { computed, Teleport } from "vue";
import { ICONS } from "@email-builder/core";
import { useEditor } from "../context";
import { useDragState } from "../composables";
import { UI_ICONS, SOURCE_ICONS } from "../icons";
import EbIcon from "./EbIcon.vue";

const editor = useEditor();
const drag = useDragState(editor);

const active = computed(() => drag.value.active);
const pointer = computed(() => drag.value.pointer);
const indicator = computed(() => drag.value.indicator);

const ghostStyle = computed(() => {
  const p = pointer.value;
  if (!p) return {};
  return { transform: `translate3d(${p.x + 12}px,${p.y + 12}px,0)` };
});

const ghostLabel = computed(() => {
  const a = active.value;
  if (!a) return "";
  if (a.kind === "block") return editor.blocks.get(a.blockId)?.label ?? a.blockId;
  if (a.kind === "palette") return editor.blocks.get(a.blockType)?.label ?? a.blockType;
  if (a.kind === "row") return "Row";
  return "";
});

const ghostIcon = computed(() => {
  const a = active.value;
  if (!a) return "";
  if (a.kind === "block" || a.kind === "palette") {
    const type = a.kind === "block" ? a.blockId : a.blockType;
    const def = editor.blocks.get(type);
    if (def?.icon && def.icon in ICONS) return (ICONS as Record<string, string>)[def.icon] ?? "";
  }
  if (a.kind === "row") return SOURCE_ICONS.row;
  if (a.kind === "block") return SOURCE_ICONS.block;
  return "";
});

const indicatorClass = computed(() => {
  const ind = indicator.value;
  if (!ind) return "";
  const e = ind.edge;
  if (e === "inside") return "eb-indicator eb-indicator--inside";
  if (e === "before" || e === "after") return "eb-indicator eb-indicator--vertical";
  return "eb-indicator eb-indicator--horizontal";
});

const indicatorStyle = computed<Record<string, string>>(() => {
  const ind = indicator.value;
  if (!ind) return {} as Record<string, string>;
  const { rect, edge } = ind;
  const rectBottom = rect.top + rect.height;
  const rectRight = rect.left + rect.width;
  if (edge === "inside") {
    return { top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` };
  }
  if (edge === "before" || edge === "after") {
    const top = edge === "before" ? rect.top : rectBottom;
    return { top: `${top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: "3px" };
  }
  const left = edge === "left" ? rect.left : rectRight;
  return { top: `${rect.top}px`, left: `${left}px`, width: "3px", height: `${rect.height}px` };
});
</script>

<template>
  <Teleport to="body">
    <div v-if="active && pointer" class="eb-ghost" :style="ghostStyle">
      <div class="eb-ghost__inner">
        <EbIcon v-if="ghostIcon" :svg="ghostIcon" />
        {{ ghostLabel }}
      </div>
    </div>
    <div v-if="indicator" :class="indicatorClass" :style="indicatorStyle" />
  </Teleport>
</template>
