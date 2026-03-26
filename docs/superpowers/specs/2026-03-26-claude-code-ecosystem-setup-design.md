# Claude Code Ecosystem Setup — Design Spec

**Date:** 2026-03-26
**Repos in scope:** `zepp-meditation`, `zeppos-app-template`, `ZeRoUI`
**Goal:** Comprehensive Claude Code setup across the ZeppOS ecosystem — good CLAUDE.md files, well-structured skills (progressive disclosure, gotchas-first), a review subagent, and corrected settings across all repos.

---

## Context

Three repos form a tightly related ZeppOS ecosystem:

| Repo | Role | Current state |
|---|---|---|
| `ZeRoUI` | UI library (`@bug-breeder/zeroui`) | No CLAUDE.md, no `.claude/` at all |
| `zepp-meditation` | App consuming ZeRoUI | CLAUDE.md stale (zeppos-zui refs), `new-page.md` broken |
| `zeppos-app-template` | Template for new apps | CLAUDE.md missing ZeRoUI, `new-page.md` broken |

**Critical bug discovered:** Both `new-page.md` commands scaffold with `zeppos-zui`'s `CircularLayout`/`VStack` — the broken library that was already removed. Every `/new-page` invocation generates non-functional code.

**Skill quality problem:** The existing `zeppos.md` command is a monolithic dump (500+ lines, obvious info, no progressive disclosure). Violates Thariq's best practices: don't state the obvious, build a gotchas section, use the filesystem for progressive disclosure.

---

## Principles (apply to all skill/command content)

1. **Gotchas first** — highest-signal content; built from real failure points, not guesses
2. **Don't state the obvious** — Claude already knows basic ZeppOS structure; skip it
3. **Progressive disclosure** — SKILL.md is short (~50 lines), detail lives in `references/`
4. **Description = model trigger** — written for "when to invoke," not for humans to read
5. **Goal + constraints, not step-by-step** — especially for scaffolding/review commands
6. **CLAUDE.md ≤ 200 lines** — above this, adherence degrades

---

## Deliverables

### 1. File structure (all changes)

```
ZeRoUI/
├── CLAUDE.md                           NEW
├── README.md                           UPDATE
└── .claude/
    ├── settings.json                   NEW
    └── commands/
        └── add-component.md            NEW

zepp-meditation/
├── CLAUDE.md                           UPDATE
└── .claude/
    ├── settings.json                   UPDATE
    ├── commands/
    │   ├── new-page.md                 REWRITE (ZeRoUI, context:fork)
    │   ├── review.md                   UPDATE (dispatch subagent)
    │   └── zeppos.md                   DELETE (replaced by skill below)
    ├── skills/
    │   ├── zeppos-platform/
    │   │   ├── SKILL.md                NEW
    │   │   └── references/
    │   │       └── api.md              NEW
    │   └── zeroui/
    │       ├── SKILL.md                NEW
    │       └── references/
    │           └── api.md              NEW
    └── agents/
        └── zeppos-reviewer.md          NEW

zeppos-app-template/
├── CLAUDE.md                           UPDATE
├── package.json                        UPDATE (add @bug-breeder/zeroui)
├── pages/home/index.js                 UPDATE (ZeRoUI scaffold)
└── .claude/
    ├── settings.json                   UPDATE
    ├── commands/
    │   ├── new-page.md                 REWRITE (same as zepp-meditation)
    │   ├── review.md                   UPDATE (same as zepp-meditation)
    │   └── zeppos.md                   DELETE
    ├── skills/                         NEW DIR (same as zepp-meditation)
    │   ├── zeppos-platform/
    │   └── zeroui/
    └── agents/
        └── zeppos-reviewer.md          NEW (same as zepp-meditation)
```

---

## 2. ZeRoUI CLAUDE.md

**Path:** `ZeRoUI/CLAUDE.md`
**Constraint:** ≤ 200 lines. Two clearly-delineated sections.

### Section A — Library Development

Context: Claude is adding/modifying ZeRoUI components.

Must cover:
- **No zeus, no app.json** — this is a plain npm package. `npm install`, `node` for quick testing.
- **Design principle:** pre-calculated positions from token constants; never read widget dimensions at runtime (that's the bug that killed zeppos-zui)
- **Token system:** `COLOR`, `TYPOGRAPHY`, `RADIUS`, `SPACING` live in `src/tokens.js`. All values are raw 480-unit design canvas numbers — no `px()`.
- **Zone system:** `ZONE` (legacy single-mode) and `LAYOUT` (4 named modes) in `src/zones.js`. All LAYOUT corners verified inside the 480×480 circle.
- **Component pattern:** `export function myComponent(opts)` that calls `hmUI.createWidget()` and returns the widget (or array). Pure draw function — no state.
- **Column pattern:** class in `src/column.js` — extend only if needed for layout state. Track widgets in `this._widgets` for `clearContent()`/`destroyAll()`.
- **Exports:** add to both `export { ... }` and `UI = { ... }` in `index.js`.
- **npm link workflow:** consumers use `"@bug-breeder/zeroui": "file:../ZeRoUI"` — run `npm install` in consumer after changes.

### Section B — Consumer API Reference

Context: Claude is building an app page and needs to use ZeRoUI.

Must cover (concise):
- **Import patterns** (two forms: namespace `UI` and named)
- **`renderPage({ layout, buildFn, title, action })`** — the main page builder; handles bg, top mask, bottom mask, title, action button in correct z-order; `buildFn` takes no args (access layout via closure)
- **`column(zone, { scrollable })`** — returns a `Column` instance; `scrollable: true` creates `VIEW_CONTAINER`
- **`LAYOUT` modes:** FULL, NO_TITLE, NO_ACTION, MAIN_ONLY — with zone values
- **`Column` API:** `chip()`, `chipRow()`, `sectionLabel()`, `spacer()`, `finalize()`, `clearContent()`, `destroyAll()`
- **Key gotchas** (non-obvious ones only — see §5 for full list)

---

## 3. ZeRoUI README.md

Update to reflect current API. Structure:

```
## Install
npm link / file dependency

## Quick Start
renderPage() example

## API Reference
- Tokens (COLOR, TYPOGRAPHY, RADIUS, SPACING)
- Layout modes (LAYOUT.FULL / NO_TITLE / NO_ACTION / MAIN_ONLY)
- renderPage()
- column() + Column methods
- Components (bg, title, actionButton, heroText, statCard)
```

No need for exhaustive signatures — keep it scannable.

---

## 4. ZeRoUI `.claude/settings.json`

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

No zeus commands — this is a library repo.

---

## 5. ZeRoUI `.claude/commands/add-component.md`

**Purpose:** Scaffold a new ZeRoUI component.

**Goal (not step-by-step):** Add a new exported draw function to `src/components.js` (or a new `src/<name>.js` if the component is large/self-contained). Export from `index.js` in both named and `UI` namespace forms.

**Constraints:**
- Use only `hmUI.createWidget()` — no state, no classes (unless it's a layout helper)
- Import tokens from `./tokens.js`, zones from `./zones.js`
- Return the widget or array of widgets
- No `px()` calls — design canvas coords only
- After adding: run `npx eslint src/` and confirm 0 errors
- Run `node -e "import('./index.js').then(m => console.log(Object.keys(m)))"` to verify export

---

## 6. zepp-meditation + zeppos-app-template CLAUDE.md

Both files need the same structural fixes. **zepp-meditation** fills in its actual app details. **zeppos-app-template** keeps `[APP_NAME]` placeholders.

### Changes

**App header (zepp-meditation only):**
```
# Breathe
App: Haptic-guided breathing exercises for ADHD adults
App ID: 10000001 (replace with real ID from Zepp Open Platform)
```

**UI section — replace current text with:**
```
- **UI:** Use ZeRoUI (`@bug-breeder/zeroui`) for all page UI.
  - `import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui'`
  - Raw `@zos/ui` (`hmUI`) only for widgets ZeRoUI doesn't cover (IMG, ARC, SCROLL_LIST, etc.)
```

**Remove from gotchas:**
- "ZUI layout containers are broken" — ZeRoUI replaced them; mention in zeroui skill only
- "Touch on FILL_RECT is unreliable" — move to zeppos-platform skill as a gotcha

**Keep all other sections.** Do not touch quality gates, dev commands, or project structure.

**Line budget:** zepp-meditation target ≤ 130 lines. Template target ≤ 130 lines.

---

## 7. Settings updates (both app repos)

**Add to both zepp-meditation and zeppos-app-template `.claude/settings.json`:**
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      ... (existing) ...,
      "Bash(git push:*)",
      "Bash(git branch:*)"
    ]
  }
}
```

The existing permissions are otherwise correct.

---

## 8. `zeppos-platform` skill

**Path:** `.claude/skills/zeppos-platform/` in both app repos
**Replaces:** `zeppos.md` command (delete it)

### `SKILL.md` frontmatter

```yaml
---
name: zeppos
description: Use when writing ZeppOS code, importing @zos/* APIs, or debugging platform behavior — hmUI widgets, router, storage, sensors, interaction, alarms, app-service patterns.
argument-hint: [question]
user-invocable: true
---
```

Name is `zeppos` so `/zeppos [question]` continues to work unchanged.

### `SKILL.md` content

~50 lines. Structure:
1. One-line platform summary (QuickJS, 480-unit canvas, round OLED)
2. **Gotchas** section — non-obvious only, in order of how often they cause bugs:
   - Widget null check before `setProperty` → silent crash
   - Module-level `let x = 0` NOT reset on page revisit → always reset in `onInit`
   - `FILL_RECT.addEventListener(CLICK_UP)` silently fails on device → always use `BUTTON` with `click_func`
   - `offGesture()` / `offKey()` required in `onDestroy` if registered
   - `vibrator.stop()` required in `onDestroy` → runs indefinitely otherwise
   - `params` via `JSON.stringify({...})` in push/replace, NOT `globalData`
   - `catch (e)` with unused binding → use `catch { }` (ES2019 optional catch)
   - App-service `onInit` runs once → alarm chain (`@zos/alarm`) for recurrence, not `setInterval`
   - `LocalStorage` in app-service must be imported directly (not via `utils/storage.js`)
   - Icon must be at `assets/common.r/icon.png` (not `assets/icon.png`)
3. Pointer: "For full API reference, read `references/api.md`"

### `references/api.md` content

Current `zeppos.md` content, cleaned up:
- Remove "ZUI layout containers are broken" gotcha (obsolete)
- Add ZeRoUI note: "Use `@bug-breeder/zeroui` for page layout. Raw `hmUI` only for widgets ZeRoUI doesn't cover."
- Remove any content Claude obviously already knows (basic JS, basic console.log, etc.)
- Keep: hmUI widget catalog, router, storage, sensors, interaction, alarms, display, bg-service, page scaffold example

---

## 9. `zeroui` skill

**Path:** `.claude/skills/zeroui/` in both app repos
**New — no existing equivalent**

### `SKILL.md` frontmatter

```yaml
---
name: zeroui
description: Use when building pages with ZeRoUI (@bug-breeder/zeroui) — renderPage(), Column layout, LAYOUT modes, design tokens, or ZeRoUI-specific gotchas.
user-invocable: false
---
```

`user-invocable: false` — not a user-facing command; preloaded into `zeppos-reviewer`.

### `SKILL.md` content

~60 lines. Structure:
1. **Import patterns:**
   ```js
   // Named (recommended)
   import { renderPage, column, LAYOUT, COLOR, TYPOGRAPHY } from '@bug-breeder/zeroui';
   // Namespace
   import { UI } from '@bug-breeder/zeroui';
   ```
2. **LAYOUT modes table** — FULL, NO_TITLE, NO_ACTION, MAIN_ONLY with when-to-use
3. **`renderPage()` contract** — signature, what it handles (bg, masks, title, action in z-order), `buildFn` takes no args
4. **`column()` + `Column` method summary** — chip, chipRow, sectionLabel, spacer, finalize, clearContent, destroyAll (one line each)
5. **Gotchas** (non-obvious only):
   - `col.finalize()` MUST be called after all items added to a scrollable Column (sets VIEW_CONTAINER total height)
   - In rebuild loops: call `col.clearContent()`, re-add items, call `col.finalize()` again — **never** `destroyAll()` mid-page (kills VIEW_CONTAINER z-order)
   - `buildFn` accesses `layout` via closure — do not pass it as an argument
   - `renderPage` adds bottom mask automatically — do not add a FILL_RECT after `layout.MAIN.y + layout.MAIN.h` (double-masks)
   - `Column` always uses **absolute screen coords** even inside VIEW_CONTAINER (not container-relative)
   - Use `COLOR` from `@bug-breeder/zeroui`, not from `utils/constants.js` — ZeRoUI tokens are the source of truth
6. Pointer: "For full zone values and component signatures, read `references/api.md`"

### `references/api.md` content

- Full `ZONE` values (TITLE, MAIN, ACTION)
- Full `LAYOUT` values for all 4 modes (exact numbers)
- `renderPage()` full signature with all options
- `Column` full method signatures with params
- All component signatures: `bg()`, `title(text)`, `actionButton(text, opts)`, `heroText(text, opts)`, `statCard(opts)`
- `COLOR`, `TYPOGRAPHY`, `RADIUS`, `SPACING` full token tables

---

## 10. `zeppos-reviewer` subagent

**Path:** `.claude/agents/zeppos-reviewer.md` in both app repos

### Frontmatter

```yaml
---
name: zeppos-reviewer
description: ZeppOS-aware code reviewer — use when reviewing ZeppOS app code or PRs. Has ZeppOS platform and ZeRoUI knowledge preloaded.
tools: Read, Bash, Glob, Grep
skills:
  - zeppos-platform
  - zeroui
model: sonnet
---
```

### Content (goal + constraints, not checklist)

Role: Review ZeppOS app code for correctness, platform compliance, and ZeRoUI usage. Check everything — not just changed lines.

**What to run first:** `npm run verify` — if it fails, report the failure details as a blocker and stop.

**What to look for (grouped by concern):**

*Platform correctness:*
- Module-level vars reset in `onInit`?
- `offGesture`/`offKey`/`vibrator.stop()` in `onDestroy` if used?
- Navigation data via `params`, not `globalData`?
- New `@zos/*` APIs registered in `app.json` permissions?
- New pages/services registered in `app.json`?

*ZeRoUI correctness:*
- `col.finalize()` called after all items added?
- `clearContent()` + re-add + `finalize()` in rebuild loops (not `destroyAll`)?
- No raw `hmUI` layout code where `renderPage()`/`Column` would serve?

*Code quality:*
- Unused imports/variables?
- `catch (e)` with unused binding?
- Magic numbers that belong in ZeRoUI tokens or `utils/constants.js`?

*Assets:*
- New images exist under `assets/raw/`?
- Widget `src` paths relative to `assets/raw/`?

**Output format:**
```
Verdict: APPROVE | REQUEST CHANGES | COMMENT
Checks: npm run verify → pass/fail

Issues (if any):
🔴 Blocker: description — file:line
🟡 Warning: description — file:line
🔵 Suggestion: description — file:line

Summary: 2-3 sentences.
```

---

## 11. `review.md` command update

**Path:** `.claude/commands/review.md` in both app repos

Make it a thin dispatcher — the reviewer agent holds all the logic.

**Content:**
```
Review the pull request: $ARGUMENTS

Use the `zeppos-reviewer` agent to perform this review.
Pass the PR number/identifier from $ARGUMENTS to the agent.
If $ARGUMENTS is empty, review the current branch's open PR.
```

The agent handles everything else. Removing the step-by-step checklist from the command — it lives in the agent instead.

---

## 12. `new-page.md` command rewrite

**Path:** `.claude/commands/new-page.md` in both app repos

### Frontmatter

```yaml
---
name: new-page
description: Scaffold a new ZeppOS page using ZeRoUI. Creates the page file and registers it in app.json.
argument-hint: <PageName>
context: fork
---
```

`context: fork` — isolates scaffolding from main session context.

### Content

**Goal:** Create `pages/<kebab-case>/index.js` using the ZeRoUI `renderPage()` pattern and register it in `app.json`.

**Names to derive from `$ARGUMENTS`:**
- PascalCase → used in the file comment header
- kebab-case → directory name and registration path

**Page template to generate:**
```js
/**
 * [PageName] page
 */
import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui';
// import { push, pop } from '@zos/router'; // uncomment when needed

Page({
  onInit(params) {
    try {
      const p = params ? JSON.parse(params) : {};
      console.log('[[PageName]] onInit', p);
    } catch {
      console.log('[[PageName]] onInit: no params');
    }
  },

  build() {
    const col = column(LAYOUT.FULL.MAIN, { scrollable: true });

    renderPage({
      layout: LAYOUT.FULL,
      title: '[PageName]',
      buildFn() {
        col.sectionLabel('Section');
        col.chip('Item one', { onPress: () => {} });
        col.finalize();
      },
    });
  },

  onDestroy() {
    // offGesture(); offKey(); vibrator.stop(); — if used
  },
});
```

**app.json:** Add `"pages/<kebab-case>/index"` to `targets.common.module.page.pages`.

**Verify:** Run `npm run lint`. Report: file created, registered, lint pass/fail.

---

## 13. zeppos-app-template `package.json`

Add ZeRoUI as a dependency. The file dependency (same as zepp-meditation) is the right form since both repos live side-by-side:

```json
"dependencies": {
  "@bug-breeder/zeroui": "file:../ZeRoUI"
}
```

---

## 14. zeppos-app-template `pages/home/index.js`

Replace the raw-hmUI golden example with a ZeRoUI example. The new home page becomes the golden example for the ZeRoUI pattern.

**New content:**
```js
/**
 * Home page — golden example of a ZeRoUI page.
 *
 * Key patterns:
 *   - Import from '@bug-breeder/zeroui' for layout, tokens, components
 *   - renderPage() handles bg, masks, title, action button z-order
 *   - column() + Column.finalize() for scrollable content
 *   - Parse params in onInit with try/catch guard
 *   - Reset module-level state in onInit (vars persist across page visits)
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

---

## Spec Self-Review

| Check | Status |
|---|---|
| No TBD/TODO sections | ✅ |
| Internal consistency (new-page template uses renderPage, matches zeroui skill API) | ✅ |
| Scope: 3 repos, focused | ✅ |
| Every deliverable has enough detail to implement without ambiguity | ✅ |
| CLAUDE.md ≤ 200 lines rule stated | ✅ |
| Skill content quality rules stated and applied per-skill | ✅ |
| zeppos.md deletion explicitly called out | ✅ |
| Review subagent dispatched by review.md command (Command → Agent pattern) | ✅ |
| Skills/agents dirs: same content in both app repos (stated explicitly) | ✅ |
| context:fork on new-page | ✅ |
| user-invocable: false on zeroui skill | ✅ |
| name: zeppos on zeppos-platform skill (preserves /zeppos UX) | ✅ |

---

## Implementation Notes

- Skills and agents in `zepp-meditation` and `zeppos-app-template` are **identical content** — implement once, copy across.
- `zeppos.md` deletion: remove the file, the skill takes over at the same `/zeppos` name.
- ZeRoUI has no test runner yet — `node -e "import(...)"` is the verify step for new components.
- `zeppos-app-template` also needs its `utils/constants.js` comment updated — remove the "These constants are for raw @zos/ui (hmUI) layout" note since ZeRoUI is now the primary UI layer. Raw hmUI constants remain but are supplementary.
