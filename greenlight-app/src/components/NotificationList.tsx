"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, type Notification } from "@/lib/notifications";
import { useRouter } from "next/navigation";
import NotificationPreferences from "./NotificationPreferences";

interface NotificationListProps {
  userId: string;
  onClose: () => void;
  onNotificationUpdate?: () => void;
}

export default function NotificationList({ userId, onClose, onNotificationUpdate }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showReadNotifications, setShowReadNotifications] = useState(false);
  const [navigating, setNavigating] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications(userId, 20);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      setMarkingRead(notification.id);
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        onNotificationUpdate?.();
      } catch (error) {
        console.error('Error marking notification as read:', error);
      } finally {
        setMarkingRead(null);
      }
    }

    // Navigate based on notification type
    if (notification.related_id && (
      notification.type === 'light_invitation' ||
      notification.type === 'light_message_owner' ||
      notification.type === 'light_message_attending' ||
      notification.type === 'light_attending' ||
      notification.type === 'light_reminder' ||
      notification.type === 'light_cancelled'
    )) {
      setNavigating(notification.id);
      router.push(`/mylights/${notification.related_id}`);
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onNotificationUpdate?.();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    setDeleting(notificationId);
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      onNotificationUpdate?.();
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setDeleting(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'light_invitation':
        return '🎉';
      case 'light_message_owner':
        return '💬';
      case 'light_message_attending':
        return '💬';
      case 'light_attending':
        return '✅';
      case 'light_reminder':
        return '⏰';
      case 'light_cancelled':
        return '❌';
      case 'system':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (showPreferences) {
    return (
      <NotificationPreferences 
        userId={userId} 
        onClose={() => setShowPreferences(false)}
      />
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-green-600 hover:text-green-800"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => setShowReadNotifications(!showReadNotifications)}
              className="text-sm text-gray-600 hover:text-gray-800"
              title={showReadNotifications ? "Hide read notifications" : "Show read notifications"}
            >
              {showReadNotifications ? "Hide Read" : "Show Read"}
            </button>
            <button
              onClick={() => setShowPreferences(true)}
              className="text-sm text-gray-600 hover:text-gray-800"
              title="Notification settings"
            >
              ⚙️
            </button>
          </div>
        </div>
        {notifications.length === 0 && (
          <p className="text-gray-500 text-sm">No notifications</p>
        )}
        {notifications.length > 0 && !notifications.some(n => !n.read) && !showReadNotifications && (
          <p className="text-gray-500 text-sm">No unread notifications</p>
        )}
      </div>
      
      <div className="divide-y divide-gray-100">
        {notifications
          .filter(notification => showReadNotifications || !notification.read)
          .map((notification) => (
          <div
            key={notification.id}
            className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
              !notification.read ? 'bg-blue-50' : ''
            } ${notification.related_id ? 'hover:shadow-sm' : ''} ${
              navigating === notification.id ? 'opacity-50 pointer-events-none' : ''
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-lg">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      !notification.read ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {notification.related_id && (
                      <span className="text-xs text-gray-400">
                        {navigating === notification.id ? (
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                        ) : (
                          '→'
                        )}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      disabled={deleting === notification.id || navigating === notification.id}
                      className="text-gray-400 hover:text-red-500 p-1 ml-2 disabled:opacity-50"
                      title="Delete notification"
                    >
                      {deleting === notification.id ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}