/* ═══ BuilderPreview ═══
 *
 * A modal showing the compiled HTML in an iframe. Rendered by the host via onPreview or used
 * inside the EmailBuilder's own overlay state. */

import { useEffect, useState } from "react";
import { useEditor, useTranslator } from "../context";
import { CloseIcon, DesktopIcon, MobileIcon } from "../icons";
import { Portal } from "./Portal";

export interface BuilderPreviewProps {
  onClose: () => void;
}

export function BuilderPreview({ onClose }: BuilderPreviewProps) {
  const editor = useEditor();
  const t = useTranslator();
  const [mobile, setMobile] = useState(false);

  const [previewHtml, setPreviewHtml] = useState(() => {
    try {
      return editor.compile({ preview: true, sample: true }).html;
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      const { html } = editor.compile({ preview: true, sample: true });
      setPreviewHtml(html);
    } catch {
      // Fallback
    }
  }, [editor]);

  return (
    <Portal>
      <div
        className="eb-modal-backdrop"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="eb-modal eb-modal--wide">
          <div className="eb-modal__header">
            <span className="eb-modal__title">{t("preview.title")}</span>
            <button
              type="button"
              className="eb-btn eb-btn--icon"
              aria-label={t("toolbar.desktop")}
              onClick={() => setMobile(false)}
            >
              <DesktopIcon />
            </button>
            <button
              type="button"
              className="eb-btn eb-btn--icon"
              aria-label={t("toolbar.mobile")}
              onClick={() => setMobile(true)}
            >
              <MobileIcon />
            </button>
            <button
              type="button"
              className="eb-btn eb-btn--icon"
              aria-label={t("toolbar.close")}
              onClick={onClose}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="eb-modal__body eb-modal__body--flush">
            <div className="eb-preview">
              <div className="eb-preview__stage">
                {/* `sandbox` without `allow-same-origin` or `allow-scripts`: the preview is an opaque
                    origin that cannot run script or reach the host page, whatever the email holds.
                    Popups stay allowed so links in the email still open in a new tab. */}
                <iframe
                  title={t("preview.title")}
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  srcDoc={previewHtml}
                  className={`eb-preview__frame${mobile ? " eb-preview__frame--mobile" : ""}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
