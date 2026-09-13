# Email Builder

A drag-and-drop email editor you can drop into your **React** or **Vue 3** app.

Your users build emails by dragging rows and blocks (text, images, buttons…) onto a canvas. You get
two things back:

- **A design** — a JSON object you save in your database and load again later to keep editing.
- **HTML** — email-safe HTML (tables and inline styles, with Outlook fallbacks) that you send
  through any email provider: SendGrid, Mailgun, Amazon SES, Resend, Postmark…

```
┌───────────┬───────────────────────────────────────────────┬────────────┐
│ Blocks    │ ↶ ↷     [ Desktop | Mobile ]    Code  Preview │ Settings   │
│ ───────── │  ┌─────────────────────────────────────────┐  │ for the    │
│ Text      │  │  Welcome, {{user.firstName}}!           │  │ selected   │
│ Heading   │  │  ─────────────────────────────────────  │  │ block      │
│ Image     │  │  [ image ]                              │  │            │
│ Button    │  │  ( Get started )                        │  │            │
│ …         │  └─────────────────────────────────────────┘  │            │
└───────────┴───────────────────────────────────────────────┴────────────┘
```

**Contents**

1. [Quick start — React](#1-quick-start--react)
2. [Quick start — Vue 3](#2-quick-start--vue-3)
3. [Next.js and Nuxt](#3-nextjs-and-nuxt)
4. [Save and load designs](#4-save-and-load-designs)
5. [Get the HTML to send](#5-get-the-html-to-send)
6. [Personalise emails (merge fields)](#6-personalise-emails-merge-fields)
7. [Let users upload images](#7-let-users-upload-images)
8. [Match your app's look](#8-match-your-apps-look)
9. [Add your own buttons to the toolbar](#9-add-your-own-buttons-to-the-toolbar)
10. [Import or paste existing HTML](#10-import-or-paste-existing-html)
11. [Create your own blocks](#11-create-your-own-blocks)
12. [Translate the editor](#12-translate-the-editor)
13. [All props](#13-all-props)
14. [The editor object](#14-the-editor-object)
15. [Troubleshooting](#15-troubleshooting)
16. [Packages, docs and development](#16-packages-docs-and-development)

---

## 1. Quick start — React

Requires React 18 or later.

**Step 1 — install**

```bash
npm install @email-builder/react @email-builder/styles
```

**Step 2 — render the editor**

```jsx
import { EmailBuilder } from "@email-builder/react";
import "@email-builder/styles"; // the editor's CSS — without it the editor looks broken

export default function EmailEditor() {
  return (
    // The editor fills its container, so the container needs a height.
    <div style={{ height: "100vh" }}>
      <EmailBuilder />
    </div>
  );
}
```

That's a working editor. Drag a block from the left onto the canvas to try it.

**Step 3 — save what the user builds**

```jsx
<EmailBuilder
  document={savedDesign}                               // load a design (omit to start empty)
  onSave={(design) => api.saveDesign(design)}          // called automatically while editing
  onReady={(editor) => (window.emailEditor = editor)}  // keep a handle for later (see section 14)
/>
```

Continue with [Save and load designs](#4-save-and-load-designs) and
[Get the HTML to send](#5-get-the-html-to-send).

---

## 2. Quick start — Vue 3

Requires Vue 3.4 or later.

**Step 1 — install**

```bash
npm install @email-builder/vue @email-builder/styles
```

**Step 2 — render the editor**

```vue
<script setup>
import { EmailBuilder } from "@email-builder/vue";
import "@email-builder/styles"; // the editor's CSS — without it the editor looks broken
</script>

<template>
  <!-- The editor fills its container, so the container needs a height. -->
  <div style="height: 100vh">
    <EmailBuilder />
  </div>
</template>
```

**Step 3 — save what the user builds**

```vue
<script setup>
import { ref } from "vue";
import { EmailBuilder } from "@email-builder/vue";
import "@email-builder/styles";

const props = defineProps({ savedDesign: Object });
const editor = ref(null);

async function saveDesign(design) {
  await api.saveDesign(design);
}
</script>

<template>
  <div style="height: 100vh">
    <EmailBuilder :document="savedDesign" :on-save="saveDesign" @ready="editor = $event" />
  </div>
</template>
```

Vue props are the same as React's, written in kebab-case (`showToolbar` → `show-toolbar`). Instead of
the `on-save` prop you can listen to the `@save` event.

---

## 3. Next.js and Nuxt

The editor runs in the browser only. Render it on the client:

**Next.js (App Router)** — put the editor in its own file marked as a client component:

```jsx
// app/emails/EmailEditor.jsx
"use client";

import { EmailBuilder } from "@email-builder/react";
import "@email-builder/styles";

export default function EmailEditor(props) {
  return (
    <div style={{ height: "100vh" }}>
      <EmailBuilder {...props} />
    </div>
  );
}
```

**Nuxt 3** — wrap it in `<ClientOnly>`:

```vue
<template>
  <ClientOnly>
    <div style="height: 100vh">
      <EmailBuilder :document="design" :on-save="saveDesign" />
    </div>
  </ClientOnly>
</template>
```

Compiling a saved design to HTML works on the server too — see [section 5](#5-get-the-html-to-send).

---

## 4. Save and load designs

A **design** is a plain JSON object describing the email: rows, columns, blocks and settings. Store it
as-is (a JSON column works well) and pass it back to keep editing.

| You want to… | Do this |
|---|---|
| Load a saved design | `document={design}` |
| Save automatically | `onSave={(design) => …}` — runs shortly after the user stops editing, and on ⌘S / Ctrl+S |
| React to every change | `onChange={(design) => …}` |
| Tune autosave | `autosave={{ debounceMs: 2000, maxWaitMs: 10000 }}`, or `{ enabled: false }` to turn it off |
| Save on your own button | `editor.getDocument()` — see [the editor object](#14-the-editor-object) |
| Start empty | leave `document` out |

Save the **design**, not the HTML. The design is what the editor opens again; the HTML is generated
from it whenever you need to send.

---

## 5. Get the HTML to send

**In the browser**, from the editor object you received in `onReady`:

```js
const { html, text } = editor.compile();
// html  → the email body to send
// text  → a plain-text version for the text/plain part
```

**On your server** (Node, a queue worker, a cron job) — no editor needed, just `@email-builder/core`:

```bash
npm install @email-builder/core
```

```js
import { setup, compile, normalize } from "@email-builder/core";

const { blocks, merge } = setup({ mergeFields: MY_MERGE_FIELDS }); // same fields as the editor

const design = normalize(await db.getDesign(id));
const { html, text } = compile(design, { blocks, merge }, { data: recipient });

await emailProvider.send({ to: recipient.email, subject: "Welcome", html, text });
```

- Without `data`, merge tokens like `{{user.firstName}}` stay in the HTML for your email provider to
  fill in.
- With `data`, they're filled in here. Nested objects (`{ user: { firstName: "Alex" } }`) and flat
  keys (`{ "user.firstName": "Alex" }`) both work.
- If you registered custom blocks in the editor, pass the same ones to `setup({ blocks: [...] })`.

Users can also see and copy the HTML themselves with the **Code** button.

---

## 6. Personalise emails (merge fields)

Merge fields let users insert placeholders like the recipient's first name. Tell the editor which
fields exist:

```jsx
<EmailBuilder
  mergeFields={[
    { token: "user.firstName", label: "First name", group: "Recipient", sample: "Alex" },
    { token: "user.email", label: "Email", group: "Recipient", sample: "alex@example.com" },
    { token: "company.name", label: "Company", group: "Company", sample: "Acme" },
  ]}
/>
```

Users then click **Insert field** in any text setting to add one. The canvas shows the placeholder
(`{{user.firstName}}`) so users can see where it goes; **Preview** shows the `sample` value instead.
The HTML keeps the placeholder until you fill it in ([section 5](#5-get-the-html-to-send)).

| Field property | Meaning |
|---|---|
| `token` | The path, without brackets — `user.firstName` |
| `label` | What users see in the menu |
| `group` | Groups fields in the menu |
| `sample` | Shown in the editor and preview |
| `fallback` | Used when a recipient has no value |

**Using a different placeholder style?** Match your email provider:

```jsx
import { SYNTAX } from "@email-builder/core";

<EmailBuilder mergeSyntax={SYNTAX.handlebars} />  // {{user.firstName}}  (default)
<EmailBuilder mergeSyntax={SYNTAX.mailchimp} />   // *|user.firstName|*
<EmailBuilder mergeSyntax={SYNTAX.salesforce} />  // {!user.firstName}
<EmailBuilder mergeSyntax={{ open: "<%= ", close: " %>" }} />  // anything else
```

---

## 7. Let users upload images

By default the Image block needs a URL. To let users upload files, tell the editor how to store
them with an **adapter** — a plain object that connects the editor to your app:

```jsx
const adapter = {
  assets: {
    accept: "image/*",
    maxBytes: 5 * 1024 * 1024, // 5 MB
    async upload(file) {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const { url } = await response.json();
      return { url }; // a public URL the email can load
    },
  },
  notify: {
    error: (message) => toast.error(message),   // optional: show errors in your UI
    success: (message) => toast.success(message),
  },
};

<EmailBuilder adapter={adapter} />
```

Images in emails must be publicly reachable URLs — recipients' inboxes load them from the internet.

Every adapter member is optional. Other members let you fill blocks from your own records and
override labels; see [`docs/EXTENDING.md`](docs/EXTENDING.md#filling-a-block-from-a-crm-record).

---

## 8. Match your app's look

Every colour, radius and font in the editor is a CSS variable. Override a few and the editor matches
your app:

Add a class to your page's `<body>` (for example `<body class="my-app">`), then:

```css
/* your-app.css */
body.my-app .eb-root {
  --eb-accent: #7c3aed;   /* your brand colour: buttons, selection, focus rings */
  --eb-radius: 10px;
  --eb-font: inherit;     /* use your app's font */
}
```

Using a class on `<body>` makes your values win over the editor's defaults whatever order the CSS
loads in, and also reaches the editor's pop-ups (Preview, Code, menus), which are placed at the end
of `<body>`.

If your app already has CSS variables, point at them so the editor follows your theme — including
dark mode:

```css
body.my-app .eb-root {
  --eb-accent: var(--primary);
  --eb-surface: var(--card);
  --eb-text: var(--foreground);
  --eb-border: var(--border);
}
```

- Dark mode: `theme="dark"`, or `theme="auto"` to follow the operating system.
- The editor's styles never leak into your app, and your app's class names can't break the editor.
- These variables style the **editor**, not the email. The email's own colours are set in the
  editor's **Email Settings** panel.

**Full guide:** [docs/THEMING.md](docs/THEMING.md) — every variable, ready-made mappings for
shadcn/ui, MUI, Bootstrap and Tailwind, dark mode, and fixes for common problems.

---

## 9. Add your own buttons to the toolbar

Add icon buttons next to Code and Preview — for attachments, an AI assistant, "send test", anything:

```jsx
<EmailBuilder
  toolbarActions={[
    {
      id: "attach",
      label: "Attach file",       // tooltip and screen-reader label
      icon: "attach_file",        // a built-in icon name, or your own "<svg …>…</svg>"
      onClick: (editor) => openMyFilePicker(),
    },
    {
      id: "ai",
      label: "Write with AI",
      icon: "auto_awesome",
      placement: "start",         // "start" = next to undo/redo; default is before Code
      onClick: (editor) => openMyAssistant(editor.getDocument()),
    },
  ]}
/>
```

Optional: `primary: true` (filled style), `active: true` (shown pressed), `disabled: true`.

In Vue: `:toolbar-actions="actions"`.

Built-in icon names include `attach_file`, `auto_awesome`, `mail`, `image`, `link`, `edit`,
`search`, `tune`, `lightbulb`, `file_upload`, `file_download`, `code` and `visibility`. The full set
is in [`packages/engine/src/icons.ts`](packages/engine/src/icons.ts).

---

## 10. Import or paste existing HTML

Users can bring in an email or web page they already have:

1. Click **Code**, then the **Import** tab.
2. Paste HTML, drop an `.html` file onto the text box, or click **Choose .html file**.
3. Click **Add to email** or **Replace email**.

With **Convert to editable blocks** ticked (the default), the HTML is turned into normal blocks:
headings, text, images, buttons, lists, dividers, and side-by-side table cells as columns.
Navigation, forms, scripts and icon fonts are left out. Untick it to keep the HTML as one block that
is edited as code.

**Edit as HTML** (on the View tab) loads the current email into the Import tab so users can change
the HTML by hand.

From code:

```js
editor.importHtml(html);                                   // add as editable blocks
editor.importHtml(html, { mode: "replace" });              // replace the whole email
editor.importHtml(html, { as: "html" });                   // keep as one HTML block
```

Conversion keeps content, not page styling: styles from CSS classes and stylesheets aren't carried
over, and `div`-based page layouts become a single column.

---

## 11. Create your own blocks

A block is one object. You describe its settings as data, so it works in React **and** Vue without
writing any UI:

```js
import { defineBlock } from "@email-builder/core";

export const quoteBlock = defineBlock({
  type: "quote",
  label: "Quote",
  group: "Content",
  icon: "notes", // built-in icon name or your own <svg>

  // What a new block starts with
  defaultContent: () => ({ text: "Great product!", author: "A happy customer" }),
  defaultStyle: () => ({ color: "#111827" }),

  // The settings panel — each field edits one key
  schema: [
    {
      title: "Content",
      target: "content",
      fields: [
        { kind: "textarea", key: "text", label: "Quote", mergeable: true },
        { kind: "text", key: "author", label: "Author" },
      ],
    },
    { title: "Style", target: "style", fields: [{ kind: "color", key: "color", label: "Text colour" }] },
  ],

  // The email HTML. Use tables and inline styles; escape user text with esc().
  render: ({ content, style, esc }) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:16px 24px;color:${esc(style.color)};font-style:italic">
        “${esc(content.text)}”<br><span style="font-style:normal">— ${esc(content.author)}</span>
      </td></tr>
    </table>`,
});
```

```jsx
<EmailBuilder blocks={[quoteBlock]} />
```

It appears in the Blocks panel, drags like any other block, gets a settings panel, and compiles into
the email. Remember to pass the same block to `setup()` on your server ([section 5](#5-get-the-html-to-send)).

To hide built-in blocks: `excludeBlocks={["video", "social"]}`.

More in [`docs/EXTENDING.md`](docs/EXTENDING.md): every field kind, filling a block from your own
records, and writing render functions.

---

## 12. Translate the editor

Every label can be replaced through `adapter.labels`:

```jsx
<EmailBuilder
  adapter={{
    labels: {
      "toolbar.preview": "Vista previa",
      "toolbar.code": "Código",
      "canvas.addRow": "Añadir fila",
    },
  }}
/>
```

The full list of keys and their English defaults is in
[`packages/engine/src/i18n.ts`](packages/engine/src/i18n.ts).

---

## 13. All props

React names shown; in Vue use kebab-case (`mergeFields` → `merge-fields`, `onSave` → `on-save`).

| Prop | Type | Default | What it does |
|---|---|---|---|
| `document` | object | empty | The design to load |
| `onSave` | `(design) => void \| Promise` | — | Called by autosave and ⌘S / Ctrl+S |
| `onChange` | `(design) => void` | — | Called on every change |
| `onReady` | `(editor) => void` | — | Gives you the [editor object](#14-the-editor-object) |
| `autosave` | `{ debounceMs?, maxWaitMs?, enabled? }` | on when `onSave` is set | Autosave timing |
| `mergeFields` | `MergeField[]` | — | [Personalisation fields](#6-personalise-emails-merge-fields) |
| `mergeSyntax` | `{ open, close }` | `{{ }}` | Placeholder style |
| `adapter` | object | — | [Uploads](#7-let-users-upload-images), [labels](#12-translate-the-editor), records |
| `blocks` | `BlockDefinition[]` | — | [Your own blocks](#11-create-your-own-blocks) |
| `excludeBlocks` | `string[]` | — | Built-in block types to hide |
| `toolbarActions` | `ToolbarAction[]` | — | [Extra toolbar buttons](#9-add-your-own-buttons-to-the-toolbar) |
| `theme` | `"light" \| "dark" \| "auto"` | `"light"` | Colour scheme |
| `showPalette` | boolean | `true` | Show the Blocks panel |
| `showInspector` | boolean | `true` | Show the settings panel |
| `showToolbar` | boolean | `true` | Show the toolbar above the email |
| `className` (Vue: `class`) | string | — | Extra class on the root element |

**Vue events:** `save`, `change`, `ready`, `select`.

---

## 14. The editor object

`onReady` (React) or `@ready` (Vue) gives you the editor. Keep it to control the editor from your
own code:

```js
editor.getDocument();                 // the current design — save it
editor.replaceDocument(design);       // load a different design
editor.compile();                     // { html, text } — see section 5
editor.importHtml(html, { mode });    // see section 10
editor.save();                        // run onSave now
editor.isDirty();                     // unsaved changes?
editor.undo();
editor.redo();

// Build content from code
const row = editor.addRow([1, 1]);                   // a two-column row
editor.addBlock("heading", row.columns[0].id);
editor.addBlock("image", row.columns[1].id);
```

---

## 15. Troubleshooting

**The editor is blank or squashed.**
Its container has no height. Give the wrapper a height: `style={{ height: "100vh" }}`, or make it fill
a flex layout.

**The editor looks unstyled.**
You forgot `import "@email-builder/styles";`.

**`window is not defined` / `document is not defined` in Next.js or Nuxt.**
The editor is rendering on the server. See [section 3](#3-nextjs-and-nuxt).

**Image upload does nothing.**
Add `adapter.assets.upload` ([section 7](#7-let-users-upload-images)). Errors are passed to
`adapter.notify.error`, so add that too to see why an upload failed.

**`onSave` never runs.**
It runs shortly after the user stops editing, or on ⌘S / Ctrl+S. Check you didn't pass
`autosave={{ enabled: false }}`.

**The email shows `{{user.firstName}}` instead of a name.**
That's expected until you fill it in: pass `data` to `compile()` on your server, or let your email
provider replace it ([section 5](#5-get-the-html-to-send)).

**My colour overrides don't apply.**
Your CSS has to beat the editor's. Put a class on `<body>` and use `body.my-app .eb-root { … }`
rather than `.eb-root { … }` — see [section 8](#8-match-your-apps-look) and
[docs/THEMING.md](docs/THEMING.md#troubleshooting).

**Imported HTML lost its styling.**
Conversion keeps content, not page CSS ([section 10](#10-import-or-paste-existing-html)). Untick
**Convert to editable blocks** to keep the original HTML as one block.

---

## 16. Packages, docs and development

| Package | Install it when… |
|---|---|
| [`@email-builder/react`](packages/react) | You use React |
| [`@email-builder/vue`](packages/vue) | You use Vue 3 |
| [`@email-builder/styles`](packages/styles) | Always, alongside react or vue |
| [`@email-builder/core`](packages/core) | You compile designs to HTML on a server, or write custom blocks |
| [`@email-builder/engine`](packages/engine) | You build your own editor UI (installed automatically with react/vue) |

**What the HTML includes:** table-based layout with inline styles; Outlook-compatible rounded buttons
and centring; mobile styles that stack columns; iOS auto-link fixes; and sanitising of user-written
HTML so pasted content can't run scripts in your app.

**Docs**

- [docs/THEMING.md](docs/THEMING.md) — make the editor match your app
- [docs/EXTENDING.md](docs/EXTENDING.md) — custom blocks, field kinds, records, translations
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the packages fit together
- [docs/VIEW-CONTRACT.md](docs/VIEW-CONTRACT.md) — what the React and Vue packages implement
- [docs/RELEASING.md](docs/RELEASING.md) — publishing to npm (maintainers)
- [CHANGELOG.md](CHANGELOG.md)

**Working on this repo**

```bash
npm install
npm run build        # build all packages
npm test             # run the tests
npm run dev:react    # React demo at http://localhost:5173
npm run dev:vue      # Vue demo at http://localhost:5174
```

## License

MIT
