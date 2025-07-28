"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

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

interface List {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export default function CreateListPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [listName, setListName] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
      if (!data.user) {
        router.replace("/");
      } else {
        fetchFriends(data.user.id);
      }
    });
  }, []);

  const fetchFriends = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          *,
          friend:users!friends_friend_id_fkey(id, username, avatar_url)
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      setFriends(data || []);
      setFilteredFriends(data || []);
    } catch (err: any) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = friends.filter(friend => 
      friend.friend.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFriends(filtered);
  }, [searchTerm, friends]);

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const createList = async () => {
    if (!currentUser || !listName.trim()) return;
    
    setCreating(true);
    try {
      // Create the list
      const { data: listData, error: listError } = await supabase
        .from('lists')
        .insert([
          {
            name: listName.trim(),
            user_id: currentUser.id,
          }
        ])
        .select()
        .single();
      
      if (listError) throw listError;

      // Add selected friends to the list
      if (selectedFriends.length > 0 && listData) {
        const listMembers = selectedFriends.map(friendId => ({
          list_id: listData.id,
          user_id: friendId,
        }));

        const { error: membersError } = await supabase
          .from('list_members')
          .insert(listMembers);
        
        if (membersError) throw membersError;
      }

      router.push('/users');
    } catch (err: any) {
      console.error('Error creating list:', err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center">Loading...</div>;
  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
      <h1 className="text-3xl font-bold text-green-800 mb-6">Create List</h1>
      
      <div className="w-full max-w-md bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="space-y-6">
          {/* List Name Input */}
          <div>
            <label htmlFor="listName" className="block text-sm font-medium text-green-900 mb-2">
              List Name
            </label>
            <input
              type="text"
              id="listName"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter list name"
              className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
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

          {/* Friends List */}
          <div>
            <h3 className="text-sm font-medium text-green-900 mb-3">
              Select Friends ({selectedFriends.length} selected)
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredFriends.length === 0 ? (
                <div className="text-center text-green-900 py-4">
                  {searchTerm ? 'No friends found matching your search.' : 'No friends found.'}
                </div>
              ) : (
                filteredFriends.map((friend) => (
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

          {/* Create Button */}
          <button
            onClick={createList}
            disabled={!listName.trim() || creating}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-full font-semibold shadow hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create List'}
          </button>
        </div>
      </div>
    </div>
  );
} 