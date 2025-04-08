"use client";

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useState, useEffect, Suspense } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const formatDate = (dateString) => {
  if (!dateString) return '';
  return dateString.split('T')[0];
};

function PerformanceContent() {
  const searchParams = useSearchParams();

  const params = {
    modelName: searchParams.get('model') || '',
    projectName: searchParams.get('projectName') || '',
    clientName: searchParams.get('clientName') || '',
    location: searchParams.get('location') || '',
    selectionBy: searchParams.get('selectionBy') || '',
    waterFlowRate: searchParams.get('flowRate') || '',
    atmosphericPressure: searchParams.get('pressure') || '',
    hotWaterTemp: searchParams.get('hotWater') || '',
    coldWaterTemp: searchParams.get('coldWater') || '',
    wetBulbTemp: searchParams.get('wetBulb') || '',
    dryBulbTemp: searchParams.get('dryBulb') || '',
    date: formatDate(searchParams.get('date')) || ''
  };

  const designRange = parseFloat(params.hotWaterTemp) - parseFloat(params.coldWaterTemp);

  const [ranges, setRanges] = useState([
    designRange * 0.6,
    designRange * 0.8,
    designRange,
    designRange * 1.2,
    designRange * 1.4
  ]);

  const [wbtValues, setWbtValues] = useState([15, 20, 25, 30, 35]);

  const handleRangeChange = (index, value) => {
    const newRanges = [...ranges];
    newRanges[index] = parseFloat(value) || 0;
    setRanges(newRanges);
  };

  const handleWbtChange = (index, value) => {
    const newWbtValues = [...wbtValues];
    newWbtValues[index] = parseFloat(value) || 0;
    setWbtValues(newWbtValues);
  };

  const calculateCWT = (wbt, range, flowRatePercent) => {
    return parseFloat(params.hotWaterTemp) - (range * (1 - (wbt / 100)) * (flowRatePercent / 100));
  };

  const createDatasetForFlowRate = (flowRate) => {
    return ranges.map((range, rangeIndex) => ({
      label: `Range ${(range).toFixed(1)}°C`,
      data: wbtValues.map(wbt => calculateCWT(wbt, range, flowRate)),
      borderColor: `hsl(${220 + rangeIndex * 30}, 70%, 50%)`,
      tension: 0.4,
    }));
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Cooling Tower Performance Curve'
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Inlet Wet Bulb Temperature (°C)'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Cold Water Temperature (°C)'
        }
      }
    }
  };

  const createChartData = (flowRate) => ({
    labels: wbtValues,
    datasets: createDatasetForFlowRate(flowRate)
  });

  const PerformanceTable = () => {
    return (
      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-black font-bold">Range (°C)</th>
              {ranges.map((range, index) => (
                <th key={index} className="border border-gray-300 px-4 py-2">
                  <input
                    type="number"
                    value={range.toFixed(1)}
                    onChange={(e) => handleRangeChange(index, e.target.value)}
                    className="w-20 text-center text-black"
                    step="0.1"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wbtValues.map((wbt, wbtIndex) => (
              <tr key={wbtIndex}>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="flex items-center">
                    <span className="mr-2 text-black font-bold">WBT (°C):</span>
                    <input
                      type="number"
                      value={wbt}
                      onChange={(e) => handleWbtChange(wbtIndex, e.target.value)}
                      className="w-16 text-center text-black font-bold"
                      step="0.1"
                    />
                  </div>
                </td>
                {ranges.map((range, rangeIndex) => (
                  <td key={rangeIndex} className="border border-gray-300 px-4 py-2 text-center bg-gray-50 text-black">
                    {calculateCWT(wbt, range, 100).toFixed(1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <style jsx>{`
          input[type="number"] {
            border: 1px solid #e2e8f0;
            border-radius: 0.25rem;
            padding: 0.25rem;
            outline: none;
            color: black;
          }
          
          input[type="number"]:focus {
            border-color: #4299e1;
            box-shadow: 0 0 0 1px #4299e1;
          }
          
          .bg-gray-50 {
            background-color: #f8fafc;
          }

          th, td {
            color: black;
          }

          th {
            color: black;
            font-weight: bold;
          }

          .font-bold {
            font-weight: bold;
          }
        `}</style>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Curve</h2>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Project Details</h3>
          <div className="flex items-center space-x-3">
            <span className="text-gray-900 font-medium">Selection By:</span>
            <span className="text-gray-900">{params.selectionBy}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-gray-900 font-medium w-32">Project Name:</span>
            <span className="text-gray-900">{params.projectName}</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-900 font-medium w-32">Client Name:</span>
            <span className="text-gray-900">{params.clientName}</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-900 font-medium w-32">Location:</span>
            <span className="text-gray-900">{params.location}</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-900 font-medium w-32">Date:</span>
            <span className="text-gray-900">{params.date}</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Input Parameters</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-gray-900 font-medium w-44">Water Flow Rate:</span>
            <span className="text-gray-900">{params.waterFlowRate} m³/hr</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-900 font-medium w-44">Atmospheric Pressure:</span>
            <span className="text-gray-900">{params.atmosphericPressure} kPa</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-900 font-medium w-44">Hot Water Temp:</span>
            <span className="text-gray-900">{params.hotWaterTemp} °C</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-900 font-medium w-44">Cold Water Temp:</span>
            <span className="text-gray-900">{params.coldWaterTemp} °C</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-900 font-medium w-44">Wet Bulb Temp:</span>
            <span className="text-gray-900">{params.wetBulbTemp} °C</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-900 font-medium w-44">Dry Bulb Temp:</span>
            <span className="text-gray-900">{params.dryBulbTemp} °C</span>
          </div>
        </div>
      </div>

      <PerformanceTable />
      <div className="mt-8 space-y-12">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Performance Curve - 90% Flow Rate ({(parseFloat(params.waterFlowRate) * 0.9).toFixed(1)} m³/hr)
          </h3>
          <div className="w-full h-[400px]">
            <Line data={createChartData(90)} options={chartOptions} />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Performance Curve - 100% Flow Rate ({parseFloat(params.waterFlowRate)} m³/hr)
          </h3>
          <div className="w-full h-[400px]">
            <Line data={createChartData(100)} options={chartOptions} />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Performance Curve - 110% Flow Rate ({(parseFloat(params.waterFlowRate) * 1.1).toFixed(1)} m³/hr)
          </h3>
          <div className="w-full h-[400px]">
            <Line data={createChartData(110)} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PerformanceContent />
    </Suspense>
  );
}