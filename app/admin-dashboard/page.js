"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import LiveWallpaper from "@/components/LiveWallpaper-2";
import { toast } from "react-hot-toast";

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [lastLoggedIn, setLastLoggedIn] = useState(null);
  const [selections, setSelections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showDeleteSelectionConfirm, setShowDeleteSelectionConfirm] = useState(false);
  const [selectionToDelete, setSelectionToDelete] = useState(null);
  const [mobileView, setMobileView] = useState(false);
  const [activeTab, setActiveTab] = useState('users'); // For mobile tabs: 'users' or 'selections'
  const [userName, setUserName] = useState('');  // Added state for user's name

  useEffect(() => {
    // Check if screen width is mobile on initial load
    setMobileView(window.innerWidth < 768);

    // Add event listener for window resize
    const handleResize = () => {
      setMobileView(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Redirect non-admin users
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        const { data, error } = await supabase
          .from("users")
          .select("last_logged_in, name")
          .eq("email", user.email)
          .single();
        if (error) {
          console.error("Error fetching user data:", error);
        } else {
          setLastLoggedIn(data?.last_logged_in);
          setUserName(data?.name || ''); // Set the user's name
        }
      };
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    const fetchAllSelections = async () => {
      if (user) {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("selections")
          .select("id, user_email, project_name, location, date_created")
          .order("date_created", { ascending: false });

        if (error) {
          console.error("Error fetching all selections:", error);
          toast.error("Failed to load selections");
        } else {
          setSelections(data || []);
        }
        setIsLoading(false);
      }
    };

    fetchAllSelections();
  }, [user]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'user')
          .order('name');

        if (error) {
          console.error("Error fetching users:", error);
          toast.error("Failed to load users");
        } else {
          setUsers(data || []);
        }
      }
    };

    fetchUsers();
  }, [user]);

  const handleViewSelection = (selectionId) => {
    router.push(`/viewSelection/${selectionId}`);
  };

  const handleDeleteSelection = async () => {
    if (!selectionToDelete) return;
    
    try {
      const { error } = await supabase
        .from("selections")
        .delete()
        .eq("id", selectionToDelete.id);

      if (error) throw error;

      // Remove the deleted selection from the local state
      setSelections(selections.filter(selection => selection.id !== selectionToDelete.id));
      
      toast.success("Selection deleted successfully");
    } catch (error) {
      console.error("Error deleting selection:", error);
      toast.error("Failed to delete selection");
    } finally {
      setShowDeleteSelectionConfirm(false);
      setSelectionToDelete(null);
    }
  };

  const handleViewUser = (email) => {
    router.push(`/viewUser/${encodeURIComponent(email)}`);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Delete from users table only
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('email', userToDelete.email);

      if (dbError) throw dbError;

      setUsers(users.filter(u => u.email !== userToDelete.email));
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setShowDeleteUserConfirm(false);
      setUserToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastLoggedIn = (timestamp) => {
    if (!timestamp) return "No previous login found.";
  
    try {
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        console.error('Invalid timestamp:', timestamp);
        return "Invalid date";
      }
  
      const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZoneName: "short",
      };
  
      return date.toLocaleString("en-US", options);
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return "Invalid date format";
    }
  };

  // Card view for users on mobile
  const UserCardView = () => (
    <div className="space-y-4">
      {users.length === 0 ? (
        <p className="text-center text-gray-600">No users found</p>
      ) : (
        users.map((u) => (
          <div key={u.email} className="bg-white shadow text-gray-900 rounded-lg p-4 border border-gray-200">
            <div className="font-bold text-lg mb-1">{u.name}</div>
            <div className="text-sm text-gray-700 mb-1"><span className="font-medium">Company:</span> {u.company}</div>
            <div className="text-sm text-gray-700 mb-3"><span className="font-medium">Email:</span> {u.email}</div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleViewUser(u.email)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                View
              </button>
              <button
                onClick={() => {
                  setUserToDelete(u);
                  setShowDeleteUserConfirm(true);
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Card view for selections on mobile
  const SelectionCardView = () => (
    <div className="space-y-4">
      {selections.length === 0 ? (
        <p className="text-center text-gray-600">No selections found</p>
      ) : (
        selections.map((selection) => (
          <div key={selection.id} className="bg-white shadow rounded-lg p-4 border border-gray-200">
            <div className="font-bold text-gray-900 text-lg mb-1">{selection.project_name}</div>
            <div className="text-sm text-gray-700 mb-1"><span className="font-medium">User:</span> {selection.user_email}</div>
            <div className="text-sm text-gray-700 mb-1"><span className="font-medium">Location:</span> {selection.location}</div>
            <div className="text-sm text-gray-700 mb-3"><span className="font-medium">Date:</span> {formatDate(selection.date_created)}</div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleViewSelection(selection.id)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                View
              </button>
              <button
                onClick={() => {
                  setSelectionToDelete(selection);
                  setShowDeleteSelectionConfirm(true);
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
  
  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <LiveWallpaper />
      
      <Navbar />
      <div className="flex-grow p-4 md:p-6">
        <div className="bg-white bg-opacity-90 p-4 md:p-8 rounded-2xl shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 md:mt-4 text-center text-base md:text-lg text-gray-800">
            Hello, {userName || user?.email}
          </p>
          {lastLoggedIn && (
            <p className="mt-2 md:mt-4 text-center text-sm md:text-lg text-gray-600">
              Last logged in: {formatLastLoggedIn(lastLoggedIn)}
            </p>
          )}

          {/* Mobile Tab Selector */}
          {mobileView && (
            <div className="flex mt-6 border-b border-gray-200">
              <button 
                className={`flex-1 py-2 text-center font-medium ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('users')}
              >
                User Accounts
              </button>
              <button 
                className={`flex-1 py-2 text-center font-medium ${activeTab === 'selections' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                onClick={() => setActiveTab('selections')}
              >
                All Selections
              </button>
            </div>
          )}

          {/* Desktop Layout */}
          {!mobileView && (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Users Table - Desktop */}
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">User Accounts</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-3 text-left border text-gray-900">Name</th>
                        <th className="p-3 text-left border text-gray-900">Company</th>
                        <th className="p-3 text-left border text-gray-900">Email</th>
                        <th className="p-3 text-center border text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-3 text-center text-gray-600">No users found</td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.email} className="border-b hover:bg-gray-50">
                            <td className="p-3 border text-gray-900">{u.name}</td>
                            <td className="p-3 border text-gray-900">{u.company}</td>
                            <td className="p-3 border text-gray-900">{u.email}</td>
                            <td className="p-3 border text-gray-900">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => handleViewUser(u.email)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    setUserToDelete(u);
                                    setShowDeleteUserConfirm(true);
                                  }}
                                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* All Selections Table - Desktop */}
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">All Selections</h2>
                {isLoading ? (
                  <p className="text-center text-gray-600">Loading selections...</p>
                ) : selections.length === 0 ? (
                  <p className="text-center text-gray-600">No selections found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-3 text-left border text-gray-900">User Email</th>
                          <th className="p-3 text-left border text-gray-900">Project Name</th>
                          <th className="p-3 text-left border text-gray-900">Location</th>
                          <th className="p-3 text-left border text-gray-900">Date Created</th>
                          <th className="p-3 text-center border text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selections.map((selection) => (
                          <tr key={selection.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 border text-gray-900">{selection.user_email}</td>
                            <td className="p-3 border text-gray-900">{selection.project_name}</td>
                            <td className="p-3 border text-gray-900">{selection.location}</td>
                            <td className="p-3 border text-gray-900">{formatDate(selection.date_created)}</td>
                            <td className="p-3 border text-gray-900">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => handleViewSelection(selection.id)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectionToDelete(selection);
                                    setShowDeleteSelectionConfirm(true);
                                  }}
                                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Layout with Tab Content */}
          {mobileView && (
            <div className="mt-4">
              {activeTab === 'users' && (
                <div>
                  <h2 className="text-xl font-bold mb-3 text-gray-900">User Accounts</h2>
                  <UserCardView />
                </div>
              )}

              {activeTab === 'selections' && (
                <div>
                  <h2 className="text-xl font-bold mb-3 text-gray-900">All Selections</h2>
                  {isLoading ? (
                    <p className="text-center text-gray-600">Loading selections...</p>
                  ) : (
                    <SelectionCardView />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {showDeleteUserConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-8 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-900">Confirm Delete</h3>
            <p className="mb-4 md:mb-6 text-gray-700">
              Are you sure you want to delete the user {userToDelete?.name}? This action cannot be undone.
              <br /><br />
              Note: Their past selections will be preserved.
            </p>
            <div className="flex justify-end space-x-3 md:space-x-4">
              <button
                onClick={() => {
                  setShowDeleteUserConfirm(false);
                  setUserToDelete(null);
                }}
                className="px-3 md:px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-3 md:px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm md:text-base"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Selection Confirmation Modal */}
      {showDeleteSelectionConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-8 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-900">Confirm Delete</h3>
            <p className="mb-4 md:mb-6 text-gray-700">
              Are you sure you want to delete the selection "{selectionToDelete?.project_name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 md:space-x-4">
              <button
                onClick={() => {
                  setShowDeleteSelectionConfirm(false);
                  setSelectionToDelete(null);
                }}
                className="px-3 md:px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelection}
                className="px-3 md:px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm md:text-base"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}