# @email-builder/engine

The headless editor behind [Email Builder](https://github.com/Anshuman455/Email-Builder): selection,
undo/redo, autosave, and the drag-and-drop engine. It has no UI of its own.

Most apps don't install this directly. [`@email-builder/react`](https://www.npmjs.com/package/@email-builder/react)
and [`@email-builder/vue`](https://www.npmjs.com/package/@email-builder/vue) depend on it. Use it
when you're building your own editor UI on top of the same model.

## Install

```sh
npm i @email-builder/engine @email-builder/core
```

## Use

```js
import { setup } from "@email-builder/core";
import { createEditor } from "@email-builder/engine";

const { blocks, merge } = setup();
const editor = createEditor({ document: savedDocument, blocks, merge });

const row = editor.addRow([1]);
editor.addBlock("text", row.columns[0].id);
editor.undo();

const { html } = editor.compile();
```

See the [full documentation](https://github.com/Anshuman455/Email-Builder#readme).

## License

MIT
