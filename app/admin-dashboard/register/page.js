"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import LiveWallpaper from "@/components/LiveWallpaper-2";
import Navbar from "@/components/Navbar";

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

// Function to generate dynamic password based on name and company
const generatePassword = (email) => {
  if (!email) return "";

  const username = email.split('@')[0];
  const cleaned = username.replace(/[^a-zA-Z0-9]/g, '');
  const firstFour = cleaned.substring(0, 4).toUpperCase();

  return `${firstFour}Welcome-Thermal-Cell!${firstFour}`;
};

// Add this email validation function at the top with other functions
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};


export default function AdminRegister() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");

  // Generate password whenever name or company changes
  useEffect(() => {
    const password = generatePassword(email);
    setGeneratedPassword(password);
  }, [email]);

  // Check if the current user is a superadmin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("email", user.email)
        .single();

      if (error || data?.role !== "superadmin") {
        toast.error("Only superadmins can access this page");
        router.push("/admin-dashboard");
        return;
      }

      setIsSuperAdmin(true);
    };

    checkSuperAdmin();
  }, [user, router]);

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address (e.g., user@domain.com)");
      return;
    }
    
    // Show confirmation popup instead of directly registering
    setShowConfirmation(true);
  };

  const confirmRegister = async () => {
    if (!isSuperAdmin) return;

    setError(null);
    setLoading(true);
    setShowConfirmation(false);

    const dynamicPassword = generatePassword(email);

    try {
      console.log("Registering user with password:", dynamicPassword);
      
      // Step 1: Sign up with Supabase Auth using the dynamic password
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password: dynamicPassword,
        options: {
          data: {
            name,
            company,
            country,
          }
        }
      });

      if (authError) {
        setError("Authentication error: " + authError.message);
        console.error("Auth error: ", authError);
        setLoading(false);
        return;
      }

      console.log("Auth signup successful, user:", data?.user?.email);

      // Step 2: Insert user into the users table
      if (data.user) {
        const { error: insertError } = await supabase
          .from("users")
          .insert([{
            email, // Using email as primary key (matches your schema)
            name,
            password: dynamicPassword, // Store the generated password
            company,
            country,
            role: "user",
            last_logged_in: null
          }]);

        if (insertError) {
          if (insertError.code === '23505') {
            setError("User already exists, please proceed to login with email");
          } else {
            setError("Database error saving new user: " + insertError.message);
          }
          console.error("Insert error: ", insertError);
          setLoading(false);
          return;
        }

        // Show success message and clean up
        setRegisteredEmail(email);
        setShowVerificationPopup(true);
        setLoading(false);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to register user");
      setLoading(false);
    }
  };

  // Close popup when clicking outside
  const handleOutsideClick = (e) => {
    if (e.target.classList.contains("popup-overlay")) {
      setShowVerificationPopup(false);
    }
  };

  // Handle closing the popup and returning to admin dashboard
  const handleClosePopup = () => {
    setShowVerificationPopup(false);
      // Clear form fields after closing the popup
  setName("");
  setEmail("");
  setCompany("");
  setCountry("");
    // Stay on the same page (registration page) or go back to admin dashboard
    router.push("/admin-dashboard");
  };

  return (
    <>
    <LiveWallpaper />
      <Navbar />
      <div className="flex-grow flex items-center justify-center p-6 relative z-10">
        {/* Add relative and z-10 to ensure content is above the wallpaper */}
        <div className="bg-white p-12 rounded-2xl shadow-lg w-[500px]">
            {/* Add Logo Image with bottom margin */}
          <div className="flex justify-center mb-6">
            <img 
              src="/company-logo.jpg" 
              alt="Company Logo" 
              className="h-16 sm:h-20 w-auto object-contain"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-900">Register New User</h2>
          {error && <p className="text-red-600 text-sm sm:text-base mb-3">{error}</p>}
          
          {/* Dynamic password notice */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Note:</span> Password will be automatically generated based on name and company:
            </p>
            {generatedPassword && (
              <p className="text-sm text-blue-800 mt-1">
                <span className="font-medium">Generated Password:</span>
                <span className="font-medium ml-1 bg-blue-100 px-2 py-1 rounded">{generatedPassword}</span>
              </p>
            )}
            <p className="text-sm text-blue-800 mt-1">
              Please make sure to include this password in your communication to the user.
            </p>
          </div>
          
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-900 text-sm sm:text-base mb-1">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 text-sm sm:text-base border border-gray-500 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-gray-900 text-sm sm:text-base mb-1">Email</label>
              <input
                type="email"
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error && isValidEmail(e.target.value)) {
                    setError(null);
                  }
                }}
                pattern="[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                className="w-full p-3 text-sm sm:text-base border border-gray-500 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
              {email && !isValidEmail(email) && (
                <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
              )}
            </div>
            <div>
              <label className="block text-gray-900 text-sm sm:text-base mb-1">Company</label>
              <input
                type="text"
                placeholder="Your Company Name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full p-3 text-sm sm:text-base border border-gray-500 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-gray-900 text-sm sm:text-base mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full p-3 text-sm sm:text-base border border-gray-500 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-gray-900"
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
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => router.push("/admin-dashboard")}
                className="w-1/2 bg-gray-500 text-white py-3 text-sm sm:text-base font-semibold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !generatedPassword}
                className="w-1/2 bg-blue-600 text-white py-3 text-sm sm:text-base font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                {loading ? "Processing..." : "Register User"}
              </button>
            </div>
          </form>

          {/* Add copyright notice at the bottom */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Thermal-Cell Sdn. Bhd. All rights reserved.</p>
          </div>
        </div>

        {/* Email Verification Popup */}
        {showVerificationPopup && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 popup-overlay p-4"
            onClick={handleOutsideClick}
          >
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-xs sm:max-w-sm relative">
              <button 
                onClick={handleClosePopup}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-green-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-bold mb-2 text-black">User Registration Successful</h3>
                <p className="text-gray-700 mb-3 text-sm">
                  We have sent a verification link to <span className="font-medium">{registeredEmail}</span>. 
                </p>
                <p className="text-gray-700 mb-4 text-sm">
                  The verification email contains instructions to complete their registration. 
                  They will need to use this generated password for initial login:
                </p>
                <p className="font-medium bg-gray-100 px-3 py-2 rounded mb-4 text-gray-900">
                  {generatedPassword}
                </p>
                <button
                  onClick={handleClosePopup}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium text-sm"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Registration Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Semi-transparent backdrop */}
          <div className="absolute inset-0 bg-opacity-40 backdrop-blur-sm" />
         
          {/* Modal content */}
          <div className="relative bg-white/90 p-4 md:p-6 rounded-lg shadow-xl w-11/12 max-w-md mx-auto backdrop-blur-md border border-gray-200">
            <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-900">Confirm Registration</h2>
            <p className="mb-4 md:mb-6 text-gray-800 text-sm md:text-base">
              Are you sure you want to register the following user?
            </p>
            
            {/* User details summary */}
            <div className="mb-4 md:mb-6 p-3 bg-gray-50 rounded-lg border">
              <div className="space-y-2 text-sm">
                <div><span className="font-medium text-gray-900">Name:</span> <span className="text-gray-700">{name}</span></div>
                <div><span className="font-medium text-gray-900">Email:</span> <span className="text-gray-700">{email}</span></div>
                <div><span className="font-medium text-gray-900">Company:</span> <span className="text-gray-700">{company}</span></div>
                <div><span className="font-medium text-gray-900">Country:</span> <span className="text-gray-700">{country}</span></div>
                <div><span className="font-medium text-gray-900">Generated Password:</span> <span className="text-gray-700 font-mono bg-gray-200 px-1 rounded">{generatedPassword}</span></div>
              </div>
            </div>
           
            {error && (
              <p className="mb-3 md:mb-4 text-red-600 text-xs md:text-sm">{error}</p>
            )}
           
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-3 md:px-4 py-1.5 md:py-2 rounded bg-gray-600 text-white hover:bg-gray-700 font-medium transition-colors text-sm md:text-base"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={confirmRegister}
                disabled={loading}
                className="px-3 md:px-4 py-1.5 md:py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 font-medium transition-colors flex items-center space-x-2 text-sm md:text-base"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin mr-1 md:mr-2">⏳</span>
                    <span>Registering...</span>
                  </>
                ) : (
                  "Confirm Registration"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}