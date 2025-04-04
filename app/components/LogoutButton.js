"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout Error:", error.message);
      return;
    }

    console.log("User logged out successfully");

    // Ensure session is cleared before redirecting
    setTimeout(() => {
      router.push("/auth/login");
    }, 500); // Add slight delay to prevent race conditions
  };

  return (
    <button 
      onClick={handleLogout} 
      className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-700 transition"
    >
      Logout
    </button>
  );
};

export default LogoutButton;
