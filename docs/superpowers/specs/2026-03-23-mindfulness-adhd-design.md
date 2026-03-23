# Mindfulness App for ADHD Adults — Design Spec

**Date:** 2026-03-23
**Platform:** ZeppOS smartwatch (round OLED, 480px canvas, `common` target)
**ZeppOS API:** 3.6 compatible / 3.7 target

---

## Overview

A breathing exercise app designed for ADHD adults. The core experience is haptic-guided breathwork: vibration patterns cue each phase so the user can keep eyes closed or wrist at their side. The watch face provides a minimal expanding-ring visual as secondary feedback. No background reminders — user opens the app on demand.

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
                ↑ (pop on swipe-down cancel)
```

| Page | Path | Purpose |
|---|---|---|
| Home | `pages/home/index.js` | Streak display + Start button |
| Setup | `pages/setup/index.js` | Technique + rounds selection |
| Session | `pages/session/index.js` | Breathing animation, vibration, completion |

### Navigation details

- **Home → Setup:** `push({ url: 'pages/setup/index' })` — user can back out before committing
- **Setup → Session:** `push({ url: 'pages/session/index', params: JSON.stringify({ technique, rounds }) })`
- **Session complete → Home:** `replace({ url: 'pages/home/index' })` — no back stack entry
- **Session cancel:** `onGesture(GESTURE_DOWN)` → `pop()` — returns to Setup, nothing written to storage

---

## Pages

### Home (`pages/home/index.js`)

Uses ZUI (`CircularLayout`, `VStack`, `Text`, `Button`).

**Displays:**
- App name: "Breathe"
- Streak: "🔥 N days" (or "Start your streak" if 0)
- Total sessions count
- "Start" primary button → navigates to Setup

**Data:** Reads `streak_days`, `total_sessions` from storage on every `onInit` (re-reads on return from session).

---

### Setup (`pages/setup/index.js`)

Uses ZUI (`CircularLayout`, `ScrollView`, `VStack`, `SectionHeader`, `ListItem`, `Button`).

**Two sections:**

**Technique** (3 items, single-select):
- Box 4-4-4-4 *(default pre-selected)*
- 4-7-8
- Simple 4-4

**Rounds** (3 items, single-select):
- 3 rounds
- 5 rounds *(default pre-selected)*
- 10 rounds

Pre-selects from `last_technique` and `last_rounds` in storage. A checkmark or highlight indicates the current selection. "Start" button at bottom pushes to Session with selected values.

---

### Session (`pages/session/index.js`)

Uses raw `hmUI` widgets (not ZUI) for precise control over the ring animation.

**Receives params:** `{ technique: 'box' | '478' | 'simple', rounds: 3 | 5 | 10 }`

**Visual layout (all absolute positioned on 480×480 canvas):**
- Ring: `hmUI.widget.ARC`, full 360° circle, centered, two discrete sizes
- Phase label: `hmUI.widget.TEXT`, center, small caps (e.g. "INHALE")
- Countdown number: `hmUI.widget.TEXT`, center, large
- Round counter: `hmUI.widget.TEXT`, center-bottom (e.g. "2 / 5")

**Ring states:**
- **Large** (inhale + post-inhale hold): near bezel, green (`0x30d158`), box-shadow glow effect via second larger ring
- **Small** (exhale + post-exhale hold): tighter to center, dimmer green

Ring state toggles at phase transitions, not animated continuously.

**Timer:** `setInterval` at 1000ms, started in `build()`, cleared in `onDestroy` and on session complete. Each tick decrements `phaseSecondsLeft`. On reaching 0: advance phase, vibrate, update widgets.

**Cancellation:** `onGesture({ callback })` registered in `build()`, `offGesture()` called in `onDestroy`. Swipe down → `pop()`. Nothing written to storage on cancel.

---

## Breathing Techniques

| Technique | Key | Phases (seconds) | Seconds/round |
|---|---|---|---|
| Box 4-4-4-4 | `'box'` | Inhale(4) → Hold(4) → Exhale(4) → Hold(4) | 16s |
| 4-7-8 | `'478'` | Inhale(4) → Hold(7) → Exhale(8) | 19s |
| Simple 4-4 | `'simple'` | Inhale(4) → Exhale(4) | 8s |

Phase definition structure (used internally by session page):

```js
const TECHNIQUES = {
  box:    [{ label: 'INHALE', s: 4 }, { label: 'HOLD', s: 4 }, { label: 'EXHALE', s: 4 }, { label: 'HOLD', s: 4 }],
  '478':  [{ label: 'INHALE', s: 4 }, { label: 'HOLD', s: 7 }, { label: 'EXHALE', s: 8 }],
  simple: [{ label: 'INHALE', s: 4 }, { label: 'EXHALE', s: 4 }],
};
```

---

## Vibration Patterns

Fired at the start of each phase using `Vibrator` from `@zos/sensor`.

| Phase | Pattern | Intent |
|---|---|---|
| INHALE | `PULSE` (gentle, ~300ms) | "Start breathing in" |
| HOLD | `STRONG_SHORT` (single buzz) | "Hold now" |
| EXHALE | Two `PULSE` with short gap | "Start breathing out" |

`vibrator.stop()` called in `onDestroy`. Vibrator instance held in module-level var, reset in `onInit`.

---

## Completion & Celebration

When the last phase of the last round finishes:

1. `clearInterval` on the timer
2. Update storage (streak + total sessions — see streak logic below)
3. Show completion overlay: large "✓", new streak count ("Day 8!"), auto-dismisses after 2500ms
4. `replace({ url: 'pages/home/index' })` — user lands on Home with updated streak

---

## Data Model

All reads/writes use `utils/storage.js` (`get`, `set`, `getKey`).

| Key | Type | Default | Description |
|---|---|---|---|
| `last_technique` | `string` | `'box'` | Pre-selects technique on Setup |
| `last_rounds` | `number` | `5` | Pre-selects rounds on Setup |
| `total_sessions` | `number` | `0` | Lifetime completed sessions |
| `streak_days` | `number` | `0` | Current consecutive-day streak |
| `last_session_date` | `string` | `''` | Last completed session date (`'YYYY-MM-DD'`) |

### Streak calculation (on session complete)

```
today = getDateString()   // 'YYYY-MM-DD' from @zos/sensor Time
prev  = get('last_session_date', '')

if prev === today        → streak unchanged (multiple sessions same day = still 1)
if prev === yesterday    → streak + 1
else                     → streak = 1    (missed a day or first ever)

set('last_session_date', today)
set('streak_days', newStreak)
set('total_sessions', get('total_sessions', 0) + 1)
set('last_technique', technique)
set('last_rounds', rounds)
```

### Date helper

```js
// In pages/session/index.js
import { Time } from '@zos/sensor';
function getDateString() {
  const t = new Time();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

---

## app.json Changes

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

**No new permissions required** — `device:os.local_storage` already covers storage. No alarm, no bg-service needed.

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
  techniques.js       NEW — TECHNIQUES constant (phase definitions)
```

`utils/techniques.js` is a shared constant so both `setup` and `session` pages reference the same source of truth for technique names and phase data.

---

## Quality Checklist

- [ ] `npm run verify` passes (lint + format + zeus build)
- [ ] All 3 pages registered in `app.json`
- [ ] `offGesture()` called in session `onDestroy`
- [ ] `vibrator.stop()` called in session `onDestroy`
- [ ] `clearInterval` called in session `onDestroy`
- [ ] All hmUI widget references null-checked before `setProperty`
- [ ] Module-level state reset in every `onInit`
- [ ] Inter-page data passed via `params` (not `globalData`)
- [ ] `replace()` used on session-complete navigation (not `push`)
- [ ] Incomplete sessions (swipe-cancel) write nothing to storage
