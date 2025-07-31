"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

interface List {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  member_count: number;
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

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [peopleMode, setPeopleMode] = useState<'lists' | 'friends'>('lists');
  const [lists, setLists] = useState<List[]>([]);
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
      // Fetch lists
      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', userId);
      
      if (listsError) throw listsError;
      
      // Fetch member counts for each list
      const listsWithCounts = await Promise.all(
        listsData?.map(async (list) => {
          const { count, error: countError } = await supabase
            .from('list_members')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);
          
          if (countError) {
            console.error('Error fetching member count for list:', list.id, countError);
            return { ...list, member_count: 0 };
          }
          
          return { ...list, member_count: count || 0 };
        }) || []
      );
      
      setLists(listsWithCounts);

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
      <h1 className="text-3xl font-bold text-green-800 mb-6">My People</h1>
      
      {/* Toggle Buttons */}
      <div className="flex bg-green-200 rounded-full p-1 mb-6">
        <button
          onClick={() => setPeopleMode('lists')}
          className={`px-6 py-2 rounded-full font-medium transition ${
            peopleMode === 'lists'
              ? 'bg-white text-green-800 shadow'
              : 'text-green-700 hover:text-green-800'
          }`}
        >
          Lists
        </button>
        <button
          onClick={() => setPeopleMode('friends')}
          className={`px-6 py-2 rounded-full font-medium transition ${
            peopleMode === 'friends'
              ? 'bg-white text-green-800 shadow'
              : 'text-green-700 hover:text-green-800'
          }`}
        >
          Friends
        </button>
      </div>

      {/* Action Buttons - positioned right below the toggle */}
      <div className="mb-6">
        {peopleMode === 'lists' ? (
          <Link
            href="/users/create-list"
            className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold shadow hover:bg-green-700 transition"
          >
            + Create List
          </Link>
        ) : (
          <Link
            href="/users/add"
            className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold shadow hover:bg-green-700 transition"
          >
            + Add Friends
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="w-full max-w-md bg-white rounded-lg shadow p-4 sm:p-6">
        {peopleMode === 'lists' ? (
          <div className="space-y-4">
            {lists.length === 0 ? (
              <div className="text-center text-green-900 py-8">
                <p className="mb-4">You haven't created any lists yet.</p>
                <p className="text-sm text-green-700">Create a list to organize your friends!</p>
              </div>
            ) : (
              lists.map((list) => (
                <Link
                  key={list.id}
                  href={`/users/${list.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg bg-green-50 hover:bg-green-100 transition"
                >
                  <div>
                    <h3 className="font-semibold text-green-900">{list.name}</h3>
                    <p className="text-sm text-green-700">{list.member_count} members</p>
                  </div>
                  <span className="text-green-600">→</span>
                </Link>
              ))
            )}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
} 