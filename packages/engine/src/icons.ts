/* ═══ Editor icons ═══
 *
 * The chrome's icon set, as SVG strings so React and Vue render the same markup. Keys keep the
 * Material Symbols names the views were written against, which is what let the icon font go:
 * the builder no longer asks a host to load a Google Fonts stylesheet (a CSP, offline and
 * flash-of-ligature-text problem) just to draw a trash can.
 *
 * One 24×24 grid, 1.6px stroke, currentColor — sized by the stylesheet through `font-size` on
 * `.eb-glyph`, exactly as the font was. */

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

const dot = (cx: number, cy: number, r = 1.3) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`;

const tiles = `<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/>`;

export const EDITOR_ICONS = {
  /* Actions */
  add: svg(`<path d="M12 5v14M5 12h14"/>`),
  add_box: svg(`<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>`),
  content_copy: svg(`<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>`),
  delete: svg(`<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="m6 7 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>`),
  edit: svg(`<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>`),
  undo: svg(`<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12H9"/>`),
  redo: svg(`<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h5"/>`),
  check: svg(`<path d="m5 13 4 4L19 7"/>`),
  close: svg(`<path d="M6 6l12 12M18 6 6 18"/>`),
  file_download: svg(`<path d="M12 5v11"/><path d="m8 12 4 4 4-4"/><path d="M5 19h14"/>`),
  attach_file: svg(`<path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>`),
  file_upload: svg(`<path d="M12 16V5"/><path d="m8 9 4-4 4 4"/><path d="M5 19h14"/>`),
  search: svg(`<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>`),
  tune: svg(`<path d="M4 7h8M16 7h4M4 17h4M12 17h8"/><circle cx="14" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>`),
  link: svg(`<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.1 1.1"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.1-1.1"/>`),
  link_off: svg(`<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.1 1.1"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.1-1.1"/><path d="m4 4 16 16"/>`),
  code: svg(`<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>`),
  visibility: svg(`<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>`),
  desktop: svg(`<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>`),
  smartphone: svg(`<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>`),
  lock: svg(`<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`),
  mail: svg(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>`),
  auto_awesome: svg(`<path d="M11 3.5 12.8 8.7 18 10.5l-5.2 1.8L11 17.5l-1.8-5.2L4 10.5l5.2-1.8Z"/><path d="m18.5 15 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"/>`),
  lightbulb: svg(`<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2v.2h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/>`),

  /* Navigation & movement */
  arrow_back: svg(`<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>`),
  arrow_upward: svg(`<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>`),
  arrow_downward: svg(`<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>`),
  expand_more: svg(`<path d="m6 9 6 6 6-6"/>`),
  expand_less: svg(`<path d="m6 15 6-6 6 6"/>`),
  drag_indicator: svg(dot(9, 6) + dot(15, 6) + dot(9, 12) + dot(15, 12) + dot(9, 18) + dot(15, 18)),

  /* Status */
  check_circle: svg(`<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9.5"/>`),
  error: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>`),
  cloud_done: svg(`<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 10.5 3.75 3.75 0 0 1 17.5 18Z"/><path d="m9.5 13.5 2 2 3.5-3.5"/>`),
  sync: svg(`<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>`),

  /* Layout */
  table_rows: svg(`<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 14.5h18"/>`),
  view_column: svg(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v14M15 5v14"/>`),
  view_quilt: svg(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v14M9 12h12"/>`),
  widgets: svg(`${tiles}<rect x="13" y="13" width="7" height="7" rx="1.5"/>`),
  dashboard_customize: svg(`${tiles}<path d="M16.5 13v7M13 16.5h7"/>`),
  vertical_align_bottom: svg(`<path d="M12 4v11"/><path d="m8 11 4 4 4-4"/><path d="M5 20h14"/>`),
  horizontal_rule: svg(`<path d="M4 12h16"/>`),
  height: svg(`<path d="M12 4v16"/><path d="m8 7 4-3 4 3M8 17l4 3 4-3"/>`),

  /* Blocks */
  title: svg(`<path d="M5 7V4h14v3"/><path d="M12 4v16M9 20h6"/>`),
  notes: svg(`<path d="M4 6h16M4 10h16M4 14h16M4 18h10"/>`),
  format_list_bulleted: svg(`<path d="M9 6h11M9 12h11M9 18h11"/>${dot(4.5, 6, 1)}${dot(4.5, 12, 1)}${dot(4.5, 18, 1)}`),
  image: svg(`<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m4 17 4.5-4.5 3 3 3-3L20 18"/>`),
  smart_button: svg(`<rect x="3" y="7" width="18" height="10" rx="5"/><path d="M8 12h8"/>`),
  smart_display: svg(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>`),
  share: svg(`<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.9 7.6-4.4M8.2 13.1l7.6 4.4"/>`),
  star: svg(`<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>`),
  restaurant_menu: svg(`<path d="M5 3v5a2 2 0 0 0 4 0V3M7 3v18"/><path d="M17 21V3c-2 1-3 3.5-3 6v4h3"/>`),
  confirmation_number: svg(`<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5Z"/><path d="M14 7v2M14 11v2M14 15v2"/>`),
  calendar_month: svg(`<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>`),
} as const;

export type EditorIconName = keyof typeof EDITOR_ICONS;

/** SVG markup for an icon name. A value that is already markup (`<svg …>`) — a host's own icon for
 *  a toolbar action or custom block — is returned as-is; it comes from host code, not documents.
 *  Unknown names fall back to a neutral tile instead of rendering nothing. */
export function editorIcon(name: string): string {
  if (name.trimStart().startsWith("<")) return name;
  return (EDITOR_ICONS as Record<string, string>)[name] ?? EDITOR_ICONS.widgets;
}
