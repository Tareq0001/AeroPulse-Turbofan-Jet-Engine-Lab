// =====================================================================
// AERO-PULSE: Twin-Spool High-Bypass Turbofan & Brayton Cycle Simulator
// Application Main Orchestrator & Glass Cockpit HUD Controller
// Lead Architect: أ. طارق ابوعشي | Lead Aerospace Propulsion & Systems Architect
// =====================================================================

import { BraytonPhysicsEngine } from './engine/braytonPhysics';
import { JetAudioSynthesizer } from './engine/jetAudio';
import { JetCutawayCanvas } from './components/JetCutawayCanvas';
import { BraytonCycleChart } from './components/BraytonCycleChart';
import { DossierModal } from './components/DossierModal';
import { EngineState, EngineStation } from './types/engine';

// Bilingual Localization Dictionary
const i18n = {
  en: {
    brand: 'AERO-PULSE',
    brandBadge: 'AP-9000 TURBOFAN',
    architectLabel: 'Lead Architect:',
    audioOn: 'AUDIO: ON',
    audioMuted: 'AUDIO: MUTED',
    langToggle: 'عربي',
    dossierBtn: 'ENGINEERING DOSSIER',
    eicasTitle: 'EICAS PRIMARY GAUGES',
    n1Label: 'N1 FAN (LP)',
    n2Label: 'N2 CORE (HP)',
    egtLabel: 'EXHAUST TEMP',
    thrustLabel: 'NET THRUST',
    fuelLabel: 'FUEL FLOW',
    tsfcLabel: 'TSFC EFFICIENCY',
    oprLabel: 'OPR PRESSURE RATIO',
    bprLabel: 'BYPASS RATIO (BPR)',
    titLabel: 'TURBINE INLET (TIT)',
    tipMachLabel: 'FAN TIP RELATIVE MACH',
    vibLabel: 'BEARING VIBRATION',
    oilLabel: 'OIL PRESSURE / TEMP',
    cutawayTitle: 'TWIN-SPOOL TURBOFAN CUTAWAY SIMULATION',
    braytonTitle: 'BRAYTON CYCLE (T-s DIAGRAM)',
    plaLabel: 'THROTTLE (PLA)',
    altLabel: 'ALTITUDE',
    machLabel: 'FLIGHT MACH',
    bprSliderLabel: 'BYPASS RATIO (BPR)',
    faultTitle: 'FAULT INJECTION SWITCHBOARD',
    stallBtn: 'STALL / SURGE',
    birdBtn: 'BIRD STRIKE',
    abBtn: 'AFTERBURNER',
    resetBtn: 'FADEC RELIGHT',
    consoleTitle: 'AVIONICS TELEMETRY LOG'
  },
  ar: {
    brand: 'إيرو-بلس',
    brandBadge: 'محرك نفاث AP-9000',
    architectLabel: 'المصمم والمهندس المعماري المعتمد:',
    audioOn: 'الصوت: مفعّل',
    audioMuted: 'الصوت: صامت',
    langToggle: 'English',
    dossierBtn: 'الوثيقة الهندسية',
    eicasTitle: 'عدادات قمرة القيادة EICAS',
    n1Label: 'مروحة N1 (الضغط المنخفض)',
    n2Label: 'قلب N2 (الضغط العالي)',
    egtLabel: 'حرارة العادم EGT',
    thrustLabel: 'الدفع الصافي',
    fuelLabel: 'تدفق الوقود',
    tsfcLabel: 'معدل استهلاك الوقود TSFC',
    oprLabel: 'نسبة الضغط الكلية OPR',
    bprLabel: 'نسبة الالتفاف BPR',
    titLabel: 'حرارة مدخل التوربين TIT',
    tipMachLabel: 'ماخ حافة المروحة',
    vibLabel: 'اهتزاز المحامل',
    oilLabel: 'ضغط وحرارة الزيت',
    cutawayTitle: 'محاكاة المقطع العرضي للمحرك النفاث',
    braytonTitle: 'دورة برايتون (مخطط T-s)',
    plaLabel: 'ذراع الدفع (PLA)',
    altLabel: 'الارتفاع عن البحر',
    machLabel: 'سرعة الماخ',
    bprSliderLabel: 'نسبة الالتفاف (BPR)',
    faultTitle: 'لوحة حقن واختبار الأعطال',
    stallBtn: 'انهيار الضاغط / طفرة',
    birdBtn: 'اصطدام طائر (FOD)',
    abBtn: 'الحارق اللاحق',
    resetBtn: 'إعادة إشعال FADEC',
    consoleTitle: 'سجل الاتصال عن بعد للمحرك'
  }
};

class AeroPulseApp {
  private physics: BraytonPhysicsEngine;
  private audio: JetAudioSynthesizer;
  private cutawayCanvas: JetCutawayCanvas;
  private braytonChart: BraytonCycleChart;
  private dossierModal: DossierModal;

  private currentLang: 'en' | 'ar' = 'en';
  private lastTimeMs = 0;
  private lastLoggedMessage = '';

  // DOM Elements cache
  private elMasterAlertLed!: HTMLElement;
  private elMasterAlertText!: HTMLElement;
  private elBarAlt!: HTMLElement;
  private elBarMach!: HTMLElement;
  private elBarTemp!: HTMLElement;
  private elBarPress!: HTMLElement;
  private elBarQ!: HTMLElement;

  private elArcN1!: SVGCircleElement;
  private elArcN2!: SVGCircleElement;
  private elArcEgt!: SVGCircleElement;
  private elArcThrust!: SVGCircleElement;

  private elValN1Num!: HTMLElement;
  private elValN2Num!: HTMLElement;
  private elValEgtNum!: HTMLElement;
  private elValThrustNum!: HTMLElement;

  private elValFuel!: HTMLElement;
  private elValTsfc!: HTMLElement;
  private elValOpr!: HTMLElement;
  private elValBpr!: HTMLElement;
  private elValTit!: HTMLElement;
  private elValTipMach!: HTMLElement;
  private elValVib!: HTMLElement;
  private elValOil!: HTMLElement;

  private elSliderPla!: HTMLInputElement;
  private elValPla!: HTMLElement;
  private elSliderAlt!: HTMLInputElement;
  private elValAlt!: HTMLElement;
  private elSliderMach!: HTMLInputElement;
  private elValMach!: HTMLElement;
  private elSliderBpr!: HTMLInputElement;
  private elValBprSlider!: HTMLElement;

  private elBtnAudioToggle!: HTMLElement;
  private elAudioIcon!: HTMLElement;
  private elTxtAudio!: HTMLElement;
  private elBtnLangToggle!: HTMLElement;
  private elTxtLang!: HTMLElement;
  private elBtnDossier!: HTMLElement;

  private elBtnStall!: HTMLElement;
  private elBtnBird!: HTMLElement;
  private elBtnAb!: HTMLElement;
  private elBtnReset!: HTMLElement;

  private elLogConsole!: HTMLElement;

  // Station inspect card elements
  private elInspectTitle!: HTMLElement;
  private elInspectDesc!: HTMLElement;
  private elInspectTt!: HTMLElement;
  private elInspectPt!: HTMLElement;
  private elInspectMach!: HTMLElement;
  private elInspectVel!: HTMLElement;

  constructor() {
    this.physics = new BraytonPhysicsEngine();
    this.audio = new JetAudioSynthesizer();

    const cutawayCanvasEl = document.getElementById('jet-cutaway-canvas') as HTMLCanvasElement;
    this.cutawayCanvas = new JetCutawayCanvas(cutawayCanvasEl, this.physics.getInitialState());

    const braytonCanvasEl = document.getElementById('brayton-ts-canvas') as HTMLCanvasElement;
    this.braytonChart = new BraytonCycleChart(braytonCanvasEl);

    this.dossierModal = new DossierModal();

    this.cacheDOMElements();
    this.bindEvents();
    this.setupAudioAutoplayUnlock();
    this.setupStationSelection();

    // Start 60fps main RAF loop
    requestAnimationFrame(this.renderLoop.bind(this));
  }

  private cacheDOMElements(): void {
    this.elMasterAlertLed = document.getElementById('master-alert-led')!;
    this.elMasterAlertText = document.getElementById('master-alert-text')!;
    this.elBarAlt = document.getElementById('bar-alt')!;
    this.elBarMach = document.getElementById('bar-mach')!;
    this.elBarTemp = document.getElementById('bar-temp')!;
    this.elBarPress = document.getElementById('bar-press')!;
    this.elBarQ = document.getElementById('bar-q')!;

    this.elArcN1 = document.getElementById('arc-n1') as unknown as SVGCircleElement;
    this.elArcN2 = document.getElementById('arc-n2') as unknown as SVGCircleElement;
    this.elArcEgt = document.getElementById('arc-egt') as unknown as SVGCircleElement;
    this.elArcThrust = document.getElementById('arc-thrust') as unknown as SVGCircleElement;

    this.elValN1Num = document.getElementById('val-n1-num')!;
    this.elValN2Num = document.getElementById('val-n2-num')!;
    this.elValEgtNum = document.getElementById('val-egt-num')!;
    this.elValThrustNum = document.getElementById('val-thrust-num')!;

    this.elValFuel = document.getElementById('val-fuel')!;
    this.elValTsfc = document.getElementById('val-tsfc')!;
    this.elValOpr = document.getElementById('val-opr')!;
    this.elValBpr = document.getElementById('val-bpr')!;
    this.elValTit = document.getElementById('val-tit')!;
    this.elValTipMach = document.getElementById('val-tipmach')!;
    this.elValVib = document.getElementById('val-vib')!;
    this.elValOil = document.getElementById('val-oil')!;

    this.elSliderPla = document.getElementById('slider-pla') as HTMLInputElement;
    this.elValPla = document.getElementById('val-pla')!;
    this.elSliderAlt = document.getElementById('slider-alt') as HTMLInputElement;
    this.elValAlt = document.getElementById('val-alt')!;
    this.elSliderMach = document.getElementById('slider-mach') as HTMLInputElement;
    this.elValMach = document.getElementById('val-mach')!;
    this.elSliderBpr = document.getElementById('slider-bpr') as HTMLInputElement;
    this.elValBprSlider = document.getElementById('val-bpr-slider')!;

    this.elBtnAudioToggle = document.getElementById('btn-audio-toggle')!;
    this.elAudioIcon = document.getElementById('audio-icon')!;
    this.elTxtAudio = document.getElementById('txt-audio')!;
    this.elBtnLangToggle = document.getElementById('btn-lang-toggle')!;
    this.elTxtLang = document.getElementById('txt-lang')!;
    this.elBtnDossier = document.getElementById('btn-dossier')!;

    this.elBtnStall = document.getElementById('btn-stall')!;
    this.elBtnBird = document.getElementById('btn-bird')!;
    this.elBtnAb = document.getElementById('btn-ab')!;
    this.elBtnReset = document.getElementById('btn-reset')!;

    this.elLogConsole = document.getElementById('avionics-log-console')!;

    this.elInspectTitle = document.getElementById('inspect-title')!;
    this.elInspectDesc = document.getElementById('inspect-desc')!;
    this.elInspectTt = document.getElementById('inspect-tt')!;
    this.elInspectPt = document.getElementById('inspect-pt')!;
    this.elInspectMach = document.getElementById('inspect-mach')!;
    this.elInspectVel = document.getElementById('inspect-vel')!;
  }

  private bindEvents(): void {
    // Throttle PLA
    this.elSliderPla.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.physics.update(performance.now(), { throttlePLA: val });
      this.updateDetentHighlight(val);
    });

    // Altitude
    this.elSliderAlt.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.physics.update(performance.now(), { altitudeFt: val });
    });

    // Mach
    this.elSliderMach.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.physics.update(performance.now(), { machNumber: val });
    });

    // Bypass Ratio
    this.elSliderBpr.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.physics.update(performance.now(), { bypassRatio: val });
    });

    // Canvas Toggles
    const toggleParticles = document.getElementById('toggle-particles')!;
    toggleParticles.addEventListener('click', () => {
      this.cutawayCanvas.showParticles = !this.cutawayCanvas.showParticles;
      toggleParticles.classList.toggle('active', this.cutawayCanvas.showParticles);
    });

    const toggleHeatmap = document.getElementById('toggle-heatmap')!;
    toggleHeatmap.addEventListener('click', () => {
      this.cutawayCanvas.showHeatmap = !this.cutawayCanvas.showHeatmap;
      toggleHeatmap.classList.toggle('active', this.cutawayCanvas.showHeatmap);
    });

    const toggleProbes = document.getElementById('toggle-probes')!;
    toggleProbes.addEventListener('click', () => {
      this.cutawayCanvas.showProbes = !this.cutawayCanvas.showProbes;
      toggleProbes.classList.toggle('active', this.cutawayCanvas.showProbes);
    });

    // Fault Injection Switches
    this.elBtnStall.addEventListener('click', () => {
      this.audio.init();
      const current = this.physics.getInitialState().faultMode;
      const nextFault = current === 'compressor_stall' ? 'none' : 'compressor_stall';
      this.physics.update(performance.now(), { faultMode: nextFault });
      this.elBtnStall.classList.toggle('active', nextFault === 'compressor_stall');
      this.elBtnBird.classList.remove('active');
    });

    this.elBtnBird.addEventListener('click', () => {
      this.audio.init();
      const nextFault = 'bird_strike';
      this.physics.update(performance.now(), { faultMode: nextFault });
      this.elBtnBird.classList.add('active');
      this.elBtnStall.classList.remove('active');
    });

    this.elBtnAb.addEventListener('click', () => {
      this.audio.init();
      const curAb = (document.getElementById('slider-pla') as HTMLInputElement).value;
      const isCurrentlyActive = parseFloat(curAb) > 100;
      const targetPla = isCurrentlyActive ? 90 : 105;
      this.elSliderPla.value = targetPla.toString();
      this.physics.update(performance.now(), {
        throttlePLA: targetPla,
        afterburnerActive: !isCurrentlyActive
      });
      this.updateDetentHighlight(targetPla);
      this.elBtnAb.classList.toggle('active', !isCurrentlyActive);
    });

    this.elBtnReset.addEventListener('click', () => {
      this.audio.init();
      this.physics.triggerFadecRelight();
      this.elBtnStall.classList.remove('active');
      this.elBtnBird.classList.remove('active');
      this.elBtnAb.classList.remove('active');
      this.elSliderPla.value = '25';
      this.updateDetentHighlight(25);
    });

    // Audio Mute Toggle
    this.elBtnAudioToggle.addEventListener('click', () => {
      this.audio.init();
      const isMuted = this.audio.toggleMute();
      this.elAudioIcon.textContent = isMuted ? '🔇' : '🔊';
      this.elTxtAudio.textContent = isMuted
        ? (this.currentLang === 'ar' ? i18n.ar.audioMuted : i18n.en.audioMuted)
        : (this.currentLang === 'ar' ? i18n.ar.audioOn : i18n.en.audioOn);
    });

    // Language Toggle
    this.elBtnLangToggle.addEventListener('click', () => {
      this.currentLang = this.currentLang === 'en' ? 'ar' : 'en';
      this.dossierModal.setLanguage(this.currentLang);
      this.applyLanguage(this.currentLang);
    });

    // Dossier Modal
    this.elBtnDossier.addEventListener('click', () => {
      this.dossierModal.open();
    });

    // Resize handler
    window.addEventListener('resize', () => {
      this.cutawayCanvas.resize();
      this.braytonChart.resize();
    });
  }

  private setupAudioAutoplayUnlock(): void {
    const unlock = () => {
      this.audio.init();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
  }

  private setupStationSelection(): void {
    this.cutawayCanvas.onSelectStation = (st: EngineStation) => {
      const isAr = this.currentLang === 'ar';
      this.elInspectTitle.textContent = isAr ? st.nameAr : st.name;
      this.elInspectDesc.textContent = isAr ? st.descriptionAr : st.description;
      this.elInspectTt.textContent = `${st.totalTemperatureC} °C`;
      this.elInspectPt.textContent = `${st.totalPressureKPa} kPa`;
      this.elInspectMach.textContent = st.mach.toString();
      this.elInspectVel.textContent = `${st.velocityMs} m/s`;
    };
  }

  private updateDetentHighlight(pla: number): void {
    const spans = document.querySelectorAll('.throttle-detents-bar span');
    spans.forEach(s => s.classList.remove('active'));

    if (pla < 2 && spans[0]) spans[0].classList.add('active');
    else if (pla <= 25 && spans[1]) spans[1].classList.add('active');
    else if (pla <= 75 && spans[2]) spans[2].classList.add('active');
    else if (pla <= 90 && spans[3]) spans[3].classList.add('active');
    else if (pla <= 100 && spans[4]) spans[4].classList.add('active');
    else if (spans[5]) spans[5].classList.add('active');
  }

  private applyLanguage(lang: 'en' | 'ar'): void {
    const t = i18n[lang];
    document.documentElement.lang = lang;
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.getElementById('brand-main-title')!.innerHTML = `${t.brand} <span class="brand-badge">${t.brandBadge}</span>`;
    document.getElementById('txt-architect-label')!.textContent = t.architectLabel;
    this.elTxtLang.textContent = t.langToggle;
    document.getElementById('txt-dossier')!.textContent = t.dossierBtn;
    document.getElementById('txt-eicas-title')!.textContent = t.eicasTitle;
    document.getElementById('txt-n1-label')!.textContent = t.n1Label;
    document.getElementById('txt-n2-label')!.textContent = t.n2Label;
    document.getElementById('txt-egt-label')!.textContent = t.egtLabel;
    document.getElementById('txt-thrust-label')!.textContent = t.thrustLabel;
    document.getElementById('txt-fuel-label')!.textContent = t.fuelLabel;
    document.getElementById('txt-tsfc-label')!.textContent = t.tsfcLabel;
    document.getElementById('txt-opr-label')!.textContent = t.oprLabel;
    document.getElementById('txt-bpr-label')!.textContent = t.bprLabel;
    document.getElementById('txt-tit-label')!.textContent = t.titLabel;
    document.getElementById('txt-tipmach-label')!.textContent = t.tipMachLabel;
    document.getElementById('txt-vib-label')!.textContent = t.vibLabel;
    document.getElementById('txt-oil-label')!.textContent = t.oilLabel;
    document.getElementById('txt-cutaway-title')!.textContent = t.cutawayTitle;
    document.getElementById('txt-brayton-title')!.textContent = t.braytonTitle;
    document.getElementById('txt-pla-label')!.textContent = t.plaLabel;
    document.getElementById('txt-alt-label')!.textContent = t.altLabel;
    document.getElementById('txt-mach-label')!.textContent = t.machLabel;
    document.getElementById('txt-bpr-slider-label')!.textContent = t.bprSliderLabel;
    document.getElementById('txt-fault-title')!.textContent = t.faultTitle;
    document.getElementById('txt-stall')!.textContent = t.stallBtn;
    document.getElementById('txt-bird')!.textContent = t.birdBtn;
    document.getElementById('txt-ab')!.textContent = t.abBtn;
    document.getElementById('txt-reset')!.textContent = t.resetBtn;
    document.getElementById('txt-console-title')!.textContent = t.consoleTitle;

    const isMuted = this.audio.getMuted();
    this.elTxtAudio.textContent = isMuted ? t.audioMuted : t.audioOn;
  }

  private logEvent(message: string, severity: 'normal' | 'caution' | 'warning' | 'emergency'): void {
    if (message === this.lastLoggedMessage) return;
    this.lastLoggedMessage = message;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + Math.floor(now.getMilliseconds() / 100);

    const entry = document.createElement('div');
    entry.className = `log-entry ${severity}`;
    entry.innerHTML = `<span class="time">[${timeStr}]</span> <span class="msg">${message}</span>`;

    this.elLogConsole.appendChild(entry);
    this.elLogConsole.scrollTop = this.elLogConsole.scrollHeight;

    // Limit log count
    while (this.elLogConsole.children.length > 30) {
      this.elLogConsole.removeChild(this.elLogConsole.firstChild!);
    }
  }

  private renderLoop(timeMs: number): void {
    if (this.lastTimeMs === 0) this.lastTimeMs = timeMs;
    const dt = Math.min((timeMs - this.lastTimeMs) / 1000, 0.1);
    this.lastTimeMs = timeMs;

    // 1. Advance Physics Engine
    const state = this.physics.update(timeMs, {});

    // 2. Render Cutaway Canvas
    this.cutawayCanvas.render(state, dt);

    // 3. Render Brayton Cycle T-s Diagram
    this.braytonChart.render(state);

    // 4. Update Audio Synthesizer
    this.audio.update(state);

    // 5. Update Dossier Station telemetry if open
    this.dossierModal.updateStations(state);

    // 6. Update EICAS Cockpit HUD Instruments
    this.updateHUD(state);

    requestAnimationFrame(this.renderLoop.bind(this));
  }

  private updateHUD(state: EngineState): void {
    // Master Alert Bar
    this.elMasterAlertLed.className = `alert-led ${state.activeEventSeverity}`;
    this.elMasterAlertText.textContent = state.activeEventMessage;

    // Log new event if changed
    this.logEvent(state.activeEventMessage, state.activeEventSeverity);

    // Atmosphere bar
    this.elBarAlt.textContent = `${state.atmosphere.altitudeFt.toLocaleString()} FT`;
    this.elBarMach.textContent = `M ${state.atmosphere.mach.toFixed(2)}`;
    this.elBarTemp.textContent = `${state.atmosphere.temperatureC.toFixed(1)} °C`;
    this.elBarPress.textContent = `${state.atmosphere.pressureKPa.toFixed(1)} kPa`;
    this.elBarQ.textContent = `${state.atmosphere.dynamicPressureKPa.toFixed(1)} kPa`;

    // Circular Arc Offsets (238.7 full circle, arc uses ~179.0 span for 270 deg)
    const arcSpan = 179.0;
    const baseOffset = 59.7; // 25% gap at bottom

    // N1 gauge (0 to 110%)
    const n1Frac = Math.min(1.1, state.n1Percent / 110);
    this.elArcN1.style.strokeDashoffset = `${baseOffset + (1.0 - n1Frac) * arcSpan}`;
    this.elValN1Num.textContent = state.n1Percent.toFixed(1);

    // N2 gauge (0 to 115%)
    const n2Frac = Math.min(1.15, state.n2Percent / 115);
    this.elArcN2.style.strokeDashoffset = `${baseOffset + (1.0 - n2Frac) * arcSpan}`;
    this.elValN2Num.textContent = state.n2Percent.toFixed(1);

    // EGT gauge (0 to 1200 °C)
    const egtFrac = Math.min(1.0, state.egtC / 1200);
    this.elArcEgt.style.strokeDashoffset = `${baseOffset + (1.0 - egtFrac) * arcSpan}`;
    this.elValEgtNum.textContent = state.egtC.toString();
    this.elArcEgt.classList.toggle('warning', state.egtWarning);

    // Net Thrust gauge (0 to 160 kN)
    const thrustFrac = Math.min(1.0, state.netThrustKn / 160);
    this.elArcThrust.style.strokeDashoffset = `${baseOffset + (1.0 - thrustFrac) * arcSpan}`;
    this.elValThrustNum.textContent = state.netThrustKn.toFixed(1);

    // Secondary Telemetry
    this.elValFuel.textContent = `${state.fuelFlowKgH.toLocaleString()} kg/h`;
    this.elValTsfc.textContent = `${state.tsfcGKnS} g/kN·s`;
    this.elValOpr.textContent = `${state.overallPressureRatio} : 1`;
    this.elValBpr.textContent = `${state.bypassRatio.toFixed(1)} : 1`;
    this.elValTit.textContent = `${state.titC} °C (${state.titK} K)`;
    this.elValTipMach.textContent = `M ${state.bladeTipMach}`;
    this.elValVib.textContent = `${state.vibrationG} G`;
    this.elValOil.textContent = `${state.oilPressurePsi} PSI / ${state.oilTempC}°C`;

    // Update Slider readouts
    this.elValPla.textContent = `${state.throttlePLA}% [${state.detent}]`;
    this.elValAlt.textContent = `${state.altitudeFt.toLocaleString()} FT (FL${Math.floor(state.altitudeFt / 100).toString().padStart(3, '0')})`;
    this.elValMach.textContent = `M ${state.machNumber.toFixed(2)}`;
    this.elValBprSlider.textContent = `${state.bypassRatio.toFixed(1)} : 1`;
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new AeroPulseApp();
});
