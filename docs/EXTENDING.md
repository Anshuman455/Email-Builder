# Extending

## Field kinds

Every kind below is rendered identically by the React and Vue inspectors. A block declares fields;
neither framework needs to know the block exists.

| kind | value type | notes |
|---|---|---|
| `text` | `string` | `mergeable: true` adds the field-insert menu |
| `textarea` | `string` | `rows`, `mergeable` |
| `richtext` | `string` (HTML) | inline-editable on the canvas too |
| `url` | `string` | scheme-checked on render |
| `number` | `number` | `min`, `max`, `step`, `suffix` |
| `range` | `number` | slider with a live readout |
| `color` | `string` | `allowTransparent` adds a clear button |
| `toggle` | `boolean` | |
| `select` | `string \| number` | native `<select>` — the accessible choice |
| `segmented` | `string \| number` | 2–4 options, shown as a pill group |
| `align` | `"left" \| "center" \| "right"` | |
| `padding` | `{top,right,bottom,left}` | four inputs plus a link-all toggle |
| `border` | `{width,style,color}` | |
| `font` | `string` | email-safe stacks from `FONT_STACKS` |
| `image` | `string` (URL) | uses `adapter.assets` |
| `list` | `T[]` | repeating sub-records; `itemFields` recurse |
| `record` | `string` (id) | picker over `adapter.records` |
| `custom` | anything | renders `adapter.widgets[field.widget]` |

Common options on every field: `label`, `help`, `inline` (sit beside the previous field), and
`when(value, block, doc)` to hide it conditionally.

`FieldGroup.target` decides where the value is written — `"content"` or `"style"`. Groups also take
a `when(block, doc)` guard.

## Filling a block from a CRM record

```js
schema: [
  { title: "Source", target: "content", fields: [
    { kind: "record", key: "productId", label: "Product", source: "products",
      mapToContent: (raw) => ({
        title: raw.name,
        description: raw.summary,
        meta: formatMoney(raw.price),
        image: raw.heroImage,
        href: `https://shop.example.com/p/${raw.slug}`,
      }) },
  ]},
]
```

```js
adapter.records = {
  list: (source, { search }) => api.get(`/${source}`, { params: { search, limit: 50 } })
                                   .then((rows) => rows.map((r) => ({
                                     id: r.id, label: r.name, description: r.sku,
                                     image: r.heroImage, raw: r,
                                   }))),
};
```

The picker is a convenience, not a binding: once mapped, the values are ordinary content and the
author can edit them. Re-fetching at send time is a different feature, and it belongs to the host.

## Restricting the block set per tenant

```jsx
<EmailBuilder excludeBlocks={["html", "video"]} />
```

Or replace the set entirely — a locked-down transactional editor with three blocks:

```js
import { setup, textBlock, headingBlock, buttonBlock } from "@email-builder/core";
const { blocks } = setup({ replaceBlocks: [headingBlock, textBlock, buttonBlock] });
```

## Relabelling or adjusting a built-in

```js
blocks.extend("button", (def) => ({
  ...def,
  label: "Call to action",
  defaultStyle: () => ({ ...def.defaultStyle(), buttonColor: "#7c3aed", borderRadius: 999 }),
}));
```

## Translating

```js
adapter.labels = {
  "palette.title": "Bloques",
  "toolbar.preview": "Vista previa",
  "canvas.empty": "Arrastra un bloque aquí para empezar",
};
```

Keys are listed in `packages/engine/src/i18n.ts`. Unrecognised keys fall through to English, so a
partial translation is valid.

## Reusable layouts

Run the builder in `mode="layout"` to author a frame — a header, a footer, and a **content slot**
marking where a template's body is spliced in. Then at send time:

```js
import { compile, applyLayout } from "@email-builder/core";

const frame = compile(layoutDesign,   { blocks, merge }).html;
const body  = compile(templateDesign, { blocks, merge }, { fragment: true }).html;

const html = applyLayout(frame, body);
```

The substitution is a deliberately dumb string operation: it runs once per recipient on the send
path, where a tree walk would not be affordable.

## Writing the render function

Your `render(ctx)` returns a string of email HTML. The context hands you everything you need:

```js
render: ({ content, style, settings, width, esc, escAttr, url, styleAttr, preview, sample }) => …
```

Rules that matter:

- **Tables, not divs.** Outlook 2007–2019 uses Word's engine: no flex, no grid, no float.
- **Inline styles only.** The single `<style>` block belongs to the document shell.
- **Never concatenate raw input.** Use `esc` for text, `escAttr` for attributes, `url` for hrefs.
- **`width` is already resolved** — the column's pixel width minus its padding. Use it for hard
  `width` attributes, which Outlook needs because it ignores CSS width on images.
- **Return `""` rather than a broken element** when required content is missing, and use `preview`
  to show a placeholder in the editor instead.

## Migrations

When a stored shape has to change:

```js
import { registerMigration } from "@email-builder/core";

registerMigration(1, (doc) => ({
  ...doc,
  schemaVersion: 2,
  rows: doc.rows.map(renameSomething),
}));
```

`normalize()` runs registered migrations in order and is safe to call on a document of any age, any
number of times.
