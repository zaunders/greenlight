"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

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

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
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
      // Fetch friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
          *,
          friend:users!friends_friend_id_fkey(id, username, avatar_url)
        `)
        .eq('user_id', userId);
      
      if (friendsError) throw friendsError;
      setFriends(friendsData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center">Loading...</div>;
  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
      <h1 className="text-3xl font-bold text-green-800 mb-6">My Friends</h1>
      
      {/* Action Button */}
      <div className="mb-6">
        <Link
          href="/users/add"
          className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold shadow hover:bg-green-700 transition"
        >
          + Add Friends
        </Link>
      </div>

      {/* Content */}
      <div className="w-full max-w-md bg-white rounded-lg shadow p-4 sm:p-6 mb-24">
        <div className="space-y-4">
          {friends.length === 0 ? (
            <div className="text-center text-green-900 py-8">
              <p className="mb-4">You haven't added any friends yet.</p>
              <p className="text-sm text-green-700">Add friends to start organizing!</p>
            </div>
          ) : (
            friends.map((friend) => (
              <div key={friend.friend.id} className="flex items-center gap-3 p-4 border rounded-lg bg-green-50">
                <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                  {friend.friend.avatar_url ? (
                    <img src={friend.friend.avatar_url} alt={friend.friend.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-green-600 text-sm">{friend.friend.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900">{friend.friend.username}</h3>
                </div>
                <button
                  onClick={async () => {
                    if (confirm(`Remove ${friend.friend.username} from your friends?`)) {
                      try {
                        const { error } = await supabase
                          .from('friends')
                          .delete()
                          .eq('id', friend.id);
                        
                        if (error) throw error;
                        
                        // Refresh friends list
                        await fetchData(currentUser.id);
                      } catch (err: any) {
                        console.error('Error removing friend:', err);
                      }
                    }
                  }}
                  className="text-red-500 hover:text-red-700 p-1 transition"
                  title="Remove friend"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 