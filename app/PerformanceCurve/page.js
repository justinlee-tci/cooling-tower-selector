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
  const [activeTab, setActiveTab] = useState('details'); // details, table, chart90, chart100, chart110
  const [activeRangeIndex, setActiveRangeIndex] = useState(null);

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
        labels: {
          boxWidth: 12,
          font: {
            size: 10
          }
        }
      },
      title: {
        display: true,
        text: 'Cooling Tower Performance Curve',
        font: {
          size: 14
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Inlet WBT (°C)',
          font: {
            size: 10
          }
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Cold Water Temp (°C)',
          font: {
            size: 10
          }
        },
        ticks: {
          font: {
            size: 10
          }
        }
      }
    }
  };

  const createChartData = (flowRate) => ({
    labels: wbtValues,
    datasets: createDatasetForFlowRate(flowRate)
  });

  const ProjectDetails = () => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-bold text-gray-900">Project Details</h3>
        <span className="text-xs text-gray-900">{params.selectionBy}</span>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-700 font-medium">Project:</span>
          <span className="text-gray-900 ml-2">{params.projectName}</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Client:</span>
          <span className="text-gray-900 ml-2">{params.clientName}</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Location:</span>
          <span className="text-gray-900 ml-2">{params.location}</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Date:</span>
          <span className="text-gray-900 ml-2">{params.date}</span>
        </div>
      </div>
    </div>
  );

  const InputParameters = () => (
    <div>
      <h3 className="text-base font-bold text-gray-900 mb-2">Input Parameters</h3>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-700 font-medium">Water Flow Rate:</span>
          <span className="text-gray-900 ml-2">{params.waterFlowRate} m³/hr</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Atm. Pressure:</span>
          <span className="text-gray-900 ml-2">{params.atmosphericPressure} kPa</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Hot Water Temp:</span>
          <span className="text-gray-900 ml-2">{params.hotWaterTemp} °C</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Cold Water Temp:</span>
          <span className="text-gray-900 ml-2">{params.coldWaterTemp} °C</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Wet Bulb Temp:</span>
          <span className="text-gray-900 ml-2">{params.wetBulbTemp} °C</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Dry Bulb Temp:</span>
          <span className="text-gray-900 ml-2">{params.dryBulbTemp} °C</span>
        </div>
      </div>
    </div>
  );

  const RangeSelector = () => (
    <div className="mb-4">
      <h3 className="text-base font-bold text-gray-900 mb-2">Select Range</h3>
      <div className="flex flex-wrap gap-2">
        {ranges.map((range, index) => (
          <button
            key={index}
            className={`px-2 py-1 text-xs rounded-md ${
              activeRangeIndex === index 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => setActiveRangeIndex(index)}
          >
            {range.toFixed(1)}°C
          </button>
        ))}
      </div>
    </div>
  );

  const PerformanceTable = () => {
    return (
      <div className="overflow-x-auto pb-2">
        {activeRangeIndex !== null ? (
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-xs text-black font-bold">
                  WBT (°C)
                </th>
                <th className="border border-gray-300 px-2 py-1 text-xs text-black font-bold">
                  CWT (°C) - Range {ranges[activeRangeIndex].toFixed(1)}°C
                </th>
              </tr>
            </thead>
            <tbody>
              {wbtValues.map((wbt, wbtIndex) => (
                <tr key={wbtIndex}>
                  <td className="border border-gray-300 px-2 py-1 text-center text-xs">
                    <input
                      type="number"
                      value={wbt}
                      onChange={(e) => handleWbtChange(wbtIndex, e.target.value)}
                      className="w-12 text-center text-black text-xs"
                      step="0.1"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center bg-gray-50 text-xs text-black">
                    {calculateCWT(wbt, ranges[activeRangeIndex], 100).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-xs text-black font-bold">
                  Range (°C)
                </th>
                {ranges.map((range, index) => (
                  <th key={index} className="border border-gray-300 px-2 py-1 text-xs">
                    <input
                      type="number"
                      value={range.toFixed(1)}
                      onChange={(e) => handleRangeChange(index, e.target.value)}
                      className="w-12 text-center text-black text-xs"
                      step="0.1"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wbtValues.map((wbt, wbtIndex) => (
                <tr key={wbtIndex}>
                  <td className="border border-gray-300 px-2 py-1 text-xs">
                    <div className="flex items-center">
                      <span className="mr-1 text-black font-bold text-xs">WBT:</span>
                      <input
                        type="number"
                        value={wbt}
                        onChange={(e) => handleWbtChange(wbtIndex, e.target.value)}
                        className="w-12 text-center text-black text-xs"
                        step="0.1"
                      />
                    </div>
                  </td>
                  {ranges.map((range, rangeIndex) => (
                    <td key={rangeIndex} className="border border-gray-300 px-2 py-1 text-center bg-gray-50 text-xs text-black">
                      {calculateCWT(wbt, range, 100).toFixed(1)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <style jsx>{`
          input[type="number"] {
            border: 1px solid #e2e8f0;
            border-radius: 0.25rem;
            padding: 0.125rem;
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
        `}</style>
      </div>
    );
  };

  const TabsNav = () => (
    <div className="flex overflow-x-auto whitespace-nowrap mb-4 border-b border-gray-200">
      <button 
        className={`py-2 px-3 text-sm font-medium ${activeTab === 'details' 
          ? 'text-blue-600 border-b-2 border-blue-600' 
          : 'text-gray-600'}`}
        onClick={() => setActiveTab('details')}
      >
        Details
      </button>
      <button 
        className={`py-2 px-3 text-sm font-medium ${activeTab === 'table' 
          ? 'text-blue-600 border-b-2 border-blue-600' 
          : 'text-gray-600'}`}
        onClick={() => setActiveTab('table')}
      >
        Table
      </button>
      <button 
        className={`py-2 px-3 text-sm font-medium ${activeTab === 'chart90' 
          ? 'text-blue-600 border-b-2 border-blue-600' 
          : 'text-gray-600'}`}
        onClick={() => setActiveTab('chart90')}
      >
        90% Flow
      </button>
      <button 
        className={`py-2 px-3 text-sm font-medium ${activeTab === 'chart100' 
          ? 'text-blue-600 border-b-2 border-blue-600' 
          : 'text-gray-600'}`}
        onClick={() => setActiveTab('chart100')}
      >
        100% Flow
      </button>
      <button 
        className={`py-2 px-3 text-sm font-medium ${activeTab === 'chart110' 
          ? 'text-blue-600 border-b-2 border-blue-600' 
          : 'text-gray-600'}`}
        onClick={() => setActiveTab('chart110')}
      >
        110% Flow
      </button>
    </div>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'details':
        return (
          <div>
            <ProjectDetails />
            <InputParameters />
          </div>
        );
      case 'table':
        return (
          <div>
            <RangeSelector />
            <PerformanceTable />
          </div>
        );
      case 'chart90':
        return (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">
              Performance - 90% Flow ({(parseFloat(params.waterFlowRate) * 0.9).toFixed(1)} m³/hr)
            </h3>
            <div className="w-full h-[300px]">
              <Line data={createChartData(90)} options={chartOptions} />
            </div>
          </div>
        );
      case 'chart100':
        return (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">
              Performance - 100% Flow ({parseFloat(params.waterFlowRate)} m³/hr)
            </h3>
            <div className="w-full h-[300px]">
              <Line data={createChartData(100)} options={chartOptions} />
            </div>
          </div>
        );
      case 'chart110':
        return (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">
              Performance - 110% Flow ({(parseFloat(params.waterFlowRate) * 1.1).toFixed(1)} m³/hr)
            </h3>
            <div className="w-full h-[300px]">
              <Line data={createChartData(110)} options={chartOptions} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full px-4 py-4 bg-white">
      <h2 className="text-lg font-bold text-gray-900 mb-3">Performance Curve</h2>
      
      <TabsNav />
      
      {renderContent()}
    </div>
  );
}

export default function PerformancePage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <PerformanceContent />
    </Suspense>
  );
}