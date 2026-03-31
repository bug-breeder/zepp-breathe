---
title: Claude Code Best Practices — Round 2
date: 2026-03-31
status: approved
repos: zepphyr, zeppos-app-template, zepp-meditation
---

## Goal

Apply remaining Claude Code best practices identified from a fresh audit of the official docs. Builds on the previous refactor (hooks, CLAUDE.md trim, plugin commands→skills migration). Focuses on: live imports in CLAUDE.md, context compaction guidance, path-scoped rules, skill sandboxing, and housekeeping.

No app logic changes. No breaking changes to existing behavior.

---

## Architecture

```
zepphyr (plugin)
  skills/new-page/SKILL.md    ✏️  add allowed-tools: Read,Glob,Edit,Write,Bash(npm run verify:*),Bash(git add:*),Bash(git commit:*)

zepp-meditation (app)
  CLAUDE.md                   ✏️  @package.json import, compaction guidance, subagent hint
  .claude/settings.local.json 🗑️  deleted (leftover dev artifact)
  .claude/rules/
    pages.md                  🆕  ZeRoUI patterns — auto-loads for pages/**/*.js
    app-json.md               🆕  registration reminders — auto-loads for app.json

zeppos-app-template (template)
  CLAUDE.md                   ✏️  same changes as zepp-meditation
  .claude/rules/
    pages.md                  🆕  same as zepp-meditation
    app-json.md               🆕  same as zepp-meditation
```

### Context loading model after this change

| When Claude edits... | What loads |
|---|---|
| Any file | CLAUDE.md (~40 lines) + zepphyr skill descriptions |
| `pages/**/*.js` | + `.claude/rules/pages.md` (ZeRoUI patterns, auto) |
| `app.json` | + `.claude/rules/app-json.md` (registration checklist, auto) |
| `/zepphyr:zeppos [q]` | + full zeppos-platform skill content (on demand) |
| `/zepphyr:new-page` | + new-page skill runs in fork with restricted tools |

---

## Changes

### 1. zepphyr — `allowed-tools` on `new-page` skill

Add `allowed-tools` to the frontmatter of `skills/new-page/SKILL.md`:

```yaml
allowed-tools: Read, Glob, Edit, Write, Bash(npm run verify:*), Bash(git add:*), Bash(git commit:*)
```

The fork can only do what scaffolding actually requires. No unrestricted bash, no grep, no push.

Also update the plugin cache at `~/.claude/plugins/cache/zepphyr/zepphyr/1.0.0/skills/new-page/SKILL.md`.

---

### 2. Both consumer repos — CLAUDE.md

Three changes to `CLAUDE.md` in both `zepp-meditation` and `zeppos-app-template`:

#### 2a. Replace Dev Commands table with `@package.json` import

Remove the hardcoded 5-row table. Replace with:

```markdown
## Dev Commands

See `@package.json` for all available scripts. Key ones: `dev` (simulator), `build` (dist), `preview` (device), `verify` (lint + format + build — run before commit).
```

#### 2b. Add compaction guidance to Quality Gates

```markdown
## Quality Gates

Run `npm run verify` before every commit. No unused `catch (e)` binding — use `catch { }`.

**When compacting:** preserve the current branch name, which files were modified, and the last `npm run verify` result.
```

#### 2c. Add subagent delegation hint after Slash Commands table

```markdown
For large investigations (reading many files, tracing a bug across pages), ask Claude to use a subagent so the exploration doesn't consume your main context.
```

**Note for `zeppos-app-template`:** keep the template version — no "This App" section. Changes are otherwise identical.

---

### 3. Both consumer repos — `.claude/rules/`

#### `pages.md`

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

#### `app-json.md`

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

---

### 4. zepp-meditation — delete `settings.local.json`

Delete `.claude/settings.local.json`. This file contains temporary permissions from the zepphyr migration work (mkdir, cp, rm, node syntax checks) that are no longer needed. All real permissions live in `settings.json`.

---

## Out of Scope

- Moving hooks to zepphyr plugin (hook safety concern — plugin can't guarantee toolchain)
- Non-interactive CI mode patterns
- Agent teams / multi-session patterns
- Any app logic changes
