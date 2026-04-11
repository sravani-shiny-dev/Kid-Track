import api from './api';

const POLL_INTERVAL = 30000; // Poll every 30 seconds

class NotificationsService {
  constructor() {
    this.subscribers = [];
    this.pollingInterval = null;
    this.lastNotificationCount = 0;
    this.cachedNotifications = [];
  }

  /**
   * Subscribe to notification updates
   * @param {Function} callback - Called with notifications array when updates occur
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.push(callback);

    // Start polling when first subscriber is added
    if (this.subscribers.length === 1) {
      this.startPolling();
    }

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
      // Stop polling when no subscribers
      if (this.subscribers.length === 0) {
        this.stopPolling();
      }
    };
  }

  /**
   * Get all notifications for current user
   */
  async getNotifications() {
    try {
      const response = await api.get('/notifications');
      this.cachedNotifications = response.data || [];
      return this.cachedNotifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return this.cachedNotifications;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId) {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      // Update cache immediately
      const notification = this.cachedNotifications.find((n) => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const response = await api.put('/notifications/read-all');
      // Update cache
      this.cachedNotifications.forEach((n) => {
        n.read = true;
      });
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Start polling for notifications
   */
  startPolling() {
    // Initial fetch to populate cache
    this.getNotifications().then((notifications) => {
      this.lastNotificationCount = notifications.length;
      this.notifySubscribers(notifications);
    });

    // Set up polling interval
    this.pollingInterval = setInterval(async () => {
      const notifications = await this.getNotifications();
      
      // Only notify if notification count or read status changed
      const hasUnread = notifications.some((n) => !n.read);
      if (notifications.length !== this.lastNotificationCount || hasUnread) {
        this.lastNotificationCount = notifications.length;
        this.notifySubscribers(notifications);
      }
    }, POLL_INTERVAL);
  }

  /**
   * Stop polling for notifications
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Notify all subscribers of notification updates
   */
  notifySubscribers(notifications) {
    this.subscribers.forEach((callback) => {
      try {
        callback(notifications);
      } catch (error) {
        console.error('Error in notification subscriber callback:', error);
      }
    });
  }

  /**
   * Get unread notification count
   */
  getUnreadCount() {
    return this.cachedNotifications.filter((n) => !n.read).length;
  }

  /**
   * Clear cached notifications
   */
  clearCache() {
    this.cachedNotifications = [];
    this.lastNotificationCount = 0;
  }
}

export const notificationsService = new NotificationsService();

export default notificationsService;
