"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function BottomMenu() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => {
    return pathname === path;
  };

  // Hide bottom menu if not authenticated or on landing page
  if (loading || !isAuthenticated || pathname === "/") {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2">
      <div className="flex justify-around items-center max-w-md mx-auto">
        <Link
          href="/active-lights"
          className={`flex flex-col items-center py-2 px-4 rounded-lg transition ${
            isActive("/active-lights") ? "bg-green-100 text-green-700" : "text-gray-600"
          }`}
        >
          <Image 
            src="/greenlight.png" 
            alt="Active Lights" 
            width={24} 
            height={24} 
            className="mb-1"
          />
          <span className="text-xs font-medium">Active Lights</span>
        </Link>
        
        <Link
          href="/mylights"
          className={`flex flex-col items-center py-2 px-4 rounded-lg transition ${
            isActive("/mylights") ? "bg-green-100 text-green-700" : "text-gray-600"
          }`}
        >
          <Image 
            src="/light-bulb.png" 
            alt="My Lights" 
            width={24} 
            height={24} 
            className="mb-1"
          />
          <span className="text-xs font-medium">My Lights</span>
        </Link>
        
        <Link
          href="/users"
          className={`flex flex-col items-center py-2 px-4 rounded-lg transition ${
            isActive("/users") ? "bg-green-100 text-green-700" : "text-gray-600"
          }`}
        >
          <Image 
            src="/users.png" 
            alt="Users" 
            width={24} 
            height={24} 
            className="mb-1"
          />
          <span className="text-xs font-medium">Users</span>
        </Link>
      </div>
    </div>
  );
} 