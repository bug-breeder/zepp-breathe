# ZeRoUI Layout Modes + Scroll Design

## Overview

Redesign ZeRoUI's zone system to fix the MAIN/ACTION overlap bug, add four named layout modes for different page templates, and add native scrolling via ZeppOS `VIEW_CONTAINER` for Column-based pages.

---

## Problem Statement

1. **Overlap bug**: MAIN zone (y=84, h=318, bottom=402) and ACTION zone (y=376) overlap by 26px — setup page chipRow renders under the Start button.
2. **Zone rigidity**: One set of zones means pages with no title or no action button waste vertical space.
3. **Scroll**: Column content has no scroll support — adding more list items would silently overflow off-screen.
4. **Z-order**: Current build order (`bg → title → column → action`) means scrolled column content would draw over the title zone.

---

## Approved Design

### 1. Revised Zone Coordinates

All in 480×480 design canvas units. Verified: all rectangle corners are inside the circular display (radius 240, center 240,240).

| Zone | x | y | w | h | Notes |
|------|---|---|---|---|-------|
| TITLE | 120 | **24** | 240 | 44 | Moved up from y=40; text is narrow so circle clips only blank margins |
| MAIN (FULL) | 80 | **74** | 320 | **312** | Starts 4px below TITLE bottom (y=68); ends y=386 |
| ACTION | 140 | **392** | 200 | 48 | Bottom y=440; 40px clearance from circle edge |

Corner check (MAIN worst case): `(80, 386)` → `sqrt(160²+146²)` = 216.5 < 240 ✓
Corner check (ACTION bottom): `(140, 440)` → `sqrt(100²+200²)` = 223.6 < 240 ✓

---

### 2. Layout Modes

Four pre-computed zone sets exported as `LAYOUT` from `zones.js`:

```js
export const LAYOUT = {
  // Standard: title bar + scrollable main + action button
  FULL: {
    TITLE:  { x: 120, y: 24,  w: 240, h: 44  },
    MAIN:   { x: 80,  y: 74,  w: 320, h: 312 },
    ACTION: { x: 140, y: 392, w: 200, h: 48  },
  },

  // No title bar — MAIN starts higher (y=62 = min safe y for x=80)
  NO_TITLE: {
    MAIN:   { x: 80,  y: 62,  w: 320, h: 324 },
    ACTION: { x: 140, y: 392, w: 200, h: 48  },
  },

  // No action button — MAIN extends lower (y+h=416 = max safe bottom for x=80)
  NO_ACTION: {
    TITLE:  { x: 120, y: 24,  w: 240, h: 44  },
    MAIN:   { x: 80,  y: 74,  w: 320, h: 342 },
  },

  // Full safe area — both TITLE and ACTION omitted
  MAIN_ONLY: {
    MAIN:   { x: 80,  y: 62,  w: 320, h: 354 },
  },
};
```

**Which mode for which page:**

| Page | Mode | Reason |
|------|------|--------|
| `pages/setup` | `FULL` | Needs "Breathing Setup" title + Start button |
| `pages/stats` | `NO_ACTION` | Has "Your Journey" title; hardware back = no button needed |
| `pages/session` | `MAIN_ONLY` | Immersive breathing animation; no chrome |
| `pages/home` | manual | Bespoke layout; will adopt LAYOUT constants for reference points |

---

### 3. Scrollable Column via VIEW_CONTAINER

When `{ scrollable: true }` is passed, Column wraps its content in a ZeppOS `VIEW_CONTAINER`. This gives native scroll physics (momentum, bounce) without custom gesture handlers.

```js
// Usage in pages/setup:
const col = UI.column(LAYOUT.FULL.MAIN, { scrollable: true });
col.sectionLabel('Technique');
col.chip('Box Breathing', { selected: true, onPress: ... });
// ...
```

**Column internal change:**

```js
class Column {
  constructor(zone, { scrollable = false } = {}) {
    this._scrollable = scrollable;
    this._container = null;  // VIEW_CONTAINER widget ref when scrollable

    if (scrollable) {
      // Create viewport clipped to zone bounds
      this._container = hmUI.createWidget(hmUI.widget.VIEW_CONTAINER, {
        x: zone.x, y: zone.y,
        w: zone.w, h: zone.h,
        scroll_enable: 1,
      });
      // Content widgets positioned at 0-relative y inside container
      this.x = 0;
      this.y = 0;
    } else {
      this.x = zone.x;
      this.y = zone.y;
    }
    this.w = zone.w;
    this._startY = this.y;
    this._zoneH = zone.h;
    this._widgets = [];
  }

  destroyAll() {
    this._widgets.forEach(w => hmUI.deleteWidget(w));
    this._widgets = [];
    this.y = this._startY;
    if (this._container) {
      hmUI.deleteWidget(this._container);
      this._container = null;
    }
  }
}
```

> **Note on VIEW_CONTAINER child widgets**: ZeppOS treats widgets created after a VIEW_CONTAINER as belonging to it when they are positioned within its bounds. If this assumption proves incorrect during implementation, fall back to gesture-based `setProperty(hmUI.prop.MORE, { y: newY })` repositioning — the Column API stays identical.

---

### 4. `renderPage()` Helper — Correct Z-Order

Pages that use a scrollable Column must create content **before** title/action so the title and button naturally draw on top of any overflow. `renderPage()` enforces this order:

```js
// components.js
export function renderPage({ layout, buildFn, title, action }) {
  bg();

  // 1. Column content (lowest z-order in MAIN area)
  buildFn(layout);

  // 2. Top mask — covers any column overflow above MAIN zone
  if (layout.TITLE && layout.MAIN) {
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0, w: 480, h: layout.MAIN.y, color: COLOR.BG,
    });
  }

  // 3. Title text (on top of mask)
  if (title && layout.TITLE) {
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: layout.TITLE.x, y: layout.TITLE.y,
      w: layout.TITLE.w, h: layout.TITLE.h,
      text: title,
      text_size: TYPOGRAPHY.subheadline,
      color: COLOR.TEXT,
      align_h: hmUI.align.CENTER_H,
    });
  }

  // 4. Bottom mask — covers overflow below MAIN zone
  if (layout.ACTION && layout.MAIN) {
    const mainBottom = layout.MAIN.y + layout.MAIN.h;
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: mainBottom, w: 480, h: 480 - mainBottom, color: COLOR.BG,
    });
  }

  // 5. Action button (topmost)
  if (action && layout.ACTION) {
    const z = layout.ACTION;
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: z.x, y: z.y, w: z.w, h: z.h,
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

**Updated setup page build():**

```js
build() {
  renderPage({
    layout: LAYOUT.FULL,
    title: 'Breathing Setup',
    action: { text: 'Start', onPress: () => push({ url: 'pages/session/index', params: ... }) },
    buildFn: () => rebuild(),
  });
}
```

The existing `UI.bg()`, `UI.title()`, `UI.actionButton()` functions are kept for backwards compatibility (used by home/session/stats pages which manage their own layout).

---

### 5. Exports from ZeRoUI

`index.js` must export `LAYOUT` and `renderPage` in addition to existing exports:

```js
export { LAYOUT, ZONE } from './src/zones.js';
export { renderPage, bg, title, column, actionButton, heroText, statCard } from './src/components.js';
export { COLOR, TYPOGRAPHY, RADIUS, SPACING } from './src/tokens.js';
```

---

## Files Changed

| File | Repo | Change |
|------|------|--------|
| `src/zones.js` | ZeRoUI | Update ZONE coords; add LAYOUT export |
| `src/column.js` | ZeRoUI | Add `scrollable` option + VIEW_CONTAINER support |
| `src/components.js` | ZeRoUI | Add `renderPage()` |
| `index.js` | ZeRoUI | Export `LAYOUT`, `renderPage` |
| `pages/setup/index.js` | zepp-meditation | Use `renderPage()` + scrollable column |

Home, stats, and session pages are **not** migrated to `renderPage()` in this change — they use raw hmUI positioning and don't need scroll. They will adopt `LAYOUT` constants as reference points in a future cleanup.

---

## Verification

1. `npm run verify` in zepp-meditation — zero lint/format/build errors
2. In simulator:
   - **Setup page**: title "Breathing Setup" visible at top, chips scroll vertically, Start button clear of circle edge
   - **No overlap**: chipRow does not render under Start button
   - **Z-order correct**: scrolled content disappears behind title and action button, not on top
3. Real device: Start button has visible gap above the bezel; title text is readable at top
