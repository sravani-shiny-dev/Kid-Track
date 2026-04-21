import React, { useState } from 'react';
import { useNotifications } from '../context/NotifContext';

const formatNotificationTime = (value) => {
  if (!value) {
    return 'Just now';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

function NotifBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="notif-shell">
      <button
        type="button"
        className="notif-button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Notifications"
      >
        <span role="img" aria-hidden="true">Bell</span>
        <span>Notifications</span>
        {unreadCount > 0 ? <span className="notif-badge">{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notif-drawer">
          <div className="notif-drawer-head">
            <strong>Updates</strong>
            <button type="button" className="text-button" onClick={markAllRead}>
              Mark all as read
            </button>
          </div>

          {notifications.length ? (
            <div className="notif-list">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className="notif-item"
                  onClick={() => markRead(notification.id)}
                >
                  <strong>{notification.title}</strong>
                  <span>{notification.body}</span>
                  <small>{formatNotificationTime(notification.createdAt)} | {notification.read ? 'READ' : 'UNREAD'}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="empty-copy">You&apos;re all caught up.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default NotifBell;
