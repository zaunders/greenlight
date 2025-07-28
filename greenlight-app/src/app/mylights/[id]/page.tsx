"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
      }
    });
  }, [lightId]);

  const fetchLight = async () => {
    try {
      const { data, error } = await supabase
        .from('lights')
        .select('*')
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

  const deleteLight = async () => {
    if (!confirm('Are you sure you want to delete this light? This action cannot be undone.')) {
      return;
    }
    
    setDeleting(true);
    try {
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

  if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center">Loading...</div>;
  if (!light) return null;

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
        {light.image_url && (
          <div className="w-full h-48 bg-green-200">
            <img 
              src={light.image_url} 
              alt={light.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-green-900 mb-4">{light.title}</h1>
          
          {light.description && (
            <p className="text-green-800 mb-4">{light.description}</p>
          )}
          
          <div className="space-y-3 text-sm text-green-700">
            <div className="flex items-center gap-2">
              <span className="font-medium">📍</span>
              <span>{light.location}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">🕒</span>
              <span>{formatDate(light.start_time)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">⏰</span>
              <span>{formatDate(light.end_time)}</span>
            </div>
            
            {light.max_limit && (
              <div className="flex items-center gap-2">
                <span className="font-medium">👥</span>
                <span>Max {light.max_limit} people</span>
              </div>
            )}
          </div>
          
          {/* Attendees Section */}
          <div className="mt-6 pt-4 border-t border-green-200">
            <h3 className="font-semibold text-green-900 mb-3">{goingCount} Going:</h3>
            <div className="flex -space-x-2">
              {acceptedAttendees.slice(0, maxAvatars).map((attendee, index) => (
                <div
                  key={attendee.id}
                  className="relative group"
                  title={attendee.user.username}
                >
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-green-200 flex items-center justify-center">
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
                  </div>
                </div>
              ))}
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
                  {pendingAttendees.slice(0, maxPendingDisplay).map((attendee) => (
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
                  ))}
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
              const canEdit = currentUser?.id === message.user_id || isOwner;
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
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                      {canEdit && !isEditing && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditMessage(message)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Edit message"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
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

      {/* Action Buttons - Only show for owner */}
      {isOwner && (
        <div className="mt-6 flex gap-3">
          <Link
            href={`/mylights/${lightId}/edit`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full font-semibold shadow hover:bg-green-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Light
          </Link>
          <button
            onClick={deleteLight}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-full font-semibold shadow hover:bg-red-700 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deleting ? 'Deleting...' : 'Delete Light'}
          </button>
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
                {attendees.map((attendee) => (
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
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 