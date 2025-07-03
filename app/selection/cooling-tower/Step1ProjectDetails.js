"use client";
import { useEffect, useState } from "react";
import { useSelection } from "./SelectionContext";
import { useFloating, arrow, shift, offset, FloatingPortal } from '@floating-ui/react';

// Update parameter ranges with general cooling tower application limits
const parameterRanges = {
  waterFlowRate: { min: 0, max: 10000000 }, // m³/hr
  ambientPressure: { 
    min: 80,   // General lower limit for cooling tower applications (kPa)
    max: 110,  // General upper limit for cooling tower applications (kPa)
    default: 101.325 // Standard sea level pressure in kPa
  },
  // Reasonable temperature ranges for cooling tower applications
  // (°C values, will convert to °F if needed)
  hotWaterTemp: { min: 20, max: 80 },      // °C (68°F to 176°F)
  coldWaterTemp: { min: 15, max: 60 },     // °C (59°F to 140°F)
  wetBulbTemp: { min: -10, max: 40 },      // °C (14°F to 104°F)
  dryBulbTemp: { min: -10, max: 60 },      // °C (14°F to 140°F)
};

// Minimum approach temperature for reliable calculations
const MIN_APPROACH_TEMP = 2; // °C

// Flow rate conversion utility (now supports m³/hr, L/min, US GPM, L/s)
const convertFlowRate = (value, fromUnit, toUnit) => {
  if (!value) return "";
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return "";

  // Conversion factors
  // 1 m³/hr = 1000/60 L/min = 4.40287 US GPM = 1000/3600 L/s
  // 1 US GPM = 0.2271247 m³/hr = 3.78541 L/min = 0.0630902 L/s
  // 1 L/s = 3.6 m³/hr = 60 L/min = 15.8503 US GPM

  if (fromUnit === toUnit) return numValue;

  // Convert input to m³/hr first
  let valueInM3hr = numValue;
  if (fromUnit === "L/min") valueInM3hr = numValue * 60 / 1000;
  if (fromUnit === "US GPM") valueInM3hr = numValue * 0.2271247;
  if (fromUnit === "L/s") valueInM3hr = numValue * 3.6;

  // Convert from m³/hr to target unit
  if (toUnit === "m³/hr") return Number(valueInM3hr.toFixed(2));
  if (toUnit === "L/min") return Number((valueInM3hr * 1000 / 60).toFixed(2));
  if (toUnit === "US GPM") return Number((valueInM3hr / 0.2271247).toFixed(2));
  if (toUnit === "L/s") return Number((valueInM3hr / 3.6).toFixed(2));

  return numValue;
};

// Temperature conversion utility (°C ↔ °F)
const convertTemperature = (value, fromUnit, toUnit) => {
  if (value === "" || value === undefined || value === null) return "";
  const numValue = parseFloat(value);
  if (isNaN(numValue) || fromUnit === toUnit) return value;
  if (fromUnit === "°C" && toUnit === "°F") return Number((numValue * 9/5 + 32).toFixed(2));
  if (fromUnit === "°F" && toUnit === "°C") return Number(((numValue - 32) * 5/9).toFixed(2));
  return value;
};

// Add this utility for elevation <-> pressure conversion
// Standard atmosphere: P = 101.325 * (1 - 2.25577e-5 * h)^5.25588
const elevationToPressure = (elevationMeters) => {
  if (elevationMeters === "" || elevationMeters === undefined || elevationMeters === null) return "";
  const h = parseFloat(elevationMeters);
  if (isNaN(h)) return "";
  return Number((101.325 * Math.pow(1 - 2.25577e-5 * h, 5.25588)).toFixed(3));
};
const pressureToElevation = (pressureKpa) => {
  if (pressureKpa === "" || pressureKpa === undefined || pressureKpa === null) return "";
  const p = parseFloat(pressureKpa);
  if (isNaN(p) || p <= 0) return "";
  return Number(((1 - Math.pow(p / 101.325, 1 / 5.25588)) / 2.25577e-5).toFixed(1));
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
  // "dryBulbTemp" removed from required fields
];

// Modified RequiredFieldTooltip component with proper boundary handling
const RequiredFieldTooltip = ({ show, anchorElement }) => {
  const {x, y, strategy, refs} = useFloating({
    elements: {
      reference: anchorElement
    },
    placement: 'top',
    middleware: [
      offset(8),
      shift({ padding: 8 }) // Ensures tooltip stays within viewport with 8px padding
    ],
  });

  if (!show || !anchorElement) return null;

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={{
          position: strategy,
          top: y ?? 0,
          left: x ?? 0,
          zIndex: 9999,
        }}
        className="bg-red-500 text-white px-3 py-2 rounded text-xs font-medium shadow-lg max-w-xs whitespace-nowrap"
      >
        This field is required
      </div>
    </FloatingPortal>
  );
};

// Enhanced RequiredFieldIndicator component
const RequiredFieldIndicator = ({ show, fieldKey }) => {
  const [anchorRef, setAnchorRef] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    let timeoutId;
    if (show) {
      setShowTooltip(true);
      // Auto-hide tooltip after 2 seconds on mobile
      timeoutId = setTimeout(() => {
        setShowTooltip(false);
      }, 1500);
    } else {
      setShowTooltip(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [show]);

  if (!show) return null;

  return (
    <>
      <div 
        ref={setAnchorRef}
        className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)} // Toggle on mobile tap
      >
        <span className="text-red-500 text-lg font-bold">*</span>
      </div>
      <RequiredFieldTooltip 
        show={showTooltip} 
        anchorElement={anchorRef}
      />
    </>
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

// Add these helpers above your component
const ELEVATION_MIN = (() => {
  // Max pressure = min elevation (sea level), so min elevation is 0 m
  return 0;
})();
const ELEVATION_MAX = (() => {
  // Min pressure = max elevation
  // Solve: P = 101.325 * (1 - 2.25577e-5 * h)^5.25588 for h, where P = parameterRanges.ambientPressure.min
  // h = (1 - (P / 101.325)^(1/5.25588)) / 2.25577e-5
  const Pmin = parameterRanges.ambientPressure.min;
  return Math.round((1 - Math.pow(Pmin / 101.325, 1 / 5.25588)) / 2.25577e-5);
})();

export default function Step1ProjectDetails() {
  const { selectionData, updateSelectionData, nextStep } = useSelection();
  const [isFormComplete, setIsFormComplete] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [flowRateUnit, setFlowRateUnit] = useState("m³/hr"); // Add state for flow rate unit
  const [temperatureUnit, setTemperatureUnit] = useState("°C");
  const [pressureInputMode, setPressureInputMode] = useState("pressure"); // "pressure" or "elevation"

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

  // Enhanced temperature validation with approach temperature check
const validateTemperatures = (temperatures) => {
  // Always validate in °C
  const getC = v => convertTemperature(v, temperatureUnit, "°C");
  const hot = Number(getC(temperatures.hotWaterTemp));
  const cold = Number(getC(temperatures.coldWaterTemp));
  const dry = temperatures.dryBulbTemp ? Number(getC(temperatures.dryBulbTemp)) : null;
  const wet = Number(getC(temperatures.wetBulbTemp));
  const errors = {};

  // Skip validation if any required temperature is missing or invalid
  if (isNaN(hot) || isNaN(cold) || isNaN(wet)) {
    return errors;
  }

  // Validate hot water > cold water
  if (hot <= cold) {
    errors.hotWaterTemp = "Hot water temperature must be higher than cold water temperature";
    errors.coldWaterTemp = "Cold water temperature must be lower than hot water temperature";
  }

  // Validate cold water > wet bulb
  if (cold <= wet) {
    errors.coldWaterTemp = "Cold water temperature must be higher than wet bulb temperature";
    errors.wetBulbTemp = "Wet bulb temperature must be lower than cold water temperature";
  }

  // **FIXED: Validate approach temperature (Cold Water - Wet Bulb >= 3°C)**
  const approachTemp = cold - wet;
  if (approachTemp < MIN_APPROACH_TEMP) { // Changed from <= to <
    const requiredColdTemp = wet + MIN_APPROACH_TEMP;
    const requiredWetBulbTemp = cold - MIN_APPROACH_TEMP;
    
    errors.coldWaterTemp = `Approach temperature (${approachTemp.toFixed(1)}°C) is too small. Cold water must be at least ${requiredColdTemp.toFixed(1)}°C for reliable calculations`;
    errors.wetBulbTemp = `Approach temperature (${approachTemp.toFixed(1)}°C) is too small. Wet bulb must be at most ${requiredWetBulbTemp.toFixed(1)}°C for reliable calculations`;
  }

  // Only validate dry bulb if it's provided
  if (dry !== null && !isNaN(dry)) {
    // Validate dry bulb > wet bulb
    if (dry <= wet) {
      errors.dryBulbTemp = "Dry bulb temperature must be higher than wet bulb temperature";
      errors.wetBulbTemp = "Wet bulb temperature must be lower than dry bulb temperature";
    }
  }

  return errors;
};

  // Handle input change with validation
  const handleInputChange = (key, value) => {
    setTouchedFields(prev => ({ ...prev, [key]: true }));
    
    // Update the selection data first
    updateSelectionData({ [key]: value });
    
    // Validate individual parameter ranges
    if (parameterRanges[key]) {
      let valueToValidate = Number(value);
      
      // Convert L/min to m³/hr for validation if necessary
      if (key === 'waterFlowRate' && flowRateUnit === 'L/min') {
        valueToValidate = Number(convertFlowRate(value, 'L/min', 'm³/hr'));
      }
      
      const error = validateInput(key, valueToValidate);
      setValidationErrors(prev => ({
        ...prev,
        [key]: error
      }));
    }

    // Validate temperature relationships if this is a temperature field
    if (['hotWaterTemp', 'coldWaterTemp', 'wetBulbTemp', 'dryBulbTemp'].includes(key)) {
      // Clear all temperature-related errors first
      const newErrors = { ...validationErrors };
      ['hotWaterTemp', 'coldWaterTemp', 'wetBulbTemp', 'dryBulbTemp'].forEach(tempKey => {
        delete newErrors[tempKey];
      });
      
      // Then add new temperature validation errors (including approach temp check)
      const tempErrors = validateTemperatures({
        ...selectionData,
        [key]: value
      });
      
      setValidationErrors({
        ...newErrors,
        ...tempErrors
      });
    }

    // Special handling for pressure/elevation sync
    if (key === "ambientPressure" && pressureInputMode === "elevation") {
      // User is inputting elevation, store both elevation and calculated pressure
      const pressure = elevationToPressure(value);
      updateSelectionData({ ambientPressure: pressure, elevation: value });

      // Validate elevation range
      let error = null;
      const elevNum = Number(value);
      if (isNaN(elevNum) || elevNum < ELEVATION_MIN || elevNum > ELEVATION_MAX) {
        error = `Must be between ${ELEVATION_MIN} and ${ELEVATION_MAX} meters`;
      }
      setValidationErrors(prev => ({
        ...prev,
        [key]: error
      }));
      return;
    } else if (key === "ambientPressure" && pressureInputMode === "pressure") {
      // User is inputting pressure, store both pressure and calculated elevation
      const elevation = pressureToElevation(value);
      updateSelectionData({ ambientPressure: value, elevation });

      // Validate pressure range
      let error = null;
      const pNum = Number(value);
      if (isNaN(pNum) || pNum < parameterRanges.ambientPressure.min || pNum > parameterRanges.ambientPressure.max) {
        error = `Must be between ${parameterRanges.ambientPressure.min} and ${parameterRanges.ambientPressure.max} kPa`;
      }
      setValidationErrors(prev => ({
        ...prev,
        [key]: error
      }));
      return;
    }

    // ...existing code for other fields...
    updateSelectionData({ [key]: value });

    if (parameterRanges[key]) {
      let valueToValidate = Number(value);
      if (key === 'waterFlowRate' && flowRateUnit === 'L/min') {
        valueToValidate = Number(convertFlowRate(value, 'L/min', 'm³/hr'));
      }
      const error = validateInput(key, valueToValidate);
      setValidationErrors(prev => ({
        ...prev,
        [key]: error
      }));
    }

    if (['hotWaterTemp', 'coldWaterTemp', 'wetBulbTemp', 'dryBulbTemp'].includes(key)) {
      const newErrors = { ...validationErrors };
      ['hotWaterTemp', 'coldWaterTemp', 'wetBulbTemp', 'dryBulbTemp'].forEach(tempKey => {
        delete newErrors[tempKey];
      });
      const tempErrors = validateTemperatures({
        ...selectionData,
        [key]: value
      });
      setValidationErrors({
        ...newErrors,
        ...tempErrors
      });
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

    // Add temperature validation check (including approach temperature)
    const tempErrors = validateTemperatures(selectionData);
    const temperaturesValid = Object.keys(tempErrors).length === 0;

    setIsFormComplete(allFieldsFilled && allParametersValid && temperaturesValid);
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

    // Convert flow rate to m³/hr if it's not already
    if (flowRateUnit !== "m³/hr" && normalizedData.waterFlowRate) {
      normalizedData.waterFlowRate = convertFlowRate(normalizedData.waterFlowRate, flowRateUnit, "m³/hr");
    }

    // Convert all temperature fields to °C for storage
    if (temperatureUnit !== "°C") {
      ["hotWaterTemp", "coldWaterTemp", "wetBulbTemp", "dryBulbTemp"].forEach(key => {
        if (normalizedData[key] !== undefined && normalizedData[key] !== "") {
          normalizedData[key] = convertTemperature(normalizedData[key], temperatureUnit, "°C");
        }
      });
    }

    // Update the selection data with normalized values
    updateSelectionData(normalizedData);
    
    // Then proceed to next step
    nextStep();
  };

  // Calculate and display current approach temperature for user reference
  const getCurrentApproachTemp = () => {
    const cold = Number(selectionData.coldWaterTemp);
    const wet = Number(selectionData.wetBulbTemp);
    
    if (!isNaN(cold) && !isNaN(wet)) {
      return cold - wet;
    }
    return null;
  };

  const currentApproach = getCurrentApproachTemp();

  // Update project details section
  const projectDetails = [
    { label: "Project Name", key: "projectName", placeholder: "Enter project name (required)" },
    { label: "Customer Name", key: "customerName", placeholder: "Enter customer name (required)" },
    { label: "Location", key: "location", placeholder: "Enter location (required)" },
    { label: "Date", key: "date", type: "date", placeholder: "" },
  ];

  // Update input parameters section with swapped order
  const inputParameters = [
    { 
      label: "Water Flow Rate", 
      key: "waterFlowRate", 
      unit: flowRateUnit, 
      placeholder: "Enter flow rate (required)",
      showUnitSelector: true 
    },
    { 
      label: pressureInputMode === "pressure" ? "Ambient Pressure" : "Elevation",
      key: "ambientPressure",
      unit: pressureInputMode === "pressure" ? "kPa" : "m",
      placeholder: pressureInputMode === "pressure" ? "Default: 101.325 kPa" : "Enter elevation (m)",
      showUnitSelector: false,
      isPressureOrElevation: true
    },
    { label: "Hot Water Temperature", key: "hotWaterTemp", unit: temperatureUnit, placeholder: "Enter temp (required)" },
    { label: "Cold Water Temperature", key: "coldWaterTemp", unit: temperatureUnit, placeholder: "Enter temp (required)" },
    { label: "Wet Bulb Temperature", key: "wetBulbTemp", unit: temperatureUnit, placeholder: "Enter temp (required)" },
    { label: "Dry Bulb Temperature", key: "dryBulbTemp", unit: temperatureUnit, placeholder: "Enter temp (not required)" }
  ];

  const handleUnitChange = (newUnit) => {
    // If switching to US GPM, also switch temperatures to °F
    if (newUnit === "US GPM" && temperatureUnit !== "°F") {
      // Convert all temperature fields to °F
      const tempFields = ["hotWaterTemp", "coldWaterTemp", "wetBulbTemp", "dryBulbTemp"];
      const updated = {};
      tempFields.forEach(tempKey => {
        if (selectionData[tempKey] !== undefined && selectionData[tempKey] !== "") {
          updated[tempKey] = convertTemperature(selectionData[tempKey], temperatureUnit, "°F");
        }
      });
      setTemperatureUnit("°F");
      updateSelectionData({
        ...updated,
        waterFlowRate: convertFlowRate(selectionData.waterFlowRate, flowRateUnit, newUnit)
      });
      setFlowRateUnit(newUnit);
      return;
    }

    // If switching away from US GPM to a metric unit, switch temperatures to °C
    if (["m³/hr", "L/min"].includes(newUnit) && temperatureUnit !== "°C") {
      const tempFields = ["hotWaterTemp", "coldWaterTemp", "wetBulbTemp", "dryBulbTemp"];
      const updated = {};
      tempFields.forEach(tempKey => {
        if (selectionData[tempKey] !== undefined && selectionData[tempKey] !== "") {
          updated[tempKey] = convertTemperature(selectionData[tempKey], temperatureUnit, "°C");
        }
      });
      setTemperatureUnit("°C");
      updateSelectionData({
        ...updated,
        waterFlowRate: convertFlowRate(selectionData.waterFlowRate, flowRateUnit, newUnit)
      });
      setFlowRateUnit(newUnit);
      return;
    }

    // Normal flow rate unit change
    if (selectionData.waterFlowRate) {
      const convertedValue = convertFlowRate(
        selectionData.waterFlowRate,
        flowRateUnit,
        newUnit
      );
      updateSelectionData({ waterFlowRate: convertedValue });
    }
    setFlowRateUnit(newUnit);
  };

  // Utility to get min/max for temperature fields based on selected unit
const getTempMinMax = (key, unit) => {
  const range = parameterRanges[key];
  if (!range) return {};
  if (unit === "°C") return { min: range.min, max: range.max };
  // Convert min/max to °F
  return {
    min: Math.round(range.min * 9/5 + 32),
    max: Math.round(range.max * 9/5 + 32)
  };
};

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
            <RequiredFieldIndicator 
              show={touchedFields.selectionBy && !selectionData.selectionBy}
              fieldKey="selectionBy"
            />
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
              <RequiredFieldIndicator 
                show={touchedFields[key] && !selectionData[key]}
                fieldKey={key}
              />
            </div>
            {/* REMOVE error message here for project details */}
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
      
      {/* **NEW: Approach Temperature Info Box** */}
      {currentApproach !== null && (
        <div className={`mb-4 p-3 rounded-md border ${
          currentApproach < MIN_APPROACH_TEMP 
            ? 'bg-red-50 border-red-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">
              Current Approach Temperature: 
            </span>
            <span className={`font-bold ${
              currentApproach < MIN_APPROACH_TEMP 
                ? 'text-red-600' 
                : 'text-green-600'
            }`}>
              {currentApproach.toFixed(1)}°C
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {currentApproach < MIN_APPROACH_TEMP 
              ? `⚠️ Approach temperature must be => ${MIN_APPROACH_TEMP}°C for reliable cooling tower calculations`
              : `✅ Approach temperature is acceptable for reliable calculations`
            }
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-8 md:gap-y-4">
        {inputParameters.map(({ label, key, unit, placeholder, showUnitSelector, isPressureOrElevation }) => {
          const isTemperature =
            key === "hotWaterTemp" ||
            key === "coldWaterTemp" ||
            key === "wetBulbTemp" ||
            key === "dryBulbTemp";
          return (
            <div key={key} className="flex flex-col space-y-1">
              <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
                {/* Pressure/Elevation label with dropdown */}
                {isPressureOrElevation ? (
                  <div className="flex items-center space-x-2 w-full md:w-auto">
                    <select
                      value={pressureInputMode}
                      onChange={e => {
                        const newMode = e.target.value;
                        setPressureInputMode(newMode);
                        // When switching, sync the value accordingly
                        if (newMode === "pressure") {
                          if (selectionData.elevation !== undefined && selectionData.elevation !== "") {
                            const pressure = elevationToPressure(selectionData.elevation);
                            updateSelectionData({ ambientPressure: pressure });
                          }
                        } else {
                          if (selectionData.ambientPressure !== undefined && selectionData.ambientPressure !== "") {
                            const elevation = pressureToElevation(selectionData.ambientPressure);
                            updateSelectionData({ elevation });
                          }
                        }
                      }}
                      className="border-2 border-gray-150 p-1.5 rounded w-40 text-gray-900 text-sm md:text-base bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
                      style={{ minWidth: 140 }}
                    >
                      <option value="pressure">Ambient Pressure:</option>
                      <option value="elevation">Elevation:</option>
                    </select>
                  </div>
                ) : (
                  <label className={labelClass}>{label}:</label>
                )}
                <div className={`${inputContainerClass} relative w-full`}>
                  <input
                    type="number"
                    required
                    placeholder={placeholder}
                    className={`${parameterInputClass} ${validationErrors[key] ? 'border-red-500' : ''}${isPressureOrElevation ? ' w-full' : ''}`}
                    style={isPressureOrElevation ? { minWidth: 0, maxWidth: "100%" } : undefined}
                    value={
                      isPressureOrElevation
                        ? (pressureInputMode === "pressure"
                            ? selectionData.ambientPressure ?? ""
                            : selectionData.elevation ?? "")
                        : selectionData[key] || ""
                    }
                    onChange={e => handleInputChange(key, e.target.value)}
                    onBlur={() => setTouchedFields(prev => ({ ...prev, [key]: true }))}
                    min={
                      isPressureOrElevation
                        ? (pressureInputMode === "pressure"
                            ? parameterRanges.ambientPressure.min
                            : ELEVATION_MIN)
                        : isTemperature
                          ? getTempMinMax(key, temperatureUnit).min
                          : parameterRanges[key]?.min
                    }
                    max={
                      isPressureOrElevation
                        ? (pressureInputMode === "pressure"
                            ? parameterRanges.ambientPressure.max
                            : ELEVATION_MAX)
                        : isTemperature
                          ? getTempMinMax(key, temperatureUnit).max
                          : parameterRanges[key]?.max
                    }
                  />
                  {showUnitSelector ? (
                    <select
                      value={flowRateUnit}
                      onChange={(e) => handleUnitChange(e.target.value)}
                      className={`border-2 border-gray-150 p-1.5 rounded w-36 text-gray-900 text-sm md:text-base bg-white ml-2 focus:border-blue-400 focus:ring-1 focus:ring-blue-300 ${validationErrors[key] ? 'border-red-500' : ''}`}
                      style={{ minWidth: 110 }}
                    >
                      <option value="m³/hr">m³/hr</option>
                      <option value="L/min">L/min</option>
                      <option value="L/s">L/s</option>
                      <option value="US GPM">US GPM</option>
                    </select>
                  ) : isTemperature ? (
                    <select
                      value={temperatureUnit}
                      onChange={e => {
                        const newUnit = e.target.value;
                        // If switching to °F, also switch flow rate to US GPM
                        if (newUnit === "°F" && flowRateUnit !== "US GPM") {
                          const tempFields = ["hotWaterTemp", "coldWaterTemp", "wetBulbTemp", "dryBulbTemp"];
                          const updated = {};
                          tempFields.forEach(tempKey => {
                            if (selectionData[tempKey] !== undefined && selectionData[tempKey] !== "") {
                              updated[tempKey] = convertTemperature(selectionData[tempKey], temperatureUnit, newUnit);
                            }
                          });
                          setTemperatureUnit(newUnit);
                          updateSelectionData({
                            ...updated,
                            waterFlowRate: convertFlowRate(selectionData.waterFlowRate, flowRateUnit, "US GPM")
                          });
                          setFlowRateUnit("US GPM");
                          return;
                        }
                        // If switching to °C, also switch flow rate to m³/hr (or keep as is if already metric)
                        if (newUnit === "°C" && flowRateUnit === "US GPM") {
                          const tempFields = ["hotWaterTemp", "coldWaterTemp", "wetBulbTemp", "dryBulbTemp"];
                          const updated = {};
                          tempFields.forEach(tempKey => {
                            if (selectionData[tempKey] !== undefined && selectionData[tempKey] !== "") {
                              updated[tempKey] = convertTemperature(selectionData[tempKey], temperatureUnit, newUnit);
                            }
                          });
                          setTemperatureUnit(newUnit);
                          updateSelectionData({
                            ...updated,
                            waterFlowRate: convertFlowRate(selectionData.waterFlowRate, flowRateUnit, "m³/hr")
                          });
                          setFlowRateUnit("m³/hr");
                          return;
                        }
                        // Normal temperature unit change
                        const tempFields = ["hotWaterTemp", "coldWaterTemp", "wetBulbTemp", "dryBulbTemp"];
                        const updated = {};
                        tempFields.forEach(tempKey => {
                          if (selectionData[tempKey] !== undefined && selectionData[tempKey] !== "") {
                            updated[tempKey] = convertTemperature(selectionData[tempKey], temperatureUnit, newUnit);
                          }
                        });
                        setTemperatureUnit(newUnit);
                        updateSelectionData(updated);
                      }}
                      className="border-2 border-gray-150 p-1.5 rounded w-20 text-gray-900 text-sm md:text-base bg-white ml-2 focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
                      style={{ minWidth: 70 }}
                    >
                      <option value="°C">°C</option>
                      <option value="°F">°F</option>
                    </select>
                  ) : (
                    <span className={unitClass}>{unit}</span>
                  )}
                  {/* Show required indicator for required fields */}
                  {requiredFields.includes(key) && (
                    <RequiredFieldIndicator 
                      show={touchedFields[key] && !selectionData[key]}
                      fieldKey={key}
                    />
                  )}
                </div>
              </div>
              {validationErrors[key] && (
                <p className="text-red-500 text-sm ml-0 md:ml-48">
                  {isPressureOrElevation ? (
                    pressureInputMode === "pressure"
                      ? `Must be between ${parameterRanges.ambientPressure.min} and ${parameterRanges.ambientPressure.max} kPa`
                      : `Must be between ${ELEVATION_MIN} and ${ELEVATION_MAX} m`
                  ) : validationErrors[key]}
                </p>
              )}
            </div>
          );
        })}
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

      {/* Add Disclaimer and Copyright at bottom */}
      <div className="mt-12 space-y-4">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">DISCLAIMER:</span> The selection results shown here are for preliminary reference only. 
            Actual cooling tower performance may vary depending on various environmental and operational factors. 
            For detailed analysis and specifications, please consult with your sales engineer 
            or technical representative.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            <span className="font-semibold">Note:</span> Approach temperature (Cold Water - Wet Bulb) must be greater than {MIN_APPROACH_TEMP}°C 
            for reliable cooling tower calculations. Lower approach temperatures may result in calculation errors.
          </p>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>© 2025 Thermal-Cell. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}