import type { Border, PreflightIssue } from "../types";
import { defineBlock } from "../registry";
import { padding } from "../document/defaults";
import { safeImageUrl } from "../util/html";
import { ICONS } from "./icons";
import { blockShellStyles, hideClass, visibilityGroup } from "./common";

/* ══════════════════════════════ Card ══════════════════════════════
 *
 * The generic "one record, presented" block — a product, a property, a job, a course, an event.
 * Deliberately not named after any of them.
 *
 * ── Why it carries a `record` field ───────────────────────────────────────────────────────────
 * This is the block that shows what the `record` field kind is for. A host registers a record
 * source in its adapter; the inspector shows a picker; picking a row runs `mapToContent` and fills
 * the card from the host's own schema. No CRM vocabulary reaches this file.
 *
 * The picker is a convenience, not a binding: once mapped, the values are ordinary content and an
 * author can edit them. A card that re-fetched at send time would be a different feature, and one
 * that belongs to the host.
 *
 * ════════════════════════════════════════════════════════════════════════════════════════════ */

export const CARD_LAYOUTS = [
  { label: "Image top", value: "image-top" },
  { label: "Image left", value: "image-left" },
  { label: "Image right", value: "image-right" },
  { label: "No image", value: "text-only" },
];

export const cardBlock = defineBlock({
  type: "card",
  label: "Card",
  group: "Content",
  order: 65,
  icon: ICONS.card,
  description: "An image, a title and a call to action.",
  keywords: ["product", "item", "feature", "listing", "record"],
  mergeableFields: ["eyebrow", "title", "description", "meta", "buttonLabel", "href"],

  defaultContent: () => ({
    image: "",
    eyebrow: "",
    title: "A title for this card",
    description: "One or two lines explaining why it matters.",
    meta: "",
    buttonLabel: "Learn more",
    href: "",
    /** Set by the record picker so a host can tell which row a card came from. */
    recordId: "",
  }),

  defaultStyle: () => ({
    layout: "image-top" as string,
    padding: padding(12, 24, 12, 24),
    backgroundColor: "#ffffff",
    cardPadding: padding(0),
    borderRadius: 10,
    border: { width: 1, style: "solid" as Border["style"], color: "#e2e8f0" },
    imageWidthPercent: 40,
    imageRadius: 8,
    align: "left",
    titleSize: 18,
    titleColor: "",
    bodySize: 14,
    bodyColor: "",
    metaSize: 14,
    metaColor: "#0f172a",
    buttonColor: "#2563eb",
    buttonTextColor: "#ffffff",
    buttonRadius: 6,
    hideOnMobile: false,
    hideOnDesktop: false,
  }),

  schema: [
    {
      title: "Source",
      target: "content",
      fields: [
        {
          kind: "record",
          key: "recordId",
          label: "Fill from record",
          source: "records",
          help: "Optional. Picks a row from your CRM and fills the fields below — you can still edit them afterwards.",
        },
      ],
    },
    {
      title: "Content",
      target: "content",
      fields: [
        { kind: "image", key: "image", label: "Image", when: (_v, b) => b.style.layout !== "text-only" },
        { kind: "text", key: "eyebrow", label: "Eyebrow", placeholder: "Optional label above the title", mergeable: true },
        { kind: "text", key: "title", label: "Title", mergeable: true },
        { kind: "textarea", key: "description", label: "Description", rows: 3, mergeable: true },
        { kind: "text", key: "meta", label: "Meta", placeholder: "Price, date, location…", mergeable: true },
        { kind: "text", key: "buttonLabel", label: "Button label", inline: true, mergeable: true },
        { kind: "url", key: "href", label: "Button link", inline: true, mergeable: true },
      ],
    },
    {
      title: "Layout",
      target: "style",
      fields: [
        { kind: "select", key: "layout", label: "Arrangement", options: CARD_LAYOUTS },
        { kind: "range", key: "imageWidthPercent", label: "Image width", min: 20, max: 70, suffix: "%", when: (_v, b) => b.style.layout === "image-left" || b.style.layout === "image-right" },
        { kind: "number", key: "imageRadius", label: "Image radius", min: 0, max: 40, suffix: "px", when: (_v, b) => b.style.layout !== "text-only" },
        { kind: "align", key: "align", label: "Text alignment" },
      ],
    },
    {
      title: "Card surface",
      target: "style",
      fields: [
        { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true },
        { kind: "border", key: "border", label: "Border" },
        { kind: "number", key: "borderRadius", label: "Corner radius", min: 0, max: 40, suffix: "px" },
        { kind: "padding", key: "cardPadding", label: "Inner padding" },
      ],
    },
    {
      title: "Typography",
      target: "style",
      fields: [
        { kind: "number", key: "titleSize", label: "Title size", min: 12, max: 40, suffix: "px", inline: true },
        { kind: "color", key: "titleColor", label: "Title colour", inline: true },
        { kind: "number", key: "bodySize", label: "Body size", min: 10, max: 24, suffix: "px", inline: true },
        { kind: "color", key: "bodyColor", label: "Body colour", inline: true },
        { kind: "number", key: "metaSize", label: "Meta size", min: 10, max: 32, suffix: "px", inline: true },
        { kind: "color", key: "metaColor", label: "Meta colour", inline: true },
      ],
    },
    {
      title: "Button",
      target: "style",
      fields: [
        { kind: "color", key: "buttonColor", label: "Background", inline: true },
        { kind: "color", key: "buttonTextColor", label: "Label", inline: true },
        { kind: "number", key: "buttonRadius", label: "Corner radius", min: 0, max: 30, suffix: "px" },
      ],
    },
    { title: "Spacing", target: "style", fields: [{ kind: "padding", key: "padding", label: "Outer padding" }] },
    visibilityGroup(),
  ],

  render: ({ content, style, settings, width, esc, escAttr, url, styleAttr, preview, sample }) => {
    const show = (value: unknown) => {
      const raw = String(value ?? "");
      if (!raw) return "";
      return esc(preview && sample ? sample(raw) : raw);
    };

    const cardPad = style.cardPadding ?? padding(0);
    const innerWidth = Math.max(
      0,
      width - (cardPad.left || 0) - (cardPad.right || 0) - 2 * (style.border?.width || 0),
    );
    const beside = style.layout === "image-left" || style.layout === "image-right";
    const imageWidth = beside ? Math.round((innerWidth * (style.imageWidthPercent || 40)) / 100) : innerWidth;
    const textWidth = beside ? innerWidth - imageWidth - 16 : innerWidth;

    const src = safeImageUrl(content.image);
    const imageHtml =
      style.layout === "text-only"
        ? ""
        : src
          ? `<img src="${escAttr(src)}" alt="${escAttr(content.title ?? "")}" width="${imageWidth}"${styleAttr({ width: `${imageWidth}px`, maxWidth: "100%", height: "auto", display: "block", border: "0", borderRadius: style.imageRadius ? `${style.imageRadius}px` : undefined })} />`
          : preview
            ? `<div class="eb-placeholder" style="height:${beside ? 110 : 150}px">Image</div>`
            : "";

    const line = (html: string, styles: Record<string, any>) => (html ? `<div${styleAttr(styles)}>${html}</div>` : "");

    const button = content.buttonLabel
      ? `<div${styleAttr({ paddingTop: "14px" })}><a href="${escAttr(url(content.href))}" target="_blank" rel="noopener"${styleAttr({
          display: "inline-block",
          backgroundColor: style.buttonColor,
          color: style.buttonTextColor,
          fontFamily: settings.fontFamily,
          fontSize: "14px",
          fontWeight: "600",
          lineHeight: "1.2",
          padding: "11px 20px",
          borderRadius: style.buttonRadius ? `${style.buttonRadius}px` : undefined,
          textDecoration: "none",
        })}>${show(content.buttonLabel)}</a></div>`
      : "";

    const textHtml =
      line(show(content.eyebrow), {
        fontFamily: settings.fontFamily,
        fontSize: "11px",
        fontWeight: "700",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: style.metaColor || settings.linkColor,
        paddingBottom: "6px",
      }) +
      line(show(content.title), {
        fontFamily: settings.fontFamily,
        fontSize: `${style.titleSize || 18}px`,
        fontWeight: "700",
        color: style.titleColor || settings.headingColor,
        lineHeight: "1.3",
        paddingBottom: "6px",
      }) +
      line(show(content.description), {
        fontFamily: settings.fontFamily,
        fontSize: `${style.bodySize || 14}px`,
        color: style.bodyColor || settings.textColor,
        lineHeight: "1.6",
      }) +
      line(show(content.meta), {
        fontFamily: settings.fontFamily,
        fontSize: `${style.metaSize || 14}px`,
        fontWeight: "700",
        color: style.metaColor || settings.headingColor,
        paddingTop: "8px",
      }) +
      button;

    const textCell = `<td valign="top" width="${textWidth}"${styleAttr({ width: `${textWidth}px`, textAlign: style.align || "left" })}>${textHtml}</td>`;
    const imageCell = imageHtml
      ? `<td valign="top" width="${imageWidth}"${styleAttr({ width: `${imageWidth}px`, paddingRight: style.layout === "image-left" ? "16px" : undefined, paddingLeft: style.layout === "image-right" ? "16px" : undefined })}>${imageHtml}</td>`
      : "";

    /* Beside layouts are one row of two cells; stacked layouts are two rows of one. Written out
       rather than generated, because the `class="eb-stack"` hook that collapses the beside
       version on mobile only applies to the first shape. */
    const body = beside
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="eb-stack"><tr>${style.layout === "image-left" ? imageCell + textCell : textCell + imageCell}</tr></table>`
      : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${imageHtml ? `<tr><td${styleAttr({ paddingBottom: "12px" })}>${imageHtml}</td></tr>` : ""}<tr>${textCell}</tr></table>`;

    const surface = styleAttr({
      backgroundColor: style.backgroundColor !== "transparent" ? style.backgroundColor : undefined,
      padding: `${cardPad.top || 0}px ${cardPad.right || 0}px ${cardPad.bottom || 0}px ${cardPad.left || 0}px`,
      borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
      ...(style.border?.width && style.border.style !== "none"
        ? { border: `${style.border.width}px ${style.border.style} ${style.border.color}` }
        : {}),
    });

    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClass(style)}><tr><td${styleAttr(blockShellStyles({ ...style, align: undefined }))}><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td${surface}>${body}</td></tr></table></td></tr></table>`;
  },

  text: ({ content }) =>
    [content.eyebrow, content.title, content.description, content.meta, content.href && `→ ${content.href}`]
      .filter(Boolean)
      .join("\n"),

  validate: ({ block, content }): PreflightIssue[] => {
    if (!content.buttonLabel || String(content.href ?? "").trim()) return [];
    return [
      {
        id: `card-href-${block.id}`,
        severity: "error",
        message: `Card "${content.title || "untitled"}" has a button with no link.`,
        target: { kind: "block" as const, id: block.id },
      },
    ];
  },
});
