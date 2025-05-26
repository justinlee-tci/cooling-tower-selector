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
import { calculateCWT, UTN_by_CTI } from '@/formula/performanceCurveCalculations';
import { createClient } from '@supabase/supabase-js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const formatDate = (dateString) => {
  if (!dateString) return '';
  return dateString.split('T')[0];
};

function PerformanceContent() {
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // For mobile view
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    ambientPressure: searchParams.get('pressure') || '',
    hotWaterTemp: searchParams.get('hotWater') || '',
    coldWaterTemp: searchParams.get('coldWater') || '',
    wetBulbTemp: searchParams.get('wetBulb') || '',
    dryBulbTemp: searchParams.get('dryBulb') || '',
    date: formatDate(searchParams.get('date')) || '',
    towerType: searchParams.get('towerType') || ''
  };

  // Fetch performance data from Supabase
  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (!params.modelName || !params.hotWaterTemp || !params.coldWaterTemp || !params.wetBulbTemp) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Query for exact match or closest performance data
        const { data, error } = await supabase
          .from('cooling_tower_performance')
          .select('lg_ratio, slope')
          .eq('model_name', params.modelName)
          .eq('hot_water_temp', parseFloat(params.hotWaterTemp))
          .eq('cold_water_temp', parseFloat(params.coldWaterTemp))
          .eq('wet_bulb_temp', parseFloat(params.wetBulbTemp))
          .single();

        if (error) {
          // If exact match not found, try to get any data for this model
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('cooling_tower_performance')
            .select('lg_ratio, slope')
            .eq('model_name', params.modelName)
            .limit(1)
            .single();

          if (fallbackError) {
            console.warn('No performance data found for model:', params.modelName);
            setError('Performance data not found for this model');
          } else {
            setPerformanceData(fallbackData);
            console.warn('Using fallback performance data for model:', params.modelName);
          }
        } else {
          setPerformanceData(data);
        }
      } catch (err) {
        console.error('Error fetching performance data:', err);
        setError('Failed to fetch performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [params.modelName, params.hotWaterTemp, params.coldWaterTemp, params.wetBulbTemp]);

  const designRange = parseFloat(params.hotWaterTemp) - parseFloat(params.coldWaterTemp);
  const designWBT = parseFloat(params.wetBulbTemp);

  const [ranges, setRanges] = useState([
    Number((designRange * 0.6).toFixed(1)),
    Number((designRange * 0.8).toFixed(1)),
    Number(designRange.toFixed(1)),
    Number((designRange * 1.2).toFixed(1)),
    Number((designRange * 1.4).toFixed(1))
  ]);

  const [wbtValues, setWbtValues] = useState([
    designWBT - 2,
    designWBT - 1,
    designWBT,
    designWBT + 1,
    designWBT + 2
  ]);

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

  const calculateColdWaterTemp = (wbt, range, flowRatePercent) => {
    // Convert tower type to match format expected by calculateCWT
    let flowType = "";
    if (params.towerType?.toLowerCase() === "crossflow") {
      flowType = "CROSS";
    } else if (params.towerType?.toLowerCase() === "counterflow") {
      flowType = "COUNTER";
    } else {
      flowType = "COUNTER"; // Default to counter flow if not specified
    }

    // Get lg_ratio and slope from database, or use defaults if not available
    const lgRatio = performanceData?.lg_ratio; // Default L/G ratio
    const slope = performanceData?.slope; // Default slope

    return calculateCWT(
      parseFloat(params.hotWaterTemp),
      parseFloat(params.coldWaterTemp),
      parseFloat(params.wetBulbTemp),
      parseFloat(wbt),
      parseFloat(range),
      parseFloat(params.ambientPressure),
      flowType,
      flowRatePercent,
      lgRatio,
      slope
    );
  };

  const createDatasetForFlowRate = (flowRate) => {
    const datasets = ranges.map((range, rangeIndex) => ({
      label: `Range ${range}°C`,
      data: wbtValues.map(wbt => calculateColdWaterTemp(wbt, range, flowRate)),
      borderColor: `hsl(${220 + rangeIndex * 30}, 70%, 50%)`,
      tension: 0.4,
    }));

    // Add design point only for 100% flow rate and if conditions exist in the table
    if (flowRate === 100) {
      const designWBT = parseFloat(params.wetBulbTemp);
      const designCWT = parseFloat(params.coldWaterTemp);
      
      // Check if design WBT exists in the table
      const wbtExists = wbtValues.some(wbt => Math.abs(wbt - designWBT) < 0.01);
      
      // Check if design CWT exists in any of the calculated values
      const cwtExists = ranges.some(range => {
        const calculatedCWT = calculateColdWaterTemp(designWBT, range, 100);
        return Math.abs(calculatedCWT - designCWT) < 0.01;
      });

      if (wbtExists && cwtExists) {
        datasets.push({
          label: 'Design Point',
          data: [{
            x: designWBT,
            y: designCWT
          }],
          backgroundColor: 'red',
          borderColor: 'red',
          pointRadius: 8,
          pointStyle: 'circle',
          showLine: false
        });
      }
    }

    return datasets;
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
        text: `Performance Curve`,
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
          <span className="text-gray-700 font-medium">Ambient Pressure:</span>
          <span className="text-gray-900 ml-2">{params.ambientPressure} kPa</span>
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
      
      {/* Performance Data Status */}
      {/* {performanceData && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">
            <span className="font-semibold">Performance Data:</span> Using L/G Ratio: {performanceData.lg_ratio?.toFixed(3)}, Slope: {performanceData.slope?.toFixed(3)}
          </p>
        </div>
      )} */}
      
      {error && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-700">
            <span className="font-semibold">Warning:</span> {error}. Using default values for calculations.
          </p>
        </div>
      )}
    </div>
  );

  const PerformanceTable = () => {
    const flowRates = [90, 100, 110];
    
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-600">Loading performance data...</div>
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        {flowRates.map(flowRate => (
          <div key={flowRate} className="overflow-x-auto pb-4">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Performance Data - {flowRate}% Flow ({flowRate === 100 
                ? parseFloat(params.waterFlowRate) 
                : (parseFloat(params.waterFlowRate) * flowRate / 100).toFixed(1)} m³/hr)
            </h3>
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className={`border border-gray-300 ${isMobile ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} text-black font-bold`}>
                    WBT (°C)
                  </th>
                  {ranges.map((range, index) => (
                    <th key={index} className={`border border-gray-300 ${isMobile ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'}`}>
                      <input
                        type="number"
                        value={range}
                        onChange={(e) => handleRangeChange(index, e.target.value)}
                        className={`${isMobile ? 'w-12 text-xs' : 'w-20 text-sm'} text-center text-black`}
                        step="1"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wbtValues.map((wbt, wbtIndex) => (
                  <tr key={wbtIndex}>
                    <td className={`border border-gray-300 ${isMobile ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'}`}>
                      <div className="flex items-center">
                        <span className={`${isMobile ? 'mr-1 text-xs' : 'mr-2 text-sm'} text-black font-bold`}>WBT (°C):</span>
                        <input
                          type="number"
                          value={wbt}
                          onChange={(e) => handleWbtChange(wbtIndex, e.target.value)}
                          className={`${isMobile ? 'w-12 text-xs' : 'w-16 text-sm'} text-center text-black`}
                          step="1"
                        />
                      </div>
                    </td>
                    {ranges.map((range, rangeIndex) => (
                      <td key={rangeIndex} className={`border border-gray-300 ${isMobile ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} text-center bg-gray-50 text-black`}>
                        {calculateColdWaterTemp(wbt, range, flowRate).toFixed(1)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
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
              <div className="w-full h-72">
                <Line data={createChartData(90)} options={chartOptions} />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                {params.towerType} Performance - 100% Flow ({parseFloat(params.waterFlowRate)} m³/hr)
              </h3>
              <div className="w-full h-72">
                <Line data={createChartData(100)} options={chartOptions} />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                {params.towerType} Performance - 110% Flow ({(parseFloat(params.waterFlowRate) * 1.1).toFixed(1)} m³/hr)
              </h3>
              <div className="w-full h-72">
                <Line data={createChartData(110)} options={chartOptions} />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 bg-white shadow-md rounded-md">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-600">Loading performance data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 bg-white shadow-md rounded-md">
  <div className="flex justify-between items-center mb-8 md:mb-12">
    <h2 className="text-xl font-bold text-gray-900">Cooling Tower Performance Curve</h2>
    <img 
      src="/company-logo.jpg" 
      alt="Company Logo" 
      className="h-16 md:h-24 w-auto object-contain"
    />
  </div>
      {/* <h2 className="text-xl font-bold text-gray-900 mb-4">{params.towerType} Performance Curve</h2> */}
      {/* <h2 className="text-xl font-bold text-gray-900 mb-4">Thermal Performance Curve</h2> */}

      
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
                {params.towerType} Performance Curve - 90% Flow Rate ({(parseFloat(params.waterFlowRate) * 0.9).toFixed(1)} m³/hr)
              </h3>
              <div className="w-full h-96">
                <Line data={createChartData(90)} options={chartOptions} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {params.towerType} Performance Curve - 100% Flow Rate ({parseFloat(params.waterFlowRate)} m³/hr)
              </h3>
              <div className="w-full h-96">
                <Line data={createChartData(100)} options={chartOptions} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {params.towerType} Performance Curve - 110% Flow Rate ({(parseFloat(params.waterFlowRate) * 1.1).toFixed(1)} m³/hr)
              </h3>
              <div className="w-full h-96">
                <Line data={createChartData(110)} options={chartOptions} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Disclaimer - Moved to bottom */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">DISCLAIMER:</span> The performance curves and calculations shown here are for preliminary reference only. 
          Actual cooling tower performance may vary depending on various environmental and operational factors. 
          For detailed analysis, specifications, and performance guarantees, please consult with your sales engineer 
          or technical representative.
        </p>
      </div>

      {/* Copyright Notice */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Thermal-Cell Sdn. Bhd. All rights reserved.</p>
      </div>
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