/**
 * Shared unit handling for the selection flow.
 *
 * Canonical storage is always metric: temperatures in °C, flow rates in m³/hr,
 * pressure in kPa. The thermal calculations in app/formula require those units,
 * and every row already in the database is stored that way. The unit a user
 * picks on Step 1 is display metadata only: it travels with the selection and
 * is applied at render time, never at storage or calculation time.
 */

export const FLOW_RATE_UNITS = ["m³/hr", "L/min", "US GPM", "L/s"];
export const TEMPERATURE_UNITS = ["°C", "°F"];

export const DEFAULT_FLOW_RATE_UNIT = "m³/hr";
export const DEFAULT_TEMPERATURE_UNIT = "°C";

/**
 * Convert a flow rate between supported units.
 * 1 m³/hr = 1000/60 L/min = 4.40287 US GPM = 1/3.6 L/s
 */
export const convertFlowRate = (value, fromUnit, toUnit) => {
  if (!value) return "";
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return "";

  if (fromUnit === toUnit) return numValue;

  // Convert input to m³/hr first
  let valueInM3hr = numValue;
  if (fromUnit === "L/min") valueInM3hr = numValue * 60 / 1000;
  if (fromUnit === "US GPM") valueInM3hr = numValue * 0.2271247;
  if (fromUnit === "L/s") valueInM3hr = numValue * 3.6;

  // Convert from m³/hr to target unit
  if (toUnit === "m³/hr") return Number(valueInM3hr.toFixed(2));
  if (toUnit === "L/min") return Number((valueInM3hr * 1000 / 60).toFixed(2));
  if (toUnit === "US GPM") return Number((valueInM3hr / 0.2271247).toFixed(2));
  if (toUnit === "L/s") return Number((valueInM3hr / 3.6).toFixed(2));

  return numValue;
};

/** Convert a temperature between °C and °F. */
export const convertTemperature = (value, fromUnit, toUnit) => {
  if (value === "" || value === undefined || value === null) return "";
  const numValue = parseFloat(value);
  if (isNaN(numValue) || fromUnit === toUnit) return value;
  if (fromUnit === "°C" && toUnit === "°F") return Number((numValue * 9 / 5 + 32).toFixed(2));
  if (fromUnit === "°F" && toUnit === "°C") return Number(((numValue - 32) * 5 / 9).toFixed(2));
  return value;
};

/**
 * A temperature DIFFERENCE (range, approach) is a delta, not a point on the
 * scale, so it scales by 9/5 without the +32 offset. Using convertTemperature
 * on a range would overstate it by 32 degrees.
 */
export const convertTemperatureDelta = (value, fromUnit, toUnit) => {
  if (value === "" || value === undefined || value === null) return "";
  const numValue = parseFloat(value);
  if (isNaN(numValue) || fromUnit === toUnit) return numValue;
  if (fromUnit === "°C" && toUnit === "°F") return Number((numValue * 9 / 5).toFixed(2));
  if (fromUnit === "°F" && toUnit === "°C") return Number((numValue * 5 / 9).toFixed(2));
  return numValue;
};

// Standard atmosphere: P = 101.325 * (1 - 2.25577e-5 * h)^5.25588
export const elevationToPressure = (elevationMeters) => {
  if (elevationMeters === "" || elevationMeters === undefined || elevationMeters === null) return "";
  const h = parseFloat(elevationMeters);
  if (isNaN(h)) return "";
  return Number((101.325 * Math.pow(1 - 2.25577e-5 * h, 5.25588)).toFixed(3));
};

export const pressureToElevation = (pressureKpa) => {
  if (pressureKpa === "" || pressureKpa === undefined || pressureKpa === null) return "";
  const p = parseFloat(pressureKpa);
  if (isNaN(p) || p <= 0) return "";
  return Number(((1 - Math.pow(p / 101.325, 1 / 5.25588)) / 2.25577e-5).toFixed(1));
};

/** Normalise whatever came back from the database or a URL to a supported unit. */
export const safeFlowRateUnit = (unit) =>
  FLOW_RATE_UNITS.includes(unit) ? unit : DEFAULT_FLOW_RATE_UNIT;

export const safeTemperatureUnit = (unit) =>
  TEMPERATURE_UNITS.includes(unit) ? unit : DEFAULT_TEMPERATURE_UNIT;

/**
 * Display helpers. Each takes a canonical metric value and returns a string in
 * the requested unit. Null/undefined/empty render as "-" so callers do not each
 * reinvent that check.
 */
const format = (value, digits) => {
  if (value === "" || value === undefined || value === null) return "-";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "-";
};

export const displayFlowRate = (valueM3hr, unit, digits = 2) =>
  format(convertFlowRate(valueM3hr, DEFAULT_FLOW_RATE_UNIT, safeFlowRateUnit(unit)), digits);

export const displayTemperature = (valueC, unit, digits = 2) =>
  format(convertTemperature(valueC, DEFAULT_TEMPERATURE_UNIT, safeTemperatureUnit(unit)), digits);

export const displayTemperatureDelta = (valueC, unit, digits = 2) =>
  format(convertTemperatureDelta(valueC, DEFAULT_TEMPERATURE_UNIT, safeTemperatureUnit(unit)), digits);
