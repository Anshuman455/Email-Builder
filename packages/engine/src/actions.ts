/* ═══ Toolbar actions ═══
 *
 * Host-defined buttons in the editor's command bar — attach a file, open an AI assistant, send a
 * test. Declared once here so React and Vue accept the exact same shape. */

import type { Editor } from "./editor";

export interface ToolbarAction {
  /** Stable key, unique among the actions. */
  id: string;
  /** Accessible name and tooltip. The button shows only the icon. */
  label: string;
  /** An icon name from the built-in set (`"attach_file"`, `"auto_awesome"`…) or your own `<svg>` markup. */
  icon: string;
  onClick: (editor: Editor) => void;
  /** `"start"` sits next to undo/redo; `"end"` (default) sits before Code and Preview. */
  placement?: "start" | "end";
  /** Filled accent style, for a single prominent action. */
  primary?: boolean;
  /** Toggle state — shown pressed and announced as such. Leave undefined for plain buttons. */
  active?: boolean;
  disabled?: boolean;
}
