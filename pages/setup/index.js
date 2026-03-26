// pages/setup/index.js
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import { LAYOUT, SPACING, renderPage, UI } from '@bug-breeder/zeroui';
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
  if (col) {
    // Subsequent calls: wipe chips only, keep VIEW_CONTAINER z-order intact
    col.clearContent();
  } else {
    // First call (from buildFn inside renderPage): create the scrollable Column
    col = UI.column(LAYOUT.FULL.MAIN, { scrollable: true });
  }

  col.sectionLabel('Technique');
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
  col.sectionLabel('Rounds');
  col.chipRow(ROUNDS_OPTIONS, {
    selected: selectedRounds,
    onPress: (v) => {
      selectedRounds = v;
      rebuild();
    },
  });

  // Required when scrollable=true: sets VIEW_CONTAINER total scroll height
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
      buildFn: () => rebuild(), // called before masks/title/action → correct z-order
    });
  },

  onDestroy() {
    if (col) {
      col.destroyAll();
      col = null;
    }
  },
});
