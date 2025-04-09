"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { toast } from "react-hot-toast";

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [lastLoggedIn, setLastLoggedIn] = useState(null);
  const [selections, setSelections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    // Redirect non-admin users
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      const fetchLastLoggedIn = async () => {
        const { data, error } = await supabase
          .from("users")
          .select("last_logged_in")
          .eq("email", user.email)
          .single();
        if (error) {
          console.error("Error fetching last logged in time:", error);
        } else {
          setLastLoggedIn(data?.last_logged_in);
        }
      };
      fetchLastLoggedIn();
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
          .eq('role', 'user')  // Filter users to only those with role = 'user'
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

  const handleDeleteSelection = async (selectionId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this selection?");
    
    if (confirmDelete) {
      try {
        const { error } = await supabase
          .from("selections")
          .delete()
          .eq("id", selectionId);

        if (error) throw error;

        // Remove the deleted selection from the local state
        setSelections(selections.filter(selection => selection.id !== selectionId));
        
        toast.success("Selection deleted successfully");
      } catch (error) {
        console.error("Error deleting selection:", error);
        toast.error("Failed to delete selection");
      }
    }
  };

  const handleViewUser = (email) => {
    router.push(`/viewUser/${encodeURIComponent(email)}`);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Delete from Supabase Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(
        userToDelete.id
      );
      if (authError) throw authError;

      // Delete from users table
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
      setShowDeleteConfirm(false);
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
    
    // Parse the UTC timestamp
    const utcDate = new Date(timestamp);
    
    // Format with explicit timezone handling
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
    
    return utcDate.toLocaleString("en-US", options);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-200">
      <Navbar />
      <div className="flex-grow p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-bold text-center text-gray-900">Admin Dashboard</h1>
          <p className="mt-4 text-center text-lg text-gray-800">Hello, {user?.email}</p>
          {lastLoggedIn && (
            <p className="mt-4 text-center text-lg text-gray-600">
              Last logged in: {formatLastLoggedIn(lastLoggedIn)}
            </p>
          )}

          <div className="mt-8 grid grid-cols-2 gap-8">
            {/* Users Table - Updated to show only users with role 'user' */}
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
                                  setShowDeleteConfirm(true);
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

            {/* All Selections Table */}
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
                                onClick={() => handleDeleteSelection(selection.id)}
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
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Confirm Delete</h3>
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete the user {userToDelete?.name}? This action cannot be undone.
              <br /><br />
              Note: Their past selections will be preserved.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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