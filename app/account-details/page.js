"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar"; // Import the Navbar component

export default function UserDetails() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("user");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [pendingChanges, setPendingChanges] = useState({});
  const [currentPassword, setCurrentPassword] = useState("");

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        console.error("Auth error:", authError);
        router.push("/auth/login");
        return;
      }

      const { data: userData, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("email", authUser.email)
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        setError("Failed to fetch user details");
        setLoading(false);
        return;
      }

      // Set user data
      setUser({
        name: userData.name || "",
        email: userData.email || "",
        company: userData.company || "",
        country: userData.country || "",
        password: userData.password || "",
      });
      setUserRole(userData.role || "user");
      setName(userData.name || "");
      setEmail(userData.email || "");
      setCompany(userData.company || "");
      setCountry(userData.country || "");
      setCurrentPassword(userData.password || ""); // Store current password
      setLoading(false);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
  
    setError(null);
    setSuccess(null);
  
    if (password) {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
  
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
  
      if (password === currentPassword) {
        setError("New password must be different from the old password");
        return;
      }
    }
  
    const changes = {};
  
    // Compare each field with the `user` object and add to changes only if different
    if (userRole === "superadmin") {
      if (name.trim() !== user.name) changes.name = name;
      if (company.trim() !== user.company) changes.company = company;
      if (country.trim() !== user.country) changes.country = country;
    }
  
    if (password) {
      changes.password = password;
    }
  
    if (Object.keys(changes).length === 0) {
      setError("No changes to save");
      return;
    }
  
    setPendingChanges(changes);
    setShowConfirmation(true);
  };
  

  const handleConfirmSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
  
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("User session not found. Please log in again.");
      }

      if (pendingChanges.password) {
        const { error: authError } = await supabase.auth.updateUser({
          password: pendingChanges.password,
        });

        if (authError) {
          throw new Error(`Auth error: ${authError.message}`);
        }

        const { error: dbError } = await supabase
          .from("users")
          .update({ password: pendingChanges.password }) 
          .eq("email", email);
  
        if (dbError) {
          throw new Error(`Database update error: ${dbError.message}`);
        }
      }

      const updateData = {};
      if (userRole === "superadmin") {
        if (pendingChanges.name) updateData.name = pendingChanges.name;
        if (pendingChanges.company) updateData.company = pendingChanges.company;
        if (pendingChanges.country) updateData.country = pendingChanges.country;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: dbError } = await supabase
          .from("users")
          .update(updateData)
          .eq("email", email);
  
        if (dbError) {
          throw new Error(`Database update error: ${dbError.message}`);
        }
      }

      setPassword("");
      setConfirmPassword("");
      setPendingChanges({});
      setSuccess("Your changes have been saved successfully");
      setPendingChanges({});
setShowConfirmation(false);


      await fetchUserData();
    } catch (err) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSave = () => {
    setShowConfirmation(false);
    setPendingChanges({});
  };

  const handleBackClick = () => {
    if (userRole === "superadmin") {
      router.push("/admin-dashboard");
    } else {
      router.push("/user-dashboard");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-200">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-md">
            <p className="text-xl text-center text-black">Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-200">
      <Navbar />
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-2xl shadow-lg w-[500px]">
          <h2 className="text-3xl font-bold mb-2 text-center text-gray-900">Account Details</h2>
          <p className="text-center text-gray-600 mb-8">
            {userRole === "superadmin" ? "Admin mode - All fields editable" : "User mode - Password editable only"}
          </p>
          {error && <p className="text-red-600 text-lg mb-4">{error}</p>}
          {success && <p className="text-green-600 text-lg mb-4">{success}</p>}
          <form onSubmit={handleSaveClick} className="space-y-6">
            <div>
              <label className="block text-gray-900 text-lg mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full p-4 text-lg border border-gray-500 rounded-lg ${userRole !== "superadmin" ? "bg-gray-100" : "bg-white focus:ring-4 focus:ring-blue-500"} text-gray-900`}
                required
                disabled={userRole !== "superadmin"}
              />
            </div>
            <div>
              <label className="block text-gray-900 text-lg mb-2">Email</label>
              <input
                type="email"
                value={email}
                className="w-full p-4 text-lg border border-gray-500 rounded-lg bg-gray-100 text-gray-900"
                required
                disabled
              />
              <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-gray-900 text-lg mb-2">New Password</label>
              <input
                type="password"
                placeholder="Leave blank to keep current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 text-lg border border-gray-500 rounded-lg bg-white focus:ring-4 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-gray-900 text-lg mb-2">Confirm New Password</label>
              <input
                type="password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 text-lg border border-gray-500 rounded-lg bg-white focus:ring-4 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-gray-900 text-lg mb-2">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={`w-full p-4 text-lg border border-gray-500 rounded-lg ${userRole !== "superadmin" ? "bg-gray-100" : "bg-white focus:ring-4 focus:ring-blue-500"} text-gray-900`}
                required
                disabled={userRole !== "superadmin"}
              />
            </div>
            <div>
              <label className="block text-gray-900 text-lg mb-2">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={`w-full p-4 text-lg border border-gray-500 rounded-lg ${userRole !== "superadmin" ? "bg-gray-100" : "bg-white focus:ring-4 focus:ring-blue-500"} text-gray-900`}
                required
                disabled={userRole !== "superadmin"}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-4 text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={handleBackClick}
              className="w-full bg-red-600 text-white py-4 text-lg font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400 mt-4"
            >
              Back to {userRole === "superadmin" ? "Admin Dashboard" : "User Dashboard"}
            </button>
          </form>
          
          {userRole !== "superadmin" && (
            <p className="text-sm text-gray-500 mt-6 text-center">
              To edit other fields, please contact your administrator.
            </p>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
              <h3 className="text-xl font-bold mb-4 text-black">Confirm Changes</h3>
              
              <div className="mb-6">
                <p className="mb-4 text-black">Are you sure you want to save these changes?</p>
                
                <ul className="text-sm text-gray-700 mb-4 pl-5 list-disc">
                  {pendingChanges.password && (
                    <li>Change password</li>
                  )}
                  {pendingChanges.name && (
                    <li>Update name to: {pendingChanges.name}</li>
                  )}
                  {pendingChanges.company && (
                    <li>Update company to: {pendingChanges.company}</li>
                  )}
                  {pendingChanges.country && (
                    <li>Update country to: {pendingChanges.country}</li>
                  )}
                </ul>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleCancelSave}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-black"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}