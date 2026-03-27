# Zepphyr Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `bug-breeder/zepphyr` Claude Code plugin repo and migrate skills/agent out of `zepp-breathe` and `zeppos-app-template` into it, eliminating duplication.

**Architecture:** New public GitHub repo `bug-breeder/zepphyr` acts as a Claude Code plugin containing two skills (`zeppos-platform`, `zeroui`) and one agent (`zeppos-reviewer`). Consuming repos (`zepp-breathe`, `zeppos-app-template`, `ZeRoUI`) remove local copies and document the one-time install in their CLAUDE.md. Commands stay local in each repo.

**Tech Stack:** GitHub (`gh` CLI), Claude Code plugin system (`.claude-plugin/plugin.json`), Markdown/YAML frontmatter

---

## File Map

**Create — new repo `bug-breeder/zepphyr` (cloned to `/Users/alanguyen/Code/Others/zepphyr`):**
- `.claude-plugin/plugin.json` — plugin metadata and registry
- `skills/zeppos-platform/SKILL.md` — migrated from `zepp-breathe` `origin/main`
- `skills/zeppos-platform/references/api.md` — migrated
- `skills/zeroui/SKILL.md` — migrated
- `skills/zeroui/references/api.md` — migrated
- `agents/zeppos-reviewer.md` — migrated
- `README.md`

**Modify — `zepp-breathe` (`/Users/alanguyen/Code/Others/zepp-meditation`):**
- Delete: `.claude/skills/` (entire directory — after merging `origin/main` which has these files)
- Delete: `.claude/agents/zeppos-reviewer.md`
- Edit: `CLAUDE.md` — add plugin install line to Setup section
- Edit: `.claude/commands/review.md` — update agent reference if namespacing is required

**Modify — `zeppos-app-template` (`/Users/alanguyen/Code/Others/zeppos-app-template`):**
- Delete: `.claude/skills/` (entire directory)
- Delete: `.claude/agents/zeppos-reviewer.md`
- Edit: `CLAUDE.md` — add plugin install line to Setup section

**Modify — `ZeRoUI` (`/Users/alanguyen/Code/Others/ZeRoUI`):**
- Edit: `CLAUDE.md` — add plugin install note for consumer app developers

---

### Task 1: Create zepphyr repo with plugin.json

**Working dir:** `/Users/alanguyen/Code/Others/`

**Files:**
- Create: `zepphyr/.claude-plugin/plugin.json`
- Create: `zepphyr/skills/zeppos-platform/references/` (empty, for Task 2)
- Create: `zepphyr/skills/zeroui/references/` (empty, for Task 3)
- Create: `zepphyr/agents/` (empty, for Task 4)

- [ ] **Step 1: Switch to bug-breeder account and create repo**

```bash
cd /Users/alanguyen/Code/Others
unset GITHUB_TOKEN
gh auth switch --user bug-breeder
gh repo create bug-breeder/zepphyr \
  --public \
  --description "ZeppOS platform + ZeRoUI skills and reviewer agent for zepp watch apps" \
  --clone
```

Expected: Repo created at `github.com/bug-breeder/zepphyr`, cloned to `./zepphyr/`.

- [ ] **Step 2: Create directory structure**

```bash
cd zepphyr
mkdir -p .claude-plugin \
         skills/zeppos-platform/references \
         skills/zeroui/references \
         agents
```

- [ ] **Step 3: Write plugin.json**

Create `.claude-plugin/plugin.json`:

```json
{
  "name": "zepphyr",
  "description": "ZeppOS platform + ZeRoUI skills and reviewer agent for zepp watch apps",
  "skills": ["skills/zeppos-platform", "skills/zeroui"],
  "agents": ["agents/zeppos-reviewer.md"]
}
```

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "feat: init plugin structure and plugin.json"
```

---

### Task 2: Migrate zeppos-platform skill

**Working dir:** `/Users/alanguyen/Code/Others/zepphyr`

The skill content lives on `zepp-breathe`'s `origin/main` (merged there via PR #1). Extract directly with `git show` — no checkout needed.

**Files:**
- Create: `skills/zeppos-platform/SKILL.md`
- Create: `skills/zeppos-platform/references/api.md`

- [ ] **Step 1: Extract SKILL.md**

```bash
git -C /Users/alanguyen/Code/Others/zepp-meditation fetch origin
git -C /Users/alanguyen/Code/Others/zepp-meditation show \
  origin/main:.claude/skills/zeppos-platform/SKILL.md \
  > skills/zeppos-platform/SKILL.md
```

- [ ] **Step 2: Verify the file starts with correct frontmatter**

```bash
head -8 skills/zeppos-platform/SKILL.md
```

Expected:
```
---
name: zeppos
description: Use when writing ZeppOS code, importing @zos/* APIs, or debugging platform behavior...
argument-hint: [question]
user-invocable: true
---
```

If the output doesn't start with `---` and `name: zeppos`, the git show path is wrong — recheck the origin/main tree with `git -C /Users/alanguyen/Code/Others/zepp-meditation ls-tree origin/main:.claude/skills/`.

- [ ] **Step 3: Extract references/api.md**

```bash
git -C /Users/alanguyen/Code/Others/zepp-meditation show \
  origin/main:.claude/skills/zeppos-platform/references/api.md \
  > skills/zeppos-platform/references/api.md
```

- [ ] **Step 4: Verify api.md has content**

```bash
wc -l skills/zeppos-platform/references/api.md
```

Expected: 100+ lines.

- [ ] **Step 5: Commit**

```bash
git add skills/zeppos-platform/
git commit -m "feat: add zeppos-platform skill"
```

---

### Task 3: Migrate zeroui skill

**Working dir:** `/Users/alanguyen/Code/Others/zepphyr`

**Files:**
- Create: `skills/zeroui/SKILL.md`
- Create: `skills/zeroui/references/api.md`

- [ ] **Step 1: Extract SKILL.md**

```bash
git -C /Users/alanguyen/Code/Others/zepp-meditation show \
  origin/main:.claude/skills/zeroui/SKILL.md \
  > skills/zeroui/SKILL.md
```

- [ ] **Step 2: Verify frontmatter has user-invocable: false**

```bash
head -8 skills/zeroui/SKILL.md
```

Expected:
```
---
name: zeroui
description: Use when building pages with ZeRoUI (@bug-breeder/zeroui)...
user-invocable: false
---
```

`user-invocable: false` is critical — keeps this skill hidden from the `/` menu; it's preloaded by the `zeppos-reviewer` agent only.

- [ ] **Step 3: Extract references/api.md**

```bash
git -C /Users/alanguyen/Code/Others/zepp-meditation show \
  origin/main:.claude/skills/zeroui/references/api.md \
  > skills/zeroui/references/api.md
```

- [ ] **Step 4: Commit**

```bash
git add skills/zeroui/
git commit -m "feat: add zeroui skill"
```

---

### Task 4: Migrate zeppos-reviewer agent

**Working dir:** `/Users/alanguyen/Code/Others/zepphyr`

**Files:**
- Create: `agents/zeppos-reviewer.md`

- [ ] **Step 1: Extract agent file**

```bash
git -C /Users/alanguyen/Code/Others/zepp-meditation show \
  origin/main:.claude/agents/zeppos-reviewer.md \
  > agents/zeppos-reviewer.md
```

- [ ] **Step 2: Check skill references in frontmatter**

```bash
head -15 agents/zeppos-reviewer.md
```

Expected frontmatter:
```yaml
---
name: zeppos-reviewer
tools: Read, Bash, Glob, Grep
skills:
  - zeppos-platform
  - zeroui
model: sonnet
---
```

Keep these as `zeppos-platform` and `zeroui` (relative references within the same plugin). If the smoke-test in Task 6 shows the reviewer can't load its skills, update them to `zepphyr:zeppos-platform` and `zepphyr:zeroui` then.

- [ ] **Step 3: Commit**

```bash
git add agents/zeppos-reviewer.md
git commit -m "feat: add zeppos-reviewer agent"
```

---

### Task 5: Add README and push to GitHub

**Working dir:** `/Users/alanguyen/Code/Others/zepphyr`

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

Create `README.md` with this exact content:

````markdown
# zepphyr

Claude Code plugin — ZeppOS platform skills, ZeRoUI skills, and zeppos-reviewer agent for building zepp watch apps.

## Install

In any Claude Code session:

```
/plugin install github:bug-breeder/zepphyr
```

## What's included

| Name | Type | Trigger |
|------|------|---------|
| `zeppos` | Skill | Auto — ZeppOS code, `@zos/*` imports, platform questions |
| `zeroui` | Skill | Auto (agent-preloaded) — ZeRoUI code, `@bug-breeder/zeroui` usage |
| `zeppos-reviewer` | Agent | Via `/review` command in consuming repos |

## Update

```
/plugin marketplace update
```
````

- [ ] **Step 2: Commit and push**

```bash
git add README.md
git commit -m "docs: add README"
git push -u origin main
```

Expected: All 5 commits pushed. Repo visible at `github.com/bug-breeder/zepphyr` with the full directory structure.

---

### Task 6: Install plugin and smoke-test

This task verifies the plugin works **before** removing skills from consuming repos. Do not proceed to Task 7 until smoke-test passes.

- [ ] **Step 1: Install the plugin**

In a Claude Code session (any project):

```
/plugin install github:bug-breeder/zepphyr
```

Expected: No error. Plugin listed when you run `/plugin list` (or equivalent).

- [ ] **Step 2: Verify zeppos skill responds**

Ask Claude: `What's the 600ms onInit timeout gotcha in ZeppOS?`

Expected: Claude answers with the specific 600ms timeout detail from the platform skill (ZeppOS kills the app if `onInit` doesn't return within 600ms). If Claude gives a generic answer without this detail, the skill didn't load — check plugin.json paths.

- [ ] **Step 3: Verify reviewer agent runs**

Open a Claude Code session against `/Users/alanguyen/Code/Others/zepp-meditation`. Run:

```
/review
```

Expected: `zeppos-reviewer` agent runs, producing a structured review with **Verdict**, **Checks**, **Issues**, **Summary** sections.

- [ ] **Step 4: If reviewer can't find its skills — fix agent and push**

If the reviewer runs but doesn't use the zeppos/zeroui knowledge (e.g., misses platform-specific issues), the agent's skill references need namespacing. Edit `agents/zeppos-reviewer.md`:

```yaml
skills:
  - zepphyr:zeppos-platform
  - zepphyr:zeroui
```

Then:
```bash
cd /Users/alanguyen/Code/Others/zepphyr
git add agents/zeppos-reviewer.md
git commit -m "fix: namespace skill references in agent frontmatter"
git push
```

Reinstall the plugin and repeat Step 3.

---

### Task 7: Clean up zepp-breathe and open PR

**Working dir:** `/Users/alanguyen/Code/Others/zepp-meditation`

**Context:** Local `main` diverged from `origin/main` after the ecosystem PR was squash-merged. Local main has docs commits; origin/main has the skills/agents. Merging first brings the skills into local main so the deletion is meaningful.

**Files:**
- Delete: `.claude/skills/` (after merge brings it in from origin/main)
- Delete: `.claude/agents/zeppos-reviewer.md`
- Edit: `CLAUDE.md`
- Edit: `.claude/commands/review.md` (if needed per Task 6 smoke-test result)

- [ ] **Step 1: Reconcile local main with origin/main**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
git fetch origin
git merge origin/main --no-edit
```

Expected: Clean merge — origin/main added `.claude/skills/` and `.claude/agents/` (new files); local main added docs files. No conflicts.

After merge, verify skills exist:
```bash
ls .claude/skills/
```
Expected: `zeppos-platform  zeroui`

- [ ] **Step 2: Create feature branch**

```bash
git checkout -b feature/migrate-to-zepphyr
```

- [ ] **Step 3: Remove local skills and agent**

```bash
rm -rf .claude/skills/
rm .claude/agents/zeppos-reviewer.md
rmdir .claude/agents
```

Verify:
```bash
ls .claude/
```
Expected: `commands  settings.json  settings.local.json` — no `skills/` or `agents/`.

- [ ] **Step 4: Add plugin install to CLAUDE.md Setup section**

Open `CLAUDE.md`. The current Setup section ends after the bash block with the closing triple-backtick. Add one line after that block:

Before:
```markdown
## Setup (one-time, per machine)

```bash
git init                                    # must run before npm install (Husky needs git)
npm install                                 # installs deps + sets up pre-commit hook
npm install -g @zeppos/zeus-cli            # ZeppOS build tool (global)
zeus login                                  # required for device preview
```

---
```

After:
```markdown
## Setup (one-time, per machine)

```bash
git init                                    # must run before npm install (Husky needs git)
npm install                                 # installs deps + sets up pre-commit hook
npm install -g @zeppos/zeus-cli            # ZeppOS build tool (global)
zeus login                                  # required for device preview
```

In Claude Code: `/plugin install github:bug-breeder/zepphyr`

---
```

- [ ] **Step 5: Update review.md if agent needs namespacing**

Check whether Task 6 Step 4 was triggered (agent skill references were namespaced). If yes, also update `.claude/commands/review.md`:

Current content:
```markdown
Review the pull request: $ARGUMENTS

Use the `zeppos-reviewer` agent to perform this review.
If `$ARGUMENTS` contains a PR number, pass it to the agent.
If `$ARGUMENTS` is empty, review the current branch's open PR.
```

Update the agent name to `zepphyr:zeppos-reviewer`:
```markdown
Review the pull request: $ARGUMENTS

Use the `zepphyr:zeppos-reviewer` agent to perform this review.
If `$ARGUMENTS` contains a PR number, pass it to the agent.
If `$ARGUMENTS` is empty, review the current branch's open PR.
```

If Task 6 Step 4 was NOT triggered (relative references worked), skip this step.

- [ ] **Step 6: Verify app build still passes**

```bash
npm run verify
```

Expected: lint + format + zeus build all pass. Skills/agents are markdown only — removing them does not affect the app build.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: migrate skills/agent to zepphyr plugin"
```

- [ ] **Step 8: Push and create PR**

```bash
unset GITHUB_TOKEN
git push -u origin feature/migrate-to-zepphyr
gh pr create \
  --title "feat: migrate skills/agent to zepphyr plugin" \
  --body "$(cat <<'EOF'
## Summary
- Remove `.claude/skills/zeppos-platform/`, `.claude/skills/zeroui/`, `.claude/agents/zeppos-reviewer.md`
- Add `/plugin install github:bug-breeder/zepphyr` to CLAUDE.md setup section
- Skills and agent are now distributed via the zepphyr plugin (`github.com/bug-breeder/zepphyr`)

## Test plan
- [ ] `npm run verify` passes
- [ ] Install zepphyr plugin and verify `/zepphyr:zeppos` triggers on ZeppOS questions
- [ ] Run `/review` and verify zeppos-reviewer agent works
EOF
)"
```

---

### Task 8: Clean up zeppos-app-template and open PR

**Working dir:** `/Users/alanguyen/Code/Others/zeppos-app-template`

**Files:**
- Delete: `.claude/skills/zeppos-platform/`
- Delete: `.claude/skills/zeroui/`
- Delete: `.claude/agents/zeppos-reviewer.md`
- Edit: `CLAUDE.md`
- Edit: `.claude/commands/review.md` (same logic as Task 7 Step 5)

- [ ] **Step 1: Create feature branch**

```bash
cd /Users/alanguyen/Code/Others/zeppos-app-template
git checkout -b feature/migrate-to-zepphyr
```

- [ ] **Step 2: Remove local skills and agent**

```bash
rm -rf .claude/skills/
rm .claude/agents/zeppos-reviewer.md
rmdir .claude/agents
```

Verify:
```bash
ls .claude/
```
Expected: `commands  settings.json` — no `skills/` or `agents/`.

- [ ] **Step 3: Add plugin install to CLAUDE.md Setup section**

Open `CLAUDE.md`. The Setup section is identical to zepp-breathe's. Make the same edit:

After the closing triple-backtick of the bash block, add:

```
In Claude Code: `/plugin install github:bug-breeder/zepphyr`
```

So the section reads:
```markdown
## Setup (one-time, per machine)

```bash
git init                                    # must run before npm install (Husky needs git)
npm install                                 # installs deps + sets up pre-commit hook
npm install -g @zeppos/zeus-cli            # ZeppOS build tool (global)
zeus login                                  # required for device preview
```

In Claude Code: `/plugin install github:bug-breeder/zepphyr`

---
```

- [ ] **Step 4: Update review.md if agent was namespaced (same condition as Task 7 Step 5)**

If Task 6 Step 4 was triggered, update `.claude/commands/review.md` — same edit as Task 7 Step 5 (change `zeppos-reviewer` to `zepphyr:zeppos-reviewer`).

- [ ] **Step 5: Verify build still passes**

```bash
npm run verify
```

Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: migrate skills/agent to zepphyr plugin"
```

- [ ] **Step 7: Push and create PR**

```bash
unset GITHUB_TOKEN
git push -u origin feature/migrate-to-zepphyr
gh pr create \
  --title "feat: migrate skills/agent to zepphyr plugin" \
  --body "$(cat <<'EOF'
## Summary
- Remove `.claude/skills/zeppos-platform/`, `.claude/skills/zeroui/`, `.claude/agents/zeppos-reviewer.md`
- Add `/plugin install github:bug-breeder/zepphyr` to CLAUDE.md setup section

## Test plan
- [ ] `npm run verify` passes
- [ ] Install zepphyr plugin and verify skills trigger correctly
EOF
)"
```

---

### Task 9: Update ZeRoUI CLAUDE.md and open PR

**Working dir:** `/Users/alanguyen/Code/Others/ZeRoUI`

ZeRoUI has no local skills/agents to remove. Only change: add a plugin install note for app developers who consume ZeRoUI.

**Files:**
- Edit: `CLAUDE.md`

- [ ] **Step 1: Create feature branch**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
git checkout -b feature/add-zepphyr-plugin-note
```

- [ ] **Step 2: Add plugin note to CLAUDE.md**

The file currently starts:
```markdown
# ZeRoUI — ZeppOS Rounded UI Library

**Package:** `@bug-breeder/zeroui`
**Purpose:** UI library for ZeppOS round-display apps — design tokens, safe-zone system, Column layout, and hmUI component wrappers.

---

## Library Development
```

Add one line after the `---` separator, before `## Library Development`:

```markdown
# ZeRoUI — ZeppOS Rounded UI Library

**Package:** `@bug-breeder/zeroui`
**Purpose:** UI library for ZeppOS round-display apps — design tokens, safe-zone system, Column layout, and hmUI component wrappers.
**Claude Code plugin (for app devs):** `/plugin install github:bug-breeder/zepphyr`

---

## Library Development
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add zepphyr plugin install note for app developers"
```

- [ ] **Step 4: Push and create PR**

```bash
unset GITHUB_TOKEN
git push -u origin feature/add-zepphyr-plugin-note
gh pr create \
  --title "docs: add zepphyr plugin install note" \
  --body "App developers using ZeRoUI should install the zepphyr Claude Code plugin for ZeppOS + ZeRoUI skills. Added one-liner to CLAUDE.md header."
```

---

### Task 10: Merge all PRs

- [ ] **Step 1: Merge zepp-breathe PR**

```bash
cd /Users/alanguyen/Code/Others/zepp-meditation
unset GITHUB_TOKEN
gh pr merge feature/migrate-to-zepphyr --squash --delete-branch
git checkout main && git pull
```

- [ ] **Step 2: Merge zeppos-app-template PR**

```bash
cd /Users/alanguyen/Code/Others/zeppos-app-template
unset GITHUB_TOKEN
gh pr merge feature/migrate-to-zepphyr --squash --delete-branch
git checkout main && git pull
```

- [ ] **Step 3: Merge ZeRoUI PR**

```bash
cd /Users/alanguyen/Code/Others/ZeRoUI
unset GITHUB_TOKEN
gh pr merge feature/add-zepphyr-plugin-note --squash --delete-branch
git checkout main && git pull
```

- [ ] **Step 4: Final smoke-test without local skills**

Open a fresh Claude Code session against `/Users/alanguyen/Code/Others/zepp-meditation` (no local skills/agents in `.claude/`). The only skills should come from the installed zepphyr plugin.

Ask: `What's the 600ms onInit timeout gotcha in ZeppOS?`

Expected: Claude answers correctly using the zepphyr plugin skill. Migration complete.
