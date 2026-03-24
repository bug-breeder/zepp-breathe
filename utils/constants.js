/**
 * App Constants
 *
 * DEVICE_WIDTH/HEIGHT: Design canvas matching app.json designWidth: 480.
 * Use px() for ZeppOS auto-scaling to the device's actual resolution.
 * For runtime screen size: import { getDeviceInfo } from '@zos/device-info'
 * and read getDeviceInfo().width / .height — many round devices are 466×466.
 *
 * These constants are for raw @zos/ui (hmUI) layout.
 */

export const DEVICE_WIDTH = 480;
export const DEVICE_HEIGHT = 480;

/**
 * Semantic color tokens for raw hmUI widgets.
 * OLED-first: BG is always pure black (black pixels = zero power draw).
 * All values are hex numbers (e.g. 0xffffff), not strings.
 */
export const COLOR = {
  BG: 0x000000, // OLED black — always use as page background
  PRIMARY: 0x30d158, // Green — main actions, progress indicators
  SECONDARY: 0x0a84ff, // Blue — secondary actions, links
  SECONDARY_PRESSED: 0x0051d5, // pressed state for SECONDARY button
  DANGER: 0xfa5151, // Red — destructive actions, errors
  SUCCESS: 0x34c759, // Lighter green — success/confirmation states
  TEXT: 0xffffff, // White — primary text
  TEXT_MUTED: 0x8e8e93, // Gray — hints, captions, inactive elements
  CARD: 0x1c1c1e, // Dark gray — card and surface backgrounds
  CARD_PRESSED: 0x2c2c2e, // pressed state for CARD background
};

/**
 * Typography scale for raw hmUI TEXT widgets.
 * Minimum readable size on round watch display: 24px (caption).
 * Prefer semantic names over raw pixel values in your code.
 */
export const TYPOGRAPHY = {
  largeTitle: 48, // App title, hero text
  title: 36, // Section headers, screen titles
  body: 32, // Body text, list items
  subheadline: 28, // Subtitles, secondary labels
  caption: 24, // Minimum readable — hints, timestamps, footnotes
};
