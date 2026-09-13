/* ══════════════════════════════ @email-builder/react ══════════════════════════════
 *
 * React 18/19 view layer over @email-builder/engine. Thin bindings: no document logic, no drag
 * logic — those live in the engine. Components read engine state and call editor commands.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

/* ── Top-level component ── */
export { EmailBuilder } from "./components/EmailBuilder";
export type { EmailBuilderProps } from "./components/EmailBuilder";

/* ── Composable pieces — for hosts that want to build a custom layout ── */
export { BuilderToolbar } from "./components/BuilderToolbar";
export type { BuilderToolbarProps, BuilderDevice } from "./components/BuilderToolbar";

export { BuilderPalette } from "./components/BuilderPalette";
export { BuilderCanvas } from "./components/BuilderCanvas";
export type { BuilderCanvasProps } from "./components/BuilderCanvas";

export { BuilderRow } from "./components/BuilderRow";
export type { BuilderRowProps } from "./components/BuilderRow";

export { BuilderColumn } from "./components/BuilderColumn";
export type { BuilderColumnProps } from "./components/BuilderColumn";

export { BuilderBlock } from "./components/BuilderBlock";
export type { BuilderBlockProps } from "./components/BuilderBlock";

export { BuilderInspector } from "./components/BuilderInspector";
export { BuilderField } from "./components/BuilderField";

export { BuilderPreview } from "./components/BuilderPreview";
export type { BuilderPreviewProps } from "./components/BuilderPreview";

export { BuilderCodeView } from "./components/BuilderCodeView";
export type { BuilderCodeViewProps } from "./components/BuilderCodeView";


export { DragLayer } from "./components/DragLayer";

/* ── Context / Provider ── */
export { EditorProvider, useEditor, useTranslator, useBuilderTheme } from "./context";
export type { EditorProviderProps, BuilderTheme } from "./context";

/* ── Hooks ── */
export { useEmailBuilder } from "./hooks/useEmailBuilder";
export type { UseEmailBuilderOptions } from "./hooks/useEmailBuilder";

export { useEditorState, useEditorSelector } from "./hooks/useEditorState";
export { useDraggable, useDroppable, useDragState, useIsDragging } from "./hooks/useDnd";
export { useStoreSelector } from "./hooks/useStoreSelector";

/* ── Field types — for custom widget implementations ── */
export type { BuilderFieldProps, CustomWidgetProps } from "./types";
export { asString, asNumber, asBoolean } from "./types";
