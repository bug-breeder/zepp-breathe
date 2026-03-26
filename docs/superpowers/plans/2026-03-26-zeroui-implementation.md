# ZeRoUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ZeRoUI library (`@bug-breeder/zeroui`) and migrate zepp-breathe's 4 pages to use it, making the UI consistent and beautiful with Wear OS-inspired chips, round-display safe zones, and automatic y-tracking.

**Architecture:** Two repos — ZeRoUI (new npm library: tokens + zones + Column + components) and zepp-breathe (existing app: migrate pages to import from ZeRoUI). Library uses raw `hmUI.createWidget()` with 480-unit design coords. Column tracks widgets for lifecycle. No `px()` — ZeppOS scales via `designWidth: 480` automatically.

**Tech Stack:** ZeppOS 3.6+ (QuickJS ES2020), `hmUI` widget API, Zeus CLI (build), npm link (local dev)

**Spec:** `docs/superpowers/specs/2026-03-26-zeroui-design.md`

---

## Files Changed

### ZeRoUI repo (all new — `~/Code/Others/ZeRoUI/`)

| File                | Responsibility                                      |
| ------------------- | --------------------------------------------------- |
| `package.json`      | npm metadata, `@bug-breeder/zeroui`                 |
| `index.js`          | Re-exports UI namespace + named exports             |
| `src/tokens.js`     | COLOR, TYPOGRAPHY, RADIUS, SPACING constants        |
| `src/zones.js`      | ZONE.TITLE / ZONE.MAIN / ZONE.ACTION safe areas     |
| `src/column.js`     | Column class — auto y-tracking + widget lifecycle   |
| `src/components.js` | bg, title, column, actionButton, heroText, statCard |

### zepp-breathe repo (`~/Code/Others/zepp-meditation/`)

| File                     | Change                                                                     |
| ------------------------ | -------------------------------------------------------------------------- |
| `package.json`           | Add `@bug-breeder/zeroui` dependency                                       |
| `pages/setup/index.js`   | Full rewrite — Column + chips + actionButton                               |
| `pages/home/index.js`    | Add `UI.bg()`, replace magic hex with ZeRoUI tokens                        |
| `pages/stats/index.js`   | Add `UI.bg()` + `UI.title()`, replace magic hex with ZeRoUI tokens         |
| `pages/session/index.js` | Import COLOR/TYPOGRAPHY from ZeRoUI instead of constants                   |
| `utils/constants.js`     | Strip COLOR/TYPOGRAPHY (now in ZeRoUI); keep DEVICE_WIDTH + SESSION colors |

---

## Setup: GitHub auth

Both repos are under `bug-breeder`. If any `gh` or `git push` command fails with 403:

```bash
unset GITHUB_TOKEN
gh auth switch --user bug-breeder
```

---

## Task 1: Create ZeRoUI repository with all source files

**Files:**

- Create: `~/Code/Others/ZeRoUI/package.json`
- Create: `~/Code/Others/ZeRoUI/src/tokens.js`
- Create: `~/Code/Others/ZeRoUI/src/zones.js`
- Create: `~/Code/Others/ZeRoUI/src/column.js`
- Create: `~/Code/Others/ZeRoUI/src/components.js`
- Create: `~/Code/Others/ZeRoUI/index.js`

- [ ] **Step 1: Create repo directory and initialize**

```bash
mkdir -p ~/Code/Others/ZeRoUI/src
cd ~/Code/Others/ZeRoUI
git init
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "@bug-breeder/zeroui",
  "version": "0.1.0",
  "description": "ZeRoUI — ZeppOS Rounded UI library with safe zones, chips, and layout helpers for round OLED watches",
  "main": "index.js",
  "files": ["index.js", "src/"],
  "keywords": ["zeppos", "zepp", "watch", "ui", "round", "oled"],
  "license": "MIT"
}
```

- [ ] **Step 4: Create `src/tokens.js`**

```js
/**
 * ZeRoUI design tokens.
 * All values are raw numbers — no px() wrapping needed.
 * hmUI.createWidget() accepts 480-unit design coords;
 * ZeppOS scales to device pixels via designWidth in app.json.
 */

export const COLOR = {
  // Backgrounds
  BG: 0x000000, // OLED black
  SURFACE: 0x1c1c1e, // chip / card background (unselected)
  SURFACE_PRESSED: 0x2c2c2e, // pressed surface
  SURFACE_BORDER: 0x2c2c2e, // chip outline (unselected)

  // Primary (green — selected state, progress)
  PRIMARY: 0x30d158,
  PRIMARY_TINT: 0x0c2415, // dark green bg for selected chip
  PRIMARY_PRESSED: 0x25a244, // pressed selected chip

  // Secondary (blue — action buttons)
  SECONDARY: 0x007aff,
  SECONDARY_PRESSED: 0x0051d5,

  // Semantic
  DANGER: 0xfa5151,
  SUCCESS: 0x34c759,
  WARNING: 0xff9f0a,

  // Text
  TEXT: 0xffffff,
  TEXT_MUTED: 0x8e8e93,
  TEXT_DISABLED: 0x3a3a3c,
};

export const TYPOGRAPHY = {
  largeTitle: 48, // hero numbers
  title: 36, // section titles
  body: 32, // body text
  subheadline: 28, // chips, buttons
  caption: 24, // section labels, hints (minimum legible)
};

export const RADIUS = {
  pill: 999, // fully rounded ends (chipRow items, action button)
  chip: 12, // standard chip corner
  card: 12, // stat cards, surfaces
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  chipGap: 6, // between stacked chips
  sectionGap: 12, // after last chip before next section label
};
```

- [ ] **Step 5: Create `src/zones.js`**

```js
/**
 * Round-display safe zones for 480×480 design canvas.
 *
 * A round display clips content near the top/bottom edges.
 * Three zones of progressively different widths ensure all
 * content stays visible inside the circle (radius 240).
 *
 * All values in 480-unit design coords — no px() needed.
 */

export const ZONE = {
  // Narrow strip at top — page titles (max ~12 chars at subheadline)
  // At y=40: chord width ≈ 265 > 240 ✓
  TITLE: { x: 120, y: 40, w: 240, h: 44 },

  // Main content area — inscribed safe rectangle
  // All 4 corners inside circle (max dist from center ≈ 224 < 240) ✓
  MAIN: { x: 80, y: 84, w: 320, h: 300 },

  // Narrow strip at bottom — primary action button
  // At y=440 (bottom edge): chord width ≈ 265 > 200 ✓
  ACTION: { x: 140, y: 392, w: 200, h: 48 },
};
```

- [ ] **Step 6: Create `src/column.js`**

```js
/**
 * Column layout helper — auto y-tracking with widget lifecycle.
 *
 * Pre-calculates positions from known heights (token constants).
 * Never reads rendered widget dimensions — avoids zeppos-zui's
 * fatal layout bug where children were always at y=0.
 */

import hmUI from '@zos/ui';
import { COLOR, TYPOGRAPHY, RADIUS, SPACING } from './tokens.js';

export class Column {
  constructor(zone) {
    this.x = zone.x;
    this.w = zone.w;
    this.y = zone.y;
    this._startY = zone.y;
    this._widgets = [];
  }

  // Reserve h design-units, return y where the item should draw
  _slot(h, gapAfter = 0) {
    const y = this.y;
    this.y += h + gapAfter;
    return y;
  }

  // Create widget and track it for destroyAll()
  _create(type, props) {
    const w = hmUI.createWidget(type, props);
    if (w) this._widgets.push(w);
    return w;
  }

  // Delete all widgets created by this Column, reset y to start
  destroyAll() {
    this._widgets.forEach((w) => hmUI.deleteWidget(w));
    this._widgets = [];
    this.y = this._startY;
  }

  sectionLabel(text) {
    const h = 28;
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
    const h = 44;
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
    const h = 44;
    const y = this._slot(h, SPACING.chipGap);
    return options.map((opt, i) => {
      const isSel = String(opt) === String(selected);
      return this._create(hmUI.widget.BUTTON, {
        x: this.x + i * (chipW + gap),
        y,
        w: chipW,
        h,
        radius: RADIUS.pill,
        normal_color: isSel ? COLOR.PRIMARY_TINT : COLOR.SURFACE,
        press_color: COLOR.SURFACE_PRESSED,
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

- [ ] **Step 7: Create `src/components.js`**

```js
/**
 * ZeRoUI components — thin wrappers around hmUI.createWidget().
 * All coordinates in 480-unit design canvas. No px() needed.
 */

import hmUI from '@zos/ui';
import { COLOR, TYPOGRAPHY, RADIUS } from './tokens.js';
import { ZONE } from './zones.js';
import { Column } from './column.js';

// OLED black background — always call first in build()
export function bg() {
  hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 0,
    y: 0,
    w: 480,
    h: 480,
    color: COLOR.BG,
  });
}

// Page title in TITLE zone, centered
export function title(text) {
  const z = ZONE.TITLE;
  return hmUI.createWidget(hmUI.widget.TEXT, {
    x: z.x,
    y: z.y,
    w: z.w,
    h: z.h,
    text,
    text_size: TYPOGRAPHY.subheadline,
    color: COLOR.TEXT,
    align_h: hmUI.align.CENTER_H,
  });
}

// Column layout helper, defaults to MAIN zone
export function column(zone = ZONE.MAIN) {
  return new Column(zone);
}

// Primary pill button in ACTION zone
export function actionButton(text, { onPress } = {}) {
  const z = ZONE.ACTION;
  return hmUI.createWidget(hmUI.widget.BUTTON, {
    x: z.x,
    y: z.y,
    w: z.w,
    h: z.h,
    radius: RADIUS.pill,
    normal_color: COLOR.SECONDARY,
    press_color: COLOR.SECONDARY_PRESSED,
    text,
    text_size: TYPOGRAPHY.subheadline,
    color: COLOR.TEXT,
    click_func: onPress,
  });
}

// Large centered number at a specific y position
export function heroText(text, { y, color = COLOR.TEXT } = {}) {
  return hmUI.createWidget(hmUI.widget.TEXT, {
    x: ZONE.MAIN.x,
    y,
    w: ZONE.MAIN.w,
    h: 60,
    text: String(text),
    text_size: TYPOGRAPHY.largeTitle,
    color,
    align_h: hmUI.align.CENTER_H,
  });
}

// Metric display card — returns array of all widgets [bg, value, label]
export function statCard({
  y,
  w = 320,
  h = 80,
  title: cardTitle,
  value,
  valueColor = COLOR.TEXT,
} = {}) {
  const x = Math.round((480 - w) / 2);
  const widgets = [];
  widgets.push(
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x,
      y,
      w,
      h,
      radius: RADIUS.card,
      color: COLOR.SURFACE,
    })
  );
  widgets.push(
    hmUI.createWidget(hmUI.widget.TEXT, {
      x,
      y: y + 10,
      w,
      h: 40,
      text: String(value),
      text_size: TYPOGRAPHY.title,
      color: valueColor,
      align_h: hmUI.align.CENTER_H,
    })
  );
  widgets.push(
    hmUI.createWidget(hmUI.widget.TEXT, {
      x,
      y: y + h - 30,
      w,
      h: 24,
      text: String(cardTitle),
      text_size: TYPOGRAPHY.caption,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    })
  );
  return widgets;
}
```

- [ ] **Step 8: Create `index.js`**

```js
// ZeRoUI — ZeppOS Rounded UI
// import { UI } from '@bug-breeder/zeroui'        (namespace)
// import { bg, ZONE, COLOR } from '@bug-breeder/zeroui'  (named)

import { COLOR, TYPOGRAPHY, RADIUS, SPACING } from './src/tokens.js';
import { ZONE } from './src/zones.js';
import { Column } from './src/column.js';
import { bg, title, column, actionButton, heroText, statCard } from './src/components.js';

export const UI = {
  bg,
  title,
  column,
  actionButton,
  heroText,
  statCard,
  ZONE,
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
  Column,
  bg,
  title,
  column,
  actionButton,
  heroText,
  statCard,
};
```

- [ ] **Step 9: Commit**

```bash
cd ~/Code/Others/ZeRoUI
git add -A
git commit -m "feat: initial ZeRoUI library — tokens, zones, Column, components"
```

---

## Task 2: Link ZeRoUI into zepp-breathe and verify build

**Files:**

- Modify: `~/Code/Others/zepp-meditation/package.json`

- [ ] **Step 1: Register npm link in ZeRoUI**

```bash
cd ~/Code/Others/ZeRoUI
npm link
```

- [ ] **Step 2: Link into zepp-breathe**

```bash
cd ~/Code/Others/zepp-meditation
npm link @bug-breeder/zeroui
```

- [ ] **Step 3: Verify the link works with a smoke-test import**

Add a temporary import at the top of `pages/home/index.js`:

```js
import { UI } from '@bug-breeder/zeroui';
console.log('[smoke] ZeRoUI linked:', typeof UI.bg);
```

- [ ] **Step 4: Run zeus build**

```bash
npm run verify
```

Expected: lint + format + zeus build all pass, zero errors. If the import fails to resolve, try the `file:` dependency fallback:

```json
"dependencies": {
  "@bug-breeder/zeroui": "file:../ZeRoUI"
}
```

Then `npm install` and retry.

- [ ] **Step 5: Remove smoke-test import**

Remove the two temporary lines added in Step 3 from `pages/home/index.js`.

- [ ] **Step 6: Run verify again**

```bash
npm run verify
```

Expected: zero errors.

- [ ] **Step 7: Commit** (in zepp-breathe)

```bash
cd ~/Code/Others/zepp-meditation
git add package.json
git commit -m "chore: link @bug-breeder/zeroui dependency"
```

> If `package.json` wasn't modified (npm link doesn't always write to it), skip this commit.

---

## Task 3: Migrate setup page

The biggest change — full rewrite using ZeRoUI Column + chips.

**Files:**

- Modify: `~/Code/Others/zepp-meditation/pages/setup/index.js`

- [ ] **Step 1: Read the current setup page to understand it**

```bash
cat pages/setup/index.js
```

Note: 160 lines, manual widget loop with `buildSections()`, tracks widgets in `sectionWidgets[]`, calls `hmUI.deleteWidget()` on rebuild.

- [ ] **Step 2: Replace the entire file with ZeRoUI version**

```js
// pages/setup/index.js
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import { UI, SPACING } from '@bug-breeder/zeroui';
import {
  TECHNIQUE_NAMES,
  TECHNIQUE_KEYS,
  ROUNDS_OPTIONS,
  TECHNIQUES,
} from '../../utils/techniques';

// Module-level state — reset in onInit
let selectedTechnique = 'box';
let selectedRounds = 5;
let col = null;

function rebuild() {
  if (col) col.destroyAll();
  col = UI.column(UI.ZONE.MAIN);

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
    UI.bg();
    UI.title('Breathing Setup');
    rebuild();
    UI.actionButton('Start', {
      onPress: () => {
        push({
          url: 'pages/session/index',
          params: JSON.stringify({
            technique: selectedTechnique,
            rounds: selectedRounds,
          }),
        });
      },
    });
  },

  onDestroy() {
    col = null;
  },
});
```

- [ ] **Step 3: Run verify**

```bash
npm run verify
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add pages/setup/index.js
git commit -m "feat: rewrite setup page with ZeRoUI Column + chips"
```

---

## Task 4: Migrate home page

Minimal change — add `UI.bg()`, replace magic hex values with ZeRoUI color tokens.

**Files:**

- Modify: `~/Code/Others/zepp-meditation/pages/home/index.js`

- [ ] **Step 1: Update imports**

Keep the existing `import hmUI from '@zos/ui'` and `import { push } from '@zos/router'` lines unchanged.

Replace ONLY this line:

```js
import { COLOR, DEVICE_WIDTH } from '../../utils/constants';
```

With:

```js
import { UI, COLOR } from '@bug-breeder/zeroui';
```

> The `hmUI` import must stay — the home page still uses raw `hmUI.createWidget()` for its custom layout.

- [ ] **Step 2: Add `UI.bg()` as first line of `build()`**

Insert at the start of `build()`:

```js
UI.bg();
```

- [ ] **Step 3: Replace magic hex values with COLOR tokens**

Apply these replacements throughout the file:

| Before                                        | After                                                      |
| --------------------------------------------- | ---------------------------------------------------------- |
| `w: DEVICE_WIDTH`                             | `w: 480`                                                   |
| `color: 0xffffff`                             | `color: COLOR.TEXT`                                        |
| `color: streakDays > 0 ? 0xff9f0a : 0x8e8e93` | `color: streakDays > 0 ? COLOR.WARNING : COLOR.TEXT_MUTED` |
| `normal_color: 0x007aff`                      | `normal_color: COLOR.SECONDARY`                            |
| `normal_color: 0x1c1c1e`                      | `normal_color: COLOR.SURFACE`                              |
| `color: 0x8e8e93` (Stats button text)         | `color: COLOR.TEXT_MUTED`                                  |
| `press_color: COLOR.CARD_PRESSED`             | `press_color: COLOR.SURFACE_PRESSED`                       |

> Keep `color: 0x636366` as-is — it's a one-off darker gray not worth adding to the token set.

- [ ] **Step 4: Run verify**

```bash
npm run verify
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add pages/home/index.js
git commit -m "feat: migrate home page to ZeRoUI tokens + bg"
```

---

## Task 5: Migrate stats page

Add `UI.bg()` and `UI.title()`, replace magic hex with tokens. Heatmap stays raw hmUI.

**Files:**

- Modify: `~/Code/Others/zepp-meditation/pages/stats/index.js`

- [ ] **Step 1: Update imports**

Keep the existing `import hmUI from '@zos/ui'` line and all other imports unchanged — the stats page still uses raw `hmUI.createWidget()` for the heatmap.

Replace ONLY this line:

```js
import { COLOR } from '../../utils/constants';
```

With:

```js
import { UI, COLOR } from '@bug-breeder/zeroui';
```

- [ ] **Step 2: Add `UI.bg()` as first line of `build()`**

Insert at the start of `build()`:

```js
UI.bg();
```

- [ ] **Step 3: Replace the manual title widget with `UI.title()`**

Replace:

```js
// Title
hmUI.createWidget(hmUI.widget.TEXT, {
  x: 60,
  y: 60,
  w: 360,
  h: 36,
  text: 'Your Journey',
  text_size: 28,
  color: COLOR.TEXT_MUTED,
  align_h: hmUI.align.CENTER_H,
});
```

With:

```js
UI.title('Your Journey');
```

> This moves the title from y=60 to y=40 (TITLE zone). The heatmap at y=108 stays — the gap increases slightly, which is fine.

- [ ] **Step 4: Replace remaining magic hex values**

| Before                                                             | After                  |
| ------------------------------------------------------------------ | ---------------------- |
| `color: COLOR.CARD` (line 62 — future cells in heatmap)            | `color: COLOR.SURFACE` |
| `color: COLOR.CARD` (line 69 — non-practiced past days in heatmap) | `color: COLOR.SURFACE` |
| `color: 0xff9f0a` (streak number active)                           | `color: COLOR.WARNING` |

Both `COLOR.CARD` references in `buildHeatmap()` must be replaced — they will be `undefined` once constants.js is stripped and will render as black (invisible on OLED).

> Keep `0x636366`, `0x52d985`, `0x2c2c2e` as-is in the heatmap — these are app-specific visual choices.

- [ ] **Step 5: Run verify**

```bash
npm run verify
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add pages/stats/index.js
git commit -m "feat: migrate stats page to ZeRoUI tokens + bg + title"
```

---

## Task 6: Migrate session page imports + clean up constants.js

Session page gets minimal import change (no UI changes). Constants.js is stripped down to app-specific values only.

**Files:**

- Modify: `~/Code/Others/zepp-meditation/pages/session/index.js`
- Modify: `~/Code/Others/zepp-meditation/utils/constants.js`

- [ ] **Step 1: Update session page imports**

Replace:

```js
import { COLOR, DEVICE_WIDTH, TYPOGRAPHY } from '../../utils/constants';
```

With:

```js
import { COLOR, TYPOGRAPHY } from '@bug-breeder/zeroui';
import { DEVICE_WIDTH } from '../../utils/constants';
```

No other changes to session page. All widget code stays exactly the same — the token names and values are identical.

- [ ] **Step 2: Rewrite `utils/constants.js`**

Replace the entire file with:

```js
/**
 * App-specific constants for zepp-breathe.
 *
 * Design tokens (COLOR, TYPOGRAPHY, RADIUS, SPACING) now live in
 * @bug-breeder/zeroui. Import them from there:
 *   import { COLOR, TYPOGRAPHY } from '@bug-breeder/zeroui';
 *
 * This file keeps only values specific to this app.
 */

// Design canvas dimensions — matches app.json designWidth: 480.
// Used by session page for ring geometry calculations.
export const DEVICE_WIDTH = 480;
export const DEVICE_HEIGHT = 480;
```

- [ ] **Step 3: Verify no file still imports COLOR or TYPOGRAPHY from constants**

```bash
grep -rn "from '../../utils/constants'" pages/ --include="*.js"
```

Expected: only `DEVICE_WIDTH` or `DEVICE_HEIGHT` imports remain. Any line importing `COLOR` or `TYPOGRAPHY` from constants must be updated.

- [ ] **Step 4: Run verify**

```bash
npm run verify
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add pages/session/index.js utils/constants.js
git commit -m "chore: move tokens to ZeRoUI; strip constants.js to app-specific values"
```

---

## Task 7: Final verification and push

- [ ] **Step 1: Confirm no stale token imports from constants.js**

```bash
grep -rn "COLOR\|TYPOGRAPHY\|RADIUS\|SPACING" utils/constants.js
```

Expected: zero matches (those constants are gone).

```bash
grep -rn "from '../../utils/constants'" pages/ --include="*.js"
```

Expected: only `DEVICE_WIDTH` / `DEVICE_HEIGHT` imports.

- [ ] **Step 2: Confirm no stale `zeppos-zui` references**

```bash
grep -rn "zeppos-zui" . --include="*.js" --include="*.json" --include="*.md" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=docs
```

Expected: zero matches (zeppos-zui was never a dependency in zepp-breathe, but verify anyway).

- [ ] **Step 3: Confirm ZeRoUI imports are consistent**

```bash
grep -rn "@bug-breeder/zeroui" pages/ --include="*.js"
```

Expected: matches in `setup/index.js`, `home/index.js`, `stats/index.js`, `session/index.js`.

- [ ] **Step 4: Run full verify**

```bash
npm run verify
```

Expected: lint + format + zeus build, zero errors.

- [ ] **Step 5: Check commits**

```bash
git log --oneline -10
```

Expected: ~5 commits from this plan (link dep, setup, home, stats, session+constants).

- [ ] **Step 6: Push ZeRoUI to GitHub**

```bash
cd ~/Code/Others/ZeRoUI
unset GITHUB_TOKEN
gh auth switch --user bug-breeder
gh repo create ZeRoUI --public --source=. --push
```

Expected: repo created at `github.com/bug-breeder/ZeRoUI`.

- [ ] **Step 7: Push zepp-breathe to GitHub**

```bash
cd ~/Code/Others/zepp-meditation
git push origin main
```

Expected: `main -> main` push success.
