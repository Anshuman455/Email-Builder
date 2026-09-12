/* ═══ BuilderEnvelopeBar ═══
 *
 * Subject & Inbox Preview bar sitting above the email canvas.
 * Includes character counter, personalize chip shortcuts, and preheader field.
 */

import { useState } from "react";

export interface BuilderEnvelopeBarProps {
  subject?: string;
  preheader?: string;
  contentWidth?: number;
  onUpdateSubject?: (val: string) => void;
  onUpdatePreheader?: (val: string) => void;
}

const QUICK_CHIPS = [
  { token: "{{guest.firstName|there}}", label: "First name" },
  { token: "{{restaurant.name}}", label: "Restaurant" },
  { token: "{{reservation.date}}", label: "Date" },
];

const MORE_TAGS = [
  { category: "Guest", tags: ["{{guest.firstName}}", "{{guest.lastName}}", "{{guest.email}}", "{{guest.phone}}"] },
  { category: "Restaurant", tags: ["{{restaurant.name}}", "{{restaurant.address}}", "{{restaurant.phone}}", "{{restaurant.website}}"] },
  { category: "Reservation", tags: ["{{reservation.date}}", "{{reservation.time}}", "{{reservation.partySize}}"] },
];

export function BuilderEnvelopeBar({
  subject = "A warm autumn welcome – new menu at {{restaurant.name}}",
  preheader = "Discover our seasonal crispy creations and reserve your table today.",
  contentWidth = 600,
  onUpdateSubject,
  onUpdatePreheader,
}: BuilderEnvelopeBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [activeTab, setActiveTab] = useState(MORE_TAGS[0]!.category);

  function insertTag(token: string) {
    onUpdateSubject?.((subject || "") + token);
    setShowMoreMenu(false);
  }

  return (
    <div
      className="builder-envelope-bar"
      style={{ maxWidth: `${contentWidth}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="builder-envelope-bar__header" onClick={() => setIsExpanded((prev) => !prev)}>
        <div className="builder-envelope-bar__title-group">
          <span className="builder-envelope-bar__icon-wrap">
            <span className="material-symbols-outlined" aria-hidden="true">mail</span>
          </span>
          <div className="builder-envelope-bar__title-content">
            <div className="builder-envelope-bar__title-row">
              <span className="builder-envelope-bar__title">Subject &amp; Inbox Preview</span>
              {subject && (
                <span className="builder-envelope-bar__count-badge">
                  {subject.length} chars
                </span>
              )}
            </div>
            {!subject && (
              <span className="builder-envelope-bar__badge-missing">
                Subject required
              </span>
            )}
          </div>
        </div>

        <div className="builder-envelope-bar__toggle-group">
          <span className="builder-envelope-bar__toggle-text">
            {isExpanded ? "Collapse" : "Edit Subject"}
          </span>
          <span
            className={`material-symbols-outlined builder-envelope-bar__chevron${isExpanded ? " builder-envelope-bar__chevron--expanded" : ""}`}
            aria-hidden="true"
          >
            expand_more
          </span>
        </div>
      </div>

      {isExpanded ? (
        <div className="builder-envelope-bar__body">
          {/* Subject Field */}
          <div className="builder-envelope-bar__field">
            <div className="builder-envelope-bar__label-row">
              <label className="builder-envelope-bar__label">
                Subject Line <span className="builder-envelope-bar__required">*</span>
              </label>
              <span className="builder-envelope-bar__hint-inline">
                {subject?.length ? `${subject.length} chars` : "Required for sending"}
              </span>
            </div>

            <div className="builder-envelope-bar__subject-group">
              <div className="personalize-bar builder-envelope-bar__personalize-bar">
                <span className="personalize-bar__label">
                  <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
                  PERSONALIZE:
                </span>

                <div className="personalize-bar__chips">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip.token}
                      type="button"
                      className="personalize-bar__chip"
                      title={`Insert ${chip.token}`}
                      onClick={() => insertTag(chip.token)}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">add</span>
                      {chip.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    className={`personalize-bar__chip personalize-bar__chip--more${showMoreMenu ? " personalize-bar__chip--active" : ""}`}
                    title="Browse all personalization tags"
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">tune</span>
                    More tags
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {showMoreMenu ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                </div>

                <span className="personalize-bar__hint">or type @ to search</span>

                {/* Popover Menu */}
                {showMoreMenu && (
                  <div
                    className="personalize-menu"
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      zIndex: 1000,
                      width: 280,
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                      padding: 8,
                    }}
                  >
                    <div
                      className="personalize-menu__header"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "4px 8px 8px",
                        borderBottom: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#f59e0b" }}>
                        auto_awesome
                      </span>
                      Insert Merge Tag
                    </div>
                    <div style={{ display: "flex", gap: 4, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                      {MORE_TAGS.map((cat) => (
                        <button
                          key={cat.category}
                          type="button"
                          style={{
                            border: "none",
                            background: activeTab === cat.category ? "#e0f2fe" : "transparent",
                            color: activeTab === cat.category ? "#0284c7" : "#64748b",
                            borderRadius: 4,
                            padding: "3px 8px",
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                          onClick={() => setActiveTab(cat.category)}
                        >
                          {cat.category}
                        </button>
                      ))}
                    </div>
                    <div style={{ maxHeight: 180, overflowY: "auto", padding: "4px 0" }}>
                      {MORE_TAGS.find((c) => c.category === activeTab)?.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            padding: "6px 8px",
                            fontSize: 12,
                            cursor: "pointer",
                            borderRadius: 4,
                            display: "block",
                          }}
                          onClick={() => insertTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input
                id="builder-subject-input"
                type="text"
                className="builder-envelope-bar__input"
                value={subject || ""}
                placeholder="A warm autumn welcome – new menu at {{restaurant.name}}"
                onChange={(e) => onUpdateSubject?.(e.target.value)}
              />
            </div>
          </div>

          {/* Preheader Field */}
          <div className="builder-envelope-bar__field">
            <div className="builder-envelope-bar__label-row">
              <label className="builder-envelope-bar__label">Preheader (Preview text)</label>
              <span className="builder-envelope-bar__hint-inline">Shown next to subject in inbox</span>
            </div>

            <div className="builder-envelope-bar__input-wrapper">
              <input
                id="builder-preheader-input"
                type="text"
                className="builder-envelope-bar__input"
                value={preheader || ""}
                placeholder="Discover our seasonal crispy creations and reserve your table today."
                onChange={(e) => onUpdatePreheader?.(e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed summary */
        <div className="builder-envelope-bar__collapsed-summary">
          <span className="builder-envelope-bar__summary-item">
            <strong>Subject:</strong> {subject || "Not set (Click to add)"}
          </span>
          {preheader && (
            <span className="builder-envelope-bar__summary-item">
              <strong>Preview:</strong> {preheader}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
