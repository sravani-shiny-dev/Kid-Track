import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import notificationsService from '../services/notifications';

const NotifContext = createContext();

export function NotifProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let ignore = false;

    const loadNotifications = async () => {
      if (!user) {
        setNotifications([]);
        return;
      }

      try {
        const data = await notificationsService.getNotifications();
        if (!ignore) {
          setNotifications(data);
        }
      } catch (error) {
        if (!ignore) {
          setNotifications([]);
        }
      }
    };

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, [user]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markRead = async (id) => {
    setNotifications((current) => current.map((notification) => (
      notification.id === id ? { ...notification, read: true } : notification
    )));

    try {
      await notificationsService.markAsRead(id);
    } catch (error) {
      // Keep the optimistic state to avoid a jumpy drawer.
    }
  };

  const markAllRead = async () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));

    try {
      await notificationsService.markAllAsRead();
    } catch (error) {
      // Keep the optimistic state to avoid a jumpy drawer.
    }
  };

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    markRead,
    markAllRead
  }), [notifications, unreadCount]);

  return <NotifContext.Provider value={value}>{children}</NotifContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotifContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotifProvider');
  }

  return context;
}

export default NotifContext;
