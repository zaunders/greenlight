"use client";

import { useState } from "react";
import { createRemindersForUser } from "@/lib/reminders";
import { supabase } from "@/lib/supabaseClient";

export default function TestReminderDebugPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [lightId, setLightId] = useState("");
  const [lightTitle, setLightTitle] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");

  const testReminderCreation = async () => {
    setLoading(true);
    setResult("");
    
    try {
      console.log('Testing reminder creation with:', {
        userId,
        lightId,
        lightTitle,
        eventStartTime
      });

      await createRemindersForUser(userId, lightId, lightTitle, eventStartTime);
      
      // Check if reminder was created
      const { data: reminders, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('light_id', lightId);
      
      if (error) {
        setResult(`Error fetching reminders: ${error.message}`);
      } else {
        setResult(`Reminder creation test completed. Found ${reminders?.length || 0} reminders for this user/light.`);
      }
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const checkUserPreferences = async () => {
    setLoading(true);
    setResult("");
    
    try {
      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        setResult(`Error fetching preferences: ${error.message}`);
      } else {
        setResult(`User preferences: ${JSON.stringify(preferences, null, 2)}`);
      }
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Reminder Debug Test</h1>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">User ID:</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter user ID"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Light ID:</label>
          <input
            type="text"
            value={lightId}
            onChange={(e) => setLightId(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter light ID"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Light Title:</label>
          <input
            type="text"
            value={lightTitle}
            onChange={(e) => setLightTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter light title"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Event Start Time (ISO):</label>
          <input
            type="text"
            value={eventStartTime}
            onChange={(e) => setEventStartTime(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="2024-01-01T18:00:00.000Z"
          />
        </div>
        
        <div className="space-x-4">
          <button
            onClick={checkUserPreferences}
            disabled={loading || !userId}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Check User Preferences
          </button>
          
          <button
            onClick={testReminderCreation}
            disabled={loading || !userId || !lightId || !lightTitle || !eventStartTime}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test Reminder Creation
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="text-sm overflow-auto">{result}</pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold text-yellow-800 mb-2">Debug Steps:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
          <li>Enter a user ID and click "Check User Preferences" to see if they have reminder settings</li>
          <li>If no preferences exist, the user needs to set up notification preferences first</li>
          <li>Enter light details and test reminder creation</li>
          <li>Check the reminders table at <code>/test-reminders</code> to see if reminders were created</li>
        </ol>
      </div>
    </div>
  );
} 