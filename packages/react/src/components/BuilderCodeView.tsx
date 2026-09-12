/* ═══ BuilderCodeView ═══
 *
 * Modal that shows the compiled HTML source in a <pre>. Copy button puts it on the clipboard. */

import { useEffect, useState } from "react";
import { useEditor, useTranslator } from "../context";
import { CloseIcon, CopyIcon } from "../icons";
import { Portal } from "./Portal";

export interface BuilderCodeViewProps {
  onClose: () => void;
}

export function BuilderCodeView({ onClose }: BuilderCodeViewProps) {
  const editor = useEditor();
  const t = useTranslator();
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const { html: compiled } = editor.compile({ sample: true, minify: false });
    setHtml(compiled);
  }, [editor]);

  const copy = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Portal>
      <div
        className="eb-modal-backdrop"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="eb-modal eb-modal--wide">
          <div className="eb-modal__header">
            <span className="eb-modal__title">{t("code.title")}</span>
            <button type="button" className="eb-btn" onClick={copy}>
              <CopyIcon />
              {copied ? t("code.copied") : t("code.copy")}
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
          <div className="eb-modal__body eb-modal__body--flush" style={{ overflowY: "auto" }}>
            <pre className="eb-code">{html}</pre>
          </div>
        </div>
      </div>
    </Portal>
  );
}
