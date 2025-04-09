"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { toast } from "react-hot-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [lastLoggedIn, setLastLoggedIn] = useState(null);
  const [selections, setSelections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastLoggedIn = (timestamp) => {
    if (!timestamp) return "No previous login found.";
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short", // Includes the local timezone abbreviation
    };
    return new Date(timestamp).toLocaleString("en-US", options); // Converts UTC to local timezone
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-200">
      <Navbar />
      <div className="flex-grow p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-bold text-center text-gray-900">Welcome to the User Dashboard!</h1>
          <p className="mt-4 text-center text-lg text-gray-800">Hello, {user?.email}</p>
          {lastLoggedIn && (
            <p className="mt-4 text-center text-lg text-gray-600">
              Last logged in: {formatLastLoggedIn(lastLoggedIn)}
            </p>
          )}

          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Past Selections</h2>
            {isLoading ? (
              <p className="text-center text-gray-600">Loading selections...</p>
            ) : selections.length === 0 ? (
              <p className="text-center text-gray-600">No past selections found.</p>
            ) : (
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
  );
}