---
name: new-page
description: Scaffold a new ZeppOS page using ZeRoUI. Creates the page file and registers it in app.json.
argument-hint: <PageName>
context: fork
---

Scaffold a new ZeppOS page: $ARGUMENTS

**Derive names from `$ARGUMENTS`:**

- PascalCase (e.g. `TimerSelect`) → used in file comment and log prefix
- kebab-case (e.g. `timer-select`) → directory name
- File path: `pages/<kebab-case>/index.js`
- Registration path: `pages/<kebab-case>/index` (no .js extension — for app.json)

**Create `pages/<kebab-case>/index.js`:**

```js
/**
 * [PascalCase] page
 */
import { renderPage, column, LAYOUT } from '@bug-breeder/zeroui';
// import { push, pop } from '@zos/router'; // uncomment when needed

// Module-level state — MUST reset in onInit (persists across page visits)
let col = null;

Page({
  onInit(params) {
    col = null;

    try {
      const p = params ? JSON.parse(params) : {};
      console.log('[[PascalCase]] onInit', p);
    } catch {
      console.log('[[PascalCase]] onInit: no params');
    }
  },

  build() {
    col = column(LAYOUT.FULL.MAIN, { scrollable: true });

    renderPage({
      layout: LAYOUT.FULL,
      title: '[PascalCase]',
      buildFn() {
        col.sectionLabel('Section');
        col.chip('Item', { onPress: () => {} });
        col.finalize();
      },
    });
  },

  onDestroy() {
    if (col) {
      col.destroyAll();
      col = null;
    }
    // offGesture(); offKey(); vibrator.stop(); — if used
  },
});
```

**Register in `app.json`:** Add `"pages/<kebab-case>/index"` to `targets.common.module.page.pages`.

**Run:** `npm run lint` — expect 0 errors.

**Report:** created file path, app.json entry added, lint result.
