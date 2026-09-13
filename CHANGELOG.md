# Changelog

All notable changes to the `@email-builder/*` packages. The five packages are versioned together.

## 0.1.0

First public release.

- **Editor for React and Vue 3.** `@email-builder/react` and `@email-builder/vue` share one prop API:
  rows, columns and blocks by drag and drop, a settings panel for the selection, undo/redo,
  Desktop/Mobile preview, HTML code view, and autosave.
- **Built-in blocks:** text, heading, list, image, video, button, social links, divider, spacer,
  HTML and content slot. Add your own with `defineBlock`.
- **Email-safe HTML output** from `@email-builder/core`: table-based and inline-styled, including
  Outlook fallbacks. Rich-text fields and HTML blocks are sanitised on render.
- **Themeable editor styles** in `@email-builder/styles`: every colour is a CSS variable, every rule
  is confined to the builder, and there's a cascade-layer build for apps that use `@layer`.
- **Headless engine** in `@email-builder/engine`, including `editor.drop()` for custom drag UIs.
- **HTML import and editing.** The Code window has View (formatted HTML, Copy, Download) and Import
  (paste, drop or choose an `.html` file, or "Edit as HTML"), added to or replacing the email.
  Imported HTML is converted into editable blocks (or kept as one HTML block on request). Also
  available as `editor.importHtml()`, with `formatHtml()` exported from core.
- **Custom command bar buttons** through `toolbarActions` — attachments, AI, anything — with
  built-in icon names or your own SVG.
- **Hardened sanitiser** and sandboxed preview iframe.
