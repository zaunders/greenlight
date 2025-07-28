"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
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

export default function ActiveLightsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [invitations, setInvitations] = useState<LightInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
      if (!data.user) {
        router.replace("/");
      } else {
        fetchInvitations(data.user.id);
      }
    });
  }, []);

  const fetchInvitations = async (userId: string) => {
    try {
      // Fetch invitations
      const { data: invitationsData, error: invitationsError } = await supabase
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
      
      if (invitationsError) throw invitationsError;
      
      // Fetch user's own lights
      const { data: ownLightsData, error: ownLightsError } = await supabase
        .from('lights')
        .select(`
          *,
          author:users!lights_author_id_fkey(id, username, avatar_url)
        `)
        .eq('author_id', userId)
        .order('created_at', { ascending: false });
      
      if (ownLightsError) throw ownLightsError;
      
      // Combine and format data
      const invitations = invitationsData || [];
      const ownLights = ownLightsData || [];
      
      // Convert own lights to invitation format for consistency
      const ownLightsAsInvitations = ownLights.map(light => ({
        id: `own-${light.id}`,
        light_id: light.id,
        user_id: userId,
        status: 'accepted' as const, // Own lights are considered "accepted"
        created_at: light.created_at,
        light: light
      }));
      
      // Combine all lights and filter out past events
      const now = new Date();
      const allLights = [...invitations, ...ownLightsAsInvitations];
      const currentLights = allLights.filter(invitation => {
        const endTime = new Date(invitation.light.end_time);
        return endTime >= now;
      });
      
      // Sort by end time (latest first)
      currentLights.sort((a, b) => {
        const endTimeA = new Date(a.light.end_time);
        const endTimeB = new Date(b.light.end_time);
        return endTimeB.getTime() - endTimeA.getTime();
      });
      
      setInvitations(currentLights);
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateInvitationStatus = async (invitationId: string, status: 'accepted' | 'declined') => {
    setUpdatingStatus(invitationId);
    try {
      const { error } = await supabase
        .from('light_invitations')
        .update({ status })
        .eq('id', invitationId);
      
      if (error) throw error;
      
      // Refresh invitations
      if (currentUser) {
        await fetchInvitations(currentUser.id);
      }
    } catch (err: any) {
      console.error('Error updating invitation status:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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
        return 'Accepted';
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
      <h1 className="text-3xl font-bold text-green-800 mb-6">Active Lights</h1>
      
      <div className="w-full max-w-md space-y-4">
        {invitations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-green-900 mb-2">No invitations yet</p>
            <p className="text-sm text-green-700">You'll see lights you've been invited to here</p>
          </div>
        ) : (
          invitations.map((invitation) => (
            <Link
              key={invitation.id}
              href={`/mylights/${invitation.light.id}`}
              className="block bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              {invitation.light.image_url && (
                <div className="w-full h-32 bg-green-200">
                  <img 
                    src={invitation.light.image_url} 
                    alt={invitation.light.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
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
                    <span>{formatDate(invitation.light.start_time)}</span>
                  </div>
                  {invitation.light.max_limit && (
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      <span>Max {invitation.light.max_limit} people</span>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons - Prevent click propagation */}
                {invitation.status === 'pending' && (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateInvitationStatus(invitation.id, 'accepted');
                      }}
                      disabled={updatingStatus === invitation.id}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {updatingStatus === invitation.id ? '...' : 'Accept'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateInvitationStatus(invitation.id, 'declined');
                      }}
                      disabled={updatingStatus === invitation.id}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
                    >
                      {updatingStatus === invitation.id ? '...' : 'Decline'}
                    </button>
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Show Past Lights Button */}
      <div className="mt-6">
        <Link
          href="/past-lights"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-full font-semibold shadow hover:bg-gray-700 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Show Past Lights
        </Link>
      </div>
    </div>
  );
} 