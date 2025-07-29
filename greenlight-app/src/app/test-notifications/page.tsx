"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createNotification, getNotificationCount } from "@/lib/notifications";

export default function TestNotificationsPage() {
  const [userId, setUserId] = useState("");
  const [result, setResult] = useState("");
  const [count, setCount] = useState<number | null>(null);

  const testCreateNotification = async () => {
    if (!userId) {
      setResult("Please enter a user ID");
      return;
    }

    try {
      const notification = await createNotification({
        user_id: userId,
        title: "Test Notification",
        message: "This is a test notification",
        type: "system",
        read: false,
        data: { test: true }
      });

      setResult(`Notification created successfully: ${JSON.stringify(notification, null, 2)}`);
    } catch (error) {
      setResult(`Error creating notification: ${error}`);
    }
  };

  const testGetCount = async () => {
    if (!userId) {
      setResult("Please enter a user ID");
      return;
    }

    try {
      const countData = await getNotificationCount(userId);
      setCount(countData.unread);
      setResult(`Notification count: ${JSON.stringify(countData, null, 2)}`);
    } catch (error) {
      setResult(`Error getting count: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-green-900 mb-6">Test Notifications</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-green-700 mb-2">
              User ID:
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter user ID"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={testCreateNotification}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Create Test Notification
            </button>
            <button
              onClick={testGetCount}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Get Count
            </button>
          </div>

          {count !== null && (
            <div className="p-3 bg-blue-100 rounded-lg">
              <p className="text-blue-800">Unread count: {count}</p>
            </div>
          )}

          {result && (
            <div className="p-3 bg-gray-100 rounded-lg">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 