# ZeRoUI Test Suite — Design Spec

**Date:** 2026-03-31
**Repo:** ZeRoUI (`/Users/alanguyen/Code/Others/ZeRoUI/`)
**Problem:** ZeRoUI v0.2.0 was rewritten with zero automated tests. The only check is `npm run verify` (lint + build) in zepp-meditation — it catches syntax errors but nothing about runtime behavior.

---

## Problem Statement

ZeRoUI wraps `hmUI.createWidget()` which only runs on ZeppOS hardware or the Zeus simulator. But **most of ZeRoUI's value is pure logic**: y-tracking math, color resolution, configure() mutation, zone coordinate lookups. Only the final `createWidget()` calls are side effects — and those are trivial to mock.

The dangerous gap: changing `_slot()` math or `_chipColors()` silently breaks things until they render wrong on device.

Consumer misuse (forgetting `finalize()`, calling `destroyAll()` mid-page) is already guarded by `.claude/rules/pages.md` path-scoped rules in zepp-meditation. Library regressions are what's currently unguarded.

---

## Approach: Vitest Unit Tests with hmUI Mock

**Why Vitest:** ZeRoUI uses ES module syntax (`import/export`) throughout. Vitest handles this natively with zero Babel config. Jest requires transforms.

**Why unit tests (not simulator):** Simulator tests add CI complexity, require device setup, and are 10× slower. The logic errors we want to catch (wrong y math, wrong colors) are fully testable without rendering.

**Mock strategy:** A vitest alias points `@zos/ui` → `test/__mocks__/zos-ui.js`. Every `hmUI.createWidget()` call returns a tracked object. No `vi.mock()` needed per test file.

---

## File Structure

```
ZeRoUI/
  vitest.config.js            — alias @zos/ui to mock, configure test env
  test/
    __mocks__/
      zos-ui.js               — hmUI mock
    tokens.test.js            — configure(), COLOR tokens
    layout.test.js            — LAYOUT coordinate values
    column.test.js            — Column y-tracking, chip variants, color resolution, lifecycle
    page.test.js              — renderPage z-order, col param, return value
    chrome.test.js            — actionButton variant, title zone
```

---

## Section 1 — Test Infrastructure

### `vitest.config.js`

```js
import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: {
    alias: {
      '@zos/ui': new URL('./test/__mocks__/zos-ui.js', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
  },
});
```

### `test/__mocks__/zos-ui.js`

```js
import { vi } from 'vitest';

export default {
  createWidget: vi.fn((type, props) => {
    const w = { _type: type, ...props };
    w.setProperty = vi.fn();
    return w;
  }),
  deleteWidget: vi.fn(),
  widget: {
    TEXT: 'TEXT',
    BUTTON: 'BUTTON',
    FILL_RECT: 'FILL_RECT',
    VIEW_CONTAINER: 'VIEW_CONTAINER',
    IMG: 'IMG',
  },
  align: { CENTER_H: 'CENTER_H', LEFT: 'LEFT', RIGHT: 'RIGHT' },
  prop: { MORE: 'MORE' },
};
```

### `package.json` additions

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
},
"devDependencies": {
  "vitest": "^2.0.0"
}
```

### Test hygiene rules

- `beforeEach(() => vi.clearAllMocks())` in all files that use the mock
- `afterEach(() => configure({ accent: 'green' }))` in any test that calls `configure()` — accent mutation leaks between tests otherwise

---

## Section 2 — Test Coverage

### `tokens.test.js` (no mock needed — pure JS)

```
configure({ accent: 'blue' })         → COLOR.PRIMARY = 0x007aff
configure({ accent: 'blue' })         → COLOR.PRIMARY_LIGHT = 0x4da3ff
configure({ accent: 'blue' })         → COLOR.PRIMARY_TINT = 0x001f4d
configure({ accent: 'blue' })         → COLOR.PRIMARY_PRESSED = 0x0051d5
configure({ accent: 'unknown' })      → COLOR.PRIMARY unchanged
configure({ accent: { primary: 0x123456 } }) → COLOR.PRIMARY = 0x123456 (partial ok)
configure()                            → no-op (no args)
configure({ accent: 'green' })        → resets to default green values
COLOR.PRIMARY_LIGHT default            → 0x52d985
```

### `layout.test.js` (no mock needed — pure data)

```
LAYOUT.FULL.MAIN               = { x:80, y:74, w:320, h:312 }
LAYOUT.FULL.TITLE              = { x:120, y:24, w:240, h:44 }
LAYOUT.FULL.ACTION             = { x:140, y:392, w:200, h:48 }
LAYOUT.MINIMAL.MAIN            = { x:80, y:62, w:320, h:354 }
LAYOUT.MINIMAL has no TITLE
LAYOUT.MINIMAL has no ACTION
LAYOUT.NO_ACTION has no ACTION
LAYOUT.NO_TITLE has no TITLE
```

### `column.test.js` (needs mock)

**Y-tracking** (zone = `{ x:80, y:74, w:320, h:312 }`):

```
new Column(zone)               → currentY = 74
col.label('X')                 → currentY = 74 + (30+4) + 8 = 116
col.text('X')                  → currentY = 74 + (40+4) + 8 = 126
col.text('X', {size:'largeTitle'}) → currentY = 74 + (60+4) + 8 = 146
col.heroNumber(42)             → currentY = 74 + (60+4) + 8 = 146
col.chip('X')                  → currentY = 74 + 48 + 4 = 126
col.chipRow(['A','B','C'])     → currentY = 74 + 48 + 4 = 126
col.card({ title:'x', value:'7', h:80 }) → currentY = 74 + 80 + 4 = 158
col.spacer(16)                 → currentY = 74 + 16 = 90
col.progressBar(0.5)           → currentY = 74 + (8 + 8*2) = 98
col.divider()                  → currentY = 74 + (1 + 4*2) = 83
col.widget(type, props, 100)   → currentY = 74 + 100 = 174
label + chip + chip (chained)  → correct cumulative y
```

**Chip variants** (`hmUI.createWidget` call args):

```
chip('X', { variant:'default', selected:false }) → normal_color=SURFACE, color=TEXT
chip('X', { variant:'default', selected:true })  → normal_color=PRIMARY_TINT, color=PRIMARY
chip('X', { variant:'primary' })                 → normal_color=PRIMARY
chip('X', { variant:'secondary' })               → normal_color=SECONDARY
chip('X', { variant:'danger' })                  → color (text)=DANGER
chip('X', { variant:'ghost' })                   → normal_color=BG, color=TEXT_MUTED
```

**chipRow selected logic:**

```
chipRow(['1','2','3'], { selected:'2', variant:'default' })
  → chip for '2' gets normal_color=PRIMARY_TINT
  → chips for '1','3' get normal_color=SURFACE

chipRow(['A','B'], { selected:'A', variant:'primary' })
  → ALL chips get normal_color=PRIMARY (variant overrides selected)
```

**Text color resolution:**

```
col.text('X', { color:'warning' })  → color prop = COLOR.WARNING
col.text('X', { color:'muted' })    → color prop = COLOR.TEXT_MUTED
col.text('X', { color:0xabcdef })   → color prop = 0xabcdef (raw hex passthrough)
col.label('X')                       → color prop = COLOR.TEXT_MUTED (default)
```

**Lifecycle:**

```
clearContent() after 3 chips  → currentY resets to zone.y
clearContent()                 → hmUI.deleteWidget called 3 times

scrollable column finalize()   → widget.setProperty called
finalize() sets h              → Math.max(contentH, zone.h)
non-scrollable finalize()      → setProperty NOT called (no-op)
```

### `page.test.js` (needs mock)

```
renderPage z-order:
  first createWidget call       → FILL_RECT at {x:0,y:0,w:480,h:480} with COLOR.BG
  buildFn called                → receives Column instance (not null)
  buildFn col === return value  → renderPage returns same column passed to buildFn

renderPage layout guards:
  LAYOUT.FULL  → top mask created (MAIN.y=74 > 0)
  LAYOUT.FULL  → title TEXT created when title string provided
  LAYOUT.FULL  → bottom mask created
  LAYOUT.FULL  → action BUTTON created when action provided

action variant:
  action: { variant:'secondary' } → BUTTON normal_color = COLOR.SECONDARY
  action: (no variant)            → BUTTON normal_color = COLOR.PRIMARY (default)

scrollable param:
  scrollable:true (default)  → VIEW_CONTAINER created
  scrollable:false           → no VIEW_CONTAINER created
```

### `chrome.test.js` (needs mock)

```
actionButton('Go', { variant:'primary' })   → BUTTON normal_color=COLOR.PRIMARY
actionButton('Go', { variant:'secondary' }) → BUTTON normal_color=COLOR.SECONDARY

title('X', { layout:LAYOUT.NO_ACTION })     → TEXT at NO_ACTION.TITLE coords
  x=120, y=24, w=240, h=44

title('X')                                  → TEXT at LAYOUT.FULL.TITLE (default)
```

---

## Non-Goals

- No simulator / device tests
- No visual snapshot tests
- No consumer-side integration tests (zepp-meditation pages) — those are covered by `npm run verify` + `.claude/rules/pages.md`
- No coverage thresholds — quality over quantity
