/* ═══ Editor state hooks ═══
 *
 * `useEditorSelector` is the one components should reach for: a toolbar that only reads
 * `canUndo` should not repaint because a colour slider moved. */

import type { EditorState } from "@email-builder/engine";
import { useEditor } from "../context";
import { useStoreSelector } from "./useStoreSelector";

export function useEditorState(): EditorState {
  const editor = useEditor();
  return useStoreSelector(editor.state, identity);
}

export function useEditorSelector<S>(
  selector: (state: EditorState) => S,
  isEqual?: (a: S, b: S) => boolean,
): S {
  const editor = useEditor();
  return useStoreSelector(editor.state, selector, isEqual);
}

const identity = (state: EditorState): EditorState => state;
