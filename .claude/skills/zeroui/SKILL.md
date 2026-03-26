---
name: zeroui
description: Use when building pages with ZeRoUI (@bug-breeder/zeroui) — renderPage(), Column layout, LAYOUT modes, design tokens, or ZeRoUI-specific gotchas.
user-invocable: false
---

## Import

```js
import { renderPage, column, LAYOUT, COLOR, TYPOGRAPHY } from '@bug-breeder/zeroui';
import { UI } from '@bug-breeder/zeroui'; // namespace form
```

## LAYOUT modes

| Mode | Use when |
|---|---|
| `LAYOUT.FULL` | title + scrollable content + action button (most pages) |
| `LAYOUT.NO_TITLE` | no title bar, content starts higher |
| `LAYOUT.NO_ACTION` | no bottom button, content extends lower |
| `LAYOUT.MAIN_ONLY` | fullscreen / immersive / session pages |

## renderPage()

```js
renderPage({
  layout: LAYOUT.FULL,       // required
  buildFn() { ... },         // required — create Column content here; takes no args
  title: 'Page Title',       // optional string
  action: {                  // optional bottom button
    text: 'Label',
    onPress: () => {},
  },
});
```

Handles z-order: bg → buildFn output → top mask → title → bottom mask → action button.
`buildFn` takes **no arguments** — access `col` and `layout` via closure.

## column() + Column methods

```js
const col = column(LAYOUT.FULL.MAIN, { scrollable: true });
col.sectionLabel('Section name');           // muted caption label
col.chip('Label', { selected, onPress });   // full-width tappable chip
col.chipRow(['A','B','C'], { selected: 'B', onPress: (val) => {} }); // inline row
col.spacer(16);                             // add vertical gap
col.finalize();                             // REQUIRED after all items (scrollable)
// Rebuild: col.clearContent() → re-add items → col.finalize()
// Teardown: col.destroyAll() — call only in page onDestroy()
```

## Gotchas

1. **`col.finalize()` is required** — for scrollable columns, sets VIEW_CONTAINER total height. Missing it makes content unscrollable or clipped.

2. **Never `destroyAll()` mid-page** — kills VIEW_CONTAINER and breaks z-order for subsequent redraws. Use `clearContent()` + re-add + `finalize()` in rebuild loops instead.

3. **`buildFn` takes no args** — do not pass `layout` or `col` as arguments; access via closure.

4. **No double bottom mask** — `renderPage` adds its own FILL_RECT below MAIN. Do not add one yourself after `layout.MAIN.y + layout.MAIN.h`.

5. **Absolute coords inside VIEW_CONTAINER** — Column always uses absolute screen coordinates, not container-relative. This is intentional.

6. **Use ZeRoUI's COLOR** — import from `@bug-breeder/zeroui`. Do not mix with `utils/constants.js` COLOR (token values differ).

For full zone values and component signatures: read `references/api.md`
