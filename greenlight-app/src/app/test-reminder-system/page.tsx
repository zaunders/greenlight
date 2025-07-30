"use client";

import { useState } from "react";

export default function TestReminderSystemPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testReminderProcessing = async () => {
    setLoading(true);
    setResult("");
    
    try {
      const response = await fetch('/api/cron/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testReminderCreation = async () => {
    setLoading(true);
    setResult("");
    
    try {
      // This would normally be done when creating/accepting events
      // For testing, we'll simulate creating a reminder
      const response = await fetch('/api/test/create-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'test-user-id',
          lightId: 'test-light-id',
          lightTitle: 'Test Event',
          eventStartTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          advanceHours: 1
        }),
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Reminder System Test</h1>
      
      <div className="space-y-4 mb-6">
        <div>
          <button
            onClick={testReminderProcessing}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Test Reminder Processing'}
          </button>
          <p className="text-sm text-gray-600 mt-1">
            This will process any due reminders and create notifications
          </p>
        </div>
        
        <div>
          <button
            onClick={testReminderCreation}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Test Reminder Creation'}
          </button>
          <p className="text-sm text-gray-600 mt-1">
            This will create a test reminder (requires manual setup)
          </p>
        </div>
      </div>

      {result && (
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="text-sm overflow-auto">{result}</pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold text-yellow-800 mb-2">How to Test:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
          <li>Create an event with a start time in the future</li>
          <li>Accept an invitation to that event</li>
          <li>Check the reminders table at <code>/test-reminders</code></li>
          <li>Wait for the reminder time or manually trigger processing</li>
          <li>Check that notifications appear in the notification list</li>
        </ol>
      </div>
    </div>
  );
} 