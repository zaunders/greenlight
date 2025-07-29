"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getNotificationPreferences, updateNotificationPreferences, type NotificationPreferences } from "@/lib/notifications";

interface NotificationPreferencesProps {
  userId: string;
  onClose: () => void;
}

export default function NotificationPreferences({ userId, onClose }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  const fetchPreferences = async () => {
    try {
      console.log('Fetching preferences for user:', userId);
      const data = await getNotificationPreferences(userId);
      console.log('Fetched preferences:', data);
      
      if (data) {
        setPreferences(data);
      } else {
        // No preferences exist, create default ones
        console.log('No preferences found, creating defaults...');
        try {
          const defaultPreferences = await updateNotificationPreferences(userId, {
            light_invitation: true,
            light_message_owner: true,
            light_message_attending: true,
            light_attending: true,
            light_reminder: true,
            light_reminder_advance_hours: 1,
            light_cancelled: true,
            system: true
          });
          setPreferences(defaultPreferences);
        } catch (createError) {
          console.error('Error creating default preferences:', createError);
        }
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const updatedPreferences = await updateNotificationPreferences(userId, {
        [key]: value
      });
      setPreferences(updatedPreferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReminderHoursChange = async (hours: number) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const updatedPreferences = await updateNotificationPreferences(userId, {
        light_reminder_advance_hours: hours
      });
      setPreferences(updatedPreferences);
    } catch (error) {
      console.error('Error updating reminder hours:', error);
    } finally {
      setSaving(false);
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

  if (!preferences) {
    return (
      <div className="p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Error loading preferences</p>
          <button
            onClick={fetchPreferences}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Notification Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Light Invitations */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Light Invitations</p>
            <p className="text-sm text-gray-600">When someone invites you to a light</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.light_invitation}
              onChange={(e) => handleToggle('light_invitation', e.target.checked)}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {/* Messages on Your Lights */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Messages on Your Lights</p>
            <p className="text-sm text-gray-600">When someone messages a light you created</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.light_message_owner}
              onChange={(e) => handleToggle('light_message_owner', e.target.checked)}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {/* Messages on Lights You're Attending */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Messages on Lights You're Attending</p>
            <p className="text-sm text-gray-600">When someone messages a light you're going to</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.light_message_attending}
              onChange={(e) => handleToggle('light_message_attending', e.target.checked)}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {/* Someone Attending Your Light */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Someone Attending Your Light</p>
            <p className="text-sm text-gray-600">When someone joins your light invitation</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.light_attending}
              onChange={(e) => handleToggle('light_attending', e.target.checked)}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {/* Light Reminders */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Light Reminders</p>
              <p className="text-sm text-gray-600">Remind you before lights start</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.light_reminder}
                onChange={(e) => handleToggle('light_reminder', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
          {preferences.light_reminder && (
            <div className="ml-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remind me
              </label>
              <select
                value={preferences.light_reminder_advance_hours}
                onChange={(e) => handleReminderHoursChange(parseInt(e.target.value))}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value={1}>1 hour before</option>
                <option value={2}>2 hours before</option>
                <option value={6}>6 hours before</option>
                <option value={12}>12 hours before</option>
                <option value={24}>1 day before</option>
              </select>
            </div>
          )}
        </div>

        {/* Light Cancellations */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Light Cancellations</p>
            <p className="text-sm text-gray-600">When a light you're attending is cancelled</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.light_cancelled}
              onChange={(e) => handleToggle('light_cancelled', e.target.checked)}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {/* System Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">System Notifications</p>
            <p className="text-sm text-gray-600">Important updates about the app</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.system}
              onChange={(e) => handleToggle('system', e.target.checked)}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
} 