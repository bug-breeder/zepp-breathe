// pages/home/index.js
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import { LAYOUT, RADIUS, renderPage } from '@bug-breeder/zeroui';

// Module-level state — reset in onInit
let col = null;
let streakDays = 0;

Page({
  onInit() {
    col = null;
    streakDays = get(getKey('streak_days'), 0);
  },

  build() {
    renderPage({
      layout: LAYOUT.MINIMAL,
      scrollable: false,
      buildFn: (c) => {
        col = c;

        // Top section — anchored near top arc
        col.spacer(24);
        col.label('Breathe');
        col.text(String(streakDays), {
          size: 'title',
          color: streakDays > 0 ? 'warning' : 'muted',
        });
        col.text(streakDays === 1 ? 'day streak' : 'days streak', {
          size: 'subheadline',
          color: 'muted',
        });

        // Bottom section — pill buttons anchored near bottom arc
        // Layout math: spacer(24)+label(52)+text-title(88)+text-sub(64) = 228
        // Start(72+6=78)+Stats(48+6=54) = 132. Total 228+132=360 = MINIMAL.h ✓
        col.chip('Start', {
          variant: 'primary',
          radius: RADIUS.pill,
          h: 72,
          w: 192,
          onPress: () => push({ url: 'pages/setup/index' }),
        });
        col.chip('Stats', {
          variant: 'ghost',
          radius: RADIUS.pill,
          h: 48,
          w: 160,
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
