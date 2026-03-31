// pages/setup/index.js
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import { LAYOUT, SPACING, renderPage } from '@bug-breeder/zeroui';
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

function rebuild() {
  col.clearContent();

  col.label('Technique');
  TECHNIQUE_KEYS.forEach((key) => {
    col.chip(TECHNIQUE_NAMES[key], {
      selected: selectedTechnique === key,
      onPress: () => {
        selectedTechnique = key;
        rebuild();
      },
    });
  });

  col.spacer(SPACING.sectionGap);
  col.label('Rounds');
  col.chipRow(ROUNDS_OPTIONS, {
    selected: selectedRounds,
    onPress: (v) => {
      selectedRounds = v;
      rebuild();
    },
  });

  col.finalize();
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
      title: 'Breathing Setup',
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
