Review the pull request: $ARGUMENTS

## Step 1: Identify the PR

If `$ARGUMENTS` is a PR number: run `gh pr diff $ARGUMENTS`
If `$ARGUMENTS` is empty: run `gh pr diff` (uses current branch's open PR)
Also run `gh pr view $ARGUMENTS` for title, description, and any comments.

---

## Step 2: Automated checks (blockers — report and stop if any fail)

Run `npm run verify` — reports lint + format + zeus build.

If it fails, report exactly which stage failed and the error message. This is a blocker.

---

## Step 3: Review the diff

Systematically check every changed file for:

### Correctness

- Logic errors, off-by-one, wrong conditionals
- Module-level `let` vars not reset in `onInit` (they **persist across page revisits** — common silent bug)
- Timer/interval leaks — is `clearInterval` called in `onDestroy`?
- Vibrator started but `vibrator.stop()` missing from `onDestroy`?
- Gesture/key handlers — `offGesture()` / `offKey()` called in `onDestroy`?

### ZeppOS patterns

- Navigation data via `params: JSON.stringify({...})`, not `globalData`
- Storage access uses `getKey(baseKey)` from `utils/storage` if dev-mode key prefixing is used
- Timer accuracy: `Date.now() - startTime` diff, not accumulated tick counts
- Widget null check before calling `setProperty`
- `catch (e)` with unused `e` — should be `catch { }` (optional catch binding, ES2019+)
- App-service pattern: single-shot `onInit`, alarm-chained for recurrence (not `setInterval`)
- Storage in app-service: must import `LocalStorage` directly from `@zos/storage` (can't use `utils/`)

### Code quality

- Unused imports or variables
- Magic numbers that should be constants in `utils/constants.js`
- Duplicated logic that should be a shared util

### Assets

- New images referenced in widgets must exist under `assets/raw/`
- Image paths in widgets are relative to `assets/raw/` (e.g. `src: 'icons/home.png'`)

### app.json

- New pages registered under `targets.common.module.page.pages`
- New services registered under `targets.common.module["app-service"].services`
- New `@zos/*` APIs that require permissions added to top-level `permissions`

---

## Step 4: Output format

**Verdict:** APPROVE / REQUEST CHANGES / COMMENT

**Automated checks:** pass / fail (with details if fail)

**Issues** (if any):

- 🔴 Blocker: [description — file:line]
- 🟡 Warning: [description — file:line]
- 🔵 Suggestion: [description — file:line]

**Summary:** 2–4 sentence overview of what the PR does and your overall assessment.
