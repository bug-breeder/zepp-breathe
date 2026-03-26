# ZeRoUI API Reference

## Zone values (480-unit design canvas)

### ZONE (legacy single-mode)
```js
ZONE.TITLE:  { x: 120, y: 24,  w: 240, h: 44  }
ZONE.MAIN:   { x: 80,  y: 74,  w: 320, h: 312 }
ZONE.ACTION: { x: 140, y: 392, w: 200, h: 48  }
```

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

### LAYOUT.MAIN_ONLY
```js
LAYOUT.MAIN_ONLY.MAIN: { x: 80,  y: 62,  w: 320, h: 354 }
```

---

## renderPage() full signature

```js
renderPage({
  layout,     // required: LAYOUT.FULL | NO_TITLE | NO_ACTION | MAIN_ONLY
  buildFn,    // required: function() — no arguments, create Column content here
  title,      // optional: string — page title text
  action,     // optional: { text: string, onPress: () => void }
})
```

Render order (z-order, low to high):
1. `FILL_RECT` 0,0,480,480 with `COLOR.BG` (black)
2. `buildFn()` — Column content
3. Top mask `FILL_RECT` from y=0 to `layout.MAIN.y` — only if MAIN.y > 0
4. Title `TEXT` — only if `title` string + `layout.TITLE` exists
5. Bottom mask `FILL_RECT` from `layout.MAIN.y + layout.MAIN.h` to 480
6. Action `BUTTON` — only if `action` object + `layout.ACTION` exists

---

## column() signature

```js
column(zone, opts)
// zone: { x, y, w, h } — typically one of the LAYOUT mode zones
// opts.scrollable: boolean (default false)
//   true  → creates VIEW_CONTAINER at zone bounds, child widgets use absolute screen coords
//   false → no container, all widgets placed directly
// returns: Column instance
```

---

## Column method signatures

```js
col.sectionLabel(text: string): widget
// Creates TEXT widget, h=34, TYPOGRAPHY.caption, COLOR.TEXT_MUTED, centered
// Gap after: SPACING.sm (8)

col.chip(text: string, { selected?: boolean, onPress?: () => void }): widget
// Creates BUTTON, h=48, RADIUS.chip
// selected=true: normal_color=PRIMARY_TINT, color=PRIMARY
// selected=false: normal_color=SURFACE, color=TEXT
// Gap after: SPACING.chipGap (4)

col.chipRow(options: string[], { selected?: string, onPress?: (val: string) => void }): widget[]
// Creates N equal-width BUTTON chips in a row, h=48, gap=SPACING.sm between chips
// Matches selected by String() equality
// Gap after: SPACING.chipGap (4)

col.spacer(n: number): void
// Advances col.y by n units — no widget created

col.finalize(): void
// Scrollable only: sets VIEW_CONTAINER h to Math.max(contentH, zone.h)
// No-op for non-scrollable. Call after every batch of additions.

col.clearContent(): void
// Destroys all child widgets, resets y to startY, keeps VIEW_CONTAINER alive
// Use in rebuild loops

col.destroyAll(): void
// Destroys child widgets + VIEW_CONTAINER. Only call in page onDestroy().

col.currentY: number (read-only)
// Current y position — end of last added item
```

---

## Component signatures

```js
bg(): widget
// FILL_RECT 0,0,480,480 COLOR.BG — call first in build()

title(text: string): widget
// TEXT in ZONE.TITLE, TYPOGRAPHY.subheadline, COLOR.TEXT, centered

column(zone = ZONE.MAIN, opts = {}): Column
// See column() section above

actionButton(text: string, { onPress?: () => void } = {}): widget
// BUTTON in ZONE.ACTION, RADIUS.chip, COLOR.PRIMARY normal / COLOR.PRIMARY_PRESSED

heroText(text: string | number, { y: number, color = COLOR.TEXT } = {}): widget
// Large centered TEXT at absolute y, TYPOGRAPHY.largeTitle, width = ZONE.MAIN.w

statCard({ y: number, w = 320, h = 80, title: string, value: string|number, valueColor = COLOR.TEXT }): widget[]
// Returns [bgWidget, valueWidget, labelWidget]
// Card centered horizontally, SURFACE bg, RADIUS.card
// value: TYPOGRAPHY.title at y+10; title: TYPOGRAPHY.caption at y+h-30, TEXT_MUTED
```

---

## Token tables

### COLOR
| Token | Hex |
|---|---|
| `BG` | `0x000000` |
| `SURFACE` | `0x1c1c1e` |
| `SURFACE_PRESSED` | `0x2c2c2e` |
| `SURFACE_BORDER` | `0x2c2c2e` |
| `PRIMARY` | `0x30d158` |
| `PRIMARY_TINT` | `0x0c2415` |
| `PRIMARY_PRESSED` | `0x25a244` |
| `SECONDARY` | `0x007aff` |
| `SECONDARY_PRESSED` | `0x0051d5` |
| `DANGER` | `0xfa5151` |
| `SUCCESS` | `0x34c759` |
| `WARNING` | `0xff9f0a` |
| `TEXT` | `0xffffff` |
| `TEXT_MUTED` | `0x8e8e93` |
| `TEXT_DISABLED` | `0x3a3a3c` |

### TYPOGRAPHY
| Token | Size | Use |
|---|---|---|
| `largeTitle` | 60 | hero numbers |
| `title` | 44 | section titles |
| `body` | 40 | body text |
| `subheadline` | 34 | chips, buttons, page title |
| `caption` | 30 | labels, hints (minimum legible) |

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
