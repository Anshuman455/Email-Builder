# @email-builder/react

A drag-and-drop email editor for React. Authors build emails from rows and blocks; you get a JSON
design to store and email-safe HTML to send.

Part of [Email Builder](https://github.com/Anshuman455/Email-Builder). A Vue 3 version with the same
props is [`@email-builder/vue`](https://www.npmjs.com/package/@email-builder/vue).

## Install

```sh
npm i @email-builder/react @email-builder/styles
```

Requires React 18 or later.

## Use

```jsx
import { EmailBuilder } from "@email-builder/react";
import "@email-builder/styles";

export function Editor({ design, onSaveDesign }) {
  return (
    <div style={{ height: "100vh" }}>
      <EmailBuilder
        document={design}
        onSave={onSaveDesign}
        onReady={(editor) => console.log(editor.compile().html)}
      />
    </div>
  );
}
```

The editor fills its container, so give the container a height.

## Props

| Prop | Type | Notes |
|---|---|---|
| `document` | `unknown` | A saved design. Omit to start empty. |
| `onSave` | `(doc) => void \| Promise<void>` | Called by autosave and ⌘S. |
| `onChange` | `(doc) => void` | Called on every edit. |
| `onReady` | `(editor) => void` | Gives you the editor instance, e.g. `editor.compile()` for HTML. |
| `blocks` | `BlockDefinition[]` | Your custom blocks, added to the built-in ones. |
| `excludeBlocks` | `string[]` | Built-in block types to hide. |
| `mergeFields` / `mergeSyntax` | | Personalisation fields such as `{{user.firstName}}`. |
| `adapter` | `Adapter` | Image uploads, record lookups and label overrides/translations. |
| `autosave` | `{ debounceMs?, maxWaitMs?, enabled? }` | |
| `theme` | `"light" \| "dark" \| "auto"` | Default `"light"`. |
| `showPalette` / `showInspector` / `showToolbar` | `boolean` | Default `true`. |
| `toolbarActions` | `ToolbarAction[]` | Extra icon buttons in the command bar — see below. |
| `className` | `string` | Added to the root element. |

## Add buttons to the command bar

```jsx
<EmailBuilder
  toolbarActions={[
    { id: "attach", label: "Attach file", icon: "attach_file", onClick: (editor) => openFilePicker() },
    { id: "ai", label: "Write with AI", icon: "auto_awesome", placement: "start", onClick: openAssistant },
  ]}
/>
```

`icon` is a built-in icon name or your own `<svg>` markup. `placement: "start"` puts the button next
to undo/redo; the default sits before Code and Preview. `primary`, `active` and `disabled` are also
supported.

## Import and edit HTML

The **Code** button opens an HTML window. **View** shows the email's HTML with Copy and Download.
**Import** takes pasted HTML or an `.html` file — or the current email via **Edit as HTML** — and
adds it to the email or replaces the email.

By default imported HTML is **converted into editable blocks**: headings, text, images, buttons,
lists, dividers, and side-by-side table cells as columns. Navigation, forms, scripts and icon fonts
are left out. Untick **Convert to editable blocks** to keep it as a single HTML block instead.

From code: `editor.importHtml(html, { mode: "append" | "replace", as: "blocks" | "html" })`.

To match your app's colours, see the
[theming guide](https://github.com/Anshuman455/Email-Builder/blob/main/docs/THEMING.md).

## License

MIT
