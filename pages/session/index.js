// pages/session/index.js
import hmUI from '@zos/ui';
import { replace, pop } from '@zos/router';
import { Vibrator } from '@zos/sensor';
import { onGesture, offGesture, GESTURE_DOWN } from '@zos/interaction';
import { TECHNIQUES } from '../../utils/techniques';
import { COLOR, TYPOGRAPHY } from '@bug-breeder/zeroui';
import { DEVICE_WIDTH } from '../../utils/constants';
import { get, set, getKey } from '../../utils/storage';
import { getDateString, getYesterdayString, getDateNDaysAgo } from '../../utils/date';

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
  } catch (e) {
    console.log('[Session] vibration error', e);
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
  offGesture({ callback: onSwipeDown });
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

  // Per-day history for heatmap — { 'YYYY-MM-DD': count }
  const historyKey = getKey('session_history');
  const history = get(historyKey, {});
  history[today] = (history[today] || 0) + 1;
  // Prune to last 35 days (28 heatmap + 7-day buffer)
  const pruned = {};
  for (let n = 0; n <= 35; n++) {
    const dk = getDateNDaysAgo(n);
    if (history[dk] !== undefined) pruned[dk] = history[dk];
  }
  set(historyKey, pruned);

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
      rounds = p.rounds || 5;
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

    // Start gesture (interval started in build, after widgets are created)
    onGesture({ callback: onSwipeDown });
  },

  build() {
    console.log('[Session] build');

    // Black background
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
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
      y: 162,
      w: DEVICE_WIDTH,
      h: 36,
      text: '',
      text_size: TYPOGRAPHY.caption,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });

    // Countdown number (large, center)
    countdownTextWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 204,
      w: DEVICE_WIDTH,
      h: 76,
      text: '',
      text_size: TYPOGRAPHY.largeTitle,
      color: COLOR.TEXT,
      align_h: hmUI.align.CENTER_H,
    });

    // Round counter (e.g. "2 / 5")
    roundCounterWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 288,
      w: DEVICE_WIDTH,
      h: 36,
      text: '',
      text_size: TYPOGRAPHY.caption,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });

    // Completion overlay — hidden until session finishes
    completionCheckWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 160,
      w: DEVICE_WIDTH,
      h: 80,
      text: '✓',
      text_size: TYPOGRAPHY.title,
      color: COLOR.PRIMARY,
      align_h: hmUI.align.CENTER_H,
    });

    completionStreakWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 254,
      w: DEVICE_WIDTH,
      h: 56,
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
    intervalId = setInterval(onTick, 1000);
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
