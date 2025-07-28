"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { FaUserCircle } from "react-icons/fa";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOpen(false);
  };

  if (!user) return null;

  // Use user.user_metadata for name and avatar_url if available
  const name = user.user_metadata?.name || user.email;
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="fixed top-4 right-6 z-50" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-green-700 text-3xl focus:outline-none"
        aria-label="User menu"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="Profile" width={32} height={32} className="rounded-full object-cover" />
        ) : (
          <FaUserCircle />
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border p-4 flex flex-col items-start">
          <div className="flex items-center gap-3 mb-3 w-full">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Profile" width={48} height={48} className="rounded-full object-cover" />
            ) : (
              <FaUserCircle className="w-12 h-12 text-green-400" />
            )}
            <div className="flex-1">
              <div className="font-semibold text-green-900 text-base truncate">{name}</div>
              <div className="text-green-700 text-xs truncate">{user.email}</div>
            </div>
          </div>
          <Link
            href="/profile/edit"
            className="mb-2 px-4 py-2 bg-green-100 text-green-800 rounded font-semibold hover:bg-green-200 transition w-full text-center"
            onClick={() => setOpen(false)}
          >
            Edit Profile
          </Link>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:underline text-sm mb-2 w-full text-left"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
} 