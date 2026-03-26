// pages/stats/index.js
import hmUI from '@zos/ui';
import { UI, COLOR } from '@bug-breeder/zeroui';
import { get, getKey } from '../../utils/storage';
import { getDateString, getDateNDaysAgo, getTodayDOW } from '../../utils/date';

// ─── Heatmap grid constants ────────────────────────────────────────────────────
// 7 columns (Mon–Sun) × 4 rows = 28 days, cell 30×30 with 4px gap
const GRID_LEFT_X = 123; // (480 - (7*30 + 6*4)) / 2 = (480 - 234) / 2
const GRID_TOP_Y = 134;
const CELL_SIZE = 30;
const CELL_STEP = 34; // CELL_SIZE + 4px gap

// ─── Module-level state (ALL reset in onInit) ─────────────────────────────────
let streakDays = 0;
let totalSessions = 0;
let sessionHistory = {};
let todayDOW = 0; // 0=Mon … 6=Sun
let todayStr = '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMotivationalMessage(streak, sessions) {
  if (streak === 0) return 'Start wherever you are';
  if (streak === 1) return sessions > 1 ? 'Back in the flow' : 'Day one. The hardest one.';
  if (streak <= 3) return 'Momentum is building';
  if (streak <= 7) return 'Your brain is adapting';
  if (streak <= 13) return 'ADHD and consistent. Yes.';
  if (streak <= 20) return 'Two weeks. Real habit forming.';
  return 'This is your superpower now';
}

function buildHeatmap() {
  const DOW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Day-of-week column labels
  DOW_LABELS.forEach((label, col) => {
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: GRID_LEFT_X + col * CELL_STEP,
      y: 108,
      w: CELL_SIZE,
      h: 22,
      text: label,
      text_size: 16,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });
  });

  // Heatmap cells
  // row=0 is the oldest week (top), row=3 is the current week (bottom).
  // Cell (row, col) maps to daysAgo = (3 - row) * 7 + (todayDOW - col).
  // daysAgo < 0 → future slot; daysAgo = 0 → today; daysAgo > 0 → past day.
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 7; col++) {
      const daysAgo = (3 - row) * 7 + (todayDOW - col);
      const isToday = daysAgo === 0;
      const isFuture = daysAgo < 0;

      let color;
      if (isFuture) {
        color = COLOR.SURFACE; // same as missed — avoids confusing empty slots
      } else {
        const dateStr = isToday ? todayStr : getDateNDaysAgo(daysAgo);
        const practiced = sessionHistory[dateStr] !== undefined && sessionHistory[dateStr] > 0;
        if (isToday) {
          color = practiced ? 0x52d985 : 0x2c2c2e; // lighter green or subtle dim highlight
        } else {
          color = practiced ? COLOR.PRIMARY : COLOR.SURFACE;
        }
      }

      hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: GRID_LEFT_X + col * CELL_STEP,
        y: GRID_TOP_Y + row * CELL_STEP,
        w: CELL_SIZE,
        h: CELL_SIZE,
        radius: 6,
        color,
      });
    }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

Page({
  onInit() {
    streakDays = get(getKey('streak_days'), 0);
    totalSessions = get(getKey('total_sessions'), 0);
    sessionHistory = get(getKey('session_history'), {});
    todayStr = getDateString();
    todayDOW = getTodayDOW();
  },

  build() {
    UI.bg();
    UI.title('Your Journey');

    // Heatmap (DOW labels + grid)
    buildHeatmap();

    // Streak number — large, orange when active, gray when zero
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 278,
      w: 360,
      h: 52,
      text: String(streakDays),
      text_size: 44,
      color: streakDays > 0 ? COLOR.WARNING : 0x636366,
      align_h: hmUI.align.CENTER_H,
    });

    // Streak label
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 334,
      w: 360,
      h: 26,
      text: streakDays === 1 ? 'day streak' : 'days streak',
      text_size: 20,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });

    // Motivational message
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 365,
      w: 360,
      h: 26,
      text: getMotivationalMessage(streakDays, totalSessions),
      text_size: 20,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });

    // Total sessions — secondary info
    const sessText = totalSessions === 1 ? '1 session total' : `${totalSessions} sessions total`;
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 396,
      w: 360,
      h: 24,
      text: sessText,
      text_size: 18,
      color: 0x636366,
      align_h: hmUI.align.CENTER_H,
    });
  },

  onDestroy() {
    streakDays = 0;
    totalSessions = 0;
    sessionHistory = {};
    todayDOW = 0;
    todayStr = '';
  },
});
