# ZeRoUI Unit Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Vitest unit test suite to the ZeRoUI package that catches regressions in y-tracking math, chip color logic, configure() mutation, and renderPage z-order — all without needing a ZeppOS device or simulator.

**Architecture:** Vitest aliases `@zos/ui` to a mock that captures all `hmUI.createWidget()` calls. Tests import source files directly and assert on mock call arguments. All tests run in Node.js — no device needed. Implementation already exists; tests verify it is correct.

**Tech Stack:** Vitest 2.x, Node.js ES modules, `vi.fn()` mocks

---

## File Map

**Create in `/Users/alanguyen/Code/Others/ZeRoUI/`:**
- `vitest.config.js` — alias `@zos/ui` to mock, node environment
- `test/__mocks__/zos-ui.js` — hmUI mock (createWidget, deleteWidget, widget types, align, prop)
- `test/tokens.test.js` — configure() mutation, COLOR.PRIMARY_LIGHT default
- `test/layout.test.js` — LAYOUT coordinate spot-checks, zone presence
- `test/column.test.js` — y-tracking per method, chip variants, color resolution, lifecycle
- `test/page.test.js` — renderPage z-order, buildFn col param, return value, action variant
- `test/chrome.test.js` — actionButton variant colors, title zone placement

**Modify in `/Users/alanguyen/Code/Others/ZeRoUI/`:**
- `package.json` — add `"type": "module"`, test scripts, vitest devDependency

---

## Task 1: Vitest Infrastructure

**Files:**
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/package.json`
- Create: `/Users/alanguyen/Code/Others/ZeRoUI/vitest.config.js`
- Create: `/Users/alanguyen/Code/Others/ZeRoUI/test/__mocks__/zos-ui.js`

- [ ] **Step 1: Update `package.json`**

Add `"type": "module"` (required for ES module source files to work under Node/Vitest), test scripts, and vitest devDependency. The full updated file:

```json
{
  "name": "@bug-breeder/zeroui",
  "version": "0.2.0",
  "type": "module",
  "description": "ZeRoUI — ZeppOS Rounded UI library with safe zones, chips, and layout helpers for round OLED watches",
  "main": "index.js",
  "files": ["index.js", "src/"],
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": ["zeppos", "zepp", "watch", "ui", "round", "oled"],
  "license": "MIT",
  "devDependencies": {
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Install vitest**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI && npm install
```

Expected: `node_modules/vitest/` created.

- [ ] **Step 3: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    alias: {
      '@zos/ui': resolve(__dirname, 'test/__mocks__/zos-ui.js'),
    },
  },
});
```

- [ ] **Step 4: Create `test/__mocks__/zos-ui.js`**

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

- [ ] **Step 5: Verify infra runs with no test files**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI && npm test
```

Expected output (no test files found, but no crash):
```
No test files found, exiting with code 0
```

- [ ] **Step 6: Commit**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git add package.json package-lock.json vitest.config.js test/__mocks__/zos-ui.js
git commit -m "feat: add Vitest infrastructure with @zos/ui mock"
```

---

## Task 2: tokens.test.js

**Files:**
- Create: `/Users/alanguyen/Code/Others/ZeRoUI/test/tokens.test.js`

- [ ] **Step 1: Create `test/tokens.test.js`**

```js
import { afterEach, describe, expect, it } from 'vitest';
import { COLOR, configure } from '../src/tokens.js';

// Reset to default green accent after every test — configure() mutates COLOR in place
afterEach(() => configure({ accent: 'green' }));

describe('configure()', () => {
  it('sets all four PRIMARY tokens for a named preset', () => {
    configure({ accent: 'blue' });
    expect(COLOR.PRIMARY).toBe(0x007aff);
    expect(COLOR.PRIMARY_LIGHT).toBe(0x4da3ff);
    expect(COLOR.PRIMARY_TINT).toBe(0x001f4d);
    expect(COLOR.PRIMARY_PRESSED).toBe(0x0051d5);
  });

  it('accepts a custom accent object', () => {
    configure({ accent: { primary: 0x123456 } });
    expect(COLOR.PRIMARY).toBe(0x123456);
  });

  it('partial custom object only mutates provided keys', () => {
    const before = COLOR.PRIMARY_LIGHT;
    configure({ accent: { primary: 0x123456 } });
    expect(COLOR.PRIMARY_LIGHT).toBe(before); // untouched
  });

  it('ignores unknown preset name', () => {
    const before = COLOR.PRIMARY;
    configure({ accent: 'neon' });
    expect(COLOR.PRIMARY).toBe(before);
  });

  it('is a no-op when called with no args', () => {
    const before = COLOR.PRIMARY;
    configure();
    expect(COLOR.PRIMARY).toBe(before);
  });

  it('resets to green defaults', () => {
    configure({ accent: 'blue' });
    configure({ accent: 'green' });
    expect(COLOR.PRIMARY).toBe(0x30d158);
    expect(COLOR.PRIMARY_LIGHT).toBe(0x52d985);
  });
});

describe('COLOR defaults', () => {
  it('PRIMARY_LIGHT is 0x52d985 by default', () => {
    expect(COLOR.PRIMARY_LIGHT).toBe(0x52d985);
  });

  it('BG is 0x000000', () => {
    expect(COLOR.BG).toBe(0x000000);
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI && npx vitest run test/tokens.test.js
```

Expected:
```
✓ test/tokens.test.js (8 tests)
```

- [ ] **Step 3: Commit**

```bash
git add test/tokens.test.js
git commit -m "test: add tokens.test.js — configure() and COLOR defaults"
```

---

## Task 3: layout.test.js

**Files:**
- Create: `/Users/alanguyen/Code/Others/ZeRoUI/test/layout.test.js`

- [ ] **Step 1: Create `test/layout.test.js`**

```js
import { describe, expect, it } from 'vitest';
import { LAYOUT } from '../src/layout.js';

describe('LAYOUT.FULL', () => {
  it('MAIN zone has correct coordinates', () => {
    expect(LAYOUT.FULL.MAIN).toEqual({ x: 80, y: 74, w: 320, h: 312 });
  });

  it('TITLE zone has correct coordinates', () => {
    expect(LAYOUT.FULL.TITLE).toEqual({ x: 120, y: 24, w: 240, h: 44 });
  });

  it('ACTION zone has correct coordinates', () => {
    expect(LAYOUT.FULL.ACTION).toEqual({ x: 140, y: 392, w: 200, h: 48 });
  });
});

describe('LAYOUT.MINIMAL', () => {
  it('MAIN zone has correct coordinates', () => {
    expect(LAYOUT.MINIMAL.MAIN).toEqual({ x: 80, y: 62, w: 320, h: 354 });
  });

  it('has no TITLE zone', () => {
    expect(LAYOUT.MINIMAL.TITLE).toBeUndefined();
  });

  it('has no ACTION zone', () => {
    expect(LAYOUT.MINIMAL.ACTION).toBeUndefined();
  });
});

describe('LAYOUT.NO_ACTION', () => {
  it('has no ACTION zone', () => {
    expect(LAYOUT.NO_ACTION.ACTION).toBeUndefined();
  });

  it('has TITLE and MAIN zones', () => {
    expect(LAYOUT.NO_ACTION.TITLE).toBeDefined();
    expect(LAYOUT.NO_ACTION.MAIN).toBeDefined();
  });
});

describe('LAYOUT.NO_TITLE', () => {
  it('has no TITLE zone', () => {
    expect(LAYOUT.NO_TITLE.TITLE).toBeUndefined();
  });

  it('has MAIN and ACTION zones', () => {
    expect(LAYOUT.NO_TITLE.MAIN).toBeDefined();
    expect(LAYOUT.NO_TITLE.ACTION).toBeDefined();
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI && npx vitest run test/layout.test.js
```

Expected:
```
✓ test/layout.test.js (10 tests)
```

- [ ] **Step 3: Commit**

```bash
git add test/layout.test.js
git commit -m "test: add layout.test.js — LAYOUT coordinate values and zone presence"
```

---

## Task 4: column.test.js

**Files:**
- Create: `/Users/alanguyen/Code/Others/ZeRoUI/test/column.test.js`

- [ ] **Step 1: Create `test/column.test.js`**

```js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import hmUI from './__mocks__/zos-ui.js';
import { Column } from '../src/column.js';
import { COLOR } from '../src/tokens.js';

const zone = { x: 80, y: 74, w: 320, h: 312 };

beforeEach(() => vi.clearAllMocks());

// ── Y-tracking ────────────────────────────────────────────────────────────────

describe('Column y-tracking', () => {
  it('starts at zone.y', () => {
    const col = new Column(zone);
    expect(col.currentY).toBe(74);
  });

  it('label() advances by caption+4 height plus sm gap', () => {
    const col = new Column(zone);
    col.label('X');
    expect(col.currentY).toBe(116); // 74 + (30+4) + 8
  });

  it('text() with default size advances by body+4 plus sm gap', () => {
    const col = new Column(zone);
    col.text('X');
    expect(col.currentY).toBe(126); // 74 + (40+4) + 8
  });

  it('text() with largeTitle size advances by largeTitle+4 plus sm gap', () => {
    const col = new Column(zone);
    col.text('X', { size: 'largeTitle' });
    expect(col.currentY).toBe(146); // 74 + (60+4) + 8
  });

  it('heroNumber() advances by largeTitle+4 plus sm gap', () => {
    const col = new Column(zone);
    col.heroNumber(42);
    expect(col.currentY).toBe(146); // 74 + (60+4) + 8
  });

  it('chip() advances by 48 plus chipGap', () => {
    const col = new Column(zone);
    col.chip('X');
    expect(col.currentY).toBe(126); // 74 + 48 + 4
  });

  it('chipRow() advances by 48 plus chipGap (one row, any count)', () => {
    const col = new Column(zone);
    col.chipRow(['A', 'B', 'C']);
    expect(col.currentY).toBe(126); // 74 + 48 + 4
  });

  it('card() advances by h plus chipGap', () => {
    const col = new Column(zone);
    col.card({ title: 'x', value: '7', h: 80 });
    expect(col.currentY).toBe(158); // 74 + 80 + 4
  });

  it('spacer() advances by n with no widget', () => {
    const col = new Column(zone);
    col.spacer(16);
    expect(col.currentY).toBe(90); // 74 + 16
    expect(hmUI.createWidget).not.toHaveBeenCalled();
  });

  it('progressBar() advances by barH + 2*sm', () => {
    const col = new Column(zone);
    col.progressBar(0.5);
    expect(col.currentY).toBe(98); // 74 + 8 + 8*2
  });

  it('divider() advances by 1 + 2*xs', () => {
    const col = new Column(zone);
    col.divider();
    expect(col.currentY).toBe(83); // 74 + 1 + 4*2
  });

  it('widget() advances by explicit h', () => {
    const col = new Column(zone);
    col.widget('FILL_RECT', { x: 80, y: 74, w: 320, h: 100 }, 100);
    expect(col.currentY).toBe(174); // 74 + 100
  });

  it('multiple methods accumulate y correctly', () => {
    const col = new Column(zone);
    col.label('Section');   // +42 → 116
    col.chip('A');           // +52 → 168
    col.chip('B');           // +52 → 220
    expect(col.currentY).toBe(220);
  });
});

// ── Chip variants ─────────────────────────────────────────────────────────────

describe('Column chip variants', () => {
  it('default unselected uses SURFACE background and TEXT color', () => {
    const col = new Column(zone);
    col.chip('X', { variant: 'default', selected: false });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].normal_color).toBe(COLOR.SURFACE);
    expect(call[1].color).toBe(COLOR.TEXT);
  });

  it('default selected uses PRIMARY_TINT background and PRIMARY text', () => {
    const col = new Column(zone);
    col.chip('X', { variant: 'default', selected: true });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].normal_color).toBe(COLOR.PRIMARY_TINT);
    expect(call[1].color).toBe(COLOR.PRIMARY);
  });

  it('primary variant uses PRIMARY background', () => {
    const col = new Column(zone);
    col.chip('X', { variant: 'primary' });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].normal_color).toBe(COLOR.PRIMARY);
  });

  it('secondary variant uses SECONDARY background', () => {
    const col = new Column(zone);
    col.chip('X', { variant: 'secondary' });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].normal_color).toBe(COLOR.SECONDARY);
  });

  it('danger variant uses DANGER text color', () => {
    const col = new Column(zone);
    col.chip('X', { variant: 'danger' });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].color).toBe(COLOR.DANGER);
  });

  it('ghost variant uses BG background and TEXT_MUTED text', () => {
    const col = new Column(zone);
    col.chip('X', { variant: 'ghost' });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].normal_color).toBe(COLOR.BG);
    expect(call[1].color).toBe(COLOR.TEXT_MUTED);
  });
});

// ── chipRow selected logic ────────────────────────────────────────────────────

describe('Column chipRow selected logic', () => {
  it('default variant: selected chip gets PRIMARY_TINT, others get SURFACE', () => {
    const col = new Column(zone);
    col.chipRow(['1', '2', '3'], { selected: '2', variant: 'default' });
    const calls = hmUI.createWidget.mock.calls;
    expect(calls[0][1].normal_color).toBe(COLOR.SURFACE);   // '1' unselected
    expect(calls[1][1].normal_color).toBe(COLOR.PRIMARY_TINT); // '2' selected
    expect(calls[2][1].normal_color).toBe(COLOR.SURFACE);   // '3' unselected
  });

  it('primary variant: all chips use PRIMARY regardless of selected', () => {
    const col = new Column(zone);
    col.chipRow(['A', 'B'], { selected: 'A', variant: 'primary' });
    const calls = hmUI.createWidget.mock.calls;
    expect(calls[0][1].normal_color).toBe(COLOR.PRIMARY);
    expect(calls[1][1].normal_color).toBe(COLOR.PRIMARY);
  });
});

// ── Text color resolution ─────────────────────────────────────────────────────

describe('Column text color resolution', () => {
  it("color:'warning' resolves to COLOR.WARNING", () => {
    const col = new Column(zone);
    col.text('X', { color: 'warning' });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].color).toBe(COLOR.WARNING);
  });

  it("color:'muted' resolves to COLOR.TEXT_MUTED", () => {
    const col = new Column(zone);
    col.text('X', { color: 'muted' });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].color).toBe(COLOR.TEXT_MUTED);
  });

  it('raw hex number passes through unchanged', () => {
    const col = new Column(zone);
    col.text('X', { color: 0xabcdef });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].color).toBe(0xabcdef);
  });

  it('label() defaults to COLOR.TEXT_MUTED', () => {
    const col = new Column(zone);
    col.label('X');
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].color).toBe(COLOR.TEXT_MUTED);
  });
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────

describe('Column lifecycle', () => {
  it('clearContent() resets currentY to zone.y', () => {
    const col = new Column(zone);
    col.chip('A');
    col.chip('B');
    col.chip('C');
    col.clearContent();
    expect(col.currentY).toBe(zone.y);
  });

  it('clearContent() calls deleteWidget for each tracked widget', () => {
    const col = new Column(zone);
    col.chip('A');
    col.chip('B');
    col.chip('C');
    vi.clearAllMocks(); // reset counts before clearContent
    col.clearContent();
    expect(hmUI.deleteWidget).toHaveBeenCalledTimes(3);
  });

  it('scrollable: finalize() calls setProperty on the VIEW_CONTAINER', () => {
    const col = new Column(zone, { scrollable: true });
    col.chip('A');
    col.finalize();
    // VIEW_CONTAINER is the first createWidget call in a scrollable column
    const container = hmUI.createWidget.mock.results[0].value;
    expect(container.setProperty).toHaveBeenCalledWith('MORE', {
      h: expect.any(Number),
    });
  });

  it('scrollable: finalize() sets h >= zone.h', () => {
    const col = new Column(zone, { scrollable: true });
    col.finalize(); // no content — h should be at least zone.h
    const container = hmUI.createWidget.mock.results[0].value;
    const callArgs = container.setProperty.mock.calls[0];
    expect(callArgs[1].h).toBeGreaterThanOrEqual(zone.h);
  });

  it('non-scrollable: finalize() is a no-op', () => {
    const col = new Column(zone); // non-scrollable — no VIEW_CONTAINER
    col.chip('A');
    col.finalize();
    // The chip widget should not have had setProperty called on it
    const chipWidget = hmUI.createWidget.mock.results[0].value;
    expect(chipWidget.setProperty).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI && npx vitest run test/column.test.js
```

Expected:
```
✓ test/column.test.js (28 tests)
```

- [ ] **Step 3: Commit**

```bash
git add test/column.test.js
git commit -m "test: add column.test.js — y-tracking, chip variants, color resolution, lifecycle"
```

---

## Task 5: page.test.js

**Files:**
- Create: `/Users/alanguyen/Code/Others/ZeRoUI/test/page.test.js`

- [ ] **Step 1: Create `test/page.test.js`**

```js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import hmUI from './__mocks__/zos-ui.js';
import { renderPage } from '../src/page.js';
import { LAYOUT } from '../src/layout.js';
import { COLOR } from '../src/tokens.js';

beforeEach(() => vi.clearAllMocks());

describe('renderPage z-order', () => {
  it('creates FILL_RECT bg as the very first widget', () => {
    renderPage({ layout: LAYOUT.FULL, buildFn: () => {} });
    const firstCall = hmUI.createWidget.mock.calls[0];
    expect(firstCall[0]).toBe('FILL_RECT');
    expect(firstCall[1]).toMatchObject({ x: 0, y: 0, w: 480, h: 480, color: COLOR.BG });
  });

  it('creates a top mask FILL_RECT when MAIN.y > 0', () => {
    renderPage({ layout: LAYOUT.FULL, buildFn: () => {} });
    const rects = hmUI.createWidget.mock.calls.filter(c => c[0] === 'FILL_RECT');
    // LAYOUT.FULL.MAIN.y = 74 > 0, so top mask is created
    const topMask = rects.find(c => c[1].y === 0 && c[1].h === LAYOUT.FULL.MAIN.y);
    expect(topMask).toBeDefined();
  });

  it('creates a bottom mask FILL_RECT below MAIN', () => {
    renderPage({ layout: LAYOUT.FULL, buildFn: () => {} });
    const mainBottom = LAYOUT.FULL.MAIN.y + LAYOUT.FULL.MAIN.h; // 386
    const rects = hmUI.createWidget.mock.calls.filter(c => c[0] === 'FILL_RECT');
    const bottomMask = rects.find(c => c[1].y === mainBottom);
    expect(bottomMask).toBeDefined();
  });

  it('creates title TEXT when title and layout.TITLE are provided', () => {
    renderPage({ layout: LAYOUT.FULL, title: 'My Page', buildFn: () => {} });
    const textCalls = hmUI.createWidget.mock.calls.filter(c => c[0] === 'TEXT');
    const titleWidget = textCalls.find(c => c[1].text === 'My Page');
    expect(titleWidget).toBeDefined();
    expect(titleWidget[1].y).toBe(LAYOUT.FULL.TITLE.y);
  });

  it('does not create title TEXT when layout has no TITLE zone', () => {
    renderPage({ layout: LAYOUT.MINIMAL, title: 'Ignored', buildFn: () => {} });
    const textCalls = hmUI.createWidget.mock.calls.filter(c => c[0] === 'TEXT');
    expect(textCalls).toHaveLength(0);
  });

  it('creates action BUTTON when action and layout.ACTION are provided', () => {
    renderPage({
      layout: LAYOUT.FULL,
      buildFn: () => {},
      action: { text: 'Go', onPress: () => {} },
    });
    const buttonCalls = hmUI.createWidget.mock.calls.filter(c => c[0] === 'BUTTON');
    expect(buttonCalls).toHaveLength(1);
    expect(buttonCalls[0][1].text).toBe('Go');
  });
});

describe('renderPage column param and return value', () => {
  it('buildFn receives a Column instance', () => {
    let received = null;
    renderPage({ layout: LAYOUT.FULL, buildFn: (c) => { received = c; } });
    expect(received).not.toBeNull();
    expect(typeof received.chip).toBe('function');
    expect(typeof received.finalize).toBe('function');
  });

  it('returns the same column instance passed to buildFn', () => {
    let buildFnCol = null;
    const returned = renderPage({ layout: LAYOUT.FULL, buildFn: (c) => { buildFnCol = c; } });
    expect(returned).toBe(buildFnCol);
  });
});

describe('renderPage scrollable param', () => {
  it('creates VIEW_CONTAINER by default (scrollable:true)', () => {
    renderPage({ layout: LAYOUT.FULL, buildFn: () => {} });
    const types = hmUI.createWidget.mock.calls.map(c => c[0]);
    expect(types).toContain('VIEW_CONTAINER');
  });

  it('does not create VIEW_CONTAINER when scrollable:false', () => {
    renderPage({ layout: LAYOUT.FULL, scrollable: false, buildFn: () => {} });
    const types = hmUI.createWidget.mock.calls.map(c => c[0]);
    expect(types).not.toContain('VIEW_CONTAINER');
  });
});

describe('renderPage action variant', () => {
  it('action button uses PRIMARY by default', () => {
    renderPage({
      layout: LAYOUT.FULL,
      buildFn: () => {},
      action: { text: 'Go', onPress: () => {} },
    });
    const buttons = hmUI.createWidget.mock.calls.filter(c => c[0] === 'BUTTON');
    expect(buttons[0][1].normal_color).toBe(COLOR.PRIMARY);
  });

  it('action button uses SECONDARY when variant is secondary', () => {
    renderPage({
      layout: LAYOUT.FULL,
      buildFn: () => {},
      action: { text: 'Go', onPress: () => {}, variant: 'secondary' },
    });
    const buttons = hmUI.createWidget.mock.calls.filter(c => c[0] === 'BUTTON');
    expect(buttons[0][1].normal_color).toBe(COLOR.SECONDARY);
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI && npx vitest run test/page.test.js
```

Expected:
```
✓ test/page.test.js (12 tests)
```

- [ ] **Step 3: Commit**

```bash
git add test/page.test.js
git commit -m "test: add page.test.js — renderPage z-order, col param, scrollable, action variant"
```

---

## Task 6: chrome.test.js

**Files:**
- Create: `/Users/alanguyen/Code/Others/ZeRoUI/test/chrome.test.js`

- [ ] **Step 1: Create `test/chrome.test.js`**

```js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import hmUI from './__mocks__/zos-ui.js';
import { actionButton, title } from '../src/chrome.js';
import { LAYOUT } from '../src/layout.js';
import { COLOR } from '../src/tokens.js';

beforeEach(() => vi.clearAllMocks());

describe('actionButton()', () => {
  it('uses PRIMARY by default', () => {
    actionButton('Go', { onPress: () => {} });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[0]).toBe('BUTTON');
    expect(call[1].normal_color).toBe(COLOR.PRIMARY);
    expect(call[1].press_color).toBe(COLOR.PRIMARY_PRESSED);
  });

  it('uses SECONDARY for secondary variant', () => {
    actionButton('Cancel', { onPress: () => {}, variant: 'secondary' });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].normal_color).toBe(COLOR.SECONDARY);
    expect(call[1].press_color).toBe(COLOR.SECONDARY_PRESSED);
  });

  it('places button in ACTION zone by default', () => {
    actionButton('Go', { onPress: () => {} });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].x).toBe(LAYOUT.FULL.ACTION.x);
    expect(call[1].y).toBe(LAYOUT.FULL.ACTION.y);
    expect(call[1].w).toBe(LAYOUT.FULL.ACTION.w);
    expect(call[1].h).toBe(LAYOUT.FULL.ACTION.h);
  });
});

describe('title()', () => {
  it('uses LAYOUT.FULL.TITLE zone by default', () => {
    title('My Page');
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[0]).toBe('TEXT');
    expect(call[1].x).toBe(LAYOUT.FULL.TITLE.x);
    expect(call[1].y).toBe(LAYOUT.FULL.TITLE.y);
    expect(call[1].w).toBe(LAYOUT.FULL.TITLE.w);
    expect(call[1].h).toBe(LAYOUT.FULL.TITLE.h);
  });

  it('uses provided layout.TITLE zone when specified', () => {
    title('My Page', { layout: LAYOUT.NO_ACTION });
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].x).toBe(LAYOUT.NO_ACTION.TITLE.x);
    expect(call[1].y).toBe(LAYOUT.NO_ACTION.TITLE.y);
  });

  it('renders the text prop correctly', () => {
    title('Hello World');
    const call = hmUI.createWidget.mock.calls[0];
    expect(call[1].text).toBe('Hello World');
  });
});
```

- [ ] **Step 2: Run and verify all pass**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI && npx vitest run test/chrome.test.js
```

Expected:
```
✓ test/chrome.test.js (6 tests)
```

- [ ] **Step 3: Commit**

```bash
git add test/chrome.test.js
git commit -m "test: add chrome.test.js — actionButton variant, title zone placement"
```

---

## Task 7: Full run, docs update, and push

**Files:**
- Modify: `/Users/alanguyen/Code/Others/ZeRoUI/CLAUDE.md`

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI && npm test
```

Expected output:
```
✓ test/tokens.test.js (8 tests)
✓ test/layout.test.js (10 tests)
✓ test/column.test.js (28 tests)
✓ test/page.test.js (12 tests)
✓ test/chrome.test.js (6 tests)

Test Files  5 passed (5)
Tests       64 passed (64)
```

- [ ] **Step 2: Add `npm test` to ZeRoUI CLAUDE.md dev commands table**

In `/Users/alanguyen/Code/Others/ZeRoUI/CLAUDE.md`, find the Dev Commands table and add a test row:

```markdown
| `npm test`         | Run unit tests (Vitest)     |
| `npm run test:watch` | Tests in watch mode       |
```

- [ ] **Step 3: Push ZeRoUI**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git add CLAUDE.md
git commit -m "docs: add npm test to dev commands"
git push
```

If push fails with auth: `unset GITHUB_TOKEN && gh auth switch --user bug-breeder` then retry.

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| `vitest.config.js` with `@zos/ui` alias | Task 1 |
| `test/__mocks__/zos-ui.js` mock | Task 1 |
| `package.json` `"type":"module"`, scripts, devDep | Task 1 |
| `afterEach(() => configure({ accent: 'green' }))` | Task 2 (tokens) |
| configure() blue preset sets all 4 PRIMARY tokens | Task 2 |
| configure() unknown preset no-op | Task 2 |
| configure() partial custom object | Task 2 |
| COLOR.PRIMARY_LIGHT default | Task 2 |
| LAYOUT.FULL.MAIN coordinates | Task 3 |
| LAYOUT.MINIMAL has no TITLE/ACTION | Task 3 |
| LAYOUT.NO_ACTION/NO_TITLE zone presence | Task 3 |
| y-tracking for all 12 Column methods | Task 4 |
| Cumulative y chaining | Task 4 |
| All 6 chip variants (default/primary/secondary/danger/ghost + selected) | Task 4 |
| chipRow default variant selected logic | Task 4 |
| chipRow non-default variant ignores selected | Task 4 |
| Text color: warning, muted, raw hex, label default | Task 4 |
| clearContent() resets y + calls deleteWidget | Task 4 |
| scrollable finalize() calls setProperty | Task 4 |
| non-scrollable finalize() is no-op | Task 4 |
| renderPage bg as first FILL_RECT | Task 5 |
| top mask and bottom mask creation | Task 5 |
| title TEXT created with layout.TITLE | Task 5 |
| no title TEXT when layout has no TITLE | Task 5 |
| action BUTTON created | Task 5 |
| buildFn receives Column instance | Task 5 |
| renderPage returns same col as buildFn receives | Task 5 |
| scrollable:true creates VIEW_CONTAINER | Task 5 |
| scrollable:false no VIEW_CONTAINER | Task 5 |
| action variant primary/secondary | Task 5 |
| actionButton variant primary/secondary colors | Task 6 |
| actionButton placement in ACTION zone | Task 6 |
| title default zone | Task 6 |
| title custom layout zone | Task 6 |

All spec requirements covered. ✓
