You are an expert ZeppOS developer. Before responding to: $ARGUMENTS

Internalize all the context below, then answer.

---

## Platform

- **Target:** ZeppOS smartwatches (round OLED, all sizes via `common` target)
- **OS:** ZeppOS 3.6+ (API target 3.7)
- **Runtime:** QuickJS (ES2020 subset) — no DOM, no Node.js, no browser APIs
- **Build:** Zeus CLI → Rollup bundles → QJSC compiles to bytecode

---

## ZeppOS API Reference

### UI — `@zos/ui` (imported as `hmUI`)

```js
import hmUI from '@zos/ui';
```

- All layout is **absolute pixel coordinates** — no flexbox, no CSS
- Key widgets: `FILL_RECT`, `TEXT`, `IMG`, `IMG_ANIM`, `ARC`, `BUTTON`, `SCROLL_LIST`
- Create: `hmUI.createWidget(hmUI.widget.TEXT, { x, y, w, h, text, text_size, color, align_h })`
- Update: `widget.setProperty(hmUI.prop.TEXT, value)` — **always null-check widget first**
- Show/hide: `widget.setProperty(hmUI.prop.VISIBLE, true/false)`
- Touch: `.addEventListener(hmUI.event.CLICK_UP, callback)` on any widget
- `align_h`: `hmUI.align.CENTER_H` | `hmUI.align.LEFT` | `hmUI.align.RIGHT`
- Colors: **hex numbers** (`0xffffff`), not strings
- `ARC`: `start_angle`/`end_angle` in degrees; −90 = top, 90 = bottom, 0 = right
- `SCROLL_LIST`: virtualized list — requires `item_config`, `data_array`, `item_click_func`
  - To reset scroll and update data: `list.setProperty(hmUI.prop.UPDATE_DATA, { ...config, on_page: 0 })`
- `IMG`: `auto_scale: true` + `auto_scale_obj_fit: 1` for aspect-ratio-preserving scale
- Min text size: **24px** (caption) for readability on round watch face

### Router — `@zos/router`

```js
import { push, replace, pop } from '@zos/router';

push({ url: 'pages/timer/index', params: JSON.stringify({ key: value }) });
replace({ url: 'pages/menu/index' }); // no back-stack entry
pop(); // go back
```

**Always pass data via `params: JSON.stringify({...})`** — not globalData (unreliable across push).
In target page `onInit(params)`: `const p = JSON.parse(params)` — always guard with try/catch.

### Storage — `@zos/storage`

```js
import { LocalStorage } from '@zos/storage';
const storage = new LocalStorage(); // must instantiate
storage.getItem(key, defaultValue); // returns defaultValue if missing
storage.setItem(key, value); // value can be any JSON-serializable type
```

Use `utils/storage.js` wrappers (`get`, `set`, `getKey`) in page code.
In app-service code, import and instantiate LocalStorage directly (separate bundle context).

### Sensors — `@zos/sensor`

```js
import { Time, Vibrator, HeartRate, Battery } from '@zos/sensor';

// Time
const t = new Time();
t.getHours() / t.getMinutes() / t.getSeconds();
t.onPerMinute(callback); // called every minute

// Vibrator — MUST call stop() in onDestroy
const v = new Vibrator();
const type = v.getType(); // { URGENT, STRONG_SHORT, PULSE, ... }
v.start([
  { type: type.STRONG_SHORT, duration: 300 },
  { type: type.PAUSE, duration: 100 },
]);
v.stop(); // call in onDestroy — vibration continues after page exit otherwise

// Battery
const b = new Battery();
b.getCurrent(); // percentage 0-100
```

### Interaction — `@zos/interaction`

```js
import {
  onGesture,
  offGesture,
  GESTURE_UP,
  GESTURE_DOWN,
  GESTURE_LEFT,
  GESTURE_RIGHT,
  onKey,
  offKey,
  KEY_HOME,
  KEY_SELECT,
  KEY_EVENT_CLICK,
  KEY_EVENT_LONG_PRESS,
} from '@zos/interaction';

onGesture({
  callback: (gesture) => {
    /* handle */ return true;
  },
}); // return true to consume
onKey({
  callback: (key, event) => {
    /* handle */ return true;
  },
});

// MUST call in onDestroy:
offGesture();
offKey();
```

### Alarms — `@zos/alarm`

```js
import { set as setAlarm, cancel as cancelAlarm } from '@zos/alarm';

const id = setAlarm({ url: 'app-service/index', delay: 300 }); // delay in seconds
cancelAlarm({ alarmId: id });
```

Use for app-service recurrence (alarm chain). `url` = path to service file (no .js extension).

### App Service — `@zos/app-service`

```js
import { exit } from '@zos/app-service';

AppService({
  onInit(params) {
    /* single-shot */
  },
  onDestroy() {},
});
```

Call `exit()` to terminate early. Service exits automatically after `onInit` completes.

### Display — `@zos/display`

```js
import { setWakeUpRelaunch } from '@zos/display';
setWakeUpRelaunch({ relaunch: true }); // keep screen alive / relaunch on wake-up
```

### Background Service Start — `@zos/bg-service`

```js
import { start, stop } from '@zos/bg-service';
start({ file: 'app-service/index', param: JSON.stringify({ key: val }) });
stop({ file: 'app-service/index' });
```

---

## ZUI Component Reference (`zeppos-zui`)

Import components from `'zeppos-zui'`:

```js
import {
  CircularLayout,
  VStack,
  HStack,
  ScrollView,
  Container,
  Text,
  Title,
  Body,
  Caption,
  Button,
  PrimaryButton,
  SecondaryButton,
  DestructiveButton,
  Switch,
  Stepper,
  ListItem,
  SectionHeader,
  TitleBar,
  showToast,
  dismissToast,
  showLoading,
  hideLoading,
  createState,
  effect,
  textColors,
  systemColors,
  backgroundColors,
  fontSizes,
  theme,
} from 'zeppos-zui';
```

### Layout

```js
// Root container for circular displays
new CircularLayout({
  safeAreaEnabled: true,   // 2px margin from edges
  centerContent: false,
  edgeMargin: 8,
  verticalAlignment: 'center' | 'start' | 'end',
  children: [...],
});

// Vertical stack
new VStack({ spacing: 16, alignment: 'center', children: [...] });

// Horizontal stack
new HStack({ spacing: 8, justifyContent: 'space-between', alignment: 'center', children: [...] });

// Scrollable container
new ScrollView({ direction: 'vertical', showScrollBar: true, children: [...] });
```

After building the tree: `layout.mount()` in `build()`, `layout.destroy()` in `onDestroy()`.
To force a re-render: `layout.update()`.

### Text

```js
new Text({
  text: 'Hello',
  textStyle: 'largeTitle' | 'title' | 'subheadline' | 'body' | 'caption1' | 'caption2',
  fontWeight: 'bold' | 'medium' | 'regular',
  color: textColors.title, // or hex number e.g. 0xffffff
  align: 'center' | 'left' | 'right',
});
```

Color tokens: `textColors.title`, `.subtitle`, `.body`, `.caption` (from `'zeppos-zui'`).

### Button

```js
new Button({
  label: 'Confirm',
  variant: 'primary' | 'secondary' | 'destructive' | 'ghost',
  size: 'small' | 'medium' | 'large' | 'capsule' | 'floating',
  onPress: () => {
    /* handler */
  },
  onLongPress: () => {
    /* optional */
  },
  disabled: false,
});
```

### Switch

```js
new Switch({
  value: true,
  showLabels: true,
  onChange: (val) => {
    console.log('switched:', val);
  },
});
```

### ListItem

```js
new ListItem({
  title: 'Settings',
  subtitle: 'Configure app options', // optional
  accessory: 'chevron' | 'switch' | 'badge', // optional
  onPress: () => {},
});
```

### Feedback

```js
showToast({ message: 'Saved!', icon: 'ic_check', duration: 2000 });
dismissToast();

showLoading({ message: 'Please wait...' });
hideLoading();
```

### State

```js
const state = createState({ count: 0 });
effect(
  state,
  (s) => s.count,
  (count) => {
    /* runs on change */
  }
);
state.set({ count: state.get().count + 1 });
```

---

## Page Scaffold (copy this pattern)

```js
import { CircularLayout, VStack, Text, textColors } from 'zeppos-zui';
// import { push, pop } from '@zos/router'; // uncomment when you need navigation

let pageRoot = null; // module-level — reset in onInit

Page({
  onInit(params) {
    pageRoot = null; // reset on every visit
    try {
      const p = params ? JSON.parse(params) : {};
      console.log('[PageName] params:', p);
    } catch {
      console.log('[PageName] no params');
    }
  },

  build() {
    pageRoot = new CircularLayout({
      safeAreaEnabled: true,
      children: [
        new VStack({
          spacing: 16,
          children: [new Text({ text: 'Page Title', textStyle: 'title', color: textColors.title })],
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
    // offGesture(); offKey(); vibrator.stop(); — if used
  },
});
```

---

## ZeppOS Gotchas

1. **Widget null check** — always check non-null before `setProperty`. Silent crash otherwise.
2. **`replace()` vs `push()`** — `replace` skips back stack (use for result/done screens).
3. **Module-level vars persist** — `let x` is NOT reset on page revisit. Reset in `onInit`.
4. **`SCROLL_LIST` data updates** — use `setProperty(prop.UPDATE_DATA, { ...config, on_page: 0 })` to reset scroll position.
5. **App-service single-shot** — use alarm chain for recurrence.
6. **`catch (e)` unused** — use `catch { }` (ES2019 optional catch binding).
7. **LocalStorage is per-app** — values persist across app restarts.
8. **OLED backgrounds** — always `0x000000` — zero power for black pixels.
9. **Vibrator must stop** — call `vibrator.stop()` in `onDestroy`.
10. **Images in `assets/raw/`** — widget `src` paths are relative to this directory.
11. **Icon path for common target** — Zeus resolves `targets.common` + round platforms to `common.r`. Icon must be at `assets/common.r/icon.png`.
