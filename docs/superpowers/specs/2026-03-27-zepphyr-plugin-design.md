# Zepphyr Plugin Design

**Goal:** Centralize the ZeppOS platform skill, ZeRoUI skill, and zeppos-reviewer agent into a single installable Claude Code plugin (`bug-breeder/zepphyr`), eliminating duplication across zepp app repos.

**Architecture:** A public GitHub repo (`bug-breeder/zepphyr`) acts as a Claude Code plugin. Consuming repos (`zepp-breathe`, `zeppos-app-template`) remove their local `.claude/skills/` and `.claude/agents/` copies and install the plugin once per machine. Commands stay local in each repo.

---

## Repo Structure

```
bug-breeder/zepphyr/
  .claude-plugin/
    plugin.json
  skills/
    zeppos-platform/
      SKILL.md
      references/
        api.md
    zeroui/
      SKILL.md
      references/
        api.md
  agents/
    zeppos-reviewer.md
  README.md
```

### plugin.json

```json
{
  "name": "zepphyr",
  "description": "ZeppOS platform + ZeRoUI skills and reviewer agent for zepp watch apps",
  "skills": ["skills/zeppos-platform", "skills/zeroui"],
  "agents": ["agents/zeppos-reviewer.md"]
}
```

- **No marketplace.json** — direct install is simpler for a single plugin; no indirection needed
- **No version pinning** — always tracks latest `main`; the plugin owner and consuming repo owner are the same person
- **Public repo** — skills document public APIs only; public = auto-updates work without `GITHUB_TOKEN`

---

## Skills and Agent Content

Content moves verbatim from `zepp-breathe`'s `.claude/skills/` and `.claude/agents/` (source of truth — just merged in PR #1). No content changes during migration.

The `zeppos-reviewer` agent references skills as `zeppos-platform` and `zeroui` (relative within the plugin). If namespaced references are required at runtime, update to `zepphyr:zeppos-platform` and `zepphyr:zeroui` after testing.

---

## Consuming Repo Changes

Applies to `zepp-breathe` and `zeppos-app-template`:

| Path | Action |
|---|---|
| `.claude/skills/` | Delete entire directory |
| `.claude/agents/zeppos-reviewer.md` | Delete |
| `.claude/commands/new-page.md` | Keep — local scaffold, no change |
| `.claude/commands/review.md` | Keep — update agent reference from `zeppos-reviewer` to `zepphyr:zeppos-reviewer` if required |
| `CLAUDE.md` setup section | Add plugin install instruction |

`ZeRoUI` repo has no skills or agents. Only change: add plugin install instruction to `CLAUDE.md` setup section.

### CLAUDE.md setup line (all three repos)

```
/plugin install github:bug-breeder/zepphyr   # ZeppOS + ZeRoUI skills
```

---

## Installation

One command per machine:

```bash
/plugin install github:bug-breeder/zepphyr
```

**Auto-updates:** Claude Code checks for updates at startup. No `GITHUB_TOKEN` needed (public repo).

**Manual update:** `/plugin marketplace update` (or reinstall)

---

## Migration Sequence

1. Create `bug-breeder/zepphyr` on GitHub (public, empty)
2. Set up repo structure: `.claude-plugin/plugin.json`, `skills/`, `agents/`, `README.md`
3. Copy skill + agent content from `zepp-breathe` `.claude/` (post-merge state)
4. Push to GitHub
5. Install locally: `/plugin install github:bug-breeder/zepphyr`
6. Smoke-test: invoke `/zepphyr:zeppos` and run a review — verify both work
7. PR to `zepp-breathe` — delete local `.claude/skills/` + `.claude/agents/`, update `CLAUDE.md`
8. PR to `zeppos-app-template` — same deletions + `CLAUDE.md` update
9. Update `ZeRoUI` `CLAUDE.md` — add plugin install line only

---

## What Stays Local (Not in Plugin)

| File | Stays in repo | Reason |
|---|---|---|
| `.claude/commands/new-page.md` | Each app repo | Repo-specific scaffold; short name `/new-page` > `/zepphyr:new-page` |
| `.claude/commands/review.md` | Each app repo | 3-line dispatcher; ergonomics + local override flexibility |
| `.claude/commands/add-component.md` | ZeRoUI only | ZeRoUI-internal command, not relevant to consumers |
| `.claude/settings.json` | Each repo | Repo-specific tool permissions |

---

## Out of Scope

- Marketplace setup (only needed if distributing multiple plugins)
- Version tagging / changelog (add when plugin is shared with others)
- npm distribution (no benefit over direct GitHub install for a private ecosystem)
