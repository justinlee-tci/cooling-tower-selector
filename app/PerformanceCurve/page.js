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
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // For mobile view
  const [activeRangeIndex, setActiveRangeIndex] = useState(null); // For mobile table view

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkScreenSize();
    
    // Add event listener
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const params = {
    modelName: searchParams.get('model') || '',
    projectName: searchParams.get('projectName') || '',
    customerName: searchParams.get('customerName') || '',
    location: searchParams.get('location') || '',
    selectionBy: searchParams.get('selectionBy') || '',
    waterFlowRate: searchParams.get('flowRate') || '',
    atmosphericPressure: searchParams.get('pressure') || '',
    hotWaterTemp: searchParams.get('hotWater') || '',
    coldWaterTemp: searchParams.get('coldWater') || '',
    wetBulbTemp: searchParams.get('wetBulb') || '',
    dryBulbTemp: searchParams.get('dryBulb') || '',
    date: formatDate(searchParams.get('date')) || '',
    towerType: searchParams.get('towerType') || ''
  };

  const designRange = parseFloat(params.hotWaterTemp) - parseFloat(params.coldWaterTemp);

  const [ranges, setRanges] = useState([
    Number((designRange * 0.6).toFixed(2)),
    Number((designRange * 0.8).toFixed(2)),
    Number(designRange.toFixed(2)),
    Number((designRange * 1.2).toFixed(2)),
    Number((designRange * 1.4).toFixed(2))
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
      label: `Range ${range}°C`,
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
          boxWidth: isMobile ? 12 : 16,
          font: {
            size: isMobile ? 10 : 12
          }
        }
      },
      title: {
        display: true,
        text: `${params.towerType} Cooling Tower Performance Curve`,
        font: {
          size: isMobile ? 14 : 16
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Inlet Wet Bulb Temperature (°C)',
          font: {
            size: isMobile ? 10 : 12
          }
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Cold Water Temperature (°C)',
          font: {
            size: isMobile ? 10 : 12
          }
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12
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
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Project Details</h3>
        <div className="mt-2 sm:mt-0">
          <span className="text-gray-900 font-medium">Selection By:</span>
          <span className="text-gray-900 ml-2">{params.selectionBy}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        <div>
          <span className="text-gray-700 font-medium">Project Name:</span>
          <span className="text-gray-900 ml-2">{params.projectName}</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Customer Name:</span>
          <span className="text-gray-900 ml-2">{params.customerName}</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Location:</span>
          <span className="text-gray-900 ml-2">{params.location}</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Date:</span>
          <span className="text-gray-900 ml-2">{params.date}</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Model Name:</span>
          <span className="text-gray-900 ml-2">{params.modelName}</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Tower Type:</span>
          <span className="text-gray-900 ml-2">{params.towerType}</span>
        </div>
      </div>
    </div>
  );

  const InputParameters = () => (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Input Parameters</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        <div>
          <span className="text-gray-700 font-medium">Water Flow Rate:</span>
          <span className="text-gray-900 ml-2">{params.waterFlowRate} m³/hr</span>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Atmospheric Pressure:</span>
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
    <div className="mb-4 md:hidden">
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
            {range}°C
          </button>
        ))}
        <button
          className={`px-2 py-1 text-xs rounded-md ${
            activeRangeIndex === null 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-800'
          }`}
          onClick={() => setActiveRangeIndex(null)}
        >
          View All
        </button>
      </div>
    </div>
  );

  const PerformanceTable = () => {
    // Mobile version with option to view one range at a time
    if (isMobile && activeRangeIndex !== null) {
      return (
        <div className="overflow-x-auto pb-4">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-xs text-black font-bold">
                  WBT (°C)
                </th>
                <th className="border border-gray-300 px-2 py-1 text-xs text-black font-bold">
                  CWT (°C) - Range {ranges[activeRangeIndex]}°C
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
        </div>
      );
    }
    
    // Full table for desktop or "View All" on mobile
    return (
      <div className="overflow-x-auto pb-4">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className={`border border-gray-300 px-${isMobile ? '2' : '4'} py-${isMobile ? '1' : '2'} text-${isMobile ? 'xs' : 'sm'} text-black font-bold`}>
                Range (°C)
              </th>
              {ranges.map((range, index) => (
                <th key={index} className={`border border-gray-300 px-${isMobile ? '2' : '4'} py-${isMobile ? '1' : '2'} text-${isMobile ? 'xs' : 'sm'}`}>
                  <input
                    type="number"
                    value={range}
                    onChange={(e) => handleRangeChange(index, e.target.value)}
                    className={`w-${isMobile ? '12' : '20'} text-center text-black text-${isMobile ? 'xs' : 'sm'}`}
                    step="0.01"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wbtValues.map((wbt, wbtIndex) => (
              <tr key={wbtIndex}>
                <td className={`border border-gray-300 px-${isMobile ? '2' : '4'} py-${isMobile ? '1' : '2'} text-${isMobile ? 'xs' : 'sm'}`}>
                  <div className="flex items-center">
                    <span className={`mr-${isMobile ? '1' : '2'} text-black font-bold text-${isMobile ? 'xs' : 'sm'}`}>WBT (°C):</span>
                    <input
                      type="number"
                      value={wbt}
                      onChange={(e) => handleWbtChange(wbtIndex, e.target.value)}
                      className={`w-${isMobile ? '12' : '16'} text-center text-black text-${isMobile ? 'xs' : 'sm'}`}
                      step="0.1"
                    />
                  </div>
                </td>
                {ranges.map((range, rangeIndex) => (
                  <td key={rangeIndex} className={`border border-gray-300 px-${isMobile ? '2' : '4'} py-${isMobile ? '1' : '2'} text-center bg-gray-50 text-${isMobile ? 'xs' : 'sm'} text-black`}>
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
            padding: ${isMobile ? '0.125rem' : '0.25rem'};
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
    <div className="flex overflow-x-auto whitespace-nowrap mb-4 border-b border-gray-200 md:hidden">
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
        className={`py-2 px-3 text-sm font-medium ${activeTab === 'charts' 
          ? 'text-blue-600 border-b-2 border-blue-600' 
          : 'text-gray-600'}`}
        onClick={() => setActiveTab('charts')}
      >
        Charts
      </button>
    </div>
  );

  const renderMobileContent = () => {
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
      case 'charts':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                {params.towerType} Performance - 90% Flow ({(parseFloat(params.waterFlowRate) * 0.9).toFixed(1)} m³/hr)
              </h3>
              <div className="w-full h-[300px]">
                <Line data={createChartData(90)} options={chartOptions} />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                {params.towerType} Performance - 100% Flow ({parseFloat(params.waterFlowRate)} m³/hr)
              </h3>
              <div className="w-full h-[300px]">
                <Line data={createChartData(100)} options={chartOptions} />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                {params.towerType} Performance - 110% Flow ({(parseFloat(params.waterFlowRate) * 1.1).toFixed(1)} m³/hr)
              </h3>
              <div className="w-full h-[300px]">
                <Line data={createChartData(110)} options={chartOptions} />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-bold text-gray-900 mb-6">{params.flowType} Performance Curve</h2>
      
      {/* Mobile View */}
      {isMobile && (
        <>
          <TabsNav />
          {renderMobileContent()}
        </>
      )}
      
      {/* Desktop View */}
      {!isMobile && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <ProjectDetails />
            <InputParameters />
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Data</h3>
            <PerformanceTable />
          </div>
          
          <div className="space-y-12">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {params.flowType} Performance Curve - 90% Flow Rate ({(parseFloat(params.waterFlowRate) * 0.9).toFixed(1)} m³/hr)
              </h3>
              <div className="w-full h-[400px]">
                <Line data={createChartData(90)} options={chartOptions} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {params.flowType} Performance Curve - 100% Flow Rate ({parseFloat(params.waterFlowRate)} m³/hr)
              </h3>
              <div className="w-full h-[400px]">
                <Line data={createChartData(100)} options={chartOptions} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {params.flowType} Performance Curve - 110% Flow Rate ({(parseFloat(params.waterFlowRate) * 1.1).toFixed(1)} m³/hr)
              </h3>
              <div className="w-full h-[400px]">
                <Line data={createChartData(110)} options={chartOptions} />
              </div>
            </div>
          </div>
        </>
      )}
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