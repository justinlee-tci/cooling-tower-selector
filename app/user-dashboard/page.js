"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import LiveWallpaper from "@/components/LiveWallpaper-2";
import { toast } from "react-hot-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [lastLoggedIn, setLastLoggedIn] = useState(null);
  const [selections, setSelections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileView, setMobileView] = useState(false);
  const [showDeleteSelectionConfirm, setShowDeleteSelectionConfirm] = useState(false);
  const [selectionToDelete, setSelectionToDelete] = useState(null);

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
    const fetchSelections = async () => {
      if (user) {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("selections")
          .select("id, project_name, location, date_created")
          .eq("user_email", user.email)
          .order("date_created", { ascending: false });

        if (error) {
          console.error("Error fetching selections:", error);
          toast.error("Failed to load past selections");
        } else {
          setSelections(data || []);
        }
        setIsLoading(false);
      }
    };

    fetchSelections();
  }, [user]);

  const handleViewSelection = (selectionId) => {
    router.push(`/viewSelection/${selectionId}`);
  };

  const handleDeleteClick = (selection) => {
    setSelectionToDelete(selection);
    setShowDeleteSelectionConfirm(true);
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
      // Show success message
      toast.success("Selection deleted successfully", {
      duration: 1000 // 2 seconds
      });
    } catch (error) {
      console.error("Error deleting selection:", error);
      toast.error("Failed to delete selection");
    } finally {
      setShowDeleteSelectionConfirm(false);
      setSelectionToDelete(null);
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
  
  // Card view for mobile display
  const SelectionCardView = () => (
    <div className="space-y-4">
      {selections.map((selection) => (
        <div key={selection.id} className="bg-white shadow rounded-lg p-4 border border-gray-200">
          <div className="font-bold text-gray-900 text-lg mb-1">{selection.project_name}</div>
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
              onClick={() => handleDeleteClick(selection)}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
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
          <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-900">Welcome to your Dashboard!</h1>
          <p className="mt-2 md:mt-4 text-center text-base md:text-lg text-gray-800">
            Hello, {user?.user_metadata?.name || user?.email}
          </p>
          {lastLoggedIn && (
            <p className="mt-2 md:mt-4 text-center text-sm md:text-lg text-gray-600">
              Last logged in: {formatLastLoggedIn(lastLoggedIn)}
            </p>
          )}

          <div className="mt-6 md:mt-8">
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-gray-900">Past Selections</h2>
            {isLoading ? (
              <p className="text-center text-gray-600">Loading selections...</p>
            ) : selections.length === 0 ? (
              <p className="text-center text-gray-600">No past selections found.</p>
            ) : mobileView ? (
              // Mobile card view
              <SelectionCardView />
            ) : (
              // Desktop table view
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left border text-gray-900">Project Name</th>
                      <th className="p-3 text-left border text-gray-900">Location</th>
                      <th className="p-3 text-left border text-gray-900">Date Created</th>
                      <th className="p-3 text-center border text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selections.map((selection) => (
                      <tr key={selection.id} className="border-b hover:bg-gray-50">
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
                              onClick={() => handleDeleteClick(selection)}
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

      {showDeleteSelectionConfirm && (
        <div className="fixed inset-0 bg-opacity-40 flex items-center backdrop-blur-sm justify-center z-50 p-4">
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