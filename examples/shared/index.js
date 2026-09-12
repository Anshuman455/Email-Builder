/* ══════════════════════════════ Demo Host ══════════════════════════════
 *
 * Generic host definitions for the Email Builder:
 * - Generic merge fields (user, company, system)
 * - Generic custom block (ratingBlock)
 * - Standard adapter
 * - Clean generic seed template
 * ════════════════════════════════════════════════════════════════════════ */

import { defineBlock } from "@email-builder/core";

/* ────────────────────────────── Merge Fields ────────────────────────────── */

export const GENERIC_FIELDS = [
  { token: "user.firstName", label: "First Name", group: "User", sample: "Alex" },
  { token: "user.lastName", label: "Last Name", group: "User", sample: "Morgan" },
  { token: "user.email", label: "Email Address", group: "User", sample: "alex@example.com" },
  { token: "company.name", label: "Company Name", group: "Company", sample: "Acme Corp" },
  { token: "company.website", label: "Company Website", group: "Company", sample: "https://acme.example.com" },
  { token: "system.date", label: "Current Date", group: "System", sample: "September 2026", type: "date" },
  { token: "system.unsubscribe_url", label: "Unsubscribe URL", group: "System", sample: "https://example.com/unsubscribe" },
];

export const CRM_FIELDS = GENERIC_FIELDS;
export const RESTAURANT_FIELDS = GENERIC_FIELDS;

/* ────────────────────────────── Custom Block ────────────────────────────── */

export const ratingBlock = defineBlock({
  type: "rating",
  label: "Rating ask",
  group: "Content",
  description: "A one-click satisfaction rating for email feedback.",
  keywords: ["feedback", "rating", "nps", "csat", "survey", "stars"],
  icon: `<span class="material-symbols-outlined">star</span>`,
  mergeableFields: ["question", "url"],

  defaultContent: () => ({
    question: "How would you rate your experience, {{user.firstName}}?",
    url: "https://example.com/feedback",
    caption: "Tap a star to share your thoughts — takes 5 seconds.",
  }),

  defaultStyle: () => ({
    padding: { top: 20, right: 24, bottom: 20, left: 24 },
    backgroundColor: "transparent",
    align: "center",
    starColor: "#f59e0b",
    starSize: 28,
  }),

  schema: [
    {
      title: "Rating Question",
      target: "content",
      fields: [
        { kind: "text", key: "question", label: "Question", mergeable: true },
        { kind: "url", key: "url", label: "Feedback URL", mergeable: true },
        { kind: "text", key: "caption", label: "Caption" },
      ],
    },
    {
      title: "Appearance",
      target: "style",
      fields: [
        { kind: "color", key: "starColor", label: "Star colour", inline: true },
        { kind: "align", key: "align", label: "Alignment" },
      ],
    },
  ],

  render: ({ content, style, settings, esc, escAttr, preview, sample }) => {
    const show = (val) => esc(preview && sample ? sample(String(val ?? "")) : String(val ?? ""));
    const stars = [1, 2, 3, 4, 5]
      .map(
        (score) =>
          `<td style="padding: 0 4px;"><a href="${escAttr(content.url || "#")}?score=${score}" style="text-decoration: none; font-size: ${style.starSize || 28}px; color: ${style.starColor || "#f59e0b"};">★</a></td>`,
      )
      .join("");

    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 12px 0;">
      <tr>
        <td style="padding: ${style.padding?.top ?? 20}px ${style.padding?.right ?? 24}px ${style.padding?.bottom ?? 20}px ${style.padding?.left ?? 24}px; text-align: ${style.align || "center"}; font-family: ${settings.fontFamily};">
          <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 10px;">${show(content.question)}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${style.align || "center"}"><tr>${stars}</tr></table>
          ${content.caption ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 8px;">${show(content.caption)}</div>` : ""}
        </td>
      </tr>
    </table>`;
  },

  text: ({ content }) => `${content.question}\n${content.url}`,
});

export const CUSTOM_BLOCKS = [ratingBlock];
export const RESTAURANT_BLOCKS = CUSTOM_BLOCKS;

/* ────────────────────────────── Adapter ────────────────────────────── */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const adapter = {
  assets: {
    accept: "image/*",
    maxBytes: 5 * 1024 * 1024,
    async upload(file) {
      await delay(320);
      const url = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      return { url, name: file.name };
    },
  },

  records: {
    async list() {
      await delay(200);
      return [];
    },
    map(_source, option) {
      return { title: option.label, href: "#" };
    },
  },

  preview: {
    async testSend({ to }) {
      await delay(400);
      window.alert(`Demo: a test send would go to ${to.join(", ")}`);
    },
  },

  notify: {
    error: (message) => console.error("[demo]", message),
    success: (message) => console.info("[demo]", message),
  },
};

/* ────────────────────────────── Generic Seed Document ────────────────────────────── */

export const SEED = {
  schemaVersion: 1,
  settings: {
    contentWidth: 600,
    backgroundColor: "#f4f4f5",
    contentBackgroundColor: "#ffffff",
    fontFamily: "Arial, Helvetica, sans-serif",
    textColor: "#333333",
    headingColor: "#111827",
    linkColor: "#2563eb",
    baseFontSize: 15,
    lineHeight: 1.6,
    language: "en",
    direction: "ltr",
  },
  rows: [
    {
      id: "row-hero",
      layout: [1],
      style: { padding: { top: 0, right: 0, bottom: 0, left: 0 } },
      columns: [
        {
          id: "col-hero",
          blocks: [
            {
              id: "blk-hero-image",
              type: "image",
              content: {
                url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80",
                alt: "Community banner",
                fullWidth: true,
              },
              style: {
                align: "center",
                padding: { top: 0, right: 0, bottom: 0, left: 0 },
              },
            },
          ],
        },
      ],
    },
    {
      id: "row-intro",
      layout: [1],
      style: { padding: { top: 32, right: 36, bottom: 20, left: 36 } },
      columns: [
        {
          id: "col-intro",
          blocks: [
            {
              id: "blk-heading",
              type: "heading",
              content: { text: "Welcome to Our Community", level: "h1" },
              style: {
                align: "center",
                color: "#111827",
                fontSize: 26,
                fontWeight: "700",
                padding: { top: 0, right: 0, bottom: 12, left: 0 },
              },
            },
            {
              id: "blk-intro-text",
              type: "text",
              content: {
                html: "<p style=\"line-height: 1.6; margin: 0 0 12px 0;\">Hi {{user.firstName}}, welcome! We're excited to have you join our community. Each month, we send curated updates, practical guides, and new product announcements straight to your inbox.</p><p style=\"line-height: 1.6; margin: 0;\">Here is a quick overview of the resources available to help you get started.</p>",
              },
              style: {
                align: "center",
                color: "#4b5563",
                fontSize: 15,
                padding: { top: 0, right: 0, bottom: 20, left: 0 },
              },
            },
          ],
        },
      ],
    },
    {
      id: "row-features",
      layout: [1, 1],
      style: { padding: { top: 12, right: 36, bottom: 24, left: 36 }, stackOnMobile: true },
      columns: [
        {
          id: "col-feat-1",
          blocks: [
            {
              id: "blk-feat-1-h",
              type: "heading",
              content: { text: "Guides & Docs", level: "h3" },
              style: {
                align: "left",
                color: "#111827",
                fontSize: 18,
                padding: { top: 0, right: 0, bottom: 6, left: 0 },
              },
            },
            {
              id: "blk-feat-1-t",
              type: "text",
              content: {
                html: "<p style=\"margin: 0; line-height: 1.5; color: #6b7280; font-size: 14px;\">Browse our step-by-step guides and best practices to make the most of your tools.</p>",
              },
              style: {
                padding: { top: 0, right: 0, bottom: 0, left: 0 },
              },
            },
          ],
        },
        {
          id: "col-feat-2",
          blocks: [
            {
              id: "blk-feat-2-h",
              type: "heading",
              content: { text: "Dedicated Support", level: "h3" },
              style: {
                align: "left",
                color: "#111827",
                fontSize: 18,
                padding: { top: 0, right: 0, bottom: 6, left: 0 },
              },
            },
            {
              id: "blk-feat-2-t",
              type: "text",
              content: {
                html: "<p style=\"margin: 0; line-height: 1.5; color: #6b7280; font-size: 14px;\">Our support team is always on hand to help resolve any questions or issues.</p>",
              },
              style: {
                padding: { top: 0, right: 0, bottom: 0, left: 0 },
              },
            },
          ],
        },
      ],
    },
    {
      id: "row-cta",
      layout: [1],
      style: { padding: { top: 8, right: 36, bottom: 24, left: 36 } },
      columns: [
        {
          id: "col-cta",
          blocks: [
            {
              id: "blk-cta-btn",
              type: "button",
              content: {
                label: "Explore Your Dashboard",
                href: "https://example.com/dashboard",
              },
              style: {
                align: "center",
                buttonColor: "#394648",
                textColor: "#ffffff",
                fontSize: 15,
                fontWeight: "600",
                borderRadius: 6,
                paddingX: 28,
                paddingY: 13,
                padding: { top: 0, right: 0, bottom: 0, left: 0 },
              },
            },
          ],
        },
      ],
    },
    {
      id: "row-divider",
      layout: [1],
      style: { padding: { top: 8, right: 36, bottom: 8, left: 36 } },
      columns: [
        {
          id: "col-div",
          blocks: [
            {
              id: "blk-div",
              type: "divider",
              content: {},
              style: {
                padding: { top: 8, right: 0, bottom: 8, left: 0 },
                lineColor: "#e5e7eb",
                lineWidth: 1,
                lineStyle: "solid",
                widthPercent: 100,
                align: "center",
              },
            },
          ],
        },
      ],
    },
    {
      id: "row-footer",
      layout: [1],
      style: {
        backgroundColor: "#f9fafb",
        padding: { top: 20, right: 36, bottom: 24, left: 36 },
        fullWidth: true,
      },
      columns: [
        {
          id: "col-footer",
          blocks: [
            {
              id: "blk-footer",
              type: "footer",
              content: {
                address: "{{company.name}} · 100 Innovation Way, Suite 400 · {{company.website}}",
                unsubscribeLabel: "Unsubscribe",
                unsubscribeUrl: "{{system.unsubscribe_url}}",
                preferencesLabel: "Manage Preferences",
                preferencesUrl: "{{system.unsubscribe_url}}",
                extra: "You received this email because you subscribed to updates from {{company.name}}.",
              },
              style: {
                align: "center",
                fontSize: 12,
                color: "#9ca3af",
                linkColor: "#6b7280",
                lineHeight: 1.7,
                padding: { top: 8, right: 0, bottom: 8, left: 0 },
              },
            },
          ],
        },
      ],
    },
  ],
};
