# Claude Code Ecosystem Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up comprehensive Claude Code configuration across the ZeppOS ecosystem — ZeRoUI, zepp-meditation, and zeppos-app-template — with correct CLAUDE.md files, progressive-disclosure skills, a review subagent, and fixed commands.

**Architecture:** Three repos share a skill layer (zeppos-platform + zeroui) and a review subagent. Skills live in `.claude/skills/`, agents in `.claude/agents/`. Skills in both app repos are identical — create once in zepp-meditation, copy to zeppos-app-template.

**Tech Stack:** Claude Code `.claude/` conventions, ZeRoUI (`@bug-breeder/zeroui`), ZeppOS 3.6/3.7, Node/npm

---

## Repo paths (reference throughout)

```
BREATHE = /Users/alanguyen/Code/Others/zepp-meditation
TEMPLATE = /Users/alanguyen/Code/Others/zeppos-app-template
ZEROUI = /Users/alanguyen/Code/Others/ZeRoUI
```

---

## Task 1: Settings infrastructure across all three repos

**Files:**
- Modify: `$BREATHE/.claude/settings.json`
- Modify: `$TEMPLATE/.claude/settings.json`
- Create: `$ZEROUI/.claude/settings.json`

- [ ] **Step 1: Update zepp-meditation settings.json**

Replace `$BREATHE/.claude/settings.json` with:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(npm install:*)",
      "Bash(zeus build:*)",
      "Bash(zeus dev:*)",
      "Bash(zeus preview:*)",
      "Bash(git add:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git commit:*)",
      "Bash(git checkout:*)",
      "Bash(git push:*)",
      "Bash(git branch:*)",
      "Bash(npx prettier:*)",
      "Bash(npx eslint:*)",
      "Bash(gh pr:*)",
      "Bash(gh auth:*)"
    ]
  }
}
```

- [ ] **Step 2: Update zeppos-app-template settings.json (identical)**

Replace `$TEMPLATE/.claude/settings.json` with the same content as Step 1.

- [ ] **Step 3: Create ZeRoUI settings.json**

Create `$ZEROUI/.claude/settings.json`:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(npm install:*)",
      "Bash(npm link:*)",
      "Bash(node:*)",
      "Bash(git add:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git commit:*)",
      "Bash(git checkout:*)",
      "Bash(git push:*)",
      "Bash(git branch:*)",
      "Bash(npx prettier:*)",
      "Bash(npx eslint:*)",
      "Bash(gh pr:*)",
      "Bash(gh auth:*)"
    ]
  }
}
```

- [ ] **Step 4: Verify builds still pass**

```bash
cd $BREATHE && npm run verify
cd $TEMPLATE && npm run verify
```

Expected: both pass with 0 errors.

- [ ] **Step 5: Commit each repo**

```bash
cd $BREATHE && git add .claude/settings.json && git commit -m "chore: add \$schema + git push/branch permissions to settings"
cd $TEMPLATE && git add .claude/settings.json && git commit -m "chore: add \$schema + git push/branch permissions to settings"
cd $ZEROUI && git add .claude/ && git commit -m "chore: add .claude/settings.json — npm/node/git permissions"
```

---

## Task 2: zepp-meditation CLAUDE.md update

**Files:**
- Modify: `$BREATHE/CLAUDE.md`

- [ ] **Step 1: Replace CLAUDE.md content**

Replace the entire content of `$BREATHE/CLAUDE.md` with:

```markdown
# Breathe

**App:** Haptic-guided breathing exercises for smartwatch
**App ID:** 10000001 (placeholder — get a real ID from [Zepp Open Platform](https://open.zepp.com/) and replace in `app.json`)
**Platform:** ZeppOS smartwatches (round OLED, all devices via `common` target)
**ZeppOS API:** 3.6 compatible / 3.7 target

---

## Setup (one-time, per machine)

```bash
git init                                    # must run before npm install (Husky needs git)
npm install                                 # installs deps + sets up pre-commit hook
npm install -g @zeppos/zeus-cli            # ZeppOS build tool (global)
zeus login                                  # required for device preview
```

---

## Platform Constraints

**Know these before writing any code:**

- **Runtime:** QuickJS (ES2020 subset) — no DOM, no Node.js, no browser APIs
- **UI:** Use ZeRoUI (`@bug-breeder/zeroui`) for all page layout.
  - `import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui'`
  - Raw `@zos/ui` (`hmUI`) only for widgets ZeRoUI doesn't cover (IMG, ARC, SCROLL_LIST, etc.)
- **Imports:** All ZeppOS platform APIs are `@zos/*`. UI library is `@bug-breeder/zeroui`.
- **Display:** Round OLED, 480px design canvas. **Black background saves battery** — OLED turns off black pixels.
- **App-services:** Single-shot — `onInit` runs once, 600ms timeout. Use alarm-chain (`@zos/alarm`) for recurring behavior.

---

## Project Structure

```
app.js                  App entry — globalData: {}. Never pass page data via globalData.
app.json                ZeppOS manifest — ALL pages + services MUST be registered here.
pages/
  home/index.js         Home page (golden example — copy this pattern for new pages)
app-service/
  index.js              Background service scaffold (alarm-chain pattern)
utils/
  constants.js          DEVICE_WIDTH/HEIGHT, supplemental COLOR tokens (for raw hmUI)
  storage.js            LocalStorage wrapper — get(), set(), getKey()
assets/
  common.r/             Target-specific assets (zeus resolves common + round → common.r)
    icon.png            App icon — must exist here for zeus build to pass
  raw/                  App images — widget paths are relative to assets/raw/
```

---

## Dev Commands

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `npm run dev`      | Build + launch in simulator (watches for changes)         |
| `npm run build`    | Build `.zab` installer → `dist/`                          |
| `npm run preview`  | Build + push to device (scan QR in Zepp app)              |
| `npm run verify`   | Lint + format check + build — **run before every commit** |
| `npm run lint:fix` | Auto-fix lint errors                                      |
| `npm run format`   | Auto-format all files                                     |

---

## Quality Gates

**Before marking any task done, verify all of these:**

- [ ] `npm run verify` passes — lint + format + zeus build, zero errors
- [ ] No `catch (e)` with unused `e` — use `catch { }` (no binding) or `catch (e) { console.log(e) }`
- [ ] No unused imports or variables
- [ ] New pages registered in `app.json` under `targets.common.module.page.pages`
- [ ] New app-services registered under `targets.common.module["app-service"].services`
- [ ] New permissions added to top-level `permissions` array if new `@zos/*` APIs are used
- [ ] `offGesture()` / `offKey()` called in `onDestroy` if registered in that page
- [ ] `vibrator.stop()` called in `onDestroy` if `Vibrator` was started
- [ ] Inter-page data passed via `params: JSON.stringify({...})` in `push()`/`replace()`, not `globalData`

---

## Top 7 Gotchas

1. **Widget null check** — always verify a widget reference is non-null before `widget.setProperty(...)`. Silently crashes otherwise.

2. **`replace()` vs `push()`** — use `replace({ url })` when you don't want a back-stack entry (e.g. result screen → home). Use `push({ url })` for normal navigation with back button.

3. **Module-level vars persist across page visits** — `let x = 0` at module scope is NOT reset when the user navigates away and returns. Reset ALL state explicitly in `onInit()`.

4. **App-service is single-shot** — `onInit` runs once (600ms timeout). For recurring behavior use:

   ```js
   setAlarm({ url: 'app-service/index', delay: 300 }); // from '@zos/alarm'
   ```

   `setInterval` is unreliable in services.

5. **Black background is mandatory** — Use `COLOR.BG` (`0x000000`) from `@bug-breeder/zeroui` on every page. OLED panels consume zero power for black pixels.

6. **Vibrator must be stopped** — Starting a `Vibrator` and navigating away without calling `vibrator.stop()` in `onDestroy` leaves it running indefinitely.

7. **Icon path for common target** — Zeus resolves `targets.common` + `platforms: [{"st":"r"}]` to the target name `common.r`. The app icon must be at `assets/common.r/icon.png` — NOT `assets/icon.png`.

---

## Slash Commands

| Command                | When to use                                       |
| ---------------------- | ------------------------------------------------- |
| `/zeppos [question]`   | Full ZeppOS API cheatsheet                        |
| `/new-page <PageName>` | Scaffold a new page and register it in `app.json` |
| `/review [PR#]`        | ZeppOS-aware automated PR review                  |
```

- [ ] **Step 2: Verify**

```bash
cd $BREATHE && wc -l CLAUDE.md   # expect ≤ 130
cd $BREATHE && npm run verify    # expect 0 errors
```

- [ ] **Step 3: Commit**

```bash
cd $BREATHE && git add CLAUDE.md && git commit -m "docs: update CLAUDE.md — Breathe app details, ZeRoUI UI section, remove stale ZUI gotchas"
```

---

## Task 3: zeppos-app-template CLAUDE.md update

**Files:**
- Modify: `$TEMPLATE/CLAUDE.md`

- [ ] **Step 1: Replace CLAUDE.md content**

Replace the entire content of `$TEMPLATE/CLAUDE.md` with:

```markdown
# [APP_NAME]

> **TODO:** Replace `[APP_NAME]`, `[APP_DESCRIPTION]`, and `[APP_ID]` with your app's details.

**App:** [APP_DESCRIPTION — one sentence]
**App ID:** [APP_ID — replace `10000001` in `app.json`; get a real ID from the [Zepp Open Platform](https://open.zepp.com/)]
**Platform:** ZeppOS smartwatches (round OLED, all devices via `common` target)
**ZeppOS API:** 3.6 compatible / 3.7 target

---

## Setup (one-time, per machine)

```bash
git init                                    # must run before npm install (Husky needs git)
npm install                                 # installs deps + sets up pre-commit hook
npm install -g @zeppos/zeus-cli            # ZeppOS build tool (global)
zeus login                                  # required for device preview
```

---

## Platform Constraints

**Know these before writing any code:**

- **Runtime:** QuickJS (ES2020 subset) — no DOM, no Node.js, no browser APIs
- **UI:** Use ZeRoUI (`@bug-breeder/zeroui`) for all page layout.
  - `import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui'`
  - Raw `@zos/ui` (`hmUI`) only for widgets ZeRoUI doesn't cover (IMG, ARC, SCROLL_LIST, etc.)
- **Imports:** All ZeppOS platform APIs are `@zos/*`. UI library is `@bug-breeder/zeroui`.
- **Display:** Round OLED, 480px design canvas. **Black background saves battery** — OLED turns off black pixels.
- **App-services:** Single-shot — `onInit` runs once, 600ms timeout. Use alarm-chain (`@zos/alarm`) for recurring behavior.

---

## Project Structure

```
app.js                  App entry — globalData: {}. Never pass page data via globalData.
app.json                ZeppOS manifest — ALL pages + services MUST be registered here.
pages/
  home/index.js         Home page (golden example — copy this pattern for new pages)
app-service/
  index.js              Background service scaffold (alarm-chain pattern)
utils/
  constants.js          DEVICE_WIDTH/HEIGHT, supplemental COLOR tokens (for raw hmUI)
  storage.js            LocalStorage wrapper — get(), set(), getKey()
assets/
  common.r/             Target-specific assets (zeus resolves common + round → common.r)
    icon.png            App icon — must exist here for zeus build to pass
  raw/                  App images — widget paths are relative to assets/raw/
```

---

## Dev Commands

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `npm run dev`      | Build + launch in simulator (watches for changes)         |
| `npm run build`    | Build `.zab` installer → `dist/`                          |
| `npm run preview`  | Build + push to device (scan QR in Zepp app)              |
| `npm run verify`   | Lint + format check + build — **run before every commit** |
| `npm run lint:fix` | Auto-fix lint errors                                      |
| `npm run format`   | Auto-format all files                                     |

---

## Quality Gates

**Before marking any task done, verify all of these:**

- [ ] `npm run verify` passes — lint + format + zeus build, zero errors
- [ ] No `catch (e)` with unused `e` — use `catch { }` (no binding) or `catch (e) { console.log(e) }`
- [ ] No unused imports or variables
- [ ] New pages registered in `app.json` under `targets.common.module.page.pages`
- [ ] New app-services registered under `targets.common.module["app-service"].services`
- [ ] New permissions added to top-level `permissions` array if new `@zos/*` APIs are used
- [ ] `offGesture()` / `offKey()` called in `onDestroy` if registered in that page
- [ ] `vibrator.stop()` called in `onDestroy` if `Vibrator` was started
- [ ] Inter-page data passed via `params: JSON.stringify({...})` in `push()`/`replace()`, not `globalData`

---

## Top 7 Gotchas

1. **Widget null check** — always verify a widget reference is non-null before `widget.setProperty(...)`. Silently crashes otherwise.

2. **`replace()` vs `push()`** — use `replace({ url })` when you don't want a back-stack entry (e.g. result screen → home). Use `push({ url })` for normal navigation with back button.

3. **Module-level vars persist across page visits** — `let x = 0` at module scope is NOT reset when the user navigates away and returns. Reset ALL state explicitly in `onInit()`.

4. **App-service is single-shot** — `onInit` runs once (600ms timeout). For recurring behavior use:

   ```js
   setAlarm({ url: 'app-service/index', delay: 300 }); // from '@zos/alarm'
   ```

   `setInterval` is unreliable in services.

5. **Black background is mandatory** — Use `COLOR.BG` (`0x000000`) from `@bug-breeder/zeroui` on every page. OLED panels consume zero power for black pixels.

6. **Vibrator must be stopped** — Starting a `Vibrator` and navigating away without calling `vibrator.stop()` in `onDestroy` leaves it running indefinitely.

7. **Icon path for common target** — Zeus resolves `targets.common` + `platforms: [{"st":"r"}]` to the target name `common.r`. The app icon must be at `assets/common.r/icon.png` — NOT `assets/icon.png`.

---

## Slash Commands

| Command                | When to use                                       |
| ---------------------- | ------------------------------------------------- |
| `/zeppos [question]`   | Full ZeppOS API cheatsheet                        |
| `/new-page <PageName>` | Scaffold a new page and register it in `app.json` |
| `/review [PR#]`        | ZeppOS-aware automated PR review                  |
```

- [ ] **Step 2: Verify**

```bash
cd $TEMPLATE && wc -l CLAUDE.md  # expect ≤ 130
cd $TEMPLATE && npm run verify   # expect 0 errors
```

- [ ] **Step 3: Commit**

```bash
cd $TEMPLATE && git add CLAUDE.md && git commit -m "docs: update CLAUDE.md — ZeRoUI UI section, remove stale ZUI gotchas, add 600ms timeout note"
```

---

## Task 4: ZeRoUI CLAUDE.md (new)

**Files:**
- Create: `$ZEROUI/CLAUDE.md`

- [ ] **Step 1: Create CLAUDE.md**

Create `$ZEROUI/CLAUDE.md`:

```markdown
# ZeRoUI — ZeppOS Rounded UI Library

**Package:** `@bug-breeder/zeroui`
**Purpose:** UI library for ZeppOS round-display apps — design tokens, safe-zone system, Column layout, and hmUI component wrappers.

---

## Library Development

### What this repo is

Plain npm package. No zeus, no ZeppOS app build. Entry point: `index.js`. Source: `src/`.

```
index.js          Re-exports everything (named + UI namespace)
src/
  tokens.js       COLOR, TYPOGRAPHY, RADIUS, SPACING
  zones.js        ZONE (legacy), LAYOUT (4 named modes)
  column.js       Column class — auto y-tracking + widget lifecycle
  components.js   bg, title, actionButton, heroText, statCard, renderPage
```

### Design principles

- **Pre-calculated positions from constants** — never read widget dimensions at runtime (that was zeppos-zui's fatal bug)
- **480-unit design coords throughout** — no `px()` calls anywhere in this library
- **Absolute screen coordinates** — even inside VIEW_CONTAINER (Column always uses screen coords)

### Adding a component

1. Add `export function myComponent(opts = {})` to `src/components.js` (or new `src/<name>.js` if large)
2. Import tokens from `./tokens.js`, zones from `./zones.js`
3. `hmUI.createWidget(...)` — return the widget or widget array (pure draw, no state)
4. In `index.js`: add to both `export { ... }` block and `export const UI = { ... }`

### Verify

```bash
npx eslint src/
node -e "import('./index.js').then(m => console.log(Object.keys(m)))"
```

Consumer apps use `"@bug-breeder/zeroui": "file:../ZeRoUI"` — run `npm install` in the consumer after changes.

---

## Consumer API Reference

### Import

```js
import { renderPage, column, LAYOUT, COLOR, TYPOGRAPHY, RADIUS } from '@bug-breeder/zeroui';
import { UI } from '@bug-breeder/zeroui'; // namespace form
```

### LAYOUT modes

| Mode | Zones | Use when |
|---|---|---|
| `LAYOUT.FULL` | TITLE + MAIN + ACTION | most pages |
| `LAYOUT.NO_TITLE` | MAIN + ACTION | no title bar |
| `LAYOUT.NO_ACTION` | TITLE + MAIN | no bottom button |
| `LAYOUT.MAIN_ONLY` | MAIN | fullscreen / immersive |

### renderPage()

```js
renderPage({
  layout: LAYOUT.FULL,
  buildFn() { /* create Column content here — no args */ },
  title: 'Page Title',          // optional
  action: { text: 'Go', onPress: () => {} }, // optional
});
```

Handles z-order: bg → buildFn → top mask → title → bottom mask → action.

### column() + Column

```js
const col = column(LAYOUT.FULL.MAIN, { scrollable: true });
col.sectionLabel('Section');
col.chip('Item', { selected: false, onPress: () => {} });
col.chipRow(['A', 'B'], { selected: 'A', onPress: (v) => {} });
col.spacer(16);
col.finalize();          // REQUIRED for scrollable — sets VIEW_CONTAINER height

// Rebuild: clearContent() + re-add + finalize()
// Teardown (onDestroy only): destroyAll()
```

### Key gotchas

- **`finalize()` required** for scrollable columns — missing it breaks scroll
- **`clearContent()` in rebuilds, `destroyAll()` only in `onDestroy`**
- **`buildFn` takes no args** — access `col` and `layout` via closure
- **Use `COLOR` from `@bug-breeder/zeroui`** — do not mix with `utils/constants.js` tokens

---

## Dev Commands

| Command | What it does |
|---|---|
| `npm install` | Install dev dependencies |
| `npx eslint src/` | Lint source |
| `node -e "import('./index.js').then(m => console.log(Object.keys(m)))"` | Verify exports |
```

- [ ] **Step 2: Verify line count**

```bash
wc -l $ZEROUI/CLAUDE.md   # expect ≤ 110
```

- [ ] **Step 3: Commit**

```bash
cd $ZEROUI && git add CLAUDE.md && git commit -m "docs: add CLAUDE.md — library dev guide + consumer API reference"
```

---

## Task 5: zeppos-platform skill (replaces zeppos.md command)

**Files:**
- Create: `$BREATHE/.claude/skills/zeppos-platform/SKILL.md`
- Create: `$BREATHE/.claude/skills/zeppos-platform/references/api.md`
- Delete: `$BREATHE/.claude/commands/zeppos.md`
- Mirror to: `$TEMPLATE/.claude/skills/zeppos-platform/` (identical)
- Delete: `$TEMPLATE/.claude/commands/zeppos.md`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p $BREATHE/.claude/skills/zeppos-platform/references
mkdir -p $TEMPLATE/.claude/skills/zeppos-platform/references
```

- [ ] **Step 2: Create SKILL.md**

Create `$BREATHE/.claude/skills/zeppos-platform/SKILL.md`:

```markdown
---
name: zeppos
description: Use when writing ZeppOS code, importing @zos/* APIs, or debugging platform behavior — hmUI widgets, router, storage, sensors, interaction, alarms, app-service patterns.
argument-hint: [question]
user-invocable: true
---

ZeppOS: QuickJS ES2020, 480-unit design canvas, round OLED 480×480px. No DOM, no Node.js.

## Gotchas

1. **Widget null check** — always check `if (widget)` before `widget.setProperty(...)`. Silent crash otherwise.

2. **Module-level state persists** — `let x = 0` at module scope is NOT reset on page revisit. Reset everything in `onInit()`.

3. **FILL_RECT touch unreliable** — `FILL_RECT.addEventListener(hmUI.event.CLICK_UP, fn)` silently fails on device. Always use `hmUI.widget.BUTTON` with `click_func` for tap targets.

4. **IMG w/h is clipping boundary, not scale** — images always render at their actual file dimensions. `w`/`h` define the visible clip area. Use `pos_x`/`pos_y` for offset within the boundary.

5. **App lifecycle order** — `App.onCreate()` fires before page `onInit()`. Never draw UI or access hmUI in `onCreate` — the page context doesn't exist yet.

6. **offGesture() / offKey() in onDestroy** — must call both if registered in the page, or they leak.

7. **vibrator.stop() in onDestroy** — vibration continues after page exit otherwise.

8. **createTimer leak** — `createTimer()` returns a `timerId`. Call `stopTimer(timerId)` in `onDestroy()`.

9. **params via JSON.stringify** — `push({ url, params: JSON.stringify({...}) })`. Never use `globalData` for page-to-page data.

10. **catch (e) unused** — use `catch { }` (ES2019 optional catch binding) or `catch (e) { console.log(e) }`.

11. **App-service: 600ms timeout** — single execution exits after `onInit` and has a 600ms system limit. Use `@zos/alarm` for recurrence. `setInterval` is unreliable in services.

12. **App-service file writes** — writes to `data://` only allowed when screen is off or in AOD mode.

13. **LocalStorage in app-service** — must instantiate directly: `import { LocalStorage } from '@zos/storage'; const s = new LocalStorage()`. Cannot use `utils/storage.js`.

14. **Icon path** — must be at `assets/common.r/icon.png`, not `assets/icon.png`.

15. **Text overflow** — set `text_style: hmUI.text_style.ELLIPSIS` for single-line truncation. Default (`NONE`) scrolls.

For full API reference: read `references/api.md`
```

- [ ] **Step 3: Create references/api.md**

Create `$BREATHE/.claude/skills/zeppos-platform/references/api.md` by starting with the current `$BREATHE/.claude/commands/zeppos.md` content and making these modifications:

**Remove these sections/lines:**
- The entire gotcha: "ZUI layout containers are broken — `zeppos-zui` `VStack`/`CircularLayout`..." (gotcha #12 in the file)
- Any remaining references to `zeppos-zui` or `CircularLayout`/`VStack`

**Change this line in the page scaffold:**
```js
// Before:
import { CircularLayout, VStack, Text, textColors } from 'zeppos-zui';

// After (remove the zeppos-zui import entirely, leave a comment):
// Use ZeRoUI for layout: import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui'
```

**Add after the existing hmUI widget catalog section:**

```markdown
### Timer — `createTimer` / `stopTimer`

```js
// delay_ms: first fire delay; repeat_ms: 0 = one-shot, >0 = interval
// option is passed as-is to callback each invocation
const timerId = createTimer(delay_ms, repeat_ms, callback, option);
stopTimer(timerId); // call in onDestroy — leaks if not stopped
```

### File system — `@zos/fs` (v3+)

```js
import { openSync, readSync, writeSync, closeSync, statSync } from '@zos/fs';

// Flags: O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_TRUNC, O_APPEND, O_EXCL
// Combine: O_RDWR | O_CREAT
// Path prefixes: 'assets://raw/data.txt' (read-only), 'data://settings.json' (read-write)
const fd = openSync({ path: 'data://config.json', flag: O_RDWR | O_CREAT });
// ... read/write/close
closeSync({ fd });
```

App-service file writes: only when screen is off or in AOD mode.

### Widget show_level (AOD / always-on display)

```js
hmUI.show_level.ONLY_NORMAL   // render in normal screen-on mode only
hmUI.show_level.ONAL_AOD      // render in screen-off / AOD mode only
// Set at widget creation: { ..., show_level: hmUI.show_level.ONLY_NORMAL }
```

### App-service system events

Register in `app.json` permissions and listen with `@zos/app-service`:
- `event:os.health.sleep_status` — sleep state change
- `event:os.health.heart_rate_abnl` — abnormal heart rate alert
- `event:os.health.wear_status` — wearing status change
- `event:os.system.sleep_mode` — sleep mode enter/exit (`{ status: 'enter' | 'exit' }`)
- `event:os.weather.sun_rise` / `sun_set` / `moon_rise` / `moon_set`

### text_style values

```js
hmUI.text_style.NONE      // scrolling text (default)
hmUI.text_style.ELLIPSIS  // single line, truncate with "..."
```
```

- [ ] **Step 4: Delete the old zeppos.md command**

```bash
rm $BREATHE/.claude/commands/zeppos.md
```

- [ ] **Step 5: Copy skill to zeppos-app-template**

```bash
cp -r $BREATHE/.claude/skills/zeppos-platform $TEMPLATE/.claude/skills/
rm $TEMPLATE/.claude/commands/zeppos.md
```

- [ ] **Step 6: Verify both builds pass**

```bash
cd $BREATHE && npm run verify
cd $TEMPLATE && npm run verify
```

- [ ] **Step 7: Commit**

```bash
cd $BREATHE && git add .claude/ && git commit -m "feat: add zeppos-platform skill (progressive disclosure), replace zeppos.md command"
cd $TEMPLATE && git add .claude/ && git commit -m "feat: add zeppos-platform skill, replace zeppos.md command"
```

---

## Task 6: zeroui skill

**Files:**
- Create: `$BREATHE/.claude/skills/zeroui/SKILL.md`
- Create: `$BREATHE/.claude/skills/zeroui/references/api.md`
- Mirror to: `$TEMPLATE/.claude/skills/zeroui/`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p $BREATHE/.claude/skills/zeroui/references
mkdir -p $TEMPLATE/.claude/skills/zeroui/references
```

- [ ] **Step 2: Create SKILL.md**

Create `$BREATHE/.claude/skills/zeroui/SKILL.md`:

```markdown
---
name: zeroui
description: Use when building pages with ZeRoUI (@bug-breeder/zeroui) — renderPage(), Column layout, LAYOUT modes, design tokens, or ZeRoUI-specific gotchas.
user-invocable: false
---

## Import

```js
import { renderPage, column, LAYOUT, COLOR, TYPOGRAPHY } from '@bug-breeder/zeroui';
import { UI } from '@bug-breeder/zeroui'; // namespace form
```

## LAYOUT modes

| Mode | Use when |
|---|---|
| `LAYOUT.FULL` | title + scrollable content + action button (most pages) |
| `LAYOUT.NO_TITLE` | no title bar, content starts higher |
| `LAYOUT.NO_ACTION` | no bottom button, content extends lower |
| `LAYOUT.MAIN_ONLY` | fullscreen / immersive / session pages |

## renderPage()

```js
renderPage({
  layout: LAYOUT.FULL,       // required
  buildFn() { ... },         // required — create Column content here; takes no args
  title: 'Page Title',       // optional string
  action: {                  // optional bottom button
    text: 'Label',
    onPress: () => {},
  },
});
```

Handles z-order: bg → buildFn output → top mask → title → bottom mask → action button.
`buildFn` takes **no arguments** — access `col` and `layout` via closure.

## column() + Column methods

```js
const col = column(LAYOUT.FULL.MAIN, { scrollable: true });
col.sectionLabel('Section name');           // muted caption label
col.chip('Label', { selected, onPress });   // full-width tappable chip
col.chipRow(['A','B','C'], { selected: 'B', onPress: (val) => {} }); // inline row
col.spacer(16);                             // add vertical gap
col.finalize();                             // REQUIRED after all items (scrollable)
// Rebuild: col.clearContent() → re-add items → col.finalize()
// Teardown: col.destroyAll() — call only in page onDestroy()
```

## Gotchas

1. **`col.finalize()` is required** — for scrollable columns, sets VIEW_CONTAINER total height. Missing it makes content unscrollable or clipped.

2. **Never `destroyAll()` mid-page** — kills VIEW_CONTAINER and breaks z-order for subsequent redraws. Use `clearContent()` + re-add + `finalize()` in rebuild loops instead.

3. **`buildFn` takes no args** — do not pass `layout` or `col` as arguments; access via closure.

4. **No double bottom mask** — `renderPage` adds its own FILL_RECT below MAIN. Do not add one yourself after `layout.MAIN.y + layout.MAIN.h`.

5. **Absolute coords inside VIEW_CONTAINER** — Column always uses absolute screen coordinates, not container-relative. This is intentional.

6. **Use ZeRoUI's COLOR** — import from `@bug-breeder/zeroui`. Do not mix with `utils/constants.js` COLOR (token values differ).

For full zone values and component signatures: read `references/api.md`
```

- [ ] **Step 3: Create references/api.md**

Create `$BREATHE/.claude/skills/zeroui/references/api.md`:

````markdown
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
````

- [ ] **Step 4: Copy to zeppos-app-template**

```bash
cp -r $BREATHE/.claude/skills/zeroui $TEMPLATE/.claude/skills/
```

- [ ] **Step 5: Commit**

```bash
cd $BREATHE && git add .claude/skills/zeroui/ && git commit -m "feat: add zeroui skill — API reference with progressive disclosure"
cd $TEMPLATE && git add .claude/skills/zeroui/ && git commit -m "feat: add zeroui skill — API reference with progressive disclosure"
```

---

## Task 7: zeppos-reviewer subagent

**Files:**
- Create: `$BREATHE/.claude/agents/zeppos-reviewer.md`
- Mirror to: `$TEMPLATE/.claude/agents/zeppos-reviewer.md`

- [ ] **Step 1: Create directory**

```bash
mkdir -p $BREATHE/.claude/agents
mkdir -p $TEMPLATE/.claude/agents
```

- [ ] **Step 2: Create zeppos-reviewer.md**

Create `$BREATHE/.claude/agents/zeppos-reviewer.md`:

```markdown
---
name: zeppos-reviewer
description: ZeppOS-aware code reviewer — use when reviewing ZeppOS app code or PRs. Has ZeppOS platform and ZeRoUI knowledge preloaded.
tools: Read, Bash, Glob, Grep
skills:
  - zeppos-platform
  - zeroui
model: sonnet
---

Review ZeppOS app code for correctness, platform compliance, and ZeRoUI usage. Check all changed files — not only the diff.

**Start by running:** `npm run verify`. If it fails, report the exact failure as a blocker and stop.

**Check for:**

*Platform correctness:*
- Module-level vars not reset in `onInit` — silent bug, persists across page visits
- `offGesture()` / `offKey()` missing from `onDestroy` if registered
- `vibrator.stop()` missing from `onDestroy` if Vibrator was started
- `createTimer` result not stored, or `stopTimer(id)` missing from `onDestroy`
- Navigation data via `globalData` instead of `params: JSON.stringify({...})`
- UI draw calls in `App.onCreate()` — page context not loaded yet
- New `@zos/*` APIs not listed in `app.json` permissions
- New pages/services not registered in `app.json`

*ZeRoUI usage:*
- Scrollable Column missing `col.finalize()` after items added
- `col.destroyAll()` called in a rebuild loop (use `clearContent()`)
- Raw `hmUI` layout code where `renderPage()` + `Column` would serve

*Code quality:*
- Unused imports or variables
- `catch (e)` with unused `e` binding
- Magic numbers that belong in ZeRoUI tokens or `utils/constants.js`
- New images referenced in widgets but missing from `assets/raw/`

**Output format:**

```
Verdict: APPROVE | REQUEST CHANGES | COMMENT
Checks: npm run verify → pass / fail (details if fail)

Issues (if any):
🔴 Blocker: description — file:line
🟡 Warning: description — file:line
🔵 Suggestion: description — file:line

Summary: 2-3 sentences.
```
```

- [ ] **Step 3: Copy to zeppos-app-template**

```bash
cp $BREATHE/.claude/agents/zeppos-reviewer.md $TEMPLATE/.claude/agents/zeppos-reviewer.md
```

- [ ] **Step 4: Commit**

```bash
cd $BREATHE && git add .claude/agents/ && git commit -m "feat: add zeppos-reviewer subagent — preloads platform + ZeRoUI skills"
cd $TEMPLATE && git add .claude/agents/ && git commit -m "feat: add zeppos-reviewer subagent — preloads platform + ZeRoUI skills"
```

---

## Task 8: new-page.md rewrite

**Files:**
- Modify: `$BREATHE/.claude/commands/new-page.md`
- Mirror to: `$TEMPLATE/.claude/commands/new-page.md`

- [ ] **Step 1: Rewrite new-page.md**

Replace the entire content of `$BREATHE/.claude/commands/new-page.md`:

````markdown
---
name: new-page
description: Scaffold a new ZeppOS page using ZeRoUI. Creates the page file and registers it in app.json.
argument-hint: <PageName>
context: fork
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
import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui';
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
    col = column(LAYOUT.FULL.MAIN, { scrollable: true });

    renderPage({
      layout: LAYOUT.FULL,
      title: '[PascalCase]',
      buildFn() {
        col.sectionLabel('Section');
        col.chip('Item', { onPress: () => {} });
        col.finalize();
      },
    });
  },

  onDestroy() {
    if (col) {
      col.destroyAll();
      col = null;
    }
    // offGesture(); offKey(); vibrator.stop(); — if used
  },
});
```

**Register in `app.json`:** Add `"pages/<kebab-case>/index"` to `targets.common.module.page.pages`.

**Run:** `npm run lint` — expect 0 errors.

**Report:** created file path, app.json entry added, lint result.
````

- [ ] **Step 2: Copy to zeppos-app-template**

```bash
cp $BREATHE/.claude/commands/new-page.md $TEMPLATE/.claude/commands/new-page.md
```

- [ ] **Step 3: Verify builds pass**

```bash
cd $BREATHE && npm run verify
cd $TEMPLATE && npm run verify
```

- [ ] **Step 4: Commit**

```bash
cd $BREATHE && git add .claude/commands/new-page.md && git commit -m "fix: rewrite new-page command — ZeRoUI renderPage/Column scaffold, context:fork"
cd $TEMPLATE && git add .claude/commands/new-page.md && git commit -m "fix: rewrite new-page command — ZeRoUI renderPage/Column scaffold, context:fork"
```

---

## Task 9: review.md update

**Files:**
- Modify: `$BREATHE/.claude/commands/review.md`
- Mirror to: `$TEMPLATE/.claude/commands/review.md`

- [ ] **Step 1: Replace review.md**

Replace the entire content of `$BREATHE/.claude/commands/review.md`:

```markdown
Review the pull request: $ARGUMENTS

Use the `zeppos-reviewer` agent to perform this review.
If `$ARGUMENTS` contains a PR number, pass it to the agent.
If `$ARGUMENTS` is empty, review the current branch's open PR.
```

- [ ] **Step 2: Copy to zeppos-app-template**

```bash
cp $BREATHE/.claude/commands/review.md $TEMPLATE/.claude/commands/review.md
```

- [ ] **Step 3: Commit**

```bash
cd $BREATHE && git add .claude/commands/review.md && git commit -m "refactor: review command dispatches zeppos-reviewer agent"
cd $TEMPLATE && git add .claude/commands/review.md && git commit -m "refactor: review command dispatches zeppos-reviewer agent"
```

---

## Task 10: zeppos-app-template — package.json + home page

**Files:**
- Modify: `$TEMPLATE/package.json`
- Modify: `$TEMPLATE/pages/home/index.js`
- Modify: `$TEMPLATE/utils/constants.js` (comment update only)

- [ ] **Step 1: Add ZeRoUI to package.json**

In `$TEMPLATE/package.json`, add a `"dependencies"` field (after `"devDependencies"`):

```json
"dependencies": {
  "@bug-breeder/zeroui": "file:../ZeRoUI"
}
```

- [ ] **Step 2: Install**

```bash
cd $TEMPLATE && npm install
```

Expected: installs without errors, `node_modules/@bug-breeder/zeroui` symlink created.

- [ ] **Step 3: Rewrite home page**

Replace the entire content of `$TEMPLATE/pages/home/index.js`:

```js
/**
 * Home page — golden example of a ZeRoUI page.
 *
 * Key patterns:
 *   - Import from '@bug-breeder/zeroui' for layout, tokens, and components
 *   - renderPage() handles bg, masks, title, and action button in correct z-order
 *   - column() + col.finalize() for scrollable content
 *   - Parse params in onInit with try/catch guard
 *   - Reset ALL module-level state in onInit (vars persist across page visits)
 */

import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui';
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

    col = column(LAYOUT.FULL.MAIN, { scrollable: true });

    renderPage({
      layout: LAYOUT.FULL,
      title: 'My App',
      buildFn() {
        col.sectionLabel('Welcome');
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
    if (col) {
      col.destroyAll();
      col = null;
    }
    // offGesture(); offKey(); vibrator.stop(); — if used
  },
});
```

- [ ] **Step 4: Update constants.js comment**

In `$TEMPLATE/utils/constants.js`, change the JSDoc at the top to reflect that ZeRoUI is now the primary UI layer. Replace:

```js
 * These constants are for raw @zos/ui (hmUI) layout.
```

With:

```js
 * These constants supplement ZeRoUI (@bug-breeder/zeroui) for raw hmUI widgets
 * not covered by ZeRoUI (IMG, ARC, SCROLL_LIST, etc.).
```

- [ ] **Step 5: Verify**

```bash
cd $TEMPLATE && npm run verify
```

Expected: 0 errors. If `@bug-breeder/zeroui` import can't be resolved during lint, check that `npm install` completed and `node_modules/@bug-breeder/zeroui` exists.

- [ ] **Step 6: Commit**

```bash
cd $TEMPLATE && git add package.json package-lock.json pages/home/index.js utils/constants.js && git commit -m "feat: add ZeRoUI dependency, rewrite home page as ZeRoUI golden example"
```

---

## Task 11: ZeRoUI — README.md + add-component command

**Files:**
- Modify: `$ZEROUI/README.md`
- Create: `$ZEROUI/.claude/commands/add-component.md`

- [ ] **Step 1: Update README.md**

Replace the content of `$ZEROUI/README.md` with:

```markdown
# ZeRoUI — ZeppOS Rounded UI

UI library for ZeppOS round-display apps. Design tokens, safe-zone layout system, Column layout helper, and hmUI component wrappers.

## Install

In a ZeppOS app (side-by-side repos):
```json
"dependencies": {
  "@bug-breeder/zeroui": "file:../ZeRoUI"
}
```

Then `npm install`.

## Quick Start

```js
import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui';

let col = null;

Page({
  onInit() { col = null; },
  build() {
    col = column(LAYOUT.FULL.MAIN, { scrollable: true });
    renderPage({
      layout: LAYOUT.FULL,
      title: 'My Page',
      buildFn() {
        col.sectionLabel('Options');
        col.chip('Choice A', { onPress: () => {} });
        col.chip('Choice B', { onPress: () => {} });
        col.finalize();
      },
    });
  },
  onDestroy() {
    if (col) { col.destroyAll(); col = null; }
  },
});
```

## API Reference

### LAYOUT modes

| Mode | Zones | Use |
|---|---|---|
| `LAYOUT.FULL` | TITLE + MAIN + ACTION | standard page |
| `LAYOUT.NO_TITLE` | MAIN + ACTION | no title bar |
| `LAYOUT.NO_ACTION` | TITLE + MAIN | no action button |
| `LAYOUT.MAIN_ONLY` | MAIN | fullscreen / immersive |

### renderPage(opts)

| Option | Type | Required | Description |
|---|---|---|---|
| `layout` | LAYOUT mode | yes | Zone configuration |
| `buildFn` | `() => void` | yes | Creates Column content (no args) |
| `title` | string | no | Page title |
| `action` | `{ text, onPress }` | no | Bottom action button |

### column(zone, opts)

Returns a `Column`. Opts: `{ scrollable?: boolean }`.

| Method | Description |
|---|---|
| `sectionLabel(text)` | Muted caption row |
| `chip(text, opts)` | Full-width tappable chip (`selected`, `onPress`) |
| `chipRow(options[], opts)` | Horizontal row of equal chips (`selected`, `onPress`) |
| `spacer(n)` | Add n units vertical gap |
| `finalize()` | **Required** for scrollable — sets total scroll height |
| `clearContent()` | Destroy children, keep container (use in rebuilds) |
| `destroyAll()` | Full teardown — call only in `onDestroy()` |

### Tokens

`COLOR`, `TYPOGRAPHY`, `RADIUS`, `SPACING` — see `src/tokens.js` for full values.

## Package structure

```
index.js          Entry point — re-exports everything
src/
  tokens.js       Design tokens
  zones.js        ZONE (legacy) + LAYOUT (4 modes)
  column.js       Column class
  components.js   bg, title, actionButton, heroText, statCard, renderPage
```
```

- [ ] **Step 2: Create add-component.md command**

Create `$ZEROUI/.claude/commands/add-component.md`:

```markdown
---
name: add-component
description: Scaffold a new ZeRoUI component and export it from index.js.
argument-hint: <ComponentName>
---

Add a new ZeRoUI component: $ARGUMENTS

**Goal:** Add an exported draw function to `src/components.js` (or a new `src/<name>.js` if the component is large/complex). Export it from `index.js`.

**Constraints:**
- Pure draw function — `export function myComponent(opts = {}) { ... }`
- Only `hmUI.createWidget()` — no state, no classes (unless a layout helper like Column)
- Import tokens from `./tokens.js`, zones from `./zones.js`
- Return the widget or widget array
- No `px()` calls — design canvas (480-unit) coords only
- Derive sensible defaults from existing token values

**After adding to src/components.js (or new file):**

In `index.js`, add to both blocks:
```js
// Named exports block:
export { ..., myComponent } from './src/components.js';

// UI namespace:
export const UI = {
  ...,
  myComponent,
};
```

**Verify:**
```bash
npx eslint src/
node -e "import('./index.js').then(m => console.log(Object.keys(m)))"
```

Expected: 0 lint errors, new export key appears in the output.
```

- [ ] **Step 3: Verify ZeRoUI lint**

```bash
cd $ZEROUI && npx eslint src/
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd $ZEROUI && git add README.md .claude/commands/add-component.md && git commit -m "docs: rewrite README with current API; feat: add add-component command"
```

---

## Self-Review

### Spec coverage check

| Spec section | Covered by task |
|---|---|
| ZeRoUI CLAUDE.md | Task 4 |
| ZeRoUI README.md | Task 11 |
| ZeRoUI settings.json | Task 1 |
| ZeRoUI add-component command | Task 11 |
| zepp-meditation CLAUDE.md | Task 2 |
| zeppos-app-template CLAUDE.md | Task 3 |
| Settings — both app repos ($schema, git push, branch) | Task 1 |
| zeppos-platform skill (SKILL.md + references/api.md) | Task 5 |
| Delete zeppos.md | Task 5 |
| zeroui skill (SKILL.md + references/api.md) | Task 6 |
| zeppos-reviewer subagent | Task 7 |
| new-page.md rewrite (ZeRoUI, context:fork) | Task 8 |
| review.md → dispatch subagent | Task 9 |
| Template package.json: add ZeRoUI | Task 10 |
| Template home page: ZeRoUI golden example | Task 10 |

No gaps found.

### Placeholder scan

No "TBD", "TODO", "similar to above", or "fill in details" in any task. All file contents are fully specified.

### Type consistency

- `column()` returns `Column` — `col.finalize()`, `col.clearContent()`, `col.destroyAll()` called consistently across Task 6 SKILL.md, Task 8 new-page scaffold, Task 10 home page, and Task 4 ZeRoUI CLAUDE.md.
- `renderPage()` `buildFn` is always a no-arg function — consistent across all scaffolds.
- `LAYOUT.FULL.MAIN` used as the zone argument in all Column instantiations — matches zones.js values.
- Agent name `zeppos-reviewer` in Task 7 matches what Task 9 review.md dispatches.
- Skill names `zeppos-platform` and `zeroui` in Task 7 agent frontmatter match the directory names in Tasks 5 and 6.
