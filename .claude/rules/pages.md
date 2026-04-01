---
description: ZeRoUI patterns for ZeppOS pages — loaded automatically when editing page files
paths: pages/**/*.js
---

## ZeRoUI Page Rules

- `column()` must be called INSIDE `buildFn()`, not before `renderPage()` — z-order bug otherwise
- `col.finalize()` required after all items in a scrollable column — content won't scroll without it
- `col.destroyAll()` in `onDestroy()`, never mid-page — use `clearContent()` + re-add + `finalize()` for rebuilds
- Module-level vars (`let col = null`) must reset to initial value in `onInit()` — they persist across page visits
- Use `COLOR.BG` (`0x000000`) on every page background — OLED turns off black pixels
- `offGesture()` / `offKey()` in `onDestroy()` if registered — they leak otherwise
- `vibrator.stop()` in `onDestroy()` if started — vibration continues after page exit otherwise

## Screen Physical Dimensions
- Target: Amazfit Balance (1.5", 480×480, 453 PPI) and GTR Mini (1.32", 466×466, 500 PPI)
- 1 design unit ≈ 0.052–0.056mm physical
- Minimum tap target: 125 design units (~7mm) for interactive elements
- Design grid: 12-unit base — use multiples of 12 for all heights and font sizes
- `RADIUS.pill` (999) for action buttons · `RADIUS.chip` (12) for selection chips
