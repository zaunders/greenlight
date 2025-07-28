"use client";

import { useEffect, useState, ChangeEvent, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import imageCompression from "browser-image-compression";

export default function EditProfilePage() {
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user as User | null;
      if (user) {
        setName(user.user_metadata?.name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
        setEmail(user.email || "");
      }
      setLoading(false);
    });
  }, []);

  const cropImageToSquare = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      
      img.onload = () => {
        // Calculate the square crop dimensions
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        
        // Set canvas size to the square size
        canvas.width = size;
        canvas.height = size;
        
        // Draw the cropped square image
        ctx?.drawImage(img, startX, startY, size, size, 0, 0, size, size);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, file.type, 0.9);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setUploading(true);
    try {
      // First crop the image to a square
      const croppedBlob = await cropImageToSquare(file);
      
      // Convert blob to file for compression
      const croppedFile = new File([croppedBlob], file.name, { type: file.type });
      
      // Compress the cropped square image
      const compressed = await imageCompression(croppedFile, {
        maxWidthOrHeight: 128,
        maxSizeMB: 0.1,
        useWebWorker: true,
      });
      
      // Upload to Supabase storage
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("User not found");
      const filePath = `avatars/${userId}_${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, compressed, {
        cacheControl: "3600",
        upsert: true,
        contentType: compressed.type,
      });
      if (uploadError) throw uploadError;
      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      setPreview(data.publicUrl);
    } catch (err: any) {
      alert("Image upload failed: " + err.message);
    }
    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) throw new Error("User not found");

      console.log("Updating profile for user:", currentUser.id);
      console.log("New values:", { username: name, avatar_url: avatarUrl });

      // Update user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { name, avatar_url: avatarUrl },
      });
      if (authError) throw authError;
      console.log("Auth metadata updated successfully");

      // Also update the users table
      const { data: updateData, error: dbError } = await supabase.from('users').update({
        username: name,
        avatar_url: avatarUrl
      }).eq('id', currentUser.id).select();
      
      console.log("Database update result:", { data: updateData, error: dbError });
      
      if (dbError) throw dbError;
      console.log("Database updated successfully");

      setSuccess("Profile updated successfully!");
      setTimeout(() => router.push("/mylights"), 1000);
    } catch (err: any) {
      console.error("Profile update error:", err);
      setError("Failed to update profile: " + err.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-2 bg-green-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-green-800 mb-4">Edit Profile</h1>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 mb-2">
            {preview || avatarUrl ? (
              <Image src={preview || avatarUrl} alt="Profile" width={64} height={64} className="rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl text-green-400">?</div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              ref={fileInputRef}
              className="hidden"
              disabled={uploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-green-800 text-white rounded font-semibold hover:bg-green-900 transition"
              disabled={uploading}
            >
              Choose File
            </button>
            {selectedFileName && <div className="text-xs text-green-900 mt-1">{selectedFileName}</div>}
            {uploading && <div className="text-xs text-green-700">Uploading...</div>}
          </div>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <input
            type="email"
            value={email}
            disabled
            className="border rounded px-4 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
          />
          <button
            type="submit"
            className="bg-green-600 text-white rounded px-4 py-2 font-semibold hover:bg-green-700 transition"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
} 