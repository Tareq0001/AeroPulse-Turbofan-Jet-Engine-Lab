# AERO-PULSE: Twin-Spool High-Bypass Turbofan & Brayton Cycle Simulator

> **Project #84 // Aerothermodynamic Flight & Propulsion Laboratory**  
> **Lead Architect & Systems Engineer:** **أ. طارق ابوعشي | Lead Aerospace Propulsion & Systems Architect**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-06b6d4?style=for-the-badge&logo=google-chrome)](https://tareq0001.github.io/AeroPulse-Turbofan-Jet-Engine-Lab/)
[![Architecture](https://img.shields.io/badge/Architecture-Twin--Spool%20High--Bypass-f59e0b?style=for-the-badge)](https://tareq0001.github.io/AeroPulse-Turbofan-Jet-Engine-Lab/)
[![Thermodynamics](https://img.shields.io/badge/Cycle-Joule--Brayton%20T--s-10b981?style=for-the-badge)](https://tareq0001.github.io/AeroPulse-Turbofan-Jet-Engine-Lab/)

---

## 🚀 Overview

**AERO-PULSE** is a cutting-edge aerospace engineering flight simulator and real-time aerothermodynamic laboratory dedicated to high-bypass turbofan engines (such as the Rolls-Royce Trent 1000, GE90, and CFM LEAP). Built with high-precision physics and 60 FPS HTML5 Canvas visual telemetry, it simulates real-time dual-spool mechanical coupling, gas dynamics, standard atmospheric lapse rates (ISA 1976), and full Joule-Brayton thermodynamic cycles.

---

## 🛩️ Key Features & Engineering Capabilities

1. **Twin-Spool Dynamic Inertial Coupling:**
   - **LP Spool ($N_1$):** Drives the 116-inch wide-chord hollow titanium fan and 4-stage LPC booster compressor, powered directly by the 4-stage Low-Pressure Turbine (LPT).
   - **HP Spool ($N_2$):** Drives the 8-stage axial High-Pressure Compressor (HPC) up to 12,400 RPM and overall pressure ratios (OPR) exceeding 45:1, powered by the 2-stage High-Pressure Turbine (HPT).
   - Dynamic rotational inertia integration with authentic spool-up time constants ($\tau_1 \approx 1.8\text{ s}, \tau_2 \approx 1.2\text{ s}$).

2. **60 FPS High-Resolution Jet Cutaway Canvas:**
   - Detailed structural cross-section: titanium spinner cone with signature swirl, rotating fan blades with 3D projection, bypass duct, core flow splitter, annular combustor with 20 swirl injectors, and convergent-divergent exhaust nozzles.
   - Over **450 dynamic airflow particles** showcasing velocity and temperature gradients ($T_{amb} \to T_{t2} \to T_{t2.5} \to T_{t3} \to T_{t4} \to T_{t5} \to T_8$).
   - Interactive station probes along the engine axis (Stations 0, 2, 13/18, 2.5, 3, 4, 4.5, 5, and 8).

3. **Dynamic Joule-Brayton Cycle ($T\text{-}s$ Diagram):**
   - Real-time temperature vs. specific entropy chart calculating real irreversibilities, isentropic efficiencies ($\eta_c \approx 0.88, \eta_t \approx 0.93$), shaded net cycle work area ($w_{net}$), and the EGT redline limit.

4. **Avionics Flight Deck & Controls:**
   - Primary EICAS 4-gauge cluster ($N_1\%, N_2\%$, EGT °C, Net Thrust kN).
   - Throttle PLA lever (0-105%) with authentic detents: `CUTOFF`, `IDLE`, `CRUISE`, `CLIMB`, `TOGA`, and `AFTERBURNER`.
   - International Standard Atmosphere (ISA) sliders: Altitude ($0$ to $45,000\text{ ft}$) and Flight Mach ($0.00$ to $0.92$).
   - Variable Bypass Ratio selector (BPR 4.0 to 11.0).

5. **Emergency Fault Injection Switchboard:**
   - `[🔥 Compressor Stall / Surge]`: Simulates violent axial diffusion breakdown, cyclic surge fluttering, audible backfires, and reverse particle flow.
   - `[🦅 Bird Strike (FOD Damage)]`: Simulates fan blade deformation, aerodynamic lift loss, and severe rotational bearing imbalance ($> 4.8\text{ G}$).
   - `[⚡ Afterburner / Reheat]`: Engages supersonic fuel augmentation with luminous exhaust shock diamonds.
   - `[🔄 FADEC Auto-Relight & Reset]`: Dispatches emergency APU bleed motoring and high-energy dual ignition.

6. **Synthesized Web Audio Acoustics:**
   - Procedural Web Audio API sound synthesis: fan sub-bass rumble, high-pressure turbine spool whine, jet shear acoustic noise, compressor stall explosive bangs, and master cockpit caution alerts.

---

## 📐 Thermodynamic Station Map

| Station | Location | Key Parameters |
|---|---|---|
| **Station 0** | Freestream Ambient | $T_0, P_0, \rho_0, M_0, V_0$ |
| **Station 2** | Fan Face Inlet | $T_{t2}, P_{t2}$ (Ram compression) |
| **Station 13/18**| Bypass Duct Exit | Cold bypass thrust, $V_{18}, \text{FPR}$ |
| **Station 2.5** | LPC Booster Discharge | $\pi_{LPC}, T_{t2.5}, P_{t2.5}$ |
| **Station 3** | HPC Diffuser Exit | Peak cycle pressure, $\text{OPR} = P_{t3}/P_{t2}$ |
| **Station 4** | Combustor Exit (TIT) | Peak gas temperature, Jet-A1 heat addition |
| **Station 4.5** | Inter-Turbine Duct | Work balance: $\dot{W}_{HPT} = \dot{W}_{HPC}/\eta_m$ |
| **Station 5** | LPT Exit (EGT) | Thermocouple cockpit EGT limit |
| **Station 8** | Core Nozzle Throat | Supersonic / transonic hot core reaction thrust |

---

## 🛠️ Tech Stack

- **Framework:** Vanilla TypeScript + Vite
- **Graphics:** HTML5 2D Canvas (60 FPS, HiDPI Retina ready)
- **Audio:** Web Audio API Procedural Synthesizer
- **Styling:** Dark Aerospace Avionics UI (Garmin G5000 / Rolls-Royce Trent EICAS style)
- **Zero Heavy External Dependencies:** High performance, instant loading.

---

## 👨‍✈️ Lead Aerospace Propulsion & Systems Architect

**أ. طارق ابوعشي**  
*Lead Aerospace Propulsion & Systems Architect*  
*Specialist in Computational Fluid Dynamics, Aerothermodynamics & Advanced Glass Cockpit Avionics*
