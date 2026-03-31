# ZeRoUI v2 Refactor — Design Spec

**Date:** 2026-03-31  
**Repos affected:** ZeRoUI (npm package), zepp-meditation, zepphyr (plugin), zeppos-app-template  
**Breaking change:** Yes — clean API redesign, all consumers migrated as part of this work

---

## Problem Statement

ZeRoUI v0.x is a toy, not a library:

- Components hardcode their zones — `title()`, `actionButton()` can't be placed anywhere else
- Inconsistent API — some components take positional args, some take objects, `heroText` and `statCard` use absolute `y` coords that bypass the zone system
- Column has only 3 methods (`chip`, `chipRow`, `sectionLabel`) — missing text, progress bars, images, dividers
- No variants — can't say `chip(..., { variant: 'danger' })` or `actionButton(..., { variant: 'secondary' })`
- `ZONE` (legacy) and `LAYOUT` coexist, creating confusion
- The `buildFn` pattern forces `if (!col) col = ...; else col.clearContent()` on every page

---

## Approach: API Redesign (Imperative, Clean Break)

Keep the imperative model — it matches ZeppOS's `hmUI.createWidget()` API. Fix the API, add variants, expand Column, add accent theming, clean up exports.

---

## Section 1 — Tokens & Theme

**Structural tokens are constant** (always OLED dark). Only accent colors are configurable.

```js
import { configure } from '@bug-breeder/zeroui';

// Preset accents
configure({ accent: 'green' });   // default (Breathe theme)
configure({ accent: 'blue' });
configure({ accent: 'red' });
configure({ accent: 'orange' });
configure({ accent: 'purple' });

// Custom accent
configure({
  accent: {
    primary: 0x007aff,
    primaryTint: 0x00204d,
    primaryPressed: 0x0051d5,
  }
});
```

`configure()` mutates `COLOR.PRIMARY`, `COLOR.PRIMARY_TINT`, `COLOR.PRIMARY_PRESSED` in place. Default is `'green'`. Call once in `app.js` — the change persists across all pages for the app's lifetime.

**Token exports unchanged:** `COLOR`, `TYPOGRAPHY`, `RADIUS`, `SPACING`

**One addition:** `COLOR.PRIMARY_LIGHT` — lighter accent variant for "today" indicators (was hardcoded `0x52d985` in stats page).

---

## Section 2 — Layout System

Drop `ZONE` entirely. It's a legacy single-mode snapshot of `LAYOUT.FULL`.

Rename `MAIN_ONLY` → `MINIMAL` for clarity:

```js
export const LAYOUT = {
  FULL:      { TITLE, MAIN, ACTION },  // title + scrollable content + action button
  NO_TITLE:  { MAIN, ACTION },         // no header
  NO_ACTION: { TITLE, MAIN },          // no bottom button
  MINIMAL:   { MAIN },                 // fullscreen / immersive (was MAIN_ONLY)
};
```

Coordinates are unchanged — this is rename and removal only.

`title()` gains an optional `layout` param for standalone use:
```js
title('Breathe', { layout: LAYOUT.FULL })   // uses layout.TITLE zone
title('Breathe')                            // default: LAYOUT.FULL.TITLE (unchanged)
```

---

## Section 3 — `renderPage()`

Two key changes: `buildFn` receives the column as a parameter, and `renderPage` returns the column.

This eliminates the `if (!col) col = ...; else col.clearContent()` boilerplate from every page.

### New signature

```js
renderPage({
  layout,       // required: LAYOUT.*
  title,        // optional: string
  action,       // optional: { text, onPress, variant: 'primary'|'secondary' }
  scrollable,   // optional: bool, default true
  buildFn,      // optional: (col: Column) => void
}) → Column
```

### Before vs after

```js
// BEFORE — current boilerplate
let col = null;
Page({
  onInit() { col = null; },
  build() {
    renderPage({
      layout: LAYOUT.FULL, title: 'Setup',
      action: { text: 'Start', onPress: () => push(...) },
      buildFn: () => {
        if (!col) col = UI.column(LAYOUT.FULL.MAIN, { scrollable: true });
        else col.clearContent();
        col.sectionLabel('Technique');
        col.chip('Box', { selected: true });
        col.finalize();
      },
    });
  },
  onDestroy() { if (col) col.destroyAll(); },
});

// AFTER — clean
let col;
Page({
  onInit() { col = null; },
  build() {
    col = renderPage({
      layout: LAYOUT.FULL, title: 'Setup',
      action: { text: 'Start', onPress: () => push(...) },
      buildFn: (c) => { col = c; rebuild(); },
    });
  },
  onDestroy() { col?.destroyAll(); },
});

function rebuild() {
  col.clearContent();
  col.label('Technique');
  col.chip('Box', { selected: true });
  col.finalize();
}
```

Z-order is preserved — `buildFn` still runs before masks and title/action are drawn. `scrollable: true` is the default; pass `scrollable: false` to opt out.

---

## Section 4 — Column

Full method surface. `sectionLabel` is renamed to `label` (plus added options). All other methods are new additions or have variants added.

### Text

```js
col.label(text, { color, align })
// Replaces sectionLabel(). Small muted text for section headers.
// color: 'muted'(default)|'default'|'primary'|'danger'
// align: 'center'(default)|'left'|'right'

col.text(text, { size, color, align, wrap, h })
// NEW: general body text.
// size: 'caption'|'body'(default)|'subheadline'|'title'|'largeTitle'
// color: 'default'(default)|'muted'|'disabled'|'primary'|'danger'
// align: 'center'(default)|'left'|'right'
// wrap: false(default) | true → multiline; requires explicit h for column y-tracking
// h: explicit height in design units; required when wrap: true

col.heroNumber(value, { color })
// NEW: large centered number. Absorbed from standalone heroText().
// color: 'default'(default)|'primary'|'muted'|'danger'
```

### Interactive

```js
col.chip(text, { selected, onPress, variant })
// Existing + variant added.
// variant: 'default'(default)|'primary'|'secondary'|'danger'|'ghost'

col.chipRow(options, { selected, onPress, variant })
// Existing + variant added.
```

### Display

```js
col.card({ title, value, valueColor, h })
// Absorbed from standalone statCard(). Integrates with column y-tracking.
// h defaults to 80.

col.progressBar(value, { color, h, radius })
// NEW: horizontal progress bar. value is 0.0–1.0.
// color: 'primary'(default)|'secondary'|'danger'
// h: defaults to 8
// radius: defaults to 4

col.image(src, { w, h, radius })
// NEW: image widget, centered in column width.
```

### Structure

```js
col.divider({ color, margin })
// NEW: thin horizontal separator line.
// color: 'surface'(default)
// margin: vertical gap added above and below, defaults to SPACING.sm

col.spacer(n)
// Unchanged.
```

### Escape hatch

```js
col.widget(type, props, h)
// NEW: raw hmUI widget with explicit h for y-tracking.
// Use for one-off widgets not covered by Column methods.
// e.g.: col.widget(hmUI.widget.ARC, { x: ..., y: col.currentY, ... }, 100)
```

### Lifecycle — unchanged

`finalize()`, `clearContent()`, `destroyAll()`, `get currentY`

---

## Section 5 — Standalone Components

```js
bg()
// Unchanged.

title(text, { layout })
// layout param added. Default: LAYOUT.FULL.TITLE zone.

actionButton(text, { onPress, variant, layout })
// variant: 'primary'(default)|'secondary'
// layout param for custom placement.

renderPage({ layout, title, action, scrollable, buildFn })
// Improved (Section 3).
```

### Removed exports

| Removed | Replacement |
|---|---|
| `ZONE` | Use `LAYOUT.FULL.*` directly |
| `heroText(text, { y, color })` | `col.heroNumber(value, { color })` |
| `statCard({ y, ... })` | `col.card({ title, value, ... })` |

### Updated `UI` namespace

`UI.heroText` and `UI.statCard` removed. `UI.configure` added.

---

## Section 6 — Consumer Updates

### ZeRoUI (`~/Code/Others/ZeRoUI`)

Full rewrite of `src/tokens.js`, `src/layout.js` (rename from zones.js), `src/column.js`, `src/components.js`. `index.js` updated to match new exports.

### zepp-meditation

| Page | Change |
|---|---|
| `setup/index.js` | New `renderPage(col => ...)` pattern; `col.sectionLabel` → `col.label` |
| `home/index.js` | Migrate to `renderPage` + `col.text`, `col.chip` — remove hardcoded y coords |
| `stats/index.js` | `col.card` for streak display; heatmap uses `col.widget` for y-tracking |
| `session/index.js` | Tokens only — no change |

### zepphyr (plugin)

- `skills/new-page/SKILL.md` — update scaffold template to new `renderPage(col => ...)` pattern
- `skills/zeroui/references/api.md` — update full API docs to v2

### zeppos-app-template

- Update page scaffold to new `renderPage(col => ...)` pattern
- Update any ZeRoUI references

---

## File Structure (ZeRoUI package)

```
src/
  tokens.js      — COLOR (+PRIMARY_LIGHT), TYPOGRAPHY, RADIUS, SPACING, configure()
  layout.js      — LAYOUT (drop ZONE, rename MAIN_ONLY → MINIMAL)
  column.js      — Column class with all new methods
  components.js  — bg, title, actionButton, renderPage (drop heroText, statCard)
index.js         — re-exports everything + UI namespace
```

---

## Non-Goals

- No virtual DOM / diffing
- No light theme or full theme swapping (accent only)
- No responsive layout (480×480 is fixed)
- No animation primitives (handled directly via ZeppOS APIs)
