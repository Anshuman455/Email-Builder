import type { Border, PreflightIssue } from "../types";
import { defineBlock } from "../registry";
import { padding } from "../document/defaults";
import { safeImageUrl } from "../util/html";
import { ICONS } from "./icons";
import { blockShellStyles, hideClass, visibilityGroup } from "./common";

/* ────────────────────────────── Divider ────────────────────────────── */

export const dividerBlock = defineBlock({
  type: "divider",
  label: "Divider",
  group: "Layout",
  order: 80,
  icon: ICONS.divider,
  description: "A horizontal rule.",
  keywords: ["line", "rule", "separator", "hr"],

  defaultContent: () => ({}),
  defaultStyle: () => ({
    padding: padding(8, 24, 8, 24),
    backgroundColor: "transparent",
    lineColor: "#e2e8f0",
    lineWidth: 1,
    lineStyle: "solid",
    widthPercent: 100,
    align: "center",
    hideOnMobile: false,
    hideOnDesktop: false,
  }),

  schema: [
    {
      title: "Line",
      target: "style",
      fields: [
        { kind: "color", key: "lineColor", label: "Colour" },
        { kind: "number", key: "lineWidth", label: "Thickness", min: 1, max: 12, suffix: "px", inline: true },
        { kind: "select", key: "lineStyle", label: "Style", options: [{ label: "Solid", value: "solid" }, { label: "Dashed", value: "dashed" }, { label: "Dotted", value: "dotted" }], inline: true },
        { kind: "range", key: "widthPercent", label: "Width", min: 10, max: 100, suffix: "%" },
        { kind: "align", key: "align", label: "Alignment" },
      ],
    },
    { title: "Spacing", target: "style", fields: [{ kind: "padding", key: "padding", label: "Padding" }, { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true }] },
    visibilityGroup(),
  ],

  /* A bordered table, not `<hr>`: Outlook renders `<hr>` with its own colour and margins and
     ignores most attempts to override them. */
  render: ({ style, styleAttr }) => {
    const line = `<table role="presentation" width="${style.widthPercent || 100}%" cellpadding="0" cellspacing="0" border="0" align="${style.align || "center"}"${styleAttr({ width: `${style.widthPercent || 100}%`, borderTop: `${style.lineWidth || 1}px ${style.lineStyle || "solid"} ${style.lineColor || "#e2e8f0"}`, fontSize: "0", lineHeight: "0" })}><tr><td${styleAttr({ fontSize: "0", lineHeight: "0", height: "0" })}>&nbsp;</td></tr></table>`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClass(style)}><tr><td${styleAttr(blockShellStyles(style))}>${line}</td></tr></table>`;
  },

  text: () => "\n———\n",
});

/* ────────────────────────────── Spacer ────────────────────────────── */

export const spacerBlock = defineBlock({
  type: "spacer",
  label: "Spacer",
  group: "Layout",
  order: 90,
  icon: ICONS.spacer,
  description: "Vertical breathing room.",
  keywords: ["gap", "space", "margin", "padding"],

  defaultContent: () => ({}),
  defaultStyle: () => ({
    height: 24,
    mobileHeight: 0,
    backgroundColor: "transparent",
    hideOnMobile: false,
    hideOnDesktop: false,
  }),

  schema: [
    {
      title: "Height",
      target: "style",
      fields: [
        { kind: "range", key: "height", label: "Height", min: 4, max: 160, step: 2, suffix: "px" },
        { kind: "number", key: "mobileHeight", label: "Mobile height", min: 0, max: 160, suffix: "px", help: "0 keeps the desktop height." },
        { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true },
      ],
    },
    visibilityGroup(),
  ],

  /* `font-size:0;line-height:0` plus a `&nbsp;` — the combination every client collapses to
     exactly the declared height. An empty cell gets a default line box in Outlook. */
  render: ({ style, styleAttr }) => {
    const h = style.height || 24;
    const mobile = style.mobileHeight ? ` class="eb-spacer"` : "";
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClass(style)}><tr><td${mobile}${styleAttr({ height: `${h}px`, lineHeight: `${h}px`, fontSize: "0", backgroundColor: style.backgroundColor !== "transparent" ? style.backgroundColor : undefined })}>&nbsp;</td></tr></table>`;
  },

  text: () => "",
});

/* ────────────────────────────── Raw HTML ────────────────────────────── */

export const htmlBlock = defineBlock({
  type: "html",
  label: "HTML",
  group: "Advanced",
  order: 100,
  icon: ICONS.html,
  description: "Paste your own markup.",
  keywords: ["code", "custom", "embed", "raw"],
  mergeableFields: ["html"],

  defaultContent: () => ({ html: "<!-- Your HTML here -->" }),
  defaultStyle: () => ({ padding: padding(0), backgroundColor: "transparent", hideOnMobile: false, hideOnDesktop: false }),

  schema: [
    {
      title: "Markup",
      target: "content",
      fields: [
        {
          kind: "textarea",
          key: "html",
          label: "HTML",
          rows: 12,
          mergeable: true,
          help: "Sanitised on compile — scripts, event handlers and external stylesheets are stripped.",
        },
      ],
    },
    { title: "Spacing", target: "style", fields: [{ kind: "padding", key: "padding", label: "Padding" }, { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true }] },
    visibilityGroup(),
  ],

  /* Sanitisation happens in `compile`, which owns the policy — a block that sanitised itself
     would let a host bypass the policy by registering a block that does not. */
  render: ({ content, style, styleAttr }) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClass(style)}><tr><td${styleAttr(blockShellStyles(style))}>${content.html ?? ""}</td></tr></table>`,

  validate: ({ block, content }): PreflightIssue[] => {
    const html = String(content.html ?? "");
    if (!/<script|on[a-z]+\s*=|javascript:/i.test(html)) return [];
    return [
      {
        id: `html-unsafe-${block.id}`,
        severity: "warning",
        message: "This HTML block contains script or event handlers.",
        hint: "They are removed on compile, and no email client would run them anyway.",
        target: { kind: "block" as const, id: block.id },
      },
    ];
  },
});

/* ────────────────────────────── Content slot ──────────────────────────────
 *
 * Marks where a template's body is spliced into a reusable layout. Only offered in layout mode,
 * and only once — two slots is a question with no answer.
 * ─────────────────────────────────────────────────────────────────────── */

export const CONTENT_SLOT_PLACEHOLDER = "<!--EB:CONTENT_SLOT-->";

export const contentSlotBlock = defineBlock({
  type: "content-slot",
  label: "Content slot",
  group: "Layout",
  order: 5,
  icon: ICONS.slot,
  description: "Where the template body is inserted.",
  keywords: ["slot", "placeholder", "body"],
  singleton: true,
  modes: ["layout"],

  defaultContent: () => ({}),
  defaultStyle: () => ({ padding: padding(0) }),
  schema: [],

  render: ({ preview, styleAttr, style }) =>
    preview
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td${styleAttr(blockShellStyles(style))}><div class="eb-placeholder eb-placeholder--slot" style="height:120px">Template content appears here</div></td></tr></table>`
      : CONTENT_SLOT_PLACEHOLDER,

  text: () => CONTENT_SLOT_PLACEHOLDER,
});

/* ────────────────────────────── Footer ──────────────────────────────
 *
 * Compliance text. Its own block rather than a text block by convention, because preflight has to
 * be able to answer "does this email have an unsubscribe link" without guessing.
 * ─────────────────────────────────────────────────────────────────────── */

export const footerBlock = defineBlock({
  type: "footer",
  label: "Footer",
  group: "Layout",
  order: 110,
  icon: ICONS.footer,
  description: "Address and unsubscribe.",
  keywords: ["unsubscribe", "compliance", "legal", "address"],
  mergeableFields: ["address", "unsubscribeUrl", "extra"],

  defaultContent: () => ({
    address: "{{company.name}} · {{company.address}}",
    unsubscribeLabel: "Unsubscribe",
    unsubscribeUrl: "{{system.unsubscribe_url}}",
    preferencesLabel: "Update preferences",
    preferencesUrl: "",
    extra: "",
  }),
  defaultStyle: () => ({
    padding: padding(24, 24, 24, 24),
    backgroundColor: "transparent",
    align: "center",
    fontSize: 12,
    color: "#94a3b8",
    linkColor: "#64748b",
    lineHeight: 1.7,
    hideOnMobile: false,
    hideOnDesktop: false,
  }),

  schema: [
    {
      title: "Compliance",
      target: "content",
      fields: [
        { kind: "textarea", key: "address", label: "Postal address", rows: 2, mergeable: true, help: "Required by CAN-SPAM and most ESPs." },
        { kind: "text", key: "unsubscribeLabel", label: "Unsubscribe label", inline: true },
        { kind: "url", key: "unsubscribeUrl", label: "Unsubscribe URL", mergeable: true, inline: true },
        { kind: "text", key: "preferencesLabel", label: "Preferences label", inline: true },
        { kind: "url", key: "preferencesUrl", label: "Preferences URL", mergeable: true, inline: true },
        { kind: "textarea", key: "extra", label: "Extra line", rows: 2, mergeable: true },
      ],
    },
    {
      title: "Appearance",
      target: "style",
      fields: [
        { kind: "align", key: "align", label: "Alignment" },
        { kind: "number", key: "fontSize", label: "Size", min: 9, max: 18, suffix: "px", inline: true },
        { kind: "number", key: "lineHeight", label: "Line height", min: 1, max: 3, step: 0.1, inline: true },
        { kind: "color", key: "color", label: "Text colour" },
        { kind: "color", key: "linkColor", label: "Link colour" },
      ],
    },
    { title: "Spacing", target: "style", fields: [{ kind: "padding", key: "padding", label: "Padding" }, { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true }] },
  ],

  render: ({ content, style, settings, esc, escAttr, url, styleAttr, preview, sample }) => {
    const show = (value: string) => esc(preview && sample ? sample(value) : value);
    const link = (label: string, href: string) =>
      label && href
        ? `<a href="${escAttr(url(href))}"${styleAttr({ color: style.linkColor || "#64748b", textDecoration: "underline" })}>${esc(label)}</a>`
        : "";

    const links = [link(content.unsubscribeLabel, content.unsubscribeUrl), link(content.preferencesLabel, content.preferencesUrl)]
      .filter(Boolean)
      .join(" &nbsp;·&nbsp; ");

    const lines = [show(content.address ?? ""), links, show(content.extra ?? "")].filter(Boolean);
    const body = lines.map((line) => `<div${styleAttr({ paddingBottom: "6px" })}>${line}</div>`).join("");

    const shell = {
      ...blockShellStyles(style),
      textAlign: style.align || "center",
      fontFamily: settings.fontFamily,
      fontSize: `${style.fontSize || 12}px`,
      color: style.color || "#94a3b8",
      lineHeight: String(style.lineHeight || 1.7),
    };
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClass(style)}><tr><td${styleAttr(shell)}>${body}</td></tr></table>`;
  },

  text: ({ content }) => [content.address, content.unsubscribeUrl, content.extra].filter(Boolean).join("\n"),
});
