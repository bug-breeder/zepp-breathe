# UI Redesign — Implementation Spec

**Date:** 2026-04-01
**Repos:** `zepp-meditation` (pages) · `ZeRoUI` (`/Users/alanguyen/Code/Others/ZeRoUI/`)

---

## Goal

Redesign all four app screens and update ZeRoUI's design tokens to be finger-safe on 1.32–1.5" round OLED ZeppOS watches. Fix typography (current sizes are ~2mm on glass — unreadable at a glance), button tap targets (current chip height 2.7mm — too small for a finger), and page layouts (wasted space, wide buttons that look phone-like on a round screen).

---

## Physical Screen Context

Target devices: **Amazfit Balance** (1.5", 480×480, ~453 PPI) and **Amazfit GTR Mini** (1.32", 466×466, ~500 PPI).

With `designWidth: 480` in `app.json`, 1 design unit ≈ 0.056mm on 1.5" / 0.052mm on 1.32". Minimum comfortable tap target is 7mm → **~125–135 design units** minimum for interactive elements.

All new dimensions follow a **12-unit design grid** (12, 24, 36, 48, 60, 72, 96, 120, 132…) applied to ZeppOS design units.

---

## Part 1 — ZeRoUI Token Changes

### 1a. `src/tokens.js` — TYPOGRAPHY

Replace the existing `TYPOGRAPHY` object:

```js
/**
 * ZeRoUI design tokens — calibrated for 1.32–1.5" round OLED ZeppOS watches.
 * Target: Amazfit Balance (1.5", 480×480, 453 PPI) and GTR Mini (1.32", 466×466, 500 PPI).
 * Design grid: 12-unit base (12, 24, 36, 48, 60, 72, 96, 120, 132…).
 * All values are ZeppOS design units (designWidth: 480 in app.json).
 * Physical sizes at 453 PPI (1.5"): caption(36)≈2mm · subheadline(48)≈2.7mm
 *   body(60)≈3.4mm · title(72)≈4mm · largeTitle(96)≈5.4mm · hero(120)≈6.7mm
 */
export const TYPOGRAPHY = {
  hero:         120,  // was 60 — immersive full-screen numbers (session page)
  largeTitle:    96,  // was 60 — page title ("Breathe" label)
  title:         72,  // was 44 — prominent numbers (home streak, stats streak)
  body:          60,  // was 40 — technique chip labels
  subheadline:   48,  // was 34 — "day streak", round numbers
  caption:       36,  // was 30 — section labels ("Technique", "Rounds"), DOW headers
};
```

### 1b. `src/tokens.js` — SPACING

Replace the existing `SPACING` object (align to 12-unit grid):

```js
export const SPACING = {
  xs:          6,   // was 4
  sm:         12,   // was 8
  md:         24,   // was 16
  lg:         36,   // was 24
  xl:         48,   // was 32
  chipGap:     6,   // was 4 — gap between stacked chips
  sectionGap: 24,   // was 8 — gap between sections (Technique → Rounds)
};
```

---

## Part 2 — ZeRoUI API Changes

### 2a. `src/column.js` — `chip()` — add `radius` and `h` options

Current signature: `chip(text, { selected, onPress, variant } = {})`

New signature: `chip(text, { selected, onPress, variant, radius, h } = {})`

- `radius` — overrides `RADIUS.chip` (12). Pass `RADIUS.pill` (999) for pill-shaped action buttons.
- `h` — overrides the default chip height. Default 120. Use 132 for large technique chips, 96 for compact chips.

```js
chip(text, { selected = false, onPress, variant = 'default', radius = RADIUS.chip, h = 120 } = {}) {
  const y = this._slot(h, SPACING.chipGap);
  const { normalColor, pressColor, textColor } = this._chipColors(variant, selected);
  return this._create(hmUI.widget.BUTTON, {
    x: this.x, y, w: this.w, h,
    radius,
    normal_color: normalColor,
    press_color: pressColor,
    text,
    text_size: TYPOGRAPHY.body,
    color: textColor,
    click_func: onPress,
  });
}
```

### 2b. `src/column.js` — `chipRow()` — add `radius` and `h` options

Same additions. Default `h = 96`:

```js
chipRow(options, { selected, onPress, variant = 'default', radius = RADIUS.chip, h = 96 } = {}) {
  const count = options.length;
  const gap = SPACING.sm;
  const chipW = Math.floor((this.w - gap * (count - 1)) / count);
  const y = this._slot(h, SPACING.chipGap);
  return options.map((opt, i) => {
    const isSel = variant === 'default' && String(opt) === String(selected);
    const { normalColor, pressColor, textColor } = this._chipColors(variant, isSel);
    return this._create(hmUI.widget.BUTTON, {
      x: this.x + i * (chipW + gap), y, w: chipW, h,
      radius,
      normal_color: normalColor,
      press_color: pressColor,
      text: String(opt),
      text_size: TYPOGRAPHY.subheadline,
      color: textColor,
      click_func: () => onPress && onPress(opt),
    });
  });
}
```

### 2c. `src/chrome.js` — `actionButton()` — pill radius by default

Change `radius: RADIUS.chip` → `radius: RADIUS.pill`:

```js
export function actionButton(text, { onPress, variant = 'primary', layout = LAYOUT.FULL } = {}) {
  const z = layout.ACTION || LAYOUT.FULL.ACTION;
  const normalColor = variant === 'secondary' ? COLOR.SECONDARY : COLOR.PRIMARY;
  const pressColor  = variant === 'secondary' ? COLOR.SECONDARY_PRESSED : COLOR.PRIMARY_PRESSED;
  return hmUI.createWidget(hmUI.widget.BUTTON, {
    x: z.x, y: z.y, w: z.w, h: z.h,
    radius: RADIUS.pill,          // ← was RADIUS.chip
    normal_color: normalColor,
    press_color: pressColor,
    text,
    text_size: TYPOGRAPHY.subheadline,
    color: COLOR.TEXT,
    click_func: onPress,
  });
}
```

### 2d. `src/layout.js` — ACTION zone taller, MAIN zones adjusted

```js
export const LAYOUT = {
  // title + scrollable main + action button
  FULL: {
    TITLE:  { x: 120, y: 24,  w: 240, h: 48  },
    MAIN:   { x: 80,  y: 84,  w: 320, h: 288 },  // ends y=372
    ACTION: { x: 144, y: 384, w: 192, h: 72  },  // ends y=456; arc-safe: half-width 96 < chord 104 ✓
  },
  // no title — MAIN starts at y=60
  NO_TITLE: {
    MAIN:   { x: 80,  y: 60,  w: 320, h: 312 },  // ends y=372
    ACTION: { x: 144, y: 384, w: 192, h: 72  },
  },
  // no action button
  NO_ACTION: {
    TITLE:  { x: 120, y: 24,  w: 240, h: 48  },
    MAIN:   { x: 80,  y: 84,  w: 320, h: 336 },
  },
  // no chrome — full safe inscribed rect (home page, session page)
  MINIMAL: {
    MAIN:   { x: 80,  y: 60,  w: 320, h: 360 },  // y=60 to y=420
  },
};
```

---

## Part 3 — Page Redesigns (zepp-meditation)

### 3a. `pages/home/index.js` — Stats-hero layout

**Design:** Streak number hero at top arc, Start + Stats pills at bottom arc. No scrollable column.

Layout arithmetic (MINIMAL.MAIN y=60, h=360, max y=420):
- spacer(24) → y=84
- label() caption h=36+4+gap12=52 → y=136
- text(streak, 'title') h=72+4+gap12=88 → y=224
- text('day streak', 'subheadline') h=48+4+gap12=64 → y=288
- chip Start h=72+gap6=78 → y=366
- chip Stats h=48+gap6=54 → y=420 ✓ (exactly fills MAIN)

No spacer between streak text and buttons — the content fills the zone exactly.

```js
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import { LAYOUT, RADIUS, renderPage } from '@bug-breeder/zeroui';

let col = null;
let streakDays = 0;

Page({
  onInit() {
    col = null;
    streakDays = get(getKey('streak_days'), 0);
  },

  build() {
    renderPage({
      layout: LAYOUT.MINIMAL,
      scrollable: false,
      buildFn: (c) => {
        col = c;
        col.spacer(24);
        col.label('Breathe');
        col.text(String(streakDays), {
          size: 'title',
          color: streakDays > 0 ? 'warning' : 'muted',
        });
        col.text(streakDays === 1 ? 'day streak' : 'days streak', {
          size: 'subheadline',
          color: 'muted',
        });
        col.chip('Start', {
          variant: 'primary',
          radius: RADIUS.pill,
          h: 72,
          onPress: () => push({ url: 'pages/setup/index' }),
        });
        col.chip('Stats', {
          variant: 'ghost',
          radius: RADIUS.pill,
          h: 48,
          onPress: () => push({ url: 'pages/stats/index' }),
        });
      },
    });
  },

  onDestroy() {
    col?.destroyAll();
    col = null;
  },
});
```

### 3b. `pages/setup/index.js` — No title, larger chips, default rounds 5

**Use `LAYOUT.NO_TITLE`** (not MINIMAL — MINIMAL has no ACTION zone, so the Start button wouldn't render).

**Changes:**
- `layout: LAYOUT.NO_TITLE` (was `LAYOUT.FULL`) — removes title chrome, keeps pill action button at bottom
- Remove `title: 'Breathing Setup'`
- Technique chips: `h: 132, radius: RADIUS.chip` (rounded rect, 7.3mm on 1.5")
- Rounds chipRow: `h: 96, radius: RADIUS.chip` (rounded rect, 5.4mm)
- Start action button: rendered by `renderPage` via `action` param — uses ACTION zone (pill, 72px tall)
- Default `selectedRounds = 5` — already correct in `get(getKey('last_rounds'), 5)`

```js
// renderPage call — change layout, remove title:
renderPage({
  layout: LAYOUT.NO_TITLE,   // ← was LAYOUT.FULL
  scrollable: true,
  action: {
    text: 'Start',
    onPress: () => push({ url: 'pages/session/index', params: JSON.stringify({ technique: selectedTechnique, rounds: selectedRounds }) }),
  },
  buildFn: (c) => {
    col = c;
    rebuild();
  },
});

// rebuild() — update chip calls:
col.label('Technique');
TECHNIQUE_KEYS.forEach((key) => {
  col.chip(TECHNIQUE_NAMES[key], {
    h: 132,              // ← was default 48
    radius: RADIUS.chip, // ← rounded rect (explicit, for clarity)
    selected: selectedTechnique === key,
    onPress: () => { selectedTechnique = key; rebuild(); },
  });
});
col.spacer(SPACING.sectionGap);
col.label('Rounds');
col.chipRow(ROUNDS_OPTIONS, {
  h: 96,               // ← was default 48
  radius: RADIUS.chip,
  selected: selectedRounds,
  onPress: (v) => { selectedRounds = v; rebuild(); },
});
col.finalize();
```

### 3c. `pages/stats/index.js` — No title, streak + heatmap only

**Changes:**
- Use `LAYOUT.MINIMAL` (was `LAYOUT.NO_ACTION`) — removes "Your Journey" title
- Remove `title: 'Your Journey'`
- Remove `col.card(...)`, `col.text(getMotivationalMessage(...))`, `col.text(\`${totalSessions}...\`)`
- Streak rendered with `col.text(String(streakDays), { size: 'title' })` — NOT heroNumber (too large; title=72 fits)
- Heatmap cell size: 36px (12×3 grid) — larger than current 30px but fits in 320px column
  - Grid width: 7×36 + 6×6 = 252 + 36 = 288px (fits in 320px ✓)
- `buildHeatmap()` receives `startY` parameter instead of using hardcoded `GRID_TOP_Y`

**Updated constants:**
```js
const GRID_LEFT_X = 96;    // was 123 — center 288px grid in 480px: (480-288)/2 = 96
const CELL_SIZE   = 36;    // was 30
const CELL_STEP   = 42;    // was 34 (36 cell + 6 gap, on 12-unit grid)
```

**Updated `buildHeatmap(startY)`:**
```js
function buildHeatmap(startY) {
  const DOW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dowH = TYPOGRAPHY.caption;  // 36

  DOW_LABELS.forEach((label, c) => {
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: GRID_LEFT_X + c * CELL_STEP,
      y: startY,
      w: CELL_SIZE, h: dowH,
      text: label,
      text_size: TYPOGRAPHY.caption,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });
  });

  const gridY = startY + dowH + SPACING.xs;  // 36 + 6 = 42px below startY

  for (let row = 0; row < 4; row++) {
    for (let c = 0; c < 7; c++) {
      const daysAgo = (3 - row) * 7 + (todayDOW - c);
      // ... same color logic as before ...
      hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: GRID_LEFT_X + c * CELL_STEP,
        y: gridY + row * CELL_STEP,
        w: CELL_SIZE, h: CELL_SIZE,
        radius: 6,
        color,
      });
    }
  }
}
```

**Updated `build()`:**
```js
renderPage({
  layout: LAYOUT.MINIMAL,
  scrollable: true,
  buildFn: (c) => {
    col = c;
    col.spacer(24);
    col.text(String(streakDays), {
      size: 'title',
      color: streakDays > 0 ? 'warning' : 'muted',
    });
    col.text(streakDays === 1 ? 'day streak' : 'days streak', {
      size: 'subheadline',
      color: 'muted',
    });
    col.spacer(SPACING.md);  // 24px gap before heatmap

    const heatmapStartY = col.currentY;
    buildHeatmap(heatmapStartY);

    // Advance column past the heatmap:
    // DOW h=36 + gap 6 + 4 rows × CELL_STEP(42) = 42 + 168 = 210
    col.spacer(210);
    col.finalize();
  },
});
```

**Remove** from `build()`:
```js
// DELETE:
col.card({ title: ..., value: ..., valueColor: ... });
col.text(getMotivationalMessage(...), { ... });
col.text(`${totalSessions} sessions total`, { ... });
```

**Remove** from `onDestroy()` (no longer read):
```js
// DELETE:
totalSessions = 0;
sessionHistory = {};
```

Keep `sessionHistory` and `totalSessions` module-level vars but remove the onDestroy cleanup only for `sessionHistory` — it's still needed for heatmap rendering so keep the reset.

Actually keep all onDestroy resets as-is to prevent stale data between visits.

---

## Part 4 — Documentation Updates

### 4a. `zepp-meditation/.claude/rules/pages.md`

Add to the bottom:

```markdown
## Screen Physical Dimensions
- Target: Amazfit Balance (1.5", 480×480, 453 PPI) and GTR Mini (1.32", 466×466, 500 PPI)
- 1 design unit ≈ 0.052–0.056mm physical
- Minimum tap target: 125 design units (~7mm) for interactive elements
- Design grid: 12-unit base — use multiples of 12 for all heights and font sizes
- `RADIUS.pill` (999) for action buttons · `RADIUS.chip` (12) for selection chips
```

### 4b. Zepphyr ZeppOS skill

Update `/zepphyr:zeppos` to include the physical screen context and the 12-unit grid rule.

---

## Non-Goals

- Session page — no changes (circular ring animation already looks great)
- Adding new techniques or rounds options
- Theme toggle, accessibility settings, animation changes
