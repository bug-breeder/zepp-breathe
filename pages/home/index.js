/**
 * Home page — the "golden example" of a ZUI-based ZeppOS page.
 *
 * Copy this file for new pages. Key patterns:
 *   - Import from 'zeppos-zui' for components and theme tokens
 *   - Parse params in onInit with try/catch guard
 *   - Build UI in build() — runs after onInit
 *   - Call pageRoot.mount() to render
 *   - Call pageRoot.destroy() in onDestroy for cleanup
 *   - Reset all module-level state in onInit (vars persist across page visits)
 */

import { CircularLayout, VStack, Text, Button, textColors } from 'zeppos-zui';
// import { push } from '@zos/router'; // uncomment when you need navigation

// For raw hmUI widgets (non-ZUI), use COLOR / TYPOGRAPHY from '../../utils/constants';

// Module-level state — MUST be reset in onInit (persists across page visits)
let pageRoot = null;

Page({
  onInit(params) {
    // Reset module-level state
    pageRoot = null;

    // Parse navigation params — always guard with try/catch
    try {
      const p = params ? JSON.parse(params) : {};
      console.log('[Home] onInit params:', JSON.stringify(p));
    } catch {
      console.log('[Home] onInit: no params');
    }
  },

  build() {
    console.log('[Home] build');

    pageRoot = new CircularLayout({
      safeAreaEnabled: true,
      centerContent: false,
      edgeMargin: 8,
      verticalAlignment: 'center',
      children: [
        new VStack({
          spacing: 24,
          alignment: 'center',
          children: [
            // App title
            new Text({
              text: 'My App',
              textStyle: 'largeTitle',
              fontWeight: 'bold',
              color: textColors.title,
              align: 'center',
            }),

            // Subtitle
            new Text({
              text: 'Welcome',
              textStyle: 'subheadline',
              color: textColors.subtitle,
              align: 'center',
            }),

            // Primary action button
            new Button({
              label: 'Get Started',
              variant: 'primary',
              size: 'capsule',
              onPress: () => {
                console.log('[Home] Get Started pressed');
                // TODO: Navigate to your next page
                // push({ url: 'pages/next/index', params: JSON.stringify({ key: 'value' }) });
              },
            }),
          ],
        }),
      ],
    });

    pageRoot.mount();
  },

  onDestroy() {
    console.log('[Home] onDestroy');

    // Destroy ZUI layout tree (releases widget references)
    if (pageRoot) {
      pageRoot.destroy();
      pageRoot = null;
    }

    // Also clean up if you used:
    //   offGesture() — from '@zos/interaction'
    //   offKey()     — from '@zos/interaction'
    //   vibrator.stop() — if Vibrator was started
  },
});
