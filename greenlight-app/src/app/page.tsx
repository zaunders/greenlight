"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";

const LoginModal = dynamic(() => import("../components/LoginModal"), { ssr: false });

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        checkFirstTimeUser(data.user);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkFirstTimeUser(session.user);
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router]);

  const checkFirstTimeUser = (user: User) => {
    // Check if user has set up their profile
    const hasName = user.user_metadata?.name || user.user_metadata?.full_name;
    const hasAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    
    if (!hasName && !hasAvatar) {
      // First-time user, redirect to profile setup
      router.replace("/profile/edit");
    } else {
      // Returning user, go to main app
      router.replace("/mylights");
    }
  };

  if (user) return null;

  return (
    <div className="h-screen w-screen fixed inset-0 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-gradient-to-b from-green-100 to-green-300"
        style={{
          backgroundImage: 'url(./greenlight_pastel_centered.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Top bar - positioned at very top of screen */}
      <div className="fixed top-0 left-0 right-0 z-30 h-16 flex items-center justify-center" style={{backgroundColor: '#e3e6dd'}}>
        <h1 className="text-3xl font-bold text-green-800">
          Greenlight
        </h1>
      </div>
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-7.5 px-8 pb-20">
        
        {/* Description and button at bottom */}
        <div className="flex flex-col items-center gap-4 px-8">
          <p className="text-lg text-green-900 text-center bg-white bg-opacity-95 px-8 py-3 rounded-lg shadow-xl max-w-2xl">
            Make a thing, invite your friends, enjoy each others company.
          </p>
          
          <button
            onClick={() => setShowLogin(true)}
            className="px-16 py-4 bg-green-600 text-white rounded-full text-lg font-semibold shadow hover:bg-green-700 transition"
          >
            Get Started
          </button>
        </div>
      </div>
      
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}
