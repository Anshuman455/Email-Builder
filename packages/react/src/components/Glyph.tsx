/* ═══ Glyph ═══
 *
 * A chrome icon by name. Renders the engine's SVG inside a `.eb-glyph` span that is sized by
 * `font-size`, so every stylesheet rule written for the old icon font keeps working unchanged. */

import type { CSSProperties } from "react";
import { editorIcon } from "@email-builder/engine";

export interface GlyphProps {
  name: string;
  className?: string;
  style?: CSSProperties;
}

export function Glyph({ name, className, style }: GlyphProps) {
  return (
    <span
      className={className ? `eb-glyph ${className}` : "eb-glyph"}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: editorIcon(name) }}
    />
  );
}
