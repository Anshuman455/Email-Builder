/* ═══ BuilderToolbar ═══
 *
 * Top toolbar:
 * Left: Back button, Title, "EMAIL TEMPLATE" badge, Subtitle, Undo/Redo pill group, Save status
 * Right: AI Assistant, Import, Code, Ready status, Preview
 */

import { useEditor } from "../context";
import { useEditorSelector } from "../hooks/useEditorState";

export interface BuilderToolbarProps {
  title?: string;
  subtitle?: string;
  badgeLabel?: string;
  backLabel?: string;
  onBack?: () => void;
  onPreview?: () => void;
  onCodeView?: () => void;
  onPreflight?: () => void;
  onImport?: () => void;
  onAI?: () => void;
  className?: string;
}

export function BuilderToolbar({
  title = "Monthly Newsletter",
  subtitle = "A monthly update for our community",
  badgeLabel = "EMAIL TEMPLATE",
  backLabel = "Templates",
  onBack,
  onPreview,
  onCodeView,
  onPreflight,
  onImport,
  onAI,
  className,
}: BuilderToolbarProps) {
  const editor = useEditor();
  const canUndo = useEditorSelector((state) => state.canUndo);
  const canRedo = useEditorSelector((state) => state.canRedo);
  const saveStatus = useEditorSelector((state) => state.saveStatus);

  let statusTone = "saved";
  let statusIcon = "cloud_done";
  let statusLabel = "Saved 30s ago";

  if (saveStatus === "dirty") {
    statusTone = "dirty";
    statusIcon = "edit";
    statusLabel = "Unsaved changes";
  } else if (saveStatus === "saving") {
    statusTone = "busy";
    statusIcon = "sync";
    statusLabel = "Saving…";
  } else if (saveStatus === "error") {
    statusTone = "error";
    statusIcon = "error";
    statusLabel = "Save error";
  }

  return (
    <header className={`builder-toolbar ${className ?? ""}`.trim()}>
      {/* Left: Back button, Title & Badge, Undo/Redo, Save status */}
      <div className="builder-toolbar__side">
        {onBack && (
          <>
            <button
              type="button"
              className="builder-toolbar__back-btn"
              title={`Back to ${backLabel}`}
              onClick={onBack}
            >
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              <span className="builder-toolbar__back-label">{backLabel}</span>
            </button>
            <span className="builder-toolbar__divider" aria-hidden="true" />
          </>
        )}

        <div className="builder-toolbar__title-meta">
          <div className="builder-toolbar__title-row">
            <span className="builder-toolbar__title-text" title={title}>{title}</span>
            {badgeLabel && <span className="builder-toolbar__badge">{badgeLabel}</span>}
          </div>
          {subtitle && (
            <span className="builder-toolbar__subtitle-text" title={subtitle}>
              {subtitle}
            </span>
          )}
        </div>

        <span className="builder-toolbar__divider" aria-hidden="true" />

        {/* Undo / Redo group */}
        <div className="builder-toolbar__undo-group" role="group" aria-label="Undo and Redo">
          <button
            type="button"
            className="builder-toolbar__undo-btn"
            disabled={!canUndo}
            aria-label="Undo (⌘Z)"
            title="Undo (⌘Z)"
            onClick={() => editor.undo()}
          >
            <span className="material-symbols-outlined" aria-hidden="true">undo</span>
          </button>
          <span className="builder-toolbar__undo-sep" aria-hidden="true" />
          <button
            type="button"
            className="builder-toolbar__undo-btn"
            disabled={!canRedo}
            aria-label="Redo (⌘⇧Z)"
            title="Redo (⌘⇧Z)"
            onClick={() => editor.redo()}
          >
            <span className="material-symbols-outlined" aria-hidden="true">redo</span>
          </button>
        </div>

        <span className="builder-toolbar__divider" aria-hidden="true" />

        {/* Save status badge */}
        <div className={`builder-toolbar__status builder-toolbar__status--${statusTone}`}>
          <span className="material-symbols-outlined builder-toolbar__status-icon" aria-hidden="true">
            {statusIcon}
          </span>
          <span className="builder-toolbar__status-label">{statusLabel}</span>
        </div>
      </div>

      {/* Right: AI, Import, Code, Ready, Preview */}
      <div className="builder-toolbar__side builder-toolbar__side--end">
        <div className="builder-toolbar__group">
          {onAI && (
            <button
              type="button"
              className="builder-toolbar__pill builder-toolbar__pill--ai"
              title="Write or polish with AI Assistant"
              onClick={onAI}
            >
              <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
              <span className="builder-toolbar__pill-label">AI Assistant</span>
            </button>
          )}

          {onImport && (
            <button
              type="button"
              className="builder-toolbar__pill"
              title="Import Template"
              onClick={onImport}
            >
              <span className="material-symbols-outlined" aria-hidden="true">file_upload</span>
              <span className="builder-toolbar__pill-label">Import</span>
            </button>
          )}

          <button
            type="button"
            className="builder-toolbar__pill"
            title="View Code"
            onClick={onCodeView}
          >
            <span className="material-symbols-outlined" aria-hidden="true">code</span>
            <span className="builder-toolbar__pill-label">Code</span>
          </button>

          <button
            type="button"
            className="builder-toolbar__pill builder-toolbar__pill--preflight builder-toolbar__pill--ready"
            title="Preflight checks"
            onClick={onPreflight}
          >
            <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
            <span className="builder-toolbar__pill-label">Ready</span>
          </button>

          <button
            type="button"
            className="builder-toolbar__pill builder-toolbar__pill--preview"
            title="Preview (⌘P)"
            onClick={onPreview}
          >
            <span className="material-symbols-outlined" aria-hidden="true">visibility</span>
            <span className="builder-toolbar__pill-label">Preview</span>
          </button>
        </div>
      </div>
    </header>
  );
}

