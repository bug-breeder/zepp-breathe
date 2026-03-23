/**
 * App entry point.
 *
 * globalData: for app-wide state that persists across the app lifecycle.
 *
 * WARNING: Do NOT use globalData to pass data between pages —
 *          it is unreliable across push(). Use instead:
 *            push({ url: 'pages/next/index', params: JSON.stringify({ key: value }) })
 *          and in the target page's onInit(params):
 *            const p = JSON.parse(params)
 */
App({
  globalData: {},

  onCreate() {
    console.log('[App] onCreate');
  },

  onDestroy() {
    console.log('[App] onDestroy');
  },
});
