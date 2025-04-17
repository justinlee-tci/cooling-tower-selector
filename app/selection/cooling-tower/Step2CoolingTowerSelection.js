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
      numberOfCells: selectedCells // Add this line to save number of cells
    });
  };

  // Update the Next button handler
  const handleNextStep = () => {
    // Ensure number of cells is saved before moving to next step
    updateSelectionData({
      numberOfCells: selectedCells
    });
    nextStep();
  };

  return (
    <div className="max-w-8xl mx-auto mt-10 p-6 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Cooling Tower Selection</h2>

{/* Slider for selecting number of cells */}
<div className="mb-4">
  <div className="flex items-center mb-2">
    <label className="text-gray-900 font-medium mr-2">Number of Cells:</label>
    <input
      type="number"
      min="1"
      max="20"
      value={selectedCells}
      onChange={(e) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value) && value >= 1 && value <= 20) {
          setSelectedCells(value);
          // Update selection data when text input changes
          if (selectionData.selectedModel) {
            const selectedModel = filteredModels.find(model => model.model_name === selectionData.selectedModel);
            if (selectedModel) {
              const baseCapacity = performanceData[selectedModel.model_name] || 0;
              const actualCapacity = baseCapacity * value;
              const designFlowRate = parseFloat(selectionData.waterFlowRate) || 1;
              const safetyFactor = (actualCapacity / designFlowRate) * 100;

              updateSelectionData({
                numberOfCells: value,
                actualCapacity: actualCapacity,
                safetyFactor: safetyFactor
              });
            }
          }
        }
      }}
      className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-gray-900 font-medium"
    />
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

      {loading && <p className="text-gray-700">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && filteredModels.length === 0 && (
        <p className="text-gray-700">No cooling tower models meet the selection criteria.</p>
      )}

      {!loading && !error && filteredModels.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
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
                  className={`border ${selectionData.selectedModel === model.model_name ? "bg-blue-200" : "bg-white"}`}
                >
                  <td className="border p-2 text-center text-gray-900 whitespace-nowrap">
                    <input
                      type="radio"
                      name="coolingTowerSelection"
                      checked={selectionData.selectedModel === model.model_name}
                      onChange={() => handleModelSelection(model)}
                    />
                  </td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.model_name}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.nominal_capacity}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.nominal_flowrate.toFixed(2)}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.motor_output}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.fan_diameter}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.dry_weight}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.operating_weight}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.actualCapacity.toFixed(2)}</td>
                  <td className="border p-2 text-right text-gray-900 whitespace-nowrap">{model.safetyFactor.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Buttons */}
      <div className="mt-4 flex justify-between">
        <button onClick={prevStep} className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600">
          Back
        </button>

        <button
          onClick={handleNextStep}
          disabled={!selectionData.selectedModel}
          className={`px-4 py-2 rounded ${
            selectionData.selectedModel ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
