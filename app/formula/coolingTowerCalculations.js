/**
 * Cooling Tower Calculator for Reference Tonnage
 * Converted from VBA to JavaScript
 * 
 * DISCLAIMER:
 * The calculations and results provided by this module are for preliminary reference only.
 * Actual performance may vary depending on various environmental and operational factors.
 * For detailed analysis, specifications, and guarantees, please consult with your 
 * sales engineer or technical representative.
 * 
 * The manufacturer reserves the right to modify or update calculation methods
 * and accepts no liability for decisions made based on these calculations alone.
 */

// Counterflow Constants
const a_cf = 0.700303572;
const b_cf = -1.311808;
const c_cf = 2.222;

// Crossflow Constants //b = -0.728278 (for Tonnage Calculation)
const a_xf = 1.69782;       // Originally 1.8488, but adjusted for better accuracy
const b_xf = -0.7281;     // Originally -0.8, but adjusted for better accuracy 
const c_xf = 1.772;       // Value only returns in message box, not used in calculations

function calculateEnthalpy(T) {
    const CA = 373.15 / (T + 273.15);
    const CB = 1 / CA;
    const C1 = -0.00000013816 * (Math.pow(10, 11.344 * (1 - CB)) - 1);
    const C2 = 5.02808 * Math.log10(CA) + (-7.90298 * (CA - 1)) + Math.log10(1.03323);
    const C3 = 0.0081328 * (Math.pow(10, -3.49149 * (CA - 1)) - 1);
    const p = Math.pow(10, (C1 + C2 + C3));
    return 0.24 * T + (597.3 + 0.441 * T) * 0.622 * p / (1.03323 - p);
  }
  
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
  
  function calculateUTN_of_Fi(a, b, N, Fi_Formula) {
    if (Fi_Formula === "Single") {
      return Math.pow(10, a * N + b);
    } else if (Fi_Formula === "Double") {
      return a * Math.pow(N, b);
    }
    return 0;
  }
  
  function calculateCoolingCapacity(TW1, TW2, WB, FLOWRATE, type) {
    let N = 2;
    let R_N = 1;
    let FLOW = type.toUpperCase();
  
    let Fi_Formula = "Double";
    let a, b, c, slope = 0.78, efficiency = 0.98;
  
    if (FLOW === "COUNTERFLOW") {
      a = a_cf;
      b = b_cf;
      c = c_cf;
    } else {
      a = a_xf;
      b = b_xf;
      c = c_xf;
    }
  
    for (let i = 0; i < 50; i++) {
      const UTN_CTI = calculateUTN_by_CTI(TW1, TW2, WB, N, FLOW);
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
  
    return FLOWRATE / (N / c) / slope * efficiency;
  }
  
  function calculateFlowRate(TW1, TW2, WB, coolingCapacityRT, type) {
    let N = 2;
    let R_N = 1;
    let FLOW = type.toUpperCase();
  
    let Fi_Formula = "Double";
    let a, b, c, slope = 0.78, efficiency = 0.98;
  
    if (FLOW === "COUNTERFLOW") {
      a = a_cf;
      b = b_cf;
      c = c_cf;
    } else {
      a = a_xf;
      b = b_xf;
      c = c_xf;
    }
  
    for (let i = 0; i < 50; i++) {
      const UTN_CTI = calculateUTN_by_CTI(TW1, TW2, WB, N, FLOW);
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
  
  // ✅ Export as named exports (ESM format)
  export {
    calculateCoolingCapacity,
    calculateFlowRate
  };
  
//   // Test cases
//   console.log('=== Cooling Tower Capacity Test Cases ===');
  
//   // Test case 1: Regular flow
//   const test1 = calculateCoolingCapacity(37, 32, 27, 78, "CROSSFLOW");
//   console.log('Test 1 - Cross flow:');
//   console.log('Input: 37°C in, 32°C out, 27°C WB, 78 m³/hr, CROSSFLOW');
//   console.log(`Capacity: ${test1.toFixed(2)} RT\n`);
  
//   // Test case 2: Higher temperature difference
//   const test2 = calculateCoolingCapacity(40, 32, 28, 78, "CROSSFLOW");
//   console.log('Test 2 - Cross flow:');
//   console.log('Input: 40°C in, 32°C out, 28°C WB, 78 m³/hr, CROSSFLOW');
//   console.log(`Capacity: ${test2.toFixed(2)} RT\n`);
  
//   // Test case 3: Counter flow
//   const test3 = calculateCoolingCapacity(37, 32, 27, 78, "COUNTERFLOW");
//   console.log('Test 3 - Counter flow:');
//   console.log('Input: 37°C in, 32°C out, 27°C WB, 78 m³/hr, COUNTERFLOW');
//   console.log(`Capacity: ${test3.toFixed(2)} RT`);