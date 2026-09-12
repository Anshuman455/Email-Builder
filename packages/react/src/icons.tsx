/* ═══ Chrome icons ═══
 *
 * Block icons come from core's `ICONS`. These are the editor's own: one 24×24 stroke set at
 * 1.6, sized by the stylesheet rather than by props, so every button in the UI matches without
 * a sizing prop threaded through ten components. */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const UndoIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 9h10a5 5 0 010 10h-6" />
    <path d="M8 5L4 9l4 4" />
  </Svg>
);

export const RedoIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M20 9H10a5 5 0 000 10h6" />
    <path d="M16 5l4 4-4 4" />
  </Svg>
);

export const CopyIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5.5A1.5 1.5 0 0013.5 4H5.5A1.5 1.5 0 004 5.5v8A1.5 1.5 0 005.5 15" />
  </Svg>
);

export const TrashIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
);

export const PlusIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const CloseIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);

export const GripIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

export const AlignLeftIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 6h16M4 12h10M4 18h13" />
  </Svg>
);

export const AlignCenterIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 6h16M7 12h10M6 18h12" />
  </Svg>
);

export const AlignRightIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 6h16M10 12h10M7 18h13" />
  </Svg>
);

export const EyeIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
    <circle cx="12" cy="12" r="2.5" />
  </Svg>
);

export const CodeIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
  </Svg>
);

export const SaveIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M5 4h11l3 3v13H5z" />
    <path d="M9 4v5h6V4" />
    <rect x="8" y="13" width="8" height="7" />
  </Svg>
);

export const DesktopIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="5" width="18" height="11" rx="1.5" />
    <path d="M9 20h6M12 16v4" />
  </Svg>
);

export const MobileIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="7" y="3" width="10" height="18" rx="2" />
    <path d="M11 18h2" />
  </Svg>
);

export const SettingsIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v3M12 18v3M4.6 7.5l2.6 1.5M16.8 15l2.6 1.5M4.6 16.5l2.6-1.5M16.8 9l2.6-1.5" />
  </Svg>
);

export const AlertIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17.2v.1" />
  </Svg>
);

export const InfoIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8.2v.1" />
  </Svg>
);

export const CheckIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M5 13l4 4L19 7" />
  </Svg>
);

export const MergeIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M8 5H6a2 2 0 00-2 2v10a2 2 0 002 2h2M16 5h2a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
    <path d="M12 9v6" />
  </Svg>
);

export const ImageIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M21 16l-5-5L5 20" />
  </Svg>
);

export const ColumnsIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="5" width="7" height="14" rx="1.5" />
    <rect x="14" y="5" width="7" height="14" rx="1.5" />
  </Svg>
);

export const RowIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="5" width="18" height="6" rx="1.5" />
    <rect x="3" y="13" width="18" height="6" rx="1.5" />
  </Svg>
);

export const CursorIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M6 4l12 7-5 1.5L10 18z" />
  </Svg>
);
