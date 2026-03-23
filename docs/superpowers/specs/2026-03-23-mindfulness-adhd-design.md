# Mindfulness App for ADHD Adults — Design Spec

**Date:** 2026-03-23
**Platform:** ZeppOS smartwatch (round OLED, 480px canvas, `common` target)
**ZeppOS API:** 3.6 compatible / 3.7 target

---

## Overview

A breathing exercise app designed for ADHD adults. The core experience is haptic-guided breathwork: vibration patterns fire at the **start of each phase** so the user can keep eyes closed or wrist at their side. The watch face provides a minimal expanding-ring visual as secondary feedback. No background reminders — user opens the app on demand.

---

## App Identity

- **App name:** Breathe
- **Primary interaction:** Vibration haptics guide breathing phases
- **ADHD design principles:** Low tap count to start, short sessions, immediate tactile feedback, no unnecessary screens

---

## Screen Flow

Three pages, linear navigation:

```
Home → Setup → Session → (replace) → Home
                ↑ (pop on swipe-down cancel → lands back on Setup)
```

| Page | Path | Purpose |
|---|---|---|
| Home | `pages/home/index.js` | Streak display + Start button |
| Setup | `pages/setup/index.js` | Technique + rounds selection |
| Session | `pages/session/index.js` | Breathing animation, vibration, completion |

### Navigation details

- **Home → Setup:** `push({ url: 'pages/setup/index' })` — user can back out before committing
- **Setup → Session:** `push({ url: 'pages/session/index', params: JSON.stringify({ technique, rounds }) })` — **must use `push()`, not `replace()`**, so that `pop()` on cancel correctly returns to Setup
- **Session complete → Home:** `replace({ url: 'pages/home/index' })` — no back stack entry
- **Session cancel:** `onGesture(GESTURE_DOWN)` → `pop()` — **returns to Setup** (intentional: user can adjust technique/rounds and retry immediately), nothing written to storage

---

## Pages

### Home (`pages/home/index.js`)

Uses ZUI (`CircularLayout`, `VStack`, `Text`, `Button`).

**Lifecycle:**
- `onInit`: reset `pageRoot = null`; read `streak_days` and `total_sessions` from storage into module-level vars
- `build()`: build ZUI tree, mount
- `onDestroy`: `pageRoot.destroy(); pageRoot = null`

**Displays:**
- App name: "Breathe"
- Streak: "🔥 N days" (or "Start your streak" if 0)
- Total sessions count
- "Start" primary button → navigates to Setup

**Data:** Re-reads storage on every `onInit` so returning from a completed session shows the updated streak immediately.

---

### Setup (`pages/setup/index.js`)

Uses ZUI (`CircularLayout`, `ScrollView`, `VStack`, `SectionHeader`, `ListItem`, `Button`).

**Lifecycle:**
- `onInit`: reset all module-level state (`pageRoot`, `selectedTechnique`, `selectedRounds`); read `last_technique` and `last_rounds` from storage to set initial selections
- `build()`: build ZUI tree with pre-selected items highlighted, mount
- `onDestroy`: `pageRoot.destroy(); pageRoot = null`

**Two sections:**

**Technique** (3 items, single-select):
- Box 4-4-4-4
- 4-7-8
- Simple 4-4

**Rounds** (3 items, single-select):
- 3 rounds
- 5 rounds
- 10 rounds

Pre-selects from `last_technique` (default `'box'`) and `last_rounds` (default `5`) in storage. A checkmark or highlight indicates the current selection. "Start" button at bottom pushes to Session with selected values.

---

### Session (`pages/session/index.js`)

Uses raw `hmUI` widgets (not ZUI) for precise control over the ring animation.

**Module-level state (ALL must be reset in `onInit`):**
```js
let technique = null;
let rounds = 0;
let currentRound = 0;
let currentPhaseIndex = 0;
let phaseSecondsLeft = 0;
let intervalId = null;
let completionTimeoutId = null;
let sessionComplete = false;   // guard against double-completion
let vibrator = null;
// widget refs:
let ringWidget = null;
let ringGlowWidget = null;
let phaseTextWidget = null;
let countdownTextWidget = null;
let roundCounterWidget = null;
```

**Lifecycle:**
- `onInit(params)`: reset all module-level state; parse params: `const { technique: t, rounds: r } = JSON.parse(params || '{}')`, store into module vars; initialize vibrator: `vibrator = new Vibrator()`; start interval: `intervalId = setInterval(onTick, 1000)`; register gesture: `onGesture({ callback: onSwipeDown })`
- `build()`: create all hmUI widgets (ring, glow ring, phase text, countdown, round counter); **null-check every widget ref after `hmUI.createWidget()` before storing** — a null widget ref passed to `setProperty` causes a silent crash; call `updateWidgets()` to render initial state
- `onDestroy`: call `clearInterval(intervalId)`; call `clearTimeout(completionTimeoutId)`; call `vibrator.stop()`; call `offGesture({ callback: onSwipeDown })`; null all widget refs and state vars

**Params parsing (in `onInit`):**
```js
onInit(params) {
  // reset all module-level state first
  // ...
  try {
    const p = params ? JSON.parse(params) : {};
    technique = p.technique || 'box';
    rounds = p.rounds || 5;
  } catch {
    technique = 'box';
    rounds = 5;
  }
  currentRound = 1;
  currentPhaseIndex = 0;
  phaseSecondsLeft = TECHNIQUES[technique][0].s;
  // start timer and gesture
}
```

**Visual layout (absolute positioned on 480×480 canvas):**
- Glow ring: `hmUI.widget.ARC`, full 360°, slightly larger than ring, dim green (`0x1a4d2e`) — creates glow effect when ring is large
- Ring: `hmUI.widget.ARC`, full 360° circle, centered, two discrete sizes
- Phase label: `hmUI.widget.TEXT`, center, small caps (e.g. "INHALE"), `TYPOGRAPHY.caption`
- Countdown number: `hmUI.widget.TEXT`, center, `TYPOGRAPHY.largeTitle`
- Round counter: `hmUI.widget.TEXT`, center-bottom (e.g. "2 / 5"), `TYPOGRAPHY.caption`

**Ring states (toggled at phase start, not animated continuously):**
- **Large** (INHALE + post-inhale HOLD): ring x/y/w/h ≈ 40px from edge, bright green (`0x30d158`)
- **Small** (EXHALE + post-exhale HOLD): ring x/y/w/h ≈ 100px from edge, dimmer green (`0x1a8c3a`)

`updateWidgets()` must guard every widget ref before calling `setProperty`: `if (ringWidget) ringWidget.setProperty(...)`. Never call `setProperty` without a non-null check — it causes a silent crash.

**Tick handler (`onTick`):**
```
if sessionComplete: return   // guard: ignore ticks after completion

phaseSecondsLeft -= 1
update countdown widget
if phaseSecondsLeft > 0: return

// phase complete — advance
currentPhaseIndex += 1
phases = TECHNIQUES[technique]
if currentPhaseIndex >= phases.length:
  currentPhaseIndex = 0
  currentRound += 1
  if currentRound > rounds:
    onSessionComplete()
    return

// start next phase
phaseSecondsLeft = phases[currentPhaseIndex].s
vibrateForPhase(phases[currentPhaseIndex].label)
updateWidgets()
```

**Cancellation:** Register as a named function so the same reference can be passed to `offGesture`:
```js
function onSwipeDown(gesture) {
  if (gesture === GESTURE_DOWN) { pop(); return true; }
}
// in onInit: onGesture({ callback: onSwipeDown })
// in onDestroy: offGesture({ callback: onSwipeDown })
```
Nothing written to storage on cancel.

---

## Breathing Techniques

| Technique | Key | Phases (seconds) | Seconds/round |
|---|---|---|---|
| Box 4-4-4-4 | `'box'` | Inhale(4) → Hold(4) → Exhale(4) → Hold(4) | 16s |
| 4-7-8 | `'478'` | Inhale(4) → Hold(7) → Exhale(8) | 19s |
| Simple 4-4 | `'simple'` | Inhale(4) → Exhale(4) | 8s |

Phase definition structure in `utils/techniques.js`:

```js
export const TECHNIQUES = {
  box:    [{ label: 'INHALE', s: 4 }, { label: 'HOLD', s: 4 }, { label: 'EXHALE', s: 4 }, { label: 'HOLD', s: 4 }],
  '478':  [{ label: 'INHALE', s: 4 }, { label: 'HOLD', s: 7 }, { label: 'EXHALE', s: 8 }],
  simple: [{ label: 'INHALE', s: 4 }, { label: 'EXHALE', s: 4 }],
};

export const TECHNIQUE_NAMES = {
  box:    'Box 4-4-4-4',
  '478':  '4-7-8',
  simple: 'Simple 4-4',
};
```

---

## Vibration Patterns

Fired at the **start of each phase** (when `phaseSecondsLeft` is initialized for a new phase). Uses `Vibrator` from `@zos/sensor`.

| Phase | Pattern | Intent |
|---|---|---|
| INHALE | `PULSE` (gentle, ~300ms) | "Start breathing in" |
| HOLD | `STRONG_SHORT` (single buzz) | "Hold now" |
| EXHALE | Two `PULSE` with short gap | "Start breathing out" |

The first phase of round 1 also vibrates at session start (on entering first phase in `onInit`).

`vibrator.stop()` called in `onDestroy`. Vibrator instance held in module-level var, reset to `null` in `onInit` before re-instantiation.

---

## Completion & Celebration

When `onSessionComplete()` fires:

1. Set `sessionComplete = true` (prevents any in-flight tick from re-entering)
2. `clearInterval(intervalId)` — stop the tick
3. Update storage (see streak logic below)
4. Update widgets: hide ring widgets, show large "✓" text and "Day N!" streak text (null-check each widget ref before setProperty)
5. `completionTimeoutId = setTimeout(() => { replace({ url: 'pages/home/index' }); }, 2500)` — **arrow function required**; writing `setTimeout(replace(...), 2500)` would invoke `replace` immediately (passing its return value, not a callback)
6. `onDestroy` calls `clearTimeout(completionTimeoutId)` in case the page is destroyed before the timeout fires

---

## Data Model

All reads/writes use `utils/storage.js` (`get`, `set`, `getKey`).

| Key | Type | Default | Description |
|---|---|---|---|
| `last_technique` | `string` | `'box'` | Pre-selects technique on Setup |
| `last_rounds` | `number` | `5` | Pre-selects rounds on Setup |
| `total_sessions` | `number` | `0` | Lifetime completed sessions |
| `streak_days` | `number` | `0` | Current consecutive-day streak |
| `last_session_date` | `string` | `''` | Last completed session date, format `'YYYY-MM-DD'` |

### Streak calculation (on session complete)

```
today = getDateString()   // returns 'YYYY-MM-DD'
prev  = get(getKey('last_session_date'), '')

if prev === today        → newStreak = streak (no change, already counted today)
if prev === yesterday    → newStreak = streak + 1
else                     → newStreak = 1  (missed day or first ever session)

set(getKey('last_session_date'), today)
set(getKey('streak_days'), newStreak)
set(getKey('total_sessions'), get(getKey('total_sessions'), 0) + 1)
set(getKey('last_technique'), technique)
set(getKey('last_rounds'), rounds)
```

### Date helper (in `pages/session/index.js`)

Uses `@zos/sensor` `Time` class only — **do not use `new Date()`** as ZeppOS QuickJS is a subset that may not include the `Date` constructor. Produces zero-padded `YYYY-MM-DD` strings for reliable string comparison.

Yesterday is computed with manual day arithmetic (decrement day, handle month/year rollover):

```js
import { Time } from '@zos/sensor';

const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function getDateString() {
  const t = new Time();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayString() {
  const t = new Time();
  let y = t.getFullYear();
  let mo = t.getMonth() + 1; // 1-12
  let d = t.getDate() - 1;
  if (d < 1) {
    mo -= 1;
    if (mo < 1) { mo = 12; y -= 1; }
    d = (mo === 2 && isLeapYear(y)) ? 29 : DAYS_IN_MONTH[mo];
  }
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
```

Both functions return `'YYYY-MM-DD'` strings. Comparison is strict string equality (`===`).

---

## app.json Changes

**Verify `device:os.local_storage` is present** in the `permissions` array (it is in the template but confirm before building).

**Pages to register:**
```json
"pages": [
  "pages/home/index",
  "pages/setup/index",
  "pages/session/index"
]
```

**App metadata:**
```json
"appName": "Breathe",
"description": "Haptic-guided breathing exercises for ADHD adults"
```

No new permissions required beyond what is already in the template.

---

## File Structure

```
pages/
  home/index.js       ZUI — streak display, Start button
  setup/index.js      ZUI — technique + rounds picker, Start button
  session/index.js    raw hmUI — ring animation, vibration, countdown, completion
utils/
  constants.js        (existing — COLOR, TYPOGRAPHY)
  storage.js          (existing — get, set, getKey)
  techniques.js       NEW — TECHNIQUES and TECHNIQUE_NAMES constants
```

`utils/techniques.js` is shared by both `setup` and `session` so technique names and phase data have one source of truth.

---

## Quality Checklist

- [ ] `npm run verify` passes (lint + format + zeus build)
- [ ] All 3 pages registered in `app.json`
- [ ] `device:os.local_storage` present in `app.json` permissions
- [ ] All module-level state reset in every page's `onInit`
- [ ] `offGesture({ callback: onSwipeDown })` called in session `onDestroy` (must pass same callback reference)
- [ ] `vibrator.stop()` called in session `onDestroy`
- [ ] `clearInterval(intervalId)` called in session `onDestroy`
- [ ] `clearTimeout(completionTimeoutId)` called in session `onDestroy`
- [ ] All hmUI widget references null-checked before `setProperty`
- [ ] Inter-page data passed via `params` JSON string (not `globalData`)
- [ ] `replace()` used on session-complete navigation (not `push`)
- [ ] Incomplete sessions (swipe-cancel) write nothing to storage
- [ ] Params parsed in `onInit(params)` with try/catch guard
- [ ] Vibration fires at phase start (including first phase of round 1)
