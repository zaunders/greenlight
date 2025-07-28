"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import imageCompression from "browser-image-compression";

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

export default function EditLightPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [light, setLight] = useState<Light | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxLimit, setMaxLimit] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [inviteMode, setInviteMode] = useState<'lists' | 'friends'>('lists');
  const [lists, setLists] = useState<List[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const params = useParams();
  const lightId = params.id as string;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
      if (!data.user) {
        router.replace("/");
      } else {
        fetchLight(data.user.id);
        fetchInviteData(data.user.id);
      }
    });
  }, [lightId]);

  const fetchLight = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('lights')
        .select('*')
        .eq('id', lightId)
        .single();
      
      if (error) throw error;
      
      // Check if user owns this light
      if (data.author_id !== userId) {
        router.push('/mylights');
        return;
      }
      
      setLight(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setLocation(data.location);
      // Parse start time into separate date and time (convert from UTC to local)
      const startDateTime = new Date(data.start_time);
      const startDateStr = startDateTime.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const startTimeStr = startDateTime.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      setStartDate(startDateStr);
      setStartTime(startTimeStr);
      
      // Parse end time into separate date and time (convert from UTC to local)
      const endDateTime = new Date(data.end_time);
      const endDateStr = endDateTime.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const endTimeStr = endDateTime.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      setEndDate(endDateStr);
      setEndTime(endTimeStr);
      setMaxLimit(data.max_limit?.toString() || "");
      setImagePreview(data.image_url);
    } catch (err: any) {
      console.error('Error fetching light:', err);
      router.push('/mylights');
    } finally {
      setLoading(false);
    }
  };

  const fetchInviteData = async (userId: string) => {
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
      console.error('Error fetching invite data:', err);
    }
  };

  const toggleListSelection = (listId: string) => {
    setSelectedLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };
    return await imageCompression(file, options);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const compressedFile = await compressImage(file);
    const fileName = `${currentUser!.id}_${Date.now()}`;
    
    const { data, error } = await supabase.storage
      .from('lights')
      .upload(fileName, compressedFile);
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('lights')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const saveInvitations = async () => {
    if (!currentUser) return;

    try {
      // Get all users to invite
      const usersToInvite: string[] = [];

      // Add users from selected lists
      if (selectedLists.length > 0) {
        const { data: listMembers, error: listMembersError } = await supabase
          .from('list_members')
          .select('user_id')
          .in('list_id', selectedLists);
        
        if (listMembersError) throw listMembersError;
        
        const listUserIds = listMembers?.map(member => member.user_id) || [];
        usersToInvite.push(...listUserIds);
      }

      // Add directly selected friends
      usersToInvite.push(...selectedFriends);

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
      }
    } catch (err: any) {
      console.error('Error saving invitations:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !light) return;
    
    setSaving(true);
    try {
      let imageUrl = light.image_url;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      
      const { error } = await supabase
        .from('lights')
        .update({
          title,
          description: description || null,
          location,
                                start_time: startDate && startTime ? new Date(`${startDate}T${startTime}:00`).toISOString() : "",
          end_time: endDate && endTime ? new Date(`${endDate}T${endTime}:00`).toISOString() : "",
          max_limit: maxLimit ? parseInt(maxLimit) : null,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lightId);
      
      if (error) throw error;
      
      // Save invitations
      await saveInvitations();
      
      router.push(`/mylights/${lightId}`);
    } catch (err: any) {
      console.error('Error updating light:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center">Loading...</div>;
  if (!currentUser || !light) return null;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
      <h1 className="text-3xl font-bold text-green-800 mb-6">Edit Light</h1>
      
      <div className="w-full max-w-md bg-white rounded-lg shadow p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-green-900 mb-2">
              Name
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-green-900 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-green-900 mb-2">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Start Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-green-900 mb-2">
                Start date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-green-900 mb-2">
                Start time
              </label>
              <input
                type="time"
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* End Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-green-900 mb-2">
                End date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-green-900 mb-2">
                End time
              </label>
              <input
                type="time"
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Max Limit */}
          <div>
            <label htmlFor="maxLimit" className="block text-sm font-medium text-green-900 mb-2">
              Max limit (optional)
            </label>
            <input
              type="number"
              id="maxLimit"
              value={maxLimit}
              onChange={(e) => setMaxLimit(e.target.value)}
              min="1"
              className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-green-900 mb-2">
              Image
            </label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <label
              htmlFor="image"
              className="block w-full px-3 py-2 border border-green-300 rounded-lg cursor-pointer text-center text-green-600 hover:bg-green-50 transition"
            >
              Choose File
            </label>
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Invite Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-green-900 mb-2">
              Invite
            </label>
            <div className="flex bg-green-200 rounded-full p-1">
              <button
                type="button"
                onClick={() => setInviteMode('lists')}
                className={`flex-1 px-4 py-2 rounded-full font-medium transition ${
                  inviteMode === 'lists'
                    ? 'bg-white text-green-800 shadow'
                    : 'text-green-700 hover:text-green-800'
                }`}
              >
                Lists
              </button>
              <button
                type="button"
                onClick={() => setInviteMode('friends')}
                className={`flex-1 px-4 py-2 rounded-full font-medium transition ${
                  inviteMode === 'friends'
                    ? 'bg-white text-green-800 shadow'
                    : 'text-green-700 hover:text-green-800'
                }`}
              >
                Friends
              </button>
            </div>
          </div>

          {/* Invite Options */}
          <div>
            <h3 className="text-sm font-medium text-green-900 mb-3">
              {inviteMode === 'lists' ? 'Select Lists' : 'Select Friends'} ({inviteMode === 'lists' ? selectedLists.length : selectedFriends.length} selected)
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {inviteMode === 'lists' ? (
                lists.length === 0 ? (
                  <div className="text-center text-green-900 py-4">
                    No lists found. Create a list first!
                  </div>
                ) : (
                  lists.map((list) => (
                    <div key={list.id} className="flex items-center gap-3 p-3 border rounded-lg bg-green-50">
                      <input
                        type="checkbox"
                        id={list.id}
                        checked={selectedLists.includes(list.id)}
                        onChange={() => toggleListSelection(list.id)}
                        className="w-4 h-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                      />
                      <label htmlFor={list.id} className="flex-1 font-medium text-green-900 cursor-pointer">
                        {list.name} ({list.member_count} members)
                      </label>
                    </div>
                  ))
                )
              ) : (
                friends.length === 0 ? (
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
                )
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-full font-semibold shadow hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
} 