"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";

interface List {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

interface ListMember {
  id: string;
  list_id: string;
  user_id: string;
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

export default function EditListPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [list, setList] = useState<List | null>(null);
  const [listName, setListName] = useState("");
  const [listMembers, setListMembers] = useState<ListMember[]>([]);
  const [allFriends, setAllFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const params = useParams();
  const listId = params.listId as string;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
      if (!data.user) {
        router.replace("/");
      } else {
        fetchData(data.user.id);
      }
    });
  }, [listId]);

  const fetchData = async (userId: string) => {
    try {
      // Fetch list details
      const { data: listData, error: listError } = await supabase
        .from('lists')
        .select('*')
        .eq('id', listId)
        .eq('user_id', userId)
        .single();
      
      if (listError) throw listError;
      setList(listData);
      setListName(listData.name);

      // Fetch list members
      const { data: membersData, error: membersError } = await supabase
        .from('list_members')
        .select(`
          *,
          user:users!list_members_user_id_fkey(id, username, avatar_url)
        `)
        .eq('list_id', listId);
      
      if (membersError) throw membersError;
      setListMembers(membersData || []);

      // Fetch all friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
          *,
          friend:users!friends_friend_id_fkey(id, username, avatar_url)
        `)
        .eq('user_id', userId);
      
      if (friendsError) throw friendsError;
      setAllFriends(friendsData || []);
      
      // Filter out friends who are already in the list
      const memberIds = new Set(membersData?.map(member => member.user_id) || []);
      const availableFriendsData = friendsData?.filter(friend => !memberIds.has(friend.friend.id)) || [];
      setFilteredFriends(availableFriendsData);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      router.push('/users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const memberIds = new Set(listMembers.map(member => member.user_id));
    const filtered = allFriends.filter(friend => 
      !memberIds.has(friend.friend.id) &&
      friend.friend.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFriends(filtered);
  }, [searchTerm, allFriends, listMembers]);

  const addMember = async (friendId: string) => {
    setAddingMember(friendId);
    try {
      const { error } = await supabase
        .from('list_members')
        .insert([
          {
            list_id: listId,
            user_id: friendId,
          }
        ]);
      
      if (error) throw error;
      
      // Refresh data
      if (currentUser) {
        await fetchData(currentUser.id);
      }
    } catch (err: any) {
      console.error('Error adding member:', err);
    } finally {
      setAddingMember(null);
    }
  };

  const removeMember = async (memberId: string) => {
    setRemovingMember(memberId);
    try {
      const { error } = await supabase
        .from('list_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      // Refresh data
      if (currentUser) {
        await fetchData(currentUser.id);
      }
    } catch (err: any) {
      console.error('Error removing member:', err);
    } finally {
      setRemovingMember(null);
    }
  };

  const saveListName = async () => {
    if (!listName.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lists')
        .update({ name: listName.trim() })
        .eq('id', listId);
      
      if (error) throw error;
      setList(prev => prev ? { ...prev, name: listName.trim() } : null);
      
      // Navigate back to the users page after saving
      router.push('/users');
    } catch (err: any) {
      console.error('Error updating list name:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteList = async () => {
    if (!confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
      return;
    }
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', listId);
      
      if (error) throw error;
      
      router.push('/users');
    } catch (err: any) {
      console.error('Error deleting list:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center">Loading...</div>;
  if (!currentUser || !list) return null;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
      <h1 className="text-3xl font-bold text-green-800 mb-6">Edit List</h1>
      
      <div className="w-full max-w-md bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="space-y-6">
          {/* List Name Input */}
          <div>
            <label htmlFor="listName" className="block text-sm font-medium text-green-900 mb-2">
              List Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Enter list name"
                className="flex-1 px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                onClick={saveListName}
                disabled={!listName.trim() || saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium shadow hover:bg-green-700 transition disabled:opacity-50"
              >
                {saving ? '...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-green-900 mb-2">
              Search Friends
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search friends..."
              className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Current Members */}
          {listMembers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-green-900 mb-3">
                Current Members ({listMembers.length})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {listMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">
                        {member.user.avatar_url ? (
                          <img src={member.user.avatar_url} alt={member.user.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-green-600 text-sm">{member.user.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="font-medium text-green-900">{member.user.username}</span>
                    </div>
                    <button
                      onClick={() => removeMember(member.id)}
                      disabled={removingMember === member.id}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {removingMember === member.id ? '...' : '×'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Friends */}
          {filteredFriends.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-green-900 mb-3">
                Add Friends
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {filteredFriends.map((friend) => (
                  <div key={friend.friend.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">
                        {friend.friend.avatar_url ? (
                          <img src={friend.friend.avatar_url} alt={friend.friend.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-green-600 text-sm">{friend.friend.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="font-medium text-green-900">{friend.friend.username}</span>
                    </div>
                    <button
                      onClick={() => addMember(friend.friend.id)}
                      disabled={addingMember === friend.friend.id}
                      className="p-1 hover:bg-green-200 rounded-full transition disabled:opacity-50"
                    >
                      <Image 
                        src="/plus.png" 
                        alt="Add member" 
                        width={16} 
                        height={16}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete Button */}
          <button
            onClick={deleteList}
            disabled={deleting}
            className="w-full px-6 py-3 bg-red-600 text-white rounded-full font-semibold shadow hover:bg-red-700 transition disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete List'}
          </button>
        </div>
      </div>
    </div>
  );
} 