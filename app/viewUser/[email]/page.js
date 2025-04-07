"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { toast } from "react-hot-toast";

export default function ViewUserPage() {
  const router = useRouter();
  const params = useParams();
  const userEmail = params?.email ? decodeURIComponent(params.email) : null;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  const [originalValues, setOriginalValues] = useState({});
  const [showPasswordResetConfirmation, setShowPasswordResetConfirmation] = useState(false);

  // Country list
  const countries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
    "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic",
    "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti",
    "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia",
    "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
    "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
    "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
    "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia",
    "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
    "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
    "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
    "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino",
    "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
    "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Swaziland", "Sweden",
    "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
    "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
  ].sort();

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [lastLoggedIn, setLastLoggedIn] = useState(null);

  useEffect(() => {
    if (!userEmail) {
      router.push('/admin-dashboard');
      return;
    }
    fetchUserData();
  }, [userEmail, router]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: userData, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("email", userEmail)
        .single();

      if (dbError) throw dbError;

      // Set form values
      setName(userData.name || "");
      setEmail(userData.email || "");
      setCompany(userData.company || "");
      setCountry(userData.country || "");
      setLastLoggedIn(userData.last_logged_in || null);

      // Store original values
      setOriginalValues({
        name: userData.name || "",
        company: userData.company || "",
        country: userData.country || ""
      });
    } catch (err) {
      console.error("Error fetching user:", err);
      toast.error("Failed to fetch user details");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate inputs
    if (!name.trim() || !company.trim() || !country) {
      setError("All fields are required");
      return;
    }

    const changes = {};

    // Compare current values with original values from database
    if (name.trim() !== originalValues.name) {
      changes.name = name.trim();
    }
    if (company.trim() !== originalValues.company) {
      changes.company = company.trim();
    }
    if (country !== originalValues.country) {
      changes.country = country;
    }

    if (Object.keys(changes).length === 0) {
      setError("No changes to save");
      return;
    }

    setPendingChanges(changes);
    setShowConfirmation(true);
  };

  const handleCancelSave = () => {
    setShowConfirmation(false);
    setPendingChanges({});
  };

  const handleConfirmSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const { error: dbError } = await supabase
        .from("users")
        .update(pendingChanges)
        .eq("email", userEmail);

      if (dbError) throw dbError;

      setSuccess("Changes saved successfully");
      setPendingChanges({});
      setShowConfirmation(false);
      await fetchUserData();
      
      toast.success("User information updated successfully");
    } catch (err) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save changes");
      toast.error(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    try {
      setSendingReset(true);
      setError(null);
      
      // Use Supabase's built-in password reset functionality
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      setShowPasswordResetConfirmation(false);
      toast.success(`Password reset email sent to ${userEmail}`);
      setSuccess(`Password reset email sent to ${userEmail}`);
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to send password reset email");
      toast.error(err.message || "Failed to send password reset email");
    } finally {
      setSendingReset(false);
    }
  };

  const formatLastLoggedIn = (timestamp) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString("en-GB", {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-200">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <p className="text-xl text-gray-700">Loading user details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-200">
      <Navbar />
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-2xl shadow-lg w-[500px]">
          <h2 className="text-3xl font-bold mb-2 text-center text-gray-900">User Details</h2>
          <p className="text-center text-gray-600 mb-2">Edit user information</p>
          <p className="text-center text-gray-500 mb-8">
            Last logged in: {formatLastLoggedIn(lastLoggedIn)}
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
                className="w-full p-4 text-lg border border-gray-500 rounded-lg bg-white focus:ring-4 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-900 text-lg mb-2">Email</label>
              <input
                type="email"
                value={email}
                className="w-full p-4 text-lg border border-gray-500 rounded-lg bg-gray-100 text-gray-900"
                disabled
              />
              <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-gray-900 text-lg mb-2">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full p-4 text-lg border border-gray-500 rounded-lg bg-white focus:ring-4 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-gray-900 text-lg mb-2">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full p-4 text-lg border border-gray-500 rounded-lg bg-white focus:ring-4 focus:ring-blue-500 text-gray-900"
                required
              >
                <option value="">Select a country</option>
                {countries.map((countryName) => (
                  <option key={countryName} value={countryName}>
                    {countryName}
                  </option>
                ))}
              </select>
            </div>

            {/* Password Reset Section */}
            <div className="border-t border-gray-300 pt-6 mt-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Password Management</h3>
              <p className="text-sm text-gray-700 mb-4">
                You can send a password reset email to this user. They will receive an email with instructions to reset their password.
              </p>
              
              <button
                type="button"
                onClick={() => setShowPasswordResetConfirmation(true)}
                className="w-full bg-amber-500 text-white py-3 text-lg font-semibold rounded-lg hover:bg-amber-600"
              >
                Send Password Reset Email
              </button>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => router.push('/admin-dashboard')}
                className="flex-1 bg-gray-600 text-white py-4 text-lg font-semibold rounded-lg hover:bg-gray-700"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-4 text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Profile Changes Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Confirm Changes</h3>
              <div className="mb-6">
                <p className="mb-4 text-gray-700">Are you sure you want to save these changes?</p>
                <ul className="text-sm text-gray-700 mb-4 pl-5 list-disc">
                  {Object.entries(pendingChanges).map(([field, value]) => (
                    <li key={field}>Update {field} to: {value}</li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleCancelSave}
                  className="px-4 py-2 border text-gray-700 border-gray-300 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Confirmation Modal */}
        {showPasswordResetConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Confirm Password Reset</h3>
              <div className="mb-6">
                <p className="mb-4 text-gray-700">
                  Are you sure you want to send a password reset email to <span className="font-semibold">{userEmail}</span>?
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  The user will receive an email with instructions to create a new password.
                </p>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowPasswordResetConfirmation(false)}
                  className="px-4 py-2 border text-gray-700 border-gray-300 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendPasswordReset}
                  className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600"
                  disabled={sendingReset}
                >
                  {sendingReset ? "Sending..." : "Send Reset Email"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}