"use client";
import { useSelection } from "./SelectionContext";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast"; // Add this import for notifications
import { generateReport } from '@/components/GenerateReport';

// Add consistent class definitions with mobile-first approach
const labelClass = "w-full md:w-44 font-medium text-gray-900 whitespace-nowrap mb-1 md:mb-0";
const inputContainerClass = "w-full md:flex-1 flex items-center space-x-2";
const inputClass = "border p-1.5 rounded w-full bg-gray-100 cursor-not-allowed text-gray-900 text-sm md:text-base";
const unitClass = "text-gray-900 w-16 text-right text-sm md:text-base";

// Date utility functions for consistent handling
const formatDateForDisplay = (dateString) => {
  if (!dateString) return "";
  
  // If it's an ISO string or has time component, extract just the date part
  if (dateString.includes('T') || dateString.includes(' ')) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Otherwise return as is (already in YYYY-MM-DD format)
  return dateString;
};

const normalizeDateForStorage = (dateString) => {
  if (!dateString) return null;
  
  // Add 12 hours to avoid any potential date boundary issues with timezones
  // This ensures the date is the same regardless of timezone
  const date = new Date(`${dateString}T12:00:00Z`);
  
  // Return ISO string for storage
  return date.toISOString();
};

// Add this function at the top of your component after the constants
const generateSelectionId = async (projectName, modelName, numberOfCells) => {
  try {
    // Clean up project name (remove spaces and special characters)
    const cleanProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const cleanModelName = modelName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    // Get the current timestamp in the format YYYYMMDDHHMMSS
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    // Combine all parts with underscores
    return `${cleanProjectName}_${cleanModelName}_${numberOfCells}_${timestamp}`;
  } catch (error) {
    console.error('Error generating selection ID:', error);
    throw error;
  }
};

export default function Step3Confirmation() {
  const { selectionData, prevStep } = useSelection();
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [modelDetails, setModelDetails] = useState(null);
  const [displayDate, setDisplayDate] = useState("");

  // Format the date for display when component mounts or selectionData changes
  useEffect(() => {
    if (selectionData.date) {
      setDisplayDate(formatDateForDisplay(selectionData.date));
    }
  }, [selectionData.date]);

  const handleFinish = () => {
    setShowConfirmation(true);
  };

  // Modified confirmSave function to properly format data for report generation
  const confirmSave = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Generate the unique ID with project name
      const selectionId = await generateSelectionId(
        selectionData.projectName,
        selectionData.selectedModel,
        selectionData.numberOfCells
      );

      // Use a consistent approach to date handling
      // This ensures the date displayed is the same as the date saved
      let dateToSave = selectionData.date;
      
      // If the date is in YYYY-MM-DD format, add time to avoid timezone issues
      if (dateToSave && !dateToSave.includes('T') && !dateToSave.includes(' ')) {
        // Add 12 hours to ensure consistent date interpretation across timezones
        dateToSave = normalizeDateForStorage(dateToSave);
      } else if (dateToSave) {
        // If it's already a full timestamp, just ensure it's in ISO format
        dateToSave = new Date(dateToSave).toISOString();
      }

      const selectionToSave = {
        id: selectionId,
        user_email: user.email,
        project_name: selectionData.projectName,
        customer_name: selectionData.customerName,
        location: selectionData.location,
        date_created: dateToSave, // Use the properly formatted date
        selection_by: selectionData.selectionBy,
        description: selectionData.description,
        water_flow_rate: parseFloat(selectionData.waterFlowRate),
        hot_water_temp: parseFloat(selectionData.hotWaterTemp),
        cold_water_temp: parseFloat(selectionData.coldWaterTemp),
        wet_bulb_temp: parseFloat(selectionData.wetBulbTemp),
        dry_bulb_temp: parseFloat(selectionData.dryBulbTemp),
        atmospheric_pressure: parseFloat(selectionData.atmosphericPressure),
        number_of_cells: parseInt(selectionData.numberOfCells), // Remove the || 1 fallback
        cooling_tower_model: selectionData.selectedModel,
        safety_factor: parseFloat(selectionData.safetyFactor),
        actual_flowrate: parseFloat(selectionData.actualFlowRate), // Changed from actual_flowrate to actualFlowRate
      };

      const { error: insertError } = await supabase
        .from("selections")
        .insert([selectionToSave]);

      if (insertError) throw new Error(insertError.message);

      // Convert local state format to database format for generateReport
      const selectionForReport = {
        project_name: selectionData.projectName,
        customer_name: selectionData.customerName,
        location: selectionData.location,
        date_created: dateToSave,
        selection_by: selectionData.selectionBy,
        description: selectionData.description,
        water_flow_rate: parseFloat(selectionData.waterFlowRate),
        hot_water_temp: parseFloat(selectionData.hotWaterTemp),
        cold_water_temp: parseFloat(selectionData.coldWaterTemp),
        wet_bulb_temp: parseFloat(selectionData.wetBulbTemp),
        dry_bulb_temp: parseFloat(selectionData.dryBulbTemp),
        atmospheric_pressure: parseFloat(selectionData.atmosphericPressure),
        cooling_tower_model: selectionData.selectedModel,
        safety_factor: parseFloat(selectionData.safetyFactor),
        actual_flowrate: parseFloat(selectionData.actualFlowRate), // Changed from actual_flowrate to actualFlowRate
        number_of_cells: parseInt(selectionData.numberOfCells)
      };

      // After successful save, generate the report with properly formatted data
      try {
        const pdfBytes = await generateReport(selectionForReport, modelDetails);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectionId}.pdf`; // Use selectionId as filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Show success message and redirect to user dashboard
        toast.success("Selection saved successfully!");
        router.push("/user-dashboard");
      } catch (reportError) {
        console.error('Error generating report:', reportError);
        // Still redirect to dashboard since the selection was saved
        toast.success("Selection saved successfully!");
        toast.error('Report generation failed: ' + reportError.message);
        router.push("/user-dashboard");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error saving selection:", err);
      setShowConfirmation(false);
      toast.error("Failed to save selection");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchModelDetails = async () => {
      if (selectionData.selectedModel) {
        const { data, error } = await supabase
          .from('cooling_tower_models')
          .select('motor_output, fan_diameter, nominal_flowrate, type')
          .eq('model_name', selectionData.selectedModel)
          .single();

        if (!error && data) {
          setModelDetails(data);
        }
      }
    };

    fetchModelDetails();
  }, [selectionData.selectedModel]);

  // Replace the existing handlePerformanceCurve function
  const handlePerformanceCurve = () => {
    // Prepare the parameters to pass
    const params = new URLSearchParams({
      model: selectionData.selectedModel,
      projectName: selectionData.projectName,
      customerName: selectionData.customerName,
      location: selectionData.location,
      selectionBy: selectionData.selectionBy,
      flowRate: selectionData.waterFlowRate,
      pressure: selectionData.atmosphericPressure,
      hotWater: selectionData.hotWaterTemp,
      coldWater: selectionData.coldWaterTemp,
      wetBulb: selectionData.wetBulbTemp,
      dryBulb: selectionData.dryBulbTemp,
      date: selectionData.date,
      towerType: modelDetails?.type || ''  // Add the tower type parameter
    });

    // Open in a new window
    window.open(`/PerformanceCurve?${params.toString()}`, '_blank', 'width=1024,height=768');
  };

  const handleGenerateReport = async () => {
    try {
      // Convert local state format to database format for generateReport
      const selectionForReport = {
        project_name: selectionData.projectName,
        customer_name: selectionData.customerName,
        location: selectionData.location,
        date_created: selectionData.date,
        selection_by: selectionData.selectionBy,
        description: selectionData.description,
        water_flow_rate: parseFloat(selectionData.waterFlowRate),
        hot_water_temp: parseFloat(selectionData.hotWaterTemp),
        cold_water_temp: parseFloat(selectionData.coldWaterTemp),
        wet_bulb_temp: parseFloat(selectionData.wetBulbTemp),
        dry_bulb_temp: parseFloat(selectionData.dryBulbTemp),
        atmospheric_pressure: parseFloat(selectionData.atmosphericPressure),
        cooling_tower_model: selectionData.selectedModel,
        safety_factor: parseFloat(selectionData.safetyFactor),
        actual_flowrate: parseFloat(selectionData.actualFlowRate),
        number_of_cells: parseInt(selectionData.numberOfCells)
      };
      
      const pdfBytes = await generateReport(selectionForReport, modelDetails);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectionData.projectName}_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report: ' + error.message);
    }
  };

  // Update the leftColumnFields array to separate model and type
  const leftColumnFields = [
    { 
      label: "Tower Model", 
      key: "towerModel", 
      value: selectionData.selectedModel
    },
    { 
      label: "Tower Type", 
      key: "towerType", 
      value: modelDetails?.type || ''  // Remove toUpperCase()
    },
    { 
      label: "Number of Cells", 
      key: "numberOfCells", 
      value: Number(selectionData.numberOfCells || 1).toString() 
    },
    { 
      label: "Motor Output/Cell", 
      key: "motorOutput", 
      value: modelDetails?.motor_output, 
      unit: "kW" 
    },
    { 
      label: "Fan Diameter", 
      key: "fanDiameter", 
      value: modelDetails?.fan_diameter, 
      unit: "mm" 
    },
  ];

  // Update the rightColumnFields array by changing the field labels and data sources
  const rightColumnFields = [
    { 
      label: "Nominal Flow Rate/Cell", 
      key: "nominalFlowRate", 
      value: modelDetails?.nominal_flowrate?.toFixed(2),
      unit: "m³/hr" 
    },
    { 
      label: "Actual Flow Rate", 
      key: "actualFlowRate", 
      value: Number(selectionData.actualFlowRate).toFixed(2), // Changed from actual_flowrate to actualFlowRate
      unit: "m³/hr" 
    },
    { 
      label: "Safety Factor", 
      key: "safetyFactor", 
      value: Number(selectionData.safetyFactor).toFixed(2), 
      unit: "%" 
    },
  ];

  // Project details fields
  const projectDetailsFields = [
    { label: "Project Name", key: "projectName" },
    { label: "Customer Name", key: "customerName" },
    { label: "Location", key: "location" },
  ];

  // Input parameters fields
  const inputParamsFields = [
    { label: "Water Flow Rate", key: "waterFlowRate", unit: "m³/hr" },
    { label: "Atmospheric Pressure", key: "atmosphericPressure", unit: "kPa" },
    { label: "Hot Water Temp", key: "hotWaterTemp", unit: "°C" },
    { label: "Cold Water Temp", key: "coldWaterTemp", unit: "°C" },
    { label: "Wet Bulb Temp", key: "wetBulbTemp", unit: "°C" },
    { label: "Dry Bulb Temp", key: "dryBulbTemp", unit: "°C" },
  ];

  return (
    <>
      {/* Update the confirmation modal styling */}
      {showConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Semi-transparent backdrop */}
          <div className="absolute inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm" />
          
          {/* Modal content */}
          <div className="relative bg-white/90 p-4 md:p-6 rounded-lg shadow-xl w-11/12 max-w-md mx-auto backdrop-blur-md border border-gray-200">
            <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-900">Confirm Save</h2>
            <p className="mb-4 md:mb-6 text-gray-800 text-sm md:text-base">Are you sure you want to save this selection?</p>
            
            {error && (
              <p className="mb-3 md:mb-4 text-red-600 text-xs md:text-sm">{error}</p>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-3 md:px-4 py-1.5 md:py-2 rounded bg-gray-600 text-white hover:bg-gray-700 font-medium transition-colors text-sm md:text-base"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                disabled={isSubmitting}
                className="px-3 md:px-4 py-1.5 md:py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400 font-medium transition-colors flex items-center space-x-2 text-sm md:text-base"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block animate-spin mr-1 md:mr-2">⏳</span>
                    <span>Saving...</span>
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto mt-4 md:mt-10 p-4 md:p-6 bg-white shadow-md rounded-md">
        {/* Title */}
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Confirm Selection</h2>

        {/* Project Details Header Row */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 md:mb-0">Project Details</h3>
          <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3">
            <label className={labelClass}>Selection By:</label>
            <div className={inputContainerClass}>
              <input
                type="text"
                className={inputClass}
                value={selectionData.selectionBy || ""}
                disabled
              />
            </div>
          </div>
        </div>

        {/* Project Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-x-8 md:gap-y-4">
          {projectDetailsFields.map(({ label, key }) => (
            <div key={key} className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
              <label className={labelClass}>{label}:</label>
              <div className={inputContainerClass}>
                <input
                  type="text"
                  className={inputClass}
                  value={selectionData[key] || ""}
                  disabled
                />
              </div>
            </div>
          ))}
          {/* Special handling for date to ensure consistent display */}
          <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
            <label className={labelClass}>Date:</label>
            <div className={inputContainerClass}>
              <input
                type="text"
                className={inputClass}
                value={displayDate}
                disabled
              />
            </div>
          </div>
        </div>

        {/* Description - Updated Layout */}
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
          {inputParamsFields.map(({ label, key, unit }) => (
            <div key={key} className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
              <label className={labelClass}>{label}:</label>
              <div className={inputContainerClass}>
                <input
                  type="text"
                  className={inputClass}
                  value={selectionData[key] || ""}
                  disabled
                />
                <span className={unitClass}>{unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Cooling Tower Selection - Updated Header */}
        <h3 className="text-base md:text-lg font-bold mt-5 md:mt-6 mb-3 md:mb-4 text-gray-900">Cooling Tower Selection</h3>

        {/* Cooling Tower Details - Mobile First Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-x-8 md:gap-y-4">
          {/* Left Column Fields */}
          {leftColumnFields.map(({ label, key, value, unit }) => (
            <div key={key} className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
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
          {rightColumnFields.map(({ label, key, value, unit }) => (
            <div key={key} className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
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
          
        {/* Performance Curve Button - Mobile Friendly */}
        <div className="mt-4 md:mt-6">
          <button
            onClick={handlePerformanceCurve}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition-colors text-sm md:text-base"
          >
            Generate Performance Curve
          </button>
        </div>

        {/* Buttons - Mobile Friendly */}
        <div className="mt-6 md:mt-8 flex flex-col md:flex-row justify-between space-y-3 md:space-y-0">
          <button 
            onClick={prevStep} 
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium text-sm md:text-base w-full md:w-auto"
          >
            Back
          </button>
          <button 
            onClick={handleFinish} 
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium text-sm md:text-base w-full md:w-auto"
          >
            Finish
          </button>
        </div>
      </div>
    </>
  );
}