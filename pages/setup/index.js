// pages/setup/index.js
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import { LAYOUT, renderPage } from '@bug-breeder/zeroui';
import {
  TECHNIQUE_NAMES,
  TECHNIQUE_KEYS,
  ROUNDS_OPTIONS,
  TECHNIQUES,
} from '../../utils/techniques';

// Module-level state — ALL reset in onInit on every page visit
let selectedTechnique = 'box';
let selectedRounds = 5;
let col = null;

// Layout math (FULL, MAIN y=84 h=288):
//   "Technique" title → TITLE zone (y=24), rendered fixed after top mask
//   3 chips × (52+6) = 174  →  col.y=258
//   "Rounds" label (40+12) = 52  →  col.y=310
//   chipRow(56+6) = 62  →  col.y=372  (= MAIN bottom exactly, no bleed)
//
// scrollable: false — no VIEW_CONTAINER, masks work correctly.
function rebuild() {
  col.clearContent();

  TECHNIQUE_KEYS.forEach((key) => {
    col.chip(TECHNIQUE_NAMES[key], {
      h: 52,
      selected: selectedTechnique === key,
      onPress: () => {
        selectedTechnique = key;
        rebuild();
      },
    });
  });

  col.label('Rounds');
  col.chipRow(ROUNDS_OPTIONS, {
    h: 56,
    selected: selectedRounds,
    onPress: (v) => {
      selectedRounds = v;
      rebuild();
    },
  });
}

Page({
  onInit() {
    col = null;
    selectedTechnique = get(getKey('last_technique'), 'box');
    selectedRounds = get(getKey('last_rounds'), 5);
    if (!TECHNIQUES[selectedTechnique]) selectedTechnique = 'box';
    if (!ROUNDS_OPTIONS.includes(selectedRounds)) selectedRounds = 5;
  },

  build() {
    renderPage({
      layout: LAYOUT.FULL,
      title: 'Technique',
      scrollable: false,
      action: {
        text: 'Start',
        onPress: () => {
          push({
            url: 'pages/session/index',
            params: JSON.stringify({
              technique: selectedTechnique,
              rounds: selectedRounds,
            }),
          });
        },
      },
      buildFn: (c) => {
        col = c;
        rebuild();
      },
    });
  },

  onDestroy() {
    col?.destroyAll();
    col = null;
  },
});
