"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

const LoginModal = dynamic(() => import("../components/LoginModal"), { ssr: false });

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        router.replace("/mylights");
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        router.replace("/mylights");
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router]);

  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-100 to-green-300 p-6">
      <h1 className="text-4xl font-bold text-green-800 mb-4 text-center">Greenlight</h1>
      <Image
        src="/greenlight.png"
        alt="Greenlight Logo"
        width={180}
        height={180}
        priority
        className="mb-8 drop-shadow-lg"
      />
      <p className="text-lg text-green-900 mb-8 text-center max-w-xl">
        Make a thing, invite your friends, enjoy each others company.
      </p>
      <button
        onClick={() => setShowLogin(true)}
        className="px-8 py-3 bg-green-600 text-white rounded-full text-lg font-semibold shadow hover:bg-green-700 transition"
      >
        Get Started
      </button>
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}
