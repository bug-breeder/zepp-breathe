// pages/home/index.js
import hmUI from '@zos/ui';
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import { UI, COLOR } from '@bug-breeder/zeroui';

// 480×480 canvas. Content vertically centered ~155–354.

// Module-level state — reset in onInit
let streakDays = 0;
let totalSessions = 0;

Page({
  onInit() {
    // Re-read storage every visit so returning from a session shows fresh streak
    streakDays = get(getKey('streak_days'), 0);
    totalSessions = get(getKey('total_sessions'), 0);
  },

  build() {
    UI.bg();
    const streakText = streakDays > 0 ? `${streakDays} day streak` : 'Start your streak';
    const sessionText = totalSessions === 1 ? '1 session total' : `${totalSessions} sessions total`;

    // "Breathe" title
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 155,
      w: 480,
      h: 56,
      text: 'Breathe',
      text_size: 40,
      color: COLOR.TEXT,
      align_h: hmUI.align.CENTER_H,
    });

    // Streak line
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 222,
      w: 360,
      h: 34,
      text: streakText,
      text_size: 26,
      color: streakDays > 0 ? COLOR.WARNING : COLOR.TEXT_MUTED,
      align_h: hmUI.align.CENTER_H,
    });

    // Sessions line
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 260,
      w: 360,
      h: 28,
      text: sessionText,
      text_size: 22,
      color: 0x636366,
      align_h: hmUI.align.CENTER_H,
    });

    // "Start" button
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: 140,
      y: 302,
      w: 200,
      h: 52,
      radius: 26,
      normal_color: COLOR.SECONDARY,
      press_color: COLOR.SECONDARY_PRESSED,
      text: 'Start',
      text_size: 22,
      color: COLOR.TEXT,
      click_func: () => {
        push({ url: 'pages/setup/index' });
      },
    });

    // "Stats" button
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: 165,
      y: 362,
      w: 150,
      h: 40,
      radius: 20,
      normal_color: COLOR.SURFACE,
      press_color: COLOR.SURFACE_PRESSED,
      text: 'Stats',
      text_size: 20,
      color: COLOR.TEXT_MUTED,
      click_func: () => {
        push({ url: 'pages/stats/index' });
      },
    });
  },

  onDestroy() {},
});
