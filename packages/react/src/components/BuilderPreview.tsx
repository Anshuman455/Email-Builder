/* ═══ BuilderPreview ═══
 *
 * A modal showing the compiled HTML in an iframe. Rendered by the host via onPreview or used
 * inside the EmailBuilder's own overlay state. */

import { useEffect, useRef, useState } from "react";
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const { html } = editor.compile({ preview: true, sample: true });
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
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
                <iframe
                  ref={iframeRef}
                  title={t("preview.title")}
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
