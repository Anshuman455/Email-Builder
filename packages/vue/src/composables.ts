/* ═══ Engine bindings ═══
 *
 * The engine owns the state; Vue only mirrors it. A `shallowRef` is the right container because
 * every engine store hands back a brand-new state object — deep reactivity would walk the whole
 * document on every keystroke to discover the same thing the identity check already knows.
 *
 * Subscriptions are shared per editor and reference-counted: a hundred blocks on the canvas would
 * otherwise mean a hundred listeners doing a hundred identical assignments. */

import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  onMounted,
  onScopeDispose,
  onUnmounted,
  shallowRef,
  type ComputedRef,
  type ShallowRef,
} from "vue";
import { setup, type BlockDefinition, type EmailDocument, type MergeField, type MergeSyntax } from "@email-builder/core";
import {
  createEditor,
  type Adapter,
  type DragState,
  type Editor,
  type EditorState,
  type Store,
} from "@email-builder/engine";
import { provideEditor, useEditor } from "./context";

/* ─── Store mirroring ─── */

interface Mirror<T> {
  ref: ShallowRef<T>;
  count: number;
  dispose: (() => void) | null;
}

/* Keyed by the store object itself, so the editor store and the drag store share one mechanism. */
const mirrors = new WeakMap<object, Mirror<unknown>>();

/** Mirror any engine store into a shared, reference-counted `shallowRef`. */
function useStore<T>(store: Store<T>): Readonly<ShallowRef<T>> {
  let mirror = mirrors.get(store) as Mirror<T> | undefined;
  if (!mirror) {
    mirror = { ref: shallowRef(store.get()), count: 0, dispose: null };
    mirrors.set(store, mirror as unknown as Mirror<unknown>);
  }
  const entry = mirror;
  entry.count += 1;

  const attach = () => {
    /* Re-read on attach: state may have moved between setup and mount. */
    entry.ref.value = store.get();
    if (!entry.dispose) {
      entry.dispose = store.subscribe((next) => {
        entry.ref.value = next;
      });
    }
  };

  const detach = () => {
    entry.count -= 1;
    if (entry.count <= 0 && entry.dispose) {
      entry.dispose();
      entry.dispose = null;
    }
  };

  /* Mount, not setup — nothing here may touch the DOM or subscribe during SSR. */
  if (getCurrentInstance()) {
    onMounted(attach);
    onUnmounted(detach);
  } else {
    attach();
    if (getCurrentScope()) onScopeDispose(detach);
  }

  return entry.ref;
}

/* ─── Public composables ─── */

/**
 * The whole editor state. Reactive, but coarse: prefer `useEditorSelector` so a component only
 * re-renders when the slice it reads actually changes.
 */
export function useEditorState(editor?: Editor): Readonly<ShallowRef<EditorState>> {
  const target = editor ?? useEditor();
  return useStore(target.state);
}

/**
 * One slice of editor state. Backed by a `computed`, so a state change that leaves the selected
 * value identical never invalidates the component that reads it.
 */
export function useEditorSelector<T>(selector: (state: EditorState) => T, editor?: Editor): ComputedRef<T> {
  const state = useEditorState(editor ?? useEditor());
  return computed(() => selector(state.value));
}

/** Live drag state — pointer, hovered target and indicator geometry. */
export function useDragState(editor?: Editor): Readonly<ShallowRef<DragState>> {
  const target = editor ?? useEditor();
  return useStore(target.dnd.state);
}

/* ─── Editor construction ─── */

export interface UseEmailBuilderOptions {
  document?: unknown;
  /** Added on top of the built-in block set. */
  blocks?: BlockDefinition[];
  excludeBlocks?: string[];
  mergeFields?: MergeField[];
  mergeSyntax?: MergeSyntax;
  adapter?: Adapter;
  mode?: string;
  autosave?: { debounceMs?: number; maxWaitMs?: number; enabled?: boolean };
  historyLimit?: number;
  onSave?: (document: EmailDocument) => Promise<void> | void;
  onChange?: (document: EmailDocument) => void;
  onReady?: (editor: Editor) => void;
  /** Put the new editor in context for descendants. On by default. */
  provide?: boolean;
}

/**
 * Build registries and an editor, tie them to the calling component's lifetime, and put the
 * editor in context. A host that wants the toolbar in its own chrome calls this itself and
 * renders the Builder* components directly.
 */
export function useEmailBuilder(options: UseEmailBuilderOptions = {}): Editor {
  const { blocks, merge } = setup({
    blocks: options.blocks,
    excludeBlocks: options.excludeBlocks,
    mergeFields: options.mergeFields,
    mergeSyntax: options.mergeSyntax,
  });

  const editor = createEditor({
    document: options.document,
    blocks,
    merge,
    adapter: options.adapter,
    mode: options.mode,
    autosave: options.autosave,
    historyLimit: options.historyLimit,
    save: options.onSave ? (document) => options.onSave!(document) : undefined,
    onChange: options.onChange,
  });

  if (options.provide !== false && getCurrentInstance()) provideEditor(editor);

  if (getCurrentInstance()) {
    onMounted(() => options.onReady?.(editor));
    onUnmounted(() => editor.destroy());
  } else if (getCurrentScope()) {
    onScopeDispose(() => editor.destroy());
  }

  return editor;
}
