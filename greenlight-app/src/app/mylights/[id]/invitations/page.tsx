"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import { createLightInvitationNotification, createLightAttendingNotification } from "@/lib/notifications";
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

interface Attendee {
  id: string;
  user_id: string;
  light_id: string;
  status: 'accepted' | 'declined' | 'pending';
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export default function ManageInvitationsPage() {
  const [light, setLight] = useState<Light | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const router = useRouter();
  const params = useParams();
  const lightId = params.id as string;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
      if (!data.user) {
        router.replace("/");
      } else {
        fetchLight();
        fetchAttendees();
        fetchInviteData(data.user.id);
      }
    });
  }, [lightId]);

  const fetchLight = async () => {
    try {
      const { data, error } = await supabase
        .from('lights')
        .select(`
          *,
          author:users!lights_author_id_fkey(id, username, avatar_url)
        `)
        .eq('id', lightId)
        .single();
      
      if (error) throw error;
      setLight(data);
    } catch (err: any) {
      console.error('Error fetching light:', err);
      router.replace("/mylights");
    }
  };

  const fetchAttendees = async () => {
    try {
      const { data, error } = await supabase
        .from('light_invitations')
        .select(`
          *,
          user:users!light_invitations_user_id_fkey(id, username, avatar_url)
        `)
        .eq('light_id', lightId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAttendees(data || []);
    } catch (err: any) {
      console.error('Error fetching attendees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInviteData = async (userId: string) => {
    try {
      // Fetch friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
          *,
          friend:users!friends_friend_id_fkey(id, username, avatar_url)
        `)
        .eq('user_id', userId);
      
      if (friendsError) throw friendsError;

      // Get existing invitations for this light to filter out already invited friends
      const { data: existingInvitations, error: invitationsError } = await supabase
        .from('light_invitations')
        .select('user_id')
        .eq('light_id', lightId);
      
      if (invitationsError) throw invitationsError;
      
      const invitedUserIds = new Set(existingInvitations?.map(inv => inv.user_id) || []);
      
      // Filter out friends who have already been invited
      const availableFriends = friendsData?.filter(friend => !invitedUserIds.has(friend.friend.id)) || [];
      
      setFriends(availableFriends);
    } catch (err: any) {
      console.error('Error fetching invite data:', err);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const selectAllFriends = () => {
    const allFriendIds = friends.map(friend => friend.friend.id);
    const allSelected = allFriendIds.every(id => selectedFriends.includes(id));
    
    if (allSelected) {
      // Deselect all friends
      setSelectedFriends([]);
    } else {
      // Select all friends
      setSelectedFriends(allFriendIds);
    }
  };

  const saveInvitations = async () => {
    if (!currentUser || !light) return;
    
    setSaving(true);
    try {
      // Get all users to invite (only selected friends)
      const usersToInvite = [...selectedFriends];

      // Remove duplicates
      const uniqueUserIds = [...new Set(usersToInvite)];

      // Get all existing invitations for this light
      const { data: existingInvitations, error: checkError } = await supabase
        .from('light_invitations')
        .select('user_id, status')
        .eq('light_id', lightId);
      
      if (checkError) throw checkError;
      
      const existingUserIds = existingInvitations?.map(inv => inv.user_id) || [];
      
      // Find users who need new invitations (not already invited)
      const newUserIds = uniqueUserIds.filter(userId => !existingUserIds.includes(userId));
      
      // Create invitations only for new users
      if (newUserIds.length > 0) {
        const invitations = newUserIds.map(userId => ({
          light_id: lightId,
          user_id: userId,
          status: 'pending'
        }));

        const { error: inviteError } = await supabase
          .from('light_invitations')
          .insert(invitations);
        
        if (inviteError) throw inviteError;

        // Create notifications for each invitation
        for (const userId of newUserIds) {
          try {
            console.log('Creating invitation notification for user:', userId);
            await createLightInvitationNotification(
              userId,
              lightId,
              light.title,
              currentUser.user_metadata?.name || currentUser.email || 'Someone'
            );
            console.log('Successfully created notification for user:', userId);
          } catch (error) {
            console.error('Error creating notification for user:', userId, error);
          }
        }
      }

      // Refresh attendees and clear selections
      await fetchAttendees();
      setSelectedFriends([]);
    } catch (err: any) {
      console.error('Error saving invitations:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateInvitationStatus = async (invitationId: string, status: 'accepted' | 'declined') => {
    try {
      const { error } = await supabase
        .from('light_invitations')
        .update({ status })
        .eq('id', invitationId);

      if (error) throw error;
      
      // Get invitation details for reminder handling
      const { data: invitationData, error: invitationError } = await supabase
        .from('light_invitations')
        .select(`
          *,
          light:lights(
            id,
            title,
            start_time
          ),
          user:users!light_invitations_user_id_fkey(
            id,
            username,
            email
          )
        `)
        .eq('id', invitationId)
        .single();
      
      if (!invitationError && invitationData && light) {
        // Handle reminders based on status
        if (status === 'accepted') {
          // Create reminders for the user who accepted
          try {
            await createRemindersForUser(
              invitationData.user_id,
              invitationData.light_id,
              invitationData.light.title,
              invitationData.light.start_time
            );
            console.log('Reminders created for user:', invitationData.user_id);
          } catch (reminderError) {
            console.error('Error creating reminders:', reminderError);
          }
          
          // Notify the light owner that someone joined
          if (light && light.author_id !== invitationData.user_id) {
            try {
              await createLightAttendingNotification(
                light.author_id,
                invitationData.light_id,
                invitationData.light.title,
                invitationData.user?.username || invitationData.user?.email || 'Someone'
              );
              console.log('Owner notification created for light:', invitationData.light_id);
            } catch (notificationError) {
              console.error('Error creating owner notification:', notificationError);
            }
          }
        } else if (status === 'declined') {
          // Delete any existing reminders for the user who declined
          try {
            await deleteRemindersForUser(
              invitationData.user_id,
              invitationData.light_id
            );
            console.log('Reminders deleted for user:', invitationData.user_id);
          } catch (reminderError) {
            console.error('Error deleting reminders:', reminderError);
          }
        }
      }
      
      // Refresh attendees
      fetchAttendees();
    } catch (error) {
      console.error('Error updating invitation status:', error);
    }
  };

  const removeInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('light_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      
      // Refresh attendees
      fetchAttendees();
    } catch (error) {
      console.error('Error removing invitation:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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
  if (!currentUser || !light) return null;

  // Check if user is the owner
  const isOwner = currentUser.id === light.author_id;
  if (!isOwner) {
    router.replace(`/mylights/${lightId}`);
    return null;
  }

  const acceptedCount = attendees.filter(a => a.status === 'accepted').length;
  const pendingCount = attendees.filter(a => a.status === 'pending').length;
  const declinedCount = attendees.filter(a => a.status === 'declined').length;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-md bg-white rounded-lg shadow overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-green-200">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/mylights/${lightId}`}
              className="text-green-600 hover:text-green-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-green-900">Manage Invitations</h1>
            <div className="w-6"></div>
          </div>
          <h2 className="text-lg font-semibold text-green-800">{light.title}</h2>
          <p className="text-sm text-green-600">{formatDate(light.start_time)}</p>
        </div>

        {/* Stats */}
        <div className="p-6 border-b border-green-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
              <div className="text-sm text-green-700">Joined</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-sm text-yellow-700">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{declinedCount}</div>
              <div className="text-sm text-red-700">Declined</div>
            </div>
          </div>
        </div>

        {/* Add New Invitations */}
        <div className="p-6 border-b border-green-200">
          <h3 className="font-semibold text-green-900 mb-4">Add New Invitations</h3>
          
          {/* Invite Options */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-green-900">
                Select Friends ({selectedFriends.length} selected)
              </h4>
              {friends.length > 0 && (
                <button
                  onClick={selectAllFriends}
                  className="text-sm text-green-600 hover:text-green-800 font-medium"
                >
                  {friends.every(friend => selectedFriends.includes(friend.friend.id)) ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {friends.length === 0 ? (
                <div className="text-center text-green-900 py-4">
                  No friends found. Add friends first!
                </div>
              ) : (
                friends.map((friend) => (
                  <div key={friend.friend.id} className="flex items-center gap-3 p-3 border rounded-lg bg-green-50">
                    <input
                      type="checkbox"
                      id={friend.friend.id}
                      checked={selectedFriends.includes(friend.friend.id)}
                      onChange={() => toggleFriendSelection(friend.friend.id)}
                      className="w-4 h-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                    />
                    <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">
                      {friend.friend.avatar_url ? (
                        <img src={friend.friend.avatar_url} alt={friend.friend.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-green-600 text-sm">{friend.friend.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <label htmlFor={friend.friend.id} className="flex-1 font-medium text-green-900 cursor-pointer">
                      {friend.friend.username}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Invitations Button */}
          <button
            onClick={saveInvitations}
            disabled={saving || selectedFriends.length === 0}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium shadow hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Invitations'}
          </button>
        </div>

        {/* Attendees List */}
        <div className="p-6">
          <h3 className="font-semibold text-green-900 mb-4">All Invitations ({attendees.length})</h3>
          <div className="space-y-3">
            {attendees.length === 0 ? (
              <p className="text-center text-green-700 py-4">No invitations yet</p>
            ) : (
              attendees.map((attendee) => (
                <div key={attendee.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">
                      {attendee.user.avatar_url ? (
                        <img 
                          src={attendee.user.avatar_url} 
                          alt={attendee.user.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-green-600 text-sm font-medium">
                          {attendee.user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-green-900">{attendee.user.username}</div>
                      <div className="text-xs text-green-600">
                        Invited {new Date(attendee.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(attendee.status)}`}>
                      {getStatusText(attendee.status)}
                    </span>
                    <button
                      onClick={() => removeInvitation(attendee.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove invitation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 