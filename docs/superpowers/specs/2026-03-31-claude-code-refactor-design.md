---
title: Claude Code Best Practices Refactor
date: 2026-03-31
status: approved
repos: zepphyr, zeppos-app-template, zepp-meditation
---

## Goal

Improve all three repos as a system using Claude Code best practices — specifically: make quality gates deterministic (hooks), eliminate command duplication (plugin-first commands), and reduce CLAUDE.md noise (trim to essentials).

No new features. No app logic changes. Pure Claude Code ergonomics.

---

## Architecture

```
zepphyr (plugin)                    ← single source of truth for shared Claude logic
  skills/
    zeppos-platform/  (unchanged)   ← auto-triggered platform knowledge + gotchas
    zeroui/           (unchanged)   ← auto-triggered ZeRoUI API reference
  agents/
    zeppos-reviewer   (unchanged)   ← invoked by /review
  commands/           NEW
    new-page.md       ← migrated from both consumer repos
    review.md         ← migrated from both consumer repos
    zeppos.md         ← new: formalizes /zeppos cheatsheet command

zeppos-app-template                 ← thin; inherits commands/skills from zepphyr
  CLAUDE.md           trimmed       ← ~35 lines, app-agnostic essentials only
  .claude/
    settings.json     updated       ← add hooks block
    commands/         DELETED       ← now in zepphyr

zepp-meditation (breathe)           ← thin; inherits commands/skills from zepphyr
  CLAUDE.md           trimmed       ← ~35 lines, adds app-specific facts
  .claude/
    settings.json     updated       ← add hooks block
    commands/         DELETED       ← now in zepphyr
```

**Principle:** zepphyr owns anything that applies to any ZeppOS project. Consumer repos own only what is unique to them.

---

## Changes by Repo

### zepphyr

#### Add `commands/new-page.md`
Migrated from both consumer repos verbatim. Scaffolds a new ZeppOS page with ZeRoUI pattern and registers it in `app.json`. Works generically across any ZeppOS project following the standard structure.

#### Add `commands/review.md`
Migrated from consumer repos. Delegates to the `zeppos-reviewer` agent. Within the plugin, references the agent as `zeppos-reviewer` directly (no `zepphyr:` namespace prefix needed).

#### Add `commands/zeppos.md`
New file. CLAUDE.md in both repos documents `/zeppos` as a slash command but no command file exists — it's an undocumented gap. This adds a command file that invokes the `zeppos-platform` skill with `$ARGUMENTS`, making `/zeppos [question]` a real, discoverable command.

#### No changes to skills or agents
`zeppos-platform`, `zeroui`, and `zeppos-reviewer` are already well-structured. Do not touch them.

---

### Both consumer repos (zepp-meditation + zeppos-app-template)

#### Add hooks to `.claude/settings.json`

```json
"hooks": {
  "PostToolUse": [{
    "matcher": "Edit|Write",
    "hooks": [{
      "type": "command",
      "command": "npm run lint:fix -- --quiet 2>/dev/null || true"
    }]
  }]
}
```

After every file edit, eslint auto-fixes the codebase. `|| true` prevents hook failure from blocking Claude mid-task. Format (`prettier`) is already handled by the lint-staged pre-commit hook — no need to run it on every save. Full `npm run verify` (zeus build included) stays as the manual pre-commit gate — too slow to run on every save.

> **Implementation note:** Verify the exact hook schema against Claude Code hooks documentation before writing the settings.json. In particular: confirm `matcher` syntax for Edit/Write tools and whether a file-path env var is available to scope eslint to just the edited file (more efficient than running on all files).

#### Delete `.claude/commands/`
`new-page.md` and `review.md` are now in zepphyr. No local commands remain.

#### Trim `CLAUDE.md` from ~117 lines to ~35 lines

**Remove** (already covered by zepphyr skills — Claude loads on demand):
- Platform Constraints section — fully covered by `zeppos-platform` skill
- Top 7 Gotchas section — fully covered by `zeppos-platform` skill
- Project Structure table — Claude reads the directory directly
- ZeRoUI import example — covered by `zeroui` skill

**Keep:**
- App metadata (name, ID, platform target)
- One-time setup commands
- Three non-negotiable platform reminders: ZeRoUI required, black background, QuickJS
- Dev commands table
- Quality gates (2-3 lines: run verify before commit, no unused catch bindings)
- Slash commands table

**zepp-meditation only — also keep:**
- App-specific page list
- Technique names and storage key names
- Note on inter-page param passing pattern used in this app

---

## What This Achieves

| Before | After |
|---|---|
| Quality gates advisory (CLAUDE.md) | Quality gates deterministic (hooks auto-run lint+format) |
| Commands duplicated in 2 repos | Commands in zepphyr, zero duplication |
| CLAUDE.md 117 lines — bloat risk | CLAUDE.md ~35 lines — rules reliably followed |
| /zeppos documented but command missing | /zeppos is a real command |
| Plugin and repos can drift | Plugin is authoritative; repos are thin |

---

## Out of Scope

- Non-interactive / CI mode patterns (add when needed)
- Agent teams / multi-session patterns (add when needed)
- New skills or agents
- Any changes to app logic, ZeRoUI, or page code
