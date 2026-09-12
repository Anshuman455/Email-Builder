/* ═══ Editor context ═══
 *
 * One context for the editor and the translator together: every component that needs the editor
 * also needs `t`, and splitting them would double the provider nesting for no benefit. */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createTranslator, type Editor } from "@email-builder/engine";

export type Translate = (key: string, fallback?: string) => string;

export type BuilderTheme = "light" | "dark" | "auto";

interface EditorContextValue {
  editor: Editor;
  t: Translate;
  theme: BuilderTheme;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export interface EditorProviderProps {
  editor: Editor;
  /** Override the translator. Defaults to one built from `editor.adapter.labels`. */
  t?: Translate;
  /** Carried in context so portalled layers can re-declare `.eb-root` and keep the tokens. */
  theme?: BuilderTheme;
  children?: ReactNode;
}

export function EditorProvider({ editor, t, theme = "light", children }: EditorProviderProps) {
  const value = useMemo<EditorContextValue>(
    () => ({ editor, t: t ?? createTranslator(editor.adapter.labels), theme }),
    [editor, t, theme],
  );
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): Editor {
  const value = useContext(EditorContext);
  if (!value) throw new Error("useEditor must be used inside <EditorProvider> (or <EmailBuilder>).");
  return value.editor;
}

/** Internal: every visible string goes through this, so a host can relabel the whole UI. */
export function useTranslator(): Translate {
  const value = useContext(EditorContext);
  if (!value) throw new Error("useTranslator must be used inside <EditorProvider> (or <EmailBuilder>).");
  return value.t;
}

export function useBuilderTheme(): BuilderTheme {
  return useContext(EditorContext)?.theme ?? "light";
}
