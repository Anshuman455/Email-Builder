# @email-builder/styles

The stylesheet for [Email Builder](https://github.com/Anshuman455/Email-Builder)'s editor. Every
rule is confined to the builder, and every colour comes from a CSS variable, so it can match your
app's theme.

## Install

```sh
npm i @email-builder/styles
```

## Use

```js
import "@email-builder/styles";
```

If your app uses CSS cascade layers (Tailwind v4 does), import the layered build instead:

```js
import "@email-builder/styles/layered";
```

## Match your app's colours

```css
html.my-app .eb-root {
  --eb-accent: var(--app-primary);
  --eb-surface: var(--app-card);
  --eb-border: var(--app-border);
  --eb-text: var(--app-foreground);
  --eb-radius: var(--app-radius);
  --eb-font: inherit;
}
```

All variables and their defaults ship in `@email-builder/styles/variables`. The
[theming guide](https://github.com/Anshuman455/Email-Builder/blob/main/docs/THEMING.md) covers every
variable, dark mode, and recipes for shadcn/ui, MUI, Bootstrap and Tailwind.

These styles apply to the editor only. The emails you send are inline-styled HTML and don't use them.

## License

MIT
