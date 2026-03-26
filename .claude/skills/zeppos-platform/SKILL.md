---
name: zeppos
description: Use when writing ZeppOS code, importing @zos/* APIs, or debugging platform behavior — hmUI widgets, router, storage, sensors, interaction, alarms, app-service patterns.
argument-hint: [question]
user-invocable: true
---

ZeppOS: QuickJS ES2020, 480-unit design canvas, round OLED 480×480px. No DOM, no Node.js.

## Gotchas

1. **Widget null check** — always check `if (widget)` before `widget.setProperty(...)`. Silent crash otherwise.

2. **Module-level state persists** — `let x = 0` at module scope is NOT reset on page revisit. Reset everything in `onInit()`.

3. **FILL_RECT touch unreliable** — `FILL_RECT.addEventListener(hmUI.event.CLICK_UP, fn)` silently fails on device. Always use `hmUI.widget.BUTTON` with `click_func` for tap targets.

4. **IMG w/h is clipping boundary, not scale** — images always render at their actual file dimensions. `w`/`h` define the visible clip area. Use `pos_x`/`pos_y` for offset within the boundary.

5. **App lifecycle order** — `App.onCreate()` fires before page `onInit()`. Never draw UI or access hmUI in `onCreate` — the page context doesn't exist yet.

6. **offGesture() / offKey() in onDestroy** — must call both if registered in the page, or they leak.

7. **vibrator.stop() in onDestroy** — vibration continues after page exit otherwise.

8. **createTimer leak** — `createTimer()` returns a `timerId`. Call `stopTimer(timerId)` in `onDestroy()`.

9. **params via JSON.stringify** — `push({ url, params: JSON.stringify({...}) })`. Never use `globalData` for page-to-page data.

10. **catch (e) unused** — use `catch { }` (ES2019 optional catch binding) or `catch (e) { console.log(e) }`.

11. **App-service: 600ms timeout** — single execution exits after `onInit` and has a 600ms system limit. Use `@zos/alarm` for recurrence. `setInterval` is unreliable in services.

12. **App-service file writes** — writes to `data://` only allowed when screen is off or in AOD mode.

13. **LocalStorage in app-service** — must instantiate directly: `import { LocalStorage } from '@zos/storage'; const s = new LocalStorage()`. Cannot use `utils/storage.js`.

14. **Icon path** — must be at `assets/common.r/icon.png`, not `assets/icon.png`.

15. **Text overflow** — set `text_style: hmUI.text_style.ELLIPSIS` for single-line truncation. Default (`NONE`) scrolls.

For full API reference: read `references/api.md`
