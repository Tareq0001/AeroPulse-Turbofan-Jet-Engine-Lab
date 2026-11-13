// =====================================================================
// AERO-PULSE: Twin-Spool High-Bypass Turbofan & Brayton Cycle Simulator
// Engineering Dossier & Aerothermodynamic Specification Modal
// Lead Architect: أ. طارق ابوعشي | Lead Aerospace Propulsion & Systems Architect
// =====================================================================

import { EngineState } from '../types/engine';

export class DossierModal {
  private container: HTMLElement;
  private isOpen: boolean = false;
  private currentLang: 'en' | 'ar' = 'en';

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'dossier-modal-overlay';
    this.container.className = 'dossier-overlay hidden';
    document.body.appendChild(this.container);
    this.render();
    this.setupListeners();
  }

  public setLanguage(lang: 'en' | 'ar'): void {
    this.currentLang = lang;
    this.render();
  }

  public open(): void {
    this.isOpen = true;
    this.container.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  public close(): void {
    this.isOpen = false;
    this.container.classList.add('hidden');
    document.body.style.overflow = '';
  }

  private setupListeners(): void {
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });
  }

  public updateStations(state: EngineState): void {
    if (!this.isOpen) return;
    const tableBody = this.container.querySelector('#dossier-stations-body');
    if (!tableBody) return;

    let rowsHtml = '';
    for (const st of Object.values(state.stations)) {
      rowsHtml += `
        <tr>
          <td class="font-mono text-cyan-400 font-bold">St. ${st.id}</td>
          <td>${this.currentLang === 'ar' ? st.nameAr : st.name}</td>
          <td class="font-mono text-amber-300">${st.totalTemperatureC} °C (${st.totalTemperatureK} K)</td>
          <td class="font-mono text-emerald-400">${st.totalPressureKPa} kPa</td>
          <td class="font-mono text-slate-300">M ${st.mach}</td>
          <td class="font-mono text-sky-400">${st.velocityMs} m/s</td>
        </tr>
      `;
    }
    tableBody.innerHTML = rowsHtml;
  }

  private render(): void {
    const isAr = this.currentLang === 'ar';
    const dir = isAr ? 'rtl' : 'ltr';

    this.container.innerHTML = `
      <div class="dossier-modal-box" dir="${dir}">
        <!-- Modal Header -->
        <div class="dossier-header">
          <div class="dossier-title-group">
            <span class="dossier-tag">AP-9000 // PROPULSION ARCHITECTURE SPECIFICATION</span>
            <h2 class="dossier-title">
              ${isAr ? 'الوثيقة الهندسية: المحرك التوربيني المروحي ودورة برايتون' : 'Aerospace Engineering Dossier: Twin-Spool High-Bypass Turbofan'}
            </h2>
            <p class="dossier-architect">
              ${isAr ? 'المصمم والمهندس المعماري المعتمد: ' : 'Lead Architect & Systems Engineer: '}
              <strong class="text-cyan-400">أ. طارق ابوعشي | Lead Aerospace Propulsion & Systems Architect</strong>
            </p>
          </div>
          <button id="dossier-close-btn" class="dossier-close-btn" aria-label="Close modal">✕</button>
        </div>

        <!-- Modal Body Content -->
        <div class="dossier-body">
          <!-- Section 1: Dual-Spool Aerothermodynamic Architecture -->
          <div class="dossier-section">
            <h3 class="section-title">
              <span class="section-num">01</span>
              ${isAr ? 'معمارية عمودي الدوران المزدوجين (Twin-Spool Architecture)' : 'Twin-Spool Dual-Shaft Thermodynamic Coupling'}
            </h3>
            <p class="section-text">
              ${isAr
                ? 'يعتمد محرك AP-9000 على نظام ميكانيكي وديناميكي حراري ثنائي الأعمدة غير المتزامنين (Twin-Spool Coaxial Spools). يتصل عمود الضغط المنخفض (N1 LP Spool) بالمروحة العملاقة الأمامية ذات الريش العريضة المصنوعة من التيتانيوم ومراحل LPC الأربعة، ويُدار مباشرة بواسطة توربين الضغط المنخفض (LPT) ذي الأربع مراحل. بينما يدور عمود الضغط العالي الخارجي المفرغ (N2 HP Spool) بسرعة أعلى تصل إلى 12,400 دورة/دقيقة لضغط تيار الهواء الأساسي عبر 8 مراحل من HPC إلى نسبة ضغط قصوى تتجاوز 45:1.'
                : 'The AP-9000 engine employs two concentric, mechanically independent spools rotating at aerodynamically optimized velocities. The Low-Pressure Spool (N1, 2,850 RPM base) drives the 116-inch wide-chord hollow titanium fan and 4-stage LPC booster via a 4-stage Low-Pressure Turbine (LPT). The High-Pressure Spool (N2, 12,400 RPM base) houses an 8-stage axial High-Pressure Compressor (HPC) driven by a 2-stage High-Pressure Turbine (HPT), achieving overall pressure ratios (OPR) exceeding 45:1.'}
            </p>
            <div class="dossier-formula-card">
              <div class="formula-line">
                <code>OPR = (P_t3 / P_t2) = π_LPC × π_HPC</code>
              </div>
              <div class="formula-line">
                <code>W_HPT = W_HPC / η_mech = c_p,air (T_t3 - T_t2.5) / η_m</code>
              </div>
              <div class="formula-line">
                <code>W_LPT = (BPR · c_p,air (T_t13 - T_t2) + c_p,air (T_t2.5 - T_t2)) / η_m</code>
              </div>
            </div>
          </div>

          <!-- Section 2: Real-time Station State Table -->
          <div class="dossier-section">
            <h3 class="section-title">
              <span class="section-num">02</span>
              ${isAr ? 'جدول المحطات الديناميكية الحرارية (Thermodynamic Stations Telemetry)' : 'Engine Station Aerothermodynamic State Telemetry'}
            </h3>
            <div class="table-responsive">
              <table class="dossier-table">
                <thead>
                  <tr>
                    <th>${isAr ? 'المحطة' : 'Station'}</th>
                    <th>${isAr ? 'الموقع الفعلي' : 'Aerospace Component'}</th>
                    <th>${isAr ? 'الحرارة الكلية Tt' : 'Total Temp (Tt)'}</th>
                    <th>${isAr ? 'الضغط الكلي Pt' : 'Total Pressure (Pt)'}</th>
                    <th>${isAr ? 'الماخ M' : 'Mach'}</th>
                    <th>${isAr ? 'السرعة V' : 'Flow Velocity'}</th>
                  </tr>
                </thead>
                <tbody id="dossier-stations-body">
                  <!-- Populated dynamically via updateStations() -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Section 3: Joule-Brayton Thermodynamic Derivation -->
          <div class="dossier-section">
            <h3 class="section-title">
              <span class="section-num">03</span>
              ${isAr ? 'معادلات دورة برايتون المفتوحة مع اللاانعكاسية' : 'Joule-Brayton Open Cycle Equations & Irreversibility'}
            </h3>
            <p class="section-text">
              ${isAr
                ? 'تخضع دورة الغاز التوربيني لدورة برايتون المفتوحة مع أخذ مفاقيد الاحتكاك والانتشار (Isentropic Efficiencies). يتم الانضغاط بالضاغط بكفاءة η_c حيث ترتفع الإنتروبيا s نتيجة الاحتكاك اللزوجي، بينما يتم إضافة الحرارة في غرفة الاحتراق بضغط شبه ثابت مع هبوط ضغط مقداره 4.5%، ثم يتمدد الغاز في التوربينات بكفاءة تمدد η_t لاستخلاص الشغل المحوري.'
                : 'The turbofan core operates on the modified open Joule-Brayton cycle with aerodynamic irreversibilities. Compression in the fan, LPC, and HPC exhibits isentropic efficiencies (η_c ≈ 0.88-0.915) generating positive entropy gain Δs. Combustion is modelled as constant-pressure heat addition with 4.5% total pressure loss, followed by polytropic expansion across HPT and LPT to drive the rotating spools.'}
            </p>
            <div class="formula-grid">
              <div class="formula-box">
                <span class="formula-title">${isAr ? 'كفاءة الانضغاط الحقيقي' : 'Real Compressor Delivery'}</span>
                <code>T_t3 = T_t2 [1 + 1/η_c (OPR^((γ-1)/γ) - 1)]</code>
              </div>
              <div class="formula-box">
                <span class="formula-title">${isAr ? 'دفع رد الفعل الصافي' : 'Net Thrust Formulation'}</span>
                <code>F_N = ṁ_c (V_8 - V_0) + ṁ_b (V_18 - V_0) + (P_8 - P_0) A_8</code>
              </div>
              <div class="formula-box">
                <span class="formula-title">${isAr ? 'الكفاءة الدافعة' : 'Propulsive Efficiency'}</span>
                <code>η_p = 2 V_0 / (V_jet + V_0)</code>
              </div>
              <div class="formula-box">
                <span class="formula-title">${isAr ? 'الاستهلاك النوعي للوقود' : 'TSFC Performance'}</span>
                <code>TSFC = ṁ_fuel / F_N  [g / (kN·s)]</code>
              </div>
            </div>
          </div>

          <!-- Section 4: Advanced Superalloy Metallurgy (CMSX-4) -->
          <div class="dossier-section">
            <h3 class="section-title">
              <span class="section-num">04</span>
              ${isAr ? 'هندسة المواد الفائقة: سبيكة CMSX-4 الأحادية البلورة' : 'Advanced Materials Science: Single-Crystal CMSX-4 Nickel Superalloy'}
            </h3>
            <p class="section-text">
              ${isAr
                ? 'تتعرض ريش التوربين HPT لدرجات حرارة تتجاوز 1450°C (أعلى من نقطة انصهار الفولاذ العادي بـ 200°C) تحت قوى طرد مركزي تزيد عن 20,000G. تُصنّع الريش من سبيكة CMSX-4 أحادية البلورة (Single-Crystal Ni-Superalloy) بتقنية السحب الاتجاهي (Bridgman directional solidification) لمنع أي حدود بلورية (Grain Boundaries) تسبب الزحف الحراري (Creep). وتُطلى بطلاء الحاجز الحراري الزركوني YSZ بطريقة التبخير الفيزيائي EB-PVD، مع مسارات تبريد ثعبانية داخلية وثقوب تبريد غشائي بالليزر لتشكيل طبقة هواء عازلة حول الريشة.'
                : 'High-Pressure Turbine first-stage rotor blades experience gas temperatures exceeding 1,720 K (1,447 °C) in centrifugal acceleration fields exceeding 20,000 g. To withstand these extreme conditions without mechanical creep rupture, the blades are cast as unbroken single crystals using second-generation CMSX-4 nickel-base superalloy (containing 3.0 wt% Rhenium to prevent dislocation movement). The aerodynamic surfaces are shielded by a 150 µm Yttria-Stabilized Zirconia (7-8YSZ) Thermal Barrier Coating (TBC) applied via Electron-Beam Physical Vapor Deposition (EB-PVD), complemented by serpentine internal cooling channels and multi-row laser-drilled film-cooling effusion holes.'}
            </p>
            <div class="superalloy-specs-grid">
              <div class="spec-item">
                <span class="spec-label">${isAr ? 'نقطة انصهار السبيكة' : 'Solidus Temperature'}</span>
                <span class="spec-value">1,385 °C (1,658 K)</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">${isAr ? 'الحرارة الغازية القصوى TIT' : 'Max Turbine Gas TIT'}</span>
                <span class="spec-value text-red-400">1,480 °C (1,753 K)</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">${isAr ? 'حاجز التبريد الغشائي ΔT' : 'Film Cooling & TBC ΔT'}</span>
                <span class="spec-value text-cyan-400">-320 °C Drop</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">${isAr ? 'محتوى عنصر الرينيوم Re' : 'Rhenium Weight %'}</span>
                <span class="spec-value">3.0 wt% Re</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="dossier-footer">
          <span class="dossier-footer-note">
            AERO-PULSE LAB // CLASSIFIED PROPULSION DESIGN SUITE // VERIFIED FOR AEROSPACE EDUCATION & RESEARCH
          </span>
          <button id="dossier-done-btn" class="avionics-btn-primary">
            ${isAr ? 'إغلاق الوثيقة' : 'Close Dossier'}
          </button>
        </div>
      </div>
    `;

    // Re-attach close events
    const closeBtn = this.container.querySelector('#dossier-close-btn');
    const doneBtn = this.container.querySelector('#dossier-done-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (doneBtn) doneBtn.addEventListener('click', () => this.close());
  }
}
