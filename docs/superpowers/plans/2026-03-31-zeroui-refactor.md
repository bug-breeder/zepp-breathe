# ZeRoUI v2 Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor ZeRoUI from a hardcoded toy into a proper component library with variants, accent theming, rich Column methods, and a clean `renderPage` API that eliminates boilerplate.

**Architecture:** Keep the imperative model (matches ZeppOS `hmUI.createWidget` API). Rewrite all four source files in the ZeRoUI package, then migrate all consumers in sequence. The local file dependency (`"@bug-breeder/zeroui": "file:../ZeRoUI"`) means consumer changes are validated immediately with `npm run verify`.

**Tech Stack:** ZeppOS QuickJS (ES2020 subset), `hmUI.createWidget`, `@zos/ui`, npm workspaces (local file dep)

---

## File Map

**ZeRoUI** (`/Users/alanguyen/Code/Others/ZeRoUI/`)
- Rewrite: `src/tokens.js` — add `PRIMARY_LIGHT`, `configure()`
- Create: `src/layout.js` — replaces `src/zones.js` (drop `ZONE`, rename `MAIN_ONLY` → `MINIMAL`)
- Delete: `src/zones.js`
- Rewrite: `src/column.js` — full Column with 12 methods
- Rewrite: `src/components.js` — fix `renderPage`, `title`, `actionButton`; remove `heroText`, `statCard`
- Rewrite: `index.js` — updated exports, bump version to `0.2.0`

**zepp-meditation** (`/Users/alanguyen/Code/Others/zepp-meditation/`)
- Rewrite: `pages/setup/index.js` — new `renderPage(col => ...)` pattern
- Rewrite: `pages/home/index.js` — migrate from raw `hmUI` to Column
- Rewrite: `pages/stats/index.js` — fix tokens, add col for stats section

**zepphyr** (`/Users/alanguyen/Code/Others/zepphyr/`)
- Rewrite: `skills/new-page/SKILL.md` — updated scaffold template
- Rewrite: `skills/zeroui/references/api.md` — full v2 API docs

**zeppos-app-template** (`/Users/alanguyen/Code/Others/zeppos-app-template/`)
- Rewrite: `pages/home/index.js` — updated golden example

---

## Task 1: Rewrite `src/tokens.js`

**Files:**
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/src/tokens.js`

- [ ] **Step 1: Write the file**

```js
/**
 * ZeRoUI design tokens.
 * All values are raw numbers — no px() wrapping needed.
 * hmUI.createWidget() accepts 480-unit design coords;
 * ZeppOS scales to device pixels via designWidth in app.json.
 */

const ACCENT_PRESETS = {
  green:  { primary: 0x30d158, primaryLight: 0x52d985, primaryTint: 0x0c2415, primaryPressed: 0x25a244 },
  blue:   { primary: 0x007aff, primaryLight: 0x4da3ff, primaryTint: 0x001f4d, primaryPressed: 0x0051d5 },
  red:    { primary: 0xfa5151, primaryLight: 0xfd8585, primaryTint: 0x3d0000, primaryPressed: 0xc73d3d },
  orange: { primary: 0xff9f0a, primaryLight: 0xffb84d, primaryTint: 0x3d2200, primaryPressed: 0xcc7a00 },
  purple: { primary: 0xbf5af2, primaryLight: 0xd28af5, primaryTint: 0x2d0060, primaryPressed: 0x9b3de0 },
};

export const COLOR = {
  // Backgrounds
  BG: 0x000000,
  SURFACE: 0x1c1c1e,
  SURFACE_PRESSED: 0x2c2c2e,
  SURFACE_BORDER: 0x2c2c2e,

  // Primary accent — mutable via configure()
  PRIMARY: 0x30d158,
  PRIMARY_LIGHT: 0x52d985,
  PRIMARY_TINT: 0x0c2415,
  PRIMARY_PRESSED: 0x25a244,

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
  largeTitle: 60,
  title: 44,
  body: 40,
  subheadline: 34,
  caption: 30,
};

export const RADIUS = {
  pill: 999,
  chip: 12,
  card: 12,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  chipGap: 4,
  sectionGap: 8,
};

/**
 * Configure accent colors for the app.
 * Call once in app.js before any pages render.
 * Mutates COLOR.PRIMARY* in place — all pages see the updated values.
 *
 * configure({ accent: 'blue' })
 * configure({ accent: { primary: 0x007aff, primaryLight: 0x4da3ff, primaryTint: 0x001f4d, primaryPressed: 0x0051d5 } })
 */
export function configure({ accent } = {}) {
  if (!accent) return;
  const preset = typeof accent === 'string' ? ACCENT_PRESETS[accent] : accent;
  if (!preset) return;
  if (preset.primary !== undefined) COLOR.PRIMARY = preset.primary;
  if (preset.primaryLight !== undefined) COLOR.PRIMARY_LIGHT = preset.primaryLight;
  if (preset.primaryTint !== undefined) COLOR.PRIMARY_TINT = preset.primaryTint;
  if (preset.primaryPressed !== undefined) COLOR.PRIMARY_PRESSED = preset.primaryPressed;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git add src/tokens.js
git commit -m "feat: add PRIMARY_LIGHT token and configure() accent theming"
```

---

## Task 2: Create `src/layout.js`, delete `src/zones.js`

**Files:**
- Create: `/Users/alanguyen/Code/Others/ZeRoUI/src/layout.js`
- Delete: `/Users/alanguyen/Code/Others/ZeRoUI/src/zones.js`

- [ ] **Step 1: Create `src/layout.js`**

```js
/**
 * Round-display layout modes for 480×480 design canvas.
 *
 * ZONE removed — use LAYOUT.FULL.* directly.
 * MAIN_ONLY renamed to MINIMAL.
 *
 * All values in 480-unit design coords — no px() needed.
 * Circle geometry: radius=240, center=(240,240).
 * All zone corners verified inside the circle.
 */

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
  MINIMAL: {
    MAIN:   { x: 80,  y: 62,  w: 320, h: 354 },
  },
};
```

- [ ] **Step 2: Delete `src/zones.js`**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
rm src/zones.js
```

- [ ] **Step 3: Commit**

```bash
git add src/layout.js
git add -u src/zones.js   # stage the deletion
git commit -m "feat: introduce LAYOUT.MINIMAL, drop ZONE legacy export"
```

---

## Task 3: Rewrite `src/column.js`

**Files:**
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/src/column.js`

- [ ] **Step 1: Write the file**

```js
/**
 * Column layout helper — auto y-tracking with widget lifecycle.
 *
 * Pre-calculates positions from known heights (token constants).
 * Never reads rendered widget dimensions — avoids zeppos-zui's
 * fatal layout bug where children were always at y=0.
 *
 * Scrollable mode (scrollable=true):
 *   const col = new Column(zone, { scrollable: true });
 *   col.label('Section');
 *   col.chip('Item', { onPress });
 *   col.finalize();              // required — sets VIEW_CONTAINER height
 *   // on rebuild:
 *   col.clearContent();          // wipe content, keep VIEW_CONTAINER z-order
 *   col.label('Section');
 *   col.finalize();
 *   // in onDestroy:
 *   col.destroyAll();            // full teardown
 */

import hmUI from '@zos/ui';
import { COLOR, TYPOGRAPHY, RADIUS, SPACING } from './tokens.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveTextColor(color) {
  if (typeof color === 'number') return color;
  switch (color) {
    case 'muted':    return COLOR.TEXT_MUTED;
    case 'disabled': return COLOR.TEXT_DISABLED;
    case 'primary':  return COLOR.PRIMARY;
    case 'danger':   return COLOR.DANGER;
    case 'warning':  return COLOR.WARNING;
    case 'success':  return COLOR.SUCCESS;
    default:         return COLOR.TEXT;
  }
}

function resolveAccentColor(color) {
  if (typeof color === 'number') return color;
  switch (color) {
    case 'secondary': return COLOR.SECONDARY;
    case 'danger':    return COLOR.DANGER;
    default:          return COLOR.PRIMARY;
  }
}

function resolveAlign(align) {
  if (align === 'left')  return hmUI.align.LEFT;
  if (align === 'right') return hmUI.align.RIGHT;
  return hmUI.align.CENTER_H;
}

// ─── Column ─────────────────────────────────────────────────────────────────

export class Column {
  constructor(zone, { scrollable = false } = {}) {
    this._zone = zone;
    this._container = null;

    if (scrollable) {
      this._container = hmUI.createWidget(hmUI.widget.VIEW_CONTAINER, {
        x: zone.x,
        y: zone.y,
        w: zone.w,
        h: zone.h,
        scroll_enable: 1,
      });
    }

    this.x = zone.x;
    this.y = zone.y;
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

  // Colors for chip/chipRow based on variant + selected state
  _chipColors(variant, selected) {
    switch (variant) {
      case 'primary':
        return { normalColor: COLOR.PRIMARY, pressColor: COLOR.PRIMARY_PRESSED, textColor: COLOR.TEXT };
      case 'secondary':
        return { normalColor: COLOR.SECONDARY, pressColor: COLOR.SECONDARY_PRESSED, textColor: COLOR.TEXT };
      case 'danger':
        return { normalColor: 0x3d0000, pressColor: 0xc73d3d, textColor: COLOR.DANGER };
      case 'ghost':
        return { normalColor: COLOR.BG, pressColor: COLOR.SURFACE, textColor: COLOR.TEXT_MUTED };
      default: // 'default' — selected state applies
        return selected
          ? { normalColor: COLOR.PRIMARY_TINT, pressColor: COLOR.PRIMARY_PRESSED, textColor: COLOR.PRIMARY }
          : { normalColor: COLOR.SURFACE, pressColor: COLOR.SURFACE_PRESSED, textColor: COLOR.TEXT };
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  // Destroy child widgets only — VIEW_CONTAINER stays alive.
  // Use inside rebuild() so VIEW_CONTAINER keeps its original z-order.
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
  // Must call after every rebuild when scrollable=true. No-op otherwise.
  finalize() {
    if (!this._container) return;
    const contentH = this.y - this._zone.y;
    this._container.setProperty(hmUI.prop.MORE, {
      h: Math.max(contentH, this._zone.h),
    });
  }

  get currentY() {
    return this.y;
  }

  // ── Text ──────────────────────────────────────────────────────────────────

  // Section header — small, muted. Replaces sectionLabel().
  label(text, { color = 'muted', align = 'center' } = {}) {
    const h = TYPOGRAPHY.caption + 4;
    const y = this._slot(h, SPACING.sm);
    return this._create(hmUI.widget.TEXT, {
      x: this.x, y, w: this.w, h,
      text,
      text_size: TYPOGRAPHY.caption,
      color: resolveTextColor(color),
      align_h: resolveAlign(align),
    });
  }

  // General body text. For multiline, pass explicit h.
  text(text, { size = 'body', color = 'default', align = 'center', wrap = false, h: explicitH } = {}) {
    const fontSize = TYPOGRAPHY[size] || TYPOGRAPHY.body;
    const slotH = explicitH !== undefined ? explicitH : fontSize + 4;
    const y = this._slot(slotH, SPACING.sm);
    return this._create(hmUI.widget.TEXT, {
      x: this.x, y, w: this.w, h: slotH,
      text: String(text),
      text_size: fontSize,
      color: resolveTextColor(color),
      align_h: resolveAlign(align),
    });
  }

  // Large centered number (or short text). Absorbed from standalone heroText().
  heroNumber(value, { color = 'default' } = {}) {
    const h = TYPOGRAPHY.largeTitle + 4;
    const y = this._slot(h, SPACING.sm);
    return this._create(hmUI.widget.TEXT, {
      x: this.x, y, w: this.w, h,
      text: String(value),
      text_size: TYPOGRAPHY.largeTitle,
      color: resolveTextColor(color),
      align_h: hmUI.align.CENTER_H,
    });
  }

  // ── Interactive ───────────────────────────────────────────────────────────

  // Full-width chip button.
  // variant: 'default'|'primary'|'secondary'|'danger'|'ghost'
  chip(text, { selected = false, onPress, variant = 'default' } = {}) {
    const h = 48;
    const y = this._slot(h, SPACING.chipGap);
    const { normalColor, pressColor, textColor } = this._chipColors(variant, selected);
    return this._create(hmUI.widget.BUTTON, {
      x: this.x, y, w: this.w, h,
      radius: RADIUS.chip,
      normal_color: normalColor,
      press_color: pressColor,
      text,
      text_size: TYPOGRAPHY.subheadline,
      color: textColor,
      click_func: onPress,
    });
  }

  // Row of N equal-width chips.
  // variant: 'default'|'primary'|'secondary'|'danger'|'ghost'
  chipRow(options, { selected, onPress, variant = 'default' } = {}) {
    const count = options.length;
    const gap = SPACING.sm;
    const chipW = Math.floor((this.w - gap * (count - 1)) / count);
    const h = 48;
    const y = this._slot(h, SPACING.chipGap);
    return options.map((opt, i) => {
      const isSel = variant === 'default' && String(opt) === String(selected);
      const { normalColor, pressColor, textColor } = this._chipColors(variant, isSel);
      return this._create(hmUI.widget.BUTTON, {
        x: this.x + i * (chipW + gap), y, w: chipW, h,
        radius: RADIUS.chip,
        normal_color: normalColor,
        press_color: pressColor,
        text: String(opt),
        text_size: TYPOGRAPHY.subheadline,
        color: textColor,
        click_func: () => onPress && onPress(opt),
      });
    });
  }

  // ── Display ───────────────────────────────────────────────────────────────

  // Metric card — SURFACE background with centered value + label.
  // Absorbed from standalone statCard(). valueColor accepts string alias or raw hex.
  card({ title: cardTitle, value, valueColor = 'default', h: cardH = 80 } = {}) {
    const y = this._slot(cardH, SPACING.chipGap);
    const resolvedValueColor = resolveTextColor(valueColor);
    const widgets = [];
    widgets.push(this._create(hmUI.widget.FILL_RECT, {
      x: this.x, y, w: this.w, h: cardH,
      radius: RADIUS.card, color: COLOR.SURFACE,
    }));
    widgets.push(this._create(hmUI.widget.TEXT, {
      x: this.x, y: y + 10, w: this.w, h: 40,
      text: String(value),
      text_size: TYPOGRAPHY.title,
      color: resolvedValueColor,
      align_h: hmUI.align.CENTER_H,
    }));
    widgets.push(this._create(hmUI.widget.TEXT, {
      x: this.x, y: y + cardH - 30, w: this.w, h: 24,
      text: String(cardTitle),
      text_size: TYPOGRAPHY.caption,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    }));
    return widgets;
  }

  // Horizontal progress bar. value: 0.0–1.0.
  // color: 'primary'|'secondary'|'danger' or raw hex.
  progressBar(value, { color = 'primary', h: barH = 8, radius: barRadius = 4 } = {}) {
    const totalH = barH + SPACING.sm * 2;
    const y = this._slot(totalH, 0);
    const barY = y + SPACING.sm;
    const resolvedColor = resolveAccentColor(color);
    const track = this._create(hmUI.widget.FILL_RECT, {
      x: this.x, y: barY, w: this.w, h: barH,
      radius: barRadius, color: COLOR.SURFACE,
    });
    const fillW = Math.round(this.w * Math.min(1, Math.max(0, value)));
    const fill = fillW > 0
      ? this._create(hmUI.widget.FILL_RECT, {
          x: this.x, y: barY, w: fillW, h: barH,
          radius: barRadius, color: resolvedColor,
        })
      : null;
    return [track, fill];
  }

  // Image widget, centered in column width.
  image(src, { w: imgW, h: imgH } = {}) {
    const w = imgW !== undefined ? imgW : this.w;
    const h = imgH !== undefined ? imgH : this.w;
    const x = this.x + Math.round((this.w - w) / 2);
    const y = this._slot(h, SPACING.sm);
    return this._create(hmUI.widget.IMG, { x, y, w, h, src });
  }

  // ── Structure ─────────────────────────────────────────────────────────────

  // Thin horizontal separator.
  divider({ color = 'surface', margin = SPACING.xs } = {}) {
    const h = 1;
    const totalH = h + margin * 2;
    const y = this._slot(totalH, 0);
    const resolved = color === 'surface' ? COLOR.SURFACE : resolveTextColor(color);
    return this._create(hmUI.widget.FILL_RECT, {
      x: this.x, y: y + margin, w: this.w, h,
      color: resolved,
    });
  }

  // Add vertical gap — no widget created.
  spacer(n) {
    this.y += n;
  }

  // ── Escape hatch ──────────────────────────────────────────────────────────

  // Raw hmUI widget with explicit h for y-tracking. Props are passed as-is.
  // Read col.currentY BEFORE calling to get the correct y for props.
  // e.g.: col.widget(hmUI.widget.ARC, { x: 40, y: col.currentY, w: 400, h: 400, ... }, 400)
  widget(type, props, h) {
    this.y += h;
    const w = hmUI.createWidget(type, props);
    if (w) this._widgets.push(w);
    return w;
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git add src/column.js
git commit -m "feat: expand Column with text, heroNumber, card, progressBar, image, divider, widget, chip variants"
```

---

## Task 4: Rewrite `src/components.js`

**Files:**
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/src/components.js`

- [ ] **Step 1: Write the file**

```js
/**
 * ZeRoUI components — thin wrappers around hmUI.createWidget().
 * All coordinates in 480-unit design canvas. No px() needed.
 */

import hmUI from '@zos/ui';
import { COLOR, TYPOGRAPHY, RADIUS } from './tokens.js';
import { LAYOUT } from './layout.js';
import { Column } from './column.js';

// OLED black background — always call first in build() when not using renderPage()
export function bg() {
  hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 0, y: 0, w: 480, h: 480,
    color: COLOR.BG,
  });
}

// Page title. layout param defaults to LAYOUT.FULL for standalone use.
export function title(text, { layout = LAYOUT.FULL } = {}) {
  const z = layout.TITLE || LAYOUT.FULL.TITLE;
  return hmUI.createWidget(hmUI.widget.TEXT, {
    x: z.x, y: z.y, w: z.w, h: z.h,
    text,
    text_size: TYPOGRAPHY.subheadline,
    color: COLOR.TEXT,
    align_h: hmUI.align.CENTER_H,
  });
}

// Column layout helper — standalone factory for custom layouts.
// renderPage() creates its own column internally; use this only when not using renderPage().
export function column(zone = LAYOUT.FULL.MAIN, opts = {}) {
  return new Column(zone, opts);
}

// Action button. variant: 'primary' (default) | 'secondary'.
// layout param allows custom placement outside the standard ACTION zone.
export function actionButton(text, { onPress, variant = 'primary', layout = LAYOUT.FULL } = {}) {
  const z = layout.ACTION || LAYOUT.FULL.ACTION;
  const normalColor = variant === 'secondary' ? COLOR.SECONDARY : COLOR.PRIMARY;
  const pressColor = variant === 'secondary' ? COLOR.SECONDARY_PRESSED : COLOR.PRIMARY_PRESSED;
  return hmUI.createWidget(hmUI.widget.BUTTON, {
    x: z.x, y: z.y, w: z.w, h: z.h,
    radius: RADIUS.chip,
    normal_color: normalColor,
    press_color: pressColor,
    text,
    text_size: TYPOGRAPHY.subheadline,
    color: COLOR.TEXT,
    click_func: onPress,
  });
}

/**
 * Full page layout helper.
 *
 * Creates bg, column, masks, title, and action button in the correct z-order.
 * Passes the Column to buildFn so callers don't need to create it separately.
 * Returns the Column for use in rebuild loops.
 *
 * renderPage({
 *   layout: LAYOUT.FULL,
 *   title: 'My Page',
 *   action: { text: 'Start', onPress: () => {}, variant: 'primary' },
 *   scrollable: true,             // default true
 *   buildFn: (col) => {
 *     col.label('Section');
 *     col.chip('Item');
 *     col.finalize();
 *   },
 * }) → Column
 *
 * Render order (z-order, low → high):
 *   1. FILL_RECT bg
 *   2. VIEW_CONTAINER (if scrollable)
 *   3. buildFn content (TEXT, BUTTON, etc.)
 *   4. Top mask FILL_RECT (hides overflow above MAIN)
 *   5. Title TEXT
 *   6. Bottom mask FILL_RECT (hides overflow below MAIN)
 *   7. Action BUTTON
 */
export function renderPage({ layout, buildFn, title: titleText, action, scrollable = true }) {
  // 1. Black background
  hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 0, y: 0, w: 480, h: 480,
    color: COLOR.BG,
  });

  // 2. Create Column (VIEW_CONTAINER if scrollable) + run buildFn — lowest z-order content
  const col = layout.MAIN ? new Column(layout.MAIN, { scrollable }) : null;
  if (buildFn && col) buildFn(col);

  // 3. Top mask — hides content that scrolls above MAIN
  if (layout.MAIN && layout.MAIN.y > 0) {
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0, w: 480, h: layout.MAIN.y,
      color: COLOR.BG,
    });
  }

  // 4. Title text (on top of mask)
  if (titleText && layout.TITLE) {
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: layout.TITLE.x, y: layout.TITLE.y, w: layout.TITLE.w, h: layout.TITLE.h,
      text: titleText,
      text_size: TYPOGRAPHY.subheadline,
      color: COLOR.TEXT,
      align_h: hmUI.align.CENTER_H,
    });
  }

  // 5. Bottom mask — hides content that scrolls below MAIN
  if (layout.MAIN) {
    const mainBottom = layout.MAIN.y + layout.MAIN.h;
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: mainBottom, w: 480, h: 480 - mainBottom,
      color: COLOR.BG,
    });
  }

  // 6. Action button — topmost widget
  if (action && layout.ACTION) {
    const z = layout.ACTION;
    const variant = action.variant || 'primary';
    const normalColor = variant === 'secondary' ? COLOR.SECONDARY : COLOR.PRIMARY;
    const pressColor = variant === 'secondary' ? COLOR.SECONDARY_PRESSED : COLOR.PRIMARY_PRESSED;
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: z.x, y: z.y, w: z.w, h: z.h,
      radius: RADIUS.chip,
      normal_color: normalColor,
      press_color: pressColor,
      text: action.text,
      text_size: TYPOGRAPHY.subheadline,
      color: COLOR.TEXT,
      click_func: action.onPress,
    });
  }

  return col;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git add src/components.js
git commit -m "feat: renderPage passes col to buildFn and returns it; add variant to actionButton"
```

---

## Task 5: Rewrite `index.js`, bump version

**Files:**
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/index.js`
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/package.json`

- [ ] **Step 1: Write `index.js`**

```js
// ZeRoUI v0.2.0 — ZeppOS Rounded UI
// import { UI } from '@bug-breeder/zeroui'          (namespace)
// import { renderPage, LAYOUT, COLOR } from '@bug-breeder/zeroui'  (named)

import { COLOR, TYPOGRAPHY, RADIUS, SPACING, configure } from './src/tokens.js';
import { LAYOUT } from './src/layout.js';
import { Column } from './src/column.js';
import {
  bg,
  title,
  column,
  actionButton,
  renderPage,
} from './src/components.js';

export const UI = {
  bg,
  title,
  column,
  actionButton,
  configure,
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
  LAYOUT,
  Column,
  configure,
  bg,
  title,
  column,
  actionButton,
  renderPage,
};
```

- [ ] **Step 2: Bump version in `package.json`**

Change `"version": "0.1.0"` to `"version": "0.2.0"`.

- [ ] **Step 3: Commit**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git add index.js package.json
git commit -m "feat: ZeRoUI v0.2.0 — updated exports, remove ZONE/heroText/statCard"
```

---

## Task 6: Migrate `pages/setup/index.js`

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zepp-meditation/pages/setup/index.js`

- [ ] **Step 1: Write the file**

Key changes: `renderPage` receives `buildFn(c)` → `col = c`, no more `if (!col) col = ...`. `sectionLabel` → `label`.

```js
// pages/setup/index.js
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import { LAYOUT, SPACING, renderPage } from '@bug-breeder/zeroui';
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
  col.clearContent();

  col.label('Technique');
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
  col.label('Rounds');
  col.chipRow(ROUNDS_OPTIONS, {
    selected: selectedRounds,
    onPress: (v) => {
      selectedRounds = v;
      rebuild();
    },
  });

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
      buildFn: (c) => {
        col = c;
        rebuild();
      },
    });
  },

  onDestroy() {
    col?.destroyAll();
    col = null;
  },
});
```

- [ ] **Step 2: Run verify**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
npm run verify
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add pages/setup/index.js
git commit -m "refactor(setup): migrate to renderPage col param pattern"
```

---

## Task 7: Migrate `pages/home/index.js`

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zepp-meditation/pages/home/index.js`

- [ ] **Step 1: Write the file**

Replaces hardcoded `hmUI.createWidget` calls with Column methods. Uses `LAYOUT.MINIMAL` (fullscreen, no chrome) with `scrollable: false`. Start/Stats become chip variants.

```js
// pages/home/index.js
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import { LAYOUT, renderPage } from '@bug-breeder/zeroui';

// Module-level state — reset in onInit
let streakDays = 0;
let totalSessions = 0;
let col = null;

Page({
  onInit() {
    col = null;
    streakDays = get(getKey('streak_days'), 0);
    totalSessions = get(getKey('total_sessions'), 0);
  },

  build() {
    const streakText = streakDays > 0 ? `${streakDays} day streak` : 'Start your streak';
    const sessionText = totalSessions === 1 ? '1 session total' : `${totalSessions} sessions total`;

    renderPage({
      layout: LAYOUT.MINIMAL,
      scrollable: false,
      buildFn: (c) => {
        col = c;
        col.spacer(50);
        col.text('Breathe', { size: 'largeTitle' });
        col.text(streakText, { size: 'subheadline', color: streakDays > 0 ? 'warning' : 'muted' });
        col.text(sessionText, { size: 'caption', color: 'muted' });
        col.spacer(16);
        col.chip('Start', {
          variant: 'secondary',
          onPress: () => push({ url: 'pages/setup/index' }),
        });
        col.chip('Stats', {
          variant: 'ghost',
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

- [ ] **Step 2: Run verify**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
npm run verify
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add pages/home/index.js
git commit -m "refactor(home): replace hardcoded hmUI calls with Column methods"
```

---

## Task 8: Migrate `pages/stats/index.js`

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zepp-meditation/pages/stats/index.js`

- [ ] **Step 1: Write the file**

Key changes: replace raw hex tokens (`0x52d985` → `COLOR.PRIMARY_LIGHT`, `0x636366` → `COLOR.TEXT_MUTED`), use `renderPage` + `col.card` for streak display, advance y past heatmap via `col.spacer`.

```js
// pages/stats/index.js
import hmUI from '@zos/ui';
import { COLOR, LAYOUT, renderPage } from '@bug-breeder/zeroui';
import { get, getKey } from '../../utils/storage';
import { getDateString, getDateNDaysAgo, getTodayDOW } from '../../utils/date';

// ─── Heatmap grid constants ────────────────────────────────────────────────────
// 7 columns (Mon–Sun) × 4 rows = 28 days, cell 30×30 with 4px gap
const GRID_LEFT_X = 123;
const GRID_TOP_Y = 134;
const CELL_SIZE = 30;
const CELL_STEP = 34;

// ─── Module-level state (ALL reset in onInit) ─────────────────────────────────
let streakDays = 0;
let totalSessions = 0;
let sessionHistory = {};
let todayDOW = 0;
let todayStr = '';
let col = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMotivationalMessage(streak, sessions) {
  if (streak === 0) return 'Start wherever you are';
  if (streak === 1) return sessions > 1 ? 'Back in the flow' : 'Day one. The hardest one.';
  if (streak <= 3) return 'Momentum is building';
  if (streak <= 7) return 'Your brain is adapting';
  if (streak <= 13) return 'ADHD and consistent. Yes.';
  if (streak <= 20) return 'Two weeks. Real habit forming.';
  return 'This is your superpower now';
}

function buildHeatmap() {
  const DOW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  DOW_LABELS.forEach((label, c) => {
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: GRID_LEFT_X + c * CELL_STEP,
      y: 106,
      w: CELL_SIZE,
      h: 24,
      text: label,
      text_size: 22,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });
  });

  for (let row = 0; row < 4; row++) {
    for (let c = 0; c < 7; c++) {
      const daysAgo = (3 - row) * 7 + (todayDOW - c);
      const isToday = daysAgo === 0;
      const isFuture = daysAgo < 0;

      let color;
      if (isFuture) {
        color = COLOR.SURFACE;
      } else {
        const dateStr = isToday ? todayStr : getDateNDaysAgo(daysAgo);
        const practiced = sessionHistory[dateStr] !== undefined && sessionHistory[dateStr] > 0;
        if (isToday) {
          color = practiced ? COLOR.PRIMARY_LIGHT : COLOR.SURFACE_PRESSED;
        } else {
          color = practiced ? COLOR.PRIMARY : COLOR.SURFACE;
        }
      }

      hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: GRID_LEFT_X + c * CELL_STEP,
        y: GRID_TOP_Y + row * CELL_STEP,
        w: CELL_SIZE,
        h: CELL_SIZE,
        radius: 6,
        color,
      });
    }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

Page({
  onInit() {
    col = null;
    streakDays = get(getKey('streak_days'), 0);
    totalSessions = get(getKey('total_sessions'), 0);
    sessionHistory = get(getKey('session_history'), {});
    todayStr = getDateString();
    todayDOW = getTodayDOW();
  },

  build() {
    renderPage({
      layout: LAYOUT.NO_ACTION,
      title: 'Your Journey',
      scrollable: true,
      buildFn: (c) => {
        col = c;

        // Heatmap drawn at absolute positions — advance column past the area.
        // DOW labels at y=106, grid y=134..266. MAIN starts at y=74.
        // Spacer: 106 - 74 = 32 to reach DOW labels row.
        col.spacer(32);
        buildHeatmap();
        // DOW labels h=24 + gap 4 + 4 rows × 34 = 164 → advance past grid
        col.spacer(164);

        // Stats section — y-tracked by column from here
        col.card({
          title: streakDays === 1 ? 'day streak' : 'days streak',
          value: String(streakDays),
          valueColor: streakDays > 0 ? 'warning' : 'muted',
        });
        col.text(getMotivationalMessage(streakDays, totalSessions), {
          size: 'caption',
          color: 'muted',
        });
        col.text(
          totalSessions === 1 ? '1 session total' : `${totalSessions} sessions total`,
          { size: 'caption', color: 'muted' },
        );
        col.finalize();
      },
    });
  },

  onDestroy() {
    col?.destroyAll();
    col = null;
    streakDays = 0;
    totalSessions = 0;
    sessionHistory = {};
    todayDOW = 0;
    todayStr = '';
  },
});
```

- [ ] **Step 2: Run verify**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
npm run verify
```

Expected: 0 errors.

- [ ] **Step 3: Commit + push**

```bash
git add pages/stats/index.js
git commit -m "refactor(stats): use renderPage, col.card for streak, fix hardcoded tokens"
git push
```

---

## Task 9: Push ZeRoUI, commit zepphyr docs

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zepphyr/skills/new-page/SKILL.md`
- Modify: `/Users/alanguyen/Code/Others/zepphyr/skills/zeroui/references/api.md`

- [ ] **Step 1: Push ZeRoUI to GitHub**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git push
```

- [ ] **Step 2: Rewrite `skills/new-page/SKILL.md`**

```markdown
---
name: new-page
description: Scaffolds a new ZeppOS page with ZeRoUI template and registers it in app.json. Only activate when explicitly invoked.
argument-hint: <PageName>
context: fork
disable-model-invocation: true
allowed-tools: Read, Glob, Edit, Write, Bash(npm run verify:*), Bash(git add:*), Bash(git commit:*)
---

Scaffold a new ZeppOS page: $ARGUMENTS

**Derive names from `$ARGUMENTS`:**

- PascalCase (e.g. `TimerSelect`) → used in file comment and log prefix
- kebab-case (e.g. `timer-select`) → directory name
- File path: `pages/<kebab-case>/index.js`
- Registration path: `pages/<kebab-case>/index` (no .js extension — for app.json)

**Create `pages/<kebab-case>/index.js`:**

```js
/**
 * [PascalCase] page
 */
import { renderPage, LAYOUT } from '@bug-breeder/zeroui';
// import { push, pop } from '@zos/router'; // uncomment when needed

// Module-level state — MUST reset in onInit (persists across page visits)
let col = null;

Page({
  onInit(params) {
    col = null;

    try {
      const p = params ? JSON.parse(params) : {};
      console.log('[[PascalCase]] onInit', p);
    } catch {
      console.log('[[PascalCase]] onInit: no params');
    }
  },

  build() {
    renderPage({
      layout: LAYOUT.FULL,
      title: '[PascalCase]',
      buildFn(c) {
        col = c;
        col.label('Section');
        col.chip('Item', { onPress: () => {} });
        col.finalize();
      },
    });
  },

  onDestroy() {
    col?.destroyAll();
    col = null;
    // offGesture(); offKey(); vibrator.stop(); — if used
  },
});
```

**Register in `app.json`:** Add `"pages/<kebab-case>/index"` to `targets.common.module.page.pages`.

**Run:** `npm run verify` — expect 0 errors (lint + format + build).

**Report:** created file path, app.json entry added, verify result.
```

- [ ] **Step 3: Rewrite `skills/zeroui/references/api.md`**

```markdown
# ZeRoUI v0.2.0 API Reference

## Layout modes (480-unit design canvas)

### LAYOUT.FULL
```js
LAYOUT.FULL.TITLE:  { x: 120, y: 24,  w: 240, h: 44  }
LAYOUT.FULL.MAIN:   { x: 80,  y: 74,  w: 320, h: 312 }
LAYOUT.FULL.ACTION: { x: 140, y: 392, w: 200, h: 48  }
```

### LAYOUT.NO_TITLE
```js
LAYOUT.NO_TITLE.MAIN:   { x: 80,  y: 62,  w: 320, h: 324 }
LAYOUT.NO_TITLE.ACTION: { x: 140, y: 392, w: 200, h: 48  }
```

### LAYOUT.NO_ACTION
```js
LAYOUT.NO_ACTION.TITLE: { x: 120, y: 24,  w: 240, h: 44  }
LAYOUT.NO_ACTION.MAIN:  { x: 80,  y: 74,  w: 320, h: 342 }
```

### LAYOUT.MINIMAL
```js
LAYOUT.MINIMAL.MAIN: { x: 80, y: 62, w: 320, h: 354 }
// Fullscreen / immersive — no title, no action button. Was MAIN_ONLY.
```

---

## configure()

```js
configure({ accent: 'green' })   // preset: 'green'|'blue'|'red'|'orange'|'purple'
configure({ accent: { primary: 0x007aff, primaryLight: 0x4da3ff, primaryTint: 0x001f4d, primaryPressed: 0x0051d5 } })
```

Call once in `app.js`. Mutates `COLOR.PRIMARY*` in place — all pages see updated values.

---

## renderPage()

```js
renderPage({
  layout,       // required: LAYOUT.*
  title,        // optional: string
  action,       // optional: { text, onPress, variant?: 'primary'|'secondary' }
  scrollable,   // optional: bool, default true
  buildFn,      // optional: (col: Column) => void — create content here
}) → Column
```

Render order (z-order, low → high):
1. `FILL_RECT` bg
2. `VIEW_CONTAINER` (if scrollable)
3. `buildFn(col)` — Column content
4. Top mask `FILL_RECT` (hides scroll overflow above MAIN)
5. Title `TEXT`
6. Bottom mask `FILL_RECT`
7. Action `BUTTON`

---

## Column methods

### Text
```js
col.label(text, { color?, align? }): widget
// color: 'muted'(default)|'default'|'primary'|'danger'|'warning'|'success'|hex
// align: 'center'(default)|'left'|'right'
// h=34, gap=8

col.text(text, { size?, color?, align?, wrap?, h? }): widget
// size: 'caption'|'body'(default)|'subheadline'|'title'|'largeTitle'
// color: 'default'(default)|'muted'|'disabled'|'primary'|'danger'|'warning'|'success'|hex
// wrap: false(default)|true — requires explicit h for y-tracking
// h: auto (fontSize+4) or explicit

col.heroNumber(value, { color? }): widget
// Large centered number. color same options as col.text.
// h=64
```

### Interactive
```js
col.chip(text, { selected?, onPress?, variant? }): widget
// variant: 'default'(default)|'primary'|'secondary'|'danger'|'ghost'
// selected applies only to variant='default'
// h=48, gap=4

col.chipRow(options, { selected?, onPress?, variant? }): widget[]
// N equal-width chips in a row
// h=48, gap=4
```

### Display
```js
col.card({ title, value, valueColor?, h? }): widget[]
// valueColor: string alias or hex. h default 80. Returns [bg, value, label].
// gap=4

col.progressBar(value, { color?, h?, radius? }): [track, fill]
// value: 0.0–1.0. color: 'primary'(default)|'secondary'|'danger'|hex
// h default 8, radius default 4

col.image(src, { w?, h? }): widget
// Centered in column width. Default w and h = col.w.
```

### Structure
```js
col.divider({ color?, margin? }): widget
// color: 'surface'(default) or string alias. margin default 4 (above+below).

col.spacer(n): void
// Advance y by n units, no widget.
```

### Escape hatch
```js
col.widget(type, props, h): widget
// Raw hmUI widget. Read col.currentY FIRST for y in props. Advances y by h.
// e.g.: col.widget(hmUI.widget.ARC, { x: 40, y: col.currentY, w: 400, h: 400 }, 400)
```

### Lifecycle
```js
col.finalize(): void        // required for scrollable — sets VIEW_CONTAINER height
col.clearContent(): void    // destroy children, reset y — use in rebuild loops
col.destroyAll(): void      // full teardown — call only in onDestroy()
col.currentY: number        // current y position (read-only)
```

---

## Standalone components

```js
bg(): void
// FILL_RECT 480×480 COLOR.BG — only needed when not using renderPage()

title(text, { layout? }): widget
// TEXT in layout.TITLE zone. layout default: LAYOUT.FULL

column(zone?, opts?): Column
// Factory — only needed for custom layouts outside renderPage()
// zone default: LAYOUT.FULL.MAIN

actionButton(text, { onPress?, variant?, layout? }): widget
// variant: 'primary'(default)|'secondary'
// layout default: LAYOUT.FULL
```

---

## Token tables

### COLOR
| Token | Hex | Notes |
|---|---|---|
| `BG` | `0x000000` | OLED black |
| `SURFACE` | `0x1c1c1e` | chip/card bg |
| `SURFACE_PRESSED` | `0x2c2c2e` | |
| `SURFACE_BORDER` | `0x2c2c2e` | |
| `PRIMARY` | `0x30d158` | mutable via configure() |
| `PRIMARY_LIGHT` | `0x52d985` | mutable via configure() |
| `PRIMARY_TINT` | `0x0c2415` | mutable via configure() |
| `PRIMARY_PRESSED` | `0x25a244` | mutable via configure() |
| `SECONDARY` | `0x007aff` | |
| `SECONDARY_PRESSED` | `0x0051d5` | |
| `DANGER` | `0xfa5151` | |
| `SUCCESS` | `0x34c759` | |
| `WARNING` | `0xff9f0a` | |
| `TEXT` | `0xffffff` | |
| `TEXT_MUTED` | `0x8e8e93` | |
| `TEXT_DISABLED` | `0x3a3a3c` | |

### TYPOGRAPHY
| Token | Size | Use |
|---|---|---|
| `largeTitle` | 60 | hero numbers |
| `title` | 44 | section titles |
| `body` | 40 | body text |
| `subheadline` | 34 | chips, buttons |
| `caption` | 30 | labels, hints |

### RADIUS
| Token | Value |
|---|---|
| `pill` | 999 |
| `chip` | 12 |
| `card` | 12 |

### SPACING
| Token | Value |
|---|---|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 16 |
| `lg` | 24 |
| `xl` | 32 |
| `chipGap` | 4 |
| `sectionGap` | 8 |
```

- [ ] **Step 4: Commit and push zepphyr**

```bash
cd /Users/alanguyen/Code/Others/zepphyr
git add skills/new-page/SKILL.md skills/zeroui/references/api.md
git commit -m "docs: update new-page skill and ZeRoUI API reference to v0.2.0"
git push
```

- [ ] **Step 5: Pull marketplace clone**

```bash
git -C ~/.claude/plugins/marketplaces/zepphyr pull
```

---

## Task 10: Update `zeppos-app-template`

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zeppos-app-template/pages/home/index.js`

- [ ] **Step 1: Write the file**

Key fix: column is now created by `renderPage` internally (not before it). This also fixes the pre-existing z-order bug in the old template.

```js
/**
 * Home page — golden example of a ZeRoUI page.
 *
 * Key patterns:
 *   - renderPage() handles bg, column creation, masks, title, and action in correct z-order
 *   - buildFn receives the Column as a parameter — no need to create it manually
 *   - col.clearContent() + re-add + col.finalize() for rebuilds
 *   - Reset ALL module-level state in onInit (vars persist across page visits)
 *   - col?.destroyAll() in onDestroy()
 */

import { renderPage, LAYOUT } from '@bug-breeder/zeroui';
// import { push } from '@zos/router'; // uncomment when you need navigation

// Module-level state — MUST reset in onInit (persists across page visits)
let col = null;

Page({
  onInit(params) {
    col = null;

    try {
      const p = params ? JSON.parse(params) : {};
      console.log('[Home] onInit params:', JSON.stringify(p));
    } catch {
      console.log('[Home] onInit: no params');
    }
  },

  build() {
    console.log('[Home] build');

    renderPage({
      layout: LAYOUT.FULL,
      title: 'My App',
      buildFn(c) {
        col = c;
        col.label('Welcome');
        col.chip('Get Started', {
          onPress: () => {
            console.log('[Home] Get Started pressed');
            // push({ url: 'pages/next/index', params: JSON.stringify({ key: 'value' }) });
          },
        });
        col.finalize();
      },
      action: {
        text: 'Start',
        onPress: () => {
          console.log('[Home] action pressed');
        },
      },
    });
  },

  onDestroy() {
    console.log('[Home] onDestroy');
    col?.destroyAll();
    col = null;
    // offGesture(); offKey(); vibrator.stop(); — if used
  },
});
```

- [ ] **Step 2: Commit and push**

```bash
cd /Users/alanguyen/Code/Others/zeppos-app-template
git add pages/home/index.js
git commit -m "refactor: update golden example to ZeRoUI v0.2.0 renderPage col param pattern"
git push
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `configure({ accent })` | Task 1 |
| `COLOR.PRIMARY_LIGHT` | Task 1 |
| Drop `ZONE`, rename `MAIN_ONLY` → `MINIMAL` | Task 2 |
| `renderPage` passes col to `buildFn`, returns col | Task 4 |
| `renderPage` `scrollable` param | Task 4 |
| `col.label` (replaces `sectionLabel`) | Task 3 |
| `col.text` | Task 3 |
| `col.heroNumber` | Task 3 |
| `col.chip` with `variant` | Task 3 |
| `col.chipRow` with `variant` | Task 3 |
| `col.card` (absorbed from `statCard`) | Task 3 |
| `col.progressBar` | Task 3 |
| `col.image` | Task 3 |
| `col.divider` | Task 3 |
| `col.widget` escape hatch | Task 3 |
| `actionButton` `variant` param | Task 4 |
| `title` `layout` param | Task 4 |
| Remove `heroText`, `statCard`, `ZONE` exports | Task 5 |
| `setup/index.js` migration | Task 6 |
| `home/index.js` migration | Task 7 |
| `stats/index.js` migration (tokens + col.card) | Task 8 |
| zepphyr new-page skill | Task 9 |
| zepphyr zeroui api.md | Task 9 |
| zeppos-app-template | Task 10 |

All spec requirements covered. ✓
