"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

interface Light {
  id: string;
  title: string;
  description: string | null;
  author_id: string;
  published: boolean;
  location: string;
  max_limit: number | null;
  image_url: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface LightInvitation {
  id: string;
  light_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  light: Light;
}

export default function PastLightsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [invitations, setInvitations] = useState<LightInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
      if (!data.user) {
        router.replace("/");
      } else {
        fetchPastInvitations(data.user.id);
      }
    });
  }, []);

  const fetchPastInvitations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('light_invitations')
        .select(`
          *,
          light:lights(
            *,
            author:users!lights_author_id_fkey(id, username, avatar_url)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter to only show lights that have ended (end_time is in the past)
      const now = new Date();
      const pastInvitations = data?.filter(invitation => {
        const endTime = new Date(invitation.light.end_time);
        return endTime < now;
      }) || [];
      
      setInvitations(pastInvitations);
    } catch (err: any) {
      console.error('Error fetching past invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'text-green-600 bg-green-100';
      case 'declined':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Joined';
      case 'declined':
        return 'Declined';
      default:
        return 'Pending';
    }
  };

  if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center">Loading...</div>;
  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
      <h1 className="text-3xl font-bold text-green-800 mb-6">Past Lights</h1>
      
      <div className="w-full max-w-md space-y-4">
        {invitations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-green-900 mb-2">No past events</p>
            <p className="text-sm text-green-700">You haven't been invited to any events that have ended yet</p>
          </div>
        ) : (
          invitations.map((invitation) => (
            <div key={invitation.id} className="bg-white rounded-lg shadow overflow-hidden opacity-75">
              {/* Image */}
              <div className="w-full h-32 bg-green-200">
                <img 
                  src={invitation.light.image_url || '/greenlight.png'} 
                  alt={invitation.light.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 text-lg">{invitation.light.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center">
                        {invitation.light.author.avatar_url ? (
                          <img src={invitation.light.author.avatar_url} alt={invitation.light.author.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-green-600 text-xs">{invitation.light.author.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="text-sm text-green-700">by {invitation.light.author.username}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                    {getStatusText(invitation.status)}
                  </span>
                </div>
                
                {invitation.light.description && (
                  <p className="text-green-800 text-sm mb-3">{invitation.light.description}</p>
                )}
                
                <div className="space-y-2 text-sm text-green-700 mb-4">
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>{invitation.light.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🕒</span>
                    <span>Started: {formatDate(invitation.light.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>⏰</span>
                    <span>Ended: {formatDate(invitation.light.end_time)}</span>
                  </div>
                  {invitation.light.max_limit && (
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      <span>Max {invitation.light.max_limit} people</span>
                    </div>
                  )}
                </div>
                
                {/* View Details Link */}
                <Link
                  href={`/mylights/${invitation.light.id}`}
                  className="block text-center text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Back to Active Lights Button */}
      <div className="mt-6">
        <Link
          href="/active-lights"
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full font-semibold shadow hover:bg-green-700 transition"
        >
          ← Back to Active Lights
        </Link>
      </div>
    </div>
  );
} 