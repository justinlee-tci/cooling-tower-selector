"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import LiveWallpaper from "@/components/LiveWallpaper-2";

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

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    console.log("Form submitted");

    try {
      // Check if passwords match
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }

      // Step 1: Sign up with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            company,
            country,
          }
        }
      });

      if (authError) {
        setError(authError.message);
        console.error("Auth error: ", authError);
        setLoading(false);
        return;
      }

      console.log("Auth response:", data);
      
      if (data.user) {
        // Step 2: Insert user into the users table
        const { data: insertData, error: insertError } = await supabase
          .from("users")
          .insert([{
            name,
            email,
            password, // Note: Consider using Supabase Auth only and not storing passwords
            company,
            country,
            role: "user", // Using the ENUM value
            last_logged_in: new Date().toISOString(),
          }])
          .select();

        if (insertError) {
          setError("Database error saving new user: " + insertError.message);
          console.error("Insert error: ", insertError);
          setLoading(false);
        } else {
          console.log("Registration successful, showing verification popup");
          // Show verification popup instead of redirecting
          setRegisteredEmail(email);
          setShowVerificationPopup(true);
          setLoading(false);
          
          // Clear form fields after successful registration
          setName("");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setCompany("");
          setCountry("");
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Close popup when clicking outside
  const handleOutsideClick = (e) => {
    if (e.target.classList.contains("popup-overlay")) {
      setShowVerificationPopup(false);
    }
  };

  // Handle redirection to login page after closing the popup
  const handleClosePopup = () => {
    setShowVerificationPopup(false);
    router.push("/auth/login");
  };

  return (
    <div className="relative z-10 flex items-center justify-center min-h-screen bg-gray-200">
      <LiveWallpaper />
      <div className="bg-white p-4 sm:p-8 rounded-xl shadow-lg w-full max-w-md mx-4">
        {/* Add Logo Image with bottom margin */}
        <div className="flex justify-center mb-6">
          <img 
            src="/company-logo.jpg" 
            alt="Company Logo" 
            className="h-16 sm:h-20 w-auto object-contain"
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-900">Register</h2>
        {error && <p className="text-red-600 text-sm sm:text-base mb-3">{error}</p>}
        <form onSubmit={handleRegister} className="space-y-4">
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
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 text-sm sm:text-base border border-gray-500 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-gray-900 text-sm sm:text-base mb-1">Password</label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 text-sm sm:text-base border border-gray-500 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-gray-900 text-sm sm:text-base mb-1">Confirm Password</label>
            <input
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 text-sm sm:text-base border border-gray-500 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
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
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 text-sm sm:text-base font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 mt-2"
          >
            {loading ? "Processing..." : "Register"}
          </button>
        </form>
        <p className="text-sm sm:text-base mt-4 text-center text-gray-800">
          Already have an account?{" "}
          <a href="/auth/login" className="text-green-600 hover:underline">
            Login
          </a>
        </p>

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
              <h3 className="text-lg font-bold mb-2 text-black">Please Verify Your Email</h3>
              <p className="text-gray-700 mb-3 text-sm">
                We have sent a verification link to <span className="font-medium">{registeredEmail}</span>
              </p>
              <button
                onClick={handleClosePopup}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium text-sm"
              >
                Proceed to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}