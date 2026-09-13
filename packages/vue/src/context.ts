/* ═══ Editor context ═══
 *
 * One editor instance reaches every component through provide/inject rather than props, because
 * the tree is deep (root → canvas → row → column → block → field) and threading it by hand would
 * make every intermediate component care about something it does not use. */

import { inject, provide, ref, type InjectionKey, type Ref } from "vue";
import { createTranslator, type Editor } from "@email-builder/engine";

export const editorKey: InjectionKey<Editor> = Symbol("email-builder:editor");

export function provideEditor(editor: Editor): void {
  provide(editorKey, editor);
}

export function useEditor(): Editor {
  const editor = inject(editorKey, null);
  if (!editor) {
    throw new Error(
      "[@email-builder/vue] No editor in context. Render inside <EmailBuilder>, or call provideEditor(editor) in a parent.",
    );
  }
  return editor;
}

export type Translator = ReturnType<typeof createTranslator>;

/* The translator is derived from `adapter.labels`, which never changes for a given editor, so it
   is cached per instance instead of rebuilt in every component that renders a string. */
const translators = new WeakMap<Editor, Translator>();

export function useTranslator(editor?: Editor): Translator {
  const target = editor ?? useEditor();
  let translator = translators.get(target);
  if (!translator) {
    translator = createTranslator(target.adapter.labels);
    translators.set(target, translator);
  }
  return translator;
}

export type BuilderTheme = "light" | "dark" | "auto";

/* Teleported overlays render outside the root element, so they read the theme from here to
   re-declare `data-eb-theme` on their own `.eb-root` wrapper (see EbPortal). */
export const themeKey: InjectionKey<Ref<BuilderTheme>> = Symbol("email-builder:theme");

export function provideTheme(theme: Ref<BuilderTheme>): void {
  provide(themeKey, theme);
}

export function useBuilderTheme(): Ref<BuilderTheme> {
  return inject(themeKey, ref<BuilderTheme>("light"));
}
