# ZeRoUI Layout Modes + Scroll Design

## Overview

Redesign ZeRoUI's zone system to fix the MAIN/ACTION overlap bug, add four named layout modes for different page templates, and add native scrolling via ZeppOS `VIEW_CONTAINER` for Column-based pages.

---

## Problem Statement

1. **Overlap bug**: MAIN zone (y=84, h=318, bottom=402) and ACTION zone (y=376) overlap by 26px — setup page chipRow renders under the Start button.
2. **Zone rigidity**: One set of zones means pages with no title or no action button waste vertical space.
3. **Scroll**: Column content has no scroll support — adding more list items silently overflows off-screen.
4. **Z-order**: Current build order (`bg → title → column → action`) means scrolled column content would draw over the title zone.

---

## Approved Design

### 1. Revised Zone Coordinates

All in 480×480 design canvas units.

| Zone        | x   | y       | w   | h       | Notes                                                                                                                                                                                               |
| ----------- | --- | ------- | --- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TITLE       | 120 | **24**  | 240 | 44      | Moved up from y=40. TITLE rect corners at (120,24) are 247px from center — 7px outside the circle — but text is center-aligned and far narrower than 240px, so visible content stays safely inside. |
| MAIN (FULL) | 80  | **74**  | 320 | **312** | Starts 6px below TITLE bottom (y=68); ends y=386                                                                                                                                                    |
| ACTION      | 140 | **392** | 200 | 48      | Bottom y=440; 40px clearance from circle edge                                                                                                                                                       |

Corner check (MAIN worst case): `(80, 386)` → `sqrt(160²+146²)` = 216.5 < 240 ✓
Corner check (ACTION worst case): `(140, 440)` → `sqrt(100²+200²)` = 223.6 < 240 ✓
Note: TITLE rect corners are outside the circle by design — only blank widget margin is clipped, not text.

---

### 2. Layout Modes

Four pre-computed zone sets exported as `LAYOUT` from `zones.js`. `ZONE` (legacy single-mode export) is kept unchanged for backwards compatibility.

```js
export const LAYOUT = {
  // Standard: title bar + scrollable main + action button
  FULL: {
    TITLE: { x: 120, y: 24, w: 240, h: 44 },
    MAIN: { x: 80, y: 74, w: 320, h: 312 },
    ACTION: { x: 140, y: 392, w: 200, h: 48 },
  },

  // No title bar — MAIN starts higher (y=62 = min safe y for x=80 content)
  NO_TITLE: {
    MAIN: { x: 80, y: 62, w: 320, h: 324 },
    ACTION: { x: 140, y: 392, w: 200, h: 48 },
  },

  // No action button — MAIN extends lower (bottom y=416 = max safe for x=80)
  NO_ACTION: {
    TITLE: { x: 120, y: 24, w: 240, h: 44 },
    MAIN: { x: 80, y: 74, w: 320, h: 342 },
  },

  // Full safe area — entire inscribed rect, no chrome
  MAIN_ONLY: {
    MAIN: { x: 80, y: 62, w: 320, h: 354 },
  },
};
```

**Which mode for which page:**

| Page            | Mode                 | Reason                                                                                                                                                                                                            |
| --------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/setup`   | `FULL`               | Needs "Breathing Setup" title + Start button                                                                                                                                                                      |
| `pages/stats`   | `NO_ACTION` (future) | Has "Your Journey" title; hardware back — no button. Note: stats page lowest widget currently ends at y=432, which overflows `NO_ACTION` MAIN bottom (y=416) by 16px — will need layout adjustment when migrated. |
| `pages/session` | `MAIN_ONLY` (future) | Immersive breathing animation; no chrome                                                                                                                                                                          |
| `pages/home`    | manual               | Bespoke layout; will adopt LAYOUT constants as reference points in future cleanup                                                                                                                                 |

---

### 3. Scrollable Column via VIEW_CONTAINER

When `{ scrollable: true }` is passed, Column creates a ZeppOS `VIEW_CONTAINER` as a persistent viewport. This gives native scroll physics (momentum, bounce) without custom gesture handlers.

**Critical constraint — VIEW_CONTAINER must be created once and reused across rebuilds.** Destroying and recreating the container on every chip selection would insert it at the top of the z-order (after title/action), breaking clipping. The Column therefore splits lifecycle into two methods:

- **`clearContent()`** — destroys only child widgets (chips, labels, chipRow items), resets y to 0, keeps the VIEW_CONTAINER alive. Used by the page's `rebuild()` callback.
- **`destroyAll()`** — destroys child widgets AND the VIEW_CONTAINER. Called only in `onDestroy()`.
- **`finalize()`** — called after all items are added. Updates VIEW_CONTAINER with the total scrollable content height so it knows how far to scroll.

```js
class Column {
  constructor(zone, { scrollable = false } = {}) {
    this._scrollable = scrollable;
    this._zone = zone;
    this._container = null;

    if (scrollable) {
      this._container = hmUI.createWidget(hmUI.widget.VIEW_CONTAINER, {
        x: zone.x,
        y: zone.y,
        w: zone.w,
        h: zone.h, // visible viewport height
        scroll_enable: 1,
      });
      this.x = 0;
      this.y = 0;
    } else {
      this.x = zone.x;
      this.y = zone.y;
    }
    this.w = zone.w;
    this._startY = this.y;
    this._widgets = [];
  }

  // Destroy child widgets only — keeps VIEW_CONTAINER alive and z-ordered
  clearContent() {
    this._widgets.forEach((w) => hmUI.deleteWidget(w));
    this._widgets = [];
    this.y = this._startY;
  }

  // Full teardown — called in onDestroy
  destroyAll() {
    this.clearContent();
    if (this._container) {
      hmUI.deleteWidget(this._container);
      this._container = null;
    }
  }

  // Call after all items are added — sets total scrollable content height.
  // Always call this when scrollable=true. VIEW_CONTAINER's default internal
  // height is the viewport h (zone.h); without finalize(), content taller than
  // the viewport will be silently cut off rather than scrollable.
  finalize() {
    if (!this._container) return;
    // Always set, even if content fits — ensures correct clip boundary.
    this._container.setProperty(hmUI.prop.MORE, { h: Math.max(this.y, this._zone.h) });
  }

  // ... existing _slot, _create, sectionLabel, chip, chipRow, spacer unchanged
}
```

> **Note on VIEW_CONTAINER child adoption**: ZeppOS is expected to treat widgets created after a VIEW_CONTAINER as belonging to it when positioned within the container's bounds. If this proves incorrect during implementation, fall back to gesture-based `setProperty(hmUI.prop.MORE, { y: newY })` repositioning on each child widget — the external Column API (`clearContent`, `destroyAll`, `finalize`) stays identical.

**Usage in setup page:**

```js
let col = null;

function rebuild() {
  if (col) col.clearContent();         // keep container, wipe chips
  else col = UI.column(LAYOUT.FULL.MAIN, { scrollable: true }); // first call only

  col.sectionLabel('Technique');
  TECHNIQUE_KEYS.forEach(key =>
    col.chip(TECHNIQUE_NAMES[key], {
      selected: selectedTechnique === key,
      onPress: () => { selectedTechnique = key; rebuild(); },
    })
  );
  col.spacer(SPACING.sectionGap);
  col.sectionLabel('Rounds');
  col.chipRow(ROUNDS_OPTIONS, {
    selected: selectedRounds,
    onPress: (v) => { selectedRounds = v; rebuild(); },
  });
  col.finalize();
}

Page({
  onInit() {
    col = null;
    selectedTechnique = get(getKey('last_technique'), 'box');
    selectedRounds = get(getKey('last_rounds'), 5);
  },
  build() {
    renderPage({
      layout: LAYOUT.FULL,
      title: 'Breathing Setup',
      action: { text: 'Start', onPress: () => push({ ... }) },
      buildFn: () => rebuild(),   // called before masks/title/action → correct z-order
    });
  },
  onDestroy() {
    if (col) { col.destroyAll(); col = null; }
  },
});
```

---

### 4. `renderPage()` Helper — Correct Z-Order

Enforces the creation order required for scrollable pages: column content first (behind), masks + title + action last (in front).

```js
// components.js
// buildFn() takes no arguments — use closure for layout reference.
// Canonical pattern: `buildFn: () => rebuild()` where rebuild() accesses
// LAYOUT.FULL.MAIN via closure. Do NOT rely on a layout parameter from renderPage.
export function renderPage({ layout, buildFn, title, action }) {
  bg();

  // 1. Column content — lowest z-order in MAIN zone
  buildFn();

  // 2. Top mask — black FILL_RECT over zone between top of screen and MAIN
  //    Covers any content that scrolls above MAIN.y into the TITLE area.
  //    On OLED, black = off — zero performance cost.
  if (layout.TITLE && layout.MAIN) {
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 480,
      h: layout.MAIN.y,
      color: COLOR.BG,
    });
  }

  // 3. Title text — drawn on top of the mask
  if (title && layout.TITLE) {
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: layout.TITLE.x,
      y: layout.TITLE.y,
      w: layout.TITLE.w,
      h: layout.TITLE.h,
      text: title,
      text_size: TYPOGRAPHY.subheadline,
      color: COLOR.TEXT,
      align_h: hmUI.align.CENTER_H,
    });
  }

  // 4. Bottom mask — covers zone between MAIN bottom and screen bottom.
  // Gated on layout.MAIN only (not layout.ACTION) so NO_ACTION scrollable pages
  // are also clipped correctly — without this mask, content that scrolls past
  // MAIN.y + MAIN.h would be visible at the bottom with no overlay.
  if (layout.MAIN) {
    const mainBottom = layout.MAIN.y + layout.MAIN.h;
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: mainBottom,
      w: 480,
      h: 480 - mainBottom,
      color: COLOR.BG,
    });
  }

  // 5. Action button — topmost widget
  if (action && layout.ACTION) {
    const z = layout.ACTION;
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: z.x,
      y: z.y,
      w: z.w,
      h: z.h,
      radius: RADIUS.chip,
      normal_color: COLOR.PRIMARY,
      press_color: COLOR.PRIMARY_PRESSED,
      text: action.text,
      text_size: TYPOGRAPHY.subheadline,
      color: COLOR.TEXT,
      click_func: action.onPress,
    });
  }
}
```

`renderPage()` is for pages with a scrollable Column. Pages that manage their own layout (home, session, stats) continue to use `UI.bg()`, `UI.title()`, `UI.actionButton()` directly — no change.

---

### 5. Exports from ZeRoUI

`index.js` additions — all existing exports (including the `UI` namespace object) are **unchanged**:

```js
// New additions only — existing exports below are untouched
export { LAYOUT } from './src/zones.js';
export { renderPage } from './src/components.js';

// Unchanged existing exports:
// export { ZONE } from './src/zones.js';
// export { bg, title, column, actionButton, heroText, statCard, UI } from './src/components.js';
// export { COLOR, TYPOGRAPHY, RADIUS, SPACING } from './src/tokens.js';
// export { Column } from './src/column.js';
```

The `UI` namespace object (`UI.bg()`, `UI.title()`, `UI.column()`, etc.) is **not modified**. Pages importing `{ UI }` continue to work without changes.

---

## Files Changed

| File                   | Repo            | Change                                             |
| ---------------------- | --------------- | -------------------------------------------------- |
| `src/zones.js`         | ZeRoUI          | Update ZONE coords; add LAYOUT export              |
| `src/column.js`        | ZeRoUI          | Add `scrollable` + `clearContent()` + `finalize()` |
| `src/components.js`    | ZeRoUI          | Add `renderPage()`                                 |
| `index.js`             | ZeRoUI          | Export `LAYOUT`, `renderPage`                      |
| `pages/setup/index.js` | zepp-meditation | Use `renderPage()` + persistent scrollable Column  |

Home, stats, and session pages are **not** migrated in this change.

---

## Verification

1. `npm run verify` in zepp-meditation — zero lint/format/build errors
2. In simulator:
   - **Setup page**: title "Breathing Setup" visible at top, Start button has clearance from circle edge
   - **No overlap**: chipRow does not render under Start button
   - **Z-order on rebuild**: selecting a technique chip calls `rebuild()` → `clearContent()` (not `destroyAll()`) → VIEW_CONTAINER stays at original z-position → title and Start button remain on top
   - **Scroll** (if content > 312px): vertical swipe in MAIN zone scrolls chips; title and action button do not scroll
3. Real device: Start button visibly clear of the watch bezel
