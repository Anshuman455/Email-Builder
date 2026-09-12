import type { Border, PreflightIssue } from "../types";
import { defineBlock } from "../registry";
import { padding } from "../document/defaults";
import { safeImageUrl } from "../util/html";
import { ICONS } from "./icons";
import { blockShellStyles, hideClass, visibilityGroup } from "./common";

/* ────────────────────────────── Image ──────────────────────────────
 *
 * Two things make an image survive an inbox: a hard pixel `width` attribute (Outlook ignores CSS
 * width) and `display:block` (Gmail adds a baseline gap without it).
 * ─────────────────────────────────────────────────────────────────────── */

export const imageBlock = defineBlock({
  type: "image",
  label: "Image",
  group: "Media",
  order: 40,
  icon: ICONS.image,
  description: "A picture, optionally linked.",
  keywords: ["photo", "picture", "logo", "banner"],
  mergeableFields: ["src", "href", "alt"],

  defaultContent: () => ({ src: "", alt: "", href: "", title: "" }),
  defaultStyle: () => ({
    padding: padding(12, 24, 12, 24),
    backgroundColor: "transparent",
    align: "center",
    /** Percentage of the available column width. Resolved to px at render time. */
    widthPercent: 100,
    borderRadius: 0,
    border: { width: 0, style: "none" as Border["style"], color: "#e2e8f0" },
    hideOnMobile: false,
    hideOnDesktop: false,
  }),

  schema: [
    {
      title: "Image",
      target: "content",
      fields: [
        { kind: "image", key: "src", label: "Source" },
        { kind: "text", key: "alt", label: "Alt text", placeholder: "Describe the image", help: "Shown when images are blocked — which is the default in many clients." },
        { kind: "url", key: "href", label: "Links to", placeholder: "https://", mergeable: true },
      ],
    },
    {
      title: "Appearance",
      target: "style",
      fields: [
        { kind: "align", key: "align", label: "Alignment" },
        { kind: "range", key: "widthPercent", label: "Width", min: 10, max: 100, step: 1, suffix: "%" },
        { kind: "number", key: "borderRadius", label: "Corner radius", min: 0, max: 60, suffix: "px" },
        { kind: "border", key: "border", label: "Border" },
      ],
    },
    { title: "Spacing", target: "style", fields: [{ kind: "padding", key: "padding", label: "Padding" }, { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true }] },
    visibilityGroup(),
  ],

  render: ({ content, style, width, esc, escAttr, url, styleAttr, preview }) => {
    const src = safeImageUrl(content.src);
    const target = Math.max(1, Math.round((width * (style.widthPercent || 100)) / 100));

    if (!src) {
      /* Preview gets a visible placeholder so an un-sourced image is obviously unfinished; the
         email gets nothing at all rather than a broken-image icon. */
      if (!preview) return "";
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td${styleAttr(blockShellStyles(style))}><div class="eb-placeholder" style="height:140px">Choose an image</div></td></tr></table>`;
    }

    const img = `<img src="${escAttr(src)}" alt="${escAttr(content.alt ?? "")}"${content.title ? ` title="${escAttr(content.title)}"` : ""} width="${target}"${styleAttr({
      width: `${target}px`,
      maxWidth: "100%",
      height: "auto",
      display: "block",
      border: "0",
      outline: "none",
      textDecoration: "none",
      borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
      ...(style.border?.width && style.border.style !== "none"
        ? { border: `${style.border.width}px ${style.border.style} ${style.border.color}` }
        : {}),
    })} />`;

    const linked = content.href ? `<a href="${escAttr(url(content.href))}" target="_blank" rel="noopener">${img}</a>` : img;
    const shell = { ...blockShellStyles(style), textAlign: style.align || "center" };
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClass(style)}><tr><td${styleAttr(shell)}>${linked}</td></tr></table>`;
  },

  text: ({ content }) => (content.alt ? `[${content.alt}]` : ""),

  validate: ({ block, content }): PreflightIssue[] => {
    const issues: PreflightIssue[] = [];
    if (content.src && !String(content.alt ?? "").trim()) {
      issues.push({
        id: `img-alt-${block.id}`,
        severity: "warning",
        message: "Image has no alt text.",
        hint: "Most clients block images by default — alt text is what the reader sees instead.",
        target: { kind: "block" as const, id: block.id },
      });
    }
    if (!content.src) {
      issues.push({
        id: `img-src-${block.id}`,
        severity: "error",
        message: "Image block has no source.",
        hint: "It will be skipped entirely when the email is sent.",
        target: { kind: "block" as const, id: block.id },
      });
    }
    return issues;
  },
});

/* ────────────────────────────── Video ──────────────────────────────
 *
 * No inbox plays video. The honest version is a thumbnail with a play badge that links out, which
 * is what every ESP ships and what this block builds.
 * ─────────────────────────────────────────────────────────────────────── */

export const videoBlock = defineBlock({
  type: "video",
  label: "Video",
  group: "Media",
  order: 50,
  icon: ICONS.video,
  description: "A thumbnail that links to the video.",
  keywords: ["youtube", "vimeo", "play", "embed"],
  mergeableFields: ["href"],

  defaultContent: () => ({ thumbnail: "", href: "", alt: "Watch the video", caption: "" }),
  defaultStyle: () => ({
    padding: padding(12, 24, 12, 24),
    backgroundColor: "transparent",
    align: "center",
    widthPercent: 100,
    borderRadius: 8,
    playBadgeColor: "#ffffff",
    hideOnMobile: false,
    hideOnDesktop: false,
  }),

  schema: [
    {
      title: "Video",
      target: "content",
      fields: [
        { kind: "url", key: "href", label: "Video URL", placeholder: "https://youtube.com/watch?v=…", mergeable: true },
        { kind: "image", key: "thumbnail", label: "Thumbnail" },
        { kind: "text", key: "alt", label: "Alt text", placeholder: "Watch the video" },
        { kind: "text", key: "caption", label: "Caption", placeholder: "Optional caption below" },
      ],
    },
    {
      title: "Appearance",
      target: "style",
      fields: [
        { kind: "align", key: "align", label: "Alignment" },
        { kind: "range", key: "widthPercent", label: "Width", min: 20, max: 100, suffix: "%" },
        { kind: "number", key: "borderRadius", label: "Corner radius", min: 0, max: 40, suffix: "px" },
      ],
    },
    { title: "Spacing", target: "style", fields: [{ kind: "padding", key: "padding", label: "Padding" }, { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true }] },
    visibilityGroup(),
  ],

  render: ({ content, style, settings, esc, escAttr, url, styleAttr, preview }) => {
    const thumb = safeImageUrl(content.thumbnail);
    const target = Math.max(1, Math.round((100 * (style.widthPercent || 100)) / 100));
    const href = content.href ? escAttr(url(content.href)) : "";

    const body = thumb
      ? `<img src="${escAttr(thumb)}" alt="${escAttr(content.alt ?? "")}" width="${target}"${styleAttr({ width: `${target}px`, maxWidth: "100%", height: "auto", display: "block", border: "0", borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined })} />`
      : preview
        ? `<div class="eb-placeholder" style="height:160px">Choose a thumbnail</div>`
        : "";

    if (!body) return "";

    const caption = content.caption
      ? `<div${styleAttr({ fontFamily: settings.fontFamily, fontSize: "13px", color: settings.textColor, paddingTop: "8px", textAlign: style.align || "center" })}>${esc(content.caption)}</div>`
      : "";

    const linked = href ? `<a href="${href}" target="_blank" rel="noopener"${styleAttr({ textDecoration: "none" })}>${body}</a>` : body;
    const shell = { ...blockShellStyles(style), textAlign: style.align || "center" };
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClass(style)}><tr><td${styleAttr(shell)}>${linked}${caption}</td></tr></table>`;
  },

  text: ({ content }) => [content.alt, content.href].filter(Boolean).join(" — "),
});
