/**
 * Storage Utility
 *
 * Generic wrapper over ZeppOS LocalStorage with safe defaults and error handling.
 *
 * Usage:
 *   import { get, set, getKey } from '../../utils/storage';
 *   set(getKey('my_key'), value);
 *   const value = get(getKey('my_key'), defaultValue);
 *
 * Dev-mode data separation (optional):
 *   Set DEV_MODE = true to prefix all data keys with 'dev_'.
 *   This keeps dev/test data separate from real user data.
 *   Wire DEV_MODE to a settings storage key for a runtime toggle:
 *     const DEV_MODE = storage.getItem('app_dev_mode', false);
 */

import { LocalStorage } from '@zos/storage';

const storage = new LocalStorage();

// Set to true to prefix all keys with 'dev_' for separate dev/prod data.
const DEV_MODE = false;

/**
 * Get the actual storage key, with optional dev-mode prefix.
 * Always route storage reads/writes through this function.
 * @param {string} baseKey
 * @returns {string}
 */
export function getKey(baseKey) {
  return DEV_MODE ? `dev_${baseKey}` : baseKey;
}

/**
 * Read a value from storage.
 * Returns defaultValue if the key is missing or on any error.
 * @param {string} key - use getKey() to get this
 * @param {*} defaultValue
 * @returns {*}
 */
export function get(key, defaultValue) {
  try {
    return storage.getItem(key, defaultValue);
  } catch (e) {
    console.log('storage.get error:', key, e);
    return defaultValue;
  }
}

/**
 * Write a value to storage.
 * Value can be any JSON-serializable type — no need to JSON.stringify manually.
 * @param {string} key - use getKey() to get this
 * @param {*} value
 */
export function set(key, value) {
  try {
    storage.setItem(key, value);
  } catch (e) {
    console.log('storage.set error:', key, e);
  }
}
