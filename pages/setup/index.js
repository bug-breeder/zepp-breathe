// pages/setup/index.js
import { CircularLayout, ScrollView, VStack, Text, Button, ListItem, textColors } from 'zeppos-zui';
import { push } from '@zos/router';
import { get, getKey } from '../../utils/storage';
import {
  TECHNIQUE_NAMES,
  TECHNIQUE_KEYS,
  ROUNDS_OPTIONS,
  TECHNIQUES,
} from '../../utils/techniques';

// Module-level state — reset in onInit
let pageRoot = null;
let selectedTechnique = 'box';
let selectedRounds = 5;

/**
 * Destroys the existing ZUI tree and builds a fresh one.
 * Called from build() and from selection-change callbacks.
 */
function buildPage() {
  if (pageRoot) {
    pageRoot.destroy();
    pageRoot = null;
  }

  const techniqueItems = TECHNIQUE_KEYS.map(
    (key) =>
      new ListItem({
        title: TECHNIQUE_NAMES[key],
        // 'badge' shows a colored dot on the right — used as selected indicator
        accessory: selectedTechnique === key ? 'badge' : undefined,
        onPress: () => {
          selectedTechnique = key;
          buildPage();
        },
      })
  );

  const roundsItems = ROUNDS_OPTIONS.map(
    (r) =>
      new ListItem({
        title: `${r} rounds`,
        accessory: selectedRounds === r ? 'badge' : undefined,
        onPress: () => {
          selectedRounds = r;
          buildPage();
        },
      })
  );

  pageRoot = new CircularLayout({
    safeAreaEnabled: true,
    centerContent: false,
    edgeMargin: 8,
    verticalAlignment: 'start',
    children: [
      new ScrollView({
        direction: 'vertical',
        children: [
          new VStack({
            spacing: 4,
            alignment: 'center',
            children: [
              new Text({
                text: 'Technique',
                textStyle: 'caption1',
                color: textColors.caption,
                align: 'center',
              }),
              ...techniqueItems,
              new Text({
                text: 'Rounds',
                textStyle: 'caption1',
                color: textColors.caption,
                align: 'center',
              }),
              ...roundsItems,
              new Button({
                label: 'Start',
                variant: 'primary',
                size: 'capsule',
                onPress: () => {
                  // push (not replace) so pop() in Session returns here
                  push({
                    url: 'pages/session/index',
                    params: JSON.stringify({
                      technique: selectedTechnique,
                      rounds: selectedRounds,
                    }),
                  });
                },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  pageRoot.mount();
}

Page({
  onInit() {
    pageRoot = null;
    selectedTechnique = get(getKey('last_technique'), 'box');
    selectedRounds = get(getKey('last_rounds'), 5);

    // Validate against known-good values
    if (!TECHNIQUES[selectedTechnique]) selectedTechnique = 'box';
    if (!ROUNDS_OPTIONS.includes(selectedRounds)) selectedRounds = 5;
  },

  build() {
    buildPage();
  },

  onDestroy() {
    if (pageRoot) {
      pageRoot.destroy();
      pageRoot = null;
    }
  },
});
