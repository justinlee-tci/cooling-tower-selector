"use client";
import React, { useEffect, useState, useRef } from "react";
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

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
  }, [user, supabase]);

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    
    if (dropdownOpen) {
      // Add a small delay to prevent immediate closing when clicking the button
      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 100);
    }
    
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [dropdownOpen]);

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
    <nav className="bg-white shadow-md relative z-50">
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

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              <svg
                className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Icon when menu is open */}
              <svg
                className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Desktop Navigation Items */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {/* Dashboard button with correct redirection */}
            <Link href={dashboardRoute} className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/account-details" className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Account Details
            </Link>
            
            {/* Selection dropdown menu - only show for user role */}
            {(role === "user" || role === "superadmin")  && (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(!dropdownOpen);
                  }}
                  className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  Selection
                  <svg 
                    className={`ml-1 h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Dropdown menu with improved z-index */}
                {dropdownOpen && (
                  <div 
                    className="absolute right-0 z-50 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <Link
                        href="/selection/cooling-tower"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Cooling Tower Selection
                      </Link>
                      <div className="block px-4 py-2 text-sm text-gray-500 cursor-not-allowed">
                        Stay Tuned for More Selections
                      </div>
                      <div className="block px-4 py-2 text-sm text-gray-500 cursor-not-allowed">
                        Stay Tuned for More Selections
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <button onClick={handleLogout} className="text-red-600 hover:bg-red-50 hover:text-red-700 px-3 py-2 rounded-md text-sm font-medium">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
          <Link href={dashboardRoute} 
            className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
            onClick={() => setMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link href="/account-details" 
            className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
            onClick={() => setMobileMenuOpen(false)}
          >
            Account Details
          </Link>
          
          {/* Selection menu items - only show for user role */}
          {(role === "user" || role === "superadmin") && (
            <div>
              <div className="text-gray-700 px-3 py-2 rounded-md text-base font-medium">
                Selection
              </div>
              <div className="pl-6">
                <Link
                  href="/selection/cooling-tower"
                  className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 block px-3 py-2 rounded-md text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Cooling Tower Selection
                </Link>
                <div className="block px-3 py-2 text-sm text-gray-500 cursor-not-allowed">
                  Stay Tuned for More Selections
                </div>
                <div className="block px-3 py-2 text-sm text-gray-500 cursor-not-allowed">
                  Stay Tuned for More Selections
                </div>
              </div>
            </div>
          )}
          
          <button 
            onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }} 
            className="text-red-600 hover:bg-red-50 hover:text-red-700 block w-full text-left px-3 py-2 rounded-md text-base font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;