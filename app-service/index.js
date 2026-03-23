/**
 * Background Service Scaffold
 *
 * IMPORTANT — ZeppOS app-services are SINGLE-SHOT:
 *   onInit() runs once, then the service exits automatically.
 *
 * For recurring behavior (e.g. nudge every 5 min), use the alarm-chain pattern:
 *   1. Schedule an alarm pointing to this service file
 *   2. In onInit(), do your work
 *   3. Before exiting, schedule the next alarm
 *   This chains indefinitely until you cancel the alarm.
 *
 * Do NOT use setInterval for recurring behavior — it is unreliable in services.
 *
 * NOTE: Cannot import from utils/ — services run in a separate bundle context.
 *       Import @zos/* APIs directly here.
 *
 * Imports confirmed against ZeppOS 3.6 API:
 *   - exit()      from '@zos/app-service'  — early termination
 *   - setAlarm    from '@zos/alarm'         — schedule next run (url + delay fields)
 *   - LocalStorage from '@zos/storage'     — must use new LocalStorage()
 */

import { log as Logger } from '@zos/utils';
import { LocalStorage } from '@zos/storage';
import { exit } from '@zos/app-service';
// import { set as setAlarm } from '@zos/alarm'; // uncomment for alarm-chain pattern

const logger = Logger.getLogger('app-service');
const storage = new LocalStorage();

AppService({
  onInit(params) {
    logger.log('Service started', params || '');

    // Check if this service should run — replace with your condition
    if (!shouldRun()) {
      logger.log('Condition not met, exiting');
      exit();
      return;
    }

    // TODO: Do your work here
    // e.g. check sensor data, send a notification, update state

    // Alarm-chain: schedule the next run (uncomment and configure)
    // const nextId = setAlarm({ url: 'app-service/index', delay: 300 }); // 300s = 5min
    // storage.setItem('app_service_alarm_id', nextId); // save so the page can cancel it
    // logger.log('Next run scheduled, alarm id:', nextId);
  },

  onDestroy() {
    logger.log('Service stopping');
  },
});

/**
 * Determine if the service should do work this run.
 * Replace with your logic — e.g. check if a session is active.
 * @returns {boolean}
 */
function shouldRun() {
  try {
    return storage.getItem('service_enabled', false) === true;
  } catch {
    return false;
  }
}
