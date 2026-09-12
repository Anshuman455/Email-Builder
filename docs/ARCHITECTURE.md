# Architecture

## The cut

```
┌─────────────────────────────────────────────────────────────────┐
│  @email-builder/react        @email-builder/vue                 │  views, thin
│  hooks + components          composables + SFCs                 │
├─────────────────────────────────────────────────────────────────┤
│  @email-builder/engine                                          │  headless, DOM-aware
│  editor · store · drag engine · autosave · adapter · i18n       │  no framework
├─────────────────────────────────────────────────────────────────┤
│  @email-builder/core                                            │  pure
│  document · registry · merge fields · compile · preflight       │  no DOM, no deps
└─────────────────────────────────────────────────────────────────┘
```

Dependencies point downward only. `core` does not know `engine` exists; `engine` does not know
which framework is mounted; a view never contains document logic.

## Why not one UI in Web Components

The obvious way to have one implementation instead of two is Lit, and it was rejected deliberately.
Shadow DOM plus `contentEditable` plus drag across shadow boundaries is a known pain surface, and
the isolation that makes web components attractive is exactly what makes the host's own form
controls, pickers and modals unusable inside them.

The chosen trade is: make the framework-specific part as small as possible, then write it twice.
The engine is what makes that small — a view holds no state, does no document maths, and implements
no drag logic.

## Why the drag engine is hand-written

dnd-kit is React-only, and it is the single dependency that makes an editor built on it
un-portable. Nothing framework-agnostic covers this case well — the layout nests 24px drop spacers
inside 400px rows, and nearest-centre collision (what generic libraries default to) resolves to the
wrong target routinely and unpredictably as content grows.

`drag.ts` is ~450 lines of Pointer Events over registered DOM nodes:

- **Innermost registered target wins.** `elementsFromPoint` returns the stack front to back; the
  first registered element is the one the pointer is genuinely inside.
- **Activation distance** so a click that wobbled stays a click.
- **Touch delay** so a vertical swipe still scrolls the page.
- **Auto-scroll** against whichever ancestor actually overflows, re-hit-testing each frame because
  geometry moves under a stationary pointer.
- **Keyboard dragging** — lift with Space, walk targets with arrows, drop with Space — which is the
  only path a screen-reader user has.

Views call `draggable(el, data)` / `droppable(el, data)` in a mount effect and read the resulting
state to draw the ghost and indicator. They never compute a drop.

## Why history wraps the document

`history.present` **is** the document. A separate `document` field alongside a history stack is two
sources of truth that must be kept in step on every undo, and that is where undo bugs come from.

Document operations clone only the path that changed, so neighbouring history entries share almost
all of their structure — a deep stack is cheap, and a view can memoise on reference identity.

Edits coalesce by label within 600ms: a colour slider dragged for three seconds is one undo step,
not ninety.

## Why autosave has a ceiling as well as a debounce

A pure debounce never fires while someone keeps working — drag a padding slider for two minutes and
nothing is written for two minutes. `maxWaitMs` is the guarantee that unsaved work is never older
than that, no matter how continuous the editing.

The debounce is 5s rather than the more common 2s because a save round-trips in about a second: at
2s the status pill spends a third of every editing minute cycling *Unsaved → Saving… → Saved*.

Exactly one write is in flight at a time. Two overlapping saves can land out of order, and the
loser silently overwrites newer work with older.

## Why the inspector is declarative

A block that shipped its own editing UI would have to ship it twice — once per framework — and a
host's custom block would have to be written twice too. Declaring the fields as data means whichever
inspector is mounted renders them, and a custom block needs no view code in either framework.

The cost is a fixed vocabulary of field kinds. Adding one is the only change that requires touching
both view packages, which is why `custom` exists: it hands rendering back to a host widget when the
declarative kinds genuinely are not enough.

## Why there is one renderer

Canvas previews and sent emails come from the same `render(ctx)` function, differing only by
`ctx.preview`. A separate preview renderer is a second implementation that drifts from the first,
silently, until an author discovers the difference in their own inbox.

`preview: true` changes exactly three things: unset images become visible placeholders, merge tokens
resolve to sample values, and a block that throws renders a diagnostic instead of nothing.

## Why the document is versioned

Once a host stores documents the shape can no longer change freely. `schemaVersion` plus an ordered
migration registry handles breaking changes. Separately, `normalize()` repairs documents that are
merely *incomplete* — hand-written fixtures, a block whose definition gained a key since the
document was saved — and never throws. `backfill()` fills new definition defaults under existing
content, which is what makes adding a field to a custom block a non-breaking change.

## Boundaries worth keeping

- **The email's markup and the editor's chrome share nothing.** The email is tables and inline
  styles, built by `core`. The chrome is flexbox and custom properties, styled by `styles`. Never
  borrow between them.
- **Sanitisation lives in the compiler, not in the HTML block.** A block that sanitised itself would
  let a host bypass the policy by registering a block that does not.
- **Nothing in this repo imports an HTTP client, a toast library, a router or a socket.** Those are
  precisely the couplings that make an editor un-extractable from the application it grew up in.
