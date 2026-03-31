# Claude Code Best Practices Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor all three ZeppOS repos (zepphyr, zepp-meditation, zeppos-app-template) so quality gates are deterministic (hooks), commands have a single source of truth (plugin), and CLAUDE.md is lean enough that Claude reliably follows every rule.

**Architecture:** Commands (`/new-page`, `/review`) migrate from both consumer repos into zepphyr and become available everywhere via the installed plugin. Hooks added to both consumer repos' `.claude/settings.json` auto-run `eslint --fix` after every file edit. Both CLAUDE.md files are trimmed from ~117 lines to ~40 lines by removing content already covered by zepphyr skills.

**Tech Stack:** Claude Code plugin system, `.claude/settings.json` hooks, ZeppOS / npm / eslint

> **Note:** The design spec listed adding `commands/zeppos.md` to zepphyr. This is unnecessary — the `zeppos-platform` skill already has `name: zeppos` + `user-invocable: true`, so `/zeppos [question]` already works as a real command from the plugin.

---

## File Map

| File | Repo | Change |
|---|---|---|
| `commands/new-page.md` | zepphyr | CREATE |
| `commands/review.md` | zepphyr | CREATE |
| `.claude/settings.json` | zepp-meditation | MODIFY — add hooks |
| `CLAUDE.md` | zepp-meditation | MODIFY — trim to ~40 lines |
| `.claude/commands/new-page.md` | zepp-meditation | DELETE |
| `.claude/commands/review.md` | zepp-meditation | DELETE |
| `.claude/settings.json` | zeppos-app-template | MODIFY — add hooks |
| `CLAUDE.md` | zeppos-app-template | MODIFY — trim to ~40 lines |
| `.claude/commands/new-page.md` | zeppos-app-template | DELETE |
| `.claude/commands/review.md` | zeppos-app-template | DELETE |

---

## Task 1: Add commands to zepphyr

**Files:**
- Create: `/Users/alanguyen/Code/Others/zepphyr/commands/new-page.md`
- Create: `/Users/alanguyen/Code/Others/zepphyr/commands/review.md`

- [ ] **Step 1: Create `commands/new-page.md`**

```bash
mkdir -p /Users/alanguyen/Code/Others/zepphyr/commands
```

Write `/Users/alanguyen/Code/Others/zepphyr/commands/new-page.md`:

```markdown
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
```

- [ ] **Step 2: Create `commands/review.md`**

Write `/Users/alanguyen/Code/Others/zepphyr/commands/review.md`:

```markdown
Review the pull request: $ARGUMENTS

Use the `zepphyr:zeppos-reviewer` agent to perform this review.
If `$ARGUMENTS` contains a PR number, pass it to the agent.
If `$ARGUMENTS` is empty, review the current branch's open PR.
```

- [ ] **Step 3: Commit and push zepphyr**

```bash
cd /Users/alanguyen/Code/Others/zepphyr
git add commands/
git status
```

Expected: `commands/new-page.md` and `commands/review.md` staged.

```bash
git commit -m "feat: add new-page and review commands"
unset GITHUB_TOKEN && git push origin main
```

Expected: push succeeds to `bug-breeder/zepphyr`.

---

## Task 2: Reinstall plugin in both repos

The plugin cache at `~/.claude/plugins/cache/zepphyr/` must be refreshed so both repos pick up the new commands.

- [ ] **Step 1: Update plugin in zepp-meditation**

In Claude Code with working directory `zepp-meditation`, run:
```
/plugin update zepphyr@zepphyr
```

Expected: plugin reinstalls from `bug-breeder/zepphyr` at the new commit.

- [ ] **Step 2: Verify `/new-page` command is available**

In Claude Code with working directory `zepp-meditation`, run:
```
/new-page TestVerify
```

Expected: Claude creates `pages/test-verify/index.js` with ZeRoUI template and adds it to `app.json`.

Then delete the test page (revert `app.json` change and delete `pages/test-verify/`):
```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
git checkout app.json
rm -rf pages/test-verify
```

- [ ] **Step 3: Update plugin in zeppos-app-template**

In Claude Code with working directory `zeppos-app-template`, run:
```
/plugin update zepphyr@zepphyr
```

Expected: plugin reinstalls.

---

## Task 3: Add hooks to zepp-meditation

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zepp-meditation/.claude/settings.json`

- [ ] **Step 1: Add hooks block to settings.json**

The current `settings.json` has `permissions`, `extraKnownMarketplaces`, and `enabledPlugins`. Add a `hooks` key at the top level.

New `/Users/alanguyen/Code/Others/zepp-meditation/.claude/settings.json`:

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
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint:fix -- --quiet || true"
          }
        ]
      }
    ]
  },
  "extraKnownMarketplaces": {
    "zepphyr": {
      "source": { "source": "github", "repo": "bug-breeder/zepphyr" }
    }
  },
  "enabledPlugins": {
    "zepphyr@zepphyr": true
  }
}
```

> **If the hook doesn't fire:** Run `/hooks` in Claude Code to inspect and reconfigure interactively. The Claude Code hooks guide at `https://code.claude.com/docs/en/hooks-guide` has the authoritative schema.

- [ ] **Step 2: Verify hook fires**

Edit any `.js` file in zepp-meditation (add and then remove a blank comment line). Claude Code should automatically run `npm run lint:fix` after the edit. Confirm in the terminal output.

- [ ] **Step 3: Commit**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
git add .claude/settings.json
git commit -m "chore: add PostToolUse hook for auto-lint on file edit"
```

---

## Task 4: Trim CLAUDE.md and delete commands/ in zepp-meditation

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zepp-meditation/CLAUDE.md`
- Delete: `/Users/alanguyen/Code/Others/zepp-meditation/.claude/commands/new-page.md`
- Delete: `/Users/alanguyen/Code/Others/zepp-meditation/.claude/commands/review.md`

- [ ] **Step 1: Replace CLAUDE.md**

Write `/Users/alanguyen/Code/Others/zepp-meditation/CLAUDE.md`:

```markdown
# Breathe

**App:** Haptic-guided breathing exercises for smartwatch
**App ID:** 10000001 (placeholder — replace in `app.json`, get from [Zepp Open Platform](https://open.zepp.com/))
**Platform:** ZeppOS smartwatches (round OLED, 480px) — API 3.6 compatible / 3.7 target

---

## Setup (one-time, per machine)

```bash
git init && npm install
npm install -g @zeppos/zeus-cli
zeus login
```

In Claude Code: `/plugin marketplace add bug-breeder/zepphyr` then `/plugin install zepphyr@zepphyr`

---

## Platform — Non-Negotiables

- **ZeRoUI required** — `import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui'` for all page layout
- **Black background** — use `COLOR.BG` (`0x000000`) on every page; OLED turns off black pixels
- **QuickJS runtime** — ES2020 subset; no DOM, no Node.js, no browser APIs

For full platform gotchas and API reference: `/zeppos` or `/zeppos [question]`

---

## Dev Commands

| Command            | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | Build + launch in simulator                     |
| `npm run build`    | Build `.zab` installer → `dist/`                |
| `npm run preview`  | Build + push to device                          |
| `npm run verify`   | Lint + format check + build — run before commit |
| `npm run lint:fix` | Auto-fix lint errors                            |

---

## Quality Gates

Run `npm run verify` before every commit. No unused `catch (e)` binding — use `catch { }`.

---

## This App

**Pages:** `home` → `setup` → `session` → `stats`
**Techniques:** `box` (4-4-4-4), `478` (4-7-8), `simple` (4-4) — defined in `utils/techniques.js`
**Storage:** keys via `getKey()` in `utils/storage.js`; pass data between pages via `params: JSON.stringify({...})`

---

## Slash Commands

| Command                | When to use                                       |
| ---------------------- | ------------------------------------------------- |
| `/zeppos [question]`   | ZeppOS platform cheatsheet + gotchas              |
| `/new-page <PageName>` | Scaffold a new page and register it in `app.json` |
| `/review [PR#]`        | ZeppOS-aware automated PR review                  |
```

- [ ] **Step 2: Delete local commands**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
git rm .claude/commands/new-page.md .claude/commands/review.md
```

Expected: both files removed from disk and staged for deletion.

- [ ] **Step 3: Run verify**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
npm run verify
```

Expected: lint + format check + zeus build all pass with 0 errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
git add CLAUDE.md
git commit -m "chore: trim CLAUDE.md and remove local commands (now in zepphyr)"
```

---

## Task 5: Add hooks to zeppos-app-template

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zeppos-app-template/.claude/settings.json`

- [ ] **Step 1: Read current settings.json**

Read `/Users/alanguyen/Code/Others/zeppos-app-template/.claude/settings.json` to confirm it matches zepp-meditation's (same permissions list).

- [ ] **Step 2: Add hooks block**

Write `/Users/alanguyen/Code/Others/zeppos-app-template/.claude/settings.json`:

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
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint:fix -- --quiet || true"
          }
        ]
      }
    ]
  },
  "extraKnownMarketplaces": {
    "zepphyr": {
      "source": { "source": "github", "repo": "bug-breeder/zepphyr" }
    }
  },
  "enabledPlugins": {
    "zepphyr@zepphyr": true
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/alanguyen/Code/Others/zeppos-app-template
git add .claude/settings.json
git commit -m "chore: add PostToolUse hook for auto-lint on file edit"
```

---

## Task 6: Trim CLAUDE.md and delete commands/ in zeppos-app-template

**Files:**
- Modify: `/Users/alanguyen/Code/Others/zeppos-app-template/CLAUDE.md`
- Delete: `/Users/alanguyen/Code/Others/zeppos-app-template/.claude/commands/new-page.md`
- Delete: `/Users/alanguyen/Code/Others/zeppos-app-template/.claude/commands/review.md`

- [ ] **Step 1: Replace CLAUDE.md**

Write `/Users/alanguyen/Code/Others/zeppos-app-template/CLAUDE.md`:

```markdown
# [APP_NAME]

> **TODO:** Replace `[APP_NAME]`, `[APP_DESCRIPTION]`, and `[APP_ID]` with your app's details.

**App:** [APP_DESCRIPTION — one sentence]
**App ID:** [APP_ID — replace `10000001` in `app.json`; get from [Zepp Open Platform](https://open.zepp.com/)]
**Platform:** ZeppOS smartwatches (round OLED, 480px) — API 3.6 compatible / 3.7 target

---

## Setup (one-time, per machine)

```bash
git init && npm install
npm install -g @zeppos/zeus-cli
zeus login
```

In Claude Code: `/plugin marketplace add bug-breeder/zepphyr` then `/plugin install zepphyr@zepphyr`

---

## Platform — Non-Negotiables

- **ZeRoUI required** — `import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui'` for all page layout
- **Black background** — use `COLOR.BG` (`0x000000`) on every page; OLED turns off black pixels
- **QuickJS runtime** — ES2020 subset; no DOM, no Node.js, no browser APIs

For full platform gotchas and API reference: `/zeppos` or `/zeppos [question]`

---

## Dev Commands

| Command            | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | Build + launch in simulator                     |
| `npm run build`    | Build `.zab` installer → `dist/`                |
| `npm run preview`  | Build + push to device                          |
| `npm run verify`   | Lint + format check + build — run before commit |
| `npm run lint:fix` | Auto-fix lint errors                            |

---

## Quality Gates

Run `npm run verify` before every commit. No unused `catch (e)` binding — use `catch { }`.

---

## Slash Commands

| Command                | When to use                                       |
| ---------------------- | ------------------------------------------------- |
| `/zeppos [question]`   | ZeppOS platform cheatsheet + gotchas              |
| `/new-page <PageName>` | Scaffold a new page and register it in `app.json` |
| `/review [PR#]`        | ZeppOS-aware automated PR review                  |
```

- [ ] **Step 2: Delete local commands**

```bash
cd /Users/alanguyen/Code/Others/zeppos-app-template
git rm .claude/commands/new-page.md .claude/commands/review.md
```

Expected: both files removed from disk and staged for deletion.

- [ ] **Step 3: Run verify**

```bash
cd /Users/alanguyen/Code/Others/zeppos-app-template
npm run verify
```

Expected: lint + format check + zeus build all pass with 0 errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/alanguyen/Code/Others/zeppos-app-template
git add CLAUDE.md
git commit -m "chore: trim CLAUDE.md and remove local commands (now in zepphyr)"
```

---

## Task 7: Push all repos and final verification

- [ ] **Step 1: Push zeppos-app-template**

```bash
unset GITHUB_TOKEN && git -C /Users/alanguyen/Code/Others/zeppos-app-template push origin main
```

- [ ] **Step 2: Push zepp-meditation**

```bash
unset GITHUB_TOKEN && git -C /Users/alanguyen/Code/Others/zepp-meditation push origin main
```

- [ ] **Step 3: Smoke-test `/new-page` from zepphyr**

In Claude Code with working directory `zepp-meditation`:
```
/new-page SmokeTest
```

Expected:
- `pages/smoke-test/index.js` created with full ZeRoUI template
- `app.json` updated with `"pages/smoke-test/index"`
- `npm run lint` reports 0 errors

Clean up:
```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
git checkout app.json
rm -rf pages/smoke-test
```

- [ ] **Step 4: Smoke-test hook behavior**

In Claude Code with working directory `zepp-meditation`, ask Claude to add a blank comment to `utils/constants.js` and then remove it. Confirm that `npm run lint:fix` runs automatically after the edit (visible in Claude Code's tool output).

- [ ] **Step 5: Final verify both repos**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation && npm run verify
cd /Users/alanguyen/Code/Others/zeppos-app-template && npm run verify
```

Expected: both pass with 0 errors and 0 warnings.
