import api from './api';

/**
 * Screen Time Service
 * screen log calls
 * TODO: Implement screen time service methods
 */

const screenTimeService = {
  /**
   * Log today's screen time
   * @param {string} childId
   * @param {Object} logData - { minutesUsed, date }
   * @returns {Promise}
   */
  logScreenTime: (childId, logData) => {
    // TODO: Implement
  },

  /**
   * Get weekly screen log
   * @param {string} childId
   * @returns {Promise}
   */
  getScreenLog: (childId) => {
    // TODO: Implement
  },

  /**
   * Set daily screen time limit
   * @param {string} childId
   * @param {number} limitMinutes
   * @returns {Promise}
   */
  setDailyLimit: (childId, limitMinutes) => {
    // TODO: Implement
  },
};

export default screenTimeService;
