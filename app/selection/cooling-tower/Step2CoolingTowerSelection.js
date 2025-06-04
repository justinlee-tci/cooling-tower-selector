"use client";
import { useEffect, useState } from "react";
import { useSelection } from "./SelectionContext";
import { supabase } from "../../lib/supabaseClient";
import { calculateCoolingCapacity, calculateFlowRate } from '@/formula/coolingTowerCalculations';

export default function Step2CoolingTowerSelection() {
  const { selectionData, updateSelectionData, nextStep, prevStep } = useSelection();
  const [coolingTowerModels, setCoolingTowerModels] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]); // State for filtered models
  const [performanceData, setPerformanceData] = useState({});
  const [selectedCells, setSelectedCells] = useState(1);
  const [minSafetyFactor, setMinSafetyFactor] = useState(100);
  const [maxSafetyFactor, setMaxSafetyFactor] = useState(150);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    // Default to table for desktop, cards for mobile
    return window.innerWidth >= 768 ? "table" : "cards";
  });
  const [expandedModel, setExpandedModel] = useState(null);

  // Add window resize listener to update view mode
  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth >= 768 ? "table" : "cards");
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch cooling tower models and performance data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // Fetch models
      const { data: models, error: modelError } = await supabase
        .from("cooling_tower_models")
        .select("model_name, type , nominal_capacity, nominal_flowrate, motor_output, fan_diameter, dry_weight, operating_weight");

      if (modelError) {
        setError("Failed to load cooling tower models.");
        console.error("Error fetching models:", modelError.message);
        setLoading(false);
        return;
      }

      // Fetch performance data
      const { data: performance, error: perfError } = await supabase
        .from("cooling_tower_performance")
        .select("model_name, capacity");

      if (perfError) {
        setError("Failed to load performance data.");
        console.error("Error fetching performance data:", perfError.message);
        setLoading(false);
        return;
      }

      // Convert performance data into a lookup object { model_name: capacity }
      const performanceMap = performance.reduce((acc, row) => {
        acc[row.model_name] = row.capacity;
        return acc;
      }, {});

      setCoolingTowerModels(models || []);
      setPerformanceData(performanceMap);
      updateSelectionData({ selectedModel: null, actualFlowRate: null, safetyFactor: null }); // Reset selection

      setLoading(false);
    };

    fetchData();
  }, []);

  // Calculate model data with actual capacity and safety factor
  useEffect(() => {
    if (coolingTowerModels.length > 0 && selectionData) {
      const calculatedModels = coolingTowerModels.map((model) => {

        const actualFlowRate = calculateFlowRate(
          Number(selectionData.hotWaterTemp),
          Number(selectionData.coldWaterTemp),
          Number(selectionData.wetBulbTemp),
          Number(model.nominal_capacity),
          String(model.type).toUpperCase(),
        )*selectedCells;

        const actualCapacity = calculateCoolingCapacity(
          Number(selectionData.hotWaterTemp),
          Number(selectionData.coldWaterTemp),
          Number(selectionData.wetBulbTemp),
          Number(model.nominal_capacity),
          String(model.type).toUpperCase(),
        )*selectedCells;

        const safetyFactor = actualFlowRate / selectionData.waterFlowRate * 100;

        return { 
          ...model, 
          actualFlowRate: Number(actualFlowRate), 
          actualCapacity: Number(actualCapacity),
          safetyFactor: Number(safetyFactor) 
        };
      });

      // Filter models by user-defined safety factor range
      const modelsWithValidSafetyFactor = calculatedModels.filter(model => 
        model.safetyFactor >= minSafetyFactor && model.safetyFactor <= maxSafetyFactor
      );

      setFilteredModels(modelsWithValidSafetyFactor);

      // Update selected model data if needed
      if (selectionData.selectedModel) {
        const selectedModel = calculatedModels.find(model => model.model_name === selectionData.selectedModel);
        if (selectedModel) {
          updateSelectionData({
            numberOfCells: selectedCells,
            actualFlowRate: selectedModel.actualFlowRate,
            actualCapacity: selectedModel.actualCapacity,
            safetyFactor: selectedModel.safetyFactor
          });
        }
      }
    }
  }, [coolingTowerModels, selectionData.hotWaterTemp, selectionData.coldWaterTemp, 
      selectionData.wetBulbTemp, selectionData.waterFlowRate, selectedCells, minSafetyFactor, maxSafetyFactor]);

  // Handle cells change
  const handleCellsChange = (e) => {
    const cells = Number(e.target.value);
    setSelectedCells(cells);
  };

  // Update the model selection handler to include number of cells
  const handleModelSelection = (model) => {
    updateSelectionData({
      selectedModel: model.model_name,
      actualFlowRate: model.actualFlowRate,
      actualCapacity: model.actualCapacity,
      safetyFactor: model.safetyFactor,
      numberOfCells: selectedCells
    });
    // Close expanded model view when selecting
    setExpandedModel(null);
  };

  // Handle card click to expand/collapse details
  const toggleModelDetails = (modelName) => {
    if (expandedModel === modelName) {
      setExpandedModel(null);
    } else {
      setExpandedModel(modelName);
    }
  };

  // Update the Next button handler
  const handleNextStep = () => {
    // Ensure number of cells is saved before moving to next step
    updateSelectionData({
      numberOfCells: selectedCells
    });
    nextStep();
  };

  // Get selected model details for display
  const getSelectedModelDetails = () => {
    if (!selectionData.selectedModel) return null;
    
    // Find the selected model from filteredModels (which includes calculated values)
    return filteredModels.find(model => model.model_name === selectionData.selectedModel);
  };

  const selectedModelDetails = getSelectedModelDetails();

  // Render a model card for mobile view
  const renderModelCard = (model) => {
    const isSelected = selectionData.selectedModel === model.model_name;
    
    return (
      <div 
        key={model.model_name}
        onClick={() => handleModelSelection(model)}
        className={`border rounded-md mb-4 p-4 cursor-pointer ${
          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
        }`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="font-semibold text-gray-900 text-xl">{model.model_name}</div>
          <input
            type="radio"
            name="coolingTowerSelection"
            checked={isSelected}
            onChange={() => handleModelSelection(model)}
            className="w-5 h-5 accent-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div className="text-gray-800 font-medium">Nominal Capacity/cell:</div>
          <div className="text-right text-gray-900 font-medium">{model.nominal_capacity} RT</div>
          
          <div className="text-gray-800 font-medium">Nominal Flow Rate/cell:</div>
          <div className="text-right text-gray-900 font-medium">{model.nominal_flowrate.toFixed(2)} m³/hr</div>
          
          <div className="text-gray-800 font-medium">Motor Output:</div>
          <div className="text-right text-gray-900 font-medium">{model.motor_output} kW</div>
          
          <div className="text-gray-800 font-medium">Fan Diameter:</div>
          <div className="text-right text-gray-900 font-medium">{model.fan_diameter} mm</div>
          
          <div className="text-gray-800 font-medium">Dry Weight:</div>
          <div className="text-right text-gray-900 font-medium">{model.dry_weight} kg</div>
          
          <div className="text-gray-800 font-medium">Operating Weight:</div>
          <div className="text-right text-gray-900 font-medium">{model.operating_weight} kg</div>
          
          {/* <div className="text-gray-800 font-medium">Actual Capacity:</div>
          <div className="text-right text-gray-900 font-medium">{model.actualCapacity.toFixed(2)} RT</div> */}
          
          <div className="text-gray-800 font-medium">Actual Flow Rate:</div>
          <div className="text-right text-gray-900 font-medium">{model.actualFlowRate.toFixed(2)} m³/hr</div>
          
          <div className="text-gray-800 font-medium">Safety Factor:</div>
          <div className={`text-right font-medium ${model.safetyFactor >= 100 ? "text-green-600" : "text-red-600"}`}>
            {Math.round(model.safetyFactor)}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full mx-auto mt-4 p-4 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Cooling Tower Selection</h2>

      {/* Top section with Safety Factor and Input Parameters side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Safety Factor Range */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-semibold mb-2 text-gray-900">Safety Factor Range</h3>
          <div className="flex flex-wrap gap-3 mb-3">
            <div className="flex items-center">
              <label className="text-sm text-gray-700 mr-2">Min:</label>
              <input
                type="number"
                min="0"
                max={maxSafetyFactor}
                value={minSafetyFactor}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0 && value <= maxSafetyFactor) {
                    setMinSafetyFactor(value);
                  }
                }}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-gray-700"
              />
              <span className="ml-1 text-gray-700">%</span>
            </div>
            <div className="flex items-center">
              <label className="text-sm text-gray-700 mr-2">Max:</label>
              <input
                type="number"
                min={minSafetyFactor}
                value={maxSafetyFactor}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= minSafetyFactor) {
                    setMaxSafetyFactor(value);
                  }
                }}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-gray-700"
              />
              <span className="ml-1 text-gray-700">%</span>
            </div>
            <button
              onClick={() => {
                setMinSafetyFactor(100);
                setMaxSafetyFactor(150);
              }}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Input Parameters Display */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-semibold mb-2 text-gray-900">Input Parameters</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Water Flow Rate:</span>
              <span className="font-medium text-gray-700">{selectionData.waterFlowRate} m³/hr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Ambient Pressure:</span>
              <span className="font-medium text-gray-700">{selectionData.ambientPressure} kPa</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Hot Water Temp:</span>
              <span className="font-medium text-gray-700">{selectionData.hotWaterTemp} °C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Cold Water Temp:</span>
              <span className="font-medium text-gray-700">{selectionData.coldWaterTemp} °C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Wet Bulb Temp:</span>
              <span className="font-medium text-gray-700">{selectionData.wetBulbTemp} °C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Dry Bulb Temp:</span>
              <span className="font-medium text-gray-700">{selectionData.dryBulbTemp} °C</span>
            </div>
            {selectedModelDetails && (
              <div className="flex justify-between">
                <span className="text-gray-700">Design Condition RT:</span>
                <span className="font-medium text-gray-700">
                  {calculateCoolingCapacity(
                    Number(selectionData.hotWaterTemp),
                    Number(selectionData.coldWaterTemp),
                    Number(selectionData.wetBulbTemp),
                    Number(selectionData.waterFlowRate),
                    String(selectedModelDetails.type).toUpperCase()
                  ).toFixed(2)} RT
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model Selected Section */}
      {selectedModelDetails && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-lg font-semibold mb-3 text-blue-900">Model Selected:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-800 font-medium">Model:</span>
              <span className="font-semibold text-blue-900">{selectedModelDetails.model_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-800 font-medium">Type:</span>
              <span className="font-semibold text-blue-900">{selectedModelDetails.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-800 font-medium">Nominal Capacity/cell:</span>
              <span className="font-semibold text-blue-900">{selectedModelDetails.nominal_capacity} RT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-800 font-medium">Nominal Flow Rate/cell:</span>
              <span className="font-semibold text-blue-900">{selectedModelDetails.nominal_flowrate.toFixed(2)} m³/hr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-800 font-medium">Motor Output:</span>
              <span className="font-semibold text-blue-900">{selectedModelDetails.motor_output} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-800 font-medium">Fan Diameter:</span>
              <span className="font-semibold text-blue-900">{selectedModelDetails.fan_diameter} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-800 font-medium">Dry Weight:</span>
              <span className="font-semibold text-blue-900">{selectedModelDetails.dry_weight} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-800 font-medium">Operating Weight:</span>
              <span className="font-semibold text-blue-900">{selectedModelDetails.operating_weight} kg</span>
            </div>
            {/* <div className="flex justify-between">
              <span className="text-blue-800 font-medium">Actual Capacity:</span>
              <span className="font-semibold text-blue-900">{selectedModelDetails.actualCapacity.toFixed(2)} RT</span>
            </div> */}
            <div className="flex justify-between">
              <span className="text-blue-800 font-medium">Actual Flow Rate:</span>
              <span className="font-semibold text-blue-900">{selectedModelDetails.actualFlowRate.toFixed(2)} m³/hr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-800 font-medium">Safety Factor:</span>
              <span className={`font-semibold ${selectedModelDetails.safetyFactor >= 100 ? "text-green-600" : "text-red-600"}`}>
                {Math.round(selectedModelDetails.safetyFactor)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-800 font-medium">Number of Cells:</span>
              <span className="font-semibold text-blue-900">{selectedCells}</span>
            </div>
          </div>
        </div>
      )}

      {/* Cells Selection */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
        <div className="flex flex-col mb-2">
          <label className="text-sm font-semibold mb-2 text-gray-700">Number of Cells:</label>
          <div className="flex items-center">
            <button 
              onClick={() => {
                if (selectedCells > 1) {
                  const newValue = selectedCells - 1;
                  setSelectedCells(newValue);
                }
              }}
              className="px-3 py-1 bg-gray-200 rounded-l-md text-gray-700 font-bold"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max="20"
              value={selectedCells}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                // Allow empty input for typing purposes
                if (e.target.value === '') {
                  setSelectedCells(1);
                }
                // Only update if it's a number between 1 and 20
                else if (!isNaN(value) && value >= 1 && value <= 20) {
                  setSelectedCells(value);
                }
                // If value is outside range, set to nearest valid value
                else if (!isNaN(value)) {
                  const clampedValue = Math.min(Math.max(value, 1), 20);
                  setSelectedCells(clampedValue);
                }
              }}
              onBlur={(e) => {
                // When input loses focus, ensure value is within range
                const value = parseInt(e.target.value);
                if (isNaN(value) || value < 1) {
                  setSelectedCells(1);
                } else if (value > 20) {
                  setSelectedCells(20);
                }
              }}
              className="w-16 px-2 py-1 border-t border-b border-gray-300 text-center text-gray-900 font-medium"
            />
            <button 
              onClick={() => {
                if (selectedCells < 20) {
                  const newValue = selectedCells + 1;
                  setSelectedCells(newValue);
                }
              }}
              className="px-3 py-1 bg-gray-200 rounded-r-md text-gray-700 font-bold"
            >
              +
            </button>
          </div>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={selectedCells}
          onChange={handleCellsChange}
          className="w-full cursor-pointer"
        />
      </div>

      {/* View Toggle - Moved to left side */}
      <div className="mb-4 flex justify-start">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1 text-sm rounded-l-md ${
              viewMode === "cards"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1 text-sm rounded-r-md ${
              viewMode === "table"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-700">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && filteredModels.length === 0 && (
        <p className="text-gray-700">No cooling tower models meet the selection criteria (safety factor between {minSafetyFactor}% and {maxSafetyFactor}%).</p>
      )}

      {/* Card View (Mobile-Friendly) */}
      {!loading && !error && filteredModels.length > 0 && viewMode === "cards" && (
        <div className="space-y-2">
          {filteredModels.map(renderModelCard)}
        </div>
      )}

      {/* Table View (Desktop) */}
      {!loading && !error && filteredModels.length > 0 && viewMode === "table" && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2 text-center text-gray-900">Select</th>
                <th className="border p-2 text-center text-gray-900 whitespace-nowrap">Model</th>
                <th className="border p-2 text-center text-gray-900 whitespace-nowrap">Type</th>
                <th className="border p-2 text-center text-gray-900 whitespace-nowrap">Nominal Capacity/cell (RT)</th>
                <th className="border p-2 text-center text-gray-900 whitespace-nowrap">Nominal Flow Rate/cell (m³/hr)</th>
                <th className="border p-2 text-center text-gray-900 whitespace-nowrap">Motor Output (kW)</th>
                <th className="border p-2 text-center text-gray-900 whitespace-nowrap">Fan Diameter (mm)</th>
                <th className="border p-2 text-center text-gray-900 whitespace-nowrap">Dry Weight (kg)</th>
                <th className="border p-2 text-center text-gray-900 whitespace-nowrap">Operating Weight (kg)</th>
                {/* <th className="border p-2 text-center text-gray-900 whitespace-nowrap">Actual Capacity (RT)</th> */}
                <th className="border p-2 text-center text-gray-900 whitespace-nowrap">Actual Flow Rate (m³/hr)</th>
                <th className="border p-2 text-center text-gray-900 whitespace-nowrap">Safety Factor (%)</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map((model) => (
                <tr
                  key={model.model_name}
                  onClick={() => handleModelSelection(model)}
                  className={`border cursor-pointer transition-colors
                    ${selectionData.selectedModel === model.model_name 
                      ? "bg-blue-100" 
                      : "bg-white hover:bg-gray-50"}`}
                >
                  <td className="border p-2 text-center text-gray-900 whitespace-nowrap">
                    <input
                      type="radio"
                      name="coolingTowerSelection"
                      checked={selectionData.selectedModel === model.model_name}
                      onChange={() => handleModelSelection(model)}
                      className="w-4 h-4"
                      onClick={(e) => e.stopPropagation()} // Prevent row click when clicking radio
                    />
                  </td>
                  <td className="border p-2 text-left text-gray-900 whitespace-nowrap">{model.model_name}</td>
                  <td className="border p-2 text-center text-gray-900 whitespace-nowrap">
                    {model.type}
                  </td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.nominal_capacity}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.nominal_flowrate.toFixed(2)}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.motor_output}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.fan_diameter}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.dry_weight}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.operating_weight}</td>
                  {/* <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.actualCapacity.toFixed(2)}</td> */}
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.actualFlowRate.toFixed(2)}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">
                    <span className={model.safetyFactor >= 100 ? "text-green-600" : "text-red-600"}>
                      {Math.round(model.safetyFactor)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-between">
        <button 
          onClick={prevStep} 
          className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 w-full sm:w-auto"
        >
          Back
        </button>

        <button
          onClick={handleNextStep}
          disabled={!selectionData.selectedModel}
          className={`px-4 py-2 rounded w-full sm:w-auto ${
            selectionData.selectedModel ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}