/**
 * Cooling Tower Calculator
 * Converts VBA functions to JavaScript for calculating cooling tower performance
 */

/**
 * Calculate enthalpy value based on temperature
 * @param {number} T - Temperature in Celsius
 * @returns {number} Enthalpy value
 */
function calculateEnthalpy(T) {
    const CA = 373.15 / (T + 273.15);
    const CB = 1 / CA;
    const C1 = (-0.00000013816) * (Math.pow(10, 11.344 * (1 - CB)) - 1);
    const C2 = 5.02808 * (Math.log10(CA)) + (-7.90298 * (CA - 1)) + Math.log10(1.03323);
    const C3 = 0.0081328 * (Math.pow(10, -3.49149 * (CA - 1)) - 1);
    const p = Math.pow(10, (C1 + C2 + C3));
    return 0.24 * T + (597.3 + 0.441 * T) * 0.622 * p / (1.03323 - p);
  }
  
  /**
   * Calculate UTN by CTI method
   * @param {number} TW1 - Inlet water temperature (°C)
   * @param {number} TW2 - Outlet water temperature (°C)
   * @param {number} WB - Wet bulb temperature (°C)
   * @param {number} N - N value
   * @param {string} FLOW - Flow type ("COUNTER" or "CROSS")
   * @returns {number} UTN value
   */
  function calculateUTN_by_CTI(TW1, TW2, WB, N, FLOW) {
    const DT = TW1 - TW2;
    
    const T1 = TW1;
    const I1 = calculateEnthalpy(T1);
    
    const T2 = TW2;
    const I2 = calculateEnthalpy(T2);
    
    const T3 = WB;
    const I3 = calculateEnthalpy(T3);
    
    const T4 = 0.9 * DT + TW2;
    const I4 = calculateEnthalpy(T4);
    
    const T5 = 0.6 * DT + TW2;
    const I5 = calculateEnthalpy(T5);
    
    const T6 = 0.4 * DT + TW2;
    const I6 = calculateEnthalpy(T6);
    
    const T7 = 0.1 * DT + TW2;
    const I7 = calculateEnthalpy(T7);
    
    const X1 = 1 / (I4 - (I3 + N * 0.9 * DT));
    const X2 = 1 / (I5 - (I3 + N * 0.6 * DT));
    const X3 = 1 / (I6 - (I3 + N * 0.4 * DT));
    const X4 = 1 / (I7 - (I3 + N * 0.1 * DT));
    
    if (X1 <= 0 || X2 <= 0 || X3 <= 0 || X4 <= 0) {
      return 0;
    }
    
    let UTN = DT * (X1 + X2 + X3 + X4) / 4;
    
    if (FLOW === "COUNTER") {
      return UTN;
    } else if (FLOW === "CROSS") {
      const SS = (I2 - (I3 + N * DT)) / (I1 - I3);
      if (SS >= 1) {
        return 0;
      }
      const FF = 1 - 0.106 * Math.pow(1 - SS, 3.5);
      return UTN / FF;
    } else {
      return 0;
    }
  }
  
  /**
   * Calculate UTN of Filling
   * @param {number} a - Coefficient a
   * @param {number} b - Coefficient b
   * @param {number} N - N value
   * @param {string} Fi_Formula - Formula type ("Single" or "Double")
   * @returns {number} UTN value
   */
  function calculateUTN_of_Fi(a, b, N, Fi_Formula) {
    if (Fi_Formula === "Single") {
      return Math.pow(10, a * N + b);
    } else if (Fi_Formula === "Double") {
      return a * Math.pow(N, b);
    } else {
      return 0;
    }
  }
  
  /**
   * Calculate cooling capacity
   * @param {number} TW1 - Inlet water temperature (°C)
   * @param {number} TW2 - Outlet water temperature (°C)
   * @param {number} WB - Wet bulb temperature (°C)
   * @param {number} FLOWRATE - Flow rate
   * @param {string} type - Flow type ("COUNTER" or "CROSS")
   * @returns {number} Cooling capacity in RT
   */
  function calculateCoolingCapacity(TW1, TW2, WB, FLOWRATE, type) {
    let N = 2;
    let R_N = 1;
    let No = 0;
    let FLOW = type.toUpperCase();
    
    // Set coefficients based on flow type
    let Fi_Formula = "Double";
    let a, b, c, slope, efficiency;
    
    if (FLOW === "COUNTERFLOW") {
      a = 0.700303572;
      b = -1.311808;
      c = 2.222;
    } else {  // CROSS
      a = 1.8488;
      b = -0.8;
      c = 1.772;
    }
    
    // Constants for both types
    slope = 0.78;
    efficiency = 0.98;
    
    // Iterative calculation to find N
    for (let i = 0; i < 50; i++) {
      const UTN_CTI = calculateUTN_by_CTI(TW1, TW2, WB, N, FLOW);
      const UTN_Fi = calculateUTN_of_Fi(a, b, N, Fi_Formula);
      
      if (UTN_Fi === 0) {
        N = 0;
        break;
      }
      
      if (UTN_CTI === 0) {
        N = N - R_N;
        R_N = R_N / 2;
        continue;
      }
      
      if (Math.abs(UTN_CTI - UTN_Fi) <= 0.000004) {
        break;
      }
      
      if (UTN_CTI > UTN_Fi) {
        N = N - R_N;
      } else {
        N = N + R_N;
      }
      
      R_N = R_N / 2;
      No++;
    }
    
    // Calculate cooling capacity
    return FLOWRATE / (N / c) / slope * efficiency;
  }
  
  // Export the main function
  module.exports = calculateCoolingCapacity;
  
  // Example usage:
  // const coolingCapacity = calculateCoolingCapacity(35, 30, 25, 100, "COUNTER");
  // console.log(`Cooling Capacity: ${coolingCapacity.toFixed(2)} RT`);