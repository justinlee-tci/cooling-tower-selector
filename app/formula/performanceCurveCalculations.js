/**
 * Performance Curve Calculations for Cooling Tower Analysis
 * Converted from VBA to JavaScript
 */

// General constants
const Cpair = 1.006;    // Specific heat of air (kJ/kg·K)
const Cpvapor = 1.805;   // Specific heat of water vapor (kJ/kg·K)
const Cpwater = 4.186;  // Specific heat of water (kJ/kg·K)
const hfg = 2501;       // Latent heat of vaporization (kJ/kg)
const Mr = 0.62198;     // Molecular weight ratio of water vapor to dry air

// Fill performance constants
// const FILL_CONSTANT_A = 1.626;   // C constant based on (KaV/L)/(L/G)^SLOPE 
const FILL_SLOPE_B = -0.8;      // Fill's slope (b)
const DEFAULT_LG_RATIO = 1.8488;  // Fill's L/G ratio (N)
const DEFAULT_FILL_FORMULA = "Double"; // Default filling formula type

/**
 * Calculate Cold Water Temperature (CWT) based on parameters
 * Original VBA function: CWT_WB_Range_C_Slope_LG_P_FTYPE_CALTYPE
 * 
 * @param {number} WB - Wet Bulb temperature
 * @param {number} DTW - Range (Hot Water - Cold Water temperature)
 * @param {number} P1 - Atmospheric pressure (typically 101.325 kPa)
 * @param {string} FLOW - Flow type: "COUNTER" or "CROSS"
 * @param {number} flowRatePercent - Flow rate percentage (90, 100, or 110)
 * @returns {number} Cold Water Temperature
 */
function calculateCWT(hotWaterTemp, coldWaterTemp, wetBulbTemp, WB, DTW, P1, FLOW, flowRatePercent) {
    // Standardize flow type
    let flowType = FLOW.toUpperCase();
    if (flowType === "CROSSFLOW") flowType = "CROSS";
    if (flowType === "COUNTERFLOW") flowType = "COUNTER";

    // Calculate Temperature inlet
    let TW1 = (90 + (DTW + WB)) / 2; 
    let RTW1 = (TW1 - (DTW + WB)) / 2;
    let TW2 = TW1 - DTW;
    let No = 0;
    let UTN_CTI, UTN_Fi;
    let kavL = UTN_by_CTI(hotWaterTemp, coldWaterTemp, wetBulbTemp, P1, flowType, 100);
    let a = kavL/Math.pow(DEFAULT_LG_RATIO, FILL_SLOPE_B);    
    // Adjust L/G ratio based on flow rate percentage
    const baseN = DEFAULT_LG_RATIO;
    
    // START iteration loop
    while (true) {
        let PP = P1;
        
        UTN_CTI = UTN_by_CTI(TW1, TW2, WB, PP, flowType, flowRatePercent);
        UTN_Fi = calculateFillingPerformance(a, DEFAULT_FILL_FORMULA, flowRatePercent);
        
        if (UTN_Fi === 0) {
            return TW2;
        }
        
        No = No + 1;
        
        if (UTN_CTI === 0) {
            TW1 = TW1 + RTW1;
            RTW1 = RTW1 / 2;
            TW2 = TW1 - DTW;
            if (No < 100) continue;
            else return TW2;
        }
        
        if (UTN_CTI >= UTN_Fi - 0.000004 && UTN_CTI <= UTN_Fi + 0.000004) {
            return TW2;
        }
        
        if (UTN_CTI > UTN_Fi) {
            TW1 = TW1 + RTW1;
            RTW1 = RTW1 / 2;
            TW2 = TW1 - DTW;
            if (No < 100) continue;
            else return TW2;
        } else {
            TW1 = TW1 - RTW1;
            RTW1 = RTW1 / 2;
            TW2 = TW1 - DTW;
            if (No < 100) continue;
            else return TW2;
        }
    }
}

/**
 * Calculate U/N by CTI (KaV/L) 
 * Original VBA function: KaVL_HW_CW_WB_LG_P_FTYPE
 * 
 * @param {number} TW1 - Hot water temperature
 * @param {number} TW2 - Cold water temperature
 * @param {number} WB - Wet bulb temperature
 * @param {number} PP - Atmospheric pressure
 * @param {string} FLOW - Flow type: "COUNTER" or "CROSS"
 * @param {number} flowRatePercent - Flow rate percentage (90, 100, or 110)
 * @returns {number} KaV/L value
 */
function UTN_by_CTI(TW1, TW2, WB, PP, FLOW, flowRatePercent) {
    // Standardize flow type
    let flowType = FLOW.toUpperCase();
    if (flowType === "CROSSFLOW") flowType = "CROSS";
    if (flowType === "COUNTERFLOW") flowType = "COUNTER";

    // Using L/G ratio from global constant
    const N = DEFAULT_LG_RATIO*flowRatePercent/100; // Adjusted L/G ratio
    let DT = TW1 - TW2;
    let PPP = PP;
    
    let T1 = TW1;
    let I1 = calculateMoistAirEnthalpy(T1, T1, PPP);
    
    let T2 = TW2;
    let I2 = calculateMoistAirEnthalpy(T2, T2, PPP);
    
    let T3 = WB;
    let I3 = calculateMoistAirEnthalpy(T3, T3, PPP);
    
    let T4 = 0.9 * DT + TW2;
    let I4 = calculateMoistAirEnthalpy(T4, T4, PPP);
    
    let T5 = 0.6 * DT + TW2;
    let I5 = calculateMoistAirEnthalpy(T5, T5, PPP);
    
    let T6 = 0.4 * DT + TW2;
    let I6 = calculateMoistAirEnthalpy(T6, T6, PPP);
    
    let T7 = 0.1 * DT + TW2;
    let I7 = calculateMoistAirEnthalpy(T7, T7, PPP);
    
    let X1 = 1 / (I4 - (I3 + N * 0.9 * DT * 4.186));
    let X2 = 1 / (I5 - (I3 + N * 0.6 * DT * 4.186));
    let X3 = 1 / (I6 - (I3 + N * 0.4 * DT * 4.186));
    let X4 = 1 / (I7 - (I3 + N * 0.1 * DT * 4.186));
    
    if (X1 <= 0 || X2 <= 0 || X3 <= 0 || X4 <= 0) {
        return 0;
    }
    
    let result = DT * 4.186 * (X1 + X2 + X3 + X4) / 4;
    
    if (flowType === "COUNTER") {
        return result;
    } else if (flowType === "CROSS") {
        let SS = (I2 - (I3 + N * DT)) / (I1 - I3);
        if (SS >= 1) {
            return 0;
        }
        let FF = 1 - 0.106 * Math.pow((1 - SS), 3.5);
        return result / FF;
    } else {
        return 0;
    }
}

/**
 * Calculate enthalpy of moist air
 * Original VBA function: fh_DBT_WBT_P
 * 
 * @param {number} DBT - Dry Bulb Temperature (°C)
 * @param {number} WBT - Wet Bulb Temperature (°C)
 * @param {number} P - Atmospheric pressure (kPa)
 * @returns {number} Enthalpy (kJ/kg)
 */
function calculateMoistAirEnthalpy(DBT, WBT, P) {
    let w = calculateHumidityRatio(DBT, WBT, P);
    return Cpair * DBT + w * (hfg + Cpvapor * DBT);
}

/**
 * Calculate humidity ratio
 * Original VBA function: fW_DBT_WBT_P
 * 
 * @param {number} DBT - Dry Bulb Temperature (°C)
 * @param {number} WBT - Wet Bulb Temperature (°C)
 * @param {number} P - Atmospheric pressure (kPa)
 * @returns {number} Humidity ratio (kg/kg)
 */
function calculateHumidityRatio(DBT, WBT, P) {
    if (WBT > DBT) {
        console.error("Error: WBT > DBT");
        return null;
    }
    
    let PwsStar = calculateSaturatedVaporPressure(WBT);
    
    let tF = WBT * 1.8 + 32;
    let Ppsi = 14.696 * P / 101.325;
    
    let Fs_wb = calculateSaturationFactor(tF, Ppsi);
    
    let WsStar = Mr * PwsStar * Fs_wb / (P - PwsStar * Fs_wb);
    
    return ((hfg + (Cpvapor - Cpwater) * WBT) * WsStar - Cpair * (DBT - WBT)) / 
           (hfg + Cpvapor * DBT - Cpwater * WBT);
}

/**
 * Calculate U/N of Filling
 * Original VBA function: UTN_of_Fi
 * 
 * @param {string} Fi_Formula - Fill type formula: "Single" or "Double"
 * @param {number} flowRatePercent - Flow rate percentage (90, 100, or 110)
 * @returns {number} UTN value
 */
function calculateFillingPerformance(a, Fi_Formula, flowRatePercent) {
    // Using constants for fill performance
    // const a = FILL_CONSTANT_A;  // Fill constant from global constant
    const b = FILL_SLOPE_B;     // Fill slope from global constant
    const N = DEFAULT_LG_RATIO*flowRatePercent/100; // adjusted L/G ratio from global constant
    
    if (Fi_Formula === "Single") {
        return Math.pow(10, (a * N + b));
    }
    if (Fi_Formula === "Double") {
        return a * Math.pow(N, b);
    }
    return 0;
}

/**
 * Calculate saturated vapor pressure
 * Original VBA function: fPws
 * 
 * @param {number} t - Temperature (°C)
 * @returns {number} Saturated vapor pressure (kPa)
 */
function calculateSaturatedVaporPressure(t) {
    let ABST = t + 273.15;
    let lnPws;
    
    if (t >= -100 && t < 0) {
        lnPws = -5674.359 / ABST + 6.3925247 + (-0.00968025 + (0.00000062215701 
              + (2.0747825E-09 - 9.484024E-13 * ABST) * ABST) * ABST) * ABST 
              + 4.1635019 * Math.log(ABST);
    } else if (t >= 0 && t <= 200) {
        lnPws = -5800.2206 / ABST + (-5.516256) + (-0.048640239 
              + (0.000041764768 - 0.000000014452093 * ABST) * ABST) * ABST 
              + 6.5459673 * Math.log(ABST);
    } else {
        console.error("Temperature out of [-100,200] °C range!");
        return null;
    }
    
    return Math.exp(lnPws);
}

/**
 * Calculate saturation factor for wet bulb calculations
 * Original VBA function: Fswb
 * 
 * @param {number} t - Temperature in Fahrenheit
 * @param {number} P - Pressure in psi
 * @returns {number} Saturation factor
 */
function calculateSaturationFactor(t, P) {
    const C1 = 1.000119;
    const C2 = 0.000009184907;
    const C3 = 1.286098E-11;
    const C4 = -1.593274E-13;
    const C5 = 0.0002872637;
    const C6 = -0.000001618048;
    const C7 = 0.00000001467535;
    const C8 = 2.41896E-12;
    const C9 = -1.371762E-10;
    const C10 = -8.565893E-10;
    const C11 = 1.229524E-10;
    const C12 = -2.336628E-11;
    
    return (C1 + C2 * t + C3 * Math.pow(t, 4) + C4 * Math.pow(t, 5) + C5 * P + C6 * P * t) + 
           (C7 * P * Math.pow(t, 2) + C8 * P * Math.pow(t, 4) + C9 * t * Math.pow(P, 4)) + 
           (C10 * Math.pow(t, 2) * Math.pow(P, 2) + C11 * Math.pow(t, 2) * Math.pow(P, 3) + C12 * Math.pow(P, 2) * Math.pow(t, 3));
}

// Export functions for use in other modules
export {
    calculateCWT,                       // Original: CWT_WB_Range_C_Slope_LG_P_FTYPE_CALTYPE
    UTN_by_CTI,                         // Original: KaVL_HW_CW_WB_LG_P_FTYPE
    calculateMoistAirEnthalpy,          // Original: fh_DBT_WBT_P
    calculateHumidityRatio,             // Original: fW_DBT_WBT_P
    calculateFillingPerformance,        // Original: UTN_of_Fi
    calculateSaturatedVaporPressure,    // Original: fPws
    calculateSaturationFactor           // Original: Fswb
};

export const constants = {
    // FILL_CONSTANT_A,
    FILL_SLOPE_B,
    DEFAULT_LG_RATIO,
    DEFAULT_FILL_FORMULA
};