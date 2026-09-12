/* ═══ Chrome icons ═══
 *
 * Block icons come from core's `ICONS`; these are the editor's own controls. Kept as strings in
 * one file, in one 24×24 / 1.6px stroke / currentColor style, so the toolbar, the row rail and
 * the inspector cannot drift into three visual dialects. No icon dependency: a view package that
 * pulls in an icon library forces that choice on every host. */

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const UI_ICONS = {
  undo: svg(`<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12H9"/>`),
  redo: svg(`<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h5"/>`),
  plus: svg(`<path d="M12 5v14M5 12h14"/>`),
  copy: svg(`<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>`),
  trash: svg(`<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="m6 7 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>`),
  grip: svg(
    `<circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/>`,
  ),
  chevron: svg(`<path d="m6 9 6 6 6-6"/>`),
  close: svg(`<path d="M6 6l12 12M18 6 6 18"/>`),
  eye: svg(`<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>`),
  code: svg(`<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>`),
  alert: svg(`<path d="M12 4.5 21 20H3Z"/><path d="M12 10v4.5M12 17.5h.01"/>`),
  desktop: svg(`<rect x="3" y="5" width="18" height="11" rx="2"/><path d="M9 20h6M12 16v4"/>`),
  mobile: svg(`<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M11 18h2"/>`),
  save: svg(`<path d="M5 6a2 2 0 0 1 2-2h9l4 4v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z"/><path d="M9 4v5h6V4"/><rect x="9" y="14" width="6" height="6"/>`),
  alignLeft: svg(`<path d="M4 6h16M4 12h10M4 18h13"/>`),
  alignCenter: svg(`<path d="M4 6h16M7 12h10M6 18h12"/>`),
  alignRight: svg(`<path d="M4 6h16M10 12h10M7 18h13"/>`),
  merge: svg(`<path d="M9 4H8a2 2 0 0 0-2 2v3.5a2 2 0 0 1-2 2 2 2 0 0 1 2 2V18a2 2 0 0 0 2 2h1"/><path d="M15 4h1a2 2 0 0 1 2 2v3.5a2 2 0 0 0 2 2 2 2 0 0 0-2 2V18a2 2 0 0 1-2 2h-1"/>`),
  image: svg(`<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m4 17 4.5-4.5 3 3 3-3L20 18"/>`),
  upload: svg(`<path d="M12 16V5"/><path d="m8 9 4-4 4 4"/><path d="M5 19h14"/>`),
  search: svg(`<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>`),
  check: svg(`<path d="m5 13 4 4L19 7"/>`),
  checkCircle: svg(`<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9.5"/>`),
  info: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>`),
  settings: svg(`<path d="M4 7h8M16 7h4M4 17h4M12 17h8"/><circle cx="14" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>`),
  layout: svg(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/>`),
  block: svg(`<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16"/>`),
  pointer: svg(`<path d="m6 3 13 7.5-5.5 1.2L11 17Z"/>`),
  link: svg(`<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.1 1.1"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.1-1.1"/>`),
  send: svg(`<path d="M21 4 3 11l7 2 2 7Z"/><path d="m10 13 4-4"/>`),
} as const;

export type UiIconName = keyof typeof UI_ICONS;

/** The icon a drag ghost shows, per drag source kind. */
export const SOURCE_ICONS = {
  row: UI_ICONS.layout,
  block: UI_ICONS.block,
} as const;
