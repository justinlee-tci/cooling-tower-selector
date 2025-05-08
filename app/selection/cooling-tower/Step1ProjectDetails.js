"use client";
import { useEffect, useState } from "react";
import { useSelection } from "./SelectionContext";
import { useFloating, arrow, shift, offset, FloatingPortal } from '@floating-ui/react';

// Update parameter ranges
const parameterRanges = {
  waterFlowRate: { min: 1, max: 10000 }, // m³/hr
  ambientPressure: { 
    min: 90, 
    max: 105,
    default: 101.325 // Standard sea level pressure in kPa
  },
  hotWaterTemp: { min: 20, max: 50 }, // °C
  coldWaterTemp: { min: 15, max: 35 }, // °C
  wetBulbTemp: { min: 10, max: 35 }, // °C
  dryBulbTemp: { min: 15, max: 45 }, // °C
};

// Update the styling constants
const labelClass = "w-full md:w-44 font-medium text-gray-900 whitespace-nowrap mb-1 md:mb-0";
const inputContainerClass = "w-full md:flex-1 flex items-center space-x-2";
const inputClass = "border p-1.5 rounded w-full text-gray-900 text-sm md:text-base";
const parameterInputClass = "border-2 border-gray-900 p-1.5 rounded w-full text-gray-900 text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const unitClass = "text-gray-900 w-16 text-right text-sm md:text-base";

// Update required fields to include project details
const requiredFields = [
  // Project Details
  "projectName",
  "customerName",
  "location",
  "date",
  "selectionBy",
  // Input Parameters
  "waterFlowRate",
  "ambientPressure",
  "hotWaterTemp",
  "coldWaterTemp",
  "wetBulbTemp",
  "dryBulbTemp",
];

// Modify the RequiredFieldTooltip component
const RequiredFieldTooltip = ({ show }) => {
  const [reference, setReference] = useState(null);
  const {x, y, strategy, refs} = useFloating({
    placement: 'top',
    middleware: [offset(5)],
    elements: {
      reference: reference
    }
  });

  if (!show) return null;

  return (
    <div
      ref={refs.setFloating}
      style={{
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
        width: 'max-content'
      }}
      className="absolute bg-red-500 text-white px-2 py-1 rounded text-sm z-50"
    >
      This field is required
    </div>
  );
};

// Function to normalize date for display (from any format to YYYY-MM-DD)
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

// Function to normalize date to prevent timezone issues when saving to database
const normalizeDateForStorage = (dateString) => {
  if (!dateString) return null;
  
  // Add 12 hours to avoid any potential date boundary issues with timezones
  // This ensures the date is the same regardless of timezone
  const date = new Date(`${dateString}T12:00:00Z`);
  
  // Format as YYYY-MM-DD
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export default function Step1ProjectDetails() {
  const { selectionData, updateSelectionData, nextStep } = useSelection();
  const [isFormComplete, setIsFormComplete] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  // Add useEffect to set default atmospheric pressure on component mount
  useEffect(() => {
    if (!selectionData.ambientPressure) {
      updateSelectionData({ 
        ambientPressure: parameterRanges.ambientPressure.default 
      });
    }
    
    // If there's a date in the selection data, format it for display
    if (selectionData.date) {
      updateSelectionData({
        date: formatDateForDisplay(selectionData.date)
      });
    }
  }, []);

  // Validate input value against range
  const validateInput = (key, value) => {
    if (parameterRanges[key]) {
      const { min, max } = parameterRanges[key];
      if (value < min || value > max) {
        return `Must be between ${min} and ${max}`;
      }
    }
    return null;
  };

  // Handle input change with validation
  const handleInputChange = (key, value) => {
    setTouchedFields(prev => ({ ...prev, [key]: true }));
    
    // Special handling for date - normalize for storage
    if (key === 'date') {
      updateSelectionData({ [key]: value });
    } else {
      updateSelectionData({ [key]: value });
    }
    
    // Add validation for selectionBy field
    if (key === 'selectionBy' && (!value || value.trim() === '')) {
      setValidationErrors(prev => ({
        ...prev,
        [key]: 'Selection By is required'
      }));
    } else if (key === 'selectionBy') {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
    
    if (parameterRanges[key]) {
      const error = validateInput(key, Number(value));
      setValidationErrors(prev => ({
        ...prev,
        [key]: error
      }));
    }
  };

  // Check form completion and validation
  useEffect(() => {
    const allFieldsFilled = requiredFields.every(
      (field) => {
        const value = selectionData[field]?.toString().trim();
        return value !== "" && value !== undefined && value !== null;
      }
    );
    
    const allParametersValid = Object.keys(validationErrors).every(
      (key) => !validationErrors[key]
    );

    // Add debug logging to check values
    console.log('Selection By:', selectionData.selectionBy);
    console.log('All Fields Filled:', allFieldsFilled);
    console.log('All Parameters Valid:', allParametersValid);

    setIsFormComplete(allFieldsFilled && allParametersValid);
  }, [selectionData, validationErrors]);
  
  // Function to prepare all data before saving to database
  const prepareDataForSaving = () => {
    const preparedData = {...selectionData};
    
    // Normalize date for storage if it exists
    if (preparedData.date) {
      preparedData.date = normalizeDateForStorage(preparedData.date);
    }
    
    return preparedData;
  };
  
  // Handle the next step with data normalization
  const handleNextStep = () => {
    // Prepare and update the data before moving to next step
    const normalizedData = prepareDataForSaving();
    
    // Update the selection data with normalized values
    updateSelectionData(normalizedData);
    
    // Then proceed to next step
    nextStep();
  };

  // Update project details section
  const projectDetails = [
    { label: "Project Name", key: "projectName", placeholder: "Enter project name (required)" },
    { label: "Customer Name", key: "customerName", placeholder: "Enter customer name (required)" },
    { label: "Location", key: "location", placeholder: "Enter location (required)" },
    { label: "Date", key: "date", type: "date", placeholder: "" },
  ];

  // Update input parameters section with more descriptive placeholder
  const inputParameters = [
    { label: "Water Flow Rate", key: "waterFlowRate", unit: "m³/hr", placeholder: "Enter flow rate" },
    { 
      label: "Ambient Pressure", 
      key: "ambientPressure", 
      unit: "kPa", 
      placeholder: "Default: 101.325 kPa"
    },
    { label: "Hot Water Temperature", key: "hotWaterTemp", unit: "°C", placeholder: "Enter temp" },
    { label: "Cold Water Temperature", key: "coldWaterTemp", unit: "°C", placeholder: "Enter temp" },
    { label: "Wet Bulb Temperature", key: "wetBulbTemp", unit: "°C", placeholder: "Enter temp" },
    { label: "Dry Bulb Temperature", key: "dryBulbTemp", unit: "°C", placeholder: "Enter temp" }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-white shadow-md rounded-md">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 text-center">Cooling Tower Selection</h1>
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-gray-900">Project Details</h2>

      {/* Project Details Header Row - Modified for mobile */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2 md:mb-0">Project Information</h3>
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3">
          <label className={labelClass}>Selection By:</label>
          <div className={`${inputContainerClass} relative`}>
            <input
              type="text"
              required
              placeholder="Enter name (required)"
              className={`${inputClass} ${
                touchedFields.selectionBy && !selectionData.selectionBy ? 'border-red-500' : ''
              }`}
              value={selectionData.selectionBy || ""}
              onChange={(e) => handleInputChange("selectionBy", e.target.value)}
              onBlur={() => setTouchedFields(prev => ({ ...prev, selectionBy: true }))}
            />
            {touchedFields.selectionBy && !selectionData.selectionBy && (
              <div className="absolute -top-2 right-2">
                <span className="text-red-500">*</span>
                <RequiredFieldTooltip show={true} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Details Grid - Modified for mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-8 md:gap-y-4">
        {projectDetails.map(({ label, key, type, placeholder }) => (
          <div key={key} className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3 relative">
            <label className={labelClass}>{label}:</label>
            <div className={`${inputContainerClass} relative`}>
              <input
                type={type || "text"}
                required
                placeholder={placeholder}
                className={`${inputClass} ${
                  touchedFields[key] && !selectionData[key] ? 'border-red-500' : ''
                }`}
                value={selectionData[key] || ""}
                onChange={(e) => handleInputChange(key, e.target.value)}
                onBlur={() => setTouchedFields(prev => ({ ...prev, [key]: true }))}
              />
              {touchedFields[key] && !selectionData[key] && (
                <div className="absolute -top-2 right-2">
                  <span className="text-red-500">*</span>
                  <RequiredFieldTooltip show={true} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Description - Modified for mobile */}
      <div className="mt-6 flex flex-col md:flex-row md:items-start space-y-1 md:space-y-0 md:space-x-3">
        <label className={labelClass}>Description:</label>
        <div className={inputContainerClass}>
          <textarea
            className="border p-2 rounded w-full text-gray-900 min-h-[6rem] resize-y text-sm md:text-base"
            placeholder="Enter project description (optional)"
            value={selectionData.description || ""}
            onChange={(e) => updateSelectionData({ description: e.target.value })}
          />
        </div>
      </div>

      {/* Input Parameters - Modified for mobile */}
      <h3 className="text-lg font-bold mt-6 mb-4 text-gray-900">Input Parameters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-8 md:gap-y-4">
        {inputParameters.map(({ label, key, unit, placeholder }) => (
          <div key={key} className="flex flex-col space-y-1">
            <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
              <label className={labelClass}>{label}:</label>
              <div className={inputContainerClass}>
                <input
                  type="number"
                  required
                  placeholder={placeholder}
                  className={`${parameterInputClass} ${validationErrors[key] ? 'border-red-500' : ''}`}
                  value={selectionData[key] || ""}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  min={parameterRanges[key]?.min}
                  max={parameterRanges[key]?.max}
                />
                <span className={unitClass}>{unit}</span>
              </div>
            </div>
            {validationErrors[key] && (
              <p className="text-red-500 text-sm ml-0 md:ml-48">{validationErrors[key]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Next Button - Modified for mobile */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleNextStep}
          disabled={!isFormComplete}
          className={`w-full md:w-auto px-6 py-2 rounded font-medium transition-colors ${
            isFormComplete
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}