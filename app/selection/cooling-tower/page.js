"use client";
import { SelectionProvider } from "./SelectionContext";
import SelectionForm from "./SelectionForm";
import Navbar from "@/components/Navbar"; // Import the Navbar component

export default function SelectionPage() {
  return (
    <SelectionProvider>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto p-6">
          <SelectionForm />
        </div>
      </div>
    </SelectionProvider>
  );
}
