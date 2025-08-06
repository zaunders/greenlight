"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { FaUserCircle } from "react-icons/fa";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import NotificationBadge from "./NotificationBadge";
import NotificationList from "./NotificationList";
import { getNotificationCount } from "@/lib/notifications";

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        fetchNotificationCount(data.user.id);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchNotificationCount(session.user.id);
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Real-time subscription to notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh notification count when notifications change
          fetchNotificationCount(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Periodic refresh as fallback (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchNotificationCount(user.id);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  // Refresh notifications when user returns to tab
  useEffect(() => {
    if (!user) return;

    const handleFocus = () => {
      fetchNotificationCount(user.id);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const fetchNotificationCount = async (userId: string) => {
    try {
      const count = await getNotificationCount(userId);
      setNotificationCount(count.unread);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowNotifications(false);
    // Redirect to landing page
    window.location.href = '/';
  };

  const handleNotificationUpdate = () => {
    if (user) {
      fetchNotificationCount(user.id);
    }
  };

  const handleAvatarClick = () => {
    setShowNotifications(!showNotifications);
  };

  if (!user) return null;

  // Use user.user_metadata for name and avatar_url if available
  const name = user.user_metadata?.name || user.email;
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="fixed right-6 z-50" style={{top: 'max(calc(env(safe-area-inset-top) + 16px), 56px)'}} ref={menuRef}>
      <button
        onClick={handleAvatarClick}
        className="text-green-700 text-3xl focus:outline-none relative"
        aria-label="User menu"
      >
        {avatarUrl ? (
          <div className="relative">
            <Image src={avatarUrl} alt="Profile" width={32} height={32} className="rounded-full object-cover" />
            <NotificationBadge count={notificationCount} size="md" />
          </div>
        ) : (
          <div className="relative">
            <FaUserCircle />
            <NotificationBadge count={notificationCount} size="md" />
          </div>
        )}
      </button>
      {showNotifications && user && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border">
          <NotificationList 
            userId={user.id} 
            onClose={() => setShowNotifications(false)}
            onNotificationUpdate={handleNotificationUpdate}
          />
          <div className="p-4 border-t border-gray-200 space-y-3">
            {/* User Info */}
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Profile" width={32} height={32} className="rounded-full object-cover" />
              ) : (
                <FaUserCircle className="w-8 h-8 text-green-400" />
              )}
              <div className="flex-1">
                <div className="font-semibold text-green-900 text-sm truncate">{name}</div>
                <div className="text-green-700 text-xs truncate">{user.email}</div>
              </div>
            </div>
            
            <Link
              href="/profile/edit"
              className="block w-full px-4 py-2 bg-green-100 text-green-800 rounded font-semibold hover:bg-green-200 transition text-center"
              onClick={() => setShowNotifications(false)}
            >
              Edit Profile
            </Link>
            <button
              onClick={() => {
                handleLogout();
                setShowNotifications(false);
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition text-center"
            >
              Log out
            </button>
          </div>
        </div>
      )}
      

    </div>
  );
} 