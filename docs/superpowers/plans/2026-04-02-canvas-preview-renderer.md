# Canvas Preview Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SVG preview output with an accurate HTML Canvas 2D renderer that matches the ZeppOS simulator, with interactive scroll on scrollable pages and a diagnostic zone overlay.

**Architecture:** Three targeted file changes in ZeRoUI: one-line mask fix in `svg.mjs`, new `html.mjs` Canvas 2D renderer, and output switch in `preview.mjs`. No new npm dependencies — Noto Sans loads from Google Fonts CDN inside the generated HTML.

**Tech Stack:** Node.js ESM, Canvas 2D API (in-browser), FontFace API, ZeRoUI widget mock array.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `tools/svg.mjs` | Modify line 37 | Fix mask rendering: full-width black `FILL_RECT`s render solid, not invisible |
| `tools/html.mjs` | Create | Canvas 2D renderer — infers layout, renders widgets in z-order, interactive scroll, diagnostic overlay |
| `tools/preview.mjs` | Modify 4 lines | Swap import + output from `.svg` to `.html` |

All commands run from `/Users/alanguyen/Code/Others/ZeRoUI/`.

---

## Task 1: Fix svg.mjs mask rendering

**Files:**
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/tools/svg.mjs:37`

- [ ] **Step 1: Run existing tests to confirm baseline**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI && npm test
```

Expected: `98 passed`.

- [ ] **Step 2: Apply the one-line fix**

In `tools/svg.mjs`, find line 37:

```js
  if (w._type === 'FILL_RECT' && (w.color === 0 || w.color === 0x000000)) return '';
```

Replace with:

```js
  if (w._type === 'FILL_RECT' && (w.color === 0 || w.color === 0x000000) && w.w < 460) return '';
```

This adds `&& w.w < 460` so full-width black `FILL_RECT`s (the z-order masks that `renderPage()` uses to hide overflow content) now render as solid black instead of being skipped. Small black `FILL_RECT`s (`w < 460`, e.g. empty heatmap cells) are still skipped for OLED transparency simulation.

- [ ] **Step 3: Run tests to confirm they still pass**

```bash
npm test
```

Expected: `98 passed` (the fix doesn't touch any logic that tests check).

- [ ] **Step 4: Commit**

```bash
git add tools/svg.mjs
git commit -m "fix(svg): render full-width black FILL_RECTs solid — masks now hide overflow content"
```

---

## Task 2: Create html.mjs Canvas 2D renderer

**Files:**
- Create: `/Users/alanguyen/Code/Others/ZeRoUI/tools/html.mjs`

This file exports one function: `widgetsToHTML(widgets, { label, pageSlug })`. It runs in Node.js (infers layout from widget array, serializes data) and embeds all the Canvas 2D rendering code as a string inside the returned HTML.

- [ ] **Step 1: Create `tools/html.mjs` with the complete implementation**

Create `/Users/alanguyen/Code/Others/ZeRoUI/tools/html.mjs` with this exact content:

```js
/**
 * ZeRoUI Canvas 2D page renderer.
 *
 * Converts a ZeppOS widget list to a self-contained HTML file with a 480×480
 * Canvas 2D preview. Accurately simulates z-order masking (black FILL_RECTs
 * render solid) and supports interactive wheel/touch scroll on scrollable pages.
 *
 * Usage (from ZeppOS app directory, via preview.mjs):
 *   const html = widgetsToHTML(widgets, { label, pageSlug });
 *   writeFileSync('/tmp/zepp-preview-home.html', html, 'utf-8');
 */

/** Convert a ZeppOS hex color integer to CSS hex string (#rrggbb). */
function hexColor(n) {
  if (n === undefined || n === null) return '#000000';
  return '#' + ((n >>> 0) & 0xffffff).toString(16).padStart(6, '0');
}

/**
 * Infer layout zones from the widget array.
 * No layout object needed — everything is derived from mask positions.
 *
 * renderPage() creates widgets in this order:
 *   1. FILL_RECT bg (y=0, h=480, black)          — fixed
 *   2. VIEW_CONTAINER (if scrollable)             — marks scrollable start
 *   3. buildFn content (scrollable or fixed)
 *   4. FILL_RECT top_mask (y=0, h=mainY, black)  — fixed
 *   5. TEXT title (if any)                        — fixed
 *   6. FILL_RECT bottom_mask (y=mainBottom, black)— fixed
 *   7. BUTTON action (if any)                     — fixed
 */
function inferLayout(widgets) {
  const isFullWidthBlack = (w) =>
    w._type === 'FILL_RECT' &&
    (w.w || 0) >= 460 &&
    (w.color === 0 || w.color === 0x000000);

  // Top mask: full-width black at y=0, h<200 (bg has h=480 — excluded by h<200 guard)
  const topMask = widgets.find((w) => isFullWidthBlack(w) && w.y === 0 && w.h < 200);
  // Bottom mask: first full-width black with y>0
  const bottomMask = widgets.find((w) => isFullWidthBlack(w) && (w.y || 0) > 0);

  const mainY = topMask ? topMask.h : 0;
  const mainBottom = bottomMask ? bottomMask.y : 480;
  const mainH = mainBottom - mainY;
  const mainX = 80;   // consistent across all ZeRoUI layouts
  const mainW = 320;  // consistent across all ZeRoUI layouts

  const vcIdx = widgets.findIndex((w) => w._type === 'VIEW_CONTAINER');
  const scrollable = vcIdx >= 0;

  // Scrollable widget range: after VIEW_CONTAINER, before next full-width black FILL_RECT
  let scStart = 0, scEnd = 0;
  if (scrollable) {
    scStart = vcIdx + 1;
    const nextMaskIdx = widgets.findIndex((w, i) => i > vcIdx && isFullWidthBlack(w));
    scEnd = nextMaskIdx >= 0 ? nextMaskIdx : widgets.length;
  }

  const titleWidget =
    widgets.find((w) => w._type === 'TEXT' && (w.y || 0) < mainY && w._visible !== false) || null;
  const actionWidget =
    widgets.find((w) => w._type === 'BUTTON' && (w.y || 0) >= mainBottom && w._visible !== false) || null;

  // maxScroll: how far content can scroll before the last widget is fully visible
  let maxScroll = 0;
  if (scrollable && scEnd > scStart) {
    const maxY = Math.max(
      ...widgets.slice(scStart, scEnd).map((w) => (w.y || 0) + (w.h || 0))
    );
    maxScroll = Math.max(0, maxY - mainY - mainH);
  }

  return { mainY, mainBottom, mainH, mainX, mainW, scrollable, scStart, scEnd, titleWidget, actionWidget, maxScroll };
}

/** Serialize widget array to JSON, stripping functions (e.g. setProperty, click_func). */
function serializeWidgets(widgets) {
  return JSON.stringify(
    widgets.map((w) => {
      const out = {};
      for (const [k, v] of Object.entries(w)) {
        if (typeof v !== 'function') out[k] = v;
      }
      return out;
    })
  );
}

/**
 * Render a list of ZeppOS widgets to a self-contained HTML string.
 * @param {object[]} widgets  - Array of widget objects from the hmUI mock.
 * @param {object}   options
 * @param {string}   options.label     - Caption shown below the canvas.
 * @param {string}   options.pageSlug  - Page name for the HTML title.
 */
export function widgetsToHTML(widgets, { label = '', pageSlug = '' } = {}) {
  const {
    mainY, mainBottom, mainH, mainX, mainW,
    scrollable, scStart, scEnd,
    titleWidget, actionWidget, maxScroll,
  } = inferLayout(widgets);

  const widgetsJSON = serializeWidgets(widgets);
  const scrollHint = scrollable ? ' — scroll to see full content' : '';
  const cursor = scrollable ? 'grab' : 'default';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${pageSlug || 'preview'} \u2014 ZeRoUI preview</title>
  <style>
    body { margin: 0; background: #0d0d0d; display: flex; flex-direction: column; align-items: center; padding: 32px; font-family: system-ui, sans-serif; }
    canvas { border-radius: 50%; cursor: ${cursor}; display: block; box-shadow: 0 0 0 2px #2a2a2a; }
    .info { color: #8e8e93; font-size: 13px; margin-top: 14px; }
  </style>
</head>
<body>
  <canvas id="watch" width="480" height="480"></canvas>
  <p class="info">${label}${scrollHint}</p>
<script>
const WIDGETS = ${widgetsJSON};
const MAIN_X = ${mainX}, MAIN_Y = ${mainY}, MAIN_W = ${mainW}, MAIN_H = ${mainH};
const MAIN_BOTTOM = ${mainBottom};
const SC_START = ${scStart}, SC_END = ${scEnd};
const SCROLLABLE = ${scrollable};
const MAX_SCROLL = ${maxScroll};
const TITLE_WIDGET = ${JSON.stringify(titleWidget)};
const ACTION_WIDGET = ${JSON.stringify(actionWidget)};

const canvas = document.getElementById('watch');
const ctx = canvas.getContext('2d');

function hexColor(n) {
  if (n === undefined || n === null) return '#000000';
  return '#' + ((n >>> 0) & 0xffffff).toString(16).padStart(6, '0');
}

function drawFillRect(ctx, w) {
  if (w._visible === false) return;
  ctx.fillStyle = hexColor(w.color);
  const r = Math.min(w.radius || 0, (w.w || 0) / 2, (w.h || 0) / 2);
  if (r > 0) {
    ctx.beginPath();
    ctx.roundRect(w.x || 0, w.y || 0, w.w || 0, w.h || 0, r);
    ctx.fill();
  } else {
    ctx.fillRect(w.x || 0, w.y || 0, w.w || 0, w.h || 0);
  }
}

function drawText(ctx, w) {
  if (w._visible === false || !w.text) return;
  ctx.fillStyle = hexColor(w.color);
  ctx.font = \`\${w.text_size || 30}px 'Noto Sans', system-ui, sans-serif\`;
  ctx.textBaseline = 'middle';
  const ty = (w.y || 0) + (w.h || 0) / 2;
  if (w.align_h === 'LEFT') {
    ctx.textAlign = 'left';
    ctx.fillText(String(w.text), (w.x || 0) + 4, ty);
  } else if (w.align_h === 'RIGHT') {
    ctx.textAlign = 'right';
    ctx.fillText(String(w.text), (w.x || 0) + (w.w || 0) - 4, ty);
  } else {
    ctx.textAlign = 'center';
    ctx.fillText(String(w.text), (w.x || 0) + (w.w || 0) / 2, ty);
  }
}

function drawButton(ctx, w) {
  if (w._visible === false) return;
  ctx.fillStyle = hexColor(w.normal_color);
  const r = Math.min(w.radius || 0, (w.w || 0) / 2, (w.h || 0) / 2);
  ctx.beginPath();
  ctx.roundRect(w.x || 0, w.y || 0, w.w || 0, w.h || 0, r);
  ctx.fill();
  if (w.text) {
    ctx.fillStyle = hexColor(w.color);
    ctx.font = \`\${w.text_size || 30}px 'Noto Sans', system-ui, sans-serif\`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(w.text), (w.x || 0) + (w.w || 0) / 2, (w.y || 0) + (w.h || 0) / 2);
  }
}

function drawArc(ctx, w) {
  if (w._visible === false) return;
  const cx = (w.x || 0) + (w.w || 0) / 2;
  const cy = (w.y || 0) + (w.h || 0) / 2;
  const lw = w.line_width || 4;
  const r = Math.max(0, (w.w || 0) / 2 - lw / 2);
  ctx.strokeStyle = hexColor(w.color);
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawImg(ctx, w) {
  if (w._visible === false) return;
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(w.x || 0, w.y || 0, w.w || 0, w.h || 0);
  ctx.fillStyle = '#555555';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('IMG', (w.x || 0) + (w.w || 0) / 2, (w.y || 0) + (w.h || 0) / 2);
}

function drawWidget(ctx, w) {
  switch (w._type) {
    case 'FILL_RECT': drawFillRect(ctx, w); break;
    case 'TEXT':      drawText(ctx, w);     break;
    case 'BUTTON':    drawButton(ctx, w);   break;
    case 'ARC':       drawArc(ctx, w);      break;
    case 'IMG':       drawImg(ctx, w);      break;
  }
}

function drawOverlay(ctx) {
  ctx.save();
  ctx.lineWidth = 1.5;

  // MAIN zone — always shown
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#30d15888';
  ctx.strokeRect(MAIN_X, MAIN_Y, MAIN_W, MAIN_H);
  ctx.setLineDash([]);
  ctx.fillStyle = '#30d15899';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('MAIN', MAIN_X + 4, MAIN_Y + 4);

  // TITLE zone
  if (TITLE_WIDGET) {
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#ff9f0a88';
    ctx.strokeRect(TITLE_WIDGET.x, TITLE_WIDGET.y, TITLE_WIDGET.w, TITLE_WIDGET.h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff9f0a99';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('TITLE', TITLE_WIDGET.x + 4, TITLE_WIDGET.y + 4);
  }

  // ACTION zone
  if (ACTION_WIDGET) {
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#007aff88';
    ctx.strokeRect(ACTION_WIDGET.x, ACTION_WIDGET.y, ACTION_WIDGET.w, ACTION_WIDGET.h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#007aff99';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('ACTION', ACTION_WIDGET.x + 4, ACTION_WIDGET.y + 4);
  }

  // Scroll indicator on right edge of MAIN zone
  if (SCROLLABLE) {
    ctx.fillStyle = '#30d158bb';
    ctx.font = '22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2195', MAIN_X + MAIN_W + 20, MAIN_Y + MAIN_H / 2);
  }

  ctx.restore();
}

function render(scrollY) {
  ctx.clearRect(0, 0, 480, 480);

  // Clip all drawing to the circular watch face
  ctx.save();
  ctx.beginPath();
  ctx.arc(240, 240, 240, 0, Math.PI * 2);
  ctx.clip();

  for (let i = 0; i < WIDGETS.length; i++) {
    const w = WIDGETS[i];
    if (w._type === 'VIEW_CONTAINER') continue;

    const isScrollable = SCROLLABLE && i >= SC_START && i < SC_END;

    if (isScrollable) {
      // Clip scrollable widgets to MAIN zone and shift by scrollY
      ctx.save();
      ctx.beginPath();
      ctx.rect(MAIN_X, MAIN_Y, MAIN_W, MAIN_H);
      ctx.clip();
      ctx.translate(0, -scrollY);
      drawWidget(ctx, w);
      ctx.restore();
    } else {
      // Fixed widgets (bg, masks, title, action) render at original positions.
      // Black FILL_RECTs (masks) render solid — z-order hides overflow content.
      drawWidget(ctx, w);
    }
  }

  drawOverlay(ctx);
  ctx.restore(); // remove circle clip
}

// ─── Scroll interactivity ───────────────────────────────────────────────────

let scrollY = 0;

if (SCROLLABLE && MAX_SCROLL > 0) {
  canvas.addEventListener('wheel', (e) => {
    scrollY = Math.max(0, Math.min(MAX_SCROLL, scrollY + e.deltaY * 0.5));
    render(scrollY);
    e.preventDefault();
  }, { passive: false });

  let touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    const dy = touchStartY - e.touches[0].clientY;
    touchStartY = e.touches[0].clientY;
    scrollY = Math.max(0, Math.min(MAX_SCROLL, scrollY + dy));
    render(scrollY);
    e.preventDefault();
  }, { passive: false });
}

// ─── Font loading + initial render ─────────────────────────────────────────

async function init() {
  try {
    const font = new FontFace(
      'Noto Sans',
      'url(https://fonts.gstatic.com/s/notosans/v39/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A-9X6VLHvA.woff2)'
    );
    await font.load();
    document.fonts.add(font);
  } catch (_) { /* offline — falls back to system-ui */ }
  render(0);
}
init();
</script>
</body>
</html>`;
}
```

- [ ] **Step 2: Verify the file was created**

```bash
ls -la /Users/alanguyen/Code/Others/ZeRoUI/tools/html.mjs
```

Expected: file exists, size > 5000 bytes.

- [ ] **Step 3: Smoke-test widgetsToHTML with a minimal widget array**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
node -e "
import('./tools/html.mjs').then(({ widgetsToHTML }) => {
  const widgets = [
    { _type: 'FILL_RECT', x: 0, y: 0, w: 480, h: 480, color: 0x000000 },
    { _type: 'FILL_RECT', x: 0, y: 0, w: 480, h: 60,  color: 0x000000 },
    { _type: 'TEXT', x: 80, y: 84, w: 320, h: 40, text: 'Hello', text_size: 36, color: 0xffffff },
    { _type: 'FILL_RECT', x: 0, y: 420, w: 480, h: 60, color: 0x000000 },
  ];
  const html = widgetsToHTML(widgets, { label: 'test', pageSlug: 'test' });
  console.log('mainY:', html.includes('MAIN_Y = 60') ? '60 ✓' : 'WRONG');
  console.log('mainBottom:', html.includes('MAIN_BOTTOM = 420') ? '420 ✓' : 'WRONG');
  console.log('scrollable:', html.includes('SCROLLABLE = false') ? 'false ✓' : 'WRONG');
  console.log('length:', html.length, 'chars');
})
"
```

Expected:
```
mainY: 60 ✓
mainBottom: 420 ✓
scrollable: false ✓
length: [number > 8000] chars
```

- [ ] **Step 5: Commit**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git add tools/html.mjs
git commit -m "feat(tools): add html.mjs Canvas 2D renderer with interactive scroll and diagnostic overlay"
```

---

## Task 3: Switch preview.mjs output to HTML

**Files:**
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/tools/preview.mjs`

- [ ] **Step 1: Update the import line**

In `tools/preview.mjs` line 39, find:

```js
import { widgetsToSVG } from './svg.mjs';
```

Replace with:

```js
import { widgetsToHTML } from './html.mjs';
```

- [ ] **Step 2: Update the render call and output path**

In `tools/preview.mjs` lines 95–102, find:

```js
// ─── Render SVG ───────────────────────────────────────────────────────────────

const svg = widgetsToSVG(widgets, {
  label: `${pageSlug}  —  ${widgets.length} widgets`,
});

const outPath = `/tmp/zepp-preview-${pageSlug}.svg`;
writeFileSync(outPath, svg, 'utf-8');
```

Replace with:

```js
// ─── Render HTML ──────────────────────────────────────────────────────────────

const html = widgetsToHTML(widgets, {
  label: `${pageSlug}  \u2014  ${widgets.length} widgets`,
  pageSlug,
});

const outPath = `/tmp/zepp-preview-${pageSlug}.html`;
writeFileSync(outPath, html, 'utf-8');
```

- [ ] **Step 3: Update the console output**

In `tools/preview.mjs` lines 182–184, find:

```js
console.log(`Open:    open ${outPath}`);
console.log(`To PNG:  qlmanage -t -s 480 -o /tmp ${outPath}`);
console.log(`         # output: /tmp/zepp-preview-${pageSlug}.svg.png\n`);
```

Replace with:

```js
console.log(`Open:    open ${outPath}\n`);
```

- [ ] **Step 4: Run preview-page home and verify HTML output**

Run from `/Users/alanguyen/Code/Others/zepp-meditation/`:

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation && npm run preview-page home
```

Expected console output:
```
📱  home  —  8 widgets  →  /tmp/zepp-preview-home.html
──────────────────────────────────────────────────────────────────────
  [TEXT      ] "Breathe"            x= 80 y= 84 w=320 h= 40  fill=#8e8e93  font=36
  [TEXT      ] "1"                  x= 80 y=136 w=320 h= 76  fill=#ff9f0a  font=72
  [TEXT      ] "day streak"         x= 80 y=224 w=320 h= 52  fill=#8e8e93  font=48
  [BUTTON    ] "Start"              x=144 y=288 w=192 h= 72  bg=#30d158  font=60
  [BUTTON    ] "Stats"              x=160 y=366 w=160 h= 48  bg=#1c1c1e  font=48

✅  All widgets within circle bounds
✅  No invisible ghost chips
✅  All text sizes fit within widget heights

──────────────────────────────────────────────────────────────────────
Open:    open /tmp/zepp-preview-home.html
```

- [ ] **Step 5: Open home page in browser and visually verify**

```bash
open /tmp/zepp-preview-home.html
```

Expected visual (matches simulator):
- Black circular OLED background
- "Breathe" in muted gray near top
- "1" in orange (large)
- "day streak" in muted gray
- Green pill "Start" button
- Dark pill "Stats" button (visible — not invisible ghost)
- Green dashed MAIN zone outline overlay
- No content outside the MAIN zone

- [ ] **Step 6: Run preview-page setup and verify scrollable behavior**

```bash
npm run preview-page setup
open /tmp/zepp-preview-setup.html
```

Expected visual:
- "Technique" label near top
- Three chips (Box 4-4-4-4 selected in dark green, 4-7-8 and Simple 4-4 in surface gray)
- Green "Start" button pinned at bottom
- "Rounds" section and round chips NOT visible at initial load (hidden behind black mask)
- ↕ scroll indicator at the right edge of the MAIN zone
- Scrolling with mouse wheel reveals the "Rounds" label and 3, 5, 10 chip row
- Start button stays pinned while scrolling

- [ ] **Step 7: Run preview-page stats and verify heatmap**

```bash
npm run preview-page stats
open /tmp/zepp-preview-stats.html
```

Expected visual:
- "1" in orange at top
- "day streak" below
- Full 4-row heatmap visible with day-of-week headers
- All heatmap cells within circular screen boundary
- Green/lit cells on days with sessions

- [ ] **Step 8: Run zepp-meditation verify**

```bash
npm run verify
```

Expected: passes (no changes to source pages — only ZeRoUI tools changed).

- [ ] **Step 9: Run ZeRoUI tests one final time**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI && npm test
```

Expected: `98 passed`.

- [ ] **Step 10: Commit**

```bash
git add tools/preview.mjs
git commit -m "feat(tools): switch preview output from SVG to HTML Canvas renderer"
```
