// pages/stats/index.js
import hmUI from '@zos/ui';
import { COLOR, LAYOUT, renderPage } from '@bug-breeder/zeroui';
import { get, getKey } from '../../utils/storage';
import { getDateString, getDateNDaysAgo, getTodayDOW } from '../../utils/date';

// ─── Heatmap grid constants ────────────────────────────────────────────────────
// 7 columns (Mon–Sun) × 4 rows = 28 days, cell 30×30 with 4px gap
const GRID_LEFT_X = 123;
const GRID_TOP_Y = 134;
const CELL_SIZE = 30;
const CELL_STEP = 34;

// ─── Module-level state (ALL reset in onInit) ─────────────────────────────────
let streakDays = 0;
let totalSessions = 0;
let sessionHistory = {};
let todayDOW = 0;
let todayStr = '';
let col = null;

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

  DOW_LABELS.forEach((label, c) => {
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: GRID_LEFT_X + c * CELL_STEP,
      y: 106,
      w: CELL_SIZE,
      h: 24,
      text: label,
      text_size: 22,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });
  });

  for (let row = 0; row < 4; row++) {
    for (let c = 0; c < 7; c++) {
      const daysAgo = (3 - row) * 7 + (todayDOW - c);
      const isToday = daysAgo === 0;
      const isFuture = daysAgo < 0;

      let color;
      if (isFuture) {
        color = COLOR.SURFACE;
      } else {
        const dateStr = isToday ? todayStr : getDateNDaysAgo(daysAgo);
        const practiced = sessionHistory[dateStr] !== undefined && sessionHistory[dateStr] > 0;
        if (isToday) {
          color = practiced ? COLOR.PRIMARY_LIGHT : COLOR.SURFACE_PRESSED;
        } else {
          color = practiced ? COLOR.PRIMARY : COLOR.SURFACE;
        }
      }

      hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: GRID_LEFT_X + c * CELL_STEP,
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
    col = null;
    streakDays = get(getKey('streak_days'), 0);
    totalSessions = get(getKey('total_sessions'), 0);
    sessionHistory = get(getKey('session_history'), {});
    todayStr = getDateString();
    todayDOW = getTodayDOW();
  },

  build() {
    renderPage({
      layout: LAYOUT.NO_ACTION,
      title: 'Your Journey',
      scrollable: true,
      buildFn: (c) => {
        col = c;

        // Heatmap drawn at absolute positions — advance column past the area.
        // DOW labels at y=106, grid y=134..266. MAIN starts at y=74.
        // Spacer: 106 - 74 = 32 to reach DOW labels row.
        col.spacer(32);
        buildHeatmap();
        // DOW labels h=24 + gap 4 + 4 rows × 34 = 164 → advance past grid
        col.spacer(164);

        // Stats section — y-tracked by column from here
        col.card({
          title: streakDays === 1 ? 'day streak' : 'days streak',
          value: String(streakDays),
          valueColor: streakDays > 0 ? 'warning' : 'muted',
        });
        col.text(getMotivationalMessage(streakDays, totalSessions), {
          size: 'caption',
          color: 'muted',
        });
        col.text(totalSessions === 1 ? '1 session total' : `${totalSessions} sessions total`, {
          size: 'caption',
          color: 'muted',
        });
        col.finalize();
      },
    });
  },

  onDestroy() {
    col?.destroyAll();
    col = null;
    streakDays = 0;
    totalSessions = 0;
    sessionHistory = {};
    todayDOW = 0;
    todayStr = '';
  },
});
