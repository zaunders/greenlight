"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";

interface AppUser {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
}

export default function AddFriendsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingFriend, setAddingFriend] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
      if (!data.user) {
        router.replace("/");
      } else {
        fetchData(data.user.id);
      }
    });
  }, []);

  const fetchData = async (userId: string) => {
    try {
      // Fetch all users except current user
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, avatar_url, created_at')
        .neq('id', userId);
      
      if (usersError) throw usersError;
      setAllUsers(users || []);

      // Fetch current user's friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', userId);
      
      if (friendsError) throw friendsError;
      setFriends(friendsData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const isFriend = (userId: string) => {
    return friends.some(friend => friend.friend_id === userId);
  };

  const addFriend = async (friendId: string) => {
    if (!currentUser) return;
    
    setAddingFriend(friendId);
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
      await fetchData(currentUser.id);
    } catch (err: any) {
      console.error('Error adding friend:', err);
    } finally {
      setAddingFriend(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center">Loading...</div>;
  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
      <h1 className="text-3xl font-bold text-green-800 mb-6">Add Friends</h1>
      
      <div className="w-full max-w-md bg-white rounded-lg shadow p-4 sm:p-6">
        {allUsers.length === 0 ? (
          <div className="text-center text-green-900">No users found.</div>
        ) : (
          <div className="space-y-3">
            {allUsers.map((user) => {
              const isAlreadyFriend = isFriend(user.id);
              return (
                <div key={user.id} className="flex items-center justify-between border rounded-lg p-3 bg-green-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-green-600 text-sm">{user.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900">{user.username}</h3>
                    </div>
                  </div>
                  
                  {isAlreadyFriend ? (
                    <span className="text-green-600 text-sm">✓ Friend</span>
                  ) : (
                    <button
                      onClick={() => addFriend(user.id)}
                      disabled={addingFriend === user.id}
                      className="p-2 hover:bg-green-200 rounded-full transition disabled:opacity-50"
                    >
                      <Image 
                        src="/plus.png" 
                        alt="Add friend" 
                        width={20} 
                        height={20}
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 