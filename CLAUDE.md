# Breathe

**App:** Haptic-guided breathing exercises for smartwatch
**App ID:** 10000001 (placeholder — replace in `app.json`, get from [Zepp Open Platform](https://open.zepp.com/))
**Platform:** ZeppOS smartwatches (round OLED, 480px) — API 3.6 compatible / 3.7 target

---

## Setup (one-time, per machine)

```bash
git init && npm install
npm install -g @zeppos/zeus-cli
zeus login
```

In Claude Code: `/plugin marketplace add bug-breeder/zepphyr` then `/plugin install zepphyr@zepphyr`

---

## Platform — Non-Negotiables

- **ZeRoUI required** — `import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui'` for all page layout
- **Black background** — use `COLOR.BG` (`0x000000`) on every page; OLED turns off black pixels
- **QuickJS runtime** — ES2020 subset; no DOM, no Node.js, no browser APIs

For full platform gotchas and API reference: `/zeppos` or `/zeppos [question]`

---

## Dev Commands

| Command            | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | Build + launch in simulator                     |
| `npm run build`    | Build `.zab` installer → `dist/`                |
| `npm run preview`  | Build + push to device                          |
| `npm run verify`   | Lint + format check + build — run before commit |
| `npm run lint:fix` | Auto-fix lint errors                            |
| `npm run format`   | Auto-format all files                           |

---

## Quality Gates

Run `npm run verify` before every commit. No unused `catch (e)` binding — use `catch { }`.

---

## This App

**Pages:** `home` → `setup` → `session` → `stats`
**Techniques:** `box` (4-4-4-4), `478` (4-7-8), `simple` (4-4) — defined in `utils/techniques.js`
**Storage:** keys via `getKey()` in `utils/storage.js`; pass data between pages via `params: JSON.stringify({...})`

---

## Slash Commands

| Command                        | When to use                                       |
| ------------------------------ | ------------------------------------------------- |
| `/zepphyr:zeppos [question]`   | ZeppOS platform cheatsheet + gotchas              |
| `/zepphyr:new-page <PageName>` | Scaffold a new page and register it in `app.json` |
| `/zepphyr:review [PR#]`        | ZeppOS-aware automated PR review                  |
