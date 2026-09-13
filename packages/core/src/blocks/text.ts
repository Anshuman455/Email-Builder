import type { Border, PreflightIssue } from "../types";
import { defineBlock } from "../registry";
import { padding } from "../document/defaults";
import { ICONS } from "./icons";
import { FONT_STACKS, WEIGHT_OPTIONS, blockShellStyles, hideClass, typographyFields, visibilityGroup } from "./common";

/* ────────────────────────────── Text ────────────────────────────── */

export const textBlock = defineBlock({
  type: "text",
  label: "Text",
  group: "Content",
  order: 10,
  icon: ICONS.text,
  description: "A paragraph of rich text.",
  keywords: ["paragraph", "copy", "body"],
  inlineEditKey: "html",
  mergeableFields: ["html"],

  defaultContent: () => ({
    html: "<p>Write something worth opening. Double-click to edit this text.</p>",
  }),
  defaultStyle: () => ({
    padding: padding(12, 24, 12, 24),
    backgroundColor: "transparent",
    align: "left",
    fontFamily: "",
    fontSize: 16,
    fontWeight: "400",
    color: "",
    lineHeight: 1.6,
    letterSpacing: 0,
    hideOnMobile: false,
    hideOnDesktop: false,
  }),

  schema: [
    { title: "Content", target: "content", fields: [{ kind: "richtext", key: "html", label: "Text", mergeable: true }] },
    { title: "Typography", target: "style", fields: [{ kind: "align", key: "align", label: "Alignment" }, ...typographyFields()] },
    { title: "Spacing", target: "style", fields: [{ kind: "padding", key: "padding", label: "Padding" }, { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true }] },
    visibilityGroup(),
  ],

  render: ({ content, style, settings, styleAttr, preview, sample }) => {
    const html = preview && sample ? sample(content.html || "") : content.html || "";
    const inner = styleAttr({
      fontFamily: style.fontFamily || settings.fontFamily,
      fontSize: `${style.fontSize || settings.baseFontSize}px`,
      fontWeight: style.fontWeight || "400",
      color: style.color || settings.textColor,
      lineHeight: String(style.lineHeight || settings.lineHeight),
      letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
      textAlign: style.align || "left",
      margin: 0,
    });
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClass(style)}><tr><td${styleAttr(blockShellStyles(style))}><div${inner}>${html}</div></td></tr></table>`;
  },

  text: ({ content }) => content.html || "",

  validate: ({ block, content }): PreflightIssue[] => {
    const bare = String(content.html || "").replace(/<[^>]+>/g, "").trim();
    if (bare) return [];
    return [
      {
        id: `text-empty-${block.id}`,
        severity: "warning",
        message: "An empty text block will render as blank space.",
        hint: "Add copy, or delete the block.",
        target: { kind: "block" as const, id: block.id },
      },
    ];
  },
});

/* ────────────────────────────── Heading ────────────────────────────── */

export const headingBlock = defineBlock({
  type: "heading",
  label: "Heading",
  group: "Content",
  order: 20,
  icon: ICONS.heading,
  description: "A section title.",
  keywords: ["title", "h1", "h2", "headline"],
  inlineEditKey: "text",
  mergeableFields: ["text"],

  defaultContent: () => ({ text: "A headline that earns the open", level: "h2" }),
  defaultStyle: () => ({
    padding: padding(16, 24, 8, 24),
    backgroundColor: "transparent",
    align: "left",
    fontFamily: "",
    fontSize: 28,
    fontWeight: "700",
    color: "",
    lineHeight: 1.25,
    letterSpacing: -0.2,
    hideOnMobile: false,
    hideOnDesktop: false,
  }),

  schema: [
    {
      title: "Content",
      target: "content",
      fields: [
        {
          kind: "segmented",
          key: "level",
          label: "Level",
          options: [
            { label: "H1", value: "h1" },
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
            { label: "H4", value: "h4" },
          ],
        },
      ],
    },
    { title: "Typography", target: "style", fields: [{ kind: "align", key: "align", label: "Alignment" }, ...typographyFields()] },
    { title: "Spacing", target: "style", fields: [{ kind: "padding", key: "padding", label: "Padding" }, { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true }] },
    visibilityGroup(),
  ],

  render: ({ content, style, settings, esc, styleAttr, preview, sample }) => {
    const raw = String(content.text ?? "");
    const text = esc(preview && sample ? sample(raw) : raw);
    /* A real <h1>-<h4> tag, not a styled <div>: screen readers in webmail rely on it, and the
       inline margin reset is what stops Outlook adding its own. */
    const tag = ["h1", "h2", "h3", "h4"].includes(content.level) ? content.level : "h2";
    const inner = styleAttr({
      fontFamily: style.fontFamily || settings.fontFamily,
      fontSize: `${style.fontSize || 28}px`,
      fontWeight: style.fontWeight || "700",
      color: style.color || settings.headingColor,
      lineHeight: String(style.lineHeight || 1.25),
      letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
      textAlign: style.align || "left",
      margin: 0,
      padding: 0,
    });
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClass(style)}><tr><td${styleAttr(blockShellStyles(style))}><${tag}${inner}>${text}</${tag}></td></tr></table>`;
  },

  text: ({ content }) => String(content.text ?? ""),
});

/* ────────────────────────────── Bullet list ────────────────────────────── */

export const listBlock = defineBlock({
  type: "list",
  label: "List",
  group: "Content",
  order: 30,
  icon: ICONS.list,
  description: "Bulleted or numbered points.",
  keywords: ["bullets", "points", "ul", "ol"],
  mergeableFields: ["items"],

  defaultContent: () => ({
    style: "bullet",
    items: [{ text: "First point" }, { text: "Second point" }, { text: "Third point" }],
  }),
  defaultStyle: () => ({
    padding: padding(12, 24, 12, 24),
    backgroundColor: "transparent",
    fontFamily: "",
    fontSize: 16,
    fontWeight: "400",
    color: "",
    lineHeight: 1.7,
    markerColor: "",
    itemGap: 6,
    hideOnMobile: false,
    hideOnDesktop: false,
  }),

  schema: [
    {
      title: "Items",
      target: "content",
      fields: [
        {
          kind: "segmented",
          key: "style",
          label: "Marker",
          options: [
            { label: "Bullet", value: "bullet" },
            { label: "Numbered", value: "number" },
            { label: "Check", value: "check" },
            { label: "None", value: "none" },
          ],
        },
        {
          kind: "list",
          key: "items",
          label: "Points",
          addLabel: "Add point",
          itemLabel: (item: any, i: number) => item?.text || `Point ${i + 1}`,
          itemFields: [{ kind: "text", key: "text", label: "Text", mergeable: true }],
        },
      ],
    },
    {
      title: "Typography",
      target: "style",
      fields: [
        { kind: "font", key: "fontFamily", label: "Font" },
        { kind: "number", key: "fontSize", label: "Size", min: 8, max: 40, suffix: "px", inline: true },
        { kind: "number", key: "lineHeight", label: "Line height", min: 1, max: 3, step: 0.1, inline: true },
        { kind: "color", key: "color", label: "Text colour" },
        { kind: "color", key: "markerColor", label: "Marker colour" },
        { kind: "number", key: "itemGap", label: "Gap between items", min: 0, max: 40, suffix: "px" },
      ],
    },
    { title: "Spacing", target: "style", fields: [{ kind: "padding", key: "padding", label: "Padding" }, { kind: "color", key: "backgroundColor", label: "Background", allowTransparent: true }] },
    visibilityGroup(),
  ],

  render: ({ content, style, settings, esc, styleAttr, preview, sample }) => {
    const items: { text: string }[] = Array.isArray(content.items) ? content.items : [];
    const marker = content.style ?? "bullet";

    /* Rows of a table rather than <ul>: Outlook indents lists unpredictably and webmail clients
       reset list-style differently. A two-cell row gives the same look everywhere. */
    const rows = items
      .map((item, index) => {
        const raw = String(item?.text ?? "");
        const text = esc(preview && sample ? sample(raw) : raw);
        const glyph =
          marker === "number" ? `${index + 1}.` : marker === "check" ? "&#10003;" : marker === "none" ? "" : "&bull;";
        const cellPad = index === items.length - 1 ? 0 : style.itemGap || 0;
        const markerCell = glyph
          ? `<td valign="top"${styleAttr({ paddingRight: "10px", paddingBottom: `${cellPad}px`, color: style.markerColor || style.color || settings.textColor, fontSize: `${style.fontSize || 16}px`, lineHeight: String(style.lineHeight || 1.7), width: "16px" })}>${glyph}</td>`
          : "";
        return `<tr>${markerCell}<td valign="top"${styleAttr({ paddingBottom: `${cellPad}px`, fontFamily: style.fontFamily || settings.fontFamily, fontSize: `${style.fontSize || 16}px`, color: style.color || settings.textColor, lineHeight: String(style.lineHeight || 1.7) })}>${text}</td></tr>`;
      })
      .join("");

    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${hideClass(style)}><tr><td${styleAttr(blockShellStyles(style))}><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table></td></tr></table>`;
  },

  text: ({ content }) =>
    (Array.isArray(content.items) ? content.items : []).map((i: any) => `• ${i?.text ?? ""}`).join("\n"),
});
