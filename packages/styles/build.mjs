/* No preprocessor. The stylesheet is plain CSS with custom properties, so "building" it is
   concatenation — and a host can drop the single file into any pipeline without a Sass toolchain. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const parts = ["tokens.css", "layout.css", "palette.css", "canvas.css", "inspector.css", "fields.css", "overlays.css", "theme.css"];
let imports = [];
let cssParts = [];
for (const f of parts) {
  let content = readFileSync(join(here, "src", f), "utf8");
  content = content.replace(/@import\s+url\([^)]+\);\s*/g, (match) => {
    imports.push(match.trim());
    return "";
  });
  cssParts.push(`/* ── ${f} ── */\n${content}`);
}
const css = [...new Set(imports), ...cssParts].join("\n\n");
mkdirSync(join(here, "dist"), { recursive: true });
writeFileSync(join(here, "dist", "email-builder.css"), css);
console.log(`email-builder.css  ${(css.length / 1024).toFixed(1)} KB`);
