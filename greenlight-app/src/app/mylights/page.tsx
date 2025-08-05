 "use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

interface Light {
  id: string;
  title: string;
  description: string | null;
  location: string;
  start_time: string;
  end_time: string;
  image_url: string | null;
  max_limit: number | null;
  published: boolean;
  created_at: string;
}

export default function MyLightsPage() {
  const [lights, setLights] = useState<Light[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (!data.user) {
        router.replace("/");
      } else {
        fetchLights(data.user.id);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        router.replace("/");
      } else {
        fetchLights(session.user.id);
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router]);

  const fetchLights = async (userId: string) => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('lights')
        .select('*')
        .eq('author_id', userId)
        .order('end_time', { ascending: false });
      
      if (error) throw error;
      setLights(data || []);
    } catch (err: any) {
      console.error('Error fetching lights:', err);
    }
    setFetching(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPastEvent = (endTime: string) => {
    const now = new Date();
    const endDate = new Date(endTime);
    return endDate < now;
  };

  const duplicateLight = (light: Light) => {
    // Create URL with pre-filled data
    const params = new URLSearchParams({
      title: light.title,
      description: light.description || '',
      location: light.location,
      maxLimit: light.max_limit?.toString() || '',
      imageUrl: light.image_url || ''
    });
    
    router.push(`/mylights/create?${params.toString()}`);
  };

  if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
      <h1 className="text-3xl font-bold text-green-800 mb-6">My Lights</h1>
      <div className="w-full max-w-md bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
        {fetching ? (
          <div className="text-center text-green-900">Loading lights...</div>
        ) : lights.length === 0 ? (
          <div className="text-center text-green-900">No lights yet. Create your first event!</div>
        ) : (
          <div className="space-y-4">
            {lights.map((light) => {
              const isPast = isPastEvent(light.end_time);
              return (
                <div key={light.id} className="relative group">
                  <Link href={`/mylights/${light.id}`} className="block">
                    <div className={`border rounded-lg p-4 transition cursor-pointer ${
                      isPast 
                        ? 'bg-gray-50 hover:bg-gray-100' 
                        : 'bg-green-50 hover:bg-green-100'
                    }`}>
                      <div className="flex gap-3">
                        <div className="w-16 h-16 flex-shrink-0">
                          <img 
                            src={light.image_url || '/greenlight.png'} 
                            alt={light.title}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold mb-1 truncate ${
                            isPast ? 'text-gray-900' : 'text-green-900'
                          }`}>{light.title}</h3>
                          <div className={`text-xs space-y-1 ${
                            isPast ? 'text-gray-600' : 'text-green-600'
                          }`}>
                            <div className="truncate">📍 {light.location}</div>
                            <div>📅 {formatDate(light.start_time)} - {formatDate(light.end_time)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  
                  {/* Duplicate Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      duplicateLight(light);
                    }}
                    className={`absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition ${
                      isPast ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title="Duplicate Light"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Link
        href="/mylights/create"
        className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold shadow hover:bg-green-700 transition"
      >
        + Create Light
      </Link>
      
      <div className="mb-24"></div>
    </div>
  );
} 