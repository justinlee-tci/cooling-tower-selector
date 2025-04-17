"use client";
import { useSelection } from "./SelectionContext";
import Step1ProjectDetails from "./Step1ProjectDetails";
import Step2CoolingTowerSelection from "./Step2CoolingTowerSelection";
import Step3Confirmation from "./Step3Confirmation";

export default function SelectionForm() {
  const { step } = useSelection();

  return (
    <div >
      {step === 1 && <Step1ProjectDetails />}
      {step === 2 && <Step2CoolingTowerSelection />}
      {step === 3 && <Step3Confirmation />}
    </div>
  );
}
