# Email Builder

A drag-and-drop email builder that runs in **React** and **Vue 3** from one implementation.

CRM-agnostic by design: no industry vocabulary in the block set, field mapping supplied by the host,
and every block — including yours — registered through the same interface.

```
@email-builder/core      document model, block registry, merge fields, email compiler   0 deps
@email-builder/engine    headless editor, drag engine, autosave, host adapter           0 deps
@email-builder/react     React 18/19 bindings + components
@email-builder/vue       Vue 3 bindings + components
@email-builder/styles    one namespaced, CSS-variable-themed stylesheet
```

The split is the point. ~70% of the code is framework-free; the view packages are thin.

---

## Install

```bash
npm i @email-builder/react @email-builder/styles     # React
npm i @email-builder/vue   @email-builder/styles     # Vue 3
```

## Use

**React**

```jsx
import { EmailBuilder } from "@email-builder/react";
import "@email-builder/styles";

export default function Editor({ template }) {
  return (
    <EmailBuilder
      document={template.design}
      onSave={(design) => api.put(`/templates/${template.id}`, { design })}
      adapter={adapter}
    />
  );
}
```

**Vue 3**

```vue
<script setup>
import { EmailBuilder } from "@email-builder/vue";
import "@email-builder/styles";
</script>

<template>
  <EmailBuilder :document="template.design" :adapter="adapter" @save="onSave" />
</template>
```

Same props. Same behaviour. Same DOM.

---

## The three extension points

### 1. Field mapping — any CRM

The builder knows nothing about your schema. You describe it:

```js
const adapter = { /* … */ };

<EmailBuilder
  mergeFields={[
    { token: "lead.owner_name",  label: "Owner",   group: "Lead", sample: "Sam Rivera" },
    { token: "deal.value",       label: "Value",   group: "Deal", sample: "$12,400" },
    { token: "deal.close_date",  label: "Closes",  group: "Deal", sample: "14 March" },
  ]}
/>
```

Authors then insert them from any text field's **Insert field** menu, previews resolve to the
sample values, and `compile({ data })` resolves them for real.

Fields can load asynchronously, so a tenant's custom fields come from your API:

```js
loadMergeFields: () => api.get("/crm/fields").then(toMergeFields)
```

**Token syntax is configuration**, not a constant — switch ESP without touching a stored document:

```js
import { SYNTAX } from "@email-builder/core";

mergeSyntax={SYNTAX.mailchimp}     // *|FNAME|*
mergeSyntax={SYNTAX.salesforce}    // {!Contact.FirstName}
mergeSyntax={{ open: "<%=", close: "%>" }}
```

### 2. Custom blocks

A block is one object. It works in React **and** Vue with no view code, because its editing UI is
declared as data rather than written as a component.

```js
import { defineBlock } from "@email-builder/core";

export const npsBlock = defineBlock({
  type: "nps",
  label: "NPS survey",
  group: "Content",
  icon: `<svg …/>`,

  defaultContent: () => ({ question: "How likely are you to recommend us?", url: "" }),
  defaultStyle:   () => ({ accent: "#2563eb", padding: { top: 16, right: 24, bottom: 16, left: 24 } }),

  schema: [
    { title: "Question", target: "content", fields: [
      { kind: "text", key: "question", label: "Question", mergeable: true },
      { kind: "url",  key: "url",      label: "Response URL" },
    ]},
    { title: "Style", target: "style", fields: [
      { kind: "color",   key: "accent",  label: "Accent" },
      { kind: "padding", key: "padding", label: "Padding" },
    ]},
  ],

  render: ({ content, style, esc, url, escAttr, styleAttr }) => {
    const scores = Array.from({ length: 11 }, (_, n) =>
      `<td><a href="${escAttr(url(content.url))}?score=${n}"
              ${styleAttr({ display: "inline-block", width: "28px", padding: "8px 0",
                            textAlign: "center", background: style.accent,
                            color: "#fff", textDecoration: "none" })}>${n}</a></td>`).join("");
    return `<table role="presentation" width="100%"><tr><td>${esc(content.question)}</td></tr>
            <tr><td><table role="presentation"><tr>${scores}</tr></table></td></tr></table>`;
  },

  text: ({ content }) => content.question,
  validate: ({ block, content }) =>
    content.url ? [] : [{ id: `nps-url-${block.id}`, severity: "error",
                          message: "NPS block has no response URL.",
                          target: { kind: "block", id: block.id } }],
});
```

```jsx
<EmailBuilder blocks={[npsBlock]} />
```

It appears in the palette, drags like any other block, gets an inspector, lints in pre-flight, and
compiles into the email. Nothing else changes.

Every `Field` kind is listed in [`docs/EXTENDING.md`](docs/EXTENDING.md), including `record` — a
picker that fills a block from one of your CRM rows — and `custom`, which renders a widget you
register in the adapter when the declarative kinds genuinely are not enough.

### 3. The host adapter

The one place the library talks to your application. Every member is optional.

```js
const adapter = {
  assets: {
    upload: (file) => api.upload(file).then(({ url }) => ({ url })),
    browse: () => openMediaLibrary(),          // optional: your own picker
  },
  records: {
    list: (source, { search }) => api.get(`/${source}`, { params: { search } }),
    map:  (source, record) => ({ title: record.name, image: record.photo, meta: record.price }),
  },
  preview: { testSend: ({ html, to }) => api.post("/test-send", { html, to }) },
  notify:  { error: toast.error, success: toast.success },
  widgets: { "product-picker": MyProductPicker },
  labels:  { "toolbar.preview": "Vista previa" },   // also the i18n hook
};
```

No HTTP client, no toast library, no router, no socket is imported anywhere in this repo.

---

## Theming

One stylesheet, every class prefixed `.eb-`, everything scoped under `.eb-root`. It cannot collide
with Bootstrap or Tailwind in either direction. Theme by overriding custom properties:

```css
.eb-root {
  --eb-accent: #7c3aed;
  --eb-radius: 10px;
  --eb-font: "Inter", system-ui, sans-serif;
}
```

Dark mode: `theme="dark"`, or `theme="auto"` to follow the OS.

---

## Headless use

The editor is usable with no UI at all — server-side rendering of a stored design, a scheduled
send, a migration script:

```js
import { setup, compile, preflight, normalize } from "@email-builder/core";

const { blocks, merge } = setup({ blocks: [npsBlock], mergeFields });

const design = normalize(await db.getDesign(id));
const { html, text } = compile(design, { blocks, merge }, { data: recipient });

await esp.send({ to: recipient.email, html, text });
```

`@email-builder/core` has zero dependencies and runs unchanged in Node and the browser.

---

## Email output

Table-based, inline-styled, with the fallbacks that inboxes actually need:

- VML `roundrect` twin for every button, so Outlook 2007–2019 renders real rounded buttons
- `mso` conditional wrapper so the centred sheet does not drift left in Word's engine
- `AllowPNG` + `PixelsPerInch` so Outlook stops scaling by OS DPI
- `x-apple-data-detectors` reset so iOS stops turning dates and addresses blue
- a hidden preheader padded with zero-width joiners
- one `<style>` block, carrying only what cannot be inlined: resets, and the mobile media query

Pre-flight warns — never blocks — on missing alt text, buttons with no destination, absent
unsubscribe links, unknown merge tokens, body contrast below 4.5:1, and Gmail's 102KB clip point.

---

## Development

```bash
npm install
npm run build          # core → engine → styles → react → vue
npm test               # core + engine
npm run dev:react      # React demo
npm run dev:vue        # Vue demo
```

## Documentation

- [`docs/EXTENDING.md`](docs/EXTENDING.md) — custom blocks, every field kind, merge fields, adapter
- [`docs/VIEW-CONTRACT.md`](docs/VIEW-CONTRACT.md) — the spec both view packages implement
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — why the layers are cut where they are

## Licence

MIT
