"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/authContext";
import Navbar from "@/components/Navbar";
import { generateReport } from '@/components/GenerateReport';
import LiveWallpaper from "@/components/LiveWallpaper-2";

// Add consistent class definitions with mobile-first approach
const labelClass = "w-full md:w-44 font-medium text-gray-900 whitespace-nowrap mb-1 md:mb-0";
const inputContainerClass = "w-full md:flex-1 flex items-center space-x-2";
const inputClass = "border p-1.5 rounded w-full bg-gray-100 cursor-not-allowed text-gray-900 text-sm md:text-base";
const unitClass = "text-gray-900 w-16 text-right text-sm md:text-base";
const buttonClass = "w-full px-4 py-2 text-white rounded font-medium transition-colors text-sm md:text-base";

export default function ViewSelection() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [selectionData, setSelectionData] = useState(null);
  const [modelDetails, setModelDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Format date consistently
  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Parse the UTC date string directly without timezone conversion
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Check if user is a superadmin
    const checkAdminStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('email', user.email)
          .single();

        if (error) throw error;

        // Update isAdmin state based on role
        setIsAdmin(data?.role === 'superadmin');
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [user, router]);

  const handleGenerateReport = async () => {
    try {
      const pdfBytes = await generateReport(selectionData, modelDetails);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Use the selection ID from the database record
      link.download = `${selectionData.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      setErrorMessage('Failed to generate report');
    }
  };

  useEffect(() => {
    const fetchSelectionDetails = async () => {
      if (!user || !params.selectionId) return;

      setIsLoading(true);
      try {
        // First, check if the user is a superadmin
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('email', user.email)
          .single();

        const isSuperAdmin = userData?.role === 'superadmin';

        // Fetch selection data
        const { data: selection, error } = await supabase
          .from('selections')
          .select(`
            id,
            user_email,
            project_name,
            client_name,
            location,
            date_created,
            selection_by,
            description,
            water_flow_rate,
            hot_water_temp,
            cold_water_temp,
            wet_bulb_temp,
            dry_bulb_temp,
            atmospheric_pressure,
            cooling_tower_model,
            safety_factor,
            actual_flowrate,
            number_of_cells
          `)
          .eq('id', params.selectionId)
          .single();

        if (error) throw error;
        if (!selection) throw new Error('Selection not found');

        // Check authorization - allow if superadmin or owner
        if (!isSuperAdmin && selection.user_email !== user.email) {
          throw new Error('Unauthorized access');
        }

        // First update the model details fetch in the useEffect
        const { data: modelData, error: modelError } = await supabase
          .from('cooling_tower_models')
          .select('motor_output, fan_diameter, nominal_flowrate')
          .eq('model_name', selection.cooling_tower_model)
          .single();

        if (modelError) throw modelError;

        setSelectionData(selection);
        setModelDetails(modelData);
      } catch (error) {
        console.error('Error:', error);
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSelectionDetails();
  }, [user, params.selectionId]);

  const handlePerformanceCurve = () => {
    if (!selectionData) return;
  
    const params = new URLSearchParams({
      model: selectionData.cooling_tower_model,
      projectName: selectionData.project_name,
      clientName: selectionData.client_name,
      location: selectionData.location,
      selectionBy: selectionData.selection_by,
      flowRate: selectionData.water_flow_rate.toString(),
      pressure: selectionData.atmospheric_pressure.toString(),
      hotWater: selectionData.hot_water_temp.toString(),
      coldWater: selectionData.cold_water_temp.toString(),
      wetBulb: selectionData.wet_bulb_temp.toString(),
      dryBulb: selectionData.dry_bulb_temp.toString(),
      date: new Date(selectionData.date_created).toISOString()
    });
  
    // Match the exact directory casing
    window.open(`/PerformanceCurve?${params.toString()}`, '_blank', 'width=1024,height=768');
  };

  const handleBack = () => {
    // Redirect based on admin status
    router.push(isAdmin ? "/admin-dashboard" : "/user-dashboard");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading selection details...</p>
      </div>
    );
  }

  // Project details fields
  const projectDetailsFields = [
    { label: "Project Name", value: selectionData.project_name },
    { label: "Client Name", value: selectionData.client_name },
    { label: "Location", value: selectionData.location },
    { label: "Date", value: formatDate(selectionData.date_created) },
  ];

  // Input parameters fields
  const inputParametersFields = [
    { label: "Water Flow Rate", value: selectionData.water_flow_rate, unit: "m³/hr" },
    { label: "Atmospheric Pressure", value: selectionData.atmospheric_pressure, unit: "kPa" },
    { label: "Hot Water Temp", value: selectionData.hot_water_temp, unit: "°C" },
    { label: "Cold Water Temp", value: selectionData.cold_water_temp, unit: "°C" },
    { label: "Wet Bulb Temp", value: selectionData.wet_bulb_temp, unit: "°C" },
    { label: "Dry Bulb Temp", value: selectionData.dry_bulb_temp, unit: "°C" },
  ];

  // Split tower selection fields into left and right columns for better layout
  const leftColumnFields = [
    { label: "Tower Model", value: selectionData.cooling_tower_model },
    { label: "Number of Cells", value: selectionData.number_of_cells?.toString() || "1" },
    { label: "Motor Output/Cell", value: modelDetails?.motor_output, unit: "kW" },
    { label: "Fan Diameter", value: modelDetails?.fan_diameter, unit: "mm" },
  ];

  const rightColumnFields = [
    { 
      label: "Nominal Flow Rate/Cell", 
      value: modelDetails?.nominal_flowrate.toFixed(2), 
      unit: "m³/hr" 
    },
    { 
      label: "Actual Flow Rate", 
      value: Number(selectionData.actual_flowrate).toFixed(2), 
      unit: "m³/hr" 
    },
    { 
      label: "Safety Factor", 
      value: Number(selectionData.safety_factor).toFixed(2), 
      unit: "%" 
    },
  ];

  return (
    <div className="flex flex-col min-h-screen relative">
      <LiveWallpaper className="fixed inset-0 -z-10" />
      <Navbar className="relative z-10" />
      <div className="flex-grow p-3 sm:p-6 relative z-10">
        <div className="max-w-4xl mx-auto mt-2 sm:mt-4 p-4 sm:p-6 bg-white shadow-md rounded-md">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">View Selection Details</h2>
          
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errorMessage}
            </div>
          )}
          
          {/* Project Details Header Row */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 md:mb-0">Project Details</h3>
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3">
              <label className={labelClass}>Selection By:</label>
              <div className={inputContainerClass}>
                <input
                  type="text"
                  className={inputClass}
                  value={selectionData.selection_by || ""}
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Project Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-x-8 md:gap-y-4">
            {projectDetailsFields.map(({ label, value }) => (
              <div key={label} className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
                <label className={labelClass}>{label}:</label>
                <div className={inputContainerClass}>
                  <input
                    type="text"
                    className={inputClass}
                    value={value || ""}
                    disabled
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="mt-4 md:mt-6 flex flex-col md:flex-row md:items-start space-y-1 md:space-y-0 md:space-x-3">
            <label className={labelClass}>Description:</label>
            <textarea
              className="border p-2 rounded w-full bg-gray-100 min-h-[4rem] md:min-h-[6rem] resize-y cursor-not-allowed text-gray-900 text-sm md:text-base"
              value={selectionData.description || ""}
              disabled
            />
          </div>

          {/* Input Parameters */}
          <h3 className="text-base md:text-lg font-bold mt-5 md:mt-6 mb-3 md:mb-4 text-gray-900">Input Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-x-8 md:gap-y-4">
            {inputParametersFields.map(({ label, value, unit }) => (
              <div key={label} className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
                <label className={labelClass}>{label}:</label>
                <div className={inputContainerClass}>
                  <input
                    type="text"
                    className={inputClass}
                    value={value || ""}
                    disabled
                  />
                  {unit && <span className={unitClass}>{unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Cooling Tower Selection */}
          <h3 className="text-base md:text-lg font-bold mt-5 md:mt-6 mb-3 md:mb-4 text-gray-900">Cooling Tower Selection</h3>
          
          {/* Cooling Tower Details - Mobile First Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-x-8 md:gap-y-4">
            {/* Left Column Fields */}
            {leftColumnFields.map(({ label, value, unit }) => (
              <div key={label} className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
                <label className={labelClass}>{label}:</label>
                <div className={inputContainerClass}>
                  <input
                    type="text"
                    className={inputClass}
                    value={value || ""}
                    disabled
                  />
                  {unit && <span className={unitClass}>{unit}</span>}
                </div>
              </div>
            ))}

            {/* Right Column Fields */}
            {rightColumnFields.map(({ label, value, unit }) => (
              <div key={label} className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
                <label className={labelClass}>{label}:</label>
                <div className={inputContainerClass}>
                  <input
                    type="text"
                    className={inputClass}
                    value={value || ""}
                    disabled
                  />
                  {unit && <span className={unitClass}>{unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons - Stacked on mobile, side by side on larger screens */}
          <div className="mt-4 md:mt-6">
            <button
              onClick={handlePerformanceCurve}
              className={`${buttonClass} bg-blue-600 hover:bg-blue-700`}
            >
              Generate Performance Curve
            </button>
          </div>

          <div className="mt-3 md:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleGenerateReport}
              className={`${buttonClass} bg-purple-600 hover:bg-purple-700`}
            >
              Generate Report
            </button>
            <button 
              onClick={handleBack}
              className={`${buttonClass} bg-gray-600 hover:bg-gray-700`}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}