import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Cookies from 'js-cookie';

export interface Notification {
  id: number;
  actor: {
    id: number;
    username: string;
  };
  notification_type: 'like_post' | 'like_comment' | 'comment' | 'follow' | 'group_invite';
  post_id: number | null;
  comment_id: number | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    const token = Cookies.get('access_token');
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/notifications/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.results || data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    const token = Cookies.get('access_token');
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/notifications/unread_count/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    const token = Cookies.get('access_token');
    if (!token) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/notifications/${notificationId}/mark_as_read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const token = Cookies.get('access_token');
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/notifications/mark_all_as_read/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    const token = Cookies.get('access_token');
    if (!user || !token) return;

    const wsUrl = `ws://localhost:8000/ws/notifications/?token=${token}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('🔔 Notification WebSocket connected');
      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('🔔 New notification:', data);
        
        if (data.type === 'notification') {
          const newNotification: Notification = data.notification;
          setNotifications(prev => [newNotification, ...prev]);
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
          
          // Show browser notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Notification', {
              body: newNotification.message,
              icon: '/favicon.ico',
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse notification:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('🔔 Notification WebSocket error:', error);
      setIsConnected(false);
    };

    websocket.onclose = () => {
      console.log('🔔 Notification WebSocket disconnected');
      setIsConnected(false);
    };

    setWs(websocket);

    // Fetch initial data
    fetchNotifications();
    fetchUnreadCount();

    return () => {
      websocket.close();
    };
  }, [user, fetchNotifications, fetchUnreadCount]);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    requestNotificationPermission,
  };
};
