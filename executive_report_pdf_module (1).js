/**
 * report-pdf.js
 * Executive Report Module (Weekly Operational & Monthly Management Detail PDF)
 * Machine Performance System (MPS) - PT. KTC Coal Mining & Energy
 * System Architect & Designed by: Adi Pranata
 * Copyright (c) 2026 Adi Pranata. All Rights Reserved.
 */

/* ============================================================================
 * 7. EXECUTIVE REPORT MODULE (WEEKLY VS MONTHLY MANAGEMENT DETAIL PDF)
 *    - System Controls: English
 *    - PDF Report Content: Formal Indonesian Paper (BAB I - IV)
 * ============================================================================ */
const ReportModule = {
  reportType: 'MONTHLY', // 'WEEKLY' | 'MONTHLY'
  kpiData: null,
  loadedMeta: null,
  analysisData: {
    source: 'SMART_ENGINE',
    summaryText: '',
    bab2Analysis: '',
    bab3Analysis: '',
    bab4Conclusion: '',
    recommendations: []
  },
  trendChart: null,
  paretoChart: null,

  init() {
    const startInput = document.getElementById('rep-start-date');
    const endInput = document.getElementById('rep-end-date');
    const monthPicker = document.getElementById('rep-month-picker');
    if (startInput && endInput && (!startInput.value || !endInput.value)) {
      this.applyDatePreset('MTD', false);
    }
    if (monthPicker && !monthPicker.value && startInput?.value) {
      monthPicker.value = startInput.value.slice(0, 7);
    }
  },

  resetPreview() {
    this.kpiData = null;
    this.loadedMeta = null;
    document.getElementById('pdf-printable-sheet')?.classList.add('hidden');
    document.getElementById('rep-empty-placeholder')?.classList.remove('hidden');

    const btnAi = document.getElementById('btn-report-ai');
    const btnPdf = document.getElementById('btn-download-pdf');
    const statusMsg = document.getElementById('rep-status-msg');
    const aiBadge = document.getElementById('rep-ai-badge');

    if (btnAi) btnAi.disabled = true;
    if (btnPdf) btnPdf.disabled = true;
    if (statusMsg) {
      statusMsg.innerHTML = 'Select report mode &amp; period above, then click <strong>Load Report Data</strong> to preview.';
      statusMsg.className = 'text-xs text-slate-500';
    }
    if (aiBadge) aiBadge.textContent = 'Analysis Engine: Standby';
  },

  markStale() {
    if (!this.kpiData) return;
    const btnPdf = document.getElementById('btn-download-pdf');
    const btnAi = document.getElementById('btn-report-ai');
    const statusMsg = document.getElementById('rep-status-msg');
    if (btnPdf) btnPdf.disabled = true;
    if (btnAi) btnAi.disabled = true;
    if (statusMsg) {
      statusMsg.innerHTML = 'Filter parameters changed. Click <strong>Load Report Data</strong> to update report preview &amp; enable PDF download.';
      statusMsg.className = 'text-xs text-amber-600 font-semibold';
    }
  },

  applyMonthPicker(monthVal) {
    if (!monthVal) return;
    const [yStr, mStr] = monthVal.split('-');
    const year = Number(yStr);
    const month = Number(mStr);
    const lastDay = new Date(year, month, 0).getDate();
    const startInput = document.getElementById('rep-start-date');
    const endInput = document.getElementById('rep-end-date');
    if (startInput) startInput.value = `${yStr}-${mStr}-01`;
    if (endInput) endInput.value = `${yStr}-${mStr}-${String(lastDay).padStart(2, '0')}`;
    this.markStale();
  },

  toggleNarrativeEditor() {
    const box = document.getElementById('rep-edit-narratives-box');
    if (!box) return;
    const isHidden = box.classList.contains('hidden');
    if (isHidden) {
      this.syncNarrativeEditorInputs();
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  },

  syncNarrativeEditorInputs() {
    const map = [
      ['edit-nar-bab1', this.analysisData.summaryText],
      ['edit-nar-bab2', this.analysisData.bab2Analysis],
      ['edit-nar-bab3', this.analysisData.bab3Analysis],
      ['edit-nar-bab4', this.analysisData.bab4Conclusion]
    ];
    map.forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    });
  },

  onManualNarrativeEdit() {
    this.analysisData.summaryText = document.getElementById('edit-nar-bab1')?.value || '';
    this.analysisData.bab2Analysis = document.getElementById('edit-nar-bab2')?.value || '';
    this.analysisData.bab3Analysis = document.getElementById('edit-nar-bab3')?.value || '';
    this.analysisData.bab4Conclusion = document.getElementById('edit-nar-bab4')?.value || '';
    this.analysisData.source = 'CUSTOM_EDITED';

    const elBab1 = document.getElementById('rep-summary-text');
    const elBab2 = document.getElementById('rep-bab2-text');
    const elBab3 = document.getElementById('rep-bab3-text');
    const elBab4 = document.getElementById('rep-bab4-text');
    const srcTag = document.getElementById('rep-summary-source-tag');
    if (elBab1) elBab1.textContent = this.analysisData.summaryText;
    if (elBab2) elBab2.textContent = this.analysisData.bab2Analysis;
    if (elBab3) elBab3.textContent = this.analysisData.bab3Analysis;
    if (elBab4) elBab4.textContent = this.analysisData.bab4Conclusion;
    if (srcTag) srcTag.textContent = 'Narasi Disesuaikan Manual';
  },

  setReportType(type) {
    this.reportType = type === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY';

    const btnWeekly = document.getElementById('btn-mode-weekly');
    const badgeWeekly = document.getElementById('badge-mode-weekly');
    const btnMonthly = document.getElementById('btn-mode-monthly');
    const badgeMonthly = document.getElementById('badge-mode-monthly');

    if (this.reportType === 'WEEKLY') {
      btnWeekly.className = 'text-left p-3.5 rounded-xl border-2 border-blue-600 bg-blue-50/60 transition';
      badgeWeekly.className = 'px-2 py-0.5 text-[10px] font-bold rounded bg-blue-600 text-white';
      badgeWeekly.textContent = 'Active • Tactical Focus';

      btnMonthly.className = 'text-left p-3.5 rounded-xl border-2 border-slate-200 bg-slate-50 hover:border-blue-400 transition';
      badgeMonthly.className = 'px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-600';
      badgeMonthly.textContent = 'Full Audit';

      this.applyDatePreset('LAST_7', false);
    } else {
      btnMonthly.className = 'text-left p-3.5 rounded-xl border-2 border-blue-600 bg-blue-50/60 transition';
      badgeMonthly.className = 'px-2 py-0.5 text-[10px] font-bold rounded bg-blue-600 text-white';
      badgeMonthly.textContent = 'Active • Full Audit';

      btnWeekly.className = 'text-left p-3.5 rounded-xl border-2 border-slate-200 bg-slate-50 hover:border-blue-400 transition';
      badgeWeekly.className = 'px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-600';
      badgeWeekly.textContent = 'Tactical Focus';

      this.applyDatePreset('MTD', false);
    }

    this.markStale();
  },

  applyDatePreset(preset, notifyStale = true) {
    const startInput = document.getElementById('rep-start-date');
    const endInput = document.getElementById('rep-end-date');
    const monthPicker = document.getElementById('rep-month-picker');
    if (!startInput || !endInput) return;

    const now = new Date();
    const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    if (preset === 'LAST_7') {
      const d7 = new Date(now);
      d7.setDate(now.getDate() - 6);
      startInput.value = fmt(d7);
      endInput.value = fmt(now);
    } else if (preset === 'MTD') {
      startInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      endInput.value = fmt(now);
    } else if (preset === 'LAST_MONTH') {
      const firstLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastLast = new Date(now.getFullYear(), now.getMonth(), 0);
      startInput.value = fmt(firstLast);
      endInput.value = fmt(lastLast);
    }

    if (monthPicker && startInput.value) {
      monthPicker.value = startInput.value.slice(0, 7);
    }

    if (notifyStale) this.markStale();
  },

  syncCustomNotes() {
    const val = String(document.getElementById('rep-custom-notes')?.value || '').trim();
    const box = document.getElementById('rep-notes-box');
    const txt = document.getElementById('rep-notes-text');
    if (!box || !txt) return;

    if (val) {
      box.classList.remove('hidden');
      txt.textContent = val;
    } else {
      box.classList.add('hidden');
      txt.textContent = '';
    }
  },

  async load() {
    this.init();
    const startDate = document.getElementById('rep-start-date')?.value;
    const endDate = document.getElementById('rep-end-date')?.value;
    const model = document.getElementById('rep-filter-model')?.value || 'ALL';
    const statusMsg = document.getElementById('rep-status-msg');
    const btnLoad = document.getElementById('btn-load-report');
    if (!startDate || !endDate) return;

    if (btnLoad) {
      btnLoad.disabled = true;
      btnLoad.textContent = 'Loading...';
    }
    if (statusMsg) {
      statusMsg.textContent = 'Loading report dataset...';
      statusMsg.className = 'text-xs text-blue-600 font-medium';
    }

    const res = await callBackendApi('GET_DASHBOARD_KPI', {
      site: AuthModule.currentSite,
      startDate: startDate,
      endDate: endDate,
      model: model
    });

    if (btnLoad) {
      btnLoad.disabled = false;
      btnLoad.textContent = 'Load Report Data';
    }

    if (res.status === 'success') {
      this.kpiData = res;
      this.loadedMeta = {
        site: AuthModule.currentSite,
        startDate: startDate,
        endDate: endDate,
        model: model,
        reportType: this.reportType
      };
      this.analysisData = this.buildLocalIndonesianAnalysis(res, startDate, endDate, model, this.reportType);
      this.syncNarrativeEditorInputs();

      document.getElementById('rep-empty-placeholder')?.classList.add('hidden');
      document.getElementById('pdf-printable-sheet')?.classList.remove('hidden');
      const btnAi = document.getElementById('btn-report-ai');
      const btnPdf = document.getElementById('btn-download-pdf');
      if (btnAi) btnAi.disabled = false;
      if (btnPdf) btnPdf.disabled = false;

      this.renderPreviewSheet();
      if (statusMsg) {
        statusMsg.textContent = `Report loaded (${this.reportType === 'WEEKLY' ? 'Weekly Operational' : 'Monthly Management Detail'} • ${startDate} to ${endDate}).`;
        statusMsg.className = 'text-xs text-emerald-600 font-semibold';
      }
    } else if (statusMsg) {
      statusMsg.textContent = res.message || 'Failed to load report data.';
      statusMsg.className = 'text-xs text-rose-600 font-semibold';
    }
  },

  async enhanceWithAi() {
    if (!this.kpiData || !this.loadedMeta) {
      showToast('Please click "Load Report Data" first before generating AI analysis.', 'warning');
      return;
    }
    const btn = document.getElementById('btn-report-ai');
    const statusMsg = document.getElementById('rep-status-msg');
    const { site, startDate, endDate, model, reportType } = this.loadedMeta;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>&#9203;</span><span>Generating Gemini AI Analysis...</span>';
    }
    if (statusMsg) {
      statusMsg.textContent = 'Connecting to Gemini AI Reliability Engine...';
      statusMsg.className = 'text-xs text-indigo-600 font-medium';
    }

    const res = await callBackendApi('GENERATE_AI_REPORT', {
      site: site,
      startDate: startDate,
      endDate: endDate,
      model: model,
      reportType: reportType
    });

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>&#10024;</span><span>Generate AI Analysis (Gemini)</span>';
    }

    if (res.status === 'success' && res.summaryText) {
      const localFallback = this.buildLocalIndonesianAnalysis(this.kpiData, startDate, endDate, model, reportType);
      this.analysisData = {
        source: res.source || 'GEMINI_AI',
        summaryText: res.summaryText,
        bab2Analysis: res.bab2Analysis || localFallback.bab2Analysis,
        bab3Analysis: res.bab3Analysis || localFallback.bab3Analysis,
        bab4Conclusion: res.bab4Conclusion || localFallback.bab4Conclusion,
        recommendations: res.recommendations || localFallback.recommendations
      };
      this.syncNarrativeEditorInputs();
      this.renderPreviewSheet();
      showToast(
        res.source === 'GEMINI_AI'
          ? 'Gemini AI Deep Reliability Analysis generated!'
          : 'Smart Reliability Engine narratives updated.',
        'success'
      );
      if (statusMsg) {
        statusMsg.textContent = `Narrative updated (${res.source === 'GEMINI_AI' ? 'Gemini AI' : 'Smart Rule Engine'}). Ready to download PDF.`;
        statusMsg.className = 'text-xs text-emerald-600 font-semibold';
      }
    } else {
      if (statusMsg) statusMsg.textContent = 'Executive analysis ready using Smart Reliability Engine.';
      showToast(res.message || 'Using Smart Rule Engine analysis.', 'warning');
    }
  },

  buildLocalIndonesianAnalysis(kpiRes, startDate, endDate, filterModel, reportType) {
    const ov = kpiRes.overall;
    const target = kpiRes.target || 85;
    const isWeekly = reportType === 'WEEKLY';
    const paOk = ov.pa >= target;
    const uaOk = ov.ua >= target;
    const totalCal = Math.round((ov.wh + ov.bdUnsched + ov.bdSched + ov.rainHrs + ov.stbyHrs) * 10) / 10;
    const whPct = totalCal > 0 ? ((ov.wh / totalCal) * 100).toFixed(1) : '0.0';
    const totalBdHrs = Math.round((ov.bdUnsched + ov.bdSched) * 10) / 10;
    const excessBdHrs = Math.max(0, Math.round((totalBdHrs - totalCal * 0.15) * 10) / 10);

    const topComp = kpiRes.pareto && kpiRes.pareto.length > 0 ? kpiRes.pareto[0] : null;
    const secondComp = kpiRes.pareto && kpiRes.pareto.length > 1 ? kpiRes.pareto[1] : null;
    const totParetoHrs = (kpiRes.pareto || []).reduce((acc, p) => acc + p.totalHours, 0);

    const trendList = kpiRes.trend || [];
    const bestDay = trendList.reduce((best, d) => (!best || d.pa > best.pa ? d : best), null);
    const worstDay = trendList.reduce((worst, d) => (!worst || d.pa < worst.pa ? d : worst), null);

    const lowestUnits = (kpiRes.byUnit || []).filter((u) => u.pa < target).sort((a, b) => a.pa - b.pa);
    const modelsSorted = [...(kpiRes.byModel || [])].sort((a, b) => b.pa - a.pa);
    const openBds = kpiRes.activeBreakdowns || [];
    const openCount = openBds.length;
    const mutCount = (kpiRes.rosterMutations || []).length;

    const scopeLabel = isWeekly
      ? `evaluasi operasional mingguan periode ${startDate} s/d ${endDate}`
      : `evaluasi bulanan manajemen periode ${startDate} s/d ${endDate}`;

    // BAB I: Ringkasan Eksekutif (Analisa sebab-akibat mendalam dengan bahasa mudah dipahami manajemen)
    const bab1Parts = [];
    if (paOk) {
      bab1Parts.push(
        `Berdasarkan ${scopeLabel} (${filterModel === 'ALL' ? 'Seluruh Populasi On-Hired' : 'Model ' + filterModel}), tingkat kesiapan fisik armada site ${kpiRes.site} tercapai optimal dengan Physical Availability (PA) sebesar ${ov.pa.toFixed(2)}% (+${(ov.pa - target).toFixed(2)}% di atas target ${target}%) dan ketangguhan mekanis (MA) ${ov.ma.toFixed(2)}%.`
      );
    } else {
      bab1Parts.push(
        `Berdasarkan ${scopeLabel} (${filterModel === 'ALL' ? 'Seluruh Populasi On-Hired' : 'Model ' + filterModel}), kesiapan fisik armada (PA) site ${kpiRes.site} tercatat ${ov.pa.toFixed(2)}% atau tertinggal ${(target - ov.pa).toFixed(2)}% dari target ${target}%, dengan kelebihan waktu henti kerusakan sebesar ${excessBdHrs.toFixed(1)} jam di atas batas toleransi 15%.`
      );
    }
    bab1Parts.push(
      `Dari total ${totalCal.toFixed(1)} jam jadwal kerja armada, unit beroperasi produktif selama ${ov.wh.toFixed(1)} jam (${whPct}%), sementara kehilangan waktu terbagi pada kerusakan mendadak ${ov.bdUnsched.toFixed(1)} jam (${ov.freqUnsched} kejadian), servis terjadwal ${ov.bdSched.toFixed(1)} jam, cuaca hujan ${ov.rainHrs.toFixed(1)} jam, dan standby operasi ${ov.stbyHrs.toFixed(1)} jam.`
    );
    bab1Parts.push(
      `Kecepatan rata-rata tim workshop menyelesaikan perbaikan (MTTR) tercatat ${ov.mttr.toFixed(2)} jam (${ov.mttr <= APP_CONFIG.MTTR_TARGET ? 'lebih cepat dari batas maksimal 4.0 jam' : 'melebihi batas 4.0 jam'}), dengan tingkat pemanfaatan unit siap pakai (UA) ${ov.ua.toFixed(2)}% dan ketahanan antar-kerusakan (MTBR) ${ov.mtbr.toFixed(2)} jam.`
    );

    // BAB II: Penjelasan Tren Harian & Hukum Pareto 80/20
    const bab2Parts = [];
    if (bestDay && worstDay && trendList.length > 1) {
      bab2Parts.push(
        `Pergerakan tren harian menunjukkan performa kesiapan armada tertinggi dicapai pada tanggal ${bestDay.date} (PA ${Number(bestDay.pa).toFixed(2)}%), sedangkan titik penurunan terdalam terjadi pada tanggal ${worstDay.date} (PA ${Number(worstDay.pa).toFixed(2)}%) akibat akumulasi jam perbaikan pada hari tersebut.`
      );
    }
    if (topComp && totParetoHrs > 0) {
      const sharePct = ((topComp.totalHours / totParetoHrs) * 100).toFixed(1);
      const secondInfo = secondComp
        ? `, diikuti oleh ${secondComp.component} sebesar ${secondComp.totalHours.toFixed(2)} jam (${((secondComp.totalHours / totParetoHrs) * 100).toFixed(1)}%)`
        : '';
      bab2Parts.push(
        `Berdasarkan prinsip Pareto (80/20), kelompok komponen ${topComp.component} menjadi akar masalah paling dominan dengan ${topComp.totalHours.toFixed(2)} jam atau ${sharePct}% dari total kerusakan mendadak${secondInfo} — sehingga pengendalian preventif pada komponen ini akan memulihkan sebagian besar kehilangan jam operasi.`
      );
    } else {
      bab2Parts.push(
        `Tidak terdapat lonjakan kerusakan komponen mendadak yang dominan sepanjang periode evaluasi ini, menandakan kondisi sistem utama armada relatif terkendali.`
      );
    }

    // BAB III: Evaluasi Performa Model, Watchlist Unit & Audit Mutasi
    const bab3Parts = [];
    if (modelsSorted.length > 0) {
      const bestM = modelsSorted[0];
      const worstM = modelsSorted[modelsSorted.length - 1];
      if (modelsSorted.length > 1) {
        bab3Parts.push(
          `Secara komparasi antar-model, armada ${bestM.model} menjadi tulang punggung dengan kesiapan tertinggi (PA ${bestM.pa.toFixed(2)}%, MA ${bestM.ma.toFixed(2)}%), sedangkan model ${worstM.model} mencatatkan PA ${worstM.pa.toFixed(2)}% sehingga memerlukan pengawasan pemeliharaan lebih ketat.`
        );
      } else {
        bab3Parts.push(
          `Armada model ${bestM.model} mencatatkan rata-rata PA ${bestM.pa.toFixed(2)}% dengan efisiensi waktu perbaikan (MTTR) ${bestM.mttr.toFixed(2)} jam.`
        );
      }
    }
    if (lowestUnits.length > 0) {
      const worstU = lowestUnits[0];
      bab3Parts.push(
        `Terdapat ${lowestUnits.length} unit dengan pencapaian PA di bawah target ${target}% dengan kontributor penurunan terbesar pada unit ${worstU.unitId} (PA ${worstU.pa.toFixed(2)}%, BD Unscheduled ${worstU.bdUnsched.toFixed(1)} jam).`
      );
    } else {
      bab3Parts.push(`Seluruh unit pada populasi On-Hired berhasil mempertahankan pencapaian PA di atas standar target manajemen (${target}%).`);
    }
    const openDetail = openCount > 0 ? ` (${openBds.map((b) => b.unitId).join(', ')})` : '';
    bab3Parts.push(
      `Hingga akhir periode laporan, tercatat ${openCount} unit masih dalam status perbaikan aktif/belum RFU${openDetail} serta ${mutCount} catatan mutasi status populasi (On-Hired / Off-Hired).`
    );

    // BAB IV: Kesimpulan Manajemen
    const bab4Conclusion = paOk && uaOk
      ? `Secara keseluruhan performa kesiapan mekanis maupun pemanfaatan operasional armada site ${kpiRes.site} berada pada kategori SEHAT (memenuhi target utama >= ${target}%), dengan fokus pengawalan ke depan pada pencegahan kerusakan berulang komponen ${topComp ? topComp.component : 'utama'} serta percepatan penyelesaian open backlog.`
      : `Performa armada site ${kpiRes.site} memerlukan intervensi manajerial terfokus pada penyelesaian unit breakdown aktif, penguatan inspeksi preventif komponen ${topComp ? topComp.component : 'kritis'}, serta sinkronisasi jadwal operasi lapangan guna mengembalikan PA dan UA di atas target ${target}%.`;

    const recs = [];
    if (topComp) {
      recs.push(`Lakukan inspeksi preventif terfokus (targeted inspection) dan pastikan ketersediaan fast-moving sparepart untuk kelompok komponen ${topComp.component} (${topComp.totalHours.toFixed(1)} jam BD).`);
    }
    if (lowestUnits.length > 0) {
      const sample = lowestUnits.slice(0, 3).map((u) => `${u.unitId} (PA ${u.pa.toFixed(1)}%)`).join(', ');
      recs.push(`Prioritaskan backlog review dan evaluasi teknis mendalam pada unit di bawah target: ${sample}.`);
    } else {
      recs.push(`Pertahankan kedisiplinan jadwal Preventive Maintenance (SVC/SCH) dan pemeriksaan harian P2H agar seluruh unit konsisten di atas target ${target}%.`);
    }
    if (openCount > 0) {
      recs.push(`Percepat eksekusi perbaikan dan pengawalan suplai suku cadang pada ${openCount} unit yang masih berstatus Breakdown Belum RFU (${openBds.map((b) => b.unitId).join(', ')}).`);
    }
    if (ov.stbyHrs > ov.wh * 0.12) {
      recs.push(`Optimalkan koordinasi harian antara tim Plant dan Operasional/Produksi untuk menekan jam Standby (${ov.stbyHrs.toFixed(1)} jam) agar UA meningkat optimal.`);
    }

    return {
      source: 'SMART_ENGINE',
      summaryText: bab1Parts.join(' '),
      bab2Analysis: bab2Parts.join(' '),
      bab3Analysis: bab3Parts.join(' '),
      bab4Conclusion: bab4Conclusion,
      recommendations: recs
    };
  },

  renderPreviewSheet() {
    if (!this.kpiData) return;

    const session = getUserSession();
    const startDate = document.getElementById('rep-start-date')?.value || '-';
    const endDate = document.getElementById('rep-end-date')?.value || '-';
    const model = document.getElementById('rep-filter-model')?.value || 'ALL';
    const isWeekly = this.reportType === 'WEEKLY';
    const target = this.kpiData.target || APP_CONFIG.KPI_TARGET;
    const ov = this.kpiData.overall;

    // Document Header (Indonesian Formal Paper)
    document.getElementById('rep-doc-main-title').textContent = isWeekly
      ? 'LAPORAN MINGGUAN OPERASIONAL & KESIAPAN ARMADA'
      : 'LAPORAN BULANAN EKSEKUTIF PERFORMA & RELIABILITAS ARMADA';
    document.getElementById('rep-doc-subtitle').textContent = isWeekly
      ? 'Evaluasi Taktis Mingguan, Status Open Backlog & Unit Perlu Perhatian'
      : 'Evaluasi Kesiapan Mekanis, Pareto Kerusakan Komponen & Audit Performa Seluruh Unit';
    document.getElementById('rep-doc-category').textContent = isWeekly
      ? 'MINGGUAN OPERASIONAL (TAKTIS)'
      : 'BULANAN MANAJEMEN (DETAIL)';
    document.getElementById('rep-doc-site').textContent = `${this.kpiData.site} (${model === 'ALL' ? 'Semua Model' : model})`;
    document.getElementById('rep-doc-period').textContent = `${startDate} s/d ${endDate}`;
    document.getElementById('rep-doc-printed-by').textContent = session?.fullName || session?.username || 'Planner';
    document.getElementById('rep-doc-printed-at').textContent = new Date().toLocaleString('id-ID');

    // Toggle Monthly-only Beginner Guides & Chapter Narrative Boxes
    const toggleMonthlyBox = (id, show) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (show) el.classList.remove('hidden');
      else el.classList.add('hidden');
    };
    toggleMonthlyBox('rep-monthly-kpi-guide', !isWeekly);
    toggleMonthlyBox('rep-monthly-time-table-wrap', !isWeekly);
    toggleMonthlyBox('rep-monthly-pareto-wrap', !isWeekly);
    toggleMonthlyBox('rep-monthly-bab2-box', !isWeekly);
    toggleMonthlyBox('rep-monthly-bab3-box', !isWeekly);
    toggleMonthlyBox('rep-monthly-daily-wrap', !isWeekly);
    toggleMonthlyBox('rep-mutation-section', !isWeekly);
    toggleMonthlyBox('rep-monthly-bab4-box', !isWeekly);

    const actionTitle = document.getElementById('rep-action-plan-title');
    if (actionTitle) {
      actionTitle.textContent = isWeekly
        ? '4.1 Rencana Tindak Lanjut Teknis (Action Plan):'
        : '4.2 Rencana Tindak Lanjut Teknis (Action Plan):';
    }

    // KPI Cards
    const setRepCard = (idVal, idSub, val, isPct = true) => {
      document.getElementById(idVal).textContent = isPct ? `${val.toFixed(2)}%` : `${val.toFixed(2)} Jam`;
      if (isPct) {
        const gap = val - target;
        const gapStr = gap >= 0 ? `+${gap.toFixed(2)}%` : `${gap.toFixed(2)}%`;
        const elSub = document.getElementById(idSub);
        elSub.textContent = `Target ≥ ${target}% (${gapStr})`;
        elSub.className = `text-[10px] font-bold mt-0.5 ${gap >= 0 ? 'text-emerald-700' : 'text-rose-700'}`;
      }
    };
    setRepCard('rep-val-pa', 'rep-sub-pa', ov.pa, true);
    setRepCard('rep-val-ma', 'rep-sub-ma', ov.ma, true);
    setRepCard('rep-val-ua', 'rep-sub-ua', ov.ua, true);
    setRepCard('rep-val-mttr', 'rep-sub-mttr', ov.mttr, false);
    setRepCard('rep-val-mtbr', 'rep-sub-mtbr', ov.mtbr, false);

    // Time Distribution
    const totalCal = Math.round((ov.wh + ov.bdUnsched + ov.bdSched + ov.rainHrs + ov.stbyHrs) * 10) / 10;
    const pct = (v) => (totalCal > 0 ? (v / totalCal) * 100 : 0);
    document.getElementById('rep-total-cal').textContent = `Total Calendar: ${totalCal.toFixed(1)} Jam (100%)`;
    document.getElementById('rep-leg-wh').textContent = `${ov.wh.toFixed(1)}j (${pct(ov.wh).toFixed(1)}%)`;
    document.getElementById('rep-leg-bd-unsch').textContent = `${ov.bdUnsched.toFixed(1)}j (${pct(ov.bdUnsched).toFixed(1)}%)`;
    document.getElementById('rep-leg-bd-sch').textContent = `${ov.bdSched.toFixed(1)}j (${pct(ov.bdSched).toFixed(1)}%)`;
    document.getElementById('rep-leg-rain').textContent = `${ov.rainHrs.toFixed(1)}j (${pct(ov.rainHrs).toFixed(1)}%)`;
    document.getElementById('rep-leg-stby').textContent = `${ov.stbyHrs.toFixed(1)}j (${pct(ov.stbyHrs).toFixed(1)}%)`;

    const bar = document.getElementById('rep-time-bar');
    if (bar && totalCal > 0) {
      const segs = [
        { p: pct(ov.wh), bg: 'bg-emerald-500' },
        { p: pct(ov.bdUnsched), bg: 'bg-rose-500' },
        { p: pct(ov.bdSched), bg: 'bg-amber-400 text-slate-900' },
        { p: pct(ov.rainHrs), bg: 'bg-sky-500' },
        { p: pct(ov.stbyHrs), bg: 'bg-slate-400' }
      ];
      bar.innerHTML = segs
        .filter((s) => s.p > 0)
        .map((s) => `<div style="width:${s.p.toFixed(2)}%" class="${s.bg} h-full flex items-center justify-center">${s.p >= 8 ? s.p.toFixed(1) + '%' : ''}</div>`)
        .join('');
    }

    // Chapter-by-Chapter Narratives & Recommendations
    const isAi = this.analysisData.source === 'GEMINI_AI';
    const isCustom = this.analysisData.source === 'CUSTOM_EDITED';
    document.getElementById('rep-ai-badge').textContent = isAi
      ? 'Analysis Engine: Gemini AI (Active)'
      : isCustom
      ? 'Analysis Engine: Manual Custom Narrative'
      : 'Analysis Engine: Smart Rule Engine';
    document.getElementById('rep-summary-source-tag').textContent = isAi
      ? 'Analisa Otomatis Gemini AI'
      : isCustom
      ? 'Narasi Disesuaikan Manual'
      : 'Analisa Otomatis Reliabilitas';
    document.getElementById('rep-summary-text').textContent = this.analysisData.summaryText;

    const elBab2 = document.getElementById('rep-bab2-text');
    const elBab3 = document.getElementById('rep-bab3-text');
    const elBab4 = document.getElementById('rep-bab4-text');
    if (elBab2) elBab2.textContent = this.analysisData.bab2Analysis || '';
    if (elBab3) elBab3.textContent = this.analysisData.bab3Analysis || '';
    if (elBab4) elBab4.textContent = this.analysisData.bab4Conclusion || '';

    const recList = document.getElementById('rep-recommendations-list');
    recList.innerHTML = (this.analysisData.recommendations || []).map((r) => `<li>${r}</li>`).join('');
    this.syncCustomNotes();

    // Render Report Charts
    this.renderReportCharts(target);

    // Monthly Detailed Time Distribution Table
    const tbodyTimeDetail = document.getElementById('rep-tbody-time-detail');
    if (!isWeekly && tbodyTimeDetail) {
      const timeRows = [
        { cat: 'Working Hours (WH)', hrs: ov.wh, p: pct(ov.wh), desc: 'Jam produktif unit beroperasi di lapangan' },
        { cat: 'Breakdown Unscheduled (USCH / ACD)', hrs: ov.bdUnsched, p: pct(ov.bdUnsched), desc: `Kerusakan mendadak (${ov.freqUnsched || 0} kejadian) - Faktor Plant` },
        { cat: 'Breakdown Scheduled (SCH / SVC)', hrs: ov.bdSched, p: pct(ov.bdSched), desc: 'Perawatan berkala & servis terjadwal - Faktor Plant' },
        { cat: 'Rain & Slippery', hrs: ov.rainHrs, p: pct(ov.rainHrs), desc: 'Berhenti operasi akibat cuaca hujan & jalan licin' },
        { cat: 'Standby Ready', hrs: ov.stbyHrs, p: pct(ov.stbyHrs), desc: 'Unit ready namun menunggu alokasi operasi / operator' }
      ];
      tbodyTimeDetail.innerHTML = timeRows.map((tr) => `
        <tr class="border-b border-slate-200">
          <td class="px-2.5 py-1.5 font-semibold text-slate-800">${tr.cat}</td>
          <td class="px-2.5 py-1.5 text-right font-bold">${tr.hrs.toFixed(1)} Jam</td>
          <td class="px-2.5 py-1.5 text-right">${tr.p.toFixed(1)}%</td>
          <td class="px-2.5 py-1.5 text-slate-600">${tr.desc}</td>
        </tr>`).join('') + `
        <tr class="bg-slate-900 text-white font-bold">
          <td class="px-2.5 py-1.5 uppercase">TOTAL CALENDAR HOURS</td>
          <td class="px-2.5 py-1.5 text-right">${totalCal.toFixed(1)} Jam</td>
          <td class="px-2.5 py-1.5 text-right">100.0%</td>
          <td class="px-2.5 py-1.5 font-normal text-slate-200">Akumulasi total kuota jam seluruh populasi unit On-Hired</td>
        </tr>`;
    }

    // Monthly Detailed Pareto Table
    const tbodyPareto = document.getElementById('rep-tbody-pareto-detail');
    if (!isWeekly && tbodyPareto) {
      const paretoList = this.kpiData.pareto || [];
      const totParetoHrs = paretoList.reduce((acc, p) => acc + p.totalHours, 0);
      let cumPct = 0;

      tbodyPareto.innerHTML = paretoList.length === 0
        ? `<tr><td colspan="5" class="px-3 py-3 text-center text-slate-400">Tidak ada catatan breakdown unscheduled pada periode ini.</td></tr>`
        : paretoList.slice(0, 10).map((p, i) => {
            const share = totParetoHrs > 0 ? (p.totalHours / totParetoHrs) * 100 : 0;
            cumPct = Math.min(100, cumPct + share);
            return `
              <tr class="border-b border-slate-200">
                <td class="px-2.5 py-1.5 font-bold">#${i + 1}</td>
                <td class="px-2.5 py-1.5 font-semibold text-slate-800">${p.component}</td>
                <td class="px-2.5 py-1.5 text-right font-bold text-rose-700">${p.totalHours.toFixed(2)} Jam</td>
                <td class="px-2.5 py-1.5 text-right">${share.toFixed(1)}%</td>
                <td class="px-2.5 py-1.5 text-right font-semibold">${cumPct.toFixed(1)}%</td>
              </tr>`;
          }).join('');
    }

    // 3.1 Active Breakdown Table
    const activeBds = this.kpiData.activeBreakdowns || [];
    document.getElementById('rep-active-bd-badge').textContent = `${activeBds.length} Unit Down`;
    document.getElementById('rep-tbody-active-bd').innerHTML = activeBds.length === 0
      ? `<tr><td colspan="7" class="px-3 py-3 text-center text-slate-400">Seluruh unit dalam status siap operasi (RFU).</td></tr>`
      : activeBds.map((b) => {
          const dur = DashboardModule.calculateDownDuration(b.startDate, b.timeIn);
          return `
            <tr class="border-b border-slate-200">
              <td class="px-2.5 py-1.5 font-bold text-rose-700">${b.unitId}</td>
              <td class="px-2.5 py-1.5">${b.model}</td>
              <td class="px-2.5 py-1.5">${b.startDate} (${b.timeIn})</td>
              <td class="px-2.5 py-1.5 font-bold ${dur.isCritical ? 'text-rose-700' : 'text-amber-700'}">${dur.text}</td>
              <td class="px-2.5 py-1.5 font-semibold">${b.code}</td>
              <td class="px-2.5 py-1.5">${b.location || '-'}</td>
              <td class="px-2.5 py-1.5">${b.problem || '-'}</td>
            </tr>`;
        }).join('');

    // 3.2 Model Summary Table + TOTAL / RATA-RATA Footer
    const byModel = this.kpiData.byModel || [];
    const tfootModel = document.getElementById('rep-tfoot-model');
    document.getElementById('rep-tbody-model').innerHTML = byModel.length === 0
      ? `<tr><td colspan="10" class="px-3 py-3 text-center text-slate-400">Belum ada data pada periode evaluasi.</td></tr>`
      : byModel.map((m) => `
          <tr class="border-b border-slate-200">
            <td class="px-2.5 py-1.5 font-bold text-slate-900">${m.model}</td>
            <td class="px-2.5 py-1.5 text-right">${m.wh.toFixed(1)}</td>
            <td class="px-2.5 py-1.5 text-right text-rose-700">${m.bdUnsched.toFixed(1)}</td>
            <td class="px-2.5 py-1.5 text-right text-amber-700">${m.bdSched.toFixed(1)}</td>
            <td class="px-2.5 py-1.5 text-right">${m.stbyHrs.toFixed(1)}</td>
            <td class="px-2.5 py-1.5 text-right font-bold ${m.pa >= target ? 'text-emerald-700' : 'text-rose-700'}">${m.pa.toFixed(2)}%</td>
            <td class="px-2.5 py-1.5 text-right font-bold ${m.ma >= target ? 'text-emerald-700' : 'text-rose-700'}">${m.ma.toFixed(2)}%</td>
            <td class="px-2.5 py-1.5 text-right font-bold ${m.ua >= target ? 'text-emerald-700' : 'text-rose-700'}">${m.ua.toFixed(2)}%</td>
            <td class="px-2.5 py-1.5 text-right">${m.mttr.toFixed(2)}j</td>
            <td class="px-2.5 py-1.5 text-right">${m.mtbr.toFixed(2)}j</td>
          </tr>`).join('');

    if (tfootModel) {
      tfootModel.innerHTML = byModel.length === 0 ? '' : `
        <tr>
          <td class="px-2.5 py-1.5 uppercase">TOTAL / RATA-RATA ARMADA</td>
          <td class="px-2.5 py-1.5 text-right">${ov.wh.toFixed(1)}</td>
          <td class="px-2.5 py-1.5 text-right">${ov.bdUnsched.toFixed(1)}</td>
          <td class="px-2.5 py-1.5 text-right">${ov.bdSched.toFixed(1)}</td>
          <td class="px-2.5 py-1.5 text-right">${ov.stbyHrs.toFixed(1)}</td>
          <td class="px-2.5 py-1.5 text-right">${ov.pa.toFixed(2)}%</td>
          <td class="px-2.5 py-1.5 text-right">${ov.ma.toFixed(2)}%</td>
          <td class="px-2.5 py-1.5 text-right">${ov.ua.toFixed(2)}%</td>
          <td class="px-2.5 py-1.5 text-right">${ov.mttr.toFixed(2)}j</td>
          <td class="px-2.5 py-1.5 text-right">${ov.mtbr.toFixed(2)}j</td>
        </tr>`;
    }

    // Monthly Daily Performance Log Table (Including MTBR + TOTAL / RATA-RATA Footer)
    const dailyBadge = document.getElementById('rep-daily-log-badge');
    const tbodyDailyLog = document.getElementById('rep-tbody-daily-log');
    const tfootDailyLog = document.getElementById('rep-tfoot-daily-log');
    if (!isWeekly && tbodyDailyLog) {
      const dailyRows = this.kpiData.trend || [];
      if (dailyBadge) dailyBadge.textContent = `${dailyRows.length} Hari Tercatat`;

      if (dailyRows.length === 0) {
        tbodyDailyLog.innerHTML = `<tr><td colspan="14" class="px-3 py-3 text-center text-slate-400">Belum ada log harian pada periode ini.</td></tr>`;
        if (tfootDailyLog) tfootDailyLog.innerHTML = '';
      } else {
        let sumCal = 0, sumWh = 0, sumUnsch = 0, sumSch = 0, sumRain = 0, sumStby = 0;
        tbodyDailyLog.innerHTML = dailyRows.map((d) => {
          sumCal += Number(d.calHrs) || 0;
          sumWh += Number(d.wh) || 0;
          sumUnsch += Number(d.bdUnsched) || 0;
          sumSch += Number(d.bdSched) || 0;
          sumRain += Number(d.rainHrs) || 0;
          sumStby += Number(d.stbyHrs) || 0;

          return `
            <tr class="border-b border-slate-200">
              <td class="px-2 py-1.5 font-bold text-slate-900">${d.date}</td>
              <td class="px-2 py-1.5 text-slate-600">${d.dayName || '-'}</td>
              <td class="px-2 py-1.5 text-right">${d.unitCount ?? '-'}</td>
              <td class="px-2 py-1.5 text-right">${d.calHrs !== undefined ? Number(d.calHrs).toFixed(1) : '-'}</td>
              <td class="px-2 py-1.5 text-right font-semibold">${d.wh !== undefined ? Number(d.wh).toFixed(1) : '-'}</td>
              <td class="px-2 py-1.5 text-right text-rose-700">${d.bdUnsched !== undefined ? Number(d.bdUnsched).toFixed(1) : '-'}</td>
              <td class="px-2 py-1.5 text-right text-amber-700">${d.bdSched !== undefined ? Number(d.bdSched).toFixed(1) : '-'}</td>
              <td class="px-2 py-1.5 text-right text-sky-700">${d.rainHrs !== undefined ? Number(d.rainHrs).toFixed(1) : '-'}</td>
              <td class="px-2 py-1.5 text-right">${d.stbyHrs !== undefined ? Number(d.stbyHrs).toFixed(1) : '-'}</td>
              <td class="px-2 py-1.5 text-right font-bold ${d.pa >= target ? 'text-emerald-700' : 'text-rose-700'}">${Number(d.pa).toFixed(2)}%</td>
              <td class="px-2 py-1.5 text-right font-bold ${d.ma >= target ? 'text-emerald-700' : 'text-rose-700'}">${Number(d.ma).toFixed(2)}%</td>
              <td class="px-2 py-1.5 text-right font-bold ${d.ua >= target ? 'text-emerald-700' : 'text-rose-700'}">${Number(d.ua).toFixed(2)}%</td>
              <td class="px-2 py-1.5 text-right">${d.mttr !== undefined ? Number(d.mttr).toFixed(2) + 'j' : '-'}</td>
              <td class="px-2 py-1.5 text-right">${d.mtbr !== undefined ? Number(d.mtbr).toFixed(2) + 'j' : '-'}</td>
            </tr>`;
        }).join('');

        if (tfootDailyLog) {
          tfootDailyLog.innerHTML = `
            <tr>
              <td colspan="3" class="px-2 py-1.5 uppercase">TOTAL / RATA-RATA PERIODE</td>
              <td class="px-2 py-1.5 text-right">${sumCal.toFixed(1)}</td>
              <td class="px-2 py-1.5 text-right">${sumWh.toFixed(1)}</td>
              <td class="px-2 py-1.5 text-right">${sumUnsch.toFixed(1)}</td>
              <td class="px-2 py-1.5 text-right">${sumSch.toFixed(1)}</td>
              <td class="px-2 py-1.5 text-right">${sumRain.toFixed(1)}</td>
              <td class="px-2 py-1.5 text-right">${sumStby.toFixed(1)}</td>
              <td class="px-2 py-1.5 text-right">${ov.pa.toFixed(2)}%</td>
              <td class="px-2 py-1.5 text-right">${ov.ma.toFixed(2)}%</td>
              <td class="px-2 py-1.5 text-right">${ov.ua.toFixed(2)}%</td>
              <td class="px-2 py-1.5 text-right">${ov.mttr.toFixed(2)}j</td>
              <td class="px-2 py-1.5 text-right">${ov.mtbr.toFixed(2)}j</td>
            </tr>`;
        }
      }
    }

    // 3.3 Unit Table (Weekly = Watchlist PA < 85%, Monthly = Full Fleet Audit Sorted High PA -> Low PA)
    const allUnits = [...(this.kpiData.byUnit || [])];
    const displayUnits = isWeekly
      ? allUnits.filter((u) => u.pa < target).sort((a, b) => a.pa - b.pa)
      : allUnits.sort((a, b) => b.pa - a.pa || a.unitId.localeCompare(b.unitId));

    document.getElementById('rep-unit-section-title').textContent = isWeekly
      ? '3.3 Watchlist Unit Prioritas (PA Di Bawah Target 85%)'
      : '3.3 Rincian Lengkap Performa Seluruh Unit (Audit Bulanan - Urut PA Tertinggi ke Terendah)';
    document.getElementById('rep-unit-section-badge').textContent = isWeekly
      ? `${displayUnits.length} Unit Perlu Perhatian`
      : `Total ${displayUnits.length} Unit Dievaluasi`;

    document.getElementById('rep-tbody-unit').innerHTML = displayUnits.length === 0
      ? `<tr><td colspan="12" class="px-3 py-3 text-center text-emerald-700 font-semibold">${isWeekly ? 'Seluruh unit mencapai target PA ≥ 85% pada minggu ini.' : 'Belum ada data unit.'}</td></tr>`
      : displayUnits.map((u) => {
          const isPass = u.pa >= target;
          return `
            <tr class="border-b border-slate-200 ${!isPass ? 'bg-rose-50/40' : ''}">
              <td class="px-2.5 py-1.5 font-bold text-slate-900">${u.unitId}</td>
              <td class="px-2.5 py-1.5">${u.model}</td>
              <td class="px-2.5 py-1.5 text-right">${u.wh.toFixed(1)}</td>
              <td class="px-2.5 py-1.5 text-right text-rose-700">${u.bdUnsched.toFixed(1)}</td>
              <td class="px-2.5 py-1.5 text-right text-amber-700">${u.bdSched.toFixed(1)}</td>
              <td class="px-2.5 py-1.5 text-right">${u.stbyHrs.toFixed(1)}</td>
              <td class="px-2.5 py-1.5 text-right font-bold ${isPass ? 'text-emerald-700' : 'text-rose-700'}">${u.pa.toFixed(2)}%</td>
              <td class="px-2.5 py-1.5 text-right font-bold ${u.ma >= target ? 'text-emerald-700' : 'text-rose-700'}">${u.ma.toFixed(2)}%</td>
              <td class="px-2.5 py-1.5 text-right font-bold ${u.ua >= target ? 'text-emerald-700' : 'text-rose-700'}">${u.ua.toFixed(2)}%</td>
              <td class="px-2.5 py-1.5 text-right">${u.mttr.toFixed(2)}j</td>
              <td class="px-2.5 py-1.5 text-right">${u.mtbr.toFixed(2)}j</td>
              <td class="px-2.5 py-1.5 text-center font-bold ${isPass ? 'text-emerald-700' : 'text-rose-700'}">${isPass ? 'TERCAPAI' : 'BELOW'}</td>
            </tr>`;
        }).join('');

    // 3.4 Catatan Mutasi Status Armada (Audit Log Transparansi Manajemen)
    const mutations = this.kpiData.rosterMutations || [];
    const mutBadge = document.getElementById('rep-mutation-badge');
    const mutBody = document.getElementById('tbody-rep-mutations');
    if (mutBadge) mutBadge.textContent = `${mutations.length} Mutasi`;
    if (mutBody) {
      mutBody.innerHTML = mutations.length === 0
        ? `<tr><td colspan="5" class="px-3 py-3 text-center text-slate-400">Tidak ada perubahan mutasi status armada (On-Hired &harr; Off-Hired) selama periode laporan ini.</td></tr>`
        : mutations.map((m) => `
            <tr class="border-b border-slate-200">
              <td class="px-2.5 py-1.5 font-mono text-[10px] whitespace-nowrap">${m.timestamp}</td>
              <td class="px-2.5 py-1.5 font-bold text-slate-900">${m.unitId}</td>
              <td class="px-2.5 py-1.5 font-semibold text-amber-800">${m.actionType}</td>
              <td class="px-2.5 py-1.5">${m.username}</td>
              <td class="px-2.5 py-1.5">${m.detail}</td>
            </tr>`).join('');
    }
  },

  /**
   * Renders Daily Trend & Component Pareto Charts synchronously (animation: false + white background)
   * so they always appear in both the web preview and the exported PDF.
   */
  renderReportCharts(target) {
    if (!this.kpiData || typeof Chart === 'undefined') return;

    const whiteBgPlugin = {
      id: 'reportWhiteBg',
      beforeDraw: (chart) => {
        const { ctx } = chart;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
      }
    };

    const trendCanvas = document.getElementById('rep-chart-trend');
    if (trendCanvas) {
      if (this.trendChart) this.trendChart.destroy();
      const trendList = this.kpiData.trend || [];
      this.trendChart = new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: trendList.map((t) => String(t.date || '').slice(5)),
          datasets: [
            {
              label: 'PA (%)',
              data: trendList.map((t) => t.pa),
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              tension: 0.25,
              borderWidth: 2,
              pointRadius: 2.5
            },
            {
              label: 'MA (%)',
              data: trendList.map((t) => t.ma),
              borderColor: '#059669',
              backgroundColor: 'rgba(5, 150, 105, 0.08)',
              tension: 0.25,
              borderWidth: 2,
              pointRadius: 2.5
            },
            {
              label: 'UA (%)',
              data: trendList.map((t) => t.ua),
              borderColor: '#d97706',
              backgroundColor: 'rgba(217, 119, 6, 0.08)',
              tension: 0.25,
              borderWidth: 2,
              pointRadius: 2.5
            },
            {
              label: `Target (${target}%)`,
              data: trendList.map(() => target),
              borderColor: '#e11d48',
              borderDash: [5, 5],
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } }
          },
          scales: {
            y: { min: 0, max: 100, ticks: { font: { size: 9 }, callback: (v) => v + '%' } },
            x: { ticks: { font: { size: 9 } } }
          }
        },
        plugins: [whiteBgPlugin]
      });
    }

    const paretoCanvas = document.getElementById('rep-chart-pareto');
    if (paretoCanvas) {
      if (this.paretoChart) this.paretoChart.destroy();
      const limit = this.reportType === 'WEEKLY' ? 5 : 10;
      const topItems = (this.kpiData.pareto || []).slice(0, limit);
      this.paretoChart = new Chart(paretoCanvas, {
        type: 'bar',
        data: {
          labels: topItems.map((p) => p.component),
          datasets: [
            {
              label: 'BD Unscheduled (Jam)',
              data: topItems.map((p) => p.totalHours),
              backgroundColor: '#e11d48',
              borderRadius: 4
            }
          ]
        },
        options: {
          animation: false,
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { font: { size: 9 } } },
            y: { ticks: { font: { size: 9 } } }
          }
        },
        plugins: [whiteBgPlugin]
      });
    }
  },

  /**
   * Loads logo-ktc.png into a lightweight scaled Base64 PNG for compact PDF file size
   */
  loadLogoDataUrl(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const natW = img.naturalWidth || 120;
          const natH = img.naturalHeight || 120;
          const maxH = 96;
          const scale = Math.min(1, maxH / natH);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(natW * scale);
          canvas.height = Math.round(natH * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve({
            dataUrl: canvas.toDataURL('image/png'),
            ratio: canvas.width / canvas.height
          });
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  },

  /**
   * Direct A4 Landscape Formal Paper PDF Generator (jsPDF + AutoTable)
   * - Weekly Mode: Concise 2-page Tactical Operational Report
   * - Monthly Mode: Comprehensive Multi-page Management Audit Report with Plain-Language AI Guides
   */
  async downloadPdf() {
    if (!this.kpiData || !this.loadedMeta) {
      showToast('Please click "Load Report Data" first before downloading the PDF.', 'warning');
      return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('PDF generator library is still loading. Please try again.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-download-pdf');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Building A4 Landscape PDF...';
    }

    try {
      const target = this.kpiData.target || APP_CONFIG.KPI_TARGET;
      this.renderReportCharts(target);

      const logoAsset = await this.loadLogoDataUrl('logo-ktc.png');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      const pageW = doc.internal.pageSize.getWidth();   // 297 mm
      const pageH = doc.internal.pageSize.getHeight();  // 210 mm
      const margin = 12;
      const contentW = pageW - margin * 2;
      const safeBottom = pageH - 13;

      const sanitizePdfText = (str) => String(str || '').replace(/[\u2014\u2013]/g, '-');
      const ensureSpace = (neededMm) => {
        if (curY + neededMm > safeBottom) {
          doc.addPage();
          curY = 15;
        }
      };
      const drawNarrativeCallout = (title, bodyText, fillRgb, strokeRgb, titleRgb) => {
        const cleanBody = sanitizePdfText(bodyText || '-');
        const lines = doc.splitTextToSize(cleanBody, contentW - 6);
        const boxH = lines.length * 3.8 + 7.5;
        ensureSpace(boxH + 3);
        doc.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2]);
        doc.setDrawColor(strokeRgb[0], strokeRgb[1], strokeRgb[2]);
        doc.roundedRect(margin, curY, contentW, boxH, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(titleRgb[0], titleRgb[1], titleRgb[2]);
        doc.text(sanitizePdfText(title), margin + 3, curY + 4.3);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.6);
        doc.setTextColor(30, 41, 59);
        doc.text(lines, margin + 3, curY + 8.3);
        curY += boxH + 4;
      };

      const session = getUserSession();
      const startDate = this.loadedMeta.startDate || '-';
      const endDate = this.loadedMeta.endDate || '-';
      const model = this.loadedMeta.model || 'ALL';
      const isWeekly = this.loadedMeta.reportType === 'WEEKLY';
      const ov = this.kpiData.overall;

      // --- OFFICIAL HEADER BANNER ---
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, 10, contentW, 20, 'F');

      let headerTextX = margin + 4;
      if (logoAsset && logoAsset.dataUrl) {
        const logoH = 14;
        const logoW = Math.min(26, logoH * (logoAsset.ratio || 1));
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin + 3, 13, logoW + 2, logoH, 1.2, 1.2, 'F');
        doc.addImage(logoAsset.dataUrl, 'PNG', margin + 4, 13.8, logoW, logoH - 1.6, undefined, 'FAST');
        headerTextX = margin + logoW + 8;
      }

      doc.setTextColor(96, 165, 250);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('PT. KTC COAL MINING & ENERGY  |  PLANT & WORKSHOP RELIABILITY DIVISION', headerTextX, 16);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12.5);
      doc.text(
        isWeekly
          ? 'LAPORAN MINGGUAN OPERASIONAL & KESIAPAN ARMADA'
          : 'LAPORAN BULANAN EKSEKUTIF PERFORMA & RELIABILITAS ARMADA',
        headerTextX,
        22.5
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      doc.text(
        `Site: ${this.kpiData.site}  |  Model: ${model === 'ALL' ? 'Semua Model' : model}  |  Periode: ${startDate} s/d ${endDate}  |  Penyusun: ${session?.fullName || session?.username || 'Planner'}`,
        headerTextX,
        27.5
      );

      let curY = 35;

      // --- BAB I. RINGKASAN EKSEKUTIF & PENCAPAIAN KPI ---
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('BAB I. RINGKASAN EKSEKUTIF & PENCAPAIAN KPI ARMADA', margin, curY);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.4);
      doc.line(margin, curY + 1.5, margin + contentW, curY + 1.5);
      curY += 4.5;

      // Monthly Only: Plain-Language KPI Glossary Box for Non-Technical Readers
      if (!isWeekly) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(margin, curY, contentW, 13.5, 1.2, 1.2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        doc.text('PANDUAN MEMBACA INDIKATOR KPI ARMADA:', margin + 2.5, curY + 3.8);

        const guideItems = [
          { k: 'PA (Physical Availability):', d: 'Kesiapan fisik unit tidak rusak.' },
          { k: 'MA (Mechanical Availability):', d: 'Ketangguhan mekanis saat operasi.' },
          { k: 'UA (Use of Availability):', d: 'Optimalisasi unit siap pakai.' },
          { k: 'MTTR (Avg Repair Time):', d: 'Rata-rata jam perbaikan mekanik.' },
          { k: 'MTBR (Avg Between BD):', d: 'Ketahanan jam antar kerusakan.' }
        ];
        const gColW = (contentW - 5) / 5;
        guideItems.forEach((gi, idx) => {
          const gx = margin + 2.5 + idx * gColW;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(30, 64, 175);
          doc.text(gi.k, gx, curY + 7.8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(gi.d, gx, curY + 11.2);
        });
        curY += 16;
      }

      // 5 KPI Cards Row
      const cardW = (contentW - 12) / 5;
      const kpiCards = [
        { title: 'PHYSICAL AVAILABILITY (PA)', val: `${ov.pa.toFixed(2)}%`, sub: `Target >= ${target}% (${ov.pa >= target ? 'TERCAPAI' : 'BELOW'})`, ok: ov.pa >= target },
        { title: 'MECHANICAL AVAILABILITY (MA)', val: `${ov.ma.toFixed(2)}%`, sub: `Target >= ${target}% (${ov.ma >= target ? 'TERCAPAI' : 'BELOW'})`, ok: ov.ma >= target },
        { title: 'USE OF AVAILABILITY (UA)', val: `${ov.ua.toFixed(2)}%`, sub: `Target >= ${target}% (${ov.ua >= target ? 'TERCAPAI' : 'BELOW'})`, ok: ov.ua >= target },
        { title: 'MTTR (AVG REPAIR TIME)', val: `${ov.mttr.toFixed(2)} Jam`, sub: `Target <= ${APP_CONFIG.MTTR_TARGET} Jam`, ok: ov.mttr <= APP_CONFIG.MTTR_TARGET },
        { title: 'MTBR (AVG BETWEEN BD)', val: `${ov.mtbr.toFixed(2)} Jam`, sub: `Target >= ${APP_CONFIG.MTBR_TARGET} Jam`, ok: ov.mtbr >= APP_CONFIG.MTBR_TARGET }
      ];

      kpiCards.forEach((c, idx) => {
        const cx = margin + idx * (cardW + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(cx, curY, cardW, 17, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.7);
        doc.setTextColor(100, 116, 139);
        doc.text(c.title, cx + 2.5, curY + 4.3);

        doc.setFontSize(11.5);
        doc.setTextColor(15, 23, 42);
        doc.text(c.val, cx + 2.5, curY + 10.6);

        doc.setFontSize(6.7);
        doc.setTextColor(c.ok ? 4 : 190, c.ok ? 120 : 18, c.ok ? 87 : 60);
        doc.text(c.sub, cx + 2.5, curY + 15);
      });
      curY += 20.5;

      // 1.1 Time Distribution Bar + 5-Column Equal Legend (Never Wraps)
      const totalCal = Math.round((ov.wh + ov.bdUnsched + ov.bdSched + ov.rainHrs + ov.stbyHrs) * 10) / 10;
      const pct = (v) => (totalCal > 0 ? (v / totalCal) * 100 : 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.3);
      doc.setTextColor(30, 41, 59);
      doc.text(`1.1 Distribusi Alokasi Waktu Armada (Total Calendar: ${totalCal.toFixed(1)} Jam / 100%)`, margin, curY);
      curY += 2.2;

      const timeSegs = [
        { label: `WH: ${ov.wh.toFixed(1)}j (${pct(ov.wh).toFixed(1)}%)`, p: pct(ov.wh), rgb: [16, 185, 129] },
        { label: `BD Unsch: ${ov.bdUnsched.toFixed(1)}j (${pct(ov.bdUnsched).toFixed(1)}%)`, p: pct(ov.bdUnsched), rgb: [244, 63, 94] },
        { label: `BD Sch: ${ov.bdSched.toFixed(1)}j (${pct(ov.bdSched).toFixed(1)}%)`, p: pct(ov.bdSched), rgb: [251, 191, 36] },
        { label: `Rain: ${ov.rainHrs.toFixed(1)}j (${pct(ov.rainHrs).toFixed(1)}%)`, p: pct(ov.rainHrs), rgb: [14, 165, 233] },
        { label: `Standby: ${ov.stbyHrs.toFixed(1)}j (${pct(ov.stbyHrs).toFixed(1)}%)`, p: pct(ov.stbyHrs), rgb: [148, 163, 184] }
      ];

      let barX = margin;
      timeSegs.forEach((s) => {
        const w = (s.p / 100) * contentW;
        if (w > 0.3) {
          doc.setFillColor(s.rgb[0], s.rgb[1], s.rgb[2]);
          doc.rect(barX, curY, w, 5, 'F');
          if (s.p >= 9) {
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6.6);
            doc.text(`${s.p.toFixed(1)}%`, barX + w / 2, curY + 3.5, { align: 'center' });
          }
          barX += w;
        }
      });
      curY += 7.5;

      const legColW = contentW / 5;
      timeSegs.forEach((s, idx) => {
        const lx = margin + idx * legColW;
        doc.setFillColor(s.rgb[0], s.rgb[1], s.rgb[2]);
        doc.rect(lx, curY - 2.3, 2.5, 2.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.1);
        doc.setTextColor(51, 65, 85);
        doc.text(s.label, lx + 3.8, curY);
      });
      curY += 4.5;

      // Monthly Only: Detailed Calendar Time Allocation Table on Page 1
      if (!isWeekly) {
        doc.autoTable({
          startY: curY,
          margin: { left: margin, right: margin },
          head: [['Kategori Alokasi Waktu Kalender', 'Total Jam Aktual', 'Proporsi (%)', 'Keterangan Faktor Operasional / Teknis']],
          body: [
            ['Working Hours (WH)', `${ov.wh.toFixed(1)} Jam`, `${pct(ov.wh).toFixed(1)}%`, 'Jam produktif unit beroperasi di lapangan'],
            ['Breakdown Unscheduled (USCH / ACD)', `${ov.bdUnsched.toFixed(1)} Jam`, `${pct(ov.bdUnsched).toFixed(1)}%`, `Kerusakan mendadak (${ov.freqUnsched || 0} kejadian) - Faktor Plant`],
            ['Breakdown Scheduled (SCH / SVC)', `${ov.bdSched.toFixed(1)} Jam`, `${pct(ov.bdSched).toFixed(1)}%`, 'Perawatan berkala & servis terjadwal - Faktor Plant'],
            ['Rain & Slippery', `${ov.rainHrs.toFixed(1)} Jam`, `${pct(ov.rainHrs).toFixed(1)}%`, 'Berhenti operasi akibat cuaca hujan & jalan licin'],
            ['Standby Ready', `${ov.stbyHrs.toFixed(1)} Jam`, `${pct(ov.stbyHrs).toFixed(1)}%`, 'Unit ready namun menunggu alokasi operasi / operator']
          ],
          foot: [['TOTAL CALENDAR HOURS', `${totalCal.toFixed(1)} Jam`, '100.0%', 'Akumulasi total kuota jam seluruh populasi unit On-Hired']],
          theme: 'grid',
          styles: { fontSize: 7.1, cellPadding: 1.4 },
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            1: { halign: 'right', cellWidth: 34 },
            2: { halign: 'right', cellWidth: 26 }
          }
        });
        curY = doc.lastAutoTable.finalY + 4;
      }

      // 1.2 Executive Summary Narrative Box
      const engineTag = this.analysisData.source === 'GEMINI_AI'
        ? '[Analisa Gemini AI]'
        : this.analysisData.source === 'CUSTOM_EDITED'
        ? '[Narasi Manajemen]'
        : '[Analisa Otomatis Reliabilitas]';
      drawNarrativeCallout(
        `1.2 Ulasan Eksekutif (Executive Summary) ${engineTag}`,
        this.analysisData.summaryText,
        [239, 246, 255],
        [147, 197, 253],
        [30, 58, 138]
      );

      // --- BAB II. ANALISIS TREN & PARETO KOMPONEN ---
      if (!isWeekly || curY > 132) {
        doc.addPage();
        curY = 15;
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('BAB II. ANALISIS TREN PERFORMA & PARETO KERUSAKAN KOMPONEN', margin, curY);
      doc.line(margin, curY + 1.5, margin + contentW, curY + 1.5);
      curY += 4.5;

      const trendCanvas = document.getElementById('rep-chart-trend');
      const paretoCanvas = document.getElementById('rep-chart-pareto');
      if (trendCanvas && paretoCanvas) {
        const trendImg = trendCanvas.toDataURL('image/jpeg', 0.85);
        const paretoImg = paretoCanvas.toDataURL('image/jpeg', 0.85);
        const leftW = contentW * 0.62;
        const rightW = contentW * 0.36;
        const chartH = isWeekly ? 42 : 48;

        doc.setFontSize(7.8);
        doc.text('Gambar 2.1 Tren Harian PA, MA & UA (%) vs Target 85%', margin, curY + 2);
        doc.text(
          isWeekly ? 'Gambar 2.2 Top 5 Komponen Breakdown (Jam)' : 'Gambar 2.2 Top 10 Komponen Breakdown Pareto (Jam)',
          margin + leftW + 5,
          curY + 2
        );

        doc.addImage(trendImg, 'JPEG', margin, curY + 3.5, leftW, chartH, undefined, 'FAST');
        doc.addImage(paretoImg, 'JPEG', margin + leftW + 5, curY + 3.5, rightW, chartH, undefined, 'FAST');
        curY += chartH + 6.5;
      }

      // Monthly Detailed Pareto Table + Plain-Language AI Explanation for BAB II
      if (!isWeekly) {
        if ((this.kpiData.pareto || []).length > 0) {
          const paretoList = this.kpiData.pareto.slice(0, 10);
          const totPareto = paretoList.reduce((a, b) => a + b.totalHours, 0);
          let cum = 0;
          const pRows = paretoList.map((p, idx) => {
            const share = totPareto > 0 ? (p.totalHours / totPareto) * 100 : 0;
            cum = Math.min(100, cum + share);
            return [`#${idx + 1}`, sanitizePdfText(p.component), `${p.totalHours.toFixed(2)} Jam`, `${share.toFixed(1)}%`, `${cum.toFixed(1)}%`];
          });

          doc.autoTable({
            startY: curY,
            margin: { left: margin, right: margin },
            head: [['Rank', 'Kelompok Komponen', 'Total Jam BD Unscheduled', 'Kontribusi (%)', 'Kumulatif (%)']],
            body: pRows,
            theme: 'grid',
            styles: { fontSize: 7.3, cellPadding: 1.5 },
            headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
              0: { halign: 'center', cellWidth: 16 },
              2: { halign: 'right', cellWidth: 45 },
              3: { halign: 'right', cellWidth: 32 },
              4: { halign: 'right', cellWidth: 32 }
            }
          });
          curY = doc.lastAutoTable.finalY + 4;
        }

        drawNarrativeCallout(
          '2.2 Interpretasi Tren Harian & Analisis Pareto (Hukum 80/20)',
          this.analysisData.bab2Analysis,
          [238, 242, 255],
          [165, 180, 252],
          [49, 46, 129]
        );
      }

      // --- BAB III. EVALUASI PERFORMA ARMADA & STATUS BREAKDOWN ---
      doc.addPage();
      curY = 15;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('BAB III. EVALUASI PERFORMA ARMADA & STATUS BREAKDOWN AKTIF', margin, curY);
      doc.line(margin, curY + 1.5, margin + contentW, curY + 1.5);
      curY += 4.5;

      // Monthly Only: Plain-Language AI Explanation for BAB III
      if (!isWeekly) {
        drawNarrativeCallout(
          '3.0 Ringkasan Evaluasi Perbandingan Model, Unit Prioritas & Stabilitas Populasi',
          this.analysisData.bab3Analysis,
          [236, 253, 245],
          [110, 231, 183],
          [6, 95, 70]
        );
      }

      // 3.1 Active Breakdown Table
      ensureSpace(26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(159, 18, 57);
      doc.text(`3.1 Status Unit Masih Breakdown / Belum RFU (${(this.kpiData.activeBreakdowns || []).length} Unit Down)`, margin, curY);
      curY += 2;

      const activeRows = (this.kpiData.activeBreakdowns || []).map((b) => {
        const dur = DashboardModule.calculateDownDuration(b.startDate, b.timeIn);
        return [b.unitId, b.model, `${b.startDate} (${b.timeIn})`, dur.text, b.code, sanitizePdfText(b.location || '-'), sanitizePdfText(b.problem || '-')];
      });

      doc.autoTable({
        startY: curY,
        margin: { left: margin, right: margin },
        head: [['Unit ID', 'Model', 'Waktu Masuk BD', 'Durasi Down', 'Code', 'Lokasi', 'Keterangan Kerusakan (Problem)']],
        body: activeRows.length > 0 ? activeRows : [['-', '-', '-', '-', '-', '-', 'Seluruh unit dalam status siap operasi (RFU).']],
        theme: 'grid',
        styles: { fontSize: 7.2, cellPadding: 1.6 },
        headStyles: { fillColor: [159, 18, 57], textColor: 255, fontStyle: 'bold' }
      });
      curY = doc.lastAutoTable.finalY + 5;

      // 3.2 Model Summary Table + TOTAL / RATA-RATA Footer + Status Color Highlighting
      ensureSpace(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('3.2 Rekapitulasi Performa Per Model Armada', margin, curY);
      curY += 2;

      const modelRows = (this.kpiData.byModel || []).map((m) => [
        m.model,
        m.wh.toFixed(1),
        m.bdUnsched.toFixed(1),
        m.bdSched.toFixed(1),
        m.stbyHrs.toFixed(1),
        `${m.pa.toFixed(2)}%`,
        `${m.ma.toFixed(2)}%`,
        `${m.ua.toFixed(2)}%`,
        `${m.mttr.toFixed(2)}j`,
        `${m.mtbr.toFixed(2)}j`
      ]);

      doc.autoTable({
        startY: curY,
        margin: { left: margin, right: margin },
        head: [['Model Unit', 'WH (Jam)', 'BD Unsch', 'BD Sch', 'Standby', 'PA (%)', 'MA (%)', 'UA (%)', 'MTTR', 'MTBR']],
        body: modelRows.length > 0 ? modelRows : [['-', '0', '0', '0', '0', '0%', '0%', '0%', '0j', '0j']],
        foot: modelRows.length > 0 ? [[
          'TOTAL / RATA-RATA',
          ov.wh.toFixed(1),
          ov.bdUnsched.toFixed(1),
          ov.bdSched.toFixed(1),
          ov.stbyHrs.toFixed(1),
          `${ov.pa.toFixed(2)}%`,
          `${ov.ma.toFixed(2)}%`,
          `${ov.ua.toFixed(2)}%`,
          `${ov.mttr.toFixed(2)}j`,
          `${ov.mtbr.toFixed(2)}j`
        ]] : undefined,
        theme: 'grid',
        styles: { fontSize: 7.3, cellPadding: 1.6 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' }, 6: { halign: 'right', fontStyle: 'bold' },
          7: { halign: 'right', fontStyle: 'bold' }, 8: { halign: 'right' }, 9: { halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && [5, 6, 7].includes(data.column.index)) {
            const num = parseFloat(String(data.cell.raw || '0'));
            if (!isNaN(num)) {
              data.cell.styles.textColor = num >= target ? [4, 120, 87] : [190, 18, 60];
            }
          }
        }
      });
      curY = doc.lastAutoTable.finalY + 5;

      // 3.3 Unit Table (Weekly = Watchlist PA < 85%, Monthly = Full Fleet Audit Sorted High PA -> Low PA)
      ensureSpace(28);
      const allUnits = [...(this.kpiData.byUnit || [])];
      const unitList = isWeekly
        ? allUnits.filter((u) => u.pa < target).sort((a, b) => a.pa - b.pa)
        : allUnits.sort((a, b) => b.pa - a.pa || a.unitId.localeCompare(b.unitId));

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        isWeekly
          ? `3.3 Watchlist Unit Prioritas (PA < ${target}%): ${unitList.length} Unit`
          : `3.3 Rincian Lengkap Performa Seluruh Unit (Audit Bulanan - Urut PA Tertinggi ke Terendah): ${unitList.length} Unit`,
        margin,
        curY
      );
      curY += 2;

      const unitRows = unitList.map((u) => [
        u.unitId,
        u.model,
        u.wh.toFixed(1),
        u.bdUnsched.toFixed(1),
        u.bdSched.toFixed(1),
        u.stbyHrs.toFixed(1),
        `${u.pa.toFixed(2)}%`,
        `${u.ma.toFixed(2)}%`,
        `${u.ua.toFixed(2)}%`,
        `${u.mttr.toFixed(2)}j`,
        `${u.mtbr.toFixed(2)}j`,
        u.pa >= target ? 'TERCAPAI' : 'BELOW'
      ]);

      doc.autoTable({
        startY: curY,
        margin: { left: margin, right: margin },
        head: [['Unit ID', 'Model', 'WH (Jam)', 'BD Unsch', 'BD Sch', 'Standby', 'PA (%)', 'MA (%)', 'UA (%)', 'MTTR', 'MTBR', 'Status']],
        body: unitRows.length > 0 ? unitRows : [['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', isWeekly ? 'SEMUA UNIT TERCAPAI' : 'NIHIL']],
        theme: 'grid',
        styles: { fontSize: 7.1, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
          6: { halign: 'right', fontStyle: 'bold' }, 7: { halign: 'right' }, 8: { halign: 'right' },
          9: { halign: 'right' }, 10: { halign: 'right' }, 11: { halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if ([6, 7, 8].includes(data.column.index)) {
              const num = parseFloat(String(data.cell.raw || '0'));
              if (!isNaN(num)) {
                data.cell.styles.textColor = num >= target ? [4, 120, 87] : [190, 18, 60];
              }
            }
            if (data.column.index === 11) {
              const st = String(data.cell.raw || '');
              if (st === 'BELOW') {
                data.cell.styles.textColor = [190, 18, 60];
                data.cell.styles.fillColor = [255, 241, 242];
              } else if (st === 'TERCAPAI' || st === 'SEMUA UNIT TERCAPAI') {
                data.cell.styles.textColor = [4, 120, 87];
              }
            }
          }
        }
      });
      curY = doc.lastAutoTable.finalY + 5;

      // Monthly Only: 3.4 Daily Fleet Performance Log (With MTBR Column + TOTAL / RATA-RATA Footer)
      if (!isWeekly && (this.kpiData.trend || []).length > 0) {
        ensureSpace(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`3.4 Log Performa Harian Armada (${this.kpiData.trend.length} Hari Evaluasi)`, margin, curY);
        curY += 2;

        let sumCal = 0, sumWh = 0, sumUnsch = 0, sumSch = 0, sumRain = 0, sumStby = 0;
        const dailyLogRows = this.kpiData.trend.map((d) => {
          sumCal += Number(d.calHrs) || 0;
          sumWh += Number(d.wh) || 0;
          sumUnsch += Number(d.bdUnsched) || 0;
          sumSch += Number(d.bdSched) || 0;
          sumRain += Number(d.rainHrs) || 0;
          sumStby += Number(d.stbyHrs) || 0;

          return [
            d.date,
            d.dayName || '-',
            d.unitCount !== undefined ? String(d.unitCount) : '-',
            d.calHrs !== undefined ? Number(d.calHrs).toFixed(1) : '-',
            d.wh !== undefined ? Number(d.wh).toFixed(1) : '-',
            d.bdUnsched !== undefined ? Number(d.bdUnsched).toFixed(1) : '-',
            d.bdSched !== undefined ? Number(d.bdSched).toFixed(1) : '-',
            d.rainHrs !== undefined ? Number(d.rainHrs).toFixed(1) : '-',
            d.stbyHrs !== undefined ? Number(d.stbyHrs).toFixed(1) : '-',
            `${Number(d.pa).toFixed(2)}%`,
            `${Number(d.ma).toFixed(2)}%`,
            `${Number(d.ua).toFixed(2)}%`,
            d.mttr !== undefined ? `${Number(d.mttr).toFixed(2)}j` : '-',
            d.mtbr !== undefined ? `${Number(d.mtbr).toFixed(2)}j` : '-'
          ];
        });

        doc.autoTable({
          startY: curY,
          margin: { left: margin, right: margin },
          head: [['Tanggal', 'Hari', 'Unit', 'Cal Hrs', 'WH', 'BD Unsch', 'BD Sch', 'Rain', 'Standby', 'PA (%)', 'MA (%)', 'UA (%)', 'MTTR', 'MTBR']],
          body: dailyLogRows,
          foot: [[
            'TOTAL / AVG',
            '-',
            '-',
            sumCal.toFixed(1),
            sumWh.toFixed(1),
            sumUnsch.toFixed(1),
            sumSch.toFixed(1),
            sumRain.toFixed(1),
            sumStby.toFixed(1),
            `${ov.pa.toFixed(2)}%`,
            `${ov.ma.toFixed(2)}%`,
            `${ov.ua.toFixed(2)}%`,
            `${ov.mttr.toFixed(2)}j`,
            `${ov.mtbr.toFixed(2)}j`
          ]],
          theme: 'grid',
          styles: { fontSize: 6.7, cellPadding: 1.3 },
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
            6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' },
            9: { halign: 'right', fontStyle: 'bold' }, 10: { halign: 'right' }, 11: { halign: 'right' },
            12: { halign: 'right' }, 13: { halign: 'right' }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && [9, 10, 11].includes(data.column.index)) {
              const num = parseFloat(String(data.cell.raw || '0'));
              if (!isNaN(num)) {
                data.cell.styles.textColor = num >= target ? [4, 120, 87] : [190, 18, 60];
              }
            }
          }
        });
        curY = doc.lastAutoTable.finalY + 5;
      }

      // Monthly Only: 3.5 Fleet Roster Mutation Audit Table in PDF (With Page-Break Guard)
      if (!isWeekly) {
        ensureSpace(28);
        const mutations = this.kpiData.rosterMutations || [];
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(146, 64, 14);
        doc.text(`3.5 Catatan Mutasi Status Armada / On-Hired <-> Off-Hired Audit Log (${mutations.length} Mutasi)`, margin, curY);
        curY += 2;

        const mutRows = mutations.map((m) => [m.timestamp, m.unitId, m.actionType, m.username, sanitizePdfText(m.detail)]);
        doc.autoTable({
          startY: curY,
          margin: { left: margin, right: margin },
          head: [['Waktu', 'Unit ID', 'Jenis Mutasi', 'Oleh', 'Keterangan Teknis & Unit Pengganti']],
          body: mutRows.length > 0 ? mutRows : [['-', '-', '-', '-', 'Tidak ada perubahan mutasi status armada selama periode laporan ini.']],
          theme: 'grid',
          styles: { fontSize: 7.2, cellPadding: 1.6 },
          headStyles: { fillColor: [146, 64, 14], textColor: 255, fontStyle: 'bold' }
        });
        curY = doc.lastAutoTable.finalY + 6;
      }

      // --- BAB IV. REKOMENDASI & LEMBAR PENGESAHAN ---
      ensureSpace(72);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('BAB IV. KESIMPULAN, REKOMENDASI TINDAK LANJUT & PENGESAHAN', margin, curY);
      doc.line(margin, curY + 1.5, margin + contentW, curY + 1.5);
      curY += 4.5;

      if (!isWeekly) {
        drawNarrativeCallout(
          '4.1 Kesimpulan Evaluasi Bulanan Manajemen',
          this.analysisData.bab4Conclusion,
          [241, 245, 249],
          [148, 163, 184],
          [15, 23, 42]
        );
      }

      ensureSpace(58);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      doc.text(isWeekly ? '4.1 Rencana Tindak Lanjut Teknis (Action Plan):' : '4.2 Rencana Tindak Lanjut Teknis (Action Plan):', margin, curY);
      curY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      (this.analysisData.recommendations || []).forEach((rec, i) => {
        const wrapped = doc.splitTextToSize(sanitizePdfText(`${i + 1}. ${rec}`), contentW - 4);
        doc.text(wrapped, margin + 2, curY);
        curY += wrapped.length * 3.8 + 1;
      });

      const customNotes = String(document.getElementById('rep-custom-notes')?.value || '').trim();
      if (customNotes) {
        curY += 1.5;
        doc.setFont('helvetica', 'bold');
        const noteWrapped = doc.splitTextToSize(sanitizePdfText(`Catatan Lapangan Khusus: ${customNotes}`), contentW - 4);
        doc.text(noteWrapped, margin + 2, curY);
        doc.setFont('helvetica', 'normal');
        curY += noteWrapped.length * 3.8 + 2;
      }

      // 3 Signature Columns (With Page-Break Guard)
      ensureSpace(34);
      curY = Math.max(curY + 5, pageH - 43);
      const colW = contentW / 3;
      const signCols = [
        { top: 'Dibuat Oleh (Prepared by),', role: 'Planner / Admin Plant', dept: 'Plant Department' },
        { top: 'Diperiksa Oleh (Checked by),', role: 'Chief Mechanic', dept: 'Workshop & Field Maintenance' },
        { top: 'Diperiksa Oleh (Checked by),', role: 'Maintenance Planner Spv', dept: 'Plant Reliability & Planning' }
      ];

      signCols.forEach((sc, idx) => {
        const centerX = margin + colW * idx + colW / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(sc.top, centerX, curY, { align: 'center' });

        doc.setDrawColor(30, 41, 59);
        doc.line(centerX - 28, curY + 17, centerX + 28, curY + 17);
        doc.text(sc.role, centerX, curY + 21, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(sc.dept, centerX, curY + 24.5, { align: 'center' });
      });

      // Official Workshop System Footer & Page Numbering across ALL pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(203, 213, 225);
        doc.line(margin, pageH - 9, margin + contentW, pageH - 9);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          'Generated by Machine Performance System (MPS) - Digital Fleet Reliability & KPI Intelligence developed at PT. KTC Coal Mining & Energy Workshop by Adi Pranata.',
          margin,
          pageH - 5
        );
        doc.text(`Halaman ${p} dari ${totalPages}`, margin + contentW, pageH - 5, { align: 'right' });
      }

      const prefix = isWeekly ? 'MPS_Weekly_Operational_Report' : 'MPS_Monthly_Management_Report';
      doc.save(`${prefix}_${this.kpiData.site}_${startDate}_to_${endDate}.pdf`);
      showToast('Executive PDF Report (A4 Landscape) downloaded!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PDF report: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg><span>Download PDF Report (A4 Landscape)</span>`;
      }
    }
  }
};

/* ============================================================================
 * 8. LIVE UI DEMO DATASET (USED ONLY WHEN CLICKING "LIVE UI DEMO")
 * ============================================================================ */
function getDemoApiResponse(action, payload, session) {
  const site = String(payload.site || session.siteAccess || 'TTLP').toUpperCase();
  const demoUnits = [
    { unitId: 'EX-1320', category: 'Excavator', equipment: 'Heavy Excavator', brand: 'Hitachi', model: 'ZX870H-3F', site: site, status: 'W', pendingOffHire: false, replacedUnitId: '', reason: '' },
    { unitId: 'EX-1351', category: 'Excavator', equipment: 'Heavy Excavator', brand: 'Hitachi', model: 'ZX870H-3F', site: site, status: 'W', pendingOffHire: false, replacedUnitId: '', reason: '' },
    { unitId: 'DT-4012', category: 'Dump Truck', equipment: 'Off-Highway Truck', brand: 'Caterpillar', model: 'CAT-777E', site: site, status: 'SW', pendingOffHire: false, replacedUnitId: '', reason: '' },
    { unitId: 'DZ-85', category: 'Bulldozer', equipment: 'Crawler Dozer', brand: 'Komatsu', model: 'D85ESS-2', site: site, status: 'OH', pendingOffHire: false, replacedUnitId: '', reason: 'Standby Yard / Long-Term Overhaul' }
  ];

  if (action === 'GET_MASTER_DATA') {
    const targetMonth = payload.month || '2026-11';
    return {
      status: 'success',
      site: site,
      month: targetMonth,
      lockState: {
        mode: 'LOCKED_MID_MONTH',
        isLocked: true,
        label: 'Monthly Roster Locked (One-Way Mid-Month Rule)',
        description: 'Roster terkunci: Unit On-Hired hanya dapat diajukan Pending Off-Hire (efektif Tgl 1 bulan depan). Unit OH dapat ditarik darurat menjadi W dengan wajib memilih unit yang digantikan.'
      },
      isMaterialized: true,
      inheritedFrom: targetMonth,
      units: demoUnits.filter((u) => ['W', 'SW'].includes(u.status)),
      allSiteUnits: demoUnits,
      models: ['CAT-777E', 'D85ESS-2', 'ZX870H-3F'],
      components: { HYD: 'Hydraulic System', ENG: 'Engine & Cooling', UND: 'Undercarriage' },
      auditLogs: []
    };
  }

  if (action === 'GET_DASHBOARD_KPI') {
    return {
      status: 'success',
      site: site,
      target: 85,
      overall: {
        pa: 88.25,
        ma: 91.69,
        ua: 87.21,
        mttr: 2.5,
        mtbr: 35.56,
        wh: 640.0,
        bdUnsched: 58.0,
        freqUnsched: 18,
        bdSched: 36.0,
        rainHrs: 18.0,
        stbyHrs: 48.0
      },
      trend: [
        { date: '2026-11-08', dayName: 'Sunday', unitCount: 3, calHrs: 60, wh: 49.0, bdUnsched: 4.0, bdSched: 2.0, rainHrs: 1.0, stbyHrs: 4.0, pa: 90.0, ma: 92.45, ua: 90.74, mttr: 2.0, mtbr: 24.5 },
        { date: '2026-11-09', dayName: 'Monday', unitCount: 3, calHrs: 60, wh: 47.0, bdUnsched: 5.0, bdSched: 2.8, rainHrs: 1.2, stbyHrs: 4.0, pa: 87.0, ma: 90.38, ua: 90.04, mttr: 2.5, mtbr: 23.5 },
        { date: '2026-11-10', dayName: 'Tuesday', unitCount: 3, calHrs: 60, wh: 50.0, bdUnsched: 3.2, bdSched: 2.0, rainHrs: 0.8, stbyHrs: 4.0, pa: 91.33, ma: 93.98, ua: 91.24, mttr: 1.6, mtbr: 25.0 },
        { date: '2026-11-11', dayName: 'Wednesday', unitCount: 3, calHrs: 60, wh: 44.0, bdUnsched: 6.3, bdSched: 3.0, rainHrs: 2.0, stbyHrs: 4.7, pa: 84.5, ma: 87.48, ua: 86.79, mttr: 3.15, mtbr: 22.0 },
        { date: '2026-11-12', dayName: 'Thursday', unitCount: 3, calHrs: 60, wh: 48.0, bdUnsched: 4.2, bdSched: 2.5, rainHrs: 1.0, stbyHrs: 4.3, pa: 88.83, ma: 91.95, ua: 90.06, mttr: 2.1, mtbr: 24.0 },
        { date: '2026-11-13', dayName: 'Friday', unitCount: 3, calHrs: 57, wh: 46.0, bdUnsched: 3.7, bdSched: 2.0, rainHrs: 1.3, stbyHrs: 4.0, pa: 90.0, ma: 92.56, ua: 89.67, mttr: 1.85, mtbr: 23.0 },
        { date: '2026-11-14', dayName: 'Saturday', unitCount: 3, calHrs: 60, wh: 46.5, bdUnsched: 4.9, bdSched: 3.0, rainHrs: 1.0, stbyHrs: 4.6, pa: 86.83, ma: 90.47, ua: 89.25, mttr: 2.45, mtbr: 23.25 }
      ],
      pareto: [
        { component: 'HYD - Hydraulic System', totalHours: 28.5 },
        { component: 'ENG - Engine & Cooling', totalHours: 16.0 },
        { component: 'UND - Undercarriage', totalHours: 13.5 }
      ],
      activeBreakdowns: [
        {
          unitId: 'DZ-85',
          model: 'D85ESS-2',
          startDate: '2026-11-12',
          timeIn: '08:30',
          code: 'USCH',
          location: 'Pit North',
          problem: 'Main hydraulic hose burst & final drive seal inspection'
        }
      ],
      byModel: [
        { model: 'ZX870H-3F', wh: 340.0, bdUnsched: 32.0, bdSched: 18.0, stbyHrs: 24.0, pa: 87.5, ma: 91.4, ua: 87.2, mttr: 2.67, mtbr: 28.3 },
        { model: 'CAT-777E', wh: 180.0, bdUnsched: 8.0, bdSched: 10.0, stbyHrs: 12.0, pa: 91.0, ma: 95.7, ua: 90.0, mttr: 2.0, mtbr: 45.0 },
        { model: 'D85ESS-2', wh: 120.0, bdUnsched: 18.0, bdSched: 8.0, stbyHrs: 12.0, pa: 83.75, ma: 86.96, ua: 81.08, mttr: 3.0, mtbr: 20.0 }
      ],
      byUnit: [
        { unitId: 'EX-1320', model: 'ZX870H-3F', wh: 182.0, bdUnsched: 10.0, bdSched: 8.0, stbyHrs: 12.0, pa: 91.0, ma: 94.8, ua: 91.0, mttr: 2.5, mtbr: 45.5 },
        { unitId: 'EX-1351', model: 'ZX870H-3F', wh: 158.0, bdUnsched: 22.0, bdSched: 10.0, stbyHrs: 12.0, pa: 84.0, ma: 87.8, ua: 83.2, mttr: 2.75, mtbr: 19.8 },
        { unitId: 'DT-4012', model: 'CAT-777E', wh: 180.0, bdUnsched: 8.0, bdSched: 10.0, stbyHrs: 12.0, pa: 91.0, ma: 95.7, ua: 90.0, mttr: 2.0, mtbr: 45.0 },
        { unitId: 'DZ-85', model: 'D85ESS-2', wh: 120.0, bdUnsched: 18.0, bdSched: 8.0, stbyHrs: 12.0, pa: 83.75, ma: 86.96, ua: 81.08, mttr: 3.0, mtbr: 20.0 }
      ]
    };
  }

  if (action === 'GET_KPI_HISTORY') {
    return {
      status: 'success',
      site: site,
      month: payload.month || '2026-11',
      target: 85,
      dailyHistory: [
        { date: '2026-11-14', dayName: 'Saturday', unitCount: 4, calHrs: 80, wh: 66.0, bdUnsched: 5.0, bdSched: 2.0, rainHrs: 2.0, stbyHrs: 5.0, pa: 91.25, ma: 92.96, ua: 90.41, mttr: 2.5 },
        { date: '2026-11-13', dayName: 'Friday', unitCount: 4, calHrs: 76, wh: 61.0, bdUnsched: 6.0, bdSched: 2.0, rainHrs: 1.0, stbyHrs: 6.0, pa: 89.47, ma: 91.04, ua: 89.71, mttr: 3.0 }
      ],
      unitHistory: [
        { date: '2026-11-14', unitId: 'EX-1320', model: 'ZX870H-3F', calHrs: 20, wh: 18.0, bdUnsched: 0, bdSched: 0, rainHrs: 0.5, stbyHrs: 1.5, pa: 100, ma: 100, ua: 90.0 }
      ]
    };
  }

  if (action === 'GET_DAILY_OPERATION') {
    const dt = payload.date || '2026-11-14';
    const parts = dt.split('-').map(Number);
    const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const isFri = dObj.getDay() === 5;
    return {
      status: 'success',
      site: site,
      date: dt,
      dayName: days[dObj.getDay()],
      isFriday: isFri,
      shifts: {
        DAY: { isWorking: true, standardHours: isFri ? 9 : 10, rainHours: 0 },
        NIGHT: { isWorking: true, standardHours: 10, rainHours: 0 }
      },
      operations: { DAY: [], NIGHT: [] },
      lastHmMap: { 'EX-1320': 14250.5, 'EX-1351': 11890.0, 'DT-4012': 22410.0 },
      breakdownMap: { DAY: {}, NIGHT: {} },
      monthlyStatus: { '2026-11-12': 'COMPLETE', '2026-11-13': 'COMPLETE', '2026-11-14': 'BD_ONLY' }
    };
  }

  if (action === 'GENERATE_AI_REPORT') {
    const startDate = payload.startDate || '2026-11-01';
    const endDate = payload.endDate || '2026-11-14';
    const model = payload.model || 'ALL';
    const reportType = payload.reportType || 'MONTHLY';
    const sampleKpi = getDemoApiResponse('GET_DASHBOARD_KPI', payload, session);
    const localNarrative = ReportModule.buildLocalIndonesianAnalysis(sampleKpi, startDate, endDate, model, reportType);
    return {
      status: 'success',
      source: 'GEMINI_AI',
      summaryText: localNarrative.summaryText,
      bab2Analysis: localNarrative.bab2Analysis,
      bab3Analysis: localNarrative.bab3Analysis,
      bab4Conclusion: localNarrative.bab4Conclusion,
      recommendations: localNarrative.recommendations
    };
  }

  return { status: 'success', message: 'Demo operation completed.' };
}

/* ============================================================================
 * 9. INITIALIZE APPLICATION ON WINDOW LOAD
 * ============================================================================ */
window.addEventListener('DOMContentLoaded', () => {
  AuthModule.init();
});