// =====================================================================
// AERO-PULSE: Twin-Spool High-Bypass Turbofan & Brayton Cycle Simulator
// 60FPS High-Resolution Cutaway & Particle Aerodynamics Canvas
// Lead Architect: أ. طارق ابوعشي | Lead Aerospace Propulsion & Systems Architect
// =====================================================================

import { EngineState, EngineStation } from '../types/engine';

interface AirParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isBypass: boolean;
  stationIdx: number;
  life: number;
  maxLife: number;
  tempK: number;
}

export class JetCutawayCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: EngineState;

  // Animation & Rendering state
  private particles: AirParticle[] = [];
  private numParticles = 460;
  private fanRotationAngle = 0;
  private hpcRotationAngle = 0;
  private flameTime = 0;

  // View Options
  public showParticles = true;
  public showHeatmap = false;
  public showProbes = true;
  public showFlowVectors = false;

  // Selected station for inspection
  public selectedStationId: string | null = null;
  public onSelectStation: ((station: EngineStation) => void) | null = null;

  // Dimensions
  private width = 1200;
  private height = 500;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement, initialState: EngineState) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.state = initialState;

    this.initCanvasSize();
    this.initParticles();
    this.setupInteractivity();
  }

  private initCanvasSize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 1000;
    this.height = rect.height || 460;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  public resize(): void {
    this.initCanvasSize();
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push(this.createParticle(Math.random() * this.width));
    }
  }

  private createParticle(startX?: number): AirParticle {
    const x = startX !== undefined ? startX : -10 - Math.random() * 40;
    // Normalized engine centerline is at height * 0.50
    // Inlet radius spans from 0.15 to 0.85
    const isUpper = Math.random() > 0.5;
    const offsetFrac = Math.random();
    const yCenter = this.height * 0.5;
    const inletHalfSpan = this.height * 0.36;

    const y = yCenter + (isUpper ? -1 : 1) * offsetFrac * inletHalfSpan;
    const isBypass = offsetFrac > 0.38; // 62% of radial height is bypass duct

    return {
      x,
      y,
      vx: 3 + Math.random() * 2,
      vy: (Math.random() - 0.5) * 0.5,
      size: 1.2 + Math.random() * 1.8,
      isBypass,
      stationIdx: 0,
      life: 0,
      maxLife: 280 + Math.random() * 100,
      tempK: 288
    };
  }

  private setupInteractivity(): void {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let found: EngineStation | null = null;
      for (const st of Object.values(this.state.stations)) {
        const px = st.xNorm * this.width;
        const py = st.yNorm * this.height + (st.stationNum === 13 ? -this.height * 0.26 : 0);
        const dist = Math.hypot(clickX - px, clickY - py);
        if (dist < 22) {
          found = st;
          break;
        }
      }

      if (found) {
        this.selectedStationId = found.id;
        if (this.onSelectStation) this.onSelectStation(found);
      }
    });
  }

  public render(state: EngineState, dt: number): void {
    this.state = state;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cy = h * 0.5;

    // Advance rotation speeds based on N1 and N2
    const n1Speed = (state.n1Percent / 100) * 18.0;
    const n2Speed = (state.n2Percent / 100) * 36.0;
    this.fanRotationAngle += n1Speed * dt;
    this.hpcRotationAngle += n2Speed * dt;
    this.flameTime += dt * 8.0;

    // Camera shake during severe compressor surge or bird strike
    let shakeX = 0;
    let shakeY = 0;
    if (state.compressorSurgeIntensity > 0.05 || state.faultMode === 'bird_strike') {
      const intensity = state.compressorSurgeIntensity * 6.0 + (state.faultMode === 'bird_strike' ? 3.0 : 0);
      shakeX = (Math.random() - 0.5) * intensity;
      shakeY = (Math.random() - 0.5) * intensity;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Avionics Cockpit Dark Grid Background
    this.drawBackground(w, h, cy);

    // 2. Heatmap overlay if enabled
    if (this.showHeatmap) {
      this.drawThermalGradient(w, h, cy);
    }

    // 3. Engine Structural Geometry (Cutaway: Nacelle, Ducts, Spools, Combustor)
    this.drawEngineStructure(w, h, cy);

    // 4. Rotating Fan, LPC Booster, HPC, HPT, LPT Blading
    this.drawBlading(w, h, cy);

    // 5. Annular Combustor Dynamic Plasma Flame
    this.drawCombustorFlame(w, h, cy);

    // 6. Supersonic Afterburner Exhaust & Mach Shock Diamonds
    if (state.afterburnerActive || state.shockDiamondsCount > 0) {
      this.drawAfterburnerPlume(w, h, cy);
    } else {
      this.drawCoreJetPlume(w, h, cy);
    }

    // 7. Dynamic Airflow Particles
    if (this.showParticles) {
      this.updateAndDrawParticles(w, h, cy, dt);
    }

    // 8. Station Probes & HUD Telemetry Pins
    if (this.showProbes) {
      this.drawStationProbes(w, h, cy);
    }

    ctx.restore();
  }

  private drawBackground(w: number, h: number, cy: number): void {
    const ctx = this.ctx;

    // Avionics deep background #050811 to #0b1120
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#040711');
    grad.addColorStop(0.5, '#070b16');
    grad.addColorStop(1, '#040711');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle Cartesian Avionics Grid
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.04)';
    ctx.lineWidth = 1;
    const gridStep = 40;
    ctx.beginPath();
    for (let x = 0; x < w; x += gridStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += gridStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Centerline (Engine Rotation Axis)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawEngineStructure(w: number, h: number, cy: number): void {
    const ctx = this.ctx;

    const xInlet = w * 0.12;
    const xFan = w * 0.22;
    const xSplitter = w * 0.28;
    const xBoosterEnd = w * 0.38;
    const xHpcEnd = w * 0.54;
    const xBurnerEnd = w * 0.68;
    const xHptEnd = w * 0.74;
    const xLptEnd = w * 0.84;
    const xNozzleCore = w * 0.94;
    const xNozzleBypass = w * 0.62;

    const rNacelleLip = h * 0.42;
    const rBypassDuct = h * 0.38;
    const rCoreOuter = h * 0.21;
    const rShaft = h * 0.045;

    // A. Outer Nacelle Cowling (Aerodynamic Titanium/Composite shell)
    ctx.save();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;

    // Top Cowl
    ctx.beginPath();
    ctx.moveTo(xInlet, cy - rNacelleLip);
    ctx.bezierCurveTo(xFan, cy - rNacelleLip * 1.05, xSplitter + 40, cy - rNacelleLip * 1.03, xNozzleBypass, cy - rBypassDuct);
    ctx.lineTo(xNozzleBypass - 15, cy - rBypassDuct + 12);
    ctx.bezierCurveTo(xSplitter + 30, cy - (rNacelleLip - 12), xFan, cy - (rNacelleLip - 8), xInlet + 25, cy - (rNacelleLip - 10));
    ctx.closePath();
    const cowlGradTop = ctx.createLinearGradient(0, cy - rNacelleLip, 0, cy - rBypassDuct);
    cowlGradTop.addColorStop(0, '#1e293b');
    cowlGradTop.addColorStop(0.5, '#0f172a');
    cowlGradTop.addColorStop(1, '#1e293b');
    ctx.fillStyle = cowlGradTop;
    ctx.fill();
    ctx.stroke();

    // Bottom Cowl (Symmetric)
    ctx.beginPath();
    ctx.moveTo(xInlet, cy + rNacelleLip);
    ctx.bezierCurveTo(xFan, cy + rNacelleLip * 1.05, xSplitter + 40, cy + rNacelleLip * 1.03, xNozzleBypass, cy + rBypassDuct);
    ctx.lineTo(xNozzleBypass - 15, cy + rBypassDuct - 12);
    ctx.bezierCurveTo(xSplitter + 30, cy + (rNacelleLip - 12), xFan, cy + (rNacelleLip - 8), xInlet + 25, cy + (rNacelleLip - 10));
    ctx.closePath();
    ctx.fillStyle = cowlGradTop;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // B. Core Splitter Island & Inner Core Cowl
    ctx.save();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;

    // Top Core Island
    ctx.beginPath();
    ctx.moveTo(xSplitter, cy - rCoreOuter);
    ctx.lineTo(xBoosterEnd, cy - rCoreOuter * 0.95);
    ctx.lineTo(xHpcEnd, cy - rCoreOuter * 0.88);
    ctx.lineTo(xBurnerEnd, cy - rCoreOuter * 1.02);
    ctx.lineTo(xLptEnd, cy - rCoreOuter * 0.82);
    ctx.lineTo(xNozzleCore, cy - rCoreOuter * 0.65);
    ctx.lineTo(xNozzleCore - 10, cy - rCoreOuter * 0.62);
    ctx.lineTo(xBurnerEnd, cy - (rCoreOuter * 0.92));
    ctx.lineTo(xSplitter + 15, cy - (rCoreOuter * 0.85));
    ctx.closePath();
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.fill();
    ctx.stroke();

    // Bottom Core Island (Symmetric)
    ctx.beginPath();
    ctx.moveTo(xSplitter, cy + rCoreOuter);
    ctx.lineTo(xBoosterEnd, cy + rCoreOuter * 0.95);
    ctx.lineTo(xHpcEnd, cy + rCoreOuter * 0.88);
    ctx.lineTo(xBurnerEnd, cy + rCoreOuter * 1.02);
    ctx.lineTo(xLptEnd, cy + rCoreOuter * 0.82);
    ctx.lineTo(xNozzleCore, cy + rCoreOuter * 0.65);
    ctx.lineTo(xNozzleCore - 10, cy + rCoreOuter * 0.62);
    ctx.lineTo(xBurnerEnd, cy + (rCoreOuter * 0.92));
    ctx.lineTo(xSplitter + 15, cy + (rCoreOuter * 0.85));
    ctx.closePath();
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // C. Central Dual Shafts (N1 LP spool inside hollow N2 HP spool)
    ctx.save();
    // Inner N1 LP shaft (drives fan from LPT)
    const n1ShaftGrad = ctx.createLinearGradient(0, cy - rShaft * 0.45, 0, cy + rShaft * 0.45);
    n1ShaftGrad.addColorStop(0, '#0284c7');
    n1ShaftGrad.addColorStop(0.5, '#38bdf8');
    n1ShaftGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = n1ShaftGrad;
    ctx.fillRect(xFan, cy - rShaft * 0.4, (xLptEnd - xFan) + 40, rShaft * 0.8);

    // Outer N2 HP shaft (drives HPC from HPT)
    const n2ShaftGrad = ctx.createLinearGradient(0, cy - rShaft * 0.9, 0, cy + rShaft * 0.9);
    n2ShaftGrad.addColorStop(0, '#d97706');
    n2ShaftGrad.addColorStop(0.5, '#fbbf24');
    n2ShaftGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = n2ShaftGrad;
    ctx.fillRect(xBoosterEnd, cy - rShaft * 0.9, (xHptEnd - xBoosterEnd), rShaft * 0.35);
    ctx.fillRect(xBoosterEnd, cy + rShaft * 0.55, (xHptEnd - xBoosterEnd), rShaft * 0.35);
    ctx.restore();

    // D. Aerodynamic Spinner Cone with Signature Swirl
    this.drawSpinnerCone(ctx, xInlet + 25, xFan, cy, rShaft * 2.2);

    // E. Exhaust Plug Cone
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xLptEnd + 20, cy - rCoreOuter * 0.4);
    ctx.lineTo(xNozzleCore + 45, cy);
    ctx.lineTo(xLptEnd + 20, cy + rCoreOuter * 0.4);
    ctx.closePath();
    const plugGrad = ctx.createLinearGradient(xLptEnd, cy, xNozzleCore + 45, cy);
    plugGrad.addColorStop(0, '#334155');
    plugGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = plugGrad;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawSpinnerCone(ctx: CanvasRenderingContext2D, xTip: number, xBase: number, cy: number, rBase: number): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xBase, cy - rBase);
    ctx.quadraticCurveTo(xBase - (xBase - xTip) * 0.4, cy - rBase * 0.8, xTip, cy);
    ctx.quadraticCurveTo(xBase - (xBase - xTip) * 0.4, cy + rBase * 0.8, xBase, cy + rBase);
    ctx.closePath();

    const spinnerGrad = ctx.createLinearGradient(xTip, cy, xBase, cy);
    spinnerGrad.addColorStop(0, '#0f172a');
    spinnerGrad.addColorStop(0.6, '#1e293b');
    spinnerGrad.addColorStop(1, '#334155');
    ctx.fillStyle = spinnerGrad;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Rolls-Royce / GE spiral swirl marking
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    const swirlPh = this.fanRotationAngle % (Math.PI * 2);
    for (let t = 0; t <= 1; t += 0.04) {
      const px = xTip + t * (xBase - xTip);
      const radius = (t * t) * (rBase * 0.85);
      const angle = swirlPh + t * 4.5;
      const py = cy + Math.sin(angle) * radius;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawBlading(w: number, h: number, cy: number): void {
    const ctx = this.ctx;
    const xFan = w * 0.22;
    const xSplitter = w * 0.28;
    const xBoosterEnd = w * 0.38;
    const xHpcEnd = w * 0.54;
    const xHpt = w * 0.70;
    const xLpt = w * 0.78;

    const rFan = h * 0.37;
    const rShaft = h * 0.045;

    // 1. Titanium Wide-Chord Fan Blades (N1 LP Spool)
    ctx.save();
    const fanBladeCount = 8;
    for (let i = 0; i < fanBladeCount; i++) {
      const angle = this.fanRotationAngle + (i * Math.PI * 2) / fanBladeCount;
      const bladeZ = Math.cos(angle);
      const bladeY = Math.sin(angle);
      const bladeHeight = rFan * (0.4 + 0.6 * Math.abs(bladeY));
      const bladeTilt = bladeZ * 14;

      ctx.beginPath();
      ctx.moveTo(xFan + bladeTilt, cy - bladeHeight);
      ctx.lineTo(xFan + bladeTilt + 12, cy - bladeHeight + 8);
      ctx.lineTo(xFan + 8, cy - rShaft * 1.5);
      ctx.lineTo(xFan - 4, cy - rShaft * 1.5);
      ctx.closePath();

      const fanGrad = ctx.createLinearGradient(xFan, cy - bladeHeight, xFan + 12, cy);
      fanGrad.addColorStop(0, '#e2e8f0');
      fanGrad.addColorStop(0.5, '#64748b');
      fanGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = fanGrad;
      ctx.fill();

      // Mirror bottom half
      ctx.beginPath();
      ctx.moveTo(xFan - bladeTilt, cy + bladeHeight);
      ctx.lineTo(xFan - bladeTilt + 12, cy + bladeHeight - 8);
      ctx.lineTo(xFan + 8, cy + rShaft * 1.5);
      ctx.lineTo(xFan - 4, cy + rShaft * 1.5);
      ctx.closePath();
      ctx.fillStyle = fanGrad;
      ctx.fill();
    }
    ctx.restore();

    // 2. LPC Booster (4 stages on N1 spool)
    const lpcStages = 4;
    const lpcDx = (xBoosterEnd - xSplitter) / lpcStages;
    ctx.save();
    for (let s = 0; s < lpcStages; s++) {
      const sx = xSplitter + s * lpcDx + 10;
      const sH = (h * 0.17) * (1.0 - s * 0.08);
      const phase = this.fanRotationAngle * 1.2 + s;

      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#0284c7';
      // Top & bottom blades
      const bladeW = 4 + Math.sin(phase) * 2;
      ctx.fillRect(sx, cy - sH, bladeW, sH - rShaft * 1.1);
      ctx.fillRect(sx, cy + rShaft * 1.1, bladeW, sH - rShaft * 1.1);
    }
    ctx.restore();

    // 3. HPC Compressor (8 stages on N2 spool - high pressure)
    const hpcStages = 8;
    const hpcDx = (xHpcEnd - xBoosterEnd) / hpcStages;
    ctx.save();
    for (let s = 0; s < hpcStages; s++) {
      const sx = xBoosterEnd + s * hpcDx + 6;
      const sH = (h * 0.15) * (1.0 - s * 0.07);
      const phase = this.hpcRotationAngle + s * 0.6;

      const bladeW = 3.5 + Math.sin(phase) * 1.5;
      const compGrad = ctx.createLinearGradient(0, cy - sH, 0, cy + sH);
      compGrad.addColorStop(0, '#fde047');
      compGrad.addColorStop(0.5, '#ca8a04');
      compGrad.addColorStop(1, '#fde047');
      ctx.fillStyle = compGrad;

      ctx.fillRect(sx, cy - sH, bladeW, sH - rShaft * 1.2);
      ctx.fillRect(sx, cy + rShaft * 1.2, bladeW, sH - rShaft * 1.2);
    }
    ctx.restore();

    // 4. HPT High Pressure Turbine (2 stages, CMSX-4 single-crystal superalloy)
    const hptStages = 2;
    const hptDx = 16;
    ctx.save();
    for (let s = 0; s < hptStages; s++) {
      const sx = xHpt + s * hptDx;
      const sH = (h * 0.12) * (1.0 + s * 0.12);
      const phase = this.hpcRotationAngle * 1.1 + s;

      const bladeW = 4 + Math.cos(phase) * 1.5;
      const hptGrad = ctx.createLinearGradient(0, cy - sH, 0, cy + sH);
      hptGrad.addColorStop(0, '#ef4444');
      hptGrad.addColorStop(0.5, '#f97316');
      hptGrad.addColorStop(1, '#ef4444');
      ctx.fillStyle = hptGrad;

      ctx.fillRect(sx, cy - sH, bladeW, sH - rShaft * 1.1);
      ctx.fillRect(sx, cy + rShaft * 1.1, bladeW, sH - rShaft * 1.1);
    }
    ctx.restore();

    // 5. LPT Low Pressure Turbine (4 stages driving N1 LP spool)
    const lptStages = 4;
    const lptDx = 15;
    ctx.save();
    for (let s = 0; s < lptStages; s++) {
      const sx = xLpt + s * lptDx;
      const sH = (h * 0.14) * (1.0 + s * 0.12);
      const phase = this.fanRotationAngle * 1.3 + s;

      const bladeW = 4.5 + Math.sin(phase) * 1.5;
      const lptGrad = ctx.createLinearGradient(0, cy - sH, 0, cy + sH);
      lptGrad.addColorStop(0, '#f97316');
      lptGrad.addColorStop(0.5, '#eab308');
      lptGrad.addColorStop(1, '#f97316');
      ctx.fillStyle = lptGrad;

      ctx.fillRect(sx, cy - sH, bladeW, sH - rShaft * 1.1);
      ctx.fillRect(sx, cy + rShaft * 1.1, bladeW, sH - rShaft * 1.1);
    }
    ctx.restore();
  }

  private drawCombustorFlame(w: number, h: number, cy: number): void {
    const ctx = this.ctx;
    const xStart = w * 0.55;
    const xEnd = w * 0.69;
    const rLinerOuter = h * 0.18;
    const rLinerInner = h * 0.08;

    ctx.save();

    // Combustor Liners (with dilution holes)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);

    // Top liner
    ctx.beginPath();
    ctx.moveTo(xStart, cy - rLinerOuter);
    ctx.lineTo(xEnd, cy - rLinerOuter * 0.85);
    ctx.moveTo(xStart, cy - rLinerInner);
    ctx.lineTo(xEnd, cy - rLinerInner * 0.95);
    ctx.stroke();

    // Bottom liner
    ctx.beginPath();
    ctx.moveTo(xStart, cy + rLinerOuter);
    ctx.lineTo(xEnd, cy + rLinerOuter * 0.85);
    ctx.moveTo(xStart, cy + rLinerInner);
    ctx.lineTo(xEnd, cy + rLinerInner * 0.95);
    ctx.stroke();
    ctx.setLineDash([]);

    // Swirl Fuel Injectors (4 nozzles visible on top & bottom cutaway)
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(xStart - 6, cy - (rLinerOuter + rLinerInner) / 2 - 4, 8, 8);
    ctx.fillRect(xStart - 6, cy + (rLinerOuter + rLinerInner) / 2 - 4, 8, 8);

    // Dynamic Multi-Layer Turbulent Plasma Flame
    const titRatio = Math.min(1.5, this.state.titK / 1750);
    const flameAlpha = 0.55 + 0.35 * titRatio;

    const renderFlameSide = (isTop: boolean) => {
      const sign = isTop ? -1 : 1;
      const yMid = cy + sign * (rLinerOuter + rLinerInner) / 2;
      const ySpan = (rLinerOuter - rLinerInner) * 0.85;

      // Outer orange flame aura
      ctx.beginPath();
      ctx.moveTo(xStart + 4, yMid);
      const segments = 12;
      const dx = (xEnd - xStart) / segments;
      for (let s = 1; s <= segments; s++) {
        const sx = xStart + s * dx;
        const turbulentWiggle = Math.sin(this.flameTime + s * 1.5) * (ySpan * 0.35);
        const taper = 1.0 - Math.pow(s / segments, 1.8);
        const sy = yMid + sign * (ySpan * 0.5 * taper + turbulentWiggle);
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(xEnd, yMid);
      ctx.closePath();

      const flameGrad = ctx.createLinearGradient(xStart, yMid, xEnd, yMid);
      flameGrad.addColorStop(0, `rgba(255, 255, 255, ${flameAlpha})`);
      flameGrad.addColorStop(0.2, `rgba(254, 240, 138, ${flameAlpha})`);
      flameGrad.addColorStop(0.6, `rgba(249, 115, 22, ${flameAlpha * 0.85})`);
      flameGrad.addColorStop(1, `rgba(239, 68, 68, ${flameAlpha * 0.7})`);
      ctx.fillStyle = flameGrad;
      ctx.fill();

      // Inner white-hot plasma core
      ctx.beginPath();
      ctx.moveTo(xStart + 6, yMid);
      for (let s = 1; s <= 6; s++) {
        const sx = xStart + s * dx;
        const turbulentWiggle = Math.cos(this.flameTime * 1.5 + s) * (ySpan * 0.15);
        const sy = yMid + sign * (ySpan * 0.2 + turbulentWiggle);
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(xStart + 6 * dx, yMid);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${flameAlpha * 0.9})`;
      ctx.fill();
    };

    renderFlameSide(true);
    renderFlameSide(false);
    ctx.restore();
  }

  private drawCoreJetPlume(w: number, h: number, cy: number): void {
    const ctx = this.ctx;
    const xExhaust = w * 0.94;
    const rNozzle = h * 0.13;
    const thrustFrac = Math.min(1.4, this.state.netThrustKn / 115);

    ctx.save();
    const plumeLength = 120 * thrustFrac;
    const plumeGrad = ctx.createLinearGradient(xExhaust, cy, xExhaust + plumeLength, cy);
    plumeGrad.addColorStop(0, 'rgba(249, 115, 22, 0.65)');
    plumeGrad.addColorStop(0.4, 'rgba(234, 88, 12, 0.35)');
    plumeGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');

    ctx.beginPath();
    ctx.moveTo(xExhaust, cy - rNozzle);
    ctx.quadraticCurveTo(xExhaust + plumeLength * 0.5, cy - rNozzle * 0.7, xExhaust + plumeLength, cy);
    ctx.quadraticCurveTo(xExhaust + plumeLength * 0.5, cy + rNozzle * 0.7, xExhaust, cy + rNozzle);
    ctx.closePath();
    ctx.fillStyle = plumeGrad;
    ctx.fill();
    ctx.restore();
  }

  private drawAfterburnerPlume(w: number, h: number, cy: number): void {
    const ctx = this.ctx;
    const xNozzle = w * 0.94;
    const rNozzle = h * 0.14;
    const diamonds = Math.max(3, this.state.shockDiamondsCount);

    ctx.save();
    // 1. Massive Supersonic Reheat Jet Plume
    const plumeLength = w - xNozzle + 150;
    const abGrad = ctx.createLinearGradient(xNozzle, cy, xNozzle + plumeLength, cy);
    abGrad.addColorStop(0, 'rgba(147, 51, 234, 0.85)'); // Violet ion glow at throat
    abGrad.addColorStop(0.15, 'rgba(59, 130, 246, 0.8)'); // Mach blue
    abGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.75)'); // Reheat orange
    abGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

    ctx.beginPath();
    ctx.moveTo(xNozzle, cy - rNozzle * 1.15);
    ctx.lineTo(w, cy - rNozzle * 0.4);
    ctx.lineTo(w, cy + rNozzle * 0.4);
    ctx.lineTo(xNozzle, cy + rNozzle * 1.15);
    ctx.closePath();
    ctx.fillStyle = abGrad;
    ctx.fill();

    // 2. Mach Shock Diamonds (Oblique shock wave reflections)
    const diamondSpacing = 28;
    for (let i = 0; i < diamonds; i++) {
      const dx = xNozzle + 24 + i * diamondSpacing;
      const dWidth = 14;
      const dHeight = (rNozzle * 0.7) * (1.0 - i * 0.12);

      ctx.beginPath();
      ctx.moveTo(dx - dWidth, cy);
      ctx.lineTo(dx, cy - dHeight);
      ctx.lineTo(dx + dWidth, cy);
      ctx.lineTo(dx, cy + dHeight);
      ctx.closePath();

      const shockGrad = ctx.createRadialGradient(dx, cy, 0, dx, cy, dHeight);
      shockGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      shockGrad.addColorStop(0.5, 'rgba(96, 165, 250, 0.8)');
      shockGrad.addColorStop(1, 'rgba(147, 51, 234, 0.2)');
      ctx.fillStyle = shockGrad;
      ctx.fill();
    }
    ctx.restore();
  }

  private updateAndDrawParticles(w: number, h: number, cy: number, dt: number): void {
    const ctx = this.ctx;
    const isSurging = this.state.faultMode === 'compressor_stall';

    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += 1;

      // Calculate speed based on engine station coordinates
      const normX = p.x / w;
      let vx = 180;
      let targetY = p.y;
      let tempK = 288;

      if (normX < 0.22) {
        // Freestream & Nacelle intake
        vx = 140 + this.state.machNumber * 120;
        tempK = this.state.atmosphere.temperatureK;
      } else if (p.isBypass) {
        // Cold Bypass Duct (Station 13 to 18)
        vx = 220 + (this.state.n1Percent / 100) * 190;
        // Duct convergence
        const bypassCenterY = cy + (p.y > cy ? 1 : -1) * (h * 0.28);
        targetY = bypassCenterY + (p.y - bypassCenterY) * 0.98;
        tempK = this.state.stations['13'] ? this.state.stations['13'].totalTemperatureK : 340;
      } else {
        // Core Engine Stream
        if (normX < 0.38) {
          // LPC Booster
          vx = 110 + (this.state.n1Percent / 100) * 80;
          tempK = this.state.stations['2.5'] ? this.state.stations['2.5'].totalTemperatureK : 420;
        } else if (normX < 0.54) {
          // HPC
          vx = 80 + (this.state.n2Percent / 100) * 60;
          tempK = this.state.stations['3'] ? this.state.stations['3'].totalTemperatureK : 750;
        } else if (normX < 0.69) {
          // Combustor
          vx = 160 + (this.state.throttlePLA / 100) * 120;
          tempK = this.state.titK;
        } else if (normX < 0.84) {
          // Turbines (HPT / LPT)
          vx = 280 + (this.state.n2Percent / 100) * 140;
          tempK = this.state.stations['5'] ? this.state.stations['5'].totalTemperatureK : 800;
        } else {
          // Nozzle
          vx = 380 + (this.state.netThrustKn / 100) * 260;
          if (this.state.afterburnerActive) vx *= 1.6;
          tempK = this.state.stations['8'] ? this.state.stations['8'].totalTemperatureK : 850;
        }

        // Keep core particles confined inside core envelope
        const maxCoreR = h * 0.16 * (normX > 0.69 ? 0.8 : 1.0);
        const distFromCenter = p.y - cy;
        if (Math.abs(distFromCenter) > maxCoreR) {
          targetY = cy + Math.sign(distFromCenter) * (maxCoreR * 0.9);
        }
      }

      // Handle Compressor Surge violent backflow
      if (isSurging && !p.isBypass && normX > 0.30 && normX < 0.65) {
        vx = -120 * this.state.compressorSurgeIntensity;
        tempK = 1450; // Backfire fiery gas
      }

      // Integrate motion
      p.x += vx * dt;
      p.y += (targetY - p.y) * 0.08;
      p.tempK = tempK;

      // Color mapping based on temperature K
      const pColor = this.getParticleColor(tempK);

      // Draw particle
      ctx.fillStyle = pColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Reset particle if offscreen or expired
      if (p.x > w + 20 || p.x < -40 || p.life > p.maxLife) {
        this.particles[i] = this.createParticle();
      }
    }
    ctx.restore();
  }

  private getParticleColor(tempK: number): string {
    if (tempK < 310) return 'rgba(6, 182, 212, 0.85)'; // Freestream cyan
    if (tempK < 450) return 'rgba(56, 189, 248, 0.85)'; // Sky blue LPC
    if (tempK < 750) return 'rgba(253, 224, 71, 0.9)';  // Warm yellow HPC
    if (tempK < 1200) return 'rgba(249, 115, 22, 0.95)'; // Orange turbine
    if (tempK < 1650) return 'rgba(239, 68, 68, 0.95)';  // Bright fiery red
    return 'rgba(255, 255, 255, 0.98)';                // Plasma white
  }

  private drawThermalGradient(w: number, h: number, cy: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const grad = ctx.createLinearGradient(w * 0.1, cy, w * 0.95, cy);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
    grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.12)');
    grad.addColorStop(0.5, 'rgba(234, 179, 8, 0.18)');
    grad.addColorStop(0.65, 'rgba(239, 68, 68, 0.32)');
    grad.addColorStop(0.8, 'rgba(249, 115, 22, 0.22)');
    grad.addColorStop(1, 'rgba(234, 88, 12, 0.15)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  private drawStationProbes(w: number, h: number, cy: number): void {
    const ctx = this.ctx;
    ctx.save();

    for (const st of Object.values(this.state.stations)) {
      const px = st.xNorm * w;
      const isBypass = st.id === '13';
      const py = isBypass ? cy - h * 0.26 : cy;
      const isSelected = this.selectedStationId === st.id;

      // Probe Pin Head
      ctx.beginPath();
      ctx.arc(px, py, isSelected ? 8 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#f59e0b' : '#06b6d4';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.fill();
      ctx.stroke();

      // Vertical leader line up or down
      const leaderY = isBypass ? py - 26 : py - 38;
      ctx.beginPath();
      ctx.moveTo(px, py - (isSelected ? 8 : 6));
      ctx.lineTo(px, leaderY);
      ctx.strokeStyle = isSelected ? '#f59e0b' : 'rgba(6, 182, 212, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Telemetry HUD Tag
      const tagText = `St.${st.id} | ${st.totalTemperatureC}°C | ${st.totalPressureKPa} kPa`;
      ctx.font = '10px "JetBrains Mono", Consolas, monospace';
      const textWidth = ctx.measureText(tagText).width;

      ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.92)' : 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(6, 182, 212, 0.5)';
      ctx.lineWidth = 1;
      const boxX = px - textWidth / 2 - 6;
      const boxY = leaderY - 16;
      ctx.fillRect(boxX, boxY, textWidth + 12, 16);
      ctx.strokeRect(boxX, boxY, textWidth + 12, 16);

      ctx.fillStyle = isSelected ? '#0f172a' : '#38bdf8';
      ctx.fillText(tagText, boxX + 6, boxY + 12);
    }
    ctx.restore();
  }
}
