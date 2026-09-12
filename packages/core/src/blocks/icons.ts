/* 24×24 stroke icons, inlined as strings so the palette needs no icon dependency and a host's
   custom block can supply its own the same way. `currentColor` everywhere. */

const wrap = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  text: wrap('<path d="M4 6h16M4 11h16M4 16h10"/>'),
  heading: wrap('<path d="M5 5v14M15 5v14M5 12h10"/><path d="M17 8h3v11"/>'),
  image: wrap('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5L5 20"/>'),
  button: wrap('<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M9 12h6"/>'),
  divider: wrap('<path d="M3 12h18"/><path d="M7 7h10M7 17h10" opacity=".35"/>'),
  spacer: wrap('<path d="M4 5h16M4 19h16"/><path d="M12 9v6M9.5 11.5L12 9l2.5 2.5M9.5 12.5L12 15l2.5-2.5"/>'),
  social: wrap('<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6.5" r="2.5"/><circle cx="17" cy="17.5" r="2.5"/><path d="M8.3 10.9l6.4-3.2M8.3 13.1l6.4 3.2"/>'),
  html: wrap('<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>'),
  video: wrap('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M11 9.5l4 2.5-4 2.5z"/>'),
  list: wrap('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/>'),
  card: wrap('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 11h18M7 15h6"/>'),
  slot: wrap('<rect x="3" y="4" width="18" height="16" rx="2" stroke-dasharray="3 3"/><path d="M12 9v6M9 12h6"/>'),
  footer: wrap('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15h18"/><path d="M7 18h10" opacity=".5"/>'),
  columns: wrap('<rect x="3" y="5" width="7" height="14" rx="1.5"/><rect x="14" y="5" width="7" height="14" rx="1.5"/>'),
} as const;

export type IconName = keyof typeof ICONS;
