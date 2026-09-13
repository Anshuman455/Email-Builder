/* ═══ MentionMenu ═══
 *
 * Floating autocomplete menu for mapping / merge fields triggered by typing '@'
 * inside text and heading blocks.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { COMMON_FIELDS, type MergeField } from "@email-builder/core";
import type { Editor } from "@email-builder/engine";

export interface MentionMenuProps {
  editor: Editor;
  coords: { top: number; left: number };
  query: string;
  onSelect: (field: MergeField) => void;
  onClose: () => void;
}

export function MentionMenu({ editor, coords, query, onSelect, onClose }: MentionMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Group fields from editor.merge, or fallback to COMMON_FIELDS
  const groups = useMemo(() => {
    let sourceGroups = editor.merge?.groups() ?? [];
    if (!sourceGroups || sourceGroups.length === 0) {
      // Build groups from COMMON_FIELDS
      const map = new Map<string, MergeField[]>();
      for (const field of COMMON_FIELDS) {
        const grp = field.group || "Fields";
        if (!map.has(grp)) map.set(grp, []);
        map.get(grp)!.push(field);
      }
      sourceGroups = Array.from(map.entries()).map(([group, fields]) => ({ group, fields }));
    }

    const q = query.trim().toLowerCase();
    if (!q) return sourceGroups;

    return sourceGroups
      .map((g) => ({
        group: g.group,
        fields: g.fields.filter(
          (f) =>
            f.label.toLowerCase().includes(q) ||
            f.token.toLowerCase().includes(q) ||
            (f.sample && f.sample.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.fields.length > 0);
  }, [editor.merge, query]);

  // Flatten for index tracking
  const flatFields = useMemo(() => {
    const list: MergeField[] = [];
    for (const g of groups) {
      for (const f of g.fields) {
        list.push(f);
      }
    }
    return list;
  }, [groups]);

  // Keep active index in range
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) => (flatFields.length ? (prev + 1) % flatFields.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) =>
          flatFields.length ? (prev - 1 + flatFields.length) % flatFields.length : 0,
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (flatFields.length > 0 && flatFields[activeIndex]) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(flatFields[activeIndex]!);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [flatFields, activeIndex, onSelect, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handleClickOutside, true);
    return () => window.removeEventListener("mousedown", handleClickOutside, true);
  }, [onClose]);

  // Position bounds checking
  const style = useMemo(() => {
    const width = 290;
    const height = 340;
    let left = coords.left;
    let top = coords.top + 20;

    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }
    if (top + height > window.innerHeight - 12) {
      top = Math.max(12, coords.top - height - 8);
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
    };
  }, [coords]);

  let counter = 0;

  return (
    <div ref={menuRef} className="eb-mention-menu" style={style} data-eb-no-drag>
      <div className="eb-mention-menu__header">
        <div className="eb-mention-menu__header-left">
          <span className="eb-mention-menu__badge">@</span>
          <span className="eb-mention-menu__title">Mapping Fields</span>
        </div>
        <span className="eb-mention-menu__hint">Tab/Enter to insert</span>
      </div>

      {query && (
        <div className="eb-mention-menu__search">
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#94a3b8" }}>
            search
          </span>
          <span style={{ fontSize: 12, color: "#64748b" }}>Filter: &ldquo;{query}&rdquo;</span>
        </div>
      )}

      <div className="eb-mention-menu__list">
        {flatFields.length === 0 ? (
          <div className="eb-mention-menu__empty">No matching mapping fields</div>
        ) : (
          groups.map((group) => (
            <div key={group.group}>
              <div className="eb-mention-menu__group-title">{group.group}</div>
              {group.fields.map((field) => {
                const currentIndex = counter++;
                const isActive = currentIndex === activeIndex;
                const formatted = editor.merge?.format(field.token) ?? `{{${field.token}}}`;

                return (
                  <button
                    key={field.token}
                    type="button"
                    className={`eb-mention-menu__item ${isActive ? "eb-mention-menu__item--active" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelect(field);
                    }}
                    onMouseEnter={() => setActiveIndex(currentIndex)}
                  >
                    <div className="eb-mention-menu__item-left">
                      <span className="eb-mention-menu__label">{field.label}</span>
                      {field.sample && (
                        <span className="eb-mention-menu__sample">e.g. {field.sample}</span>
                      )}
                    </div>
                    <span className="eb-mention-menu__token">{formatted}</span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
