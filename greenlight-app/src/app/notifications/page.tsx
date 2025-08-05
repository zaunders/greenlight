"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, type Notification } from "@/lib/notifications";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import NotificationPreferences from "@/components/NotificationPreferences";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [navigating, setNavigating] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
      if (!data.user) {
        router.replace("/");
      }
    });
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications(currentUser!.id, 100); // Get more notifications for the full page
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
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    
    try {
      await markAllNotificationsAsRead(currentUser.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    setDeleting(notificationId);
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!currentUser) return;
    
    try {
      // Delete all notifications for the user
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
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

  const filteredNotifications = showUnreadOnly 
    ? notifications.filter(n => !n.read)
    : notifications;

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  if (showPreferences) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
        <div className="w-full max-w-md bg-white rounded-lg shadow overflow-hidden">
          <NotificationPreferences 
            userId={currentUser.id} 
            onClose={() => setShowPreferences(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-md bg-white rounded-lg shadow overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-green-200">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="text-green-600 hover:text-green-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-green-900">Notifications</h1>
            <button
              onClick={() => setShowPreferences(true)}
              className="text-gray-600 hover:text-gray-800"
              title="Notification settings"
            >
              ⚙️
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  showUnreadOnly 
                    ? 'bg-green-600 text-white' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {showUnreadOnly ? 'Show All' : 'Show Unread'}
              </button>
              {notifications.some(n => !n.read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition"
                >
                  Mark All Read
                </button>
              )}
            </div>
            <button
              onClick={handleClearAllNotifications}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">
                {showUnreadOnly ? 'No unread notifications' : 'No notifications'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
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
          )}
        </div>
      </div>
    </div>
  );
} 