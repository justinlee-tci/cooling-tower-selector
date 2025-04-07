"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const tryRecoverSession = async () => {
      const hash = window.location.hash;
      if (!hash.includes("access_token") || !hash.includes("type=recovery")) {
        return;
      }

      await supabase.auth.exchangeCodeForSession(hash);
    };

    tryRecoverSession();
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No authenticated user found");
      }

      // Update auth password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      // Update users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          password: password,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);

      if (dbError) {
        throw dbError;
      }

      toast.success("Password updated successfully");
      router.push("/auth/login");
    } catch (err) {
      console.error("Reset error:", err);
      setError(err.message || "Failed to reset password");
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-200">
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-2xl shadow-lg w-[500px]">
          <h2 className="text-3xl font-bold mb-2 text-center text-gray-900">Reset Your Password</h2>
          <p className="text-center text-gray-600 mb-8">Enter your new password below</p>

          {error && <p className="text-red-600 text-lg mb-4">{error}</p>}

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-gray-900 text-lg mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 text-lg border border-gray-500 rounded-lg bg-white focus:ring-4 focus:ring-blue-500 text-gray-900"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-900 text-lg mb-2">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 text-lg border border-gray-500 rounded-lg bg-white focus:ring-4 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
