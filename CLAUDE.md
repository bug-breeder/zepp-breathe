# Breathe

**App:** Haptic-guided breathing exercises for smartwatch
**App ID:** 10000001 (placeholder — get a real ID from [Zepp Open Platform](https://open.zepp.com/) and replace in `app.json`)
**Platform:** ZeppOS smartwatches (round OLED, all devices via `common` target)
**ZeppOS API:** 3.6 compatible / 3.7 target

---

## Setup (one-time, per machine)

```bash
git init                                    # must run before npm install (Husky needs git)
npm install                                 # installs deps + sets up pre-commit hook
npm install -g @zeppos/zeus-cli            # ZeppOS build tool (global)
zeus login                                  # required for device preview
```

In Claude Code: `/plugin marketplace add bug-breeder/zepphyr` then `/plugin install zepphyr@zepphyr`

---

## Platform Constraints

**Know these before writing any code:**

- **Runtime:** QuickJS (ES2020 subset) — no DOM, no Node.js, no browser APIs
- **UI:** Use ZeRoUI (`@bug-breeder/zeroui`) for all page layout.
  - `import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui'`
  - Raw `@zos/ui` (`hmUI`) only for widgets ZeRoUI doesn't cover (IMG, ARC, SCROLL_LIST, etc.)
- **Imports:** All ZeppOS platform APIs are `@zos/*`. UI library is `@bug-breeder/zeroui`.
- **Display:** Round OLED, 480px design canvas. **Black background saves battery** — OLED turns off black pixels.
- **App-services:** Single-shot — `onInit` runs once, 600ms timeout. Use alarm-chain (`@zos/alarm`) for recurring behavior.

---

## Project Structure

```
app.js                  App entry — globalData: {}. Never pass page data via globalData.
app.json                ZeppOS manifest — ALL pages + services MUST be registered here.
pages/
  home/index.js         Home page (golden example — copy this pattern for new pages)
app-service/
  index.js              Background service scaffold (alarm-chain pattern)
utils/
  constants.js          DEVICE_WIDTH/HEIGHT, supplemental COLOR tokens (for raw hmUI)
  storage.js            LocalStorage wrapper — get(), set(), getKey()
assets/
  common.r/             Target-specific assets (zeus resolves common + round → common.r)
    icon.png            App icon — must exist here for zeus build to pass
  raw/                  App images — widget paths are relative to assets/raw/
```

---

## Dev Commands

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `npm run dev`      | Build + launch in simulator (watches for changes)         |
| `npm run build`    | Build `.zab` installer → `dist/`                          |
| `npm run preview`  | Build + push to device (scan QR in Zepp app)              |
| `npm run verify`   | Lint + format check + build — **run before every commit** |
| `npm run lint:fix` | Auto-fix lint errors                                      |
| `npm run format`   | Auto-format all files                                     |

---

## Quality Gates

**Before marking any task done, verify all of these:**

- [ ] `npm run verify` passes — lint + format + zeus build, zero errors
- [ ] No `catch (e)` with unused `e` — use `catch { }` (no binding) or `catch (e) { console.log(e) }`
- [ ] No unused imports or variables
- [ ] New pages registered in `app.json` under `targets.common.module.page.pages`
- [ ] New app-services registered under `targets.common.module["app-service"].services`
- [ ] New permissions added to top-level `permissions` array if new `@zos/*` APIs are used
- [ ] `offGesture()` / `offKey()` called in `onDestroy` if registered in that page
- [ ] `vibrator.stop()` called in `onDestroy` if `Vibrator` was started
- [ ] Inter-page data passed via `params: JSON.stringify({...})` in `push()`/`replace()`, not `globalData`

---

## Top 7 Gotchas

1. **Widget null check** — always verify a widget reference is non-null before `widget.setProperty(...)`. Silently crashes otherwise.

2. **`replace()` vs `push()`** — use `replace({ url })` when you don't want a back-stack entry (e.g. result screen → home). Use `push({ url })` for normal navigation with back button.

3. **Module-level vars persist across page visits** — `let x = 0` at module scope is NOT reset when the user navigates away and returns. Reset ALL state explicitly in `onInit()`.

4. **App-service is single-shot** — `onInit` runs once (600ms timeout). For recurring behavior use:

   ```js
   setAlarm({ url: 'app-service/index', delay: 300 }); // from '@zos/alarm'
   ```

   `setInterval` is unreliable in services.

5. **Black background is mandatory** — Use `COLOR.BG` (`0x000000`) from `@bug-breeder/zeroui` on every page. OLED panels consume zero power for black pixels.

6. **Vibrator must be stopped** — Starting a `Vibrator` and navigating away without calling `vibrator.stop()` in `onDestroy` leaves it running indefinitely.

7. **Icon path for common target** — Zeus resolves `targets.common` + `platforms: [{"st":"r"}]` to the target name `common.r`. The app icon must be at `assets/common.r/icon.png` — NOT `assets/icon.png`.

---

## Slash Commands

| Command                | When to use                                       |
| ---------------------- | ------------------------------------------------- |
| `/zeppos [question]`   | Full ZeppOS API cheatsheet                        |
| `/new-page <PageName>` | Scaffold a new page and register it in `app.json` |
| `/review [PR#]`        | ZeppOS-aware automated PR review                  |
