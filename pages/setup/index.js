// pages/setup/index.js
import hmUI from '@zos/ui';
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import { COLOR } from '../../utils/constants';
import {
  TECHNIQUE_NAMES,
  TECHNIQUE_KEYS,
  ROUNDS_OPTIONS,
  TECHNIQUES,
} from '../../utils/techniques';

// Layout constants (480×480 canvas)
const ITEM_X = 80;
const ITEM_W = 320;
const ITEM_H = 40; // widget height
const ROW_STEP = 44; // ITEM_H + 4px gap

// Module-level state — reset in onInit
let selectedTechnique = 'box';
let selectedRounds = 5;

// Widget refs for section items so they can be deleted on selection change
let sectionWidgets = [];

function buildSections() {
  // Remove old item and label widgets
  sectionWidgets.forEach((w) => {
    if (w) hmUI.deleteWidget(w);
  });
  sectionWidgets = [];

  let y = 72;

  // — Technique label —
  sectionWidgets.push(
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: ITEM_X,
      y,
      w: ITEM_W,
      h: 28,
      text: 'Technique',
      text_size: 22,
      color: 0x8e8e93,
      align_h: hmUI.align.CENTER_H,
    })
  );
  y += 30;

  // — Technique rows —
  TECHNIQUE_KEYS.forEach((key) => {
    const isSelected = selectedTechnique === key;
    sectionWidgets.push(
      hmUI.createWidget(hmUI.widget.BUTTON, {
        x: ITEM_X,
        y,
        w: ITEM_W,
        h: ITEM_H,
        radius: 10,
        normal_color: isSelected ? 0x1a3d1e : 0x1c1c1e,
        press_color: 0x2d4d2d,
        text: TECHNIQUE_NAMES[key],
        text_size: 22,
        color: isSelected ? 0x30d158 : 0xffffff,
        click_func: () => {
          selectedTechnique = key;
          buildSections();
        },
      })
    );
    y += ROW_STEP;
  });

  y += 6;

  // — Rounds label —
  sectionWidgets.push(
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: ITEM_X,
      y,
      w: ITEM_W,
      h: 28,
      text: 'Rounds',
      text_size: 22,
      color: 0x8e8e93,
      align_h: hmUI.align.CENTER_H,
    })
  );
  y += 30;

  // — Rounds rows —
  ROUNDS_OPTIONS.forEach((r) => {
    const isSelected = selectedRounds === r;
    sectionWidgets.push(
      hmUI.createWidget(hmUI.widget.BUTTON, {
        x: ITEM_X,
        y,
        w: ITEM_W,
        h: ITEM_H,
        radius: 10,
        normal_color: isSelected ? 0x1a3d1e : 0x1c1c1e,
        press_color: 0x2d4d2d,
        text: `${r} rounds`,
        text_size: 22,
        color: isSelected ? 0x30d158 : 0xffffff,
        click_func: () => {
          selectedRounds = r;
          buildSections();
        },
      })
    );
    y += ROW_STEP;
  });
}

Page({
  onInit() {
    sectionWidgets = [];
    selectedTechnique = get(getKey('last_technique'), 'box');
    selectedRounds = get(getKey('last_rounds'), 5);

    // Validate against known-good values
    if (!TECHNIQUES[selectedTechnique]) selectedTechnique = 'box';
    if (!ROUNDS_OPTIONS.includes(selectedRounds)) selectedRounds = 5;
  },

  build() {
    buildSections();

    // Start button — created once, never rebuilt
    // y after 2 labels (28px+2px gap each) + 6 rows (44px each) + 2 gaps (30px each) + 6px section gap
    // = 72 + 30 + 3*44 + 6 + 30 + 3*44 + 8 = 72+30+132+6+30+132+8 = 410
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: 140,
      y: 410,
      w: 200,
      h: 44,
      radius: 22,
      normal_color: 0x007aff,
      press_color: COLOR.SECONDARY_PRESSED,
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
    sectionWidgets = [];
  },
});
