"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { createLightCancelledNotification, createLightMessageOwnerNotification, createLightMessageAttendingNotification, createLightAttendingNotification } from "@/lib/notifications";
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
  author?: {
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

interface Message {
  id: string;
  light_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export default function LightPage() {
  const [light, setLight] = useState<Light | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState("");
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllInvited, setShowAllInvited] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Attendee | null>(null);
  const [addingFriend, setAddingFriend] = useState(false);
  const [userFriends, setUserFriends] = useState<string[]>([]);
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
        fetchMessages();
        fetchUserFriends(data.user.id);
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
      router.push('/mylights');
    } finally {
      setLoading(false);
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
        .eq('light_id', lightId);
      
      if (error) throw error;
      setAttendees(data || []);
    } catch (err: any) {
      console.error('Error fetching attendees:', err);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('light_messages')
        .select(`
          *,
          user:users!light_messages_user_id_fkey(id, username, avatar_url)
        `)
        .eq('light_id', lightId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    }
  };

  const fetchUserFriends = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', userId);
      
      if (error) throw error;
      setUserFriends(data?.map(f => f.friend_id) || []);
    } catch (err: any) {
      console.error('Error fetching friends:', err);
    }
  };

  const handleAvatarClick = (attendee: Attendee) => {
    // Don't show popup for current user
    if (currentUser && attendee.user_id === currentUser.id) return;
    
    setSelectedUser(attendee);
    setShowUserPopup(true);
  };

  const addFriend = async (friendId: string) => {
    if (!currentUser) return;
    
    setAddingFriend(true);
    try {
      const { error } = await supabase
        .from('friends')
        .insert([
          {
            user_id: currentUser.id,
            friend_id: friendId,
          }
        ]);
      
      if (error) throw error;
      
      // Refresh friends list
      await fetchUserFriends(currentUser.id);
      setShowUserPopup(false);
    } catch (err: any) {
      console.error('Error adding friend:', err);
    } finally {
      setAddingFriend(false);
    }
  };

  const closeUserPopup = () => {
    setShowUserPopup(false);
    setSelectedUser(null);
  };

  const deleteLight = async () => {
    if (!confirm('Are you sure you want to delete this light? This action cannot be undone.')) {
      return;
    }
    
    setDeleting(true);
    try {
      // Notify all accepted attendees and delete their reminders before deleting the light
      if (light) {
        try {
          const acceptedAttendees = attendees.filter(attendee => 
            attendee.status === 'accepted'
          );
          
          for (const attendee of acceptedAttendees) {
            // Send cancellation notification
            await createLightCancelledNotification(
              attendee.user_id,
              lightId,
              light.title,
              currentUser?.user_metadata?.name || currentUser?.email || 'Event organizer'
            );
            
            // Delete any existing reminders for this user and light
            await deleteRemindersForUser(
              attendee.user_id,
              lightId
            );
          }
        } catch (notificationError) {
          console.error('Error creating cancellation notifications or deleting reminders:', notificationError);
        }
      }
      
      const { error } = await supabase
        .from('lights')
        .delete()
        .eq('id', lightId);
      
      if (error) throw error;
      
      router.push('/mylights');
    } catch (err: any) {
      console.error('Error deleting light:', err);
    } finally {
      setDeleting(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('light_messages')
        .insert([
          {
            light_id: lightId,
            user_id: currentUser.id,
            message: newMessage.trim()
          }
        ]);
      
      if (error) throw error;
      
      // Create notifications for message
      try {
        if (light) {
          // Notify light owner (if message is not from owner)
          if (currentUser.id !== light.author_id) {
                      await createLightMessageOwnerNotification(
            light.author_id,
            lightId,
            light.title,
            currentUser.user_metadata?.name || currentUser.email || 'Someone',
            newMessage.trim()
          );
          }
          
          // Notify all accepted attendees (except the message sender)
          const acceptedAttendees = attendees.filter(attendee => 
            attendee.status === 'accepted' && attendee.user_id !== currentUser.id
          );
          
          for (const attendee of acceptedAttendees) {
            await createLightMessageAttendingNotification(
              attendee.user_id,
              lightId,
              light.title,
              currentUser.user_metadata?.name || currentUser.email || 'Someone',
              newMessage.trim()
            );
          }
        }
      } catch (notificationError) {
        console.error('Error creating message notifications:', notificationError);
      }
      
      setNewMessage("");
      await fetchMessages(); // Refresh messages
    } catch (err: any) {
      console.error('Error sending message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const startEditMessage = (message: Message) => {
    setEditingMessage(message.id);
    setEditMessageText(message.message);
  };

  const cancelEditMessage = () => {
    setEditingMessage(null);
    setEditMessageText("");
  };

  const saveEditMessage = async () => {
    if (!editingMessage || !editMessageText.trim()) return;
    
    try {
      const { error } = await supabase
        .from('light_messages')
        .update({ message: editMessageText.trim() })
        .eq('id', editingMessage);
      
      if (error) throw error;
      
      setEditingMessage(null);
      setEditMessageText("");
      await fetchMessages(); // Refresh messages
    } catch (err: any) {
      console.error('Error updating message:', err);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    setDeletingMessage(messageId);
    try {
      const { error } = await supabase
        .from('light_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
      
      await fetchMessages(); // Refresh messages
    } catch (err: any) {
      console.error('Error deleting message:', err);
    } finally {
      setDeletingMessage(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date set';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center">Loading...</div>;
  if (!light) return <div className="min-h-screen bg-green-50 flex items-center justify-center">Light not found</div>;

  const isOwner = currentUser?.id === light.author_id;
  const acceptedAttendees = attendees.filter(attendee => attendee.status === 'accepted');
  const pendingAttendees = attendees.filter(attendee => attendee.status === 'pending');
  const goingCount = acceptedAttendees.length;
  const maxAvatars = 5;
  const maxPendingDisplay = 5;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-md bg-white rounded-lg shadow overflow-hidden">
        {/* Image */}
        <div className="w-full h-48 bg-green-200">
          <img 
            src={light.image_url || '/greenlight.png'} 
            alt={light.title}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Content */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-green-900 mb-4">{light.title}</h1>
          
          {/* Owner Information */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center">
              {light.author?.avatar_url ? (
                <img 
                  src={light.author.avatar_url} 
                  alt={light.author.username} 
                  className="w-full h-full rounded-full object-cover" 
                />
              ) : (
                <span className="text-green-600 text-xs font-medium">
                  {light.author?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <span className="text-sm text-green-700">by {light.author?.username || 'Unknown'}</span>
          </div>
          
          {light.description && (
            <p className="text-green-800 mb-4">{light.description}</p>
          )}
          
          <div className="space-y-3 text-sm text-green-700">
            <div className="flex items-center gap-2">
              <span className="font-medium">📍</span>
              <span>{light.location || 'No location set'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">🕒</span>
              <span>{formatDate(light.start_time || '')}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">⏰</span>
              <span>{formatDate(light.end_time || '')}</span>
            </div>
            
            {light.max_limit && (
              <div className="flex items-center gap-2">
                <span className="font-medium">👥</span>
                <span>Max {light.max_limit} people</span>
              </div>
            )}
          </div>
          
          {/* Action Buttons - Only show for owner */}
          {isOwner && (
            <div className="mt-6 flex gap-3">
              <Link
                href={`/mylights/${lightId}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium shadow hover:bg-green-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Link>
              <button
                onClick={deleteLight}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium shadow hover:bg-red-700 transition disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
          
          {/* Attendees Section */}
          <div className="mt-6 pt-4 border-t border-green-200">
            {/* Manage Invitations Button - Only show for owner */}
            {isOwner && (
              <div className="mb-4">
                <Link
                  href={`/mylights/${lightId}/invitations`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium shadow hover:bg-green-700 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Manage Invitations
                </Link>
              </div>
            )}
            <h3 className="font-semibold text-green-900 mb-3">{goingCount} Going:</h3>
            <div className="flex -space-x-2">
              {acceptedAttendees.slice(0, maxAvatars).map((attendee, index) => {
                if (!attendee || !attendee.user) return null;
                const isCurrentUser = currentUser && attendee.user_id === currentUser.id;
                return (
                  <div
                    key={attendee.id}
                    className="relative group"
                    title={attendee.user.username}
                  >
                    <div 
                      className={`w-8 h-8 rounded-full border-2 border-white bg-green-200 flex items-center justify-center ${
                        !isCurrentUser ? 'cursor-pointer hover:ring-2 hover:ring-green-500 hover:ring-offset-2 transition-all' : ''
                      }`}
                      onClick={() => !isCurrentUser && handleAvatarClick(attendee)}
                    >
                      {attendee.user.avatar_url ? (
                        <img 
                          src={attendee.user.avatar_url} 
                          alt={attendee.user.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-green-600 text-xs font-medium">
                          {attendee.user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {attendee.user.username}
                      {!isCurrentUser && <span className="block text-gray-300 text-xs">Click to add friend</span>}
                    </div>
                  </div>
                );
              })}
              {acceptedAttendees.length > maxAvatars && (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-green-600 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    +{acceptedAttendees.length - maxAvatars}
                  </span>
                </div>
              )}
            </div>
            {acceptedAttendees.length === 0 && (
              <p className="text-sm text-green-700 mt-2">No one has confirmed yet</p>
            )}
            
            {/* Pending Invitations */}
            {pendingAttendees.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">Pending ({pendingAttendees.length}):</h4>
                <div className="space-y-1">
                  {pendingAttendees.slice(0, maxPendingDisplay).map((attendee) => {
                    if (!attendee || !attendee.user) return null;
                    return (
                      <div key={attendee.id} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center">
                          {attendee.user.avatar_url ? (
                            <img 
                              src={attendee.user.avatar_url} 
                              alt={attendee.user.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-green-600 text-xs font-medium">
                              {attendee.user.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-green-900 text-sm">{attendee.user.username}</span>
                      </div>
                    );
                  })}
                  {pendingAttendees.length > maxPendingDisplay && (
                    <button
                      onClick={() => setShowAllInvited(true)}
                      className="text-sm text-green-600 hover:text-green-800 font-medium"
                    >
                      Show more...
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Join Button for Pending Invitations */}
          {currentUser && !isOwner && pendingAttendees.some(attendee => attendee.user_id === currentUser.id) && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={async () => {
                  const pendingInvitation = pendingAttendees.find(attendee => attendee.user_id === currentUser.id);
                  if (pendingInvitation) {
                    try {
                      const { error } = await supabase
                        .from('light_invitations')
                        .update({ status: 'accepted' })
                        .eq('id', pendingInvitation.id);
                      
                      if (error) throw error;
                      
                      // Create reminders for the user who accepted
                      if (light) {
                        console.log('Attempting to create reminders for user:', currentUser.id, 'for light:', lightId);
                        try {
                          await createRemindersForUser(
                            currentUser.id,
                            lightId,
                            light.title,
                            light.start_time
                          );
                          console.log('Reminders created successfully for user:', currentUser.id);
                        } catch (reminderError) {
                          console.error('Error creating reminders:', reminderError);
                        }
                      } else {
                        console.log('Light data not available for reminder creation');
                      }
                      
                      // Notify the light owner that someone joined
                      if (light && light.author_id !== currentUser.id) {
                        try {
                          await createLightAttendingNotification(
                            light.author_id,
                            lightId,
                            light.title,
                            currentUser.user_metadata?.name || currentUser.email || 'Someone'
                          );
                          console.log('Owner notification created for light:', lightId);
                        } catch (notificationError) {
                          console.error('Error creating owner notification:', notificationError);
                        }
                      }
                      
                      // Refresh attendees to update the UI
                      await fetchAttendees();
                    } catch (err: any) {
                      console.error('Error accepting invitation:', err);
                    }
                  }
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold shadow hover:bg-green-700 transition"
              >
                Join
              </button>
            </div>
          )}
          
          {/* "Actually, I'll join" Button for Declined Invitations */}
          {currentUser && !isOwner && attendees.some(attendee => 
            attendee.user_id === currentUser.id && attendee.status === 'declined'
          ) && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={async () => {
                  const declinedInvitation = attendees.find(attendee => 
                    attendee.user_id === currentUser.id && attendee.status === 'declined'
                  );
                  if (declinedInvitation) {
                    try {
                      const { error } = await supabase
                        .from('light_invitations')
                        .update({ status: 'accepted' })
                        .eq('id', declinedInvitation.id);
                      
                      if (error) throw error;
                      
                      // Create reminders for the user who accepted
                      if (light) {
                        console.log('Attempting to create reminders for user:', currentUser.id, 'for light:', lightId);
                        try {
                          await createRemindersForUser(
                            currentUser.id,
                            lightId,
                            light.title,
                            light.start_time
                          );
                          console.log('Reminders created successfully for user:', currentUser.id);
                        } catch (reminderError) {
                          console.error('Error creating reminders:', reminderError);
                        }
                      } else {
                        console.log('Light data not available for reminder creation');
                      }
                      
                      // Notify the light owner that someone joined
                      if (light && light.author_id !== currentUser.id) {
                        try {
                          await createLightAttendingNotification(
                            light.author_id,
                            lightId,
                            light.title,
                            currentUser.user_metadata?.name || currentUser.email || 'Someone'
                          );
                          console.log('Owner notification created for light:', lightId);
                        } catch (notificationError) {
                          console.error('Error creating owner notification:', notificationError);
                        }
                      }
                      
                      // Refresh attendees to update the UI
                      await fetchAttendees();
                    } catch (err: any) {
                      console.error('Error accepting declined invitation:', err);
                    }
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium shadow hover:bg-green-700 transition"
              >
                Actually, I'll join
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Section */}
      <div className="w-full max-w-md bg-white rounded-lg shadow p-4 sm:p-6 mt-6">
        <h3 className="font-semibold text-green-900 mb-4">Messages</h3>
        
        {/* Message Input */}
        {currentUser && (
          <form onSubmit={sendMessage} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={sendingMessage}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sendingMessage}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium shadow hover:bg-green-700 transition disabled:opacity-50"
              >
                {sendingMessage ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        )}

        {/* Messages List */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-green-700 text-center py-4">No messages yet. Be the first to say something!</p>
          ) : (
            messages.map((message) => {
              if (!message || !message.user) return null;
              const canEdit = currentUser?.id === message.user_id;
              const canDelete = currentUser?.id === message.user_id || isOwner;
              const isEditing = editingMessage === message.id;
              
              return (
                <div key={message.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
                    {message.user.avatar_url ? (
                      <img 
                        src={message.user.avatar_url} 
                        alt={message.user.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-green-600 text-xs font-medium">
                        {message.user.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-900 text-sm">{message.user.username}</span>
                        <span className="text-xs text-green-600">
                          {message.created_at ? new Date(message.created_at).toLocaleString() : 'Unknown time'}
                        </span>
                      </div>
                      {(canEdit || canDelete) && !isEditing && (
                        <div className="flex gap-1">
                          {canEdit && (
                            <button
                              onClick={() => startEditMessage(message)}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="Edit message"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => deleteMessage(message.id)}
                              disabled={deletingMessage === message.id}
                              className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                              title="Delete message"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editMessageText}
                          onChange={(e) => setEditMessageText(e.target.value)}
                          className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEditMessage}
                            disabled={!editMessageText.trim()}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium shadow hover:bg-green-700 transition disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditMessage}
                            className="px-3 py-1 bg-gray-500 text-white rounded text-xs font-medium shadow hover:bg-gray-600 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-green-800 text-sm">{message.message}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      <div className="mb-24"></div>

      {/* User Popup Dialog */}
      {showUserPopup && selectedUser && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeUserPopup}
        >
          <div 
            className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-green-200 flex items-center justify-center mb-4">
                {selectedUser.user.avatar_url ? (
                  <img 
                    src={selectedUser.user.avatar_url} 
                    alt={selectedUser.user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-green-600 text-2xl font-medium">
                    {selectedUser.user.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Username */}
              <h3 className="text-xl font-semibold text-green-900 mb-4">
                {selectedUser.user.username}
              </h3>
              
              {/* Buttons */}
              <div className="flex gap-3 w-full">
                {!userFriends.includes(selectedUser.user_id) && (
                  <button
                    onClick={() => addFriend(selectedUser.user_id)}
                    disabled={addingFriend}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium shadow hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {addingFriend ? 'Adding...' : '+ Add Friend'}
                  </button>
                )}
                <button
                  onClick={closeUserPopup}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium shadow hover:bg-gray-600 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Invited Modal */}
      {showAllInvited && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-96 overflow-hidden">
            <div className="p-4 border-b border-green-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-900">All Invited ({attendees.length})</h3>
                <button
                  onClick={() => setShowAllInvited(false)}
                  className="text-green-600 hover:text-green-800"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-80">
              <div className="space-y-3">
                {attendees.map((attendee) => {
                  if (!attendee || !attendee.user) return null;
                  return (
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
                        <span className="font-medium text-green-900">{attendee.user.username}</span>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full ${
                        attendee.status === 'accepted' 
                          ? 'bg-green-100 text-green-800' 
                          : attendee.status === 'declined'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {attendee.status === 'accepted' ? '✓ Going' : 
                         attendee.status === 'declined' ? '✗ Declined' : 
                         '⏳ Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 