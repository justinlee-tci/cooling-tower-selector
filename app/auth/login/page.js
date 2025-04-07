"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [previousLogin, setPreviousLogin] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Message useEffect (from original code)
  useEffect(() => {
    if (router.query && router.query.message === "email_confirmation") {
      setMessage("Email confirmation link sent. Please check your inbox to verify your email.");
    }
  }, [router.query]);

  // Modified last login update - only runs after successful login
  useEffect(() => {
    let mounted = true;

    const updateLastLoginWithDelay = async () => {
      // Only proceed if logged in and component is mounted
      if (!isLoggedIn || !mounted) return;

      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        // Only proceed if we have an active session
        if (!session) return;

        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email) {
          setTimeout(async () => {
            if (!mounted) return;

            const { error: updateError } = await supabase
              .from('users')
              .update({ 
                last_logged_in: new Date().toISOString() 
              })
              .eq('email', user.email);

            if (updateError && mounted) {
              console.error('Error updating last logged in time:', updateError);
            }
          }, 3500);
        }
      } catch (error) {
        // Only log error if component is still mounted
        if (mounted) {
          console.error('Error in login update:', error);
        }
      }
    };

    updateLastLoginWithDelay();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
  
    try {
      // Attempt login
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
  
      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }
  
      // Explicitly refresh the session
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !session) {
        setError("Failed to establish a valid session. Please try again.");
        setLoading(false);
        return;
      }
  
      // Fetch user role and last login time
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, last_logged_in")
        .eq("email", email)
        .single();
  
      if (userError || !userData) {
        setError("Failed to fetch user details.");
        setLoading(false);
        return;
      }
  
      // Show previous login time but do not update it immediately
      const lastLogin = userData.last_logged_in;
      setPreviousLogin(lastLogin ? `Your last login was on: ${new Date(lastLogin).toLocaleString()}` : "This is your first login!");
  
      // Set logged in state to trigger delayed update
      setIsLoggedIn(true);
  
      // Redirect user based on role
      router.push(userData.role === "superadmin" ? "/admin-dashboard" : "/user-dashboard");
  
    } catch (err) {
      console.error("Login failed:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200">
      <div className="bg-white p-12 rounded-2xl shadow-lg w-[500px]">
        {/* Add Logo Image with increased bottom margin */}
        <div className="flex justify-center mb-12">
          <img 
            src="/company-logo.jpg" 
            alt="Company Logo" 
            className="h-24 w-auto object-contain"
          />
        </div>

        <h2 className="text-3xl font-bold mb-8 text-center text-gray-900">Login</h2>

        {message && <p className="text-green-600 text-lg mb-4">{message}</p>}
        {error && <p className="text-red-600 text-lg mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-900 text-lg mb-2">Email</label>
            <input
              type="email"
              placeholder="example@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 text-lg border border-gray-500 rounded-lg bg-white focus:ring-4 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-gray-900 text-lg mb-2">Password</label>
            <input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 text-lg border border-gray-500 rounded-lg bg-white focus:ring-4 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="text-lg mt-6 text-center text-gray-800">
          Don&apos;t have an account?{" "}
          <a href="/auth/register" className="text-green-600 hover:underline">
            Register
          </a>
        </p>
        <div className="text-sm mt-2 text-center text-gray-600">
          <p>Forgot your password?</p>
          <p className="mt-1">
            Please reach out to{" "}
            <a href="mailto:admin@thermal-cell.com" className="text-blue-600 hover:underline">
              admin@thermal-cell.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}