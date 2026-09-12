/* ═══ Portal ═══
 *
 * Anything fixed — the drag layer, the merge menu, modals — has to escape the inspector, which
 * is a `translateX`-animated sheet below 1100px and would otherwise become the containing block
 * for `position: fixed`.
 *
 * The wrapper re-declares `.eb-root` because every `--eb-*` token is defined there and nothing
 * inherits into `document.body`. `display: contents` keeps that class from also bringing the
 * root's full-height flex box and page background along with it. */

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBuilderTheme } from "../context";

const CONTENTS = { display: "contents" } as const;

export function Portal({ children }: { children: ReactNode }) {
  const theme = useBuilderTheme();
  const [host, setHost] = useState<HTMLElement | null>(null);

  /* Mount-only, so the server render emits nothing and hydration has nothing to mismatch. */
  useEffect(() => {
    setHost(document.body);
    return () => setHost(null);
  }, []);

  if (!host) return null;

  return createPortal(
    <div className="eb-root" data-eb-theme={theme} style={CONTENTS}>
      {children}
    </div>,
    host,
  );
}
