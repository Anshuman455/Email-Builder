/* ══════════════════════════════ Preflight ══════════════════════════════
 *
 * Warnings, never a gate. An author who wants to send a 120KB email with no alt text is allowed
 * to; the job here is to make sure nobody does it by accident.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

import type { EmailDocument, PreflightIssue, PreflightContext } from "../types";
import type { CompilerDeps } from "./compile";
import { SEVERITY } from "../types";
import { columnWidths, eachBlock } from "../document/operations";
import { escapeHtml, safeUrl, styleAttr } from "../util/html";
import { compile } from "./compile";

/* Gmail clips a message past this many bytes and shows "View entire message". The clip point is
   where tracking pixels stop firing, so it is a deliverability number, not a cosmetic one. */
export const GMAIL_CLIP_BYTES = 102_400;

/* WCAG AA for body text. Applied to the sheet background, which is the only pairing this can
   check without a layout engine. */
export const MIN_CONTRAST = 4.5;

export interface PreflightOptions {
  /** Skip checks by id prefix — a host that genuinely has no unsubscribe requirement. */
  disable?: string[];
  /** Hard requirement: the document must contain a footer block. */
  requireFooter?: boolean;
  requirePreheader?: boolean;
}

export function preflight(doc: EmailDocument, deps: CompilerDeps, options: PreflightOptions = {}): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const disabled = options.disable ?? [];

  /* ── Structure ── */

  if (!doc.rows.length) {
    issues.push({
      id: "doc-empty",
      severity: SEVERITY.ERROR,
      message: "This email has no content.",
      target: { kind: "settings" },
    });
  }

  let blockCount = 0;
  let hasFooter = false;
  let hasUnsubscribe = false;
  const linkTexts = new Map<string, number>();

  eachBlock(doc, ({ block, row, column, rowIndex, columnIndex }) => {
    blockCount += 1;
    if (block.type === "footer") {
      hasFooter = true;
      if (String(block.content?.unsubscribeUrl ?? "").trim()) hasUnsubscribe = true;
    }

    const definition = deps.blocks.get(block.type);
    if (!definition) {
      issues.push({
        id: `unknown-type-${block.id}`,
        severity: SEVERITY.ERROR,
        message: `Block type "${block.type}" is not registered and will be dropped when sent.`,
        target: { kind: "block", id: block.id },
      });
      return;
    }

    /* Per-block rules, contributed by the definition. A host's custom block lints like a
       built-in one because it goes through the same call. */
    if (definition.validate) {
      const widths = columnWidths(row, doc.settings.contentWidth);
      const ctx: PreflightContext = {
        block,
        content: block.content ?? {},
        style: block.style ?? {},
        settings: doc.settings,
        width: widths[columnIndex] ?? doc.settings.contentWidth,
        esc: escapeHtml,
        escAttr: escapeHtml,
        url: (value) => safeUrl(value),
        styleAttr,
        preview: false,
        rowId: row.id,
        columnId: column.id,
      };
      try {
        issues.push(...(definition.validate(ctx) ?? []));
      } catch {
        /* A validator that throws is the host's bug; it must not stop the rest of preflight. */
      }
    }

    /* Duplicate link labels — "click here" three times is an accessibility failure and a spam
       signal. Counted across the document, reported once. */
    const label = String(block.content?.label ?? block.content?.buttonLabel ?? "").trim().toLowerCase();
    if (label) linkTexts.set(label, (linkTexts.get(label) ?? 0) + 1);
  });

  if (blockCount === 0 && doc.rows.length) {
    issues.push({
      id: "doc-no-blocks",
      severity: SEVERITY.WARNING,
      message: "Every row is empty.",
      hint: "Drag a block from the palette onto a row.",
      target: { kind: "settings" },
    });
  }

  for (const [label, count] of linkTexts) {
    if (count > 1 && (label === "click here" || label === "learn more" || label === "read more")) {
      issues.push({
        id: `dup-link-${label.replace(/\s+/g, "-")}`,
        severity: SEVERITY.INFO,
        message: `"${label}" is used ${count} times.`,
        hint: "Screen-reader users navigate by link text — repeated generic labels are unnavigable.",
      });
    }
  }

  /* ── Compliance ── */

  if (options.requireFooter !== false && !hasFooter) {
    issues.push({
      id: "no-footer",
      severity: options.requireFooter ? SEVERITY.ERROR : SEVERITY.WARNING,
      message: "No footer block.",
      hint: "Bulk email needs a postal address and an unsubscribe link in most jurisdictions.",
    });
  } else if (hasFooter && !hasUnsubscribe) {
    issues.push({
      id: "no-unsubscribe",
      severity: SEVERITY.WARNING,
      message: "The footer has no unsubscribe link.",
      target: { kind: "settings" },
    });
  }

  /* ── Size ── */

  const { html, bytes } = compile(doc, deps, { minify: true });
  if (bytes > GMAIL_CLIP_BYTES) {
    issues.push({
      id: "size-clipped",
      severity: SEVERITY.WARNING,
      message: `This email is ${Math.round(bytes / 1024)}KB — Gmail clips past ${Math.round(GMAIL_CLIP_BYTES / 1024)}KB.`,
      hint: "Clipped content is hidden behind 'View entire message', and tracking below the cut never fires.",
    });
  }

  /* ── Contrast ── */

  const contrast = contrastRatio(doc.settings.textColor, doc.settings.contentBackgroundColor);
  if (contrast !== null && contrast < MIN_CONTRAST) {
    issues.push({
      id: "contrast-body",
      severity: SEVERITY.WARNING,
      message: `Body text contrast is ${contrast.toFixed(1)}:1 — below the ${MIN_CONTRAST}:1 minimum.`,
      target: { kind: "settings" },
    });
  }

  /* ── Merge fields ── */

  if (deps.merge) {
    const unknown = deps.merge.unknown(html);
    for (const token of unknown) {
      issues.push({
        id: `unknown-token-${token}`,
        severity: SEVERITY.WARNING,
        message: `"${token}" is not a known field.`,
        hint: "It will send as literal text, or empty, depending on your provider.",
      });
    }
  }

  /* ── Width ── */

  if (doc.settings.contentWidth > 640) {
    issues.push({
      id: "width-wide",
      severity: SEVERITY.INFO,
      message: `A ${doc.settings.contentWidth}px body is wider than the 600-640px most clients show without scrolling.`,
      target: { kind: "settings" },
    });
  }

  return issues.filter((issue) => !disabled.some((prefix) => issue.id.startsWith(prefix)));
}

/* ────────────────────────────── Contrast ────────────────────────────── */

export function parseColor(input: string): [number, number, number] | null {
  if (!input) return null;
  const value = input.trim().toLowerCase();
  if (value === "transparent") return null;

  const hex = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let body = hex[1]!;
    if (body.length === 3) body = body.split("").map((c) => c + c).join("");
    return [parseInt(body.slice(0, 2), 16), parseInt(body.slice(2, 4), 16), parseInt(body.slice(4, 6), 16)];
  }

  const rgb = value.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];

  return null;
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.1 contrast ratio, or `null` when either colour cannot be parsed. */
export function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) return null;
  const a = luminance(fg);
  const b = luminance(bg);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/** Groups issues for a panel — errors first, and a stable order inside each group. */
export function groupIssues(issues: PreflightIssue[]): { severity: string; issues: PreflightIssue[] }[] {
  const order = [SEVERITY.ERROR, SEVERITY.WARNING, SEVERITY.INFO];
  return order
    .map((severity) => ({ severity, issues: issues.filter((i) => i.severity === severity) }))
    .filter((group) => group.issues.length > 0);
}
