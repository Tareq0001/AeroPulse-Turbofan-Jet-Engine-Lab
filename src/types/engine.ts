// =====================================================================
// AERO-PULSE: Twin-Spool High-Bypass Turbofan & Brayton Cycle Simulator
// Types & Interfaces Definition
// Lead Architect: أ. طارق ابوعشي | Lead Aerospace Propulsion & Systems Architect
// =====================================================================

export type FaultMode = 'none' | 'compressor_stall' | 'bird_strike' | 'overtemp';

export type ThrottleDetent = 'CUTOFF' | 'IDLE' | 'CRUISE' | 'CLIMB' | 'TOGA' | 'AFTERBURNER';

export interface AtmosphereState {
  altitudeFt: number;
  altitudeM: number;
  mach: number;
  velocityMs: number;
  temperatureK: number;
  temperatureC: number;
  pressureKPa: number;
  densityKgM3: number;
  speedOfSoundMs: number;
  dynamicPressureKPa: number;
}

export interface EngineStation {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  stationNum: number;
  totalTemperatureK: number;
  totalTemperatureC: number;
  staticTemperatureK: number;
  staticTemperatureC: number;
  totalPressureKPa: number;
  staticPressureKPa: number;
  mach: number;
  velocityMs: number;
  entropyDelta: number; // s - s0 in J/(kg*K)
  xNorm: number; // 0..1 position along engine axis for canvas probes
  yNorm: number; // 0..1 vertical offset for probe
}

export interface BraytonCyclePoint {
  station: string;
  s: number; // Specific entropy offset in J/(kg*K)
  t: number; // Temperature in Kelvin
  tIdeal: number; // Isentropic temperature
  p: number; // Total pressure kPa
  label: string;
  labelAr: string;
}

export interface EngineState {
  // Flight & Pilot inputs
  throttlePLA: number;      // 0 - 105% (Power Lever Angle)
  detent: ThrottleDetent;
  altitudeFt: number;       // 0 - 45,000 ft
  machNumber: number;       // 0.00 - 0.92
  bypassRatio: number;      // 4.0 - 11.0
  afterburnerActive: boolean;
  faultMode: FaultMode;
  fadecAutoRelight: boolean;

  // Dual-Spool Dynamic Speeds (with rotational inertia integration)
  n1Percent: number;        // LP Spool (0 - 104%), base 2,850 RPM
  n2Percent: number;        // HP Spool (0 - 108%), base 12,400 RPM
  n1Target: number;
  n2Target: number;
  n1Rpm: number;
  n2Rpm: number;

  // Cycle Performance & Telemetry
  stations: Record<string, EngineStation>;
  braytonPoints: BraytonCyclePoint[];
  atmosphere: AtmosphereState;

  // Pressure Ratios & Temperatures
  fanPressureRatio: number; // FPR
  overallPressureRatio: number; // OPR (Pt3 / Pt2)
  titK: number;             // Turbine Inlet Temp (Pt4)
  titC: number;
  egtC: number;             // Exhaust Gas Temp (Station 5)
  egtRedlineC: number;      // e.g. 960 °C
  egtWarning: boolean;

  // Thrust & Dynamics
  fanThrustKn: number;
  coreThrustKn: number;
  afterburnerThrustKn: number;
  netThrustKn: number;
  netThrustLbf: number;
  airMassFlowTotalKgS: number;
  airMassFlowCoreKgS: number;
  airMassFlowBypassKgS: number;
  fuelFlowKgH: number;
  fuelFlowKgS: number;
  tsfcGKnS: number;         // Thrust Specific Fuel Consumption

  // Efficiencies
  thermalEfficiency: number;    // eta_th
  propulsiveEfficiency: number; // eta_p
  overallEfficiency: number;    // eta_o

  // Diagnostics & Health
  vibrationG: number;
  oilPressurePsi: number;
  oilTempC: number;
  compressorSurgeIntensity: number; // 0..1 for visual & sound kick
  shockDiamondsCount: number;       // 0..6 active Mach shock discs
  bladeTipMach: number;             // Fan tip relative Mach (transonic > 1.0)
  activeEventMessage: string;
  activeEventSeverity: 'normal' | 'caution' | 'warning' | 'emergency';
}

export interface EngineTelemetryLog {
  id: string;
  timestamp: string;
  message: string;
  messageAr: string;
  severity: 'normal' | 'caution' | 'warning' | 'emergency';
}
