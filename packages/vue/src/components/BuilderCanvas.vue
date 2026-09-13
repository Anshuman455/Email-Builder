<script setup lang="ts">
/* ═══ BuilderCanvas ═══
 *
 * Generic email builder canvas:
 * 1. Command bar (undo/redo, Desktop/Mobile, Code, Preview)
 * 2. Email sheet container (responsive width, custom background & font)
 * 3. Rows with slots
 * 4. Footer with "Add row"
 */

import { computed, ref } from "vue";
import { useEditor, useTranslator } from "../context";
import { useDragState, useEditorSelector } from "../composables";
import { vDrop } from "../directives";
import BuilderRow from "./BuilderRow.vue";
import BuilderToolbar from "./BuilderToolbar.vue";
import EbGlyph from "./EbGlyph.vue";

const props = withDefaults(defineProps<{ class?: string; showToolbar?: boolean }>(), { showToolbar: true });
const emit = defineEmits<{ preview: []; code: [] }>();

const editor = useEditor();
const t = useTranslator(editor);

const rows = useEditorSelector((state) => state.document.rows);
const settings = useEditorSelector((state) => state.document.settings);
const contentWidth = computed(() => settings.value.contentWidth || 600);
const device = ref<"desktop" | "mobile">("desktop");
const dragState = useDragState();

const targetWidth = computed(() => (device.value === "mobile" ? 360 : contentWidth.value));

const sheetStyle = computed(() => ({
  maxWidth: `${targetWidth.value}px`,
  backgroundColor: settings.value.contentBackgroundColor || "#ffffff",
  fontFamily: settings.value.fontFamily || "Arial, sans-serif",
  color: settings.value.textColor || "#333333",
}));

function isSlotOver(index: number) {
  const over = dragState.value?.over;
  return over?.kind === "row-slot" && over.index === index;
}
</script>

<template>
  <main
    class="builder-canvas"
    role="region"
    :aria-label="t('canvas.label')"
    @click="editor.select(null)"
  >
    <BuilderToolbar
      v-if="showToolbar"
      v-model:device="device"
      :width="targetWidth"
      @preview="emit('preview')"
      @code="emit('code')"
    />

    <!-- Only the email scrolls; the command bar above stays put. -->
    <div class="builder-canvas__scroll">
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
          <EbGlyph name="add_box" />
          <p class="builder-canvas__empty-title">Start with a row</p>
          <p class="builder-canvas__empty-hint">Pick a layout on the left, then drag blocks into it.</p>
          <button
            type="button"
            class="btn-secondary"
            style="margin-top: 12px; padding: 8px 16px; background: var(--eb-accent); color: var(--eb-text-inverse); border: none; border-radius: 6px; cursor: pointer;"
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
              v-drop="{ editor, data: { kind: 'row-slot', index }, orientation: 'vertical' }"
              :class="['eb-row-slot', isSlotOver(index) ? 'eb-row-slot--over' : '']"
            >
              <div class="eb-row-slot__guideline" />
              <div v-if="isSlotOver(index)" class="builder-drop-indicator builder-drop-indicator--row">
                <div class="builder-drop-indicator__line" />
                <span class="builder-drop-indicator__pip builder-drop-indicator__pip--left" />
                <span class="builder-drop-indicator__pill">
                  <EbGlyph name="add" style="font-size: 13px; margin-right: 4px;" />
                  {{ t('canvas.insertRow') }}
                </span>
                <span class="builder-drop-indicator__pip builder-drop-indicator__pip--right" />
              </div>
              <div class="eb-row-slot__add">
                <button
                  type="button"
                  class="eb-row-slot__add-btn"
                  :title="t('canvas.addRow')"
                  @click.stop="editor.addRow([1], index)"
                >
                  <EbGlyph name="add" style="font-size: 14px;" />
                </button>
              </div>
            </div>
            <BuilderRow :row="row" :index="index" />
          </template>

          <!-- Trailing slot after last row -->
          <div
            v-drop="{ editor, data: { kind: 'row-slot', index: rows.length }, orientation: 'vertical' }"
            :class="['eb-row-slot', isSlotOver(rows.length) ? 'eb-row-slot--over' : '']"
          >
            <div class="eb-row-slot__guideline" />
            <div v-if="isSlotOver(rows.length)" class="builder-drop-indicator builder-drop-indicator--row">
              <div class="builder-drop-indicator__line" />
              <span class="builder-drop-indicator__pip builder-drop-indicator__pip--left" />
              <span class="builder-drop-indicator__pill">
                <EbGlyph name="add" style="font-size: 13px; margin-right: 4px;" />
                Insert row here
              </span>
              <span class="builder-drop-indicator__pip builder-drop-indicator__pip--right" />
            </div>
            <div class="eb-row-slot__add">
              <button
                type="button"
                class="eb-row-slot__add-btn"
                :title="t('canvas.addRow')"
                @click.stop="editor.addRow([1], rows.length)"
              >
                <EbGlyph name="add" style="font-size: 14px;" />
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
          <EbGlyph name="add" />
          {{ t('canvas.addRow') }}
        </button>
      </div>
    </div>
  </main>
</template>
