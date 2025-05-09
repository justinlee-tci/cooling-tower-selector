"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { toast } from "react-hot-toast";
import LiveWallpaper from "@/components/LiveWallpaper-2";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      // Show success message and redirect
      toast.success("Password reset email sent. Please check your email to reset your password.");
      router.push("/auth/login");
      
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to send password reset email");
      toast.error(err.message || "Failed to send password reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <LiveWallpaper className="fixed inset-0 -z-10" />      <div className="flex-grow flex items-center justify-center p-6 relative z-10">
        <div className="bg-white p-12 rounded-2xl shadow-lg w-[500px]">
          <div className="flex justify-center mb-8">            
            <img 
              src="/company-logo.jpg" 
              alt="Company Logo" 
              className="h-16 md:h-24 w-auto object-contain"
            />
          </div>
          <h2 className="text-3xl font-bold mb-2 mt-16 text-center text-gray-900">Forgot Password</h2>
          <p className="text-center text-gray-600 mb-8">
            Enter your email address and we'll send you instructions to reset your password.
          </p>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-900 text-lg mb-2">Email Address</label>
              <input                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 text-lg border border-gray-500 rounded-lg bg-white focus:ring-4 focus:ring-blue-500 text-gray-900"
                placeholder="Enter your email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 text-lg font-semibold rounded-lg ${
                loading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white transition-colors`}
            >
              {loading ? "Sending..." : "Send Reset Instructions"}
            </button>

            <div className="text-center">
              <Link
                href="/auth/login"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
