/* No preprocessor. The stylesheet is plain CSS with custom properties, so "building" it is
   concatenation plus two guarantees a host can rely on:

   1. Colour discipline. `variables.css` is the only file allowed to hold a colour literal. Any
      hex / rgb() / hsl() elsewhere fails the build, so a host that overrides the `--eb-*`
      variables is guaranteed to re-theme everything.

   2. Containment. Every selector gets `:where(.eb-root, .eb-root *)` appended to its subject, so
      no rule can match outside the builder — a host's own `.palette-block` or `.mention-dropdown`
      is never touched. `:where()` adds zero specificity, so the cascade inside is unchanged.
      (Chosen over `@scope`, which older Firefox ESR drops wholesale — an unstyled builder.)

   Output:
     dist/email-builder.css          unlayered — default
     dist/email-builder.layered.css  same rules inside `@layer email-builder`, for hosts that
                                     order layers themselves and want their styles to win */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const parts = ["variables.css", "base.css", "layout.css", "palette.css", "canvas.css", "inspector.css", "fields.css", "overlays.css", "theme.css"];
const SCOPE = ":where(.eb-root, .eb-root *)";

/* ── 1. Colour guard ── */
const COLOR = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;
const violations = [];
for (const file of parts.filter((f) => f !== "variables.css")) {
  const source = readFileSync(join(here, "src", file), "utf8").replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  source.split("\n").forEach((line, i) => {
    if (COLOR.test(line)) violations.push(`  src/${file}:${i + 1}  ${line.trim()}`);
  });
}
if (violations.length) {
  console.error(`Colour literals outside variables.css — use a var(--eb-*) instead:\n${violations.join("\n")}`);
  process.exit(1);
}

/* ── 2. Containment ── */
function matchBrace(css, open) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const ch = css[i];
    if (ch === "/" && css[i + 1] === "*") { i = css.indexOf("*/", i + 2) + 1; continue; }
    if (ch === '"' || ch === "'") { i = css.indexOf(ch, i + 1); continue; }
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i;
  }
  throw new Error(`Unbalanced braces at offset ${open}`);
}

function splitTopLevel(text, sep) {
  const out = [];
  let depth = 0, start = 0, quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === sep && depth === 0) { out.push(text.slice(start, i)); start = i + 1; }
  }
  out.push(text.slice(start));
  return out;
}

function scopeSelector(selector) {
  const sel = selector.trim();
  /* Drag state lives on <body>; these rules are namespaced and must reach the whole page. */
  if (!sel || sel.startsWith(".eb-dragging")) return sel;
  let depth = 0, compound = 0;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && /[\s>+~]/.test(ch)) compound = i + 1;
  }
  const tail = sel.slice(compound);
  depth = 0;
  let insert = tail.length;
  for (let i = 0; i < tail.length; i++) {
    const ch = tail[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && ch === ":" && (tail[i + 1] === ":" || /^:(before|after|first-line|first-letter)\b/.test(tail.slice(i)))) { insert = i; break; }
  }
  return sel.slice(0, compound) + tail.slice(0, insert) + SCOPE + tail.slice(insert);
}

const GROUPING = new Set(["media", "supports", "container", "layer", "document"]);

function scopeRules(css) {
  let out = "", i = 0;
  while (i < css.length) {
    const ch = css[i];
    if (/\s/.test(ch)) { out += ch; i++; continue; }
    if (ch === "/" && css[i + 1] === "*") { const end = css.indexOf("*/", i + 2) + 2; out += css.slice(i, end); i = end; continue; }
    const brace = css.indexOf("{", i);
    const semi = css.indexOf(";", i);
    if (ch === "@" && semi !== -1 && (brace === -1 || semi < brace)) { out += css.slice(i, semi + 1); i = semi + 1; continue; }
    if (brace === -1) { out += css.slice(i); break; }
    const close = matchBrace(css, brace);
    const prelude = css.slice(i, brace);
    const body = css.slice(brace + 1, close);
    if (ch === "@") {
      const name = prelude.slice(1).match(/^[\w-]+/)[0];
      out += GROUPING.has(name) ? `${prelude}{${scopeRules(body)}}` : css.slice(i, close + 1);
    } else {
      if (body.includes("{")) throw new Error(`Nested CSS is not supported: ${prelude.trim()}`);
      out += `${splitTopLevel(prelude, ",").map(scopeSelector).join(",\n")} {${body}}`;
    }
    i = close + 1;
  }
  return out;
}

const css = parts.map((f) => `/* ── ${f} ── */\n${scopeRules(readFileSync(join(here, "src", f), "utf8"))}`).join("\n\n");
mkdirSync(join(here, "dist"), { recursive: true });
writeFileSync(join(here, "dist", "email-builder.css"), css);
writeFileSync(join(here, "dist", "email-builder.layered.css"), `@layer email-builder {\n${css}\n}\n`);
/* Published so hosts can read the variable names/defaults without reaching into src/. */
writeFileSync(join(here, "dist", "variables.css"), readFileSync(join(here, "src", "variables.css"), "utf8"));
console.log(`email-builder.css  ${(css.length / 1024).toFixed(1)} KB  (+ email-builder.layered.css)`);
