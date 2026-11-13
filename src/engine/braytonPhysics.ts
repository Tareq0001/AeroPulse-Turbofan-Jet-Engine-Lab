// =====================================================================
// AERO-PULSE: Twin-Spool High-Bypass Turbofan & Brayton Cycle Simulator
// Aerothermodynamics & Dual-Spool Physics Engine
// Lead Architect: أ. طارق ابوعشي | Lead Aerospace Propulsion & Systems Architect
// =====================================================================

import {
  AtmosphereState,
  EngineState
} from '../types/engine';

// Standard Gas Constants
const GAMMA_AIR = 1.4;
const CP_AIR = 1005; // J/(kg*K)
const R_AIR = 287.05; // J/(kg*K)
const GAMMA_GAS = 1.333;
const CP_GAS = 1150; // J/(kg*K) for combustion products
const LHV_JETA1 = 43.1e6; // J/kg lower heating value of Jet-A1
const G0 = 9.80665; // m/s^2
const FAN_DIA_M = 2.95; // 116 inch fan diameter (m)

export class BraytonPhysicsEngine {
  private state: EngineState;
  private lastTimeMs: number = 0;
  private surgeTimer: number = 0;
  private birdStrikeTimer: number = 0;

  constructor() {
    this.state = this.getInitialState();
  }

  public getInitialState(): EngineState {
    const defaultAlt = 0;
    const defaultMach = 0.0;
    const atmo = this.computeISA(defaultAlt, defaultMach);

    return {
      throttlePLA: 25, // Idle detent
      detent: 'IDLE',
      altitudeFt: 0,
      machNumber: 0.0,
      bypassRatio: 8.5,
      afterburnerActive: false,
      faultMode: 'none',
      fadecAutoRelight: false,

      n1Percent: 24.0,
      n2Percent: 62.0,
      n1Target: 24.0,
      n2Target: 62.0,
      n1Rpm: 684,
      n2Rpm: 7688,

      stations: {},
      braytonPoints: [],
      atmosphere: atmo,

      fanPressureRatio: 1.15,
      overallPressureRatio: 8.2,
      titK: 850,
      titC: 577,
      egtC: 460,
      egtRedlineC: 960,
      egtWarning: false,

      fanThrustKn: 8.5,
      coreThrustKn: 4.2,
      afterburnerThrustKn: 0,
      netThrustKn: 12.7,
      netThrustLbf: 2855,
      airMassFlowTotalKgS: 180,
      airMassFlowCoreKgS: 21.2,
      airMassFlowBypassKgS: 158.8,
      fuelFlowKgH: 520,
      fuelFlowKgS: 0.144,
      tsfcGKnS: 11.3,

      thermalEfficiency: 0.28,
      propulsiveEfficiency: 0.45,
      overallEfficiency: 0.126,

      vibrationG: 0.25,
      oilPressurePsi: 58,
      oilTempC: 78,
      compressorSurgeIntensity: 0,
      shockDiamondsCount: 0,
      bladeTipMach: 0.35,
      activeEventMessage: 'FADEC DUAL-CHANNEL NOMINAL // READY FOR TAXI & TAKEOFF',
      activeEventSeverity: 'normal'
    };
  }

  // International Standard Atmosphere (ISA 1976 Model)
  public computeISA(altitudeFt: number, mach: number): AtmosphereState {
    const hM = altitudeFt * 0.3048;
    const T_sl = 288.15; // K (15 °C)
    const P_sl = 101.325; // kPa
    const lapseRate = -0.0065; // K/m in troposphere
    const hTropo = 11000; // 11,000 m (36,089 ft)

    let T_amb: number;
    let P_amb: number;

    if (hM <= hTropo) {
      T_amb = T_sl + lapseRate * hM;
      P_amb = P_sl * Math.pow(T_amb / T_sl, -G0 / (lapseRate * R_AIR));
    } else {
      const T_tropo = T_sl + lapseRate * hTropo; // 216.65 K (-56.5 °C)
      const P_tropo = P_sl * Math.pow(T_tropo / T_sl, -G0 / (lapseRate * R_AIR));
      T_amb = T_tropo;
      P_amb = P_tropo * Math.exp((-G0 * (hM - hTropo)) / (R_AIR * T_tropo));
    }

    const rho_amb = (P_amb * 1000) / (R_AIR * T_amb);
    const a_sound = Math.sqrt(GAMMA_AIR * R_AIR * T_amb);
    const v_flight = mach * a_sound;
    const q_dyn = 0.5 * rho_amb * v_flight * v_flight / 1000; // kPa

    return {
      altitudeFt,
      altitudeM: hM,
      mach,
      velocityMs: v_flight,
      temperatureK: T_amb,
      temperatureC: T_amb - 273.15,
      pressureKPa: P_amb,
      densityKgM3: rho_amb,
      speedOfSoundMs: a_sound,
      dynamicPressureKPa: q_dyn
    };
  }

  // Update loop called every frame or fixed dt
  public update(currentTimeMs: number, inputs: Partial<EngineState>): EngineState {
    if (this.lastTimeMs === 0) this.lastTimeMs = currentTimeMs;
    const dt = Math.min((currentTimeMs - this.lastTimeMs) / 1000, 0.1);
    this.lastTimeMs = currentTimeMs;

    // Merge pilot inputs
    if (inputs.throttlePLA !== undefined) this.state.throttlePLA = inputs.throttlePLA;
    if (inputs.altitudeFt !== undefined) this.state.altitudeFt = inputs.altitudeFt;
    if (inputs.machNumber !== undefined) this.state.machNumber = inputs.machNumber;
    if (inputs.bypassRatio !== undefined) this.state.bypassRatio = inputs.bypassRatio;
    if (inputs.afterburnerActive !== undefined) this.state.afterburnerActive = inputs.afterburnerActive;
    if (inputs.faultMode !== undefined) this.state.faultMode = inputs.faultMode;

    // Detect detents
    const pla = this.state.throttlePLA;
    if (pla < 2) {
      this.state.detent = 'CUTOFF';
    } else if (pla <= 25) {
      this.state.detent = 'IDLE';
    } else if (pla <= 75) {
      this.state.detent = 'CRUISE';
    } else if (pla <= 90) {
      this.state.detent = 'CLIMB';
    } else if (pla <= 100) {
      this.state.detent = 'TOGA';
    } else {
      this.state.detent = 'AFTERBURNER';
    }

    // Auto-engage afterburner when PLA > 100
    if (pla > 100 && !this.state.afterburnerActive) {
      this.state.afterburnerActive = true;
    }

    // Update Atmosphere
    this.state.atmosphere = this.computeISA(this.state.altitudeFt, this.state.machNumber);
    const atmo = this.state.atmosphere;

    // Compute Target Spools based on PLA and Faults
    let n2Target = 60.0 + (pla / 100) * 44.0; // 60% idle to 104% full
    let n1Target = 22.0 + (pla / 100) * 78.0; // 22% idle to 100% full
    if (this.state.afterburnerActive) {
      n2Target = Math.min(108.0, n2Target + 3.0);
      n1Target = Math.min(104.0, n1Target + 3.5);
    }

    // Fault dynamic behaviors
    if (this.state.faultMode === 'compressor_stall') {
      this.surgeTimer += dt;
      // Surge flutter: violent oscillations in N2 and thrust
      n2Target = 46.0 + Math.sin(this.surgeTimer * 22.0) * 12.0;
      n1Target = 30.0 + Math.cos(this.surgeTimer * 15.0) * 8.0;
      this.state.compressorSurgeIntensity = Math.abs(Math.sin(this.surgeTimer * 18.0));
      this.state.activeEventMessage = '⚠️ MASTER WARNING: COMPRESSOR SURGE / STALL // UNSTABLE AXIAL DIFFUSION';
      this.state.activeEventSeverity = 'emergency';
    } else if (this.state.faultMode === 'bird_strike') {
      this.birdStrikeTimer += dt;
      // Fan blade damage: high N1 vibration, dropped N1 target
      n1Target = Math.max(18.0, n1Target * 0.62);
      this.state.compressorSurgeIntensity = 0.15;
      this.state.activeEventMessage = '⚠️ MASTER CAUTION: FOREIGN OBJECT DAMAGE (FOD) // FAN IMBALANCE > 5.0 G';
      this.state.activeEventSeverity = 'warning';
    } else if (this.state.faultMode === 'overtemp') {
      this.state.activeEventMessage = '⚠️ MASTER WARNING: EGT OVERTEMPERATURE // SUPERALLOY CMSX-4 CREEP RISK';
      this.state.activeEventSeverity = 'emergency';
      this.state.compressorSurgeIntensity = 0;
    } else {
      this.surgeTimer = 0;
      this.birdStrikeTimer = 0;
      this.state.compressorSurgeIntensity = 0;
      if (this.state.detent === 'AFTERBURNER') {
        this.state.activeEventMessage = '🔥 REHEAT AUGMENTOR ENGAGED // MAXIMUM TOGA THRUST BOOST';
        this.state.activeEventSeverity = 'caution';
      } else {
        this.state.activeEventMessage = 'FADEC DUAL-CHANNEL NOMINAL // ENGINE PARAMETERS OPTIMAL';
        this.state.activeEventSeverity = 'normal';
      }
    }

    // Dynamic Dual-Spool Inertial Integration (Tau_N2 ~ 1.2s, Tau_N1 ~ 1.8s)
    const tauN2 = this.state.n2Target > this.state.n2Percent ? 1.4 : 1.1;
    const tauN1 = this.state.n1Target > this.state.n1Percent ? 1.9 : 1.5;

    this.state.n2Target = n2Target;
    this.state.n1Target = n1Target;

    this.state.n2Percent += (this.state.n2Target - this.state.n2Percent) * (dt / tauN2);
    this.state.n1Percent += (this.state.n1Target - this.state.n1Percent) * (dt / tauN1);

    // Baseline RPM conversions
    this.state.n1Rpm = Math.round((this.state.n1Percent / 100) * 2850);
    this.state.n2Rpm = Math.round((this.state.n2Percent / 100) * 12400);

    // Tip Mach Calculation for Fan
    const tipSpeedMs = (this.state.n1Rpm * Math.PI * FAN_DIA_M) / 60;
    const relativeTipSpeed = Math.sqrt(tipSpeedMs * tipSpeedMs + atmo.velocityMs * atmo.velocityMs);
    this.state.bladeTipMach = Number((relativeTipSpeed / atmo.speedOfSoundMs).toFixed(3));

    // Perform Full Brayton Thermodynamic Cycle Calculation
    this.calculateThermodynamics();

    return this.state;
  }

  // Core Aerothermodynamic Stations (Stations 0, 2, 13/18, 2.5, 3, 4, 4.5, 5, 8)
  private calculateThermodynamics(): void {
    const atmo = this.state.atmosphere;
    const n1Frac = Math.max(0.1, this.state.n1Percent / 100);
    const n2Frac = Math.max(0.1, this.state.n2Percent / 100);
    const bpr = this.state.bypassRatio;

    // Station 0: Ambient Freestream
    const T0 = atmo.temperatureK;
    const P0 = atmo.pressureKPa;
    const M0 = atmo.mach;
    const V0 = atmo.velocityMs;

    // Ram Recovery Factor (MIL-E-5007D Standard)
    let ramRecovery = 1.0;
    if (M0 <= 1.0) {
      ramRecovery = 1.0 - 0.005 * Math.pow(M0, 2);
    } else {
      ramRecovery = 1.0 - 0.075 * Math.pow(M0 - 1.0, 1.35);
    }
    ramRecovery = Math.max(0.85, Math.min(1.0, ramRecovery));

    // Total Temperature & Pressure at inlet (Station 0 to Station 2)
    const tau_r = 1.0 + ((GAMMA_AIR - 1) / 2) * M0 * M0;
    const pi_r = Math.pow(tau_r, GAMMA_AIR / (GAMMA_AIR - 1));
    const Tt2 = T0 * tau_r;
    const Pt2 = P0 * pi_r * ramRecovery;

    // Station 13 / 18: Fan Bypass Stream
    // Fan Pressure Ratio (FPR) scales with N1
    const maxFpr = 1.72;
    const fpr = 1.0 + Math.pow(n1Frac, 2.2) * (maxFpr - 1.0);
    this.state.fanPressureRatio = Number(fpr.toFixed(3));

    const eta_fan = 0.915; // Isentropic fan efficiency
    const tau_fan = 1.0 + (1.0 / eta_fan) * (Math.pow(fpr, (GAMMA_AIR - 1) / GAMMA_AIR) - 1.0);
    const Tt13 = Tt2 * tau_fan;
    const Pt13 = Pt2 * fpr;

    // Bypass Nozzle Expansion (Station 18)
    const eta_fn = 0.98; // Fan nozzle efficiency
    const pRatBypass = Math.max(1.0, Pt13 / P0);
    const V18 = Math.sqrt(Math.max(0, 2 * CP_AIR * Tt13 * eta_fn * (1.0 - Math.pow(1.0 / pRatBypass, (GAMMA_AIR - 1) / GAMMA_AIR))));

    // Station 2.5: Low Pressure Compressor (LPC Booster) Exit
    const maxPiLpc = 2.65;
    const pi_lpc = 1.0 + Math.pow(n1Frac, 2.0) * (maxPiLpc - 1.0);
    const eta_lpc = 0.89;
    const tau_lpc = 1.0 + (1.0 / eta_lpc) * (Math.pow(pi_lpc, (GAMMA_AIR - 1) / GAMMA_AIR) - 1.0);
    const Tt25 = Tt2 * tau_lpc;
    const Pt25 = Pt2 * pi_lpc;

    // Station 3: High Pressure Compressor (HPC) Exit / Combustor Inlet
    const maxPiHpc = 19.5;
    let pi_hpc = 1.0 + Math.pow(n2Frac, 2.8) * (maxPiHpc - 1.0);
    let eta_hpc = 0.88;

    // Stall disruption
    if (this.state.faultMode === 'compressor_stall') {
      pi_hpc *= (0.4 + 0.3 * Math.random());
      eta_hpc *= 0.55;
    }

    const tau_hpc = 1.0 + (1.0 / eta_hpc) * (Math.pow(pi_hpc, (GAMMA_AIR - 1) / GAMMA_AIR) - 1.0);
    const Tt3 = Tt25 * tau_hpc;
    const Pt3 = Pt25 * pi_hpc;
    this.state.overallPressureRatio = Number((Pt3 / Pt2).toFixed(2));

    // Station 4: Annular Combustor Exit / Turbine Inlet (TIT)
    const deltaP_combustor = 0.045; // 4.5% combustor pressure drop
    const Pt4 = Pt3 * (1.0 - deltaP_combustor);

    // Fuel flow and TIT calculation
    // Nominal TIT: 850 K idle up to 1750 K TOGA (with thermal barrier coated CMSX-4 single crystals)
    let titTarget = 820 + Math.pow(this.state.throttlePLA / 100, 1.4) * 930;
    if (this.state.faultMode === 'compressor_stall') {
      titTarget += 420; // Severe overtemp backfire in stall
    } else if (this.state.faultMode === 'overtemp') {
      titTarget += 580; // Fuel valve stuck open
    }

    const Tt4 = Math.min(2300, titTarget);
    this.state.titK = Math.round(Tt4);
    this.state.titC = Math.round(Tt4 - 273.15);

    // Fuel-Air Ratio (f = mf / m_core)
    const eta_comb = 0.995;
    const fuelAirRatio = Math.max(0.008, Math.min(0.038, (CP_GAS * Tt4 - CP_AIR * Tt3) / (eta_comb * LHV_JETA1 - CP_GAS * Tt4)));

    // Station 4.5: High Pressure Turbine (HPT) Exit
    // Mechanical power balance: W_HPT = W_HPC / eta_mech
    const eta_mech_hp = 0.99;
    const work_hpc = CP_AIR * (Tt3 - Tt25);
    const work_hpt_req = work_hpc / eta_mech_hp;
    const Tt45 = Math.max(400, Tt4 - work_hpt_req / ((1.0 + fuelAirRatio) * CP_GAS));

    const eta_hpt = 0.92; // Single-crystal active cooling turbine
    const tau_hpt = Tt45 / Tt4;
    const pi_hpt = Math.pow(Math.max(0.01, 1.0 - (1.0 / eta_hpt) * (1.0 - tau_hpt)), GAMMA_GAS / (GAMMA_GAS - 1));
    const Pt45 = Pt4 * pi_hpt;

    // Station 5: Low Pressure Turbine (LPT) Exit / Exhaust Gas Temp (EGT)
    // Mechanical power balance: W_LPT = (W_fan_bypass * BPR + W_LPC) / eta_mech
    const eta_mech_lp = 0.99;
    const work_fan = CP_AIR * (Tt13 - Tt2);
    const work_lpc = CP_AIR * (Tt25 - Tt2);
    const work_lpt_req = (bpr * work_fan + work_lpc) / eta_mech_lp;
    const Tt5 = Math.max(350, Tt45 - work_lpt_req / ((1.0 + fuelAirRatio) * CP_GAS));

    const eta_lpt = 0.93;
    const tau_lpt = Tt5 / Tt45;
    const pi_lpt = Math.pow(Math.max(0.01, 1.0 - (1.0 / eta_lpt) * (1.0 - tau_lpt)), GAMMA_GAS / (GAMMA_GAS - 1));
    const Pt5 = Pt45 * pi_lpt;

    this.state.egtC = Math.round(Tt5 - 273.15);
    this.state.egtWarning = this.state.egtC >= this.state.egtRedlineC;

    // Station 7/8: Core Nozzle Exhaust & Afterburner Reheat
    let Tt7 = Tt5;
    let Pt7 = Pt5;
    let abBoostThrust = 0;

    if (this.state.afterburnerActive) {
      // Reheat ignition in afterburner duct
      Tt7 = Math.min(2250, Tt5 * 1.85);
      Pt7 = Pt5 * 0.96; // 4% pressure drop in flameholders
      this.state.shockDiamondsCount = Math.min(6, Math.max(3, Math.round((this.state.throttlePLA - 98) * 1.2)));
    } else {
      this.state.shockDiamondsCount = 0;
    }

    // Expansion in Core Convergent-Divergent Nozzle (Station 8)
    const eta_core_nozzle = 0.985;
    const pRatCore = Math.max(1.0, Pt7 / P0);
    const V8 = Math.sqrt(Math.max(0, 2 * CP_GAS * Tt7 * eta_core_nozzle * (1.0 - Math.pow(1.0 / pRatCore, (GAMMA_GAS - 1) / GAMMA_GAS))));

    // Mass Flow Calculations (Air Mass Flow scales with N1, inlet area, air density)
    const nominalMassFlowSL = 860.0; // kg/s at TOGA sea level for large commercial turbofan
    const densityRatio = atmo.densityKgM3 / 1.225;
    const totalMassFlow = nominalMassFlowSL * densityRatio * Math.pow(n1Frac, 1.15);
    const coreMassFlow = totalMassFlow / (1.0 + bpr);
    const bypassMassFlow = totalMassFlow - coreMassFlow;

    this.state.airMassFlowTotalKgS = Number(totalMassFlow.toFixed(1));
    this.state.airMassFlowCoreKgS = Number(coreMassFlow.toFixed(1));
    this.state.airMassFlowBypassKgS = Number(bypassMassFlow.toFixed(1));

    // Fuel Flow Calculations
    let fuelFlowKgS = coreMassFlow * fuelAirRatio;
    if (this.state.afterburnerActive) {
      // Afterburner consumes 2.5x to 3.2x normal fuel flow
      const abFuelKgS = coreMassFlow * 0.042;
      fuelFlowKgS += abFuelKgS;
    }
    this.state.fuelFlowKgS = Number(fuelFlowKgS.toFixed(3));
    this.state.fuelFlowKgH = Math.round(fuelFlowKgS * 3600);

    // Thrust Components (Cold Fan Bypass Thrust + Hot Core Thrust + Afterburner Boost)
    let fanThrustN = bypassMassFlow * Math.max(0, V18 - V0);
    let coreThrustN = coreMassFlow * ((1.0 + fuelAirRatio) * V8 - V0);

    if (this.state.afterburnerActive) {
      abBoostThrust = (coreThrustN + fanThrustN) * 0.45; // 45% augmented reheat thrust
    }

    if (this.state.faultMode === 'bird_strike') {
      fanThrustN *= 0.58; // Damaged fan blades lose aerodynamic lift
    } else if (this.state.faultMode === 'compressor_stall') {
      coreThrustN *= 0.22; // Core loss of combustion pressure
      fanThrustN *= 0.65;
    }

    const netThrustN = Math.max(100, fanThrustN + coreThrustN + abBoostThrust);
    this.state.fanThrustKn = Number((fanThrustN / 1000).toFixed(1));
    this.state.coreThrustKn = Number((coreThrustN / 1000).toFixed(1));
    this.state.afterburnerThrustKn = Number((abBoostThrust / 1000).toFixed(1));
    this.state.netThrustKn = Number((netThrustN / 1000).toFixed(1));
    this.state.netThrustLbf = Math.round(netThrustN * 0.224809);

    // TSFC: Thrust Specific Fuel Consumption in g/(kN*s)
    const tsfc = (fuelFlowKgS * 1000) / (netThrustN / 1000);
    this.state.tsfcGKnS = Number(tsfc.toFixed(2));

    // Efficiencies
    // Kinetic energy delta:
    const deltaKE = 0.5 * coreMassFlow * (V8 * V8 - V0 * V0) + 0.5 * bypassMassFlow * (V18 * V18 - V0 * V0);
    const fuelHeatRate = fuelFlowKgS * LHV_JETA1;

    const eta_th = Math.max(0.05, Math.min(0.62, deltaKE / fuelHeatRate));
    const eta_p = Math.max(0.1, Math.min(0.92, (2 * Math.max(20, V0)) / (Math.max(30, (V8 + V18) / 2) + Math.max(20, V0))));
    const eta_o = eta_th * eta_p;

    this.state.thermalEfficiency = Number(eta_th.toFixed(3));
    this.state.propulsiveEfficiency = Number(eta_p.toFixed(3));
    this.state.overallEfficiency = Number(eta_o.toFixed(3));

    // Vibration & Oil systems
    let vib = 0.22 + (this.state.n2Percent / 100) * 0.35 + (this.state.n1Percent / 100) * 0.28;
    if (this.state.faultMode === 'bird_strike') {
      vib = 4.8 + Math.sin(this.birdStrikeTimer * 30) * 0.7;
    } else if (this.state.faultMode === 'compressor_stall') {
      vib = 3.6 + Math.cos(this.surgeTimer * 20) * 0.9;
    }
    this.state.vibrationG = Number(vib.toFixed(2));
    this.state.oilPressurePsi = Math.round(45 + (this.state.n2Percent / 100) * 28);
    this.state.oilTempC = Math.round(62 + (this.state.n2Percent / 100) * 44);

    // Populate Detailed Station Map
    this.state.stations = {
      '0': {
        id: '0',
        stationNum: 0,
        name: 'Station 0: Freestream Ambient',
        nameAr: 'المحطة 0: التيار المحيط الحر',
        description: 'Ambient air conditions ahead of aircraft inlet shock',
        descriptionAr: 'ظروف الهواء الجوي الطبيعي أمام مخروط المحرك',
        totalTemperatureK: Math.round(Tt2),
        totalTemperatureC: Math.round(Tt2 - 273.15),
        staticTemperatureK: Math.round(T0),
        staticTemperatureC: Math.round(T0 - 273.15),
        totalPressureKPa: Number(Pt2.toFixed(1)),
        staticPressureKPa: Number(P0.toFixed(1)),
        mach: Number(M0.toFixed(2)),
        velocityMs: Math.round(V0),
        entropyDelta: 0,
        xNorm: 0.04,
        yNorm: 0.50
      },
      '2': {
        id: '2',
        stationNum: 2,
        name: 'Station 2: Fan Face Inlet',
        nameAr: 'المحطة 2: مدخل وجه المروحة النفاثة',
        description: 'Low-pressure fan inlet plane after nacelle lip diffusion',
        descriptionAr: 'مستوى الدخول لمروحة الضغط المنخفض بعد انتشار الغلاف',
        totalTemperatureK: Math.round(Tt2),
        totalTemperatureC: Math.round(Tt2 - 273.15),
        staticTemperatureK: Math.round(Tt2 * 0.95),
        staticTemperatureC: Math.round(Tt2 * 0.95 - 273.15),
        totalPressureKPa: Number(Pt2.toFixed(1)),
        staticPressureKPa: Number((Pt2 * 0.88).toFixed(1)),
        mach: 0.52,
        velocityMs: Math.round(0.52 * atmo.speedOfSoundMs),
        entropyDelta: 12,
        xNorm: 0.16,
        yNorm: 0.50
      },
      '13': {
        id: '13',
        stationNum: 13,
        name: 'Station 13/18: Bypass Duct Exit',
        nameAr: 'المحطة 13/18: مخرج المجرى الالتفافي البارد',
        description: 'Cold bypass stream generating the majority of subsonic thrust',
        descriptionAr: 'تدفق الهواء الالتفافي البارد المولد لأغلب الدفع تحت الصوتي',
        totalTemperatureK: Math.round(Tt13),
        totalTemperatureC: Math.round(Tt13 - 273.15),
        staticTemperatureK: Math.round(Tt13 * 0.93),
        staticTemperatureC: Math.round(Tt13 * 0.93 - 273.15),
        totalPressureKPa: Number(Pt13.toFixed(1)),
        staticPressureKPa: Number(P0.toFixed(1)),
        mach: Number((V18 / atmo.speedOfSoundMs).toFixed(2)),
        velocityMs: Math.round(V18),
        entropyDelta: 45,
        xNorm: 0.58,
        yNorm: 0.18
      },
      '2.5': {
        id: '2.5',
        stationNum: 2.5,
        name: 'Station 2.5: LPC Booster Discharge',
        nameAr: 'المحطة 2.5: تفريغ معزز LPC المتوسط',
        description: 'Low-pressure compressor / booster stage discharging into core',
        descriptionAr: 'مخرج ضاغط الضغط المنخفض المغذي لقلب المحرك',
        totalTemperatureK: Math.round(Tt25),
        totalTemperatureC: Math.round(Tt25 - 273.15),
        staticTemperatureK: Math.round(Tt25 * 0.94),
        staticTemperatureC: Math.round(Tt25 * 0.94 - 273.15),
        totalPressureKPa: Number(Pt25.toFixed(1)),
        staticPressureKPa: Number((Pt25 * 0.85).toFixed(1)),
        mach: 0.44,
        velocityMs: Math.round(0.44 * atmo.speedOfSoundMs),
        entropyDelta: 58,
        xNorm: 0.32,
        yNorm: 0.50
      },
      '3': {
        id: '3',
        stationNum: 3,
        name: 'Station 3: HPC Diffuser Delivery',
        nameAr: 'المحطة 3: تسليم ناشر HPC فائق الضغط',
        description: 'Peak core air pressure prior to annular burner swirl injection',
        descriptionAr: 'ذروة ضغط هواء قلب المحرك قبل الحقن الحلقي لغرفة الاحتراق',
        totalTemperatureK: Math.round(Tt3),
        totalTemperatureC: Math.round(Tt3 - 273.15),
        staticTemperatureK: Math.round(Tt3 * 0.96),
        staticTemperatureC: Math.round(Tt3 * 0.96 - 273.15),
        totalPressureKPa: Number(Pt3.toFixed(1)),
        staticPressureKPa: Number((Pt3 * 0.92).toFixed(1)),
        mach: 0.28,
        velocityMs: 140,
        entropyDelta: 94,
        xNorm: 0.46,
        yNorm: 0.50
      },
      '4': {
        id: '4',
        stationNum: 4,
        name: 'Station 4: Combustor Exit (TIT)',
        nameAr: 'المحطة 4: مخرج غرفة الاحتراق (TIT)',
        description: 'Peak cycle temperature entering High-Pressure Turbine nozzle guide vanes',
        descriptionAr: 'ذروة حرارة الدورة عند مدخل ريش توجيه توربين الضغط العالي',
        totalTemperatureK: Math.round(Tt4),
        totalTemperatureC: Math.round(Tt4 - 273.15),
        staticTemperatureK: Math.round(Tt4 * 0.92),
        staticTemperatureC: Math.round(Tt4 * 0.92 - 273.15),
        totalPressureKPa: Number(Pt4.toFixed(1)),
        staticPressureKPa: Number((Pt4 * 0.82).toFixed(1)),
        mach: 0.58,
        velocityMs: 380,
        entropyDelta: 410,
        xNorm: 0.60,
        yNorm: 0.50
      },
      '4.5': {
        id: '4.5',
        stationNum: 4.5,
        name: 'Station 4.5: Inter-Turbine Duct',
        nameAr: 'المحطة 4.5: مجرى ما بين التوربينات',
        description: 'Gas state between HP single-crystal stage and LP multi-stage turbine',
        descriptionAr: 'حالة الغاز بين مرحلة التوربين الأحادي البلوري وتوربين الضغط المنخفض',
        totalTemperatureK: Math.round(Tt45),
        totalTemperatureC: Math.round(Tt45 - 273.15),
        staticTemperatureK: Math.round(Tt45 * 0.94),
        staticTemperatureC: Math.round(Tt45 * 0.94 - 273.15),
        totalPressureKPa: Number(Pt45.toFixed(1)),
        staticPressureKPa: Number((Pt45 * 0.86).toFixed(1)),
        mach: 0.52,
        velocityMs: 340,
        entropyDelta: 435,
        xNorm: 0.70,
        yNorm: 0.50
      },
      '5': {
        id: '5',
        stationNum: 5,
        name: 'Station 5: LPT Discharge (EGT)',
        nameAr: 'المحطة 5: مخرج توربين LPT (حرارة العادم EGT)',
        description: 'Turbine exit plane monitored by flight EICAS cockpit thermocouple harness',
        descriptionAr: 'مستوى خروج التوربين المقاس بحساسات EGT في قمرة القيادة',
        totalTemperatureK: Math.round(Tt5),
        totalTemperatureC: Math.round(Tt5 - 273.15),
        staticTemperatureK: Math.round(Tt5 * 0.95),
        staticTemperatureC: Math.round(Tt5 * 0.95 - 273.15),
        totalPressureKPa: Number(Pt5.toFixed(1)),
        staticPressureKPa: Number((Pt5 * 0.88).toFixed(1)),
        mach: 0.48,
        velocityMs: 310,
        entropyDelta: 460,
        xNorm: 0.79,
        yNorm: 0.50
      },
      '8': {
        id: '8',
        stationNum: 8,
        name: 'Station 8: Core Jet Nozzle Throat',
        nameAr: 'المحطة 8: فوهة العادم النفاث للقلب',
        description: 'Primary core jet exhaust producing direct high-velocity thrust reaction',
        descriptionAr: 'عادم المحرك النفاث الحار المولد لدفع رد الفعل عالي السرعة',
        totalTemperatureK: Math.round(Tt7),
        totalTemperatureC: Math.round(Tt7 - 273.15),
        staticTemperatureK: Math.round(Tt7 * 0.85),
        staticTemperatureC: Math.round(Tt7 * 0.85 - 273.15),
        totalPressureKPa: Number(Pt7.toFixed(1)),
        staticPressureKPa: Number(P0.toFixed(1)),
        mach: Number((V8 / Math.sqrt(GAMMA_GAS * R_AIR * Tt7 * 0.85)).toFixed(2)),
        velocityMs: Math.round(V8),
        entropyDelta: this.state.afterburnerActive ? 680 : 475,
        xNorm: 0.92,
        yNorm: 0.50
      }
    };

    // Calculate Brayton Cycle Coordinates for Live T-s Chart
    this.calculateBraytonPoints(T0, P0, Tt2, Pt2, Tt3, Pt3, Tt4, Pt4, Tt5, Pt5, Tt7, Pt7);
  }

  // Calculate thermodynamic entropy and temperature for T-s diagram
  private calculateBraytonPoints(
    T0: number, P0: number,
    Tt2: number, Pt2: number,
    Tt3: number, Pt3: number,
    Tt4: number, Pt4: number,
    Tt5: number, Pt5: number,
    _Tt7: number, _Pt7: number
  ): void {
    // Reference state at Station 0: s0 = 0, T0, P0
    // s - s0 = cp * ln(T/T0) - R * ln(P/P0)

    // Point 0: Ambient inlet
    const s0 = 0;
    const t0 = T0;

    // Point 2: Fan inlet / ram compression (slight irreversibility)
    const s2 = CP_AIR * Math.log(Tt2 / T0) - R_AIR * Math.log(Pt2 / P0);
    const t2 = Tt2;
    const t2_ideal = T0 * Math.pow(Pt2 / P0, (GAMMA_AIR - 1) / GAMMA_AIR);

    // Point 3: Compressor Delivery (Station 3)
    const s3 = CP_AIR * Math.log(Tt3 / T0) - R_AIR * Math.log(Pt3 / P0);
    const t3 = Tt3;
    const t3_ideal = Tt2 * Math.pow(Pt3 / Pt2, (GAMMA_AIR - 1) / GAMMA_AIR);

    // Point 4: Combustor Exit (Station 4 - heat addition at near constant pressure)
    const s4 = s3 + CP_GAS * Math.log(Tt4 / Tt3) - R_AIR * Math.log(Pt4 / Pt3);
    const t4 = Tt4;

    // Point 5: Turbine Expansion (Station 5)
    const s5 = s4 + CP_GAS * Math.log(Tt5 / Tt4) - R_AIR * Math.log(Pt5 / Pt4);
    const t5 = Tt5;
    const t5_ideal = Tt4 * Math.pow(Pt5 / Pt4, (GAMMA_GAS - 1) / GAMMA_GAS);

    // Point 8: Core Nozzle Expansion to Ambient P0
    const s8 = s5 + 15;
    const t8 = Math.max(280, t5 - 180);

    this.state.braytonPoints = [
      { station: '0', s: s0, t: t0, tIdeal: t0, p: P0, label: '0: Amb', labelAr: '0: الجو' },
      { station: '2', s: Math.max(0, s2), t: t2, tIdeal: t2_ideal, p: Pt2, label: '2: Inlet', labelAr: '2: المدخل' },
      { station: '3', s: s3, t: t3, tIdeal: t3_ideal, p: Pt3, label: '3: HPC', labelAr: '3: الضاغط' },
      { station: '4', s: s4, t: t4, tIdeal: t4, p: Pt4, label: '4: TIT', labelAr: '4: الاحتراق' },
      { station: '5', s: s5, t: t5, tIdeal: t5_ideal, p: Pt5, label: '5: EGT', labelAr: '5: التوربين' },
      { station: '8', s: s8, t: t8, tIdeal: t8, p: P0, label: '8: Exhaust', labelAr: '8: العادم' }
    ];
  }

  // FADEC auto-relight sequence
  public triggerFadecRelight(): void {
    this.state.faultMode = 'none';
    this.state.fadecAutoRelight = true;
    this.state.compressorSurgeIntensity = 0;
    this.state.activeEventMessage = '🔄 FADEC RE-LIGHT INITIATED // APU BLEED MOTORING // IGNITERS A+B FIRING';
    this.state.activeEventSeverity = 'caution';

    setTimeout(() => {
      this.state.fadecAutoRelight = false;
      this.state.activeEventMessage = 'FADEC DUAL-CHANNEL NOMINAL // ENGINE PARAMETERS STABILIZED';
      this.state.activeEventSeverity = 'normal';
    }, 2800);
  }
}
