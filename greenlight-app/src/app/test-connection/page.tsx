"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestConnectionPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult("");
    
    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('lights')
        .select('id')
        .limit(1);
      
      if (error) {
        setResult(`Error: ${error.message}\nCode: ${error.code}`);
      } else {
        setResult(`Success! Found ${data?.length || 0} lights`);
      }
    } catch (error) {
      setResult(`Exception: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testNotifications = async () => {
    setLoading(true);
    setResult("");
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);
      
      if (error) {
        setResult(`Notifications Error: ${error.message}\nCode: ${error.code}`);
      } else {
        setResult(`Notifications Success! Found ${data?.length || 0} notifications`);
      }
    } catch (error) {
      setResult(`Notifications Exception: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <div className="space-x-4 mb-6">
        <button
          onClick={testConnection}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Basic Connection
        </button>
        
        <button
          onClick={testNotifications}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Notifications Table
        </button>
      </div>

      {result && (
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="text-sm overflow-auto">{result}</pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold text-yellow-800 mb-2">Troubleshooting:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
          <li>If you get CORS errors, try clearing browser cache</li>
          <li>Try in an incognito/private window</li>
          <li>Check if your internet connection is stable</li>
          <li>Verify Supabase project is active</li>
        </ul>
      </div>
    </div>
  );
} 