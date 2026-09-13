# Changelog

All notable changes to the `@email-builder/*` packages. The five packages are versioned together.

## Unreleased

### Added

- **Image size in px or %.** The Image block's width can be a percentage of the column or a fixed
  pixel value (never wider than the column), and it can have a fixed pixel height — 0 keeps the
  image's proportions; a fixed height crops to fill.

### Changed

- **Column settings panel.** Selecting a column shows its background, vertical alignment, padding
  and border in the right sidebar, and a selection with nothing to edit shows an explanation
  instead of a blank panel.
- **Typography layout.** Size | Weight and Line height | Letter spacing sit side by side; Font and
  Colour are full width, with even spacing between fields.
- **Round colour swatches** in every colour field.
- **Structure panel redesign.** Rows are cards with a column count, multi-column rows list their
  columns, and blocks sit on an indented outline. Every item is a button, and the current selection
  is highlighted.

### Fixed

- **Space, Enter and Shift+Enter now type into text and headings.** The drag engine cancelled those
  keys whenever they reached a drag handle, including keys typed into a block being edited.
- **Keyboard dragging from a grip works.** The keypress that started the drag also ended it.
- **Column and row settings now show on the canvas.** Background, padding, border, corner radius,
  vertical alignment (columns) and background image (rows) were saved and exported, but the canvas
  ignored them. Also available as `columnCanvasStyle()` / `rowCanvasStyle()` in the engine.

## 0.2.1

Re-release of 0.2.0 with no code changes. `@email-builder/core@0.2.0` could not be published, which
left `engine`, `react` and `vue` 0.2.0 depending on a version that doesn't exist, so they could not
be installed. Use 0.2.1; the 0.2.0 releases are deprecated.

## 0.2.0

### Added

- **Import and edit HTML.** The Code window now has two tabs:
  - **View** — the email's HTML, formatted for reading, with Copy and Download.
  - **Import** — paste HTML, drop or choose an `.html` file, or start from the current email with
    **Edit as HTML**; then add it to the email or replace the email.
  Imported HTML is converted into editable heading, text, image, button, list and divider blocks,
  with side-by-side table cells as columns. Navigation, forms, scripts and icon fonts are left out.
  Untick **Convert to editable blocks** to keep it as a single HTML block.
- `editor.importHtml(html, { mode, as })` in `@email-builder/engine`, and `htmlToRows()` for the
  conversion on its own.
- `formatHtml()` in `@email-builder/core`.
- **Custom toolbar buttons** with the `toolbarActions` prop (React) / `toolbar-actions` (Vue): an icon
  name or your own SVG, placed next to undo/redo or before Code and Preview, with `primary`,
  `active` and `disabled` states. New `attach_file`, `file_download`, `check` and `close` icons.

### Fixed

- **Security:** the Preview iframe is sandboxed, so an email's content can't run script or reach the
  host page.
- **Security:** the sanitiser now removes event handlers however they are written
  (`<svg/onload=…>`), catches `javascript:` URLs hidden with entities or whitespace, drops `<svg>`
  and `<math>`, and can no longer be tricked into rebuilding a removed tag.
- **Security:** the rich-text field in the settings panel cleans stored HTML before showing it.
- The Code window showed raw label keys (`code.title`, `code.copy`), and several settings-panel
  labels were missing.

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
