/* ══════════════════════════════ @email-builder/vue ══════════════════════════════
 *
 * Vue 3 view layer over @email-builder/engine. Thin bindings: no document logic, no drag logic.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

/* ── Top-level component ── */
export { default as EmailBuilder } from "./components/EmailBuilder.vue";

/* ── Composable pieces ── */
export { default as BuilderToolbar } from "./components/BuilderToolbar.vue";
export { default as BuilderPalette } from "./components/BuilderPalette.vue";
export { default as BuilderCanvas } from "./components/BuilderCanvas.vue";
export { default as BuilderRow } from "./components/BuilderRow.vue";
export { default as BuilderColumn } from "./components/BuilderColumn.vue";
export { default as BuilderBlock } from "./components/BuilderBlock.vue";
export { default as BuilderInspector } from "./components/BuilderInspector.vue";
export { default as BuilderField } from "./components/BuilderField.vue";
export { default as BuilderPreview } from "./components/BuilderPreview.vue";
export { default as BuilderCodeView } from "./components/BuilderCodeView.vue";
export { default as PreflightPanel } from "./components/PreflightPanel.vue";
export { default as DragLayer } from "./components/DragLayer.vue";

/* ── Context ── */
export { provideEditor, useEditor, useTranslator } from "./context";
export type { Translator } from "./context";

/* ── Composables ── */
export {
  useEmailBuilder,
  useEditorState,
  useEditorSelector,
  useDragState,
} from "./composables";
export type { UseEmailBuilderOptions } from "./composables";

/* ── Directives ── */
export { vDrag, vDrop } from "./directives";
export type { DragBinding, DropBinding } from "./directives";

/* ── Icons ── */
export { UI_ICONS, SOURCE_ICONS } from "./icons";
export type { UiIconName } from "./icons";
