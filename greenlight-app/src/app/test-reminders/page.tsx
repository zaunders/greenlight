"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Reminder {
  id: string;
  user_id: string;
  light_id: string;
  light_title: string;
  event_start_time: string;
  reminder_time: string;
  advance_hours: number;
  sent: boolean;
  created_at: string;
}

export default function TestRemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('reminder_time', { ascending: true });

      if (error) {
        console.error('Error fetching reminders:', error);
        return;
      }

      setReminders(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="p-4">Loading reminders...</div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Reminders Table</h1>
      
      <div className="mb-4">
        <button
          onClick={fetchReminders}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">ID</th>
              <th className="border px-4 py-2">User ID</th>
              <th className="border px-4 py-2">Light Title</th>
              <th className="border px-4 py-2">Event Start</th>
              <th className="border px-4 py-2">Reminder Time</th>
              <th className="border px-4 py-2">Advance Hours</th>
              <th className="border px-4 py-2">Sent</th>
              <th className="border px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {reminders.map((reminder) => (
              <tr key={reminder.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2 text-sm">{reminder.id.slice(0, 8)}...</td>
                <td className="border px-4 py-2 text-sm">{reminder.user_id.slice(0, 8)}...</td>
                <td className="border px-4 py-2">{reminder.light_title}</td>
                <td className="border px-4 py-2 text-sm">{formatDate(reminder.event_start_time)}</td>
                <td className="border px-4 py-2 text-sm">{formatDate(reminder.reminder_time)}</td>
                <td className="border px-4 py-2 text-center">{reminder.advance_hours}h</td>
                <td className="border px-4 py-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    reminder.sent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {reminder.sent ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="border px-4 py-2 text-sm">{formatDate(reminder.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reminders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No reminders found
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        Total reminders: {reminders.length}
      </div>
    </div>
  );
} 