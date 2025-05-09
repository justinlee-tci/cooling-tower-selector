"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import LiveWallpaper from "@/components/LiveWallpaper-2";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [previousLogin, setPreviousLogin] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (router.query && router.query.message === "email_confirmation") {
      setMessage("Email confirmation link sent. Please check your inbox to verify your email.");
    }
  }, [router.query]);

  useEffect(() => {
    let mounted = true;

    const updateLastLoginWithDelay = async () => {
      if (!isLoggedIn || !mounted) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: { user } } = await supabase.auth.getUser();

        if (user?.email) {
          setTimeout(async () => {
            if (!mounted) return;

            const { error: updateError } = await supabase
              .from('users')
              .update({ last_logged_in: new Date().toISOString() })
              .eq('email', user.email);

            if (updateError && mounted) {
              console.error('Error updating last logged in time:', updateError);
            }
          }, 3500);
        }
      } catch (error) {
        if (mounted) {
          console.error('Error in login update:', error);
        }
      }
    };

    updateLastLoginWithDelay();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

      if (loginError) {
        setError("Invalid email/password, please try again.");
        setLoading(false);
        return;
      }

      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError || !session) {
        setError("Invalid email/password, please try again.");
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, last_logged_in")
        .eq("email", email)
        .single();

      if (userError || !userData) {
        setError("Invalid email/password, please try again.");
        setLoading(false);
        return;
      }

      setPreviousLogin(userData.last_logged_in 
        ? `Your last login was on: ${new Date(userData.last_logged_in).toLocaleString()}`
        : "This is your first login!");

      setIsLoggedIn(true);

      router.push(userData.role === "superadmin" ? "/admin-dashboard" : "/user-dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      setError("Invalid email/password, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
      <LiveWallpaper />

      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-lg w-[90%] max-w-[500px] mx-4 bg-opacity-95 z-10">
        <div className="flex justify-center mb-8 md:mb-12">
          <img 
            src="/company-logo.jpg" 
            alt="Company Logo" 
            className="h-16 md:h-24 w-auto object-contain"
          />
        </div>

        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center text-gray-900">Login</h2>

        {message && <p className="text-green-600 text-base md:text-lg mb-4">{message}</p>}
        {error && <p className="text-red-600 text-base md:text-lg mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
          <div>
            <label className="block text-gray-900 text-base md:text-lg mb-2">Email</label>
            <input
              type="email"
              placeholder="example@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 md:p-4 text-base md:text-lg border border-gray-500 rounded-lg bg-white focus:ring-4 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-gray-900 text-base md:text-lg mb-2">Password</label>
            <input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 md:p-4 text-base md:text-lg border border-gray-500 rounded-lg bg-white focus:ring-4 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 md:py-4 text-base md:text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-base md:text-lg mt-6 text-center text-gray-800">
          Don&apos;t have an account?{" "}
          <a href="/auth/register" className="text-green-600 hover:underline">
            Register
          </a>
        </p>        <div className="text-sm md:text-base mt-2 text-center text-gray-600">
          <p>
            <a href="/auth/forgot-password" className="text-blue-600 hover:underline">
              Forgot your password?
            </a>
          </p>
        </div>

        {/* Add copyright notice at the bottom */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Thermal-Cell Sdn. Bhd. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
