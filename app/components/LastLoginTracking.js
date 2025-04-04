'use client';

import { useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/authContext";

export function LastLoginTracking() {
  const { user } = useAuth();

  useEffect(() => {
    // Only set up tracking if user is authenticated
    if (!user) return;

    const updateLastLoggedIn = async () => {
        try {
          console.log("Attempting to update last logged in time");
          
          const {
            data: { user: supabaseUser },
            error: userError
          } = await supabase.auth.getUser();
      
          console.log("Supabase User:", supabaseUser);
      
          if (userError || !supabaseUser) {
            console.error("Error fetching user:", userError);
            return;
          }
      
          if (supabaseUser.email) {
            console.log("Updating last logged in for email:", supabaseUser.email);
            
            const { data, error: updateError } = await supabase
              .from("users")
              .update({ 
                last_logged_in: new Date().toISOString() 
              })
              .eq("email", supabaseUser.email);
      
            console.log("Update Result:", { data, error: updateError });
      
            if (updateError) {
              console.error("Error updating last login:", updateError);
            }
          }
        } catch (error) {
          console.error("Catch block - Error updating last logged in time:", error);
        }
      };

    const setupLastLoggedInTracking = () => {
      window.addEventListener('beforeunload', updateLastLoggedIn);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          updateLastLoggedIn();
        }
      });
    };

    const cleanup = () => {
      window.removeEventListener('beforeunload', updateLastLoggedIn);
      document.removeEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          updateLastLoggedIn();
        }
      });
    };

    setupLastLoggedInTracking();

    return cleanup;
  }, [user]);

  return null; // This component doesn't render anything
}