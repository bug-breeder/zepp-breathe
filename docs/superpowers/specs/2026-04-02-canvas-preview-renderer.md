# Canvas Preview Renderer — Design Spec

**Date:** 2026-04-02
**Repo:** ZeRoUI (`/Users/alanguyen/Code/Others/ZeRoUI/`)

---

## Problem

The existing `tools/svg.mjs` renderer has two bugs that cause its output to not match the ZeppOS simulator:

1. **Mask bug (primary):** All black `FILL_RECT` widgets are skipped ("OLED transparent"). But `renderPage()` uses full-width black `FILL_RECT`s as z-order masks — drawn *after* scrollable content to hide overflow. Skipping them lets content bleed through (e.g. the Rounds chip row visible over the Start button on the setup page).

2. **Scrollable content not scrollable:** The SVG output is static. On scrollable pages, all content including the below-fold virtual canvas is shown flat. There's no way to see the scrollable behavior.

---

## Solution

Replace the SVG visual output with a self-contained HTML file rendered via Canvas 2D. The HTML file:
- Accurately simulates z-order masking (black `FILL_RECT`s render solid).
- On scrollable pages, lets the user scroll inside the circular watch face (wheel + touch), with the ACTION button pinned, matching watch behavior.
- Shows a diagnostic overlay (zone outlines + scroll indicator) drawn after content.

`svg.mjs` is kept (with the mask bug fixed) for Vitest tests and CI use. The visual output switches to HTML.

---

## File Map

| File | Repo | Action |
|---|---|---|
| `tools/html.mjs` | ZeRoUI | **NEW** — Canvas 2D renderer. Input: widget array + options. Output: self-contained HTML string. |
| `tools/preview.mjs` | ZeRoUI | **MODIFY** — swap `widgetsToSVG` → `widgetsToHTML`; write `.html`; update console hints. |
| `tools/svg.mjs` | ZeRoUI | **MODIFY** — one-line fix: render black `FILL_RECT` as solid (not skip). |

No new npm dependencies.

---

## `tools/html.mjs` — Canvas Renderer

### Inputs

```js
export function widgetsToHTML(widgets, { label = '', pageSlug = '' } = {})
```

Returns a self-contained HTML string.

### Layout inference

Derived entirely from the widget array — no layout object passed in.

| Property | How detected |
|---|---|
| `mainY` | `h` of the first full-width (`w >= 460`) black `FILL_RECT` with `y=0 AND h < 200` (the top mask; the bg rect has `h=480` and is excluded by the `h < 200` guard). |
| `mainBottom` | `y` of the first full-width black `FILL_RECT` with `y > 0` (the bottom mask). |
| `mainH` | `mainBottom - mainY` |
| `mainX`, `mainW` | Constants: `x=80`, `w=320` (consistent across all ZeRoUI layouts). |
| `titleWidget` | First `TEXT` widget at `y < mainY`. Null if none. |
| `actionWidget` | First `BUTTON` widget at `y >= mainBottom`. Null if none. |
| `scrollable` | `true` if a `VIEW_CONTAINER` widget exists in the array. |

### Scrollable content detection

When `scrollable` is true:
- **Scrollable widgets**: all widgets that appear *after* `VIEW_CONTAINER` in the array AND before the first full-width black `FILL_RECT` (top mask).
- **Fixed widgets**: everything else (bg, masks, title, action button).
- **Max scroll**: `max(0, (maxScrollableY - mainY) - mainH)` where `maxScrollableY = max(w.y + w.h)` over all scrollable widgets. Example: setup page has scrollable content reaching y=518, mainY=60, mainH=312 → maxScroll=146px.

### Canvas rendering (480×480)

Widgets are rendered in their original array order (z-order). The only difference for scrollable pages is that scrollable widgets get an additional clip + translation applied.

```
1. ctx.arc(240,240,240,0,2π) + ctx.clip() — clip all drawing to circle
2. For each widget in array (preserving z-order):
   a. If VIEW_CONTAINER → skip (no visual)
   b. If scrollable widget (between VIEW_CONTAINER and first full-width black FILL_RECT):
      - ctx.save()
      - clip to MAIN zone: ctx.rect(mainX, mainY, mainW, mainH); ctx.clip()
      - ctx.translate(0, -scrollY)
      - render widget at its original (x, y)
      - ctx.restore()
   c. Otherwise (bg, masks, title, action):
      - render widget at its original (x, y)
      - Black FILL_RECT → fill solid black (not skip)
3. Diagnostic overlay (drawn last, on top of everything):
   - MAIN zone: dashed green rect
   - TITLE zone: dashed orange rect (if detected)
   - ACTION zone: dashed blue rect (if detected)
   - Scroll indicator: "↕" glyph if scrollable
```

Note: the bg `FILL_RECT` (index 0, before `VIEW_CONTAINER`) is a fixed widget and renders first as a solid black base. Scrollable content is rendered on top of it with the MAIN clip.

### Font loading

```js
const font = new FontFace('Noto Sans', 'url(https://fonts.gstatic.com/s/notosans/v39/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A-9X6VLHvA.woff2)');
await font.load();
document.fonts.add(font);
// then draw canvas
```

Fallback font stack: `'Noto Sans', system-ui, -apple-system, sans-serif`.

All text drawn with: `ctx.font = \`${fontSize}px 'Noto Sans', system-ui, sans-serif\``.

### Widget rendering

| Widget type | Canvas rendering |
|---|---|
| `FILL_RECT` | `ctx.fillStyle = hexColor(w.color); ctx.roundRect(x,y,w,h,radius); ctx.fill()` — **black renders solid** |
| `TEXT` | Align via `ctx.textAlign` + `ctx.textBaseline = 'middle'`; `y = w.y + w.h/2` |
| `BUTTON` | `roundRect` fill with `normal_color`, then centered text with `color` |
| `ARC` | `ctx.arc` stroke with `color` and `line_width` |
| `VIEW_CONTAINER` | No visual output — used only for scrollable detection |
| `IMG` | Dark placeholder rect + "IMG" label |

### Scroll interactivity (scrollable pages only)

```js
let scrollY = 0;
const maxScroll = /* computed from widget bounds */;

canvas.addEventListener('wheel', e => {
  scrollY = Math.max(0, Math.min(maxScroll, scrollY + e.deltaY * 0.5));
  render(scrollY);
  e.preventDefault();
}, { passive: false });

// Touch support
let touchStartY = 0;
canvas.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; });
canvas.addEventListener('touchmove', e => {
  const dy = touchStartY - e.touches[0].clientY;
  touchStartY = e.touches[0].clientY;
  scrollY = Math.max(0, Math.min(maxScroll, scrollY + dy));
  render(scrollY);
  e.preventDefault();
}, { passive: false });
```

The ACTION button area (`y >= mainBottom`) is always drawn at its fixed screen position regardless of `scrollY` (it's a fixed widget).

### HTML page structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{pageSlug} — ZeRoUI preview</title>
  <style>
    body { background: #0d0d0d; display: flex; flex-direction: column;
           align-items: center; padding: 32px; font-family: system-ui; }
    canvas { border-radius: 50%; cursor: grab; }
    .info { color: #8e8e93; font-size: 13px; margin-top: 12px; }
  </style>
</head>
<body>
  <canvas id="watch" width="480" height="480"></canvas>
  <p class="info">{label}{scrollHint}</p>
  <script>
    const WIDGETS = /* embedded JSON */;
    /* rendering + scroll code */
  </script>
</body>
</html>
```

`{scrollHint}` = `" — scroll to see full content"` if scrollable, else `""`.

---

## `tools/svg.mjs` — Mask Bug Fix

One-line change in `renderWidget()`:

```js
// Before:
if (w._type === 'FILL_RECT' && (w.color === 0 || w.color === 0x000000)) return '';

// After:
if (w._type === 'FILL_RECT' && (w.color === 0 || w.color === 0x000000) && w.w < 460) return '';
```

Full-width black `FILL_RECT`s (`w >= 460`) now render as solid black in SVG, correctly hiding masked content via z-order. Small black `FILL_RECT`s (`w < 460`, e.g. empty heatmap cells) are still skipped (OLED transparency simulation).

---

## `tools/preview.mjs` — Output Switch

```js
// Before:
import { widgetsToSVG } from './svg.mjs';
// ...
const svg = widgetsToSVG(widgets, { label });
const outPath = `/tmp/zepp-preview-${pageSlug}.svg`;
writeFileSync(outPath, svg, 'utf-8');
// ...
console.log(`Open:    open ${outPath}`);
console.log(`To PNG:  qlmanage -t -s 480 -o /tmp ${outPath}`);

// After:
import { widgetsToHTML } from './html.mjs';
// ...
const html = widgetsToHTML(widgets, { label, pageSlug });
const outPath = `/tmp/zepp-preview-${pageSlug}.html`;
writeFileSync(outPath, html, 'utf-8');
// ...
console.log(`Open:    open ${outPath}`);
```

All console diagnostic output (widget list, circle boundary check, ghost chip check, text overflow check) is unchanged.

---

## Diagnostic Overlay Spec

Drawn after all content (topmost layer, inside circle clip):

| Zone | Color | Style | Condition |
|---|---|---|---|
| MAIN | `#30d158` (green) | 1.5px dashed `[6, 4]` rect | Always |
| TITLE | `#ff9f0a` (orange) | 1.5px dashed `[6, 4]` rect | If `titleWidget` exists |
| ACTION | `#007aff` (blue) | 1.5px dashed `[6, 4]` rect | If `actionWidget` exists |
| Scroll indicator | `#30d158` | "↕" at `x=mainX+mainW+8, y=mainY+mainH/2` | If `scrollable` |

Zone labels (small text, same color, 11px):
- `"MAIN"` at top-left corner of MAIN rect: `(mainX+4, mainY+14)`
- `"ACTION"` at top-left corner of ACTION rect
- `"TITLE"` at top-left corner of TITLE rect

---

## Verification

After implementation, run from `zepp-meditation/`:

```bash
npm run preview-page home   # opens /tmp/zepp-preview-home.html
npm run preview-page setup  # scroll to see Rounds section below fold
npm run preview-page stats  # heatmap + circle boundary
```

Visual checks:
- `home`: Stats ghost chip has dark pill, no overflow above/below MAIN zone
- `setup`: Rounds section hidden behind mask at initial load; scroll reveals it; Start button stays pinned
- `stats`: all 4 heatmap rows visible within circle

Existing Vitest tests in ZeRoUI must still pass (they use `svg.mjs` indirectly via rendering, but the one-line fix doesn't affect test logic):

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI && npm test
```

Expected: 98/98 tests pass.
