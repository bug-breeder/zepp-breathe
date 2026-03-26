# ZeRoUI: ZeppOS Rounded UI Library — Design Spec

**Date:** 2026-03-26
**Repo (library):** `bug-breeder/ZeRoUI` · **npm:** `@bug-breeder/zeroui`
**Repo (first consumer):** `bug-breeder/zepp-breathe` (`zepp-meditation`)
**Platform:** ZeppOS 3.6+ round OLED smartwatches (480-unit design canvas, all round devices)

---

## Overview

A reusable UI library for ZeppOS round-display apps. Provides design tokens, a 3-zone safe-area system for round displays, a Column layout helper that eliminates manual y-tracking, and Wear OS Material 3-inspired chip components — all built on raw `hmUI` to avoid the layout bugs that made `zeppos-zui` unusable.

**Why this exists:** The raw `hmUI.createWidget()` API requires manual pixel coordinates, magic numbers, and zero design consistency. The previous library (`zeppos-zui`) tried to add a layout engine but its `VStack`/`CircularLayout` reads child dimensions before children are laid out (all children at y=0). ZeRoUI takes a different approach: pre-calculated positions from known constants, no render-time measurement.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Visual language | Wear OS Material 3 (chips, section labels, solid fill selection) | Modern, glanceable, distinct from broken zeppos-zui aesthetic |
| Round-display safety | 3-zone system (Title, Main, Action) | Uses full screen height; narrower zones at top/bottom match circle chord width |
| Coordinate system | Raw 480-unit design coords, no `px()` | `hmUI.createWidget()` accepts design-canvas units; ZeppOS scales to device pixels internally via `designWidth: 480` in `app.json`. The existing codebase confirms this — no page uses `px()` on widget coordinates. Using `px()` would double-scale on non-480 devices. |
| Distribution | npm package (`@bug-breeder/zeroui`) | True version-pinned reuse; `npm link` for local development |
| API style | Functional draw functions + Column helper | Simple, debuggable, no layout engine; mirrors raw hmUI patterns |
| Name | ZeRoUI — Ze(pp) + Ro(unded) + UI | Also reads as "Zero UI" — minimal, clean |

---

## Architecture

```
ZeRoUI/
├── package.json          @bug-breeder/zeroui, main: "index.js"
├── index.js              re-exports (UI namespace + named exports)
└── src/
    ├── tokens.js         COLOR, TYPOGRAPHY, RADIUS, SPACING
    ├── zones.js          ZONE.TITLE / ZONE.MAIN / ZONE.ACTION
    ├── column.js         Column class (auto y-tracking + widget lifecycle)
    └── components.js     bg, title, actionButton, statCard, heroText
```

### `package.json`

```json
{
  "name": "@bug-breeder/zeroui",
  "version": "0.1.0",
  "description": "ZeppOS Rounded UI — safe zones, chips, and layout helpers for round OLED watches",
  "main": "index.js",
  "type": "module",
  "files": ["index.js", "src/"],
  "keywords": ["zeppos", "zepp", "watch", "ui", "round"],
  "license": "MIT"
}
```

No `dependencies` — ZeppOS platform APIs (`@zos/ui`) are ambient, provided by the watch runtime. `zeus build` resolves `node_modules` imports via Rollup, same as the former `zeppos-zui` package.

> **Compatibility note:** If `npm link` fails with `zeus build`, the fallback is a `"@bug-breeder/zeroui": "file:../ZeRoUI"` dependency in the app's `package.json`, which also resolves through `node_modules`.

### Import styles

```js
// Namespace (clean call sites)
import { UI } from '@bug-breeder/zeroui';
UI.bg();
UI.title('Setup');

// Named (for selective imports or direct token access)
import { bg, title, column, ZONE, COLOR, SPACING } from '@bug-breeder/zeroui';
```

---

## Tokens — `src/tokens.js`

### COLOR

```js
export const COLOR = {
  // Backgrounds
  BG:                0x000000,  // OLED black
  SURFACE:           0x1c1c1e,  // chip / card background (unselected)
  SURFACE_PRESSED:   0x2c2c2e,  // pressed surface
  SURFACE_BORDER:    0x2c2c2e,  // chip outline (unselected)

  // Primary (green — selected state, progress)
  PRIMARY:           0x30d158,
  PRIMARY_TINT:      0x0c2415,  // dark green bg for selected chip
  PRIMARY_PRESSED:   0x25a244,  // pressed selected chip

  // Secondary (blue — action buttons)
  SECONDARY:         0x007aff,
  SECONDARY_PRESSED: 0x0051d5,

  // Semantic
  DANGER:            0xfa5151,
  SUCCESS:           0x34c759,
  WARNING:           0xff9f0a,

  // Text
  TEXT:              0xffffff,
  TEXT_MUTED:        0x8e8e93,
  TEXT_DISABLED:     0x3a3a3c,
};
```

### TYPOGRAPHY

```js
export const TYPOGRAPHY = {
  largeTitle:  48,  // hero numbers (session countdown)
  title:       36,  // section titles
  body:        32,  // body text
  subheadline: 28,  // chips, buttons, list items
  caption:     24,  // section labels, hints (minimum legible on watch)
};
```

### RADIUS

```js
export const RADIUS = {
  pill: 999,  // fully rounded ends (chipRow items, action button)
  chip: 12,   // standard chip corner
  card: 12,   // stat cards, surfaces
};
```

### SPACING

```js
export const SPACING = {
  xs:          4,
  sm:          8,
  md:          16,
  lg:          24,
  xl:          32,
  chipGap:     6,   // between stacked chips in a Column
  sectionGap:  12,  // after last chip before next section label
};
```

---

## Zone System — `src/zones.js`

A round display clips content near its top/bottom edges because the circle's chord width narrows. Rather than wasting the top and bottom, ZeRoUI defines three progressively-wider safe zones.

### Zone Geometry (480-unit design canvas, radius R=240)

```
TITLE zone — narrow centered strip at top
  x=120, y=40, w=240, h=44
  At y=40: chord width = 2√(240²−200²) ≈ 265 > 240 ✓
  Best for: page title (short text, max ~12 chars at subheadline size)

MAIN zone — inscribed safe rectangle
  x=80, y=84, w=320, h=300
  All 4 corners inside circle:
    (80,84):   dist from center ≈ 224 < 240 ✓
    (400,84):  dist ≈ 224 ✓
    (80,384):  dist ≈ 215 < 240 ✓
    (400,384): dist ≈ 215 ✓
  Best for: main page content (chips, cards, lists, text)

ACTION zone — narrow centered strip at bottom
  x=140, y=392, w=200, h=48
  At y=440 (bottom edge): chord width ≈ 265 > 200 ✓
  Best for: primary action button (one per page)
```

### Implementation

```js
// All values in 480-unit design coords.
// hmUI.createWidget() accepts these directly — ZeppOS scales
// to device pixels internally via designWidth in app.json.
// No px() wrapping needed.

export const ZONE = {
  TITLE:  { x: 120, y: 40,  w: 240, h: 44  },
  MAIN:   { x: 80,  y: 84,  w: 320, h: 300 },
  ACTION: { x: 140, y: 392, w: 200, h: 48  },
};
```

**Multi-device:** Since `hmUI.createWidget()` interprets coordinates relative to `designWidth: 480` (declared in `app.json`), the same zone constants work on all round ZeppOS devices (454×454 GTR 3, 466×466 GTR 4, 480×480 GTR 3 Pro, etc.) without any runtime conversion.

**Escape hatch:** Pages that need custom layouts (e.g., session page breathing rings) skip zones entirely and use raw `hmUI` directly. ZeRoUI never forces all widgets through its system.

---

## Column Layout Helper — `src/column.js`

The Column eliminates manual y-tracking — the biggest source of magic numbers in ZeppOS pages.

**How it works:** Column pre-calculates y positions from known heights (typography scale + spacing constants). It never reads rendered widget dimensions. This is fundamentally different from zeppos-zui, which called `calculateLayout()` and read back child sizes that were always 0.

### API

```js
const col = UI.column(UI.ZONE.MAIN);   // starts at zone.y

col.sectionLabel('Technique');          // renders TEXT, advances y
col.chip('Box (4-4-4-4)', opts);        // renders BUTTON, advances y
col.chipRow(['3','5','10'], opts);       // renders N buttons in a row, advances y
col.spacer(16);                         // adds gap without rendering
col.currentY;                           // escape hatch: read current y position
col.destroyAll();                       // delete all widgets created by this Column, reset y
```

### Widget Lifecycle

The Column tracks every widget it creates. Calling `col.destroyAll()` deletes all tracked widgets via `hmUI.deleteWidget()` and resets `y` to the zone's starting position. This is essential for pages like Setup that rebuild their chip list on every selection change.

**Pattern for rebuildable sections:**

```js
let col;
function rebuild() {
  if (col) col.destroyAll();  // delete previous widgets, reset y
  col = UI.column(UI.ZONE.MAIN);
  col.sectionLabel('Technique');
  TECHNIQUE_KEYS.forEach(key => {
    col.chip(TECHNIQUE_NAMES[key], {
      selected: selectedTechnique === key,
      onPress: () => { selectedTechnique = key; rebuild(); },
    });
  });
  // ...
}
```

### Implementation

```js
import hmUI from '@zos/ui';
import { COLOR, TYPOGRAPHY, RADIUS, SPACING } from './tokens.js';

export class Column {
  constructor(zone) {
    this.x = zone.x;
    this.w = zone.w;
    this.y = zone.y;
    this._startY = zone.y;
    this._widgets = [];  // tracked for destroyAll()
  }

  // Internal: reserve h design-units, return y where item draws
  _slot(h, gapAfter = 0) {
    const y = this.y;
    this.y += h + gapAfter;
    return y;
  }

  // Internal: create widget and track it
  _create(type, props) {
    const w = hmUI.createWidget(type, props);
    if (w) this._widgets.push(w);
    return w;
  }

  // Delete all widgets created by this Column, reset y
  destroyAll() {
    this._widgets.forEach(w => hmUI.deleteWidget(w));
    this._widgets = [];
    this.y = this._startY;
  }

  sectionLabel(text) {
    const h = 28;
    const y = this._slot(h, SPACING.sm);
    return this._create(hmUI.widget.TEXT, {
      x: this.x, y, w: this.w, h,
      text,
      text_size: TYPOGRAPHY.caption,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });
  }

  chip(text, { selected = false, onPress } = {}) {
    const h = 44;
    const y = this._slot(h, SPACING.chipGap);
    return this._create(hmUI.widget.BUTTON, {
      x: this.x, y, w: this.w, h,
      radius: RADIUS.chip,
      normal_color: selected ? COLOR.PRIMARY_TINT : COLOR.SURFACE,
      press_color:  selected ? COLOR.PRIMARY_PRESSED : COLOR.SURFACE_PRESSED,
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
    const h = 44;
    const y = this._slot(h, SPACING.chipGap);
    return options.map((opt, i) => {
      const isSel = String(opt) === String(selected);
      return this._create(hmUI.widget.BUTTON, {
        x: this.x + i * (chipW + gap), y,
        w: chipW, h,
        radius: RADIUS.pill,
        normal_color: isSel ? COLOR.PRIMARY_TINT : COLOR.SURFACE,
        press_color:  COLOR.SURFACE_PRESSED,
        text: String(opt),
        text_size: TYPOGRAPHY.subheadline,
        color: isSel ? COLOR.PRIMARY : COLOR.TEXT,
        click_func: () => onPress && onPress(opt),
      });
    });
  }

  spacer(n) { this.y += n; }

  get currentY() { return this.y; }
}
```

### Setup page content height verification

With chip height 44 and chipGap 6:

```
sectionLabel('Technique'):  28 + 8 (sm gap)  =  36
chip × 3:                   3 × (44 + 6)     = 150
spacer(sectionGap):                           =  12
sectionLabel('Rounds'):     28 + 8            =  36
chipRow (1 row):            44 + 6            =  50
                                        Total = 284
MAIN zone height:                             = 300 ✓ (16 units spare)
```

---

## Components — `src/components.js`

All coordinates are in 480-unit design canvas. No `px()` wrapping — `hmUI.createWidget()` handles device scaling via `designWidth: 480`.

### Phase 1 (what zepp-breathe needs)

```js
import hmUI from '@zos/ui';
import { COLOR, TYPOGRAPHY, RADIUS } from './tokens.js';
import { ZONE } from './zones.js';
import { Column } from './column.js';

// bg() — OLED black fill. Always call first in build().
export function bg() {
  hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 0, y: 0, w: 480, h: 480, color: COLOR.BG,
  });
}

// title(text) — page heading in TITLE zone, centered
// Max ~12 chars at subheadline (28px) size within 240-unit width.
export function title(text) {
  const z = ZONE.TITLE;
  return hmUI.createWidget(hmUI.widget.TEXT, {
    x: z.x, y: z.y, w: z.w, h: z.h,
    text,
    text_size: TYPOGRAPHY.subheadline,
    color: COLOR.TEXT,
    align_h: hmUI.align.CENTER_H,
  });
}

// column(zone) — returns Column helper, defaults to ZONE.MAIN
export function column(zone = ZONE.MAIN) {
  return new Column(zone);
}

// actionButton(text, { onPress }) — primary pill in ACTION zone
export function actionButton(text, { onPress } = {}) {
  const z = ZONE.ACTION;
  return hmUI.createWidget(hmUI.widget.BUTTON, {
    x: z.x, y: z.y, w: z.w, h: z.h,
    radius: RADIUS.pill,
    normal_color: COLOR.SECONDARY,
    press_color: COLOR.SECONDARY_PRESSED,
    text,
    text_size: TYPOGRAPHY.subheadline,
    color: COLOR.TEXT,
    click_func: onPress,
  });
}

// heroText(text, { y, color }) — large centered number at a specific y position
// Uses MAIN zone x/w for horizontal bounds.
export function heroText(text, { y, color = COLOR.TEXT } = {}) {
  return hmUI.createWidget(hmUI.widget.TEXT, {
    x: ZONE.MAIN.x, y, w: ZONE.MAIN.w, h: 60,
    text: String(text),
    text_size: TYPOGRAPHY.largeTitle,
    color,
    align_h: hmUI.align.CENTER_H,
  });
}

// statCard({ y, w, h, title, value, valueColor }) — metric display card
// Returns array of all 3 widgets [bg, value, label] for lifecycle management.
export function statCard({ y, w = 320, h = 80, title: cardTitle, value, valueColor = COLOR.TEXT } = {}) {
  const x = Math.round((480 - w) / 2); // center on canvas
  const widgets = [];
  widgets.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x, y, w, h,
    radius: RADIUS.card, color: COLOR.SURFACE,
  }));
  widgets.push(hmUI.createWidget(hmUI.widget.TEXT, {
    x, y: y + 10, w, h: 40,
    text: String(value),
    text_size: TYPOGRAPHY.title,
    color: valueColor,
    align_h: hmUI.align.CENTER_H,
  }));
  widgets.push(hmUI.createWidget(hmUI.widget.TEXT, {
    x, y: y + h - 30, w, h: 24,
    text: String(cardTitle),
    text_size: TYPOGRAPHY.caption,
    color: COLOR.TEXT_MUTED,
    align_h: hmUI.align.CENTER_H,
  }));
  return widgets;
}
```

### Phase 2 (designed, built when needed)

- `UI.progressArc({ percent, color, lineWidth })` — circular ring progress
- `UI.heatmapCell({ x, y, practiced, isToday })` — single heatmap cell
- `UI.badge(text, { x, y })` — small pill label
- `UI.iconButton({ x, y, icon, onPress })` — circular tap target

---

## Main Export — `index.js`

```js
import { COLOR, TYPOGRAPHY, RADIUS, SPACING } from './src/tokens.js';
import { ZONE } from './src/zones.js';
import { Column } from './src/column.js';
import { bg, title, column, actionButton, heroText, statCard } from './src/components.js';

// Namespace import: import { UI } from '@bug-breeder/zeroui'
export const UI = { bg, title, column, actionButton, heroText, statCard, ZONE, COLOR, TYPOGRAPHY, RADIUS, SPACING };

// Named exports: import { bg, ZONE, COLOR } from '@bug-breeder/zeroui'
export { COLOR, TYPOGRAPHY, RADIUS, SPACING, ZONE, Column, bg, title, column, actionButton, heroText, statCard };
```

---

## Migration: zepp-breathe

| File | Change |
|------|--------|
| `pages/setup/index.js` | Full rewrite: `UI.title()` + `Column` with `.chip()`/`.chipRow()` + `UI.actionButton()` replaces manual widget loop |
| `pages/home/index.js` | Add `UI.bg()` (currently has no background FILL_RECT); add `UI.title()`; keep existing BUTTONs (custom layout) |
| `pages/stats/index.js` | Add `UI.bg()`; add `UI.title()`; add `UI.statCard()` for streak display; heatmap grid stays raw hmUI |
| `pages/session/index.js` | **No change** — custom animated screen with ARC rings, raw hmUI is correct |
| `utils/constants.js` | Strip COLOR + TYPOGRAPHY (now from ZeRoUI); keep DEVICE_WIDTH + app-specific colors (ring glow, heatmap today-green) |
| `package.json` | Add `@bug-breeder/zeroui` dependency |

---

## What Does NOT Change

- `utils/storage.js` — app-specific, not UI
- `utils/date.js` — app-specific, not UI
- `utils/techniques.js` — app-specific, not UI
- `app.json` — no new pages or permissions
- `app.js` — no changes
- `app-service/index.js` — no UI

---

## Error Handling Policy

ZeRoUI follows the same contract as raw `hmUI`: widget creation may return `null` (ZeppOS gotcha #1). **Null-checking widget returns is the consumer's responsibility**, same as when calling `hmUI.createWidget()` directly. The `Column._create()` method does filter null from its tracked widgets list to prevent `deleteWidget(null)` errors in `destroyAll()`.

---

## Verification

After implementation:

- `npm run verify` passes in zepp-breathe
- `npm link @bug-breeder/zeroui` (or `file:` dependency) works from zepp-breathe with `zeus build`
- Setup page renders with chip components, section labels centered, nothing clipped by round bezel
- Home and stats pages render with UI library primitives
- Session page is unchanged (still works with raw hmUI)
- All pages display correctly at 480×480 in the simulator
- No string `zeppos-zui` appears anywhere in either repo
