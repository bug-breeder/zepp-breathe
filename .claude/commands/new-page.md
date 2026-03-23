Scaffold a new ZeppOS page: $ARGUMENTS

Follow these steps exactly in order. Do not skip any step.

---

## Step 1: Determine names

From `$ARGUMENTS`, derive:

- **PascalCase name** for use in comments (e.g. `Settings`, `TimerSelect`)
- **kebab-case path** for the file system (e.g. `settings`, `timer-select`)
- **File path:** `pages/<kebab-case>/index.js`
- **Registration path:** `pages/<kebab-case>/index` (no .js extension — for app.json)

---

## Step 2: Create the page file

Create `pages/<kebab-case>/index.js` with this exact content (replace `[PageName]` throughout):

```js
/**
 * [PageName] page
 */

import { CircularLayout, VStack, Text, textColors } from 'zeppos-zui';
// import { push, pop } from '@zos/router'; // uncomment when you need navigation

// Module-level state — MUST be reset in onInit (persists across page visits)
let pageRoot = null;

Page({
  onInit(params) {
    // Reset module-level state
    pageRoot = null;

    // Parse navigation params — always guard with try/catch
    try {
      const p = params ? JSON.parse(params) : {};
      console.log('[[PageName]] onInit params:', JSON.stringify(p));
    } catch {
      console.log('[[PageName]] onInit: no params');
    }
  },

  build() {
    console.log('[[PageName]] build');

    pageRoot = new CircularLayout({
      safeAreaEnabled: true,
      centerContent: false,
      edgeMargin: 8,
      verticalAlignment: 'center',
      children: [
        new VStack({
          spacing: 16,
          alignment: 'center',
          children: [
            new Text({
              text: '[PageName]',
              textStyle: 'title',
              color: textColors.title,
              align: 'center',
            }),
          ],
        }),
      ],
    });

    pageRoot.mount();
  },

  onDestroy() {
    console.log('[[PageName]] onDestroy');

    if (pageRoot) {
      pageRoot.destroy();
      pageRoot = null;
    }

    // Also clean up if used:
    //   offGesture() / offKey() — from '@zos/interaction'
    //   vibrator.stop()         — if Vibrator was started
  },
});
```

---

## Step 3: Register in app.json

Open `app.json`. Find the `targets.common.module.page.pages` array and add the new page path (no .js extension):

```json
"page": {
  "pages": [
    "pages/home/index",
    "pages/<kebab-case>/index"
  ]
}
```

---

## Step 4: Verify

Run `npm run lint` — expect 0 errors.

---

## Step 5: Confirm

Report back:

- Created file: `pages/<kebab-case>/index.js`
- Registered in `app.json`: `"pages/<kebab-case>/index"` added to pages array
- Lint: passes
