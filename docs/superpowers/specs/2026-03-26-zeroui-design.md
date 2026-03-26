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
| Multi-device scaling | Design in 480-unit coords, `px()` at runtime | ZeppOS standard; works on 454, 466, 480px devices without code changes |
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
    ├── column.js         Column class (auto y-tracking)
    └── components.js     bg, title, actionButton, statCard, heroText
```

**No runtime dependencies.** ZeppOS platform APIs (`@zos/ui`, `@zos/utils`) are ambient — provided by the watch runtime, not bundled.

**Two import styles:**

```js
// Namespace (clean call sites)
import { UI } from '@bug-breeder/zeroui';
UI.bg();
UI.title('Setup');

// Named (tree-shakeable, for advanced use or tokens only)
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
  chipGap:     8,   // between stacked chips in a Column
  sectionGap:  16,  // after last chip before next section label
};
```

---

## Zone System — `src/zones.js`

A round display clips content near its top/bottom edges because the circle's chord width narrows. Rather than wasting the top and bottom, ZeRoUI defines three progressively-wider safe zones.

### Zone Geometry (480-unit design canvas, radius R=240)

```
TITLE zone — narrow centered strip at top
  x=120, y=40, w=240, h=44
  At y=40: chord width = 2√(240²−200²) ≈ 265px > 240 ✓

MAIN zone — inscribed safe rectangle
  x=80, y=84, w=320, h=284
  All 4 corners fit inside circle (max dist from center ≈ 226 < 240) ✓

ACTION zone — narrow centered strip at bottom (symmetric to TITLE)
  x=140, y=380, w=200, h=52
  At y=432 (bottom edge): chord width ≈ 265px > 200 ✓
```

### Implementation

```js
import { px } from '@zos/utils';

const DESIGN = {
  TITLE:  { x: 120, y: 40,  w: 240, h: 44  },
  MAIN:   { x: 80,  y: 84,  w: 320, h: 284 },
  ACTION: { x: 140, y: 380, w: 200, h: 52  },
};

function scaled(z) {
  return { x: px(z.x), y: px(z.y), w: px(z.w), h: px(z.h) };
}

export const ZONE = {
  TITLE:  scaled(DESIGN.TITLE),
  MAIN:   scaled(DESIGN.MAIN),
  ACTION: scaled(DESIGN.ACTION),
};
```

**Multi-device:** `px()` converts from the 480-unit design canvas to actual device pixels at runtime. A GTR 4 (466×466) and a GTR 3 Pro (480×480) both get correctly proportioned zones with zero code changes.

**Escape hatch:** Pages that need custom layouts (e.g., session page breathing rings) skip zones entirely and use raw `hmUI` with `px()` directly. ZeRoUI never forces all widgets through its system.

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
col.spacer(SPACING.sectionGap);         // adds gap without rendering
col.currentY;                           // escape hatch: read current y position
```

### Implementation

```js
import hmUI from '@zos/ui';
import { px } from '@zos/utils';
import { COLOR, TYPOGRAPHY, RADIUS, SPACING } from './tokens.js';

export class Column {
  constructor(zone) {
    this.x = zone.x;
    this.w = zone.w;
    this.y = zone.y;
  }

  // Reserve h pixels, return y where the item should draw
  _slot(h, gapAfter = 0) {
    const y = this.y;
    this.y += h + px(gapAfter);
    return y;
  }

  sectionLabel(text) {
    const h = px(32);
    const y = this._slot(h, SPACING.sm);
    return hmUI.createWidget(hmUI.widget.TEXT, {
      x: this.x, y, w: this.w, h,
      text,
      text_size: px(TYPOGRAPHY.caption),
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });
  }

  chip(text, { selected = false, onPress } = {}) {
    const h = px(48);
    const y = this._slot(h, SPACING.chipGap);
    return hmUI.createWidget(hmUI.widget.BUTTON, {
      x: this.x, y, w: this.w, h,
      radius: px(RADIUS.chip),
      normal_color: selected ? COLOR.PRIMARY_TINT : COLOR.SURFACE,
      press_color:  selected ? COLOR.PRIMARY_TINT : COLOR.SURFACE_PRESSED,
      text,
      text_size: px(TYPOGRAPHY.subheadline),
      color: selected ? COLOR.PRIMARY : COLOR.TEXT,
      click_func: onPress,
    });
  }

  chipRow(options, { selected, onPress } = {}) {
    const count = options.length;
    const gap = px(SPACING.sm);
    const chipW = Math.floor((this.w - gap * (count - 1)) / count);
    const h = px(48);
    const y = this._slot(h, SPACING.chipGap);
    return options.map((opt, i) => {
      const isSel = String(opt) === String(selected);
      return hmUI.createWidget(hmUI.widget.BUTTON, {
        x: this.x + i * (chipW + gap), y,
        w: chipW, h,
        radius: px(RADIUS.pill),
        normal_color: isSel ? COLOR.PRIMARY_TINT : COLOR.SURFACE,
        press_color:  COLOR.SURFACE_PRESSED,
        text: String(opt),
        text_size: px(TYPOGRAPHY.subheadline),
        color: isSel ? COLOR.PRIMARY : COLOR.TEXT,
        click_func: () => onPress && onPress(opt),
      });
    });
  }

  spacer(n) { this.y += px(n); }

  get currentY() { return this.y; }
}
```

---

## Components — `src/components.js`

### Phase 1 (what zepp-breathe needs)

```js
// bg() — OLED black fill. Always call first in build().
export function bg() {
  hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 0, y: 0, w: px(480), h: px(480), color: COLOR.BG,
  });
}

// title(text) — page heading in TITLE zone, centered
export function title(text) {
  const z = ZONE.TITLE;
  return hmUI.createWidget(hmUI.widget.TEXT, {
    x: z.x, y: z.y, w: z.w, h: z.h,
    text,
    text_size: px(TYPOGRAPHY.subheadline),
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
    radius: px(RADIUS.pill),
    normal_color: COLOR.SECONDARY,
    press_color: COLOR.SECONDARY_PRESSED,
    text,
    text_size: px(TYPOGRAPHY.subheadline),
    color: COLOR.TEXT,
    click_func: onPress,
  });
}

// heroText(text, { y, color }) — large centered number at free y position
export function heroText(text, { y, color = COLOR.TEXT } = {}) {
  return hmUI.createWidget(hmUI.widget.TEXT, {
    x: ZONE.MAIN.x, y: px(y), w: ZONE.MAIN.w, h: px(60),
    text: String(text),
    text_size: px(TYPOGRAPHY.largeTitle),
    color,
    align_h: hmUI.align.CENTER_H,
  });
}

// statCard({ y, w, h, title, value, valueColor }) — metric display card
export function statCard({ y, w = 320, h = 80, title: cardTitle, value, valueColor = COLOR.TEXT } = {}) {
  const x = px(Math.round((480 - w) / 2)); // center on canvas
  const yw = px(y);
  hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x, y: yw, w: px(w), h: px(h),
    radius: px(RADIUS.card), color: COLOR.SURFACE,
  });
  hmUI.createWidget(hmUI.widget.TEXT, {
    x, y: px(y + 10), w: px(w), h: px(40),
    text: String(value),
    text_size: px(TYPOGRAPHY.title),
    color: valueColor,
    align_h: hmUI.align.CENTER_H,
  });
  return hmUI.createWidget(hmUI.widget.TEXT, {
    x, y: px(y + h - 30), w: px(w), h: px(24),
    text: String(cardTitle),
    text_size: px(TYPOGRAPHY.caption),
    color: COLOR.TEXT_MUTED,
    align_h: hmUI.align.CENTER_H,
  });
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

// Named exports for tree-shaking: import { bg, ZONE, COLOR } from '@bug-breeder/zeroui'
export { COLOR, TYPOGRAPHY, RADIUS, SPACING, ZONE, Column, bg, title, column, actionButton, heroText, statCard };
```

---

## Migration: zepp-breathe

| File | Change |
|------|--------|
| `pages/setup/index.js` | Full rewrite: `UI.title()` + `Column` with `.chip()`/`.chipRow()` + `UI.actionButton()` replaces manual widget loop |
| `pages/home/index.js` | Replace background + title with `UI.bg()` + `UI.title()`; keep existing BUTTONs (custom layout) |
| `pages/stats/index.js` | `UI.bg()` + `UI.title()` + `UI.statCard()` for streak display; heatmap grid stays raw hmUI |
| `pages/session/index.js` | **No change** — custom animated screen with ARC rings, raw hmUI is correct |
| `utils/constants.js` | Strip COLOR + TYPOGRAPHY (now from ZeRoUI); keep DEVICE_WIDTH + app-specific SESSION colors |
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

## Verification

After implementation:

- `npm run verify` passes in both ZeRoUI and zepp-breathe
- `npm link @bug-breeder/zeroui` works from zepp-breathe
- Setup page renders with chip components, section labels centered, nothing clipped by round bezel
- Home and stats pages render with UI library primitives
- Session page is unchanged (still works with raw hmUI)
- All pages display correctly at 480×480 in the simulator
- No string `zeppos-zui` appears anywhere in either repo
