/**
 * Enhanced Cooling Tower Calculator
 * Reverse-engineered functions to calculate cooling tower performance curve data
 */

/**
 * Calculate the enthalpy of air at a specific temperature
 * @param {number} T - Temperature in °C
 * @returns {number} Enthalpy in kJ/kg
 */
function calculateEnthalpy(T) {
    const CA = 373.15 / (T + 273.15);
    const CB = 1 / CA;
    const C1 = -0.00000013816 * (Math.pow(10, 11.344 * (1 - CB)) - 1);
    const C2 = 5.02808 * Math.log10(CA) + (-7.90298 * (CA - 1)) + Math.log10(1.03323);
    const C3 = 0.0081328 * (Math.pow(10, -3.49149 * (CA - 1)) - 1);
    const p = Math.pow(10, (C1 + C2 + C3));
    return 0.24 * T + (597.3 + 0.441 * T) * 0.622 * p / (1.03323 - p);
  }
  
  /**
   * Calculate the cold water temperature based on wet bulb temperature,
   * temperature range, and flow rate percentage
   * @param {number} hotWaterTemp - Hot water inlet temperature (°C)
   * @param {number} wetBulbTemp - Wet bulb temperature (°C)
   * @param {number} range - Temperature range (°C)
   * @param {number} flowRatePercent - Flow rate percentage (%)
   * @param {string} flowType - Flow type ("CROSSFLOW" or "COUNTERFLOW")
   * @returns {number} Cold water temperature (°C)
   */
  function calculateColdWaterTemp(hotWaterTemp, wetBulbTemp, range, flowRatePercent, flowType) {
    // First calculate the approach
    const approach = calculateApproach(hotWaterTemp, range, wetBulbTemp, flowRatePercent, flowType);
    
    // Cold water temperature = hot water temperature - range
    // or equivalently: wet bulb temperature + approach
    return wetBulbTemp + approach;
  }
  
  /**
   * Calculate the approach (difference between cold water and wet bulb temperatures)
   * @param {number} hotWaterTemp - Hot water inlet temperature (°C)
   * @param {number} range - Temperature range (°C)
   * @param {number} wetBulbTemp - Wet bulb temperature (°C)
   * @param {number} flowRatePercent - Flow rate percentage (%)
   * @param {string} flowType - Flow type ("CROSSFLOW" or "COUNTERFLOW")
   * @returns {number} Approach temperature (°C)
   */
  function calculateApproach(hotWaterTemp, range, wetBulbTemp, flowRatePercent, flowType) {
    // Adjust flow rate factor
    const flowFactor = flowRatePercent / 100;
    
    // Calculate cold water temperature without approach adjustment
    const coldWaterTemp = hotWaterTemp - range;
    
    // Baseline approach (difference between cold water temp and wet bulb temp)
    let baseApproach = coldWaterTemp - wetBulbTemp;
    
    // Adjust approach based on flow rate
    // For lower flow rates, the approach increases (less efficient cooling)
    // For higher flow rates, the approach decreases (more efficient cooling)
    let adjustedApproach;
    
    if (flowType === "COUNTERFLOW") {
      // Counter flow towers are more efficient
      adjustedApproach = baseApproach * (1 / flowFactor) * 0.9;
    } else {
      // Cross flow towers are less efficient
      adjustedApproach = baseApproach * (1 / flowFactor);
    }
    
    // Ensure approach is never negative (cold water can't be colder than wet bulb)
    return Math.max(1, adjustedApproach);
  }
  
  /**
   * Calculate the cooling capacity of a tower
   * @param {number} hotWaterTemp - Hot water inlet temperature (°C)
   * @param {number} coldWaterTemp - Cold water outlet temperature (°C)
   * @param {number} wetBulbTemp - Wet bulb temperature (°C)
   * @param {number} flowRate - Water flow rate (m³/hr)
   * @param {string} flowType - Flow type ("CROSSFLOW" or "COUNTERFLOW")
   * @returns {number} Cooling capacity in RT (Refrigeration Tons)
   */
  function calculateCoolingCapacity(hotWaterTemp, coldWaterTemp, wetBulbTemp, flowRate, flowType) {
    let N = 2;
    let R_N = 1;
    const FLOW = flowType.toUpperCase();
  
    let Fi_Formula = "Double";
    let a, b, c, slope = 0.78, efficiency = 0.98;
  
    if (FLOW === "COUNTERFLOW") {
      a = 0.700303572;
      b = -1.311808;
      c = 2.222;
    } else {
      a = 1.8488;
      b = -0.8;
      c = 1.772;
    }
  
    for (let i = 0; i < 50; i++) {
      const UTN_CTI = calculateUTN_by_CTI(hotWaterTemp, coldWaterTemp, wetBulbTemp, N, FLOW);
      const UTN_Fi = calculateUTN_of_Fi(a, b, N, Fi_Formula);
  
      if (UTN_Fi === 0 || UTN_CTI === 0) {
        N = 0;
        break;
      }
  
      if (Math.abs(UTN_CTI - UTN_Fi) <= 0.000004) break;
  
      if (UTN_CTI > UTN_Fi) N -= R_N;
      else N += R_N;
  
      R_N /= 2;
    }
  
    if (N === 0) return 0;
    return flowRate / (N / c) / slope * efficiency;
  }
  
  /**
   * Calculate the UTN (Number of Transfer Units) based on CTI method
   * @param {number} TW1 - Hot water inlet temperature (°C)
   * @param {number} TW2 - Cold water outlet temperature (°C)
   * @param {number} WB - Wet bulb temperature (°C)
   * @param {number} N - L/G ratio (liquid to gas)
   * @param {string} FLOW - Flow type ("CROSSFLOW" or "COUNTERFLOW")
   * @returns {number} UTN value
   */
  function calculateUTN_by_CTI(TW1, TW2, WB, N, FLOW) {
    const DT = TW1 - TW2;
  
    const I1 = calculateEnthalpy(TW1);
    const I2 = calculateEnthalpy(TW2);
    const I3 = calculateEnthalpy(WB);
  
    const I4 = calculateEnthalpy(0.9 * DT + TW2);
    const I5 = calculateEnthalpy(0.6 * DT + TW2);
    const I6 = calculateEnthalpy(0.4 * DT + TW2);
    const I7 = calculateEnthalpy(0.1 * DT + TW2);
  
    const X1 = 1 / (I4 - (I3 + N * 0.9 * DT));
    const X2 = 1 / (I5 - (I3 + N * 0.6 * DT));
    const X3 = 1 / (I6 - (I3 + N * 0.4 * DT));
    const X4 = 1 / (I7 - (I3 + N * 0.1 * DT));
  
    if (X1 <= 0 || X2 <= 0 || X3 <= 0 || X4 <= 0) return 0;
  
    let UTN = DT * (X1 + X2 + X3 + X4) / 4;
  
    if (FLOW === "COUNTERFLOW") {
      return UTN;
    } else if (FLOW === "CROSSFLOW") {
      const SS = (I2 - (I3 + N * DT)) / (I1 - I3);
      if (SS >= 1) return 0;
      const FF = 1 - 0.106 * Math.pow(1 - SS, 3.5);
      return UTN / FF;
    }
  
    return 0;
  }
  
  /**
   * Calculate the UTN based on Fi formula
   * @param {number} a - Coefficient a
   * @param {number} b - Coefficient b
   * @param {number} N - L/G ratio
   * @param {string} Fi_Formula - Formula type ("Single" or "Double")
   * @returns {number} UTN value
   */
  function calculateUTN_of_Fi(a, b, N, Fi_Formula) {
    if (Fi_Formula === "Single") {
      return Math.pow(10, a * N + b);
    } else if (Fi_Formula === "Double") {
      return a * Math.pow(N, b);
    }
    return 0;
  }
  
  /**
   * Calculate the required flow rate for a given cooling capacity
   * @param {number} hotWaterTemp - Hot water inlet temperature (°C)
   * @param {number} coldWaterTemp - Cold water outlet temperature (°C)
   * @param {number} wetBulbTemp - Wet bulb temperature (°C)
   * @param {number} coolingCapacityRT - Cooling capacity in RT (Refrigeration Tons)
   * @param {string} flowType - Flow type ("CROSSFLOW" or "COUNTERFLOW")
   * @returns {number} Required water flow rate (m³/hr)
   */
  function calculateFlowRate(hotWaterTemp, coldWaterTemp, wetBulbTemp, coolingCapacityRT, flowType) {
    let N = 2;
    let R_N = 1;
    let FLOW = flowType.toUpperCase();
  
    let Fi_Formula = "Double";
    let a, b, c, slope = 0.78, efficiency = 0.98;
  
    if (FLOW === "COUNTERFLOW") {
      a = 0.700303572;
      b = -1.311808;
      c = 2.222;
    } else {
      a = 1.8488;
      b = -0.8;
      c = 1.772;
    }
  
    for (let i = 0; i < 50; i++) {
      const UTN_CTI = calculateUTN_by_CTI(hotWaterTemp, coldWaterTemp, wetBulbTemp, N, FLOW);
      const UTN_Fi = calculateUTN_of_Fi(a, b, N, Fi_Formula);
  
      if (UTN_Fi === 0 || UTN_CTI === 0) {
        N = 0;
        break;
      }
  
      if (Math.abs(UTN_CTI - UTN_Fi) <= 0.000004) break;
  
      if (UTN_CTI > UTN_Fi) N -= R_N;
      else N += R_N;
  
      R_N /= 2;
    }
  
    if (N === 0) return 0;
  
    return coolingCapacityRT * (N / c) * slope / efficiency;
  }
  
  /**
   * Generate performance curve data points for a specific range of wet bulb temperatures
   * @param {number} hotWaterTemp - Hot water inlet temperature (°C)
   * @param {number} range - Temperature range (°C)
   * @param {array} wbtValues - Array of wet bulb temperatures (°C)
   * @param {number} flowRatePercent - Flow rate percentage (%)
   * @param {string} flowType - Flow type ("CROSSFLOW" or "COUNTERFLOW")
   * @returns {array} Array of cold water temperatures
   */
  function generatePerformanceCurveData(hotWaterTemp, range, wbtValues, flowRatePercent, flowType) {
    return wbtValues.map(wbt => {
      return calculateColdWaterTemp(hotWaterTemp, wbt, range, flowRatePercent, flowType);
    });
  }
  
  // Export functions
  export {
    calculateCoolingCapacity,
    calculateFlowRate,
    calculateColdWaterTemp,
    calculateApproach,
    generatePerformanceCurveData
  };