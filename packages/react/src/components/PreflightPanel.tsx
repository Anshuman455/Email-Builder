/* ═══ PreflightPanel ═══
 *
 * Modal listing validation issues. Issues are clickable — clicking selects the offending block. */

import { useMemo } from "react";
import type { PreflightIssue } from "@email-builder/core";
import { useEditor, useTranslator } from "../context";
import { AlertIcon, CheckIcon, InfoIcon, CloseIcon } from "../icons";
import { Portal } from "./Portal";

export interface PreflightPanelProps {
  onClose: () => void;
}

function IssueIcon({ severity }: { severity: PreflightIssue["severity"] }) {
  if (severity === "error") return <AlertIcon className="eb-issue__icon" />;
  if (severity === "warning") return <AlertIcon className="eb-issue__icon" />;
  return <InfoIcon className="eb-issue__icon" />;
}

export function PreflightPanel({ onClose }: PreflightPanelProps) {
  const editor = useEditor();
  const t = useTranslator();
  const issues = useMemo(() => editor.preflight(), [editor]);

  return (
    <Portal>
      <div
        className="eb-modal-backdrop"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="eb-modal">
          <div className="eb-modal__header">
            <span className="eb-modal__title">{t("preflight.title")}</span>
            <button
              type="button"
              className="eb-btn eb-btn--icon"
              aria-label={t("toolbar.close")}
              onClick={onClose}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="eb-modal__body">
            {issues.length === 0 ? (
              <div className="eb-issues__clean">
                <CheckIcon />
                <span>{t("preflight.clean")}</span>
              </div>
            ) : (
              <div className="eb-issues">
                {issues.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    className={`eb-issue eb-issue--${issue.severity}`}
                    onClick={() => {
                      if (issue.target?.kind === "block" && issue.target.id) {
                        editor.select({ kind: "block", id: issue.target.id });
                      }
                      onClose();
                    }}
                  >
                    <IssueIcon severity={issue.severity} />
                    <div>
                      <p className="eb-issue__message">{issue.message}</p>
                      {issue.hint && <p className="eb-issue__hint">{issue.hint}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
