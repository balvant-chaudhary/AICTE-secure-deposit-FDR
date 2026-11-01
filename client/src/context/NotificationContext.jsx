import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/notifications');
      setNotifications(res.data.data?.notifications || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch notifications';
      setError(msg);
      console.warn('[Notifications Error]:', msg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 45000); // 45s poll
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setError(null);
    }
  }, [isAuthenticated, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      await api.patch(`/notifications/${id}/read`);
      // Refresh to ensure server sync
      fetchNotifications();
    } catch (err) {
      console.error('[Mark As Read Error]:', err);
      // Re-fetch to restore accurate state
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await api.patch('/notifications/read-all');
      // Refresh to ensure server sync
      fetchNotifications();
    } catch (err) {
      console.error('[Mark All As Read Error]:', err);
      fetchNotifications();
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        refreshNotifications: fetchNotifications,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
