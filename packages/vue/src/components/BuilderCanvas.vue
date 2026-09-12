<script setup lang="ts">
/* ═══ BuilderCanvas ═══
 *
 * Generic email builder canvas:
 * 1. Viewport bar at top (Desktop 600px / Mobile 360px toggle)
 * 2. Email sheet container (responsive width, custom background & font)
 * 3. Rows with slots
 * 4. Footer with "Add row" and compliance notice
 */

import { computed } from "vue";
import { useEditor, useTranslator } from "../context";
import { useDragState, useEditorSelector } from "../composables";
import { vDrop } from "../directives";
import BuilderRow from "./BuilderRow.vue";

const props = defineProps<{ class?: string }>();

const editor = useEditor();
const t = useTranslator(editor);

const rows = useEditorSelector((state) => state.document.rows);
const settings = useEditorSelector((state) => state.document.settings);
const contentWidth = computed(() => settings.value.contentWidth || 600);
const device = useEditorSelector((state) => state.device);
const dragState = useDragState();

const targetWidth = computed(() => (device.value === "mobile" ? 360 : contentWidth.value));

const sheetStyle = computed(() => ({
  maxWidth: `${targetWidth.value}px`,
  backgroundColor: settings.value.contentBackgroundColor || "#ffffff",
  fontFamily: settings.value.fontFamily || "Arial, sans-serif",
  color: settings.value.textColor || "#333333",
}));
</script>

<template>
  <main
    class="builder-canvas"
    role="region"
    aria-label="Email Canvas"
    @click="editor.select(null)"
  >
    <!-- Viewport Switcher Bar -->
    <div class="builder-canvas__viewport-bar" @click.stop>
      <div class="builder-canvas__viewport-segmented" role="radiogroup" aria-label="Canvas preview mode">
        <button
          type="button"
          :class="['builder-canvas__viewport-btn', device === 'desktop' ? 'builder-canvas__viewport-btn--active' : '']"
          role="radio"
          :aria-checked="device === 'desktop'"
          title="Desktop Preview (600px)"
          @click="editor.setDevice('desktop')"
        >
          <span class="material-symbols-outlined" aria-hidden="true">desktop_windows</span>
          <span class="builder-canvas__viewport-label">Desktop</span>
        </button>
        <button
          type="button"
          :class="['builder-canvas__viewport-btn', device === 'mobile' ? 'builder-canvas__viewport-btn--active' : '']"
          role="radio"
          :aria-checked="device === 'mobile'"
          title="Mobile Preview (360px)"
          @click="editor.setDevice('mobile')"
        >
          <span class="material-symbols-outlined" aria-hidden="true">smartphone</span>
          <span class="builder-canvas__viewport-label">Mobile</span>
        </button>
      </div>

      <div class="builder-canvas__viewport-info">
        {{ device === 'mobile' ? '360px' : (contentWidth + 'px') }}
      </div>
    </div>

    <!-- Email Sheet -->
    <div
      :class="['builder-canvas__sheet', device === 'mobile' ? 'builder-canvas__sheet--mobile' : '']"
      :style="sheetStyle"
      @click.stop
    >
      <!-- Empty state -->
      <div
        v-if="rows.length === 0"
        v-drop="{ editor, data: { kind: 'row-slot', index: 0 }, container: true }"
        class="builder-canvas__empty"
      >
        <span class="material-symbols-outlined" aria-hidden="true">add_box</span>
        <p class="builder-canvas__empty-title">Start with a row</p>
        <p class="builder-canvas__empty-hint">Pick a layout on the left, then drag blocks into it.</p>
        <button
          type="button"
          class="btn-secondary"
          style="margin-top: 12px; padding: 8px 16px; background: #394648; color: #fff; border: none; border-radius: 6px; cursor: pointer;"
          @click="editor.addRow([1])"
        >
          Add a full-width row
        </button>
      </div>

      <!-- Rows -->
      <template v-else>
        <template v-for="(row, index) in rows" :key="row.id">
          <!-- Row slot drop zone before row -->
          <div
            v-drop="{ editor, data: { kind: 'row-slot', index } }"
            class="eb-row-slot"
          >
            <div class="eb-row-slot__add">
              <button
                type="button"
                class="eb-row-slot__add-btn"
                title="Add row"
                @click.stop="editor.addRow([1], index)"
              >
                <span class="material-symbols-outlined" style="font-size: 14px;">add</span>
              </button>
            </div>
          </div>
          <BuilderRow :row="row" :index="index" />
        </template>

        <!-- Trailing slot after last row -->
        <div
          v-drop="{ editor, data: { kind: 'row-slot', index: rows.length } }"
          class="eb-row-slot"
        >
          <div class="eb-row-slot__add">
            <button
              type="button"
              class="eb-row-slot__add-btn"
              title="Add row"
              @click.stop="editor.addRow([1], rows.length)"
            >
              <span class="material-symbols-outlined" style="font-size: 14px;">add</span>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Canvas Footer -->
    <div v-if="rows.length > 0" class="builder-canvas__footer" @click.stop>
      <button
        type="button"
        class="builder-canvas__add-row"
        @click="editor.addRow([1])"
      >
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        Add row
      </button>

      <div class="builder-canvas__locked-footer">
        <span class="material-symbols-outlined" aria-hidden="true">lock</span>
        <span>
          An unsubscribe link and postal address will be included with your email automatically.
        </span>
      </div>
    </div>
  </main>
</template>
