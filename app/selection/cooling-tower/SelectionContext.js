"use client";
import { createContext, useContext, useState } from "react";
import { DEFAULT_FLOW_RATE_UNIT, DEFAULT_TEMPERATURE_UNIT } from "@/lib/units";

const SelectionContext = createContext();

export function SelectionProvider({ children }) {
  const [step, setStep] = useState(1);
  const [selectionData, setSelectionData] = useState({
    projectName: "",
    clientName: "",
    location: "",
    date: new Date().toISOString().split("T")[0], // Autofill today's date
    waterFlowRate: "",
    atmosphericPressure: "",
    hotWaterTemp: "",
    coldWaterTemp: "",
    wetBulbTemp: "",
    dryBulbTemp: "",
    selectedCoolingTower: null,
    numberOfCells: "",
    // Display units chosen on Step 1. Values above are always stored canonical
    // (°C, m³/hr, kPa); these only control how they are rendered downstream.
    flowRateUnit: DEFAULT_FLOW_RATE_UNIT,
    temperatureUnit: DEFAULT_TEMPERATURE_UNIT
  });

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);
  const updateSelectionData = (newData) =>
    setSelectionData((prev) => ({ ...prev, ...newData }));

  return (
    <SelectionContext.Provider
      value={{ step, nextStep, prevStep, selectionData, updateSelectionData }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  return useContext(SelectionContext);
}
