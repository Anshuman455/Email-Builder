import type { Border, PreflightIssue } from "../types";
import { defineBlock } from "../registry";
import { padding } from "../document/defaults";
import { mso, safeImageUrl } from "../util/html";
import { ICONS } from "./icons";
import { blockShellStyles, hideClass, visibilityGroup } from "./common";

/* ────────────────────────────── Button ──────────────────────────────
 *
 * A padded <a> inside a single-cell table. Outlook ignores padding on anchors, so the mso branch
 * draws a VML rounded rectangle at the same dimensions — that pair is the whole trick, and it is
 * why this block is more markup than it looks like it should be.
 * ─────────────────────────────────────────────────────────────────────── */

export const buttonBlock = defineBlock({
  type: "button",
  label: "Button",
  group: "Content",
  order: 60,
  icon: ICONS.button,
  description: "A call to action.",
  keywords: ["cta", "link", "action"],
  inlineEditKey: "label",
  mergeableFields: ["label", "href"],

  defaultContent: () => ({ label: "Get started", href: "https://", title: "" }),
  defaultStyle: () => ({
    padding: padding(16, 24, 16, 24),
    backgroundColor: "transparent",
    align: "left",
    buttonColor: "#2563eb",
    textColor: "#ffffff",
    fontFamily: "",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0,
    borderRadius: 6,
    paddingX: 28,
    paddingY: 14,
    fullWidth: false,
    border: { width: 0, style: "none" as Border["style"], color: "#2563eb" },
    hideOnMobile: false,
    hideOnDesktop: false,
  }),

  schema: [
    {
      title: "Button",
      target: "content",
      fields: [
        { kind: "text", key: "label", label: "Label", mergeable: true, placeholder: "Get started" },
        { kind: "url", key: "href", label: "Links to", mergeable: true, placeholder: "https://" },
        { kind: "text", key: "title", label: "Tooltip", placeholder: "Optional" },
      ],
    },
    {
      title: "Appearance",
      target: "style",
      fields: [
        { kind: "align", key: "align", label: "Alignment", when: (_v, b) => !b.style.fullWidth },
        { kind: "toggle", key: "fullWidth", label: "Full width" },
        { kind: "color", key: "buttonColor", label: "Button colour" },
        { kind: "color", key: "textColor", label: "Label colour" },
        { kind: "number", key: "borderRadius", label: "Corner radius", min: 0, max: 40, suffix: "px" },
        { kind: "border", key: "border", label: "Border" },
      ],
    },
    {
      title: "Typography & size",
      target: "style",
      fields: [
        { kind: "font", key: "fontFamily", label: "Font" },
        { kind: "number", key: "fontSize", label: "Size", min: 10, max: 32, suffix: "px", inline: true },
        { kind: "select", key: "fontWeight", label: "Weight", options: [{ label: "Regular", value: "400" }, { label: "Semibold", value: "600" }, { label: "Bold", value: "700" }], inline: true },
        { kind: "number", key: "paddingX", label: "Horizontal padding", min: 0, max: 80, suffix: "px", inline: true },
        { kind: "number", key: "paddingY", label: "Vertical padding", min: 0, max: 48, suffix: "px", inline: true },
      ],
    },
    { title: "Spacing", target: "style", fields: [{ kind: "padding", key: "padding", label: "Padding" }, { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true }] },
    visibilityGroup(),
  ],

  render: ({ content, style, settings, width, esc, escAttr, url, styleAttr, preview, sample }) => {
    const raw = String(content.label ?? "");
    const label = esc(preview && sample ? sample(raw) : raw);
    const href = escAttr(url(content.href));
    const radius = style.borderRadius || 0;
    const padX = style.paddingX ?? 28;
    const padY = style.paddingY ?? 14;
    const font = style.fontFamily || settings.fontFamily;

    const anchor = `<a href="${href}" target="_blank" rel="noopener"${content.title ? ` title="${escAttr(content.title)}"` : ""}${styleAttr({
      display: "inline-block",
      backgroundColor: style.buttonColor,
      color: style.textColor,
      fontFamily: font,
      fontSize: `${style.fontSize || 16}px`,
      fontWeight: style.fontWeight || "600",
      letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
      lineHeight: "1.2",
      textDecoration: "none",
      textAlign: "center",
      padding: `${padY}px ${padX}px`,
      borderRadius: radius ? `${radius}px` : undefined,
      msoPadding: undefined,
      ...(style.border?.width && style.border.style !== "none"
        ? { border: `${style.border.width}px ${style.border.style} ${style.border.color}` }
        : {}),
      ...(style.fullWidth ? { width: "100%", boxSizing: "border-box" } : {}),
    })}>${label}</a>`;

    /* VML twin for Outlook 2007-2019. Height is derived, not authored, so the two versions can
       never disagree about how tall the button is. */
    const vmlWidth = style.fullWidth ? width : Math.round(label.length * (style.fontSize || 16) * 0.6 + padX * 2);
    const vmlHeight = padY * 2 + Math.round((style.fontSize || 16) * 1.2);
    const vml = mso(
      `<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:${vmlHeight}px;v-text-anchor:middle;width:${vmlWidth}px;" arcsize="${Math.round((radius / Math.max(vmlHeight, 1)) * 100)}%" stroke="f" fillcolor="${escAttr(style.buttonColor)}"><w:anchorlock/><center style="color:${escAttr(style.textColor)};font-family:${escAttr(font)};font-size:${style.fontSize || 16}px;font-weight:${escAttr(style.fontWeight || "600")};">${label}</center></v:roundrect>`,
    );

    const shell = { ...blockShellStyles(style), textAlign: style.fullWidth ? "center" : style.align || "left" };
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClass(style)}><tr><td${styleAttr(shell)}>${vml}${anchor}</td></tr></table>`;
  },

  text: ({ content }) => `${content.label ?? ""}: ${content.href ?? ""}`,

  validate: ({ block, content }): PreflightIssue[] => {
    const href = String(content.href ?? "").trim();
    if (href && href !== "https://") return [];
    return [
      {
        id: `button-href-${block.id}`,
        severity: "error",
        message: `Button "${content.label || "untitled"}" has no destination.`,
        hint: "A button that goes nowhere is the most common reason a campaign gets resent.",
        target: { kind: "block" as const, id: block.id },
      },
    ];
  },
});

/* ────────────────────────────── Social ──────────────────────────────
 *
 * Icons are URLs, not a bundled sprite sheet: an email cannot ship assets, and a host that wants
 * its own icon set should not have to fork the block.
 * ─────────────────────────────────────────────────────────────────────── */

const ICON_BASE = "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons";

export const SOCIAL_PLATFORMS = [
  { label: "X / Twitter", value: "x", icon: `${ICON_BASE}/x.svg` },
  { label: "LinkedIn", value: "linkedin", icon: `${ICON_BASE}/linkedin.svg` },
  { label: "Facebook", value: "facebook", icon: `${ICON_BASE}/facebook.svg` },
  { label: "Instagram", value: "instagram", icon: `${ICON_BASE}/instagram.svg` },
  { label: "YouTube", value: "youtube", icon: `${ICON_BASE}/youtube.svg` },
  { label: "GitHub", value: "github", icon: `${ICON_BASE}/github.svg` },
  { label: "TikTok", value: "tiktok", icon: `${ICON_BASE}/tiktok.svg` },
  { label: "Website", value: "website", icon: `${ICON_BASE}/googlechrome.svg` },
];

export const socialBlock = defineBlock({
  type: "social",
  label: "Social",
  group: "Content",
  order: 70,
  icon: ICONS.social,
  description: "A row of social links.",
  keywords: ["twitter", "linkedin", "follow", "icons"],

  defaultContent: () => ({
    links: [
      { platform: "x", href: "https://x.com/", label: "X", icon: "" },
      { platform: "linkedin", href: "https://linkedin.com/", label: "LinkedIn", icon: "" },
    ],
  }),
  defaultStyle: () => ({
    padding: padding(16, 24, 16, 24),
    backgroundColor: "transparent",
    align: "center",
    iconSize: 24,
    gap: 12,
    showLabels: false,
    labelColor: "",
    fontSize: 13,
    hideOnMobile: false,
    hideOnDesktop: false,
  }),

  schema: [
    {
      title: "Links",
      target: "content",
      fields: [
        {
          kind: "list",
          key: "links",
          label: "Profiles",
          addLabel: "Add profile",
          max: 8,
          itemLabel: (item: any) => SOCIAL_PLATFORMS.find((p) => p.value === item?.platform)?.label ?? "Link",
          itemFields: [
            { kind: "select", key: "platform", label: "Platform", options: SOCIAL_PLATFORMS.map(({ label, value }) => ({ label, value })) },
            { kind: "url", key: "href", label: "URL", placeholder: "https://" },
            { kind: "text", key: "label", label: "Label", placeholder: "Shown when labels are on" },
            { kind: "image", key: "icon", label: "Custom icon", help: "Overrides the platform icon." },
          ],
        },
      ],
    },
    {
      title: "Appearance",
      target: "style",
      fields: [
        { kind: "align", key: "align", label: "Alignment" },
        { kind: "number", key: "iconSize", label: "Icon size", min: 14, max: 48, suffix: "px", inline: true },
        { kind: "number", key: "gap", label: "Gap", min: 0, max: 40, suffix: "px", inline: true },
        { kind: "toggle", key: "showLabels", label: "Show labels" },
        { kind: "color", key: "labelColor", label: "Label colour", when: (_v, b) => !!b.style.showLabels },
      ],
    },
    { title: "Spacing", target: "style", fields: [{ kind: "padding", key: "padding", label: "Padding" }, { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true }] },
    visibilityGroup(),
  ],

  render: ({ content, style, settings, esc, escAttr, url, styleAttr }) => {
    const links: any[] = Array.isArray(content.links) ? content.links : [];
    if (!links.length) return "";
    const size = style.iconSize || 24;

    const cells = links
      .map((link, index) => {
        const preset = SOCIAL_PLATFORMS.find((p) => p.value === link?.platform);
        const icon = safeImageUrl(link?.icon) || preset?.icon || "";
        const href = escAttr(url(link?.href));
        const label = link?.label || preset?.label || "";
        const img = icon
          ? `<img src="${escAttr(icon)}" alt="${escAttr(label)}" width="${size}" height="${size}"${styleAttr({ width: `${size}px`, height: `${size}px`, display: "block", border: "0" })} />`
          : esc(label);
        const text = style.showLabels && label
          ? `<span${styleAttr({ fontFamily: settings.fontFamily, fontSize: `${style.fontSize || 13}px`, color: style.labelColor || settings.textColor, paddingLeft: "6px", verticalAlign: "middle" })}>${esc(label)}</span>`
          : "";
        const pad = index === links.length - 1 ? 0 : style.gap || 0;
        return `<td${styleAttr({ paddingRight: `${pad}px` })}><a href="${href}" target="_blank" rel="noopener"${styleAttr({ textDecoration: "none", display: "inline-block" })}>${style.showLabels && label ? `<span${styleAttr({ display: "inline-block", verticalAlign: "middle" })}>${img}</span>${text}` : img}</a></td>`;
      })
      .join("");

    const shell = { ...blockShellStyles(style), textAlign: style.align || "center" };
    /* A centred inner table rather than text-align on the cells: Outlook will not centre
       inline-blocks, but it does honour `align` on a nested table. */
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClass(style)}><tr><td${styleAttr(shell)}><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${style.align || "center"}"><tr>${cells}</tr></table></td></tr></table>`;
  },

  text: ({ content }) =>
    (Array.isArray(content.links) ? content.links : []).map((l: any) => `${l?.label ?? l?.platform ?? ""}: ${l?.href ?? ""}`).join("\n"),
});
