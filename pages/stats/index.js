// pages/stats/index.js
import hmUI from '@zos/ui';
import { COLOR, LAYOUT, TYPOGRAPHY, SPACING, renderPage } from '@bug-breeder/zeroui';
import { get, getKey } from '../../utils/storage';
import { getDateString, getDateNDaysAgo, getTodayDOW } from '../../utils/date';

// ─── Heatmap grid constants ────────────────────────────────────────────────────
// 7 columns × 36px + 6 × 6px gap = 288px total; centered: (480-288)/2 = 96
const GRID_LEFT_X = 96;
const CELL_SIZE = 36; // was 30
const CELL_STEP = 42; // was 34 (36 cell + 6 gap)

// ─── Module-level state (ALL reset in onInit) ─────────────────────────────────
let streakDays = 0;
let sessionHistory = {};
let todayDOW = 0;
let todayStr = '';
let col = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildHeatmap(startY) {
  const DOW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dowH = TYPOGRAPHY.caption; // 36

  DOW_LABELS.forEach((label, c) => {
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: GRID_LEFT_X + c * CELL_STEP,
      y: startY,
      w: CELL_SIZE,
      h: dowH,
      text: label,
      text_size: TYPOGRAPHY.caption,
      color: COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });
  });

  const gridY = startY + dowH + SPACING.xs; // 36 + 6 = 42px below startY

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
        y: gridY + row * CELL_STEP,
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
    sessionHistory = get(getKey('session_history'), {});
    todayStr = getDateString();
    todayDOW = getTodayDOW();
  },

  build() {
    renderPage({
      layout: LAYOUT.MINIMAL,
      scrollable: false,
      buildFn: (c) => {
        col = c;
        col.text(String(streakDays), {
          size: 'title',
          color: streakDays > 0 ? 'warning' : 'muted',
        });
        col.text(streakDays === 1 ? 'day streak' : 'days streak', {
          size: 'subheadline',
          h: 60, // extra height so 'y' descender isn't clipped by widget bounds
          color: 'muted',
        });
        const heatmapStartY = col.currentY;
        buildHeatmap(heatmapStartY);

        // Advance column past heatmap:
        // DOW h=36 + xs gap(6) + 4 rows × CELL_STEP(42) = 42 + 168 = 210
        col.spacer(210);
      },
    });
  },

  onDestroy() {
    col?.destroyAll();
    col = null;
    streakDays = 0;
    sessionHistory = {};
    todayDOW = 0;
    todayStr = '';
  },
});
