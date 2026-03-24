// pages/home/index.js
import hmUI from '@zos/ui'; // required: zeppos-zui accesses hmUI as a global
import { CircularLayout, VStack, Text, Button, textColors } from 'zeppos-zui';
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';

// Make hmUI available as a global so zeppos-zui's createWidget can find it.
// ZUI checks `typeof hmUI !== 'undefined'` — without this it falls back to mock widgets.
globalThis.hmUI = hmUI;

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
    console.log('[Home] build');
    const streakText = streakDays > 0 ? `${streakDays} day streak` : 'Start your streak';
    const sessionText = totalSessions === 1 ? '1 session total' : `${totalSessions} sessions total`;

    pageRoot = new CircularLayout({
      safeAreaEnabled: true,
      centerContent: false,
      edgeMargin: 8,
      verticalAlignment: 'start',
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
