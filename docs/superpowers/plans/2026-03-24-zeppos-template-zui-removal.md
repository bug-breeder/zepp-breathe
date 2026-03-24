# zeppos-app-template: Remove zeppos-zui Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `zeppos-zui` entirely from `bug-breeder/zeppos-app-template` and replace all ZUI-based scaffolding with proven raw `hmUI` patterns.

**Architecture:** Pure cleanup — 5 targeted file edits in a cloned local copy of the template repo, verified with `npm run verify` after each task, committed individually, pushed once at the end.

**Tech Stack:** GitHub (gh CLI), git, Node.js/npm, zeus CLI (ZeppOS build tool — must be installed globally: `npm install -g @zeppos/zeus-cli`)

---

## Setup: Clone the template repo

Before starting any task, clone the template locally if it isn't already:

```bash
# Check if already cloned
ls ~/Code/Others/zeppos-app-template 2>/dev/null || \
  git clone https://github.com/bug-breeder/zeppos-app-template.git ~/Code/Others/zeppos-app-template

cd ~/Code/Others/zeppos-app-template
npm install
```

All task steps below assume the working directory is `~/Code/Others/zeppos-app-template`.

> **Auth note:** If `git push` fails with 403, run:
>
> ```bash
> unset GITHUB_TOKEN
> gh auth switch --user bug-breeder
> ```

---

## Task 1: Remove `zeppos-zui` from `package.json`

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Confirm the dependency exists**

```bash
grep -n "zeppos-zui" package.json
```

Expected: `"zeppos-zui": "^1.0.0"` in the `dependencies` block.

- [ ] **Step 2: Remove the `dependencies` block**

Edit `package.json` — delete the entire `"dependencies"` key and its value. It was the only production dependency, so the block disappears entirely.

Before (at the end of the file):

```json
  "dependencies": {
    "zeppos-zui": "^1.0.0"
  }
}
```

After:

```json
}
```

- [ ] **Step 3: Reinstall to update `package-lock.json`**

```bash
npm install
```

Expected: `zeppos-zui` removed from `node_modules/` and `package-lock.json`.

- [ ] **Step 4: Confirm no stray dependency**

```bash
grep "zeppos-zui" package.json package-lock.json
```

Expected: zero matches in **both** files. If `package-lock.json` still contains `zeppos-zui` after `npm install`, the install did not complete cleanly — investigate before proceeding.

- [ ] **Step 5: Run verify**

```bash
npm run verify
```

Expected: lint + format + zeus build all pass, zero errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove zeppos-zui dependency"
```

---

## Task 2: Remove stale ZUI references in `utils/constants.js` and `CLAUDE.md`

**Files:**

- Modify: `utils/constants.js`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Confirm the stale comment in `utils/constants.js`**

```bash
grep -n "zeppos-zui" utils/constants.js
```

Expected: one match — the JSDoc line: `// For ZUI-based pages, prefer ZUI theme tokens (textColors, systemColors) imported from 'zeppos-zui'.`

- [ ] **Step 2: Remove the ZUI comment from `utils/constants.js`**

In `utils/constants.js`, in the JSDoc block at the top (around line 10–11), delete this line:

```js
// For ZUI-based pages, prefer ZUI theme tokens (textColors, systemColors)
// imported from 'zeppos-zui'.
```

(It may be one line or split across two — delete the whole sentence.)

- [ ] **Step 3: Confirm the stale table entry in `CLAUDE.md`**

```bash
grep -n "ZUI component reference" CLAUDE.md
```

Expected: one match in the Slash Commands table. **If zero matches — this fix was already applied; skip Step 4 and go to Step 5.**

- [ ] **Step 4: Fix the Slash Commands table entry in `CLAUDE.md`**

Find this line in the Slash Commands table:

```
| `/zeppos [question]`   | Full ZeppOS API cheatsheet + ZUI component reference |
```

Replace with:

```
| `/zeppos [question]`   | Full ZeppOS API cheatsheet                           |
```

- [ ] **Step 5: Verify no zeppos-zui remains in these two files**

```bash
grep "zeppos-zui\|ZUI component" utils/constants.js CLAUDE.md
```

Expected: zero matches.

- [ ] **Step 6: Run verify**

```bash
npm run verify
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add utils/constants.js CLAUDE.md
git commit -m "chore: remove stale ZUI references from constants and CLAUDE.md"
```

---

## Task 3: Overhaul `.claude/commands/zeppos.md`

Four changes to one file: remove ZUI section, fix touch bullet, replace page scaffold, add 2 gotchas.

**Files:**

- Modify: `.claude/commands/zeppos.md`

- [ ] **Step 1: Confirm ZUI section exists**

```bash
grep -n "ZUI Component Reference" .claude/commands/zeppos.md
```

Expected: one match with a line number.

- [ ] **Step 2: Confirm the deletion boundaries before removing**

```bash
grep -n "## ZUI Component Reference\|## Page Scaffold\|state\.set" .claude/commands/zeppos.md
```

Expected output (line numbers will vary):

- `## ZUI Component Reference (\`zeppos-zui\`)` — start of block to delete
- `state.set(...)` line — last meaningful line of the State subsection, near the end of the ZUI block
- `## Page Scaffold` — the line that should follow immediately after deletion

Note the line numbers for the ZUI section start and the `## Page Scaffold` line — delete everything between them (exclusive of `## Page Scaffold`).

- [ ] **Step 3: Remove the entire "ZUI Component Reference" section**

Delete everything from:

```
## ZUI Component Reference (`zeppos-zui`)
```

up to (but not including) the line:

```
## Page Scaffold (copy this pattern)
```

This removes ~80 lines covering the import block, Layout, Text, Button, Switch, ListItem, Feedback, and State subsections.

After deletion, `## Page Scaffold` follows directly after the `---` separator ending the `@zos/bg-service` section.

- [ ] **Step 4: Confirm the deletion worked**

```bash
grep -n "zeppos-zui\|CircularLayout\|VStack\|textColors" .claude/commands/zeppos.md
```

Expected: zero matches. If any remain, the deletion was incomplete.

- [ ] **Step 5: Fix the touch bullet under `### UI — @zos/ui`**

Find:

```
- Touch: `.addEventListener(hmUI.event.CLICK_UP, callback)` on any widget
```

Replace with:

```
- Touch: Use `hmUI.widget.BUTTON` with `click_func` for reliable tap handling. `FILL_RECT.addEventListener(hmUI.event.CLICK_UP, fn)` silently fails on real devices.
```

- [ ] **Step 6: Replace the "Page Scaffold" section**

Find the entire `## Page Scaffold (copy this pattern)` section and replace it with:

````markdown
## Page Scaffold (copy this pattern)

```js
import hmUI from '@zos/ui';
import { COLOR, TYPOGRAPHY } from '../../utils/constants';
// import { push, pop } from '@zos/router'; // uncomment when you need navigation

Page({
  onInit(params) {
    // Reset any module-level state here (vars persist across page visits)
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
````

- [ ] **Step 7: Add 2 new gotchas at the end of the "ZeppOS Gotchas" list**

The list currently ends at item 11 (icon path). Append after it:

```markdown
12. **ZUI layout containers are broken** — `zeppos-zui` `VStack`/`CircularLayout` places all children at `y=0` because it reads child sizes before children are laid out. Use raw `hmUI` with explicit `{ x, y, w, h }` instead.
13. **`FILL_RECT` touch is unreliable** — `FILL_RECT.addEventListener(hmUI.event.CLICK_UP, fn)` silently fails on device. Always use `hmUI.widget.BUTTON` with `click_func` for tap targets.
```

- [ ] **Step 8: Verify no ZUI content remains in the file**

```bash
grep -n "zeppos-zui\|CircularLayout\|VStack\|textColors\|pageRoot" .claude/commands/zeppos.md
```

Expected: zero matches.

- [ ] **Step 9: Run verify**

```bash
npm run verify
```

Expected: zero errors.

- [ ] **Step 10: Commit**

```bash
git add .claude/commands/zeppos.md
git commit -m "chore: remove ZUI section from /zeppos command; update page scaffold and gotchas"
```

---

## Task 4: Replace ZUI scaffold in `.claude/commands/new-page.md`

**Files:**

- Modify: `.claude/commands/new-page.md`

- [ ] **Step 1: Confirm current scaffold uses ZUI**

```bash
grep -n "zeppos-zui\|CircularLayout" .claude/commands/new-page.md
```

Expected: matches in the Step 2 scaffold block.

- [ ] **Step 2: Replace the page scaffold in Step 2**

Find the entire code block inside `## Step 2: Create the page file` (from ` ```js ` through the closing ` ``` `) and replace with:

````markdown
```js
/**
 * [PageName] page
 */

import hmUI from '@zos/ui';
import { COLOR, TYPOGRAPHY } from '../../utils/constants';
// import { push, pop } from '@zos/router'; // uncomment when you need navigation

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
````

- [ ] **Step 3: Fix Step 4 — change `npm run lint` to `npm run verify`**

Find in `## Step 4: Verify`:

```
Run `npm run lint` — expect 0 errors.
```

Replace with:

```
Run `npm run verify` — expect 0 errors (lint + format + zeus build).
```

- [ ] **Step 4: Verify no ZUI content remains**

```bash
grep -n "zeppos-zui\|CircularLayout\|VStack\|textColors\|pageRoot" .claude/commands/new-page.md
```

Expected: zero matches.

- [ ] **Step 5: Run verify**

```bash
npm run verify
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add .claude/commands/new-page.md
git commit -m "chore: replace ZUI page scaffold with raw hmUI in /new-page command"
```

---

## Task 5: Final verification and push

- [ ] **Step 1: Confirm zero zeppos-zui references in all source files**

```bash
grep -r "zeppos-zui" . \
  --include="*.js" --include="*.json" --include="*.md" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=dist
```

Expected: zero matches.

- [ ] **Step 2: Run full verify one last time**

```bash
npm run verify
```

Expected: zero errors.

- [ ] **Step 3: Check commits produced by this plan**

```bash
git log --oneline origin/main..HEAD
```

Expected: 4 lines (one per task). If you see 0 lines, all commits were already pushed incrementally — that's fine, proceed to Step 4. If you see more than 4, something was committed outside the plan — investigate before pushing.

- [ ] **Step 4: Push to origin**

```bash
unset GITHUB_TOKEN
gh auth switch --user bug-breeder
git push origin main
```

Expected: `main -> main` push success.
