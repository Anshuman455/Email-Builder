# Theming

The builder's whole look is controlled by CSS custom properties. Set a handful of them and the
editor uses your app's colours, radius and font. You don't need Sass, a fork, or `!important`.

- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Where to put your overrides](#where-to-put-your-overrides)
- [Variable reference](#variable-reference)
- [Recipes](#recipes)
- [Dark mode](#dark-mode)
- [Rules of thumb](#rules-of-thumb)
- [Troubleshooting](#troubleshooting)

---

## Quick start

```js
import "@email-builder/styles";
import "./email-builder-theme.css"; // your overrides, loaded after
```

```css
/* email-builder-theme.css */
.my-app .eb-root {
  --eb-accent: #7c3aed;     /* your brand colour */
  --eb-radius: 10px;
  --eb-font: inherit;       /* use your app's font */
}
```

Changing `--eb-accent` alone updates primary buttons, selection outlines, drop zones, focus rings,
hover fills and active tabs.

---

## How it works

All variables are defined in one file:
[`packages/styles/src/variables.css`](../packages/styles/src/variables.css). No other stylesheet
contains a colour value, and the build fails if one is added. Every colour you see in the editor
comes from a variable you can override.

The file has two tiers:

| Tier | Examples | Who uses it |
|---|---|---|
| **Palette** | `--eb-gray-500`, `--eb-brand-600`, `--eb-red-500` | Internal. Raw colour values that the semantic tier points to. **Don't override or reference these.** |
| **Semantic** | `--eb-surface`, `--eb-text`, `--eb-accent`, `--eb-danger` | What the stylesheets use. **This is the theming API.** |

Some semantic variables are **derived** from others with `color-mix()`:

```css
--eb-accent-soft: color-mix(in srgb, var(--eb-accent) 8%, var(--eb-surface));
--eb-accent-ring: color-mix(in srgb, var(--eb-accent) 30%, transparent);
```

Override the base (`--eb-accent`, `--eb-surface`) and the derived ones follow. Only override a
derived variable when you want a specific value that differs from the computed one.

### Scoping

- Variables are declared on `.eb-root`, never on `:root`. Nothing leaks into your page.
- Every rule in the stylesheet only matches inside `.eb-root`. A class like `.palette-block` in your
  own app is never affected.
- Modals, the drag preview and menus render into `document.body`, but they are wrapped in their own
  `.eb-root` that carries the same theme. Overrides written against `.eb-root` reach them too.

---

## Where to put your overrides

The builder declares its variables on `.eb-root` with a specificity of **one class**. Your
override has to beat that. Pick one of these options.

### Option A: add a parent class (recommended)

```css
.my-app .eb-root {
  --eb-accent: #7c3aed;
}
```

Two classes beat one, so load order doesn't matter. The parent can be `body`, `#app`, or a wrapper
around the builder.

Portalled overlays (modals, drag preview, merge menu) are mounted directly on `document.body`, so a
parent wrapper *around the builder* won't reach them. If you theme overlays, put the parent class on
`html` or `body`:

```css
html.my-app .eb-root { --eb-accent: #7c3aed; }
```

### Option B: plain `.eb-root`, loaded after the builder

```css
.eb-root { --eb-accent: #7c3aed; }
```

This works only if your stylesheet comes **after** `@email-builder/styles`. It's fine for simple
setups, but fragile when bundlers reorder CSS.

### Option C: the layered build

If your app uses cascade layers (Tailwind v4 does), import the layered stylesheet instead:

```js
import "@email-builder/styles/layered";
```

Every builder rule then sits inside `@layer email-builder`. Any **unlayered** CSS you write beats it,
whatever the specificity or order:

```css
.eb-root { --eb-accent: #7c3aed; }
```

Order the layer however you like:

```css
@layer reset, email-builder, components, utilities;
```

> ⚠️ With the layered build, unlayered **element** selectors in your app (`button { padding: 0 }`,
> `input { border: none }`) also beat the builder's styles. Only use it if your global CSS is
> layered too.

### Theming one instance

For two builders with different themes on one page, scope by a class you pass in:

```jsx
<EmailBuilder className="brand-acme" />
```

```css
.eb-root.brand-acme { --eb-accent: #e11d48; }
```

`className` (React) and `class` (Vue) land on the root element.

---

## Variable reference

These are the variables to override. Defaults are the light theme.

### Surfaces

| Variable | Default | Used for |
|---|---|---|
| `--eb-bg` | gray-100 `#f3f4f6` | Canvas background behind the email |
| `--eb-surface` | white | Panels, cards, inputs, toolbar, modals |
| `--eb-surface-subtle` | gray-50 `#f9fafb` | Section headers, empty states, secondary panels |
| `--eb-surface-sunken` | gray-100 `#f3f4f6` | Hover fills, segmented control tracks, wells |
| `--eb-surface-raised` | white | Popovers and menus above a surface |
| `--eb-surface-inverse` | gray-900 `#111827` | Tooltips and dark toolbars |
| `--eb-overlay` | gray-900 at 45% | Modal backdrop |

### Text

| Variable | Default | Used for |
|---|---|---|
| `--eb-text` | gray-900 `#111827` | Primary text, headings |
| `--eb-text-secondary` | gray-700 `#374151` | Labels, body copy in panels |
| `--eb-text-muted` | gray-500 `#6b7280` | Hints, descriptions, idle icons |
| `--eb-text-subtle` | gray-400 `#9ca3af` | Placeholders, disabled text, counters |
| `--eb-text-inverse` | white | Text on `--eb-surface-inverse` and on filled buttons |

### Borders

| Variable | Default | Used for |
|---|---|---|
| `--eb-border` | gray-200 `#e5e7eb` | Dividers, input and card borders |
| `--eb-border-strong` | gray-300 `#d1d5db` | Hovered inputs, dashed drop zones, scrollbars |

### Accent

| Variable | Default | Used for |
|---|---|---|
| `--eb-accent` | `#394648` | **Your primary colour.** Primary buttons, selection, active states, drop targets |
| `--eb-accent-hover` | `#2b3537` | Hover/pressed state of filled accent buttons |
| `--eb-accent-line` | `#506264` | Borders and dividers *inside* accent-filled areas |
| `--eb-accent-soft` | *derived*: 8% accent on surface | Selected rows, hovered drop zones, active pills |
| `--eb-accent-ring` | *derived*: 30% accent | Focus and selection rings |
| `--eb-on-accent` | `var(--eb-text-inverse)` | Text and icons on accent fills |
| `--eb-on-accent-muted` | `#8ea2a6` | Secondary text on accent fills (line numbers in code view) |
| `--eb-on-accent-subtle` | `#728b8f` | Placeholders on accent fills |
| `--eb-highlight` | `#f1ff97` | The AI pill's active highlight |

### Status

| Variable | Default | Used for |
|---|---|---|
| `--eb-info` / `--eb-info-hover` | `#01a7c2` / `#018da4` | Import notices, informational buttons |
| `--eb-info-soft` / `--eb-info-text` | `#e0f2fe` / `#0284c7` | Info badges, active merge-tag tabs |
| `--eb-link` | `#3b82f6` | Inline links in notices |
| `--eb-danger` | `#ef4444` | Delete actions, errors, validation |
| `--eb-danger-strong` | `#c61111` | Error text that needs more contrast |
| `--eb-danger-soft` | `#fef2f2` | Error banners, delete hover fills |
| `--eb-warning` | `#f59e0b` | Warning icons, merge-field markers |
| `--eb-warning-strong` | `#d97706` | Warning borders |
| `--eb-warning-text` | `#92400e` | Text inside warning banners |
| `--eb-warning-soft` | `#fffbeb` | Warning banners |
| `--eb-success` | `#10b981` | Saved state, success banners |
| `--eb-success-strong` | `#0b815a` | Success text |
| `--eb-success-soft` / `--eb-success-muted` | `#ecfdf5` / `#b6f9e3` | Success banners, "active" state chips |

### Elevation

| Variable | Default | Used for |
|---|---|---|
| `--eb-shadow-color` | black | Base colour of **every** shadow. Tint it to match your app's shadows. |
| `--eb-shadow-1` | subtle, 2 layers | Cards, inputs |
| `--eb-shadow-2` | medium | Popovers, floating toolbars |
| `--eb-shadow-3` | large | Modals, drag preview |

### Shape, type, motion, layout

| Variable | Default | Notes |
|---|---|---|
| `--eb-radius-sm` / `--eb-radius` / `--eb-radius-lg` | `4px` / `8px` / `12px` | Set all three together to keep proportions |
| `--eb-font` | system UI stack | `inherit` uses the host font |
| `--eb-font-mono` | `ui-monospace, SFMono-Regular, …` | Code view, merge tags, colour inputs |
| `--eb-text-xs` … `--eb-text-lg` | `11px` … `15px` | Chrome type scale (not email content) |
| `--eb-duration-fast` / `--eb-duration` | `120ms` / `180ms` | Set both to `0ms` to disable motion |
| `--eb-ease` / `--eb-ease-out` | cubic-beziers | |
| `--eb-rail-width` | `268px` | Blocks panel width |
| `--eb-inspector-width` | `320px` | Settings panel width |
| `--eb-toolbar-height` | `52px` | |
| `--eb-control-height` / `--eb-input-height` | `34px` / `36px` | Match your app's form controls |
| `--eb-z-sticky` … `--eb-z-ghost` | `10` … `120` | Raise these if your app's header sits above the modals |

---

## Recipes

### Match a brand colour

Usually enough on its own:

```css
.my-app .eb-root {
  --eb-accent: #0f766e;
  --eb-accent-hover: #115e59;   /* ~10% darker */
  --eb-accent-line: #14b8a6;    /* lighter, for borders inside filled buttons */
}
```

Check that white text on `--eb-accent` passes contrast (4.5:1). For a light brand colour such as
yellow or lime, set `--eb-on-accent` to a dark value.

### Map to your design tokens

Point the builder's variables at your own, so a change to your tokens updates the editor too:

```css
.my-app .eb-root {
  --eb-bg: var(--color-background-muted);
  --eb-surface: var(--color-background);
  --eb-surface-subtle: var(--color-background-subtle);
  --eb-surface-sunken: var(--color-background-muted);
  --eb-text: var(--color-foreground);
  --eb-text-secondary: var(--color-foreground-secondary);
  --eb-text-muted: var(--color-muted-foreground);
  --eb-border: var(--color-border);
  --eb-border-strong: var(--color-input);
  --eb-accent: var(--color-primary);
  --eb-accent-hover: var(--color-primary-hover);
  --eb-on-accent: var(--color-primary-foreground);
  --eb-danger: var(--color-destructive);
  --eb-radius: var(--radius);
  --eb-font: inherit;
}
```

### shadcn/ui

shadcn stores colours as bare channels (v3, `--primary: 222 47% 11%`) or full colours (v4, oklch).
Wrap accordingly:

```css
/* shadcn v3: HSL channels */
.my-app .eb-root {
  --eb-surface: hsl(var(--background));
  --eb-bg: hsl(var(--muted));
  --eb-surface-sunken: hsl(var(--muted));
  --eb-text: hsl(var(--foreground));
  --eb-text-muted: hsl(var(--muted-foreground));
  --eb-border: hsl(var(--border));
  --eb-border-strong: hsl(var(--input));
  --eb-accent: hsl(var(--primary));
  --eb-on-accent: hsl(var(--primary-foreground));
  --eb-danger: hsl(var(--destructive));
  --eb-radius: var(--radius);
}

/* shadcn v4: variables are already full colours */
.my-app .eb-root {
  --eb-surface: var(--background);
  --eb-text: var(--foreground);
  --eb-border: var(--border);
  --eb-accent: var(--primary);
  --eb-on-accent: var(--primary-foreground);
  --eb-radius: var(--radius);
}
```

### Material UI

MUI exposes its palette as CSS variables when `cssVariables: true` is set on the theme:

```css
.my-app .eb-root {
  --eb-surface: var(--mui-palette-background-paper);
  --eb-bg: var(--mui-palette-background-default);
  --eb-text: var(--mui-palette-text-primary);
  --eb-text-muted: var(--mui-palette-text-secondary);
  --eb-border: var(--mui-palette-divider);
  --eb-accent: var(--mui-palette-primary-main);
  --eb-accent-hover: var(--mui-palette-primary-dark);
  --eb-on-accent: var(--mui-palette-primary-contrastText);
  --eb-danger: var(--mui-palette-error-main);
  --eb-warning: var(--mui-palette-warning-main);
  --eb-success: var(--mui-palette-success-main);
  --eb-font: var(--mui-font-family, inherit);
}
```

### Bootstrap 5

```css
.my-app .eb-root {
  --eb-surface: var(--bs-body-bg);
  --eb-bg: var(--bs-tertiary-bg);
  --eb-text: var(--bs-body-color);
  --eb-text-muted: var(--bs-secondary-color);
  --eb-border: var(--bs-border-color);
  --eb-accent: var(--bs-primary);
  --eb-danger: var(--bs-danger);
  --eb-warning: var(--bs-warning);
  --eb-success: var(--bs-success);
  --eb-radius: var(--bs-border-radius);
  --eb-font: var(--bs-body-font-family);
}
```

### Tailwind v4

Tailwind v4 exposes its theme as variables:

```css
@import "tailwindcss";
@import "@email-builder/styles/layered";

.eb-root {
  --eb-accent: var(--color-indigo-600);
  --eb-accent-hover: var(--color-indigo-700);
  --eb-border: var(--color-zinc-200);
  --eb-text: var(--color-zinc-900);
  --eb-radius: var(--radius-lg);
  --eb-font: var(--font-sans);
}
```

### Denser or rounder

```css
/* Compact */
.my-app .eb-root {
  --eb-control-height: 30px;
  --eb-input-height: 32px;
  --eb-text-md: 12px;
  --eb-rail-width: 240px;
  --eb-inspector-width: 288px;
}

/* Soft */
.my-app .eb-root {
  --eb-radius-sm: 8px;
  --eb-radius: 12px;
  --eb-radius-lg: 18px;
}
```

---

## Dark mode

The builder never switches theme on its own inside a light app. You choose it with the `theme` prop:

```jsx
<EmailBuilder theme="dark" />    // always dark
<EmailBuilder theme="auto" />    // follow the OS
<EmailBuilder theme="light" />   // default
```

```vue
<EmailBuilder :theme="isDark ? 'dark' : 'light'" />
```

The prop sets `data-eb-theme` on the root and on every overlay, and `variables.css` swaps the
semantic tier.

### Customising dark values

The dark defaults are declared as `.eb-root[data-eb-theme="dark"]` (one class plus one attribute).
Overrides for the dark theme need the same attribute plus a parent class:

```css
/* Light */
.my-app .eb-root {
  --eb-accent: #7c3aed;
}

/* Dark */
.my-app .eb-root[data-eb-theme="dark"] {
  --eb-accent: #a78bfa;          /* lighter, readable on dark surfaces */
  --eb-surface: #18181b;
  --eb-bg: #09090b;
  --eb-border: #27272a;
}
```

> ⚠️ A light override on `.my-app .eb-root` has the same specificity as the dark defaults, so if it
> loads later it **also applies in dark mode**. That's fine for things that don't change between
> modes (radius, font). For colours, always write a dark block as well.

For `theme="auto"`, wrap the dark block in the media query:

```css
@media (prefers-color-scheme: dark) {
  .my-app .eb-root[data-eb-theme="auto"] { --eb-accent: #a78bfa; }
}
```

### Following your app's theme

If your app already has light and dark variables that switch on a class, map once and pass the same
value to the prop:

```css
.my-app .eb-root,
.my-app .eb-root[data-eb-theme="dark"] {
  --eb-surface: var(--color-background);
  --eb-text: var(--color-foreground);
  --eb-accent: var(--color-primary);
  /* … */
}
```

```jsx
<EmailBuilder theme={appIsDark ? "dark" : "light"} />
```

The variables then follow your app. The prop still matters because it sets `color-scheme`, which
controls native scrollbars and form controls.

---

## Rules of thumb

- **Override semantic variables only.** Palette names (`--eb-gray-*`, `--eb-brand-*`) may change
  between versions. Semantic names are the stable API.
- **Start with `--eb-accent`, `--eb-font` and `--eb-radius`.** That's usually 80% of the match. Then
  surfaces and borders if your app isn't white and gray.
- **Keep contrast.** `--eb-text-muted` on `--eb-surface` should stay at or above 4.5:1. `--eb-on-accent` on
  `--eb-accent` should too.
- **Don't write CSS against internal classes** (`.builder-toolbar`, `.palette-block`). They aren't a
  public API. If a variable is missing for something you need to change, open an issue instead.
- **Never add a colour literal to the builder's own stylesheets.** Add a variable to
  `variables.css` and reference it. The build enforces this:

  ```
  Colour literals outside variables.css — use a var(--eb-*) instead:
    src/theme.css:1234  color: #ff0000;
  ```

- **These variables style the editor only.** The email being designed has its own colours (text,
  link, backgrounds), set in the inspector's email settings and inlined into the HTML output.
  Overriding `--eb-*` never changes the emails you send.

---

## Troubleshooting

**My override has no effect.**
Check specificity: `.eb-root { … }` loaded before the builder's stylesheet loses. Use
`.my-app .eb-root` ([Option A](#option-a-add-a-parent-class-recommended)). In DevTools, select the
builder's root element and check that your declaration isn't crossed out.

**The canvas is themed but modals and the drag preview aren't.**
Overlays are mounted on `document.body`, outside any wrapper around the builder. Put your parent
class on `html` or `body`, or write the override against `.eb-root` directly.

**Colours are right in light mode but wrong in dark mode.**
Your light override also applies in dark mode (same specificity, loaded later). Add a
`[data-eb-theme="dark"]` block. See [Customising dark values](#customising-dark-values).

**Hover and selection fills still show the old colour.**
You overrode `--eb-accent-soft` or `--eb-accent-ring` with a fixed value somewhere. Remove it so
they derive from `--eb-accent` again.

**Buttons and inputs look broken after switching to the layered build.**
Unlayered element rules in your app (`button { … }`) now beat the builder. Put your global CSS in a
layer, or switch back to `@email-builder/styles`.
