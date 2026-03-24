// pages/setup/index.js
import hmUI from '@zos/ui';
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import {
  TECHNIQUE_NAMES,
  TECHNIQUE_KEYS,
  ROUNDS_OPTIONS,
  TECHNIQUES,
} from '../../utils/techniques';

// Layout constants (480×480 canvas)
const ITEM_H = 40; // height of each selectable row
const DOT_R = 8; // selection dot radius
const DOT_SIZE = DOT_R * 2;
const ITEM_X = 80; // left edge of item row
const ITEM_W = 320; // width of item row (80–400)
const DOT_X = ITEM_X + ITEM_W - DOT_SIZE - 8; // dot right-aligned inside row

// Module-level state — reset in onInit
let selectedTechnique = 'box';
let selectedRounds = 5;

// Dot widget refs so we can toggle visibility on selection change
let techniqueDots = []; // one ref per TECHNIQUE_KEYS entry
let roundsDots = []; // one ref per ROUNDS_OPTIONS entry

function makeTechniqueHandler(key) {
  return () => {
    selectedTechnique = key;
    TECHNIQUE_KEYS.forEach((k, i) => {
      if (techniqueDots[i]) techniqueDots[i].setProperty(hmUI.prop.VISIBLE, k === key);
    });
  };
}

function makeRoundsHandler(r) {
  return () => {
    selectedRounds = r;
    ROUNDS_OPTIONS.forEach((option, i) => {
      if (roundsDots[i]) roundsDots[i].setProperty(hmUI.prop.VISIBLE, option === r);
    });
  };
}

function addItemWidgets(y, label, isSelected, onPress) {
  // Background — serves as the tap target
  const bg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: ITEM_X,
    y,
    w: ITEM_W,
    h: ITEM_H - 2,
    radius: 8,
    color: 0x1c1c1e,
  });

  // Label
  hmUI.createWidget(hmUI.widget.TEXT, {
    x: ITEM_X + 16,
    y,
    w: ITEM_W - DOT_SIZE - 32,
    h: ITEM_H - 2,
    text: label,
    text_size: 22,
    color: 0xffffff,
    align_h: hmUI.align.LEFT,
  });

  // Selection dot — green circle on right side
  const dot = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: DOT_X,
    y: y + Math.floor((ITEM_H - 2 - DOT_SIZE) / 2),
    w: DOT_SIZE,
    h: DOT_SIZE,
    radius: DOT_R,
    color: 0x30d158,
  });
  if (dot) dot.setProperty(hmUI.prop.VISIBLE, isSelected);

  // Attach tap handler to background; also to dot so tapping the dot works
  if (bg) bg.addEventListener(hmUI.event.CLICK_UP, onPress);
  if (dot) dot.addEventListener(hmUI.event.CLICK_UP, onPress);

  return dot;
}

Page({
  onInit() {
    techniqueDots = [];
    roundsDots = [];
    selectedTechnique = get(getKey('last_technique'), 'box');
    selectedRounds = get(getKey('last_rounds'), 5);

    // Validate against known-good values
    if (!TECHNIQUES[selectedTechnique]) selectedTechnique = 'box';
    if (!ROUNDS_OPTIONS.includes(selectedRounds)) selectedRounds = 5;
  },

  build() {
    let y = 72;

    // — Technique section —
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: ITEM_X,
      y,
      w: ITEM_W,
      h: 26,
      text: 'Technique',
      text_size: 22,
      color: 0x8e8e93,
      align_h: hmUI.align.CENTER_H,
    });
    y += 28;

    TECHNIQUE_KEYS.forEach((key) => {
      const dot = addItemWidgets(
        y,
        TECHNIQUE_NAMES[key],
        selectedTechnique === key,
        makeTechniqueHandler(key)
      );
      techniqueDots.push(dot);
      y += ITEM_H;
    });

    y += 6;

    // — Rounds section —
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: ITEM_X,
      y,
      w: ITEM_W,
      h: 26,
      text: 'Rounds',
      text_size: 22,
      color: 0x8e8e93,
      align_h: hmUI.align.CENTER_H,
    });
    y += 28;

    ROUNDS_OPTIONS.forEach((r) => {
      const dot = addItemWidgets(y, `${r} rounds`, selectedRounds === r, makeRoundsHandler(r));
      roundsDots.push(dot);
      y += ITEM_H;
    });

    y += 10;

    // — Start button —
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: 140,
      y,
      w: 200,
      h: 44,
      radius: 22,
      normal_color: 0x007aff,
      press_color: 0x0051d5,
      text: 'Start',
      text_size: 22,
      color: 0xffffff,
      click_func: () => {
        push({
          url: 'pages/session/index',
          params: JSON.stringify({
            technique: selectedTechnique,
            rounds: selectedRounds,
          }),
        });
      },
    });
  },

  onDestroy() {
    techniqueDots = [];
    roundsDots = [];
  },
});
