# Breathe App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3-page ZeppOS breathing app (Home → Setup → Session) with haptic-guided phases, expanding-ring animation, and streak tracking.

**Architecture:** `utils/techniques.js` defines all breathing phase data (single source of truth). `pages/home` and `pages/setup` use ZUI components. `pages/session` uses raw `hmUI` widgets for precise ring animation control. No background service — user opens on demand.

**Tech Stack:** ZeppOS 3.6+, zeppos-zui, @zos/ui (hmUI), @zos/sensor (Vibrator, Time), @zos/interaction, @zos/router, @zos/storage

---

## File Map

| Action     | Path                     | Responsibility                                                       |
| ---------- | ------------------------ | -------------------------------------------------------------------- |
| **Create** | `utils/techniques.js`    | Phase definitions (label, duration, ring state) for all 3 techniques |
| **Modify** | `app.json`               | Register 2 new pages, update app name/description                    |
| **Modify** | `pages/home/index.js`    | Replace template: streak display + total sessions + Start button     |
| **Create** | `pages/setup/index.js`   | Technique picker + rounds picker + Start → Session                   |
| **Create** | `pages/session/index.js` | Ring animation, vibration, countdown, completion celebration         |

---

## Task 1: Foundation — `utils/techniques.js` + `app.json`

**Files:**

- Create: `utils/techniques.js`
- Modify: `app.json`

- [ ] **Step 1: Create `utils/techniques.js`**

Each phase has `label` (shown on screen), `s` (seconds), and `ring` (`'large'` or `'small'`). The `ring` field is critical — box breathing has two `HOLD` phases with _different_ ring states, so don't infer ring state from label.

```js
// utils/techniques.js

/**
 * Breathing technique phase definitions.
 *
 * Each phase: { label, s, ring }
 *   label — displayed on screen ("INHALE" / "HOLD" / "EXHALE")
 *   s     — duration in seconds
 *   ring  — 'large' (lungs full) or 'small' (lungs empty)
 *
 * IMPORTANT: box has two HOLD phases with different ring states.
 * Always use phase.ring to determine ring size — never infer from label.
 */
export const TECHNIQUES = {
  box: [
    { label: 'INHALE', s: 4, ring: 'large' },
    { label: 'HOLD', s: 4, ring: 'large' }, // hold after inhale — lungs full
    { label: 'EXHALE', s: 4, ring: 'small' },
    { label: 'HOLD', s: 4, ring: 'small' }, // hold after exhale — lungs empty
  ],
  478: [
    { label: 'INHALE', s: 4, ring: 'large' },
    { label: 'HOLD', s: 7, ring: 'large' },
    { label: 'EXHALE', s: 8, ring: 'small' },
  ],
  simple: [
    { label: 'INHALE', s: 4, ring: 'large' },
    { label: 'EXHALE', s: 4, ring: 'small' },
  ],
};

export const TECHNIQUE_NAMES = {
  box: 'Box 4-4-4-4',
  478: '4-7-8',
  simple: 'Simple 4-4',
};

export const TECHNIQUE_KEYS = ['box', '478', 'simple'];
export const ROUNDS_OPTIONS = [3, 5, 10];
```

- [ ] **Step 2: Update `app.json`**

Register the two new pages and update app identity. The `pages/home/index` entry already exists — keep it first.

```json
{
  "configVersion": "v3",
  "app": {
    "appId": 10000001,
    "appName": "Breathe",
    "appType": "app",
    "version": {
      "code": 1,
      "name": "1.0.0"
    },
    "icon": "icon.png",
    "vender": "TODO: your-name",
    "description": "Haptic-guided breathing exercises for ADHD adults"
  },
  "permissions": ["device:os.local_storage", "device:os.alarm", "device:os.bg_service"],
  "runtime": {
    "apiVersion": {
      "compatible": "3.6",
      "target": "3.7",
      "minVersion": "3.6"
    }
  },
  "targets": {
    "common": {
      "module": {
        "page": {
          "pages": ["pages/home/index", "pages/setup/index", "pages/session/index"]
        },
        "app-service": {
          "services": ["app-service/index"]
        }
      },
      "platforms": [{ "st": "r" }],
      "designWidth": 480
    }
  },
  "defaultLanguage": "en-US"
}
```

- [ ] **Step 3: Verify lint + build passes**

```bash
npm run verify
```

Expected: zero errors. If `utils/techniques.js` has a lint warning about unused exports, that's fine — they'll be used in later tasks.

- [ ] **Step 4: Commit**

```bash
git add utils/techniques.js app.json
git commit -m "feat: add techniques util and register pages in app.json"
```

---

## Task 2: Home Page

**Files:**

- Modify: `pages/home/index.js` (replace template entirely)

The home page re-reads storage on every `onInit` — this is intentional so returning from a completed session immediately shows the updated streak.

- [ ] **Step 1: Replace `pages/home/index.js`**

```js
// pages/home/index.js
import { CircularLayout, VStack, Text, Button, textColors } from 'zeppos-zui';
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';

// Module-level state — reset in onInit (vars persist across page visits)
let pageRoot = null;
let streakDays = 0;
let totalSessions = 0;

Page({
  onInit() {
    pageRoot = null;
    // Re-read storage every visit so returning from a session shows fresh streak
    streakDays = get(getKey('streak_days'), 0);
    totalSessions = get(getKey('total_sessions'), 0);
  },

  build() {
    const streakText = streakDays > 0 ? `${streakDays} day streak` : 'Start your streak';
    const sessionText = totalSessions === 1 ? '1 session total' : `${totalSessions} sessions total`;

    pageRoot = new CircularLayout({
      safeAreaEnabled: true,
      centerContent: false,
      edgeMargin: 8,
      verticalAlignment: 'center',
      children: [
        new VStack({
          spacing: 12,
          alignment: 'center',
          children: [
            new Text({
              text: 'Breathe',
              textStyle: 'largeTitle',
              fontWeight: 'bold',
              color: textColors.title,
              align: 'center',
            }),
            new Text({
              text: streakText,
              textStyle: 'subheadline',
              color: streakDays > 0 ? 0xff9f0a : textColors.subtitle,
              align: 'center',
            }),
            new Text({
              text: sessionText,
              textStyle: 'caption1',
              color: textColors.caption,
              align: 'center',
            }),
            new Button({
              label: 'Start',
              variant: 'primary',
              size: 'capsule',
              onPress: () => {
                push({ url: 'pages/setup/index' });
              },
            }),
          ],
        }),
      ],
    });

    pageRoot.mount();
  },

  onDestroy() {
    if (pageRoot) {
      pageRoot.destroy();
      pageRoot = null;
    }
  },
});
```

- [ ] **Step 2: Verify**

```bash
npm run verify
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add pages/home/index.js
git commit -m "feat: implement home page with streak display"
```

---

## Task 3: Setup Page

**Files:**

- Create: `pages/setup/index.js`

The setup page uses a module-level `buildPage()` function that destroys and rebuilds the ZUI tree on each selection change. This is simpler than ZUI reactive state for a 6-item list.

Navigation: uses `push()` (NOT `replace()`) to go to Session — this is required so that swipe-down in Session returns here via `pop()`.

- [ ] **Step 1: Create `pages/setup/index.js`**

```js
// pages/setup/index.js
import { CircularLayout, ScrollView, VStack, Text, Button, ListItem, textColors } from 'zeppos-zui';
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import {
  TECHNIQUE_NAMES,
  TECHNIQUE_KEYS,
  ROUNDS_OPTIONS,
  TECHNIQUES,
} from '../../utils/techniques';

// Module-level state — reset in onInit
let pageRoot = null;
let selectedTechnique = 'box';
let selectedRounds = 5;

/**
 * Destroys the existing ZUI tree and builds a fresh one.
 * Called from build() and from selection-change callbacks.
 */
function buildPage() {
  if (pageRoot) {
    pageRoot.destroy();
    pageRoot = null;
  }

  const techniqueItems = TECHNIQUE_KEYS.map(
    (key) =>
      new ListItem({
        title: TECHNIQUE_NAMES[key],
        // 'badge' shows a colored dot on the right — used as selected indicator
        accessory: selectedTechnique === key ? 'badge' : undefined,
        onPress: () => {
          selectedTechnique = key;
          buildPage();
        },
      })
  );

  const roundsItems = ROUNDS_OPTIONS.map(
    (r) =>
      new ListItem({
        title: `${r} rounds`,
        accessory: selectedRounds === r ? 'badge' : undefined,
        onPress: () => {
          selectedRounds = r;
          buildPage();
        },
      })
  );

  pageRoot = new CircularLayout({
    safeAreaEnabled: true,
    centerContent: false,
    edgeMargin: 8,
    verticalAlignment: 'start',
    children: [
      new ScrollView({
        direction: 'vertical',
        children: [
          new VStack({
            spacing: 4,
            alignment: 'center',
            children: [
              new Text({
                text: 'Technique',
                textStyle: 'caption1',
                color: textColors.caption,
                align: 'center',
              }),
              ...techniqueItems,
              new Text({
                text: 'Rounds',
                textStyle: 'caption1',
                color: textColors.caption,
                align: 'center',
              }),
              ...roundsItems,
              new Button({
                label: 'Start',
                variant: 'primary',
                size: 'capsule',
                onPress: () => {
                  // push (not replace) so pop() in Session returns here
                  push({
                    url: 'pages/session/index',
                    params: JSON.stringify({
                      technique: selectedTechnique,
                      rounds: selectedRounds,
                    }),
                  });
                },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  pageRoot.mount();
}

Page({
  onInit() {
    pageRoot = null;
    selectedTechnique = get(getKey('last_technique'), 'box');
    selectedRounds = get(getKey('last_rounds'), 5);

    // Validate against known-good values
    if (!TECHNIQUES[selectedTechnique]) selectedTechnique = 'box';
    if (!ROUNDS_OPTIONS.includes(selectedRounds)) selectedRounds = 5;
  },

  build() {
    buildPage();
  },

  onDestroy() {
    if (pageRoot) {
      pageRoot.destroy();
      pageRoot = null;
    }
  },
});
```

- [ ] **Step 2: Verify**

```bash
npm run verify
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add pages/setup/index.js
git commit -m "feat: implement setup page with technique and rounds picker"
```

---

## Task 4: Session Page

**Files:**

- Create: `pages/session/index.js`

This is the most complex page. Uses raw `hmUI` widgets for the ring animation. Key rules:

- All module-level state reset in `onInit` (ZeppOS persists module vars across page visits)
- Two ring widgets pre-created (large + small) — toggle visibility, never resize
- `sessionComplete` flag guards `onTick` against re-entry after completion
- `offGesture({ callback: onSwipeDown })` — must pass the same function reference
- No storage writes on swipe-down cancel

- [ ] **Step 1: Create `pages/session/index.js`**

```js
// pages/session/index.js
import hmUI from '@zos/ui';
import { replace, pop } from '@zos/router';
import { Vibrator, Time } from '@zos/sensor';
import { onGesture, offGesture, GESTURE_DOWN } from '@zos/interaction';
import { TECHNIQUES } from '../../utils/techniques';
import { COLOR, TYPOGRAPHY } from '../../utils/constants';
import { get, set, getKey } from '../../utils/storage';

// ─── Date helpers ────────────────────────────────────────────────────────────
// Do NOT use new Date() — ZeppOS QuickJS may not include the Date constructor.
// Use @zos/sensor Time class only.

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
    if (mo < 1) {
      mo = 12;
      y -= 1; // year rollover: Jan 1 → Dec 31 of previous year
    }
    d = mo === 2 && isLeapYear(y) ? 29 : DAYS_IN_MONTH[mo];
  }
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ─── Ring geometry (pre-computed, never changes) ─────────────────────────────
// Two rings are created — large and small. Visibility is toggled per phase.
// This is more reliable than updating x/y/w/h via setProperty.

const LARGE = { x: 40, y: 40, w: 400, h: 400 }; // ~40px from each edge
const SMALL = { x: 100, y: 100, w: 280, h: 280 }; // ~100px from each edge
const GLOW = { x: 28, y: 28, w: 424, h: 424 }; // slightly outside LARGE

// ─── Module-level state (ALL reset in onInit) ─────────────────────────────────

let technique = null;
let rounds = 0;
let currentRound = 0;
let currentPhaseIndex = 0;
let phaseSecondsLeft = 0;
let intervalId = null;
let completionTimeoutId = null;
let sessionComplete = false;
let vibrator = null;

// Widget refs
let ringLargeWidget = null;
let ringSmallWidget = null;
let glowWidget = null;
let phaseTextWidget = null;
let countdownTextWidget = null;
let roundCounterWidget = null;
let completionCheckWidget = null;
let completionStreakWidget = null;

// ─── Vibration ────────────────────────────────────────────────────────────────

function vibrateForPhase(label) {
  if (!vibrator) return;
  try {
    const type = vibrator.getType();
    if (label === 'INHALE') {
      vibrator.start([{ type: type.PULSE, duration: 300 }]);
    } else if (label === 'HOLD') {
      vibrator.start([{ type: type.STRONG_SHORT, duration: 200 }]);
    } else if (label === 'EXHALE') {
      vibrator.start([
        { type: type.PULSE, duration: 200 },
        { type: type.PAUSE, duration: 100 },
        { type: type.PULSE, duration: 200 },
      ]);
    }
  } catch {
    console.log('[Session] vibration error');
  }
}

// ─── Widget updates ───────────────────────────────────────────────────────────

function updateWidgets() {
  const phases = TECHNIQUES[technique];
  if (!phases) return;
  const phase = phases[currentPhaseIndex];
  if (!phase) return;

  const isLarge = phase.ring === 'large';

  // Toggle ring visibility
  if (ringLargeWidget) ringLargeWidget.setProperty(hmUI.prop.VISIBLE, isLarge);
  if (ringSmallWidget) ringSmallWidget.setProperty(hmUI.prop.VISIBLE, !isLarge);
  if (glowWidget) glowWidget.setProperty(hmUI.prop.VISIBLE, isLarge);

  // Update text widgets
  if (phaseTextWidget) phaseTextWidget.setProperty(hmUI.prop.TEXT, phase.label);
  if (countdownTextWidget)
    countdownTextWidget.setProperty(hmUI.prop.TEXT, String(phaseSecondsLeft));
  if (roundCounterWidget)
    roundCounterWidget.setProperty(hmUI.prop.TEXT, `${currentRound} / ${rounds}`);
}

// ─── Session completion ───────────────────────────────────────────────────────

function onSessionComplete() {
  sessionComplete = true; // guard onTick against re-entry
  clearInterval(intervalId);
  intervalId = null;

  // Streak + session storage
  const today = getDateString();
  const yesterday = getYesterdayString();
  const prev = get(getKey('last_session_date'), '');
  const currentStreak = get(getKey('streak_days'), 0);

  let newStreak;
  if (prev === today) {
    newStreak = currentStreak; // already counted today
  } else if (prev === yesterday) {
    newStreak = currentStreak + 1;
  } else {
    newStreak = 1; // missed a day or first ever
  }

  set(getKey('last_session_date'), today);
  set(getKey('streak_days'), newStreak);
  set(getKey('total_sessions'), get(getKey('total_sessions'), 0) + 1);
  set(getKey('last_technique'), technique);
  set(getKey('last_rounds'), rounds);

  // Hide session widgets
  if (ringLargeWidget) ringLargeWidget.setProperty(hmUI.prop.VISIBLE, false);
  if (ringSmallWidget) ringSmallWidget.setProperty(hmUI.prop.VISIBLE, false);
  if (glowWidget) glowWidget.setProperty(hmUI.prop.VISIBLE, false);
  if (phaseTextWidget) phaseTextWidget.setProperty(hmUI.prop.VISIBLE, false);
  if (countdownTextWidget) countdownTextWidget.setProperty(hmUI.prop.VISIBLE, false);
  if (roundCounterWidget) roundCounterWidget.setProperty(hmUI.prop.VISIBLE, false);

  // Show completion overlay
  if (completionCheckWidget) completionCheckWidget.setProperty(hmUI.prop.VISIBLE, true);
  if (completionStreakWidget) {
    completionStreakWidget.setProperty(hmUI.prop.TEXT, `Day ${newStreak}!`);
    completionStreakWidget.setProperty(hmUI.prop.VISIBLE, true);
  }

  // Navigate home after 2500ms — arrow function required (not setTimeout(replace(...), 2500))
  completionTimeoutId = setTimeout(() => {
    replace({ url: 'pages/home/index' });
  }, 2500);
}

// ─── Tick handler ─────────────────────────────────────────────────────────────

function onTick() {
  if (sessionComplete) return; // guard against late ticks

  phaseSecondsLeft -= 1;
  if (countdownTextWidget)
    countdownTextWidget.setProperty(hmUI.prop.TEXT, String(phaseSecondsLeft));

  if (phaseSecondsLeft > 0) return;

  // Phase expired — advance
  const phases = TECHNIQUES[technique];
  currentPhaseIndex += 1;

  if (currentPhaseIndex >= phases.length) {
    currentPhaseIndex = 0;
    currentRound += 1;
    if (currentRound > rounds) {
      onSessionComplete();
      return;
    }
  }

  phaseSecondsLeft = phases[currentPhaseIndex].s;
  vibrateForPhase(phases[currentPhaseIndex].label);
  updateWidgets();
}

// ─── Gesture (cancel) ─────────────────────────────────────────────────────────
// Named function — same reference must be passed to both onGesture and offGesture.

function onSwipeDown(gesture) {
  if (gesture === GESTURE_DOWN) {
    pop(); // returns to Setup; nothing written to storage
    return true;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

Page({
  onInit(params) {
    console.log('[Session] onInit');

    // Reset ALL module-level state
    technique = null;
    rounds = 0;
    currentRound = 0;
    currentPhaseIndex = 0;
    phaseSecondsLeft = 0;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (completionTimeoutId) {
      clearTimeout(completionTimeoutId);
      completionTimeoutId = null;
    }
    sessionComplete = false;
    vibrator = null;
    ringLargeWidget = null;
    ringSmallWidget = null;
    glowWidget = null;
    phaseTextWidget = null;
    countdownTextWidget = null;
    roundCounterWidget = null;
    completionCheckWidget = null;
    completionStreakWidget = null;

    // Parse params
    try {
      const p = params ? JSON.parse(params) : {};
      technique = p.technique || 'box';
      rounds = typeof p.rounds === 'number' ? p.rounds : 5;
    } catch {
      technique = 'box';
      rounds = 5;
    }

    // Validate
    if (!TECHNIQUES[technique]) technique = 'box';
    if (![3, 5, 10].includes(rounds)) rounds = 5;

    const phases = TECHNIQUES[technique];
    currentRound = 1;
    currentPhaseIndex = 0;
    phaseSecondsLeft = phases[0].s;

    // Start vibrator and fire first-phase haptic
    vibrator = new Vibrator();
    vibrateForPhase(phases[0].label);

    // Start tick and gesture
    intervalId = setInterval(onTick, 1000);
    onGesture({ callback: onSwipeDown });
  },

  build() {
    console.log('[Session] build');

    // Black background
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 480,
      h: 480,
      color: COLOR.BG,
    });

    // Glow ring (dim outer halo — only visible when ring is large)
    glowWidget = hmUI.createWidget(hmUI.widget.ARC, {
      ...GLOW,
      start_angle: 0,
      end_angle: 360,
      color: 0x1a4d2e,
      line_width: 4,
    });

    // Large ring (INHALE + post-inhale HOLD)
    ringLargeWidget = hmUI.createWidget(hmUI.widget.ARC, {
      ...LARGE,
      start_angle: 0,
      end_angle: 360,
      color: COLOR.PRIMARY,
      line_width: 8,
    });

    // Small ring (EXHALE + post-exhale HOLD)
    ringSmallWidget = hmUI.createWidget(hmUI.widget.ARC, {
      ...SMALL,
      start_angle: 0,
      end_angle: 360,
      color: 0x1a8c3a,
      line_width: 8,
    });

    // Phase label (e.g. "INHALE") — muted, small caps
    phaseTextWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 190,
      w: 480,
      h: 32,
      text: '',
      text_size: TYPOGRAPHY.caption,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });

    // Countdown number (large, center)
    countdownTextWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 218,
      w: 480,
      h: 70,
      text: '',
      text_size: TYPOGRAPHY.largeTitle,
      color: COLOR.TEXT,
      align_h: hmUI.align.CENTER_H,
    });

    // Round counter (e.g. "2 / 5")
    roundCounterWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 295,
      w: 480,
      h: 32,
      text: '',
      text_size: TYPOGRAPHY.caption,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });

    // Completion overlay — hidden until session finishes
    completionCheckWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 160,
      w: 480,
      h: 80,
      text: 'Done',
      text_size: TYPOGRAPHY.title,
      color: COLOR.PRIMARY,
      align_h: hmUI.align.CENTER_H,
    });

    completionStreakWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 255,
      w: 480,
      h: 50,
      text: '',
      text_size: TYPOGRAPHY.title,
      color: COLOR.TEXT,
      align_h: hmUI.align.CENTER_H,
    });

    // Warn on null widgets (silent crash if setProperty called on null)
    if (!glowWidget) console.log('[Session] WARNING: glowWidget null');
    if (!ringLargeWidget) console.log('[Session] WARNING: ringLargeWidget null');
    if (!ringSmallWidget) console.log('[Session] WARNING: ringSmallWidget null');
    if (!phaseTextWidget) console.log('[Session] WARNING: phaseTextWidget null');
    if (!countdownTextWidget) console.log('[Session] WARNING: countdownTextWidget null');
    if (!roundCounterWidget) console.log('[Session] WARNING: roundCounterWidget null');

    // Hide completion widgets initially
    if (completionCheckWidget) completionCheckWidget.setProperty(hmUI.prop.VISIBLE, false);
    if (completionStreakWidget) completionStreakWidget.setProperty(hmUI.prop.VISIBLE, false);

    // Render initial phase state
    updateWidgets();
  },

  onDestroy() {
    console.log('[Session] onDestroy');

    clearInterval(intervalId);
    intervalId = null;

    if (completionTimeoutId) {
      clearTimeout(completionTimeoutId);
      completionTimeoutId = null;
    }

    if (vibrator) {
      vibrator.stop();
      vibrator = null;
    }

    // Must pass same callback reference to offGesture
    offGesture({ callback: onSwipeDown });

    // Null widget refs
    ringLargeWidget = null;
    ringSmallWidget = null;
    glowWidget = null;
    phaseTextWidget = null;
    countdownTextWidget = null;
    roundCounterWidget = null;
    completionCheckWidget = null;
    completionStreakWidget = null;
  },
});
```

- [ ] **Step 2: Verify**

```bash
npm run verify
```

Expected: zero errors. Watch for any lint errors about unused variables.

- [ ] **Step 3: Commit**

```bash
git add pages/session/index.js
git commit -m "feat: implement session page with ring animation, vibration, and streak tracking"
```

---

## Task 5: Final Quality Gate

- [ ] **Step 1: Run full verify**

```bash
npm run verify
```

Expected: passes with zero errors or warnings.

- [ ] **Step 2: Check the quality checklist**

Go through each item in the spec's quality checklist:

- [ ] All 3 pages registered in `app.json` under `targets.common.module.page.pages`
- [ ] `device:os.local_storage` present in `app.json` permissions array
- [ ] All module-level state reset in `pages/home/index.js` `onInit`
- [ ] All module-level state reset in `pages/setup/index.js` `onInit`
- [ ] All module-level state reset in `pages/session/index.js` `onInit`
- [ ] `offGesture({ callback: onSwipeDown })` in session `onDestroy` (not bare `offGesture()`)
- [ ] `vibrator.stop()` in session `onDestroy`
- [ ] `clearInterval(intervalId)` in session `onDestroy`
- [ ] `clearTimeout(completionTimeoutId)` with null guard in session `onDestroy`
- [ ] All hmUI widget refs null-checked after `createWidget` (console.log warnings in build)
- [ ] Inter-page data passed via `params` JSON string (not `globalData`)
- [ ] `replace()` used on session-complete navigation (not `push`)
- [ ] Swipe-cancel (`pop()`) writes nothing to storage
- [ ] Params parsed in `onInit(params)` with try/catch guard
- [ ] `vibrator.start()` fires at phase start in `onInit` (first phase of round 1)
- [ ] `sessionComplete` guard in `onTick`
- [ ] Setup uses `push()` to navigate to Session (not `replace()`)

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add -p   # stage only what changed
git commit -m "fix: quality gate corrections"
```

---

## Manual Testing Checklist (Simulator)

Run `npm run dev` to launch in the ZeppOS simulator. Verify:

- [ ] Home shows "Breathe" title, "Start your streak" on first launch
- [ ] Tapping Start navigates to Setup
- [ ] Setup shows all 3 techniques; last-used is pre-selected (badge dot)
- [ ] Setup shows all 3 round options; last-used is pre-selected
- [ ] Tapping a different technique updates the badge dot
- [ ] Tapping Start on Setup navigates to Session
- [ ] Session shows the ring (large on INHALE), phase label, countdown, round counter
- [ ] Countdown decrements from 4 to 1, then phase advances
- [ ] Ring changes size at phase transitions (large ↔ small)
- [ ] Swipe down cancels session, returns to Setup (not Home)
- [ ] After cancel, Home streak is unchanged
- [ ] After full session, "Done" + "Day N!" appears, then navigates Home
- [ ] Home shows updated streak and session count
- [ ] Running a second session on the same day does NOT increment streak again
