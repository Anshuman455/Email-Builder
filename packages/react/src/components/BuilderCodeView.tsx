/* ═══ BuilderCodeView ═══
 *
 * The HTML window, in two tabs:
 *   View    the email's HTML formatted for reading. Copy and Download take the exact compiled
 *           output, not the formatted text — whitespace can matter in email.
 *   Import  paste HTML, drop or choose an .html file, or start from this email via "Edit as HTML",
 *           then add it to the email or replace the email with it. By default it is converted into
 *           editable blocks; unticking "Convert" keeps it as one HTML block (editor.importHtml). */

import { useMemo, useRef, useState } from "react";
import { formatHtml } from "@email-builder/core";
import { useEditor, useTranslator } from "../context";
import { Glyph } from "./Glyph";
import { Portal } from "./Portal";

export interface BuilderCodeViewProps {
  onClose: () => void;
  /** Open on the Import tab instead of View. */
  initialTab?: "view" | "import";
}

export function BuilderCodeView({ onClose, initialTab = "view" }: BuilderCodeViewProps) {
  const editor = useEditor();
  const t = useTranslator();
  const [tab, setTab] = useState<"view" | "import">(initialTab);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [convert, setConvert] = useState(true);
  const [nothingFound, setNothingFound] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  /* Merge tokens are left in place: this is the HTML an ESP receives, not a sample render. */
  const html = useMemo(() => {
    try {
      return editor.compile().html;
    } catch {
      return "";
    }
  }, [editor]);
  const formatted = useMemo(() => formatHtml(html), [html]);

  const updateDraft = (value: string) => {
    setDraft(value);
    setConfirmReplace(false);
    setNothingFound(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard access is blocked outside secure contexts; the text stays selectable. */
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "email.html";
    link.click();
    URL.revokeObjectURL(url);
  };

  const editAsHtml = () => {
    let body = "";
    try {
      body = editor.compile({ fragment: true }).html;
    } catch {
      /* Leave the editor empty rather than failing the tab switch. */
    }
    updateDraft(formatHtml(body));
    setTab("import");
  };

  const readFile = async (file: File | undefined) => {
    if (file) updateDraft(await file.text());
  };

  const importAs = (mode: "append" | "replace") => {
    if (mode === "replace" && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    if (editor.importHtml(draft, { mode, as: convert ? "blocks" : "html" }).length) onClose();
    else setNothingFound(true);
  };

  const hasDraft = draft.trim().length > 0;

  return (
    <Portal>
      <div className="eb-modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
        <div className="eb-modal eb-modal--wide eb-codeview" role="dialog" aria-modal="true" aria-label={t("code.title")}>
          <div className="eb-modal__header">
            <span className="eb-modal__title">{t("code.title")}</span>
            <div className="eb-segmented" role="tablist">
              {(["view", "import"] as const).map((name) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={tab === name}
                  className={`eb-segmented__item${tab === name ? " eb-segmented__item--active" : ""}`}
                  onClick={() => setTab(name)}
                >
                  {t(`code.${name}`)}
                </button>
              ))}
            </div>
            <button type="button" className="eb-btn eb-btn--icon" aria-label={t("toolbar.close")} onClick={onClose}>
              <Glyph name="close" />
            </button>
          </div>

          {tab === "view" ? (
            <>
              <div className="eb-modal__body eb-modal__body--flush">
                <pre className="eb-code">{formatted}</pre>
              </div>
              <div className="eb-modal__footer">
                <button type="button" className="eb-btn" onClick={editAsHtml}>
                  <Glyph name="edit" />
                  {t("code.editAsHtml")}
                </button>
                <span className="eb-codeview__spacer" />
                <button type="button" className="eb-btn eb-btn--outline" onClick={download}>
                  <Glyph name="file_download" />
                  {t("code.download")}
                </button>
                <button type="button" className="eb-btn eb-btn--primary" onClick={copy}>
                  <Glyph name={copied ? "check" : "content_copy"} />
                  {copied ? t("code.copied") : t("code.copy")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="eb-modal__body eb-codeview__import">
                <textarea
                  className="eb-textarea eb-codeview__editor"
                  value={draft}
                  spellCheck={false}
                  placeholder={t("code.pastePlaceholder")}
                  aria-label={t("code.pastePlaceholder")}
                  onChange={(event) => updateDraft(event.target.value)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    void readFile(event.dataTransfer.files[0]);
                  }}
                />
                <label className="eb-codeview__option">
                  <input type="checkbox" checked={convert} onChange={(event) => setConvert(event.target.checked)} />
                  {t("code.convert")}
                </label>
                <p className={`eb-field__help${nothingFound ? " eb-codeview__error" : ""}`} role={nothingFound ? "alert" : undefined}>
                  {nothingFound ? t("code.nothingFound") : convert ? t("code.convertHint") : t("code.importHint")}
                </p>
              </div>
              <div className="eb-modal__footer">
                <input
                  ref={fileInput}
                  type="file"
                  accept=".html,.htm,text/html"
                  hidden
                  onChange={(event) => {
                    void readFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <button type="button" className="eb-btn" onClick={() => fileInput.current?.click()}>
                  <Glyph name="file_upload" />
                  {t("code.chooseFile")}
                </button>
                <span className="eb-codeview__spacer" />
                <button
                  type="button"
                  className={`eb-btn eb-btn--outline${confirmReplace ? " eb-btn--danger" : ""}`}
                  disabled={!hasDraft}
                  onClick={() => importAs("replace")}
                >
                  {confirmReplace ? t("code.replaceConfirm") : t("code.replace")}
                </button>
                <button type="button" className="eb-btn eb-btn--primary" disabled={!hasDraft} onClick={() => importAs("append")}>
                  {t("code.addBlock")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
