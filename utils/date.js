/**
 * Date Utility
 *
 * Shared date helpers for session completion and stats page.
 * Uses @zos/sensor Time class only — do NOT use new Date() as ZeppOS QuickJS
 * may not include the Date constructor.
 *
 * All functions return 'YYYY-MM-DD' zero-padded strings for reliable === comparison.
 */

import { Time } from '@zos/sensor';

// Index 0 is unused sentinel; months are 1-based (Jan=1 … Dec=12)
const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * Returns today as 'YYYY-MM-DD'.
 * Note: Time.getMonth() is 0-indexed (0=Jan), so +1 converts to 1-based.
 */
export function getDateString() {
  const t = new Time();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${t.getFullYear()}-${m}-${d}`;
}

/**
 * Returns yesterday as 'YYYY-MM-DD'.
 */
export function getYesterdayString() {
  return getDateNDaysAgo(1);
}

/**
 * Returns the date n days ago as 'YYYY-MM-DD'.
 * n=0 returns today. Safe for n up to at least 35.
 * Uses manual day arithmetic to handle month/year rollover.
 */
export function getDateNDaysAgo(n) {
  const t = new Time();
  let y = t.getFullYear();
  let mo = t.getMonth() + 1; // 1-12
  let d = t.getDate();
  for (let i = 0; i < n; i++) {
    d -= 1;
    if (d < 1) {
      mo -= 1;
      if (mo < 1) {
        mo = 12;
        y -= 1;
      }
      d = mo === 2 && isLeapYear(y) ? 29 : DAYS_IN_MONTH[mo];
    }
  }
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Returns today's day-of-week as a Monday-first 0-based index.
 * 0=Monday, 1=Tuesday, …, 6=Sunday.
 *
 * Time.getDay() follows JS convention (0=Sunday…6=Saturday),
 * so we apply (getDay() + 6) % 7 to shift to Mon-first.
 */
export function getTodayDOW() {
  return (new Time().getDay() + 6) % 7;
}
