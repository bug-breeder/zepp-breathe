# ZeRoUI Layout Modes + Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the MAIN/ACTION zone overlap bug, add four named layout modes to ZeRoUI, add scrollable Column support via VIEW_CONTAINER, and migrate the setup page to use `renderPage()`.

**Architecture:** Changes live in two repos — `ZeRoUI` (the library at `~/Code/Others/ZeRoUI/`) and `zepp-meditation` (the app at `~/Code/Others/zepp-meditation/`). After every ZeRoUI change, refresh the local package copy in zepp-meditation with `rm -rf node_modules/@bug-breeder/zeroui && npm install --install-links`, then run `npm run verify` from inside zepp-meditation.

**Tech Stack:** ZeppOS 3.6/3.7, QuickJS, hmUI (`@zos/ui`), Zeus CLI, Rollup, ESLint + Prettier.

---

## Key facts for every task

- ZeRoUI source: `/Users/alanguyen/Code/Others/ZeRoUI/src/`
- App source: `/Users/alanguyen/Code/Others/zepp-meditation/`
- Refresh ZeRoUI after each library change (run from app dir):
  ```bash
  cd /Users/alanguyen/Code/Others/zepp-meditation
  rm -rf node_modules/@bug-breeder/zeroui && npm install --install-links
  ```
- Verify (run from app dir): `npm run verify` — must exit 0 before committing
- No test framework exists — verification = `npm run verify` + manual simulator check described per task
- ZeppOS coordinate system: 480×480 design canvas, all values are integers, no `px()` needed
- `hmUI.widget.VIEW_CONTAINER` — native ZeppOS scrollable container. Widgets created after it and positioned within its bounds become its scrollable children (local coordinate space: x=0,y=0 = container top-left)

---

## Task 1 — Update zone coordinates and add LAYOUT modes (ZeRoUI)

**Files:**
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/src/zones.js` (entire file)

### Context
Current ZONE has MAIN (y=84, h=300, bottom=384) overlapping ACTION (y=376) by 8px. TITLE is at y=40. This task moves ACTION down to y=392 (bottom=440, 40px clearance), TITLE up to y=24, and adds the `LAYOUT` export with four named layout modes.

**ZONE legacy export**: coordinates ARE updated to match the new values (same as `LAYOUT.FULL`). The spec's "backwards compatibility" means keeping the export name, not freezing old values. Any page using `ZONE.TITLE` (e.g. stats page via `UI.title()`) will have its title shift from y=40 to y=24 — this is intentional and desirable.

- [ ] **Step 1: Replace zones.js entirely**

```js
/**
 * Round-display safe zones for 480×480 design canvas.
 *
 * ZONE — legacy single-mode export, kept for backwards compatibility.
 * LAYOUT — four named modes for different page templates.
 *
 * All values in 480-unit design coords — no px() needed.
 *
 * Circle geometry: radius=240, center=(240,240).
 * TITLE rect corners at (120,24) are 247px from center (outside circle)
 * but visible text is narrow and centered — only blank margin is clipped.
 * All MAIN and ACTION corners verified inside circle.
 */

export const ZONE = {
  TITLE:  { x: 120, y: 24,  w: 240, h: 44  },
  MAIN:   { x: 80,  y: 74,  w: 320, h: 312 },
  ACTION: { x: 140, y: 392, w: 200, h: 48  },
};

export const LAYOUT = {
  // title bar + scrollable main + action button (default for most pages)
  FULL: {
    TITLE:  { x: 120, y: 24,  w: 240, h: 44  },
    MAIN:   { x: 80,  y: 74,  w: 320, h: 312 },
    ACTION: { x: 140, y: 392, w: 200, h: 48  },
  },

  // no title — MAIN starts at y=62 (min safe top for x=80 content)
  NO_TITLE: {
    MAIN:   { x: 80,  y: 62,  w: 320, h: 324 },
    ACTION: { x: 140, y: 392, w: 200, h: 48  },
  },

  // no action button — MAIN extends to y=416 (max safe bottom for x=80)
  NO_ACTION: {
    TITLE:  { x: 120, y: 24,  w: 240, h: 44  },
    MAIN:   { x: 80,  y: 74,  w: 320, h: 342 },
  },

  // full safe inscribed rect — no chrome (session, immersive pages)
  MAIN_ONLY: {
    MAIN:   { x: 80,  y: 62,  w: 320, h: 354 },
  },
};
```

- [ ] **Step 2: Refresh ZeRoUI in app and verify build**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
rm -rf node_modules/@bug-breeder/zeroui && npm install --install-links
npm run verify
```

Expected: exits 0 — lint clean, format clean, zeus build succeeds.

- [ ] **Step 3: Commit in ZeRoUI repo**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git add src/zones.js
git commit -m "feat: add LAYOUT modes, move TITLE y=24 ACTION y=392

ZONE legacy export updated to match new coordinates.
LAYOUT adds FULL/NO_TITLE/NO_ACTION/MAIN_ONLY named modes.
ACTION bottom=440 gives 40px circle clearance (was 424, only 56px).
TITLE moved from y=40 to y=24 to use top space.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2 — Add scrollable Column support (ZeRoUI)

**Files:**
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/src/column.js` (entire file)

### Context
Current Column only supports non-scrollable mode. This task adds:
- `{ scrollable: true }` constructor option — creates a VIEW_CONTAINER viewport
- `clearContent()` — destroys child widgets only, keeps VIEW_CONTAINER alive (critical for z-order on rebuild)
- `destroyAll()` — full teardown including VIEW_CONTAINER (used in `onDestroy` only)
- `finalize()` — sets total scrollable content height on the container after all items are added

The existing `destroyAll()` behaviour is replaced by `clearContent()` + `destroyAll()`. Pages that called `col.destroyAll()` inside `rebuild()` must switch to `col.clearContent()` (done in Task 5).

- [ ] **Step 1: Replace column.js entirely**

```js
/**
 * Column layout helper — auto y-tracking with widget lifecycle.
 *
 * Scrollable mode:
 *   const col = new Column(zone, { scrollable: true });
 *   // add items...
 *   col.finalize();           // must call after all items added
 *   // on chip selection:
 *   col.clearContent();       // wipe chips, keep VIEW_CONTAINER z-order
 *   // re-add items...
 *   col.finalize();
 *   // in onDestroy:
 *   col.destroyAll();         // full teardown
 *
 * Non-scrollable mode: API unchanged from before.
 */

import hmUI from '@zos/ui';
import { COLOR, TYPOGRAPHY, RADIUS, SPACING } from './tokens.js';

export class Column {
  constructor(zone, { scrollable = false } = {}) {
    this._scrollable = scrollable;
    this._zone = zone;
    this._container = null;

    if (scrollable) {
      // Create the scrollable viewport. Widgets added after this widget and
      // positioned within its bounds are adopted as scrollable children.
      // Child widget coordinates are in container-local space (0,0 = top-left
      // of container, not top-left of screen).
      this._container = hmUI.createWidget(hmUI.widget.VIEW_CONTAINER, {
        x: zone.x,
        y: zone.y,
        w: zone.w,
        h: zone.h,
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

  // Reserve h design-units, return y where the item should draw
  _slot(h, gapAfter = 0) {
    const y = this.y;
    this.y += h + gapAfter;
    return y;
  }

  // Create widget and track it for clearContent() / destroyAll()
  _create(type, props) {
    const w = hmUI.createWidget(type, props);
    if (w) this._widgets.push(w);
    return w;
  }

  // Destroy child widgets only — VIEW_CONTAINER stays alive.
  // Use this inside rebuild() so VIEW_CONTAINER keeps its original z-order.
  clearContent() {
    this._widgets.forEach((w) => hmUI.deleteWidget(w));
    this._widgets = [];
    this.y = this._startY;
  }

  // Full teardown: child widgets + VIEW_CONTAINER.
  // Call only in page onDestroy(), never inside rebuild().
  destroyAll() {
    this.clearContent();
    if (this._container) {
      hmUI.deleteWidget(this._container);
      this._container = null;
    }
  }

  // Set VIEW_CONTAINER total scrollable height after all items are added.
  // Must call after every rebuild when scrollable=true.
  // VIEW_CONTAINER defaults to viewport height — without finalize(), content
  // taller than the viewport is silently cut off rather than scrollable.
  finalize() {
    if (!this._container) return;
    this._container.setProperty(hmUI.prop.MORE, {
      h: Math.max(this.y, this._zone.h),
    });
  }

  sectionLabel(text) {
    const h = 34;
    const y = this._slot(h, SPACING.sm);
    return this._create(hmUI.widget.TEXT, {
      x: this.x,
      y,
      w: this.w,
      h,
      text,
      text_size: TYPOGRAPHY.caption,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });
  }

  chip(text, { selected = false, onPress } = {}) {
    const h = 48;
    const y = this._slot(h, SPACING.chipGap);
    return this._create(hmUI.widget.BUTTON, {
      x: this.x,
      y,
      w: this.w,
      h,
      radius: RADIUS.chip,
      normal_color: selected ? COLOR.PRIMARY_TINT : COLOR.SURFACE,
      press_color: selected ? COLOR.PRIMARY_PRESSED : COLOR.SURFACE_PRESSED,
      text,
      text_size: TYPOGRAPHY.subheadline,
      color: selected ? COLOR.PRIMARY : COLOR.TEXT,
      click_func: onPress,
    });
  }

  chipRow(options, { selected, onPress } = {}) {
    const count = options.length;
    const gap = SPACING.sm;
    const chipW = Math.floor((this.w - gap * (count - 1)) / count);
    const h = 48;
    const y = this._slot(h, SPACING.chipGap);
    return options.map((opt, i) => {
      const isSel = String(opt) === String(selected);
      return this._create(hmUI.widget.BUTTON, {
        x: this.x + i * (chipW + gap),
        y,
        w: chipW,
        h,
        radius: RADIUS.chip,
        normal_color: isSel ? COLOR.PRIMARY_TINT : COLOR.SURFACE,
        press_color: isSel ? COLOR.PRIMARY_PRESSED : COLOR.SURFACE_PRESSED,
        text: String(opt),
        text_size: TYPOGRAPHY.subheadline,
        color: isSel ? COLOR.PRIMARY : COLOR.TEXT,
        click_func: () => onPress && onPress(opt),
      });
    });
  }

  spacer(n) {
    this.y += n;
  }

  get currentY() {
    return this.y;
  }
}
```

- [ ] **Step 2: Refresh ZeRoUI in app and verify build**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
rm -rf node_modules/@bug-breeder/zeroui && npm install --install-links
npm run verify
```

Expected: exits 0.

- [ ] **Step 3: Commit in ZeRoUI repo**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git add src/column.js
git commit -m "feat: add scrollable Column with VIEW_CONTAINER

New constructor option { scrollable: true } creates a VIEW_CONTAINER
viewport so content scrolls natively without custom gesture handlers.

clearContent() - wipe child widgets, keep container z-order (use in rebuild)
destroyAll()   - full teardown incl. container (use in onDestroy only)
finalize()     - set total scroll height after all items are added (required)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3 — Add renderPage() to components.js (ZeRoUI)

**Files:**
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/src/components.js` (add function at end)

### Context
`renderPage()` solves the z-ordering problem for scrollable Column pages. It must call `buildFn()` BEFORE creating masks/title/action — this ensures the Column's VIEW_CONTAINER is at a lower z-index than the chrome widgets. Two FILL_RECT masks (top + bottom) cover any content that scrolls outside the MAIN zone, using OLED black (zero power cost).

- [ ] **Step 1: Update the `column()` factory wrapper to forward options**

Find this function in `components.js` (currently line 38):
```js
export function column(zone = ZONE.MAIN) {
  return new Column(zone);
}
```
Replace with:
```js
export function column(zone = ZONE.MAIN, opts = {}) {
  return new Column(zone, opts);
}
```
Without this change, `UI.column(LAYOUT.FULL.MAIN, { scrollable: true })` silently drops `{ scrollable: true }` and no VIEW_CONTAINER is ever created.

- [ ] **Step 2: Append renderPage() to the end of components.js**

Add this after the final `}` of `statCard`:

```js
// Layout helper for pages with a scrollable Column.
// Enforces creation order: column content first (low z), then masks + title + action (high z).
// buildFn() takes no arguments — access layout via closure (e.g. LAYOUT.FULL.MAIN).
export function renderPage({ layout, buildFn, title, action }) {
  // 1. Black background
  hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 0, y: 0, w: 480, h: 480, color: COLOR.BG,
  });

  // 2. Column content — created first = lowest z-order
  buildFn();

  // 3. Top mask — hides content that scrolls above MAIN into TITLE zone
  if (layout.TITLE && layout.MAIN) {
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0, w: 480, h: layout.MAIN.y, color: COLOR.BG,
    });
  }

  // 4. Title text (on top of mask)
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

  // 5. Bottom mask — hides content that scrolls below MAIN
  //    Gated on layout.MAIN alone (not layout.ACTION) so NO_ACTION pages
  //    with scroll are also protected.
  if (layout.MAIN) {
    const mainBottom = layout.MAIN.y + layout.MAIN.h;
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: mainBottom, w: 480, h: 480 - mainBottom, color: COLOR.BG,
    });
  }

  // 6. Action button — topmost widget
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

- [ ] **Step 3: Refresh ZeRoUI in app and verify build**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
rm -rf node_modules/@bug-breeder/zeroui && npm install --install-links
npm run verify
```

Expected: exits 0.

- [ ] **Step 4: Commit in ZeRoUI repo**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git add src/components.js
git commit -m "feat: add renderPage(), fix column() to forward opts

renderPage() calls buildFn() before creating title/action so the
VIEW_CONTAINER stays below chrome widgets in the z-order.
FILL_RECT masks on OLED cost zero power (black pixels = off).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4 — Export LAYOUT and renderPage from ZeRoUI index.js

**Files:**
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/index.js`

### Context
`index.js` currently imports from zones.js and components.js but doesn't re-export `LAYOUT` or `renderPage`. This task adds those exports. The `UI` namespace object and all existing named exports are untouched.

- [ ] **Step 1: Add LAYOUT to imports and exports**

Current import line 6: `import { ZONE } from './src/zones.js';`
Change to: `import { ZONE, LAYOUT } from './src/zones.js';`

Current import lines 8–15 from components.js — add `renderPage`:
```js
import {
  bg,
  title,
  column,
  actionButton,
  heroText,
  statCard,
  renderPage,
} from './src/components.js';
```

Add `LAYOUT` to the `UI` namespace object (after line `ZONE,`):
```js
export const UI = {
  bg,
  title,
  column,
  actionButton,
  heroText,
  statCard,
  ZONE,
  LAYOUT,
  COLOR,
  TYPOGRAPHY,
  RADIUS,
  SPACING,
};
```

Add to the named exports block (after `statCard,`):
```js
  LAYOUT,
  renderPage,
```

- [ ] **Step 2: Verify the full updated index.js looks correct**

The complete file should be:

```js
// ZeRoUI — ZeppOS Rounded UI
// import { UI } from '@bug-breeder/zeroui'        (namespace)
// import { bg, ZONE, COLOR } from '@bug-breeder/zeroui'  (named)

import { COLOR, TYPOGRAPHY, RADIUS, SPACING } from './src/tokens.js';
import { ZONE, LAYOUT } from './src/zones.js';
import { Column } from './src/column.js';
import {
  bg,
  title,
  column,
  actionButton,
  heroText,
  statCard,
  renderPage,
} from './src/components.js';

export const UI = {
  bg,
  title,
  column,
  actionButton,
  heroText,
  statCard,
  ZONE,
  LAYOUT,
  COLOR,
  TYPOGRAPHY,
  RADIUS,
  SPACING,
};

export {
  COLOR,
  TYPOGRAPHY,
  RADIUS,
  SPACING,
  ZONE,
  LAYOUT,
  Column,
  bg,
  title,
  column,
  actionButton,
  heroText,
  statCard,
  renderPage,
};
```

- [ ] **Step 3: Refresh ZeRoUI in app and verify build**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
rm -rf node_modules/@bug-breeder/zeroui && npm install --install-links
npm run verify
```

Expected: exits 0.

- [ ] **Step 4: Commit in ZeRoUI repo**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git add index.js
git commit -m "feat: export LAYOUT and renderPage from index

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5 — Migrate setup page to renderPage() + scrollable Column (zepp-meditation)

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zepp-meditation/pages/setup/index.js` (entire file)

### Context
Current setup page:
- Imports `{ UI, SPACING }` — needs to add `{ LAYOUT, renderPage }`
- `rebuild()` calls `col.destroyAll()` then creates a new Column each time — must change to `col.clearContent()` on subsequent calls, only create Column once
- `build()` calls `UI.bg()` → `UI.title()` → `rebuild()` → `UI.actionButton()` — wrong z-order for scroll; replace with `renderPage()`
- `onDestroy()` just sets `col = null` — must call `col.destroyAll()` first

The `{ scrollable: true }` flag is added to support future content growth. Even with current content (300px) fitting in the 312px MAIN zone, enabling scroll now means adding more techniques later won't break anything.

- [ ] **Step 1: Replace pages/setup/index.js entirely**

```js
// pages/setup/index.js
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import { LAYOUT, SPACING, renderPage } from '@bug-breeder/zeroui';
import { UI } from '@bug-breeder/zeroui';
import {
  TECHNIQUE_NAMES,
  TECHNIQUE_KEYS,
  ROUNDS_OPTIONS,
  TECHNIQUES,
} from '../../utils/techniques';

// Module-level state — ALL reset in onInit on every page visit
let selectedTechnique = 'box';
let selectedRounds = 5;
let col = null;

function rebuild() {
  if (col) {
    // Subsequent calls: wipe chips only, keep VIEW_CONTAINER z-order intact
    col.clearContent();
  } else {
    // First call (from buildFn inside renderPage): create the scrollable Column
    col = UI.column(LAYOUT.FULL.MAIN, { scrollable: true });
  }

  col.sectionLabel('Technique');
  TECHNIQUE_KEYS.forEach((key) => {
    col.chip(TECHNIQUE_NAMES[key], {
      selected: selectedTechnique === key,
      onPress: () => {
        selectedTechnique = key;
        rebuild();
      },
    });
  });

  col.spacer(SPACING.sectionGap);
  col.sectionLabel('Rounds');
  col.chipRow(ROUNDS_OPTIONS, {
    selected: selectedRounds,
    onPress: (v) => {
      selectedRounds = v;
      rebuild();
    },
  });

  // Required when scrollable=true: sets VIEW_CONTAINER total scroll height
  col.finalize();
}

Page({
  onInit() {
    col = null;
    selectedTechnique = get(getKey('last_technique'), 'box');
    selectedRounds = get(getKey('last_rounds'), 5);
    if (!TECHNIQUES[selectedTechnique]) selectedTechnique = 'box';
    if (!ROUNDS_OPTIONS.includes(selectedRounds)) selectedRounds = 5;
  },

  build() {
    renderPage({
      layout: LAYOUT.FULL,
      title: 'Breathing Setup',
      action: {
        text: 'Start',
        onPress: () => {
          push({
            url: 'pages/session/index',
            params: JSON.stringify({
              technique: selectedTechnique,
              rounds: selectedRounds,
            }),
          });
        },
      },
      buildFn: () => rebuild(), // called before masks/title/action → correct z-order
    });
  },

  onDestroy() {
    if (col) {
      col.destroyAll();
      col = null;
    }
  },
});
```

- [ ] **Step 2: Run verify**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
npm run verify
```

Expected: exits 0 — lint clean, format clean, zeus build succeeds.

If lint errors about unused import appear: check that both `LAYOUT, SPACING, renderPage` and `UI` are used (LAYOUT in rebuild via closure, UI.column() call, renderPage in build(), SPACING.sectionGap in rebuild()).

- [ ] **Step 3: Manual simulator check**

Run `npm run dev` and verify in the simulator:
- Setup page loads: title "Breathing Setup" appears at top of circle
- Three technique chips and rounds row visible without overlap with Start button
- Tapping a technique chip: selection changes, title stays on top, Start button stays on top
- Start button is visibly clear of the circle edge (≥ 40px gap)
- Tapping Start navigates to session page with correct params

- [ ] **Step 4: Commit in zepp-meditation repo**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
git add pages/setup/index.js
git commit -m "feat: migrate setup page to renderPage() + scrollable Column

Uses LAYOUT.FULL zones (TITLE y=24, MAIN y=74 h=312, ACTION y=392).
Column is created once in renderPage's buildFn, then clearContent() is
called on subsequent rebuilds to preserve VIEW_CONTAINER z-order.
col.finalize() sets total scroll height after each rebuild.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] `npm run verify` in zepp-meditation — exits 0
- [ ] In simulator: home → tap Start → Setup page looks correct
- [ ] In simulator: tap technique chip → selection updates, title + Start button stay on top
- [ ] In simulator: tap Start → session page starts correctly
- [ ] In simulator: open Stats page — still works (no regression)
