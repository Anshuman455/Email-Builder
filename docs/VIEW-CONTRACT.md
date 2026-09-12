# View-layer contract

`@email-builder/react` and `@email-builder/vue` are **thin bindings over `@email-builder/engine`**.
They must be feature-identical. This document is the shared specification; both packages implement
exactly this, differing only in framework idiom.

## Non-negotiables

1. **No document logic in a view.** Every mutation goes through an `editor.*` command. A view never
   touches `editor.getDocument()` to build a new document.
2. **No drag logic in a view.** Views call `editor.dnd.draggable(el, data)` / `editor.dnd.droppable(el, data)`
   in a mount effect and return the cleanup. They read `editor.dnd.state` to draw the ghost + indicator.
3. **Class names come from `@email-builder/styles`.** Never invent one; never inline a style that a
   class already covers. The full class list is in `packages/styles/src/*.css`.
4. **No framework-specific dependency beyond the framework itself.** No react-select, no toast lib,
   no HTTP client, no router. Anything the host must provide goes through `adapter`.
5. **Every string** renders through `t(key)` from `createTranslator(adapter.labels)`.
6. **SSR-safe.** No DOM access during render. All DOM work in mount effects.

## Subscribing to engine state

- React: `useSyncExternalStore(editor.state.subscribe, editor.state.get, editor.state.get)`.
  Prefer `useEditorSelector(selector)` so a component re-renders only when its slice changes.
- Vue: `shallowRef(editor.state.get())` + `editor.state.subscribe` in `onMounted`, `onUnmounted` to
  dispose. Export the same selector helper as a composable.

## Public API — both packages expose exactly these names

```
EmailBuilder          the whole editor (the only component most hosts use)
BuilderToolbar
BuilderPalette
BuilderCanvas
BuilderRow
BuilderColumn
BuilderBlock
BuilderInspector
BuilderField          renders one Field from a block's declarative schema
BuilderPreview
BuilderCodeView
PreflightPanel
DragLayer             ghost + drop indicator; mounted once by EmailBuilder

useEmailBuilder(options)   -> Editor        (React hook / Vue composable, same name)
useEditorState()           -> EditorState
useEditorSelector(fn)      -> T
EditorProvider / provideEditor + useEditor    (context plumbing)
```

`EmailBuilder` props (identical in both, camelCase):

```ts
{
  document?: unknown            // any shape; normalized by the engine
  blocks?: BlockDefinition[]    // added on top of the built-ins
  excludeBlocks?: string[]
  mergeFields?: MergeField[]
  mergeSyntax?: MergeSyntax
  adapter?: Adapter
  mode?: "email" | "layout" | string
  theme?: "light" | "dark" | "auto"
  onSave?: (doc) => Promise<void> | void
  onChange?: (doc) => void
  onReady?: (editor: Editor) => void
  autosave?: { debounceMs?: number; maxWaitMs?: number; enabled?: boolean }
  title?: string
  showPalette?: boolean         // default true
  showInspector?: boolean       // default true
  showToolbar?: boolean         // default true
  class/className?: string
}
```

Vue additionally emits: `save`, `change`, `ready`, `select`. React uses the `on*` props only.

## Component tree

```
.eb-root[data-eb-theme]
  BuilderToolbar        .eb-toolbar
  .eb-body
    BuilderPalette      .eb-palette
    BuilderCanvas       .eb-canvas > .eb-sheet
      row slot          .eb-row-slot            droppable {kind:"row-slot", index}
      BuilderRow        .eb-row                 droppable {kind:"row", rowId, index}, draggable {kind:"row", rowId} via its drag button
        .eb-row__toolbar   drag / duplicate / delete / layout
        .eb-row__columns
          BuilderColumn .eb-column              droppable {kind:"column", columnId, rowId} container:true
            BuilderBlock .eb-block              droppable {kind:"block", blockId, columnId}, draggable {kind:"block", blockId, columnId} via its drag button
              .eb-block__label, .eb-block__toolbar, .eb-block__render
    BuilderInspector    .eb-inspector
  DragLayer             .eb-ghost + .eb-indicator (fixed, portal/Teleport to body)
```

## Rendering a block on the canvas

```ts
const html = editor.compile({ preview: true, fragment: true })   // NEVER per block
```
is wrong — too coarse. Instead, per block:

```ts
import { compileBlockPreview } from "./preview";   // each package implements this helper
// It calls definition.preview ?? definition.render with a RenderContext built the same way
// compile() builds one, with preview:true and sample bound to editor.merge.
```
Inject with `dangerouslySetInnerHTML` (React) / `v-html` (Vue) into `.eb-block__render`.
The HTML is table markup produced by core and already sanitised there.

## Inline editing

For a block whose definition has `inlineEditKey`, double-click enters inline edit:
- set `contentEditable` on the element carrying `data-eb-inline`
- on blur/Escape, commit with `editor.updateContent(id, { [inlineEditKey]: el.innerHTML }, "inline")`
- `editor.beginInlineEdit(id)` / `editor.endInlineEdit()` track the state

## BuilderField — the declarative inspector

`BuilderField` receives `{ field, value, onChange, block }` and switches on `field.kind`.
Every kind in `Field` must be handled. Markup per kind is specified by the classes in
`packages/styles/src/fields.css` — read it; the class names ARE the spec. Summary:

| kind | markup |
|---|---|
| text / url | `.eb-field > label.eb-field__label + input.eb-input` |
| textarea | `textarea.eb-textarea` (`.eb-textarea--code` when key is `html`) |
| richtext | `contenteditable` div with `.eb-textarea`; toolbar not required in v0.1 |
| number | `.eb-number > input.eb-input + span.eb-number__suffix` |
| range | `.eb-range > input.eb-range__input + span.eb-range__value` |
| color | `.eb-color > .eb-color__swatch(input[type=color] + .eb-color__fill) + input.eb-input + .eb-color__clear` when `allowTransparent` |
| toggle | `label.eb-toggle > input[type=checkbox] + .eb-toggle__track > .eb-toggle__thumb` |
| select | `select.eb-select` — a NATIVE select, deliberately |
| segmented | `.eb-segmented > button.eb-segmented__item[aria-pressed]` |
| align | `.eb-align > button.eb-align__btn[aria-pressed]` ×3 with left/center/right icons |
| padding | `.eb-padding` — 4 × `.eb-padding__cell` (T R B L) + a link-all toggle |
| border | `.eb-border` — width number, style select, colour swatch |
| font | `select.eb-select` with `FONT_STACKS` from core |
| image | `.eb-image-field` — click opens `adapter.assets.browse?.()` else a file input → `adapter.assets.upload()`; drag-drop onto the preview also uploads |
| list | `.eb-list` — collapsible `.eb-list__item`s, recursive `BuilderField` for `itemFields`, `.eb-list__add` |
| record | `.eb-record` — searches `adapter.records.list(field.source, {search})`, on pick applies `field.mapToContent?.(raw) ?? adapter.records.map?.(source, option) ?? {}` merged into content |
| custom | look up `adapter.widgets[field.widget]` and render it with `{ field, value, onChange, block, editor }` |

Fields with `mergeable: true` render an `.eb-merge__trigger` in the label row that opens
`.eb-merge__menu` listing `editor.merge.groups()`; picking one inserts `editor.merge.format(token)`
at the caret (or appends when the input is not focused).

`field.inline === true` → the field and its predecessor sit in one `.eb-field-row`.

## Drag layer

Single component, portalled to `document.body`, subscribed to `editor.dnd.state`:
- ghost: `.eb-ghost` positioned with `transform: translate3d(x+12px, y+12px, 0)`, containing
  `.eb-ghost__inner` with the block/row icon + label
- indicator: `.eb-indicator` + `--vertical` / `--horizontal` / `--inside`, positioned from
  `state.indicator.rect` (viewport coordinates — use `position: fixed`, no scroll maths)

## Keyboard

Bound on `.eb-root`, ignored while focus is inside an input or `[contenteditable]`:

| keys | action |
|---|---|
| ⌘/Ctrl+Z / ⌘/Ctrl+Shift+Z | `editor.undo()` / `editor.redo()` |
| ⌘/Ctrl+S | `editor.save()` |
| ⌘/Ctrl+D | duplicate selection |
| Delete / Backspace | remove selection |
| Escape | clear selection, or cancel a drag |
| Tab / Shift+Tab | `editor.selectNext(1 / -1)` |
| Enter | begin inline edit on the selected block |

## Accessibility

- Every icon-only button has an `aria-label` from `t()`.
- Draggable handles: `role="button"`, `tabindex="0"`, `aria-roledescription="draggable"`.
- The canvas region is `role="region"` + `aria-label`.
- Selected block carries `aria-selected="true"`.
- A live region announces drag start/over/drop for keyboard dragging.

## Icons

Use `ICONS` from `@email-builder/core` for block icons. For chrome (undo, trash, copy, plus,
chevron, grip, align…) each package defines its own small internal `icons.ts(x)` — same 24×24
stroke style, `currentColor`, `stroke-width: 1.6`.
