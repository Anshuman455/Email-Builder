# @email-builder/vue

A drag-and-drop email editor for Vue 3. Authors build emails from rows and blocks; you get a JSON
design to store and email-safe HTML to send.

Part of [Email Builder](https://github.com/Anshuman455/Email-Builder). A React version with the same
props is [`@email-builder/react`](https://www.npmjs.com/package/@email-builder/react).

## Install

```sh
npm i @email-builder/vue @email-builder/styles
```

Requires Vue 3.4 or later.

## Use

```vue
<script setup>
import { EmailBuilder } from "@email-builder/vue";
import "@email-builder/styles";

const props = defineProps({ design: Object });

async function saveDesign(doc) {
  await fetch("/api/designs", { method: "POST", body: JSON.stringify(doc) });
}
</script>

<template>
  <div style="height: 100vh">
    <EmailBuilder :document="design" :on-save="saveDesign" @ready="(editor) => console.log(editor.compile().html)" />
  </div>
</template>
```

The editor fills its container, so give the container a height.

## Props and events

Props match [`@email-builder/react`](https://www.npmjs.com/package/@email-builder/react): `document`,
`blocks`, `exclude-blocks`, `merge-fields`, `merge-syntax`, `adapter`, `autosave`, `theme`,
`show-palette`, `show-inspector`, `show-toolbar`, `on-save`, `on-change`, `on-ready`.

Events: `save`, `change`, `ready`, `select`.

To match your app's colours, see the
[theming guide](https://github.com/Anshuman455/Email-Builder/blob/main/docs/THEMING.md).

## License

MIT
