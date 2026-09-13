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
| `className` | `string` | Added to the root element. |

To match your app's colours, see the
[theming guide](https://github.com/Anshuman455/Email-Builder/blob/main/docs/THEMING.md).

## License

MIT
