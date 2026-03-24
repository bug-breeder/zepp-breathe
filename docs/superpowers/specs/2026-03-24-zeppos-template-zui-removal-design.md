# zeppos-app-template: Remove zeppos-zui Design

**Goal:** Remove `zeppos-zui` entirely from the template and replace all ZUI-based scaffolding with raw `hmUI` patterns, based on firsthand bugs discovered building zepp-breathe.

**Architecture:** Pure cleanup — no new code, no new utilities. Every file change either deletes ZUI content or replaces it with the already-proven raw hmUI equivalent.

**Repo:** `bug-breeder/zeppos-app-template`

---

## Background: Why Remove ZUI

Two bugs discovered while building zepp-breathe make `zeppos-zui` unsuitable as the default recommendation:

1. **Layout containers are broken.** `VStack` / `CircularLayout` call `calculateLayout()` and read child dimensions before children know their own size. Every child returns `{h:0, w:0}`, so all children are placed at `y=0` — everything overlaps. This is not fixable at the call site; the library is internally broken.

2. **`FILL_RECT` touch is unreliable.** `FILL_RECT.addEventListener(hmUI.event.CLICK_UP, fn)` silently fails on real devices. The only reliable touch handler is `hmUI.widget.BUTTON` with `click_func`.

The template's "golden example" (`pages/home/index.js`) previously used `CircularLayout + VStack`, meaning every developer who copied it got a broken starting point. Two files were already fixed before this spec was written; this spec covers the remaining cleanup.

---

## Files Changed

| File                           | Change                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `pages/home/index.js`          | **Already done** — rewritten to raw hmUI                                                          |
| `CLAUDE.md`                    | **Already done** — ZUI warning + 2 new gotchas; minor leftover fix needed in slash commands table |
| `package.json`                 | Remove `zeppos-zui` from `dependencies` (was the only production dep)                             |
| `utils/constants.js`           | Remove stale ZUI reference in JSDoc comment                                                       |
| `.claude/commands/zeppos.md`   | Remove ZUI section; fix touch bullet; replace page scaffold; add 2 gotchas                        |
| `.claude/commands/new-page.md` | Replace ZUI scaffold with raw hmUI scaffold; fix Step 4 to use `npm run verify`                   |
| `global.d.ts`                  | No change — already ZUI-free                                                                      |

---

## Detailed Changes

### 1. `package.json`

Remove the `dependencies` block entirely (`zeppos-zui` was the only entry):

```json
// Remove:
"dependencies": {
  "zeppos-zui": "^1.0.0"
}
```

### 2. `CLAUDE.md` (minor fix)

Fix the slash commands table — still references "ZUI component reference" from the earlier partial update:

```
// Before:
| `/zeppos [question]`   | Full ZeppOS API cheatsheet + ZUI component reference |

// After:
| `/zeppos [question]`   | Full ZeppOS API cheatsheet                           |
```

### 3. `.claude/commands/zeppos.md`

**3a. Remove the "ZUI Component Reference" section** — the entire block from:

```
## ZUI Component Reference (`zeppos-zui`)
```

through the end of the `State` subsection. This is ~80 lines covering `CircularLayout`, `VStack`, `HStack`, `ScrollView`, `Text`, `Button`, `Switch`, `ListItem`, `showToast`, `createState`, etc.

**3b. Fix the touch bullet under `@zos/ui`**

Before:

```
- Touch: `.addEventListener(hmUI.event.CLICK_UP, callback)` on any widget
```

After:

```
- Touch: Use `hmUI.widget.BUTTON` with `click_func` for reliable tap handling.
  `FILL_RECT.addEventListener(hmUI.event.CLICK_UP, fn)` silently fails on real devices.
```

**3c. Replace the "Page Scaffold" section**

Before (ZUI-based):

```js
import { CircularLayout, VStack, Text, textColors } from 'zeppos-zui';
let pageRoot = null;
Page({
  onInit(params) { pageRoot = null; ... },
  build() {
    pageRoot = new CircularLayout({ safeAreaEnabled: true, children: [
      new VStack({ spacing: 16, children: [
        new Text({ text: 'Page Title', textStyle: 'title', color: textColors.title }),
      ]}),
    ]});
    pageRoot.mount();
  },
  onDestroy() { if (pageRoot) { pageRoot.destroy(); pageRoot = null; } },
});
```

After (raw hmUI):

```js
import hmUI from '@zos/ui';
import { COLOR, TYPOGRAPHY } from '../../utils/constants';
// import { push, pop } from '@zos/router';

Page({
  onInit(params) {
    // Reset any module-level state here
    try {
      const p = params ? JSON.parse(params) : {};
      console.log('[PageName] params:', p);
    } catch {
      console.log('[PageName] no params');
    }
  },

  build() {
    // Black OLED background
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 0, y: 0, w: 480, h: 480, color: COLOR.BG });

    // Title — centered on 480×480 canvas
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 200,
      w: 360,
      h: 48,
      text: 'Page Title',
      text_size: TYPOGRAPHY.title,
      color: COLOR.TEXT,
      align_h: hmUI.align.CENTER_H,
    });
  },

  onDestroy() {
    // hmUI widgets destroyed automatically
    // offGesture(); offKey(); vibrator.stop(); — if used
  },
});
```

**3d. Add 2 gotchas** at the end of the "ZeppOS Gotchas" list:

```
12. **ZUI layout containers are broken** — `zeppos-zui` `VStack`/`CircularLayout` places all
    children at y=0 because it reads child sizes before children are laid out.
    Use raw hmUI with explicit { x, y, w, h } instead.

13. **FILL_RECT touch is unreliable** — `FILL_RECT.addEventListener(hmUI.event.CLICK_UP, fn)`
    silently fails on device. Always use `hmUI.widget.BUTTON` with `click_func` for tap targets.
```

### 3e. `utils/constants.js`

Remove the ZUI cross-reference in the JSDoc block at the top of the file:

```js
// Remove this line:
// For ZUI-based pages, prefer ZUI theme tokens (textColors, systemColors) imported from 'zeppos-zui'.
```

Everything else in the file is correct and stays unchanged.

---

### 4. `.claude/commands/new-page.md`

Replace the page scaffold in **Step 2** with raw hmUI. The three lifecycle methods (`onInit`, `build`, `onDestroy`) remain, but `onInit` no longer resets a `pageRoot` variable — the new scaffold has no module-level vars (hmUI widgets are destroyed automatically). Also fix **Step 4** to run `npm run verify` (lint + format + zeus build) instead of just `npm run lint`.

```js
/**
 * [PageName] page
 */

import hmUI from '@zos/ui';
import { COLOR, TYPOGRAPHY } from '../../utils/constants';
// import { push, pop } from '@zos/router';

Page({
  onInit(params) {
    // Reset module-level state here (vars persist across page visits)
    try {
      const p = params ? JSON.parse(params) : {};
      console.log('[[PageName]] onInit params:', JSON.stringify(p));
    } catch {
      console.log('[[PageName]] onInit: no params');
    }
  },

  build() {
    console.log('[[PageName]] build');

    // Black OLED background
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 0, y: 0, w: 480, h: 480, color: COLOR.BG });

    // Page title — centered on 480×480 canvas
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 200,
      w: 360,
      h: 48,
      text: '[PageName]',
      text_size: TYPOGRAPHY.title,
      color: COLOR.TEXT,
      align_h: hmUI.align.CENTER_H,
    });
  },

  onDestroy() {
    console.log('[[PageName]] onDestroy');
    // hmUI widgets destroyed automatically
    // offGesture() / offKey() — from '@zos/interaction'
    // vibrator.stop()         — if Vibrator was started
  },
});
```

---

## What Does NOT Change

- `utils/constants.js` — ZUI comment removed; everything else unchanged
- `utils/storage.js` — correct and ZUI-free
- `app.json` — correct
- `app.js` — correct
- `app-service/index.js` — correct and ZUI-free
- `global.d.ts` — ZUI-free already
- No new utilities added (common utils belong in a separate library, not the template)

---

## Verification

After implementation:

- `npm install` in a fresh clone should NOT install `zeppos-zui`
- `npm run verify` passes (lint + format + zeus build)
- Running `/new-page Test` scaffolds a raw hmUI page with no ZUI imports
- No string `zeppos-zui` appears anywhere in the repo except possibly `.gitignore` / lockfiles
