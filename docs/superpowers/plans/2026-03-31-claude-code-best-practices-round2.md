# Claude Code Best Practices Round 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the remaining Claude Code best practices across three repos: live @imports in CLAUDE.md, compaction guidance, path-scoped rules, skill sandboxing, and housekeeping.

**Architecture:** All changes are configuration and documentation — no app logic touched. zepphyr gets a tighter tool sandbox on its new-page skill. Both consumer repos get a leaner CLAUDE.md (live @package.json reference, compaction guidance, subagent hint) and two new `.claude/rules/` files that auto-load ZeRoUI patterns when editing pages or app.json. A leftover dev artifact (settings.local.json) is deleted.

**Tech Stack:** Claude Code settings.json, CLAUDE.md @imports, `.claude/rules/` path-scoped rules, ZeppOS / npm

---

## File Map

| File | Repo | Change |
|---|---|---|
| `skills/new-page/SKILL.md` | zepphyr | MODIFY — add `allowed-tools` |
| `CLAUDE.md` | zepp-meditation | MODIFY — replace Dev Commands, add compaction + subagent hint |
| `.claude/rules/pages.md` | zepp-meditation | CREATE |
| `.claude/rules/app-json.md` | zepp-meditation | CREATE |
| `.claude/settings.local.json` | zepp-meditation | DELETE |
| `CLAUDE.md` | zeppos-app-template | MODIFY — same as zepp-meditation (no "This App" section) |
| `.claude/rules/pages.md` | zeppos-app-template | CREATE — identical to zepp-meditation |
| `.claude/rules/app-json.md` | zeppos-app-template | CREATE — identical to zepp-meditation |

---

## Task 1: Add `allowed-tools` to new-page skill in zepphyr

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zepphyr/skills/new-page/SKILL.md` (lines 1-7)

- [ ] **Step 1: Add `allowed-tools` to frontmatter**

Edit `/Users/alanguyen/Code/Others/zepphyr/skills/new-page/SKILL.md`.

Find:
```
disable-model-invocation: true
---
```

Replace with:
```
disable-model-invocation: true
allowed-tools: Read, Glob, Edit, Write, Bash(npm run verify:*), Bash(git add:*), Bash(git commit:*)
---
```

- [ ] **Step 2: Sync to plugin cache**

```bash
cp /Users/alanguyen/Code/Others/zepphyr/skills/new-page/SKILL.md \
   ~/.claude/plugins/cache/zepphyr/zepphyr/1.0.0/skills/new-page/SKILL.md
```

- [ ] **Step 3: Verify frontmatter is correct**

```bash
head -10 /Users/alanguyen/Code/Others/zepphyr/skills/new-page/SKILL.md
```

Expected: 8 lines of frontmatter ending with `---`, including `allowed-tools` line.

- [ ] **Step 4: Commit and push**

```bash
cd /Users/alanguyen/Code/Others/zepphyr
git add skills/new-page/SKILL.md
git commit -m "feat: restrict new-page skill fork to scaffolding tools only"
unset GITHUB_TOKEN && git push origin feat/claude-code-refactor
```

---

## Task 2: Update CLAUDE.md in zepp-meditation

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zepp-meditation/CLAUDE.md`

- [ ] **Step 1: Replace Dev Commands table with `@package.json` import**

Edit `/Users/alanguyen/Code/Others/zepp-meditation/CLAUDE.md`.

Find:
```
## Dev Commands

| Command            | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | Build + launch in simulator                     |
| `npm run build`    | Build `.zab` installer → `dist/`                |
| `npm run preview`  | Build + push to device                          |
| `npm run verify`   | Lint + format check + build — run before commit |
| `npm run lint:fix` | Auto-fix lint errors                            |
| `npm run format`   | Auto-format all files                           |
```

Replace with:
```
## Dev Commands

See `@package.json` for all available scripts. Key ones: `dev` (simulator), `build` (dist), `preview` (device), `verify` (lint + format + build — run before commit).
```

- [ ] **Step 2: Add compaction guidance to Quality Gates**

Find:
```
Run `npm run verify` before every commit. No unused `catch (e)` binding — use `catch { }`.
```

Replace with:
```
Run `npm run verify` before every commit. No unused `catch (e)` binding — use `catch { }`.

**When compacting:** preserve the current branch name, which files were modified, and the last `npm run verify` result.
```

- [ ] **Step 3: Add subagent hint after Slash Commands table**

Find:
```
| `/zepphyr:review [PR#]`        | ZeppOS-aware automated PR review                  |
```

Replace with:
```
| `/zepphyr:review [PR#]`        | ZeppOS-aware automated PR review                  |

For large investigations (reading many files, tracing a bug across pages), ask Claude to use a subagent so the exploration doesn't consume your main context.
```

- [ ] **Step 4: Run verify**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation && npm run verify
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
git add CLAUDE.md
git commit -m "chore: CLAUDE.md — live @package.json import, compaction guidance, subagent hint"
```

---

## Task 3: Create `.claude/rules/` in zepp-meditation

**Files:**
- Create: `/Users/alanguyen/Code/Others/zepp-meditation/.claude/rules/pages.md`
- Create: `/Users/alanguyen/Code/Others/zepp-meditation/.claude/rules/app-json.md`

- [ ] **Step 1: Create rules directory**

```bash
mkdir -p /Users/alanguyen/Code/Others/zepp-meditation/.claude/rules
```

- [ ] **Step 2: Create `pages.md`**

Write `/Users/alanguyen/Code/Others/zepp-meditation/.claude/rules/pages.md`:

```markdown
---
description: ZeRoUI patterns for ZeppOS pages — loaded automatically when editing page files
paths: pages/**/*.js
---

## ZeRoUI Page Rules

- `column()` must be called INSIDE `buildFn()`, not before `renderPage()` — z-order bug otherwise
- `col.finalize()` required after all items in a scrollable column — content won't scroll without it
- `col.destroyAll()` in `onDestroy()`, never mid-page — use `clearContent()` + re-add + `finalize()` for rebuilds
- Module-level vars (`let col = null`) must reset to initial value in `onInit()` — they persist across page visits
- Use `COLOR.BG` (`0x000000`) on every page background — OLED turns off black pixels
- `offGesture()` / `offKey()` in `onDestroy()` if registered — they leak otherwise
- `vibrator.stop()` in `onDestroy()` if started — vibration continues after page exit otherwise
```

- [ ] **Step 3: Create `app-json.md`**

Write `/Users/alanguyen/Code/Others/zepp-meditation/.claude/rules/app-json.md`:

```markdown
---
description: app.json registration checklist — loaded automatically when editing the manifest
paths: app.json
---

## app.json Checklist

When adding a page: register under `targets.common.module.page.pages` — prefer `/zepphyr:new-page` which handles this automatically.
When adding a service: register under `targets.common.module["app-service"].services`.
When using a new `@zos/*` API: add its permission to the top-level `permissions` array.
App icon must be at `assets/common.r/icon.png` — NOT `assets/icon.png`.
```

- [ ] **Step 4: Commit**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
git add .claude/rules/
git commit -m "feat: add path-scoped rules for pages and app.json"
```

---

## Task 4: Delete `settings.local.json` from zepp-meditation

**Files:**
- Delete: `/Users/alanguyen/Code/Others/zepp-meditation/.claude/settings.local.json`

- [ ] **Step 1: Delete and commit**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
git rm .claude/settings.local.json
git commit -m "chore: remove stale settings.local.json (leftover from zepphyr migration)"
```

---

## Task 5: Update CLAUDE.md in zeppos-app-template

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zeppos-app-template/CLAUDE.md`

- [ ] **Step 1: Replace Dev Commands table with `@package.json` import**

Edit `/Users/alanguyen/Code/Others/zeppos-app-template/CLAUDE.md`.

Find:
```
## Dev Commands

| Command            | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | Build + launch in simulator                     |
| `npm run build`    | Build `.zab` installer → `dist/`                |
| `npm run preview`  | Build + push to device                          |
| `npm run verify`   | Lint + format check + build — run before commit |
| `npm run lint:fix` | Auto-fix lint errors                            |
| `npm run format`   | Auto-format all files                           |
```

Replace with:
```
## Dev Commands

See `@package.json` for all available scripts. Key ones: `dev` (simulator), `build` (dist), `preview` (device), `verify` (lint + format + build — run before commit).
```

- [ ] **Step 2: Add compaction guidance to Quality Gates**

Find:
```
Run `npm run verify` before every commit. No unused `catch (e)` binding — use `catch { }`.
```

Replace with:
```
Run `npm run verify` before every commit. No unused `catch (e)` binding — use `catch { }`.

**When compacting:** preserve the current branch name, which files were modified, and the last `npm run verify` result.
```

- [ ] **Step 3: Add subagent hint after Slash Commands table**

Find (in zeppos-app-template, no "This App" section — table is at end of file):
```
| `/zepphyr:review [PR#]`        | ZeppOS-aware automated PR review                  |
```

Replace with:
```
| `/zepphyr:review [PR#]`        | ZeppOS-aware automated PR review                  |

For large investigations (reading many files, tracing a bug across pages), ask Claude to use a subagent so the exploration doesn't consume your main context.
```

- [ ] **Step 4: Run verify**

```bash
cd /Users/alanguyen/Code/Others/zeppos-app-template && npm run verify
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/alanguyen/Code/Others/zeppos-app-template
git add CLAUDE.md
git commit -m "chore: CLAUDE.md — live @package.json import, compaction guidance, subagent hint"
```

---

## Task 6: Create `.claude/rules/` in zeppos-app-template

**Files:**
- Create: `/Users/alanguyen/Code/Others/zeppos-app-template/.claude/rules/pages.md`
- Create: `/Users/alanguyen/Code/Others/zeppos-app-template/.claude/rules/app-json.md`

- [ ] **Step 1: Create rules directory**

```bash
mkdir -p /Users/alanguyen/Code/Others/zeppos-app-template/.claude/rules
```

- [ ] **Step 2: Create `pages.md`** (identical to zepp-meditation)

Write `/Users/alanguyen/Code/Others/zeppos-app-template/.claude/rules/pages.md`:

```markdown
---
description: ZeRoUI patterns for ZeppOS pages — loaded automatically when editing page files
paths: pages/**/*.js
---

## ZeRoUI Page Rules

- `column()` must be called INSIDE `buildFn()`, not before `renderPage()` — z-order bug otherwise
- `col.finalize()` required after all items in a scrollable column — content won't scroll without it
- `col.destroyAll()` in `onDestroy()`, never mid-page — use `clearContent()` + re-add + `finalize()` for rebuilds
- Module-level vars (`let col = null`) must reset to initial value in `onInit()` — they persist across page visits
- Use `COLOR.BG` (`0x000000`) on every page background — OLED turns off black pixels
- `offGesture()` / `offKey()` in `onDestroy()` if registered — they leak otherwise
- `vibrator.stop()` in `onDestroy()` if started — vibration continues after page exit otherwise
```

- [ ] **Step 3: Create `app-json.md`** (identical to zepp-meditation)

Write `/Users/alanguyen/Code/Others/zeppos-app-template/.claude/rules/app-json.md`:

```markdown
---
description: app.json registration checklist — loaded automatically when editing the manifest
paths: app.json
---

## app.json Checklist

When adding a page: register under `targets.common.module.page.pages` — prefer `/zepphyr:new-page` which handles this automatically.
When adding a service: register under `targets.common.module["app-service"].services`.
When using a new `@zos/*` API: add its permission to the top-level `permissions` array.
App icon must be at `assets/common.r/icon.png` — NOT `assets/icon.png`.
```

- [ ] **Step 4: Commit**

```bash
cd /Users/alanguyen/Code/Others/zeppos-app-template
git add .claude/rules/
git commit -m "feat: add path-scoped rules for pages and app.json"
```

---

## Task 7: Push all branches and final verification

- [ ] **Step 1: Push zepp-meditation**

```bash
unset GITHUB_TOKEN && git -C /Users/alanguyen/Code/Others/zepp-meditation push origin feat/claude-code-refactor
```

- [ ] **Step 2: Push zeppos-app-template**

```bash
unset GITHUB_TOKEN && git -C /Users/alanguyen/Code/Others/zeppos-app-template push origin feat/claude-code-refactor
```

- [ ] **Step 3: Final verify both repos**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation && npm run verify
cd /Users/alanguyen/Code/Others/zeppos-app-template && npm run verify
```

Expected: both pass 0 errors.

- [ ] **Step 4: Confirm all files present**

```bash
ls /Users/alanguyen/Code/Others/zepp-meditation/.claude/rules/
ls /Users/alanguyen/Code/Others/zeppos-app-template/.claude/rules/
ls /Users/alanguyen/Code/Others/zepp-meditation/.claude/settings.local.json 2>&1
```

Expected: `app-json.md  pages.md` in both rules dirs; `No such file or directory` for settings.local.json.
