# @email-builder/core

The document model, block registry, merge fields and HTML compiler behind
[Email Builder](https://github.com/Anshuman455/Email-Builder). No framework and no DOM, so it runs
in the browser, in Node, or in a worker.

Use it on its own to render a saved design on the server, or through
[`@email-builder/react`](https://www.npmjs.com/package/@email-builder/react) /
[`@email-builder/vue`](https://www.npmjs.com/package/@email-builder/vue) for the visual editor.

## Install

```sh
npm i @email-builder/core
```

## Render a saved design to HTML

```js
import { setup, compile } from "@email-builder/core";

const { blocks, merge } = setup();
const { html } = compile(savedDocument, { blocks, merge });
```

## Add your own block

```js
import { defineBlock, setup } from "@email-builder/core";

const quote = defineBlock({
  type: "quote",
  label: "Quote",
  group: "Content",
  defaultContent: () => ({ text: "" }),
  defaultStyle: () => ({}),
  schema: [{ title: "Content", target: "content", fields: [{ kind: "textarea", key: "text", label: "Quote" }] }],
  render: ({ content, esc }) => `<table role="presentation" width="100%"><tr><td>${esc(content.text)}</td></tr></table>`,
});

const { blocks } = setup({ blocks: [quote] });
```

Rich-text fields and HTML blocks are sanitised on render, so a stored document can't inject script
into the editor or a "view in browser" page.

See the [full documentation](https://github.com/Anshuman455/Email-Builder#readme).

## License

MIT
