// pages/home/index.js
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import { LAYOUT, renderPage } from '@bug-breeder/zeroui';

// Module-level state — reset in onInit
let streakDays = 0;
let totalSessions = 0;
let col = null;

Page({
  onInit() {
    col = null;
    streakDays = get(getKey('streak_days'), 0);
    totalSessions = get(getKey('total_sessions'), 0);
  },

  build() {
    const streakText = streakDays > 0 ? `${streakDays} day streak` : 'Start your streak';
    const sessionText = totalSessions === 1 ? '1 session total' : `${totalSessions} sessions total`;

    renderPage({
      layout: LAYOUT.MINIMAL,
      scrollable: false,
      buildFn: (c) => {
        col = c;
        col.spacer(50);
        col.text('Breathe', { size: 'largeTitle' });
        col.text(streakText, { size: 'subheadline', color: streakDays > 0 ? 'warning' : 'muted' });
        col.text(sessionText, { size: 'caption', color: 'muted' });
        col.spacer(16);
        col.chip('Start', {
          variant: 'secondary',
          onPress: () => push({ url: 'pages/setup/index' }),
        });
        col.chip('Stats', {
          variant: 'ghost',
          onPress: () => push({ url: 'pages/stats/index' }),
        });
      },
    });
  },

  onDestroy() {
    col?.destroyAll();
    col = null;
  },
});
