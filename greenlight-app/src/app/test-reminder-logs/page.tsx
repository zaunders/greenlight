"use client";

import { useState, useEffect } from "react";

interface ReminderLog {
  id: string;
  user_id: string;
  light_id: string;
  notification_id: string;
  reminder_type: string;
  light_title: string;
  user_email: string | null;
  user_username: string | null;
  advance_hours: number;
  event_start_time: string;
  sent_at: string;
  recipient_email: string | null;
}

export default function TestReminderLogsPage() {
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/reminder-logs?limit=50');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch logs');
      }
      
      setLogs(data.logs || []);
    } catch (err: any) {
      console.error('Error fetching reminder logs:', err);
      setError(err.message || 'Error fetching logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-green-900">Loading reminder logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-green-900">Reminder Logs (Test View)</h1>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center text-green-700 py-8">
              <p className="mb-2">No reminder logs found</p>
              <p className="text-sm text-gray-600">
                This means either:
              </p>
              <ul className="text-sm text-gray-600 mt-2">
                <li>• No reminders have been sent yet</li>
                <li>• The cron job hasn't run</li>
                <li>• No events are starting soon</li>
              </ul>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Sent At</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Event</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Event Start</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Recipient</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Advance Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-700">
                        {formatDate(log.sent_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.reminder_type === '1h' ? 'bg-blue-100 text-blue-800' :
                          log.reminder_type === '2h' ? 'bg-green-100 text-green-800' :
                          log.reminder_type === '6h' ? 'bg-yellow-100 text-yellow-800' :
                          log.reminder_type === '12h' ? 'bg-orange-100 text-orange-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {log.reminder_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {log.light_title}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {formatEventDate(log.event_start_time)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {log.recipient_email || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {log.advance_hours}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-600">
            <p>Showing {logs.length} most recent reminder logs</p>
            <p>Logs are automatically created when reminder notifications are sent by the cron job</p>
            <p className="mt-2">
              <strong>How to test:</strong>
            </p>
            <ul className="mt-1 space-y-1">
              <li>• Create an event that starts in 1-24 hours</li>
              <li>• Accept the invitation</li>
              <li>• Wait for the cron job to run (or trigger it manually)</li>
              <li>• Check this page to see the reminder logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 