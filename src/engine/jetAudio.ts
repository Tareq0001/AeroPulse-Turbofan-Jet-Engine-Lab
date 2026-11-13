// =====================================================================
// AERO-PULSE: Twin-Spool High-Bypass Turbofan & Brayton Cycle Simulator
// Real-Time Web Audio API Jet Sound Synthesizer
// Lead Architect: أ. طارق ابوعشي | Lead Aerospace Propulsion & Systems Architect
// =====================================================================

import { EngineState } from '../types/engine';

export class JetAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Sound generator nodes
  private fanFilter: BiquadFilterNode | null = null;
  private fanGain: GainNode | null = null;

  private subBassOsc: OscillatorNode | null = null;
  private subBassGain: GainNode | null = null;

  private turbineOsc1: OscillatorNode | null = null;
  private turbineOsc2: OscillatorNode | null = null;
  private turbineFilter: BiquadFilterNode | null = null;
  private turbineGain: GainNode | null = null;

  private jetExhaustGain: GainNode | null = null;
  private jetExhaustFilter: BiquadFilterNode | null = null;

  private afterburnerGain: GainNode | null = null;
  private afterburnerFilter: BiquadFilterNode | null = null;

  private lastSurgeState: boolean = false;
  private lastWarningState: boolean = false;

  constructor() {
    // Initialized on first user interaction to satisfy browser autoplay policy
  }

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupFanRumble();
      this.setupTurbineWhine();
      this.setupJetExhaust();
      this.setupAfterburnerRumble();
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
    }
  }

  private createNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private setupFanRumble(): void {
    if (!this.ctx || !this.masterGain) return;
    const noiseBuffer = this.createNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    this.fanFilter = this.ctx.createBiquadFilter();
    this.fanFilter.type = 'lowpass';
    this.fanFilter.frequency.setValueAtTime(160, this.ctx.currentTime);
    this.fanFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.fanGain = this.ctx.createGain();
    this.fanGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    noiseSource.connect(this.fanFilter);
    this.fanFilter.connect(this.fanGain);
    this.fanGain.connect(this.masterGain);
    noiseSource.start(0);

    // Sub-bass engine rumble
    this.subBassOsc = this.ctx.createOscillator();
    this.subBassOsc.type = 'sine';
    this.subBassOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.subBassGain = this.ctx.createGain();
    this.subBassGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    this.subBassOsc.connect(this.subBassGain);
    this.subBassGain.connect(this.masterGain);
    this.subBassOsc.start(0);
  }

  private setupTurbineWhine(): void {
    if (!this.ctx || !this.masterGain) return;

    this.turbineOsc1 = this.ctx.createOscillator();
    this.turbineOsc1.type = 'sawtooth';
    this.turbineOsc1.frequency.setValueAtTime(950, this.ctx.currentTime);

    this.turbineOsc2 = this.ctx.createOscillator();
    this.turbineOsc2.type = 'sine';
    this.turbineOsc2.frequency.setValueAtTime(1900, this.ctx.currentTime);

    this.turbineFilter = this.ctx.createBiquadFilter();
    this.turbineFilter.type = 'bandpass';
    this.turbineFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    this.turbineFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    this.turbineGain = this.ctx.createGain();
    this.turbineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.turbineOsc1.connect(this.turbineFilter);
    this.turbineOsc2.connect(this.turbineFilter);
    this.turbineFilter.connect(this.turbineGain);
    this.turbineGain.connect(this.masterGain);

    this.turbineOsc1.start(0);
    this.turbineOsc2.start(0);
  }

  private setupJetExhaust(): void {
    if (!this.ctx || !this.masterGain) return;
    const noiseBuffer = this.createNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    this.jetExhaustFilter = this.ctx.createBiquadFilter();
    this.jetExhaustFilter.type = 'bandpass';
    this.jetExhaustFilter.frequency.setValueAtTime(600, this.ctx.currentTime);
    this.jetExhaustFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    this.jetExhaustGain = this.ctx.createGain();
    this.jetExhaustGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    noiseSource.connect(this.jetExhaustFilter);
    this.jetExhaustFilter.connect(this.jetExhaustGain);
    this.jetExhaustGain.connect(this.masterGain);
    noiseSource.start(0);
  }

  private setupAfterburnerRumble(): void {
    if (!this.ctx || !this.masterGain) return;
    const noiseBuffer = this.createNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    this.afterburnerFilter = this.ctx.createBiquadFilter();
    this.afterburnerFilter.type = 'lowpass';
    this.afterburnerFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

    this.afterburnerGain = this.ctx.createGain();
    this.afterburnerGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    noiseSource.connect(this.afterburnerFilter);
    this.afterburnerFilter.connect(this.afterburnerGain);
    this.afterburnerGain.connect(this.masterGain);
    noiseSource.start(0);
  }

  public update(state: EngineState): void {
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const n1Frac = Math.max(0.1, state.n1Percent / 100);
    const n2Frac = Math.max(0.1, state.n2Percent / 100);

    // Update Fan rumble cutoff & frequency
    if (this.fanFilter && this.fanGain && this.subBassOsc) {
      const fanFreq = 90 + n1Frac * 360;
      this.fanFilter.frequency.setTargetAtTime(fanFreq, t, 0.1);
      this.subBassOsc.frequency.setTargetAtTime(32 + n1Frac * 68, t, 0.1);
      this.fanGain.gain.setTargetAtTime(0.12 + n1Frac * 0.28, t, 0.1);
    }

    // Update Turbine whine pitch (N2 spool blade-pass whine)
    if (this.turbineOsc1 && this.turbineOsc2 && this.turbineFilter && this.turbineGain) {
      const baseWhine = 650 + Math.pow(n2Frac, 1.8) * 2200;
      this.turbineOsc1.frequency.setTargetAtTime(baseWhine, t, 0.08);
      this.turbineOsc2.frequency.setTargetAtTime(baseWhine * 1.5, t, 0.08);
      this.turbineFilter.frequency.setTargetAtTime(baseWhine, t, 0.08);
      this.turbineGain.gain.setTargetAtTime(0.04 + n2Frac * 0.12, t, 0.1);
    }

    // Update Jet Exhaust sound
    if (this.jetExhaustGain && this.jetExhaustFilter) {
      const exhaustSpeedFrac = Math.min(1.5, state.stations['8'] ? state.stations['8'].velocityMs / 450 : 0.5);
      this.jetExhaustFilter.frequency.setTargetAtTime(400 + exhaustSpeedFrac * 700, t, 0.1);
      this.jetExhaustGain.gain.setTargetAtTime(0.08 + Math.pow(exhaustSpeedFrac, 1.5) * 0.32, t, 0.1);
    }

    // Afterburner crackle/roar
    if (this.afterburnerGain && this.afterburnerFilter) {
      if (state.afterburnerActive) {
        this.afterburnerGain.gain.setTargetAtTime(0.48, t, 0.15);
        this.afterburnerFilter.frequency.setTargetAtTime(450, t, 0.15);
      } else {
        this.afterburnerGain.gain.setTargetAtTime(0.0, t, 0.2);
      }
    }

    // Check Compressor Stall Pop / Explosion
    const isSurging = state.faultMode === 'compressor_stall';
    if (isSurging && !this.lastSurgeState) {
      this.playCompressorStallBang();
    }
    this.lastSurgeState = isSurging;

    // Check Master Warning Alert
    const hasWarning = state.activeEventSeverity === 'emergency';
    if (hasWarning && !this.lastWarningState) {
      this.playMasterWarningChime();
    }
    this.lastWarningState = hasWarning;
  }

  public playCompressorStallBang(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Deep explosive thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.65);
  }

  public playMasterWarningChime(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Two-tone cockpit warning chime (800 Hz -> 600 Hz)
    const playTone = (freq: number, start: number, dur: number) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + dur);
    };

    playTone(850, t, 0.22);
    playTone(620, t + 0.24, 0.32);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}
