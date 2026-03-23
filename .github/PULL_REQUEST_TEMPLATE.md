## What

<!-- What does this PR do? One or two sentences. -->

## Why

<!-- Why is this change needed? Link any related issues. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Tooling / config
- [ ] Assets / content

## Testing

- [ ] `npm run verify` passes (lint + format + zeus build)
- [ ] Tested in simulator (`zeus dev`)
- [ ] Tested on device (`zeus preview`)

## ZeppOS checklist

- [ ] New pages registered in `app.json` under `targets.common.module.page.pages`
- [ ] New services registered under `targets.common.module["app-service"].services`
- [ ] New permissions added to top-level `permissions` array
- [ ] New images under `assets/raw/`, paths match widget `src` strings
- [ ] Page state reset in `onInit` (module-level `let` vars persist across revisits)
- [ ] `offGesture()` / `offKey()` called in `onDestroy` if registered
- [ ] `vibrator.stop()` called in `onDestroy` if Vibrator was used
- [ ] Inter-page data via `params: JSON.stringify({...})`, not `globalData`

## Screenshots / demo

<!-- For UI changes, attach simulator screenshots or a short screen recording. -->
