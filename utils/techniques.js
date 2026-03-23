// utils/techniques.js

/**
 * Breathing technique phase definitions.
 *
 * Each phase: { label, s, ring }
 *   label — displayed on screen ("INHALE" / "HOLD" / "EXHALE")
 *   s     — duration in seconds
 *   ring  — 'large' (lungs full) or 'small' (lungs empty)
 *
 * IMPORTANT: box has two HOLD phases with different ring states.
 * Always use phase.ring to determine ring size — never infer from label.
 */
export const TECHNIQUES = {
  box: [
    { label: 'INHALE', s: 4, ring: 'large' },
    { label: 'HOLD', s: 4, ring: 'large' }, // hold after inhale — lungs full
    { label: 'EXHALE', s: 4, ring: 'small' },
    { label: 'HOLD', s: 4, ring: 'small' }, // hold after exhale — lungs empty
  ],
  478: [
    { label: 'INHALE', s: 4, ring: 'large' },
    { label: 'HOLD', s: 7, ring: 'large' },
    { label: 'EXHALE', s: 8, ring: 'small' },
  ],
  simple: [
    { label: 'INHALE', s: 4, ring: 'large' },
    { label: 'EXHALE', s: 4, ring: 'small' },
  ],
};

export const TECHNIQUE_NAMES = {
  box: 'Box 4-4-4-4',
  478: '4-7-8',
  simple: 'Simple 4-4',
};

export const TECHNIQUE_KEYS = ['box', '478', 'simple'];
export const ROUNDS_OPTIONS = [3, 5, 10];
