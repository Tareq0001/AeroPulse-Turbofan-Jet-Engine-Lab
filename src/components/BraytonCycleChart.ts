// =====================================================================
// AERO-PULSE: Twin-Spool High-Bypass Turbofan & Brayton Cycle Simulator
// Real-Time Brayton Cycle T-s (Temperature-Entropy) Thermodynamic Chart
// Lead Architect: أ. طارق ابوعشي | Lead Aerospace Propulsion & Systems Architect
// =====================================================================

import { EngineState } from '../types/engine';

export class BraytonCycleChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;
  private width: number = 380;
  private height: number = 300;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context for Brayton chart');
    this.ctx = ctx;
    this.initCanvasSize();
  }

  private initCanvasSize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 380;
    this.height = rect.height || 280;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  public resize(): void {
    this.initCanvasSize();
  }

  public render(state: EngineState): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, w, h);

    // Padding margins for axes
    const padL = 46;
    const padR = 24;
    const padT = 32;
    const padB = 38;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Scale domains
    const sMin = -20;
    const sMax = 580; // J/(kg*K)
    const tMin = 150; // K
    const tMax = 2100; // K

    const mapX = (s: number) => padL + ((s - sMin) / (sMax - sMin)) * plotW;
    const mapY = (t: number) => padT + plotH - ((t - tMin) / (tMax - tMin)) * plotH;

    // Grid lines & Axis labels
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Horizontal T grid
    for (let t = 400; t <= 2000; t += 400) {
      const y = mapY(t);
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
    }
    // Vertical s grid
    for (let s = 100; s <= 500; s += 100) {
      const x = mapX(s);
      ctx.moveTo(x, padT);
      ctx.lineTo(x, h - padB);
    }
    ctx.stroke();

    // Axis markings
    ctx.fillStyle = '#64748b';
    ctx.font = '9px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = 'right';
    for (let t = 400; t <= 2000; t += 400) {
      ctx.fillText(`${t}K`, padL - 6, mapY(t) + 3);
    }

    ctx.textAlign = 'center';
    for (let s = 100; s <= 500; s += 100) {
      ctx.fillText(`${s}`, mapX(s), h - padB + 14);
    }

    // Axis titles
    ctx.fillStyle = '#06b6d4';
    ctx.font = '10px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('T (Kelvin)', padL - 4, padT - 12);
    ctx.textAlign = 'right';
    ctx.fillText('Δs (J/kg·K)', w - padR, h - padB + 28);

    // EGT Redline line (Station 5 limit)
    const redlineK = state.egtRedlineC + 273.15;
    const redlineY = mapY(redlineK);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, redlineY);
    ctx.lineTo(w - padR, redlineY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'right';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(`EGT LIMIT ${state.egtRedlineC}°C`, w - padR, redlineY - 4);

    const pts = state.braytonPoints;
    if (pts.length < 5) return;

    // Draw Shaded Net Work Area (integral of T ds enclosed by cycle)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(mapX(pts[0].s), mapY(pts[0].t));
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(mapX(pts[i].s), mapY(pts[i].t));
    }
    ctx.closePath();
    const workGrad = ctx.createLinearGradient(0, mapY(2000), 0, mapY(300));
    workGrad.addColorStop(0, 'rgba(249, 115, 22, 0.25)');
    workGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.15)');
    workGrad.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
    ctx.fillStyle = workGrad;
    ctx.fill();
    ctx.restore();

    // Draw Ideal Isentropic Cycle (Dashed gray outline)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(mapX(pts[0].s), mapY(pts[0].t));
    // 0 to 2 to 3 ideal (vertical isentropic compression)
    ctx.lineTo(mapX(pts[0].s), mapY(pts[2].tIdeal));
    // 3 to 4 ideal combustor
    ctx.lineTo(mapX(pts[3].s), mapY(pts[3].t));
    // 4 to 5 ideal expansion (vertical isentropic)
    ctx.lineTo(mapX(pts[3].s), mapY(pts[4].tIdeal));
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Real Irreversible Brayton Cycle (Solid Cyan/Amber line)
    ctx.save();
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(mapX(pts[0].s), mapY(pts[0].t));
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(mapX(pts[i].s), mapY(pts[i].t));
    }
    ctx.closePath();
    const cycleGrad = ctx.createLinearGradient(padL, 0, w - padR, 0);
    cycleGrad.addColorStop(0, '#06b6d4');
    cycleGrad.addColorStop(0.4, '#eab308');
    cycleGrad.addColorStop(0.7, '#f97316');
    cycleGrad.addColorStop(1, '#ef4444');
    ctx.strokeStyle = cycleGrad;
    ctx.stroke();
    ctx.restore();

    // Draw Station Markers & Labels
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const px = mapX(p.s);
      const py = mapY(p.t);

      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = i === 3 ? '#ef4444' : (i === 4 ? '#f97316' : '#06b6d4');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = px > w - 60 ? 'right' : 'left';
      const labelY = py > h - 50 ? py - 8 : py - 6;
      ctx.fillText(p.label, px + (px > w - 60 ? -8 : 7), labelY);
    }

    // Top Summary Badge: Net Work & Thermal Efficiency
    ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`η_th: ${(state.thermalEfficiency * 100).toFixed(1)}% | OPR: ${state.overallPressureRatio}`, w - padR, padT - 12);
  }
}
