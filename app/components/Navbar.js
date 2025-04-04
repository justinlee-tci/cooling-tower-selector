"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/authContext";
import { logout } from "@/lib/logout";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const Navbar = () => {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient(); // Create Supabase client
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user role from Supabase database
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("email", user.email)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
        } else {
          setRole(data?.role.toLowerCase());
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  // If the user is not logged in, redirect to the login page
  useEffect(() => {
    if (!user && !loading) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  // Prevent rendering until role is loaded
  if (loading || role === null) return null;

  // Redirect users to the appropriate dashboard
  const dashboardRoute = role === "superadmin" ? "/admin-dashboard" : "/user-dashboard";

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Links to the correct dashboard */}
          <Link href={dashboardRoute} className="flex-shrink-0">
            <Image 
              src="/company-logo.jpg"
              alt="Company Logo"
              width={80}
              height={40}
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Navigation Items */}
          <div className="flex space-x-4">
            {/* Dashboard button with correct redirection */}
            <Link href={dashboardRoute} className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Dashboard
            </Link>

            <Link href="/account-details" className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Account Details
            </Link>

            {/* Only show "New Selection" for user role */}
            {role === "user" && (
              <Link href="/selection" className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                New Selection
              </Link>
            )}

            <button onClick={handleLogout} className="text-red-600 hover:bg-red-50 hover:text-red-700 px-3 py-2 rounded-md text-sm font-medium">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
