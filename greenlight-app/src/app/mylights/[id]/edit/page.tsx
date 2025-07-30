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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
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
      useWebWorker: true
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error('Error compressing image:', error);
      return file;
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const compressedFile = await compressImage(file);
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('light-images')
      .upload(fileName, compressedFile);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('light-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !light) return;
    
    // Client-side validation before making any API calls
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('Please fill in all date and time fields');
      return;
    }

    // Create proper ISO strings for the database (preserve local timezone)
    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);
    
    // Validate that end time is after start time
    if (endDateTime <= startDateTime) {
      setTimeError('End time must be after start time');
      return;
    }
    
    setSaving(true);
    setError(null);
    setTimeError(null);
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
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          max_limit: maxLimit ? parseInt(maxLimit) : null,
          image_url: imageUrl,
        })
        .eq('id', lightId);
      
      if (error) throw error;
      
      router.push(`/mylights/${lightId}`);
    } catch (err: any) {
      console.error('Error updating light:', err);
      setError(err.message || 'Error updating light. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center">Loading...</div>;
  if (!currentUser || !light) return null;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-md bg-white rounded-lg shadow overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-green-200">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="text-green-600 hover:text-green-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-green-900">Edit Light</h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-green-900 mb-2">
                Title
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
                Description (optional)
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
            
            {/* Time validation error */}
            {timeError && (
              <div className="text-red-600 text-sm mt-1">
                {timeError}
              </div>
            )}

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
    </div>
  );
} 