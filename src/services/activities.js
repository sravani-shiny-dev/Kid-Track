import api from './api';

/**
 * Activities Service
 * activity CRUD operations
 * TODO: Implement activities service methods
 */

const activitiesService = {
  /**
   * Get weekly activity schedule for a child
   * @param {string} childId
   * @returns {Promise}
   */
  getActivities: (childId) => {
    // TODO: Implement
  },

  /**
   * Add activity slot
   * @param {string} childId
   * @param {Object} activityData
   * @returns {Promise}
   */
  addActivity: (childId, activityData) => {
    // TODO: Implement
  },

  /**
   * Update activity
   * @param {string} activityId
   * @param {Object} activityData
   * @returns {Promise}
   */
  updateActivity: (activityId, activityData) => {
    // TODO: Implement
  },

  /**
   * Delete activity
   * @param {string} activityId
   * @returns {Promise}
   */
  deleteActivity: (activityId) => {
    // TODO: Implement
  },
};

export default activitiesService;
