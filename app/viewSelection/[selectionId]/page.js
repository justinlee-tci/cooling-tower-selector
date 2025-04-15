"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/authContext";
import Navbar from "@/components/Navbar";
import { generateReport } from '@/components/GenerateReport';
import LiveWallpaper from "@/components/LiveWallpaper-2";

export default function ViewSelection() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [selectionData, setSelectionData] = useState(null);
  const [modelDetails, setModelDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Reuse constants from Step3Confirmation
  const labelClass = "w-44 font-medium text-gray-900 whitespace-nowrap";
  const inputContainerClass = "flex-1 flex items-center space-x-2";
  const inputClass = "border p-1.5 rounded w-full bg-gray-100 cursor-not-allowed text-gray-900";
  const unitClass = "text-gray-900 w-16 text-right";

  // Replace the existing formatDate function
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
        toast.error('Failed to generate report');
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
            actual_capacity,
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

        // Rest of your existing code...
        const { data: modelData, error: modelError } = await supabase
          .from('cooling_tower_models')
          .select('motor_output, fan_diameter, nominal_capacity')
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

  const leftColumnFields = [
    { label: "Tower Model", key: "towerModel", value: selectionData.cooling_tower_model },
    { label: "Number of Cells", key: "numberOfCells", value: selectionData.number_of_cells?.toString() || "1" },
    { label: "Motor Output/Cell", key: "motorOutput", value: modelDetails?.motor_output, unit: "kW" },
    { label: "Fan Diameter", key: "fanDiameter", value: modelDetails?.fan_diameter, unit: "mm" },
  ];

  const rightColumnFields = [
    { label: "Nominal Capacity/Cell", key: "nominalCapacity", value: modelDetails?.nominal_capacity, unit: "m³/hr" },
    { label: "Actual Capacity", key: "actualCapacity", value: Number(selectionData.actual_capacity).toFixed(2), unit: "m³/hr" },
    { label: "Safety Factor", key: "safetyFactor", value: Number(selectionData.safety_factor).toFixed(2), unit: "%" },
  ];

  return (
    <div className="flex flex-col min-h-screen relative">
      <LiveWallpaper className="fixed inset-0 -z-10" />
      <Navbar className="relative z-10" />
      <div className="flex-grow p-6 relative z-10">
        <div className="max-w-4xl mx-auto mt-4 p-6 bg-white shadow-md rounded-md">
          <h2 className="text-xl font-bold text-gray-900 mb-6">View Selection Details</h2>
          
          {/* Project Details Header Row */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Project Details</h3>
            <div className="flex items-center space-x-3">
              <label className={labelClass}>Selection By:</label>
              <input
                type="text"
                className="border p-1.5 rounded w-64 bg-gray-100 cursor-not-allowed text-gray-900"
                value={selectionData.selection_by || ""}
                disabled
              />
            </div>
          </div>

          {/* Project Details Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: "Project Name", key: "projectName", value: selectionData.project_name },
              { label: "Client Name", key: "clientName", value: selectionData.client_name },
              { label: "Location", key: "location", value: selectionData.location },
              { label: "Date", key: "date", value: formatDate(selectionData.date_created) },
            ].map(({ label, key, value }) => (
              <div key={key} className="flex items-center space-x-3">
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
          <div className="mt-6 flex items-start space-x-3">
            <label className={labelClass}>Description:</label>
            <textarea
              className="border p-2 rounded flex-1 bg-gray-100 min-h-[6rem] resize-y cursor-not-allowed text-gray-900"
              value={selectionData.description || ""}
              disabled
            />
          </div>

          {/* Input Parameters */}
          <h3 className="text-lg font-bold mt-6 mb-4 text-gray-900">Input Parameters</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: "Water Flow Rate", key: "waterFlowRate", value: selectionData.water_flow_rate, unit: "m³/hr" },
              { label: "Atmospheric Pressure", key: "atmosphericPressure", value: selectionData.atmospheric_pressure, unit: "kPa" },
              { label: "Hot Water Temp", key: "hotWaterTemp", value: selectionData.hot_water_temp, unit: "°C" },
              { label: "Cold Water Temp", key: "coldWaterTemp", value: selectionData.cold_water_temp, unit: "°C" },
              { label: "Wet Bulb Temp", key: "wetBulbTemp", value: selectionData.wet_bulb_temp, unit: "°C" },
              { label: "Dry Bulb Temp", key: "dryBulbTemp", value: selectionData.dry_bulb_temp, unit: "°C" },
            ].map(({ label, key, value, unit }) => (
              <div key={key} className="flex items-center space-x-3">
                <label className={labelClass}>{label}:</label>
                <div className={inputContainerClass}>
                  <input
                    type="text"
                    className={inputClass}
                    value={value || ""}
                    disabled
                  />
                  <span className={unitClass}>{unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cooling Tower Selection */}
          <h3 className="text-lg font-bold mt-6 mb-4 text-gray-900">Cooling Tower Selection</h3>
          <div className="grid grid-cols-2 gap-x-8">
            {/* Left Column */}
            <div className="space-y-4">
              {leftColumnFields.map(({ label, key, value, unit }) => (
                <div key={key} className="flex items-center space-x-3">
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
            {/* Right Column */}
            <div className="space-y-4">
              {rightColumnFields.map(({ label, key, value, unit }) => (
                <div key={key} className="flex items-center space-x-3">
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
              
              {/* Performance Curve Button */}
              <div className="flex items-center space-x-3">
                <div className="w-44"></div> {/* Spacer to align with other inputs */}
                <button
                  onClick={handlePerformanceCurve}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition-colors"
                >
                  Generate Performance Curve
                </button>
              </div>

              {/* Generate Report Button */}
              <div className="flex items-center space-x-3">
                <div className="w-44"></div> {/* Spacer to align with other inputs */}
                <button
                  onClick={handleGenerateReport}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium transition-colors"
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8 flex justify-start">
            <button 
              onClick={handleBack}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}