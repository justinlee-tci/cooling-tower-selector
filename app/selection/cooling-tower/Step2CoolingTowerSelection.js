"use client";
import { useEffect, useState } from "react";
import { useSelection } from "./SelectionContext";
import { supabase } from "../../lib/supabaseClient";

export default function Step2CoolingTowerSelection() {
  const { selectionData, updateSelectionData, nextStep, prevStep } = useSelection();
  const [coolingTowerModels, setCoolingTowerModels] = useState([]);
  const [performanceData, setPerformanceData] = useState({});
  const [selectedCells, setSelectedCells] = useState(1);
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
        .select("model_name, nominal_capacity, nominal_flowrate, motor_output, fan_diameter, dry_weight, operating_weight");

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
      updateSelectionData({ selectedModel: null, actualCapacity: null, safetyFactor: null }); // Reset selection

      setLoading(false);
    };

    fetchData();
  }, []);

  // Calculate actual capacity and safety factor
  const filteredModels = coolingTowerModels
  .map((model) => {
    const baseCapacity = parseFloat(model.nominal_flowrate) || 0; // Use nominal_flowrate instead of performance data
    const actualCapacity = baseCapacity * selectedCells; // Adjust based on cell count

    const designFlowRate = parseFloat(selectionData.waterFlowRate) || 1; // Prevent division by zero
    const safetyFactor = (actualCapacity / designFlowRate) * 100;

    return { 
      ...model, 
      actualCapacity: Number(actualCapacity), 
      safetyFactor: Number(safetyFactor) 
    };
  });

  // Update the slider onChange handler to include updating selection data
  const handleCellsChange = (e) => {
    const cells = Number(e.target.value);
    setSelectedCells(cells);
    
    // Update the selection data immediately when cells change
    if (selectionData.selectedModel) {
      const selectedModel = filteredModels.find(model => model.model_name === selectionData.selectedModel);
      if (selectedModel) {
        const baseCapacity = performanceData[selectedModel.model_name] || 0;
        const actualCapacity = baseCapacity * cells;
        const designFlowRate = parseFloat(selectionData.waterFlowRate) || 1;
        const safetyFactor = (actualCapacity / designFlowRate) * 100;

        updateSelectionData({
          numberOfCells: cells,
          actualCapacity: actualCapacity,
          safetyFactor: safetyFactor
        });
      }
    }
  };

  // Update the model selection handler to include number of cells
  const handleModelSelection = (model) => {
    updateSelectionData({
      selectedModel: model.model_name,
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
          <div className="text-gray-800 font-medium">Nominal Capacity:</div>
          <div className="text-right text-gray-900 font-medium">{model.nominal_capacity} RT</div>
          
          <div className="text-gray-800 font-medium">Nominal Flowrate:</div>
          <div className="text-right text-gray-900 font-medium">{model.nominal_flowrate.toFixed(2)} m³/hr</div>
          
          <div className="text-gray-800 font-medium">Motor Output:</div>
          <div className="text-right text-gray-900 font-medium">{model.motor_output} kW</div>
          
          <div className="text-gray-800 font-medium">Fan Diameter:</div>
          <div className="text-right text-gray-900 font-medium">{model.fan_diameter} mm</div>
          
          <div className="text-gray-800 font-medium">Dry Weight:</div>
          <div className="text-right text-gray-900 font-medium">{model.dry_weight} kg</div>
          
          <div className="text-gray-800 font-medium">Operating Weight:</div>
          <div className="text-right text-gray-900 font-medium">{model.operating_weight} kg</div>
          
          <div className="text-gray-800 font-medium">Actual Capacity:</div>
          <div className="text-right text-gray-900 font-medium">{model.actualCapacity.toFixed(2)} m³/hr</div>
          
          <div className="text-gray-800 font-medium">Safety Factor:</div>
          <div className={`text-right font-medium ${model.safetyFactor >= 100 ? "text-green-600" : "text-red-600"}`}>
            {model.safetyFactor.toFixed(2)}%
          </div>
        </div>
      </div>
    );
  };

  // Add this near the top of your component with other useEffects
  useEffect(() => {
    handleCellsChange({ target: { value: selectedCells } });
  }, [selectedCells]);

  return (
    <div className="w-full mx-auto mt-4 p-4 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Cooling Tower Selection</h2>

      {/* Cells Selection */}
      <div className="mb-6 bg-gray-50 p-3 rounded-md">
        <div className="flex flex-col mb-2">
          <label className="text-gray-700 font-medium mb-1">Number of Cells:</label>
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
        <p className="text-gray-700">No cooling tower models meet the selection criteria.</p>
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
                <th className="border p-2 text-right text-gray-900 whitespace-nowrap">Model</th>
                <th className="border p-2 text-right text-gray-900 whitespace-nowrap">Nominal Capacity (RT)</th>
                <th className="border p-2 text-right text-gray-900 whitespace-nowrap">Nominal Flowrate (m³/hr)</th>
                <th className="border p-2 text-right text-gray-900 whitespace-nowrap">Motor Output (kW)</th>
                <th className="border p-2 text-right text-gray-900 whitespace-nowrap">Fan Diameter (mm)</th>
                <th className="border p-2 text-right text-gray-900 whitespace-nowrap">Dry Weight (kg)</th>
                <th className="border p-2 text-right text-gray-900 whitespace-nowrap">Operating Weight (kg)</th>
                <th className="border p-2 text-right text-gray-900 whitespace-nowrap">Actual Capacity (m³/hr)</th>
                <th className="border p-2 text-right text-gray-900 whitespace-nowrap">Safety Factor (%)</th>
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
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.model_name}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.nominal_capacity}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.nominal_flowrate.toFixed(2)}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.motor_output}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.fan_diameter}</td>
                  <td className="border p-2 text-gray-900 whitespace-nowrap">{model.dry_weight}</td>
                  <td className="border p-2 text-gray-900 whitespace-nowrap">{model.operating_weight}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.actualCapacity.toFixed(2)}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.safetyFactor.toFixed(2)}%</td>
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