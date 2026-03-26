/**
 * App-specific constants for zepp-breathe.
 *
 * Design tokens (COLOR, TYPOGRAPHY, RADIUS, SPACING) now live in
 * @bug-breeder/zeroui. Import them from there:
 *   import { COLOR, TYPOGRAPHY } from '@bug-breeder/zeroui';
 *
 * This file keeps only values specific to this app.
 */

// Design canvas dimensions — matches app.json designWidth: 480.
// Used by session page for ring geometry calculations.
export const DEVICE_WIDTH = 480;
export const DEVICE_HEIGHT = 480;
