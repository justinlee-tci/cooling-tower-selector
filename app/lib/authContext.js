"use client"; // This makes the context client-side

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabaseClient"; // Import Supabase client

// Create a Context for authentication
const AuthContext = createContext();

// AuthProvider component that will wrap your app
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user || null); // Set the user when authentication state changes
      }
    );

    // Initial check for the logged-in user using getSession instead of session()
    const getUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null); // Set the user session
    };

    getUserSession(); // Call the function to check the session

    return () => {
      authListener?.unsubscribe(); // Clean up the listener on component unmount
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);
