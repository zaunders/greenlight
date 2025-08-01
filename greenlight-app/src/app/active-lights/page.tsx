"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { createLightAttendingNotification } from "@/lib/notifications";
import { createRemindersForUser, deleteRemindersForUser } from "@/lib/reminders";

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
  const [showDeclined, setShowDeclined] = useState(false);
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
    } catch (err: unknown) {
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
      
      // If accepted, create notification for the light owner
      if (status === 'accepted') {
        console.log('Creating attendance notification for invitation:', invitationId);
        
        // Get the invitation details to create notification
        const { data: invitationData, error: invitationError } = await supabase
          .from('light_invitations')
          .select(`
            *,
            light:lights(
              id,
              title,
              author_id
            ),
            user:users!light_invitations_user_id_fkey(
              id,
              username
            )
          `)
          .eq('id', invitationId)
          .single();
        
        console.log('Invitation data:', invitationData);
        console.log('Invitation error:', invitationError);
        
        if (invitationError) {
          console.error('Error fetching invitation data:', invitationError);
        } else if (invitationData) {
          console.log('Creating notification for light owner:', invitationData.light.author_id);
          console.log('Light details:', invitationData.light);
          console.log('User details:', invitationData.user);
          
          try {
            await createLightAttendingNotification(
              invitationData.light.author_id, // Notify the light owner
              invitationData.light_id,
              invitationData.light.title,
              invitationData.user.username
            );
            console.log('Attendance notification created successfully');
          } catch (notificationError) {
            console.error('Error creating attendance notification:', notificationError);
            console.error('Notification error details:', {
              authorId: invitationData.light.author_id,
              lightId: invitationData.light_id,
              lightTitle: invitationData.light.title,
              attendeeName: invitationData.user.username
            });
          }
        }
        
        // Handle reminders for the user who accepted/declined
        if (invitationData && currentUser) {
          if (status === 'accepted') {
            // Create reminders for the user who accepted
            try {
              await createRemindersForUser(
                currentUser.id,
                invitationData.light_id,
                invitationData.light.title,
                invitationData.light.start_time
              );
              console.log('Reminders created for user:', currentUser.id);
            } catch (reminderError) {
              console.error('Error creating reminders:', reminderError);
            }
          } else if (status === 'declined') {
            // Delete any existing reminders for the user who declined
            try {
              await deleteRemindersForUser(
                currentUser.id,
                invitationData.light_id
              );
              console.log('Reminders deleted for user:', currentUser.id);
            } catch (reminderError) {
              console.error('Error deleting reminders:', reminderError);
            }
          }
        }
      }
      
      // Refresh invitations
      if (currentUser) {
        await fetchInvitations(currentUser.id);
      }
    } catch (err: unknown) {
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
        return 'Joined';
      case 'declined':
        return 'Declined';
      default:
        return 'Pending';
    }
  };

  if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center">Loading...</div>;
  if (!currentUser) return null;

  // Filter invitations based on showDeclined state
  const filteredInvitations = invitations.filter(invitation => {
    if (showDeclined) {
      return true; // Show all invitations when showDeclined is true
    } else {
      return invitation.status !== 'declined'; // Hide declined invitations by default
    }
  });

  // Count declined invitations
  const declinedCount = invitations.filter(invitation => invitation.status === 'declined').length;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
      <h1 className="text-3xl font-bold text-green-800 mb-6">Active Lights</h1>
      
      {/* Show Declined Toggle */}
      {declinedCount > 0 && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setShowDeclined(!showDeclined)}
            className={`px-3 py-1 text-sm rounded-md font-medium transition ${
              showDeclined 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showDeclined ? 'Hide Declined' : `Show Declined (${declinedCount})`}
          </button>
        </div>
      )}
      
      <div className="w-full max-w-md space-y-4">
        {filteredInvitations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-green-900 mb-2">
              {showDeclined ? 'No invitations found' : 'No active invitations'}
            </p>
            <p className="text-sm text-green-700">
              {showDeclined 
                ? 'You have no invitations (including declined ones)' 
                : 'You\'ll see lights you\'ve been invited to here'
              }
            </p>
          </div>
        ) : (
          filteredInvitations.map((invitation) => (
            <Link
              key={invitation.id}
              href={`/mylights/${invitation.light.id}`}
              className="block bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
            >
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
                      onClick={() => updateInvitationStatus(invitation.id, 'accepted')}
                      disabled={updatingStatus === invitation.id}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg font-medium shadow hover:bg-green-700 transition disabled:opacity-50 text-sm"
                    >
                      {updatingStatus === invitation.id ? '...' : 'Join'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateInvitationStatus(invitation.id, 'declined');
                      }}
                      disabled={updatingStatus === invitation.id}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg font-medium shadow hover:bg-red-700 transition disabled:opacity-50 text-sm"
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

      {/* See History Button */}
      <div className="mt-6">
        <Link
          href="/past-lights"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-full font-semibold shadow hover:bg-gray-700 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          See History
        </Link>
      </div>
    </div>
  );
} 