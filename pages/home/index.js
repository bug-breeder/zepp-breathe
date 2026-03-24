// pages/home/index.js
import hmUI from '@zos/ui';
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';

// 480×480 canvas. Content vertically centered ~155–354.
const W = 480;

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
    const streakText = streakDays > 0 ? `${streakDays} day streak` : 'Start your streak';
    const sessionText = totalSessions === 1 ? '1 session total' : `${totalSessions} sessions total`;

    // "Breathe" title
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 155,
      w: W,
      h: 56,
      text: 'Breathe',
      text_size: 40,
      color: 0xffffff,
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
      color: streakDays > 0 ? 0xff9f0a : 0x8e8e93,
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
      normal_color: 0x007aff,
      press_color: 0x0051d5,
      text: 'Start',
      text_size: 22,
      color: 0xffffff,
      click_func: () => {
        push({ url: 'pages/setup/index' });
      },
    });
  },

  onDestroy() {},
});
