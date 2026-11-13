/**
 * js/dashboard.js
 * Pengolahan Tampilan Dashboard KPI (PA, MA, UA, MTTR, MTBR), Grafik Tren, Pareto & Tabel Per Model/Unit
 */

const DashboardModule = {
  trendChartInstance: null,
  paretoChartInstance: null,
  latestData: null,

  /**
   * Inisialisasi rentang tanggal default (awal bulan berjalan sampai hari ini)
   */
  init() {
    const startInput = document.getElementById('dash-start-date');
    const endInput = document.getElementById('dash-end-date');

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    if (startInput && !startInput.value) {
      startInput.value = `${y}-${m}-01`;
    }
    if (endInput && !endInput.value) {
      endInput.value = `${y}-${m}-${d}`;
    }
  },

  /**
   * Memuat data KPI dari Google Apps Script sesuai filter Site, Tanggal, dan Model
   */
  async load() {
    this.init();

    const startDate = document.getElementById('dash-start-date')?.value;
    const endDate = document.getElementById('dash-end-date')?.value;
    const model = document.getElementById('dash-filter-model')?.value || 'ALL';
    const statusBox = document.getElementById('dash-status-msg');

    if (!startDate || !endDate) return;

    if (statusBox) {
      statusBox.textContent = 'Memuat data KPI...';
      statusBox.className = 'text-xs text-slate-500';
    }

    const res = await callBackendApi('GET_DASHBOARD_KPI', {
      site: AuthModule.currentSite,
      startDate: startDate,
      endDate: endDate,
      model: model
    });

    if (res.status === 'success') {
      this.latestData = res;
      this.renderKpiCards(res.overall, res.target || APP_CONFIG.KPI_TARGET);
      this.renderTrendChart(res.trend || [], res.target || APP_CONFIG.KPI_TARGET);
      this.renderParetoChart(res.pareto || []);
      this.renderActiveBreakdowns(res.activeBreakdowns || []);
      this.renderModelTable(res.byModel || [], res.target || APP_CONFIG.KPI_TARGET);
      this.renderUnitTable(res.byUnit || [], res.target || APP_CONFIG.KPI_TARGET);

      if (statusBox) {
        statusBox.textContent = `Data KPI ${res.site} (${startDate} s/d ${endDate}) diperbarui.`;
        statusBox.className = 'text-xs text-emerald-600 font-medium';
      }
    } else {
      if (statusBox) {
        statusBox.textContent = res.message || 'Gagal memuat dashboard.';
        statusBox.className = 'text-xs text-rose-600 font-semibold';
      }
    }
  },

  /**
   * Merender 5 kartu KPI utama (PA, MA, UA dengan indikator target 85%, MTTR & MTBR aktual)
   */
  renderKpiCards(overall, target) {
    if (!overall) return;

    const setPercentCard = (idVal, idBadge, val) => {
      const elVal = document.getElementById(idVal);
      const elBadge = document.getElementById(idBadge);
      if (elVal) elVal.textContent = val.toFixed(2) + '%';
      if (elBadge) {
        const isPass = val >= target;
        elBadge.textContent = isPass ? `Target ≥ ${target}% (OK)` : `Target ≥ ${target}% (Below)`;
        elBadge.className = isPass
          ? 'inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-700'
          : 'inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-700';
      }
    };

    setPercentCard('kpi-val-pa', 'kpi-badge-pa', overall.pa || 0);
    setPercentCard('kpi-val-ma', 'kpi-badge-ma', overall.ma || 0);
    setPercentCard('kpi-val-ua', 'kpi-badge-ua', overall.ua || 0);

    const elMttr = document.getElementById('kpi-val-mttr');
    const elMtbr = document.getElementById('kpi-val-mtbr');
    const elSubHours = document.getElementById('kpi-hours-summary');

    if (elMttr) elMttr.textContent = (overall.mttr || 0).toFixed(2) + ' Jam';
    if (elMtbr) elMtbr.textContent = (overall.mtbr || 0).toFixed(2) + ' Jam';
    if (elSubHours) {
      elSubHours.textContent = `WH: ${overall.wh}j | BD Unsched: ${overall.bdUnsched}j (${overall.freqUnsched}x) | BD Sched: ${overall.bdSched}j | Rain: ${overall.rainHrs}j | Stby: ${overall.stbyHrs}j`;
    }
  },

  /**
   * Grafik Tren Harian PA, MA, UA menggunakan Chart.js
   */
  renderTrendChart(trendList, target) {
    const canvas = document.getElementById('chart-kpi-trend');
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.trendChartInstance) {
      this.trendChartInstance.destroy();
    }

    const labels = trendList.map(t => t.date.slice(5)); // MM-DD
    const paData = trendList.map(t => t.pa);
    const maData = trendList.map(t => t.ma);
    const uaData = trendList.map(t => t.ua);
    const targetLine = trendList.map(() => target);

    this.trendChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'PA (%)',
            data: paData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            tension: 0.25,
            borderWidth: 2
          },
          {
            label: 'MA (%)',
            data: maData,
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            tension: 0.25,
            borderWidth: 2
          },
          {
            label: 'UA (%)',
            data: uaData,
            borderColor: '#d97706',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            tension: 0.25,
            borderWidth: 2
          },
          {
            label: `Target (${target}%)`,
            data: targetLine,
            borderColor: '#e11d48',
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: { callback: val => val + '%' }
          }
        }
      }
    });
  },

  /**
   * Grafik Pareto Kerusakan Komponen Unscheduled (Top 10)
   */
  renderParetoChart(paretoList) {
    const canvas = document.getElementById('chart-component-pareto');
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.paretoChartInstance) {
      this.paretoChartInstance.destroy();
    }

    const top10 = paretoList.slice(0, 10);
    const labels = top10.map(p => p.component);
    const hoursData = top10.map(p => p.totalHours);

    this.paretoChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Jam Breakdown Murni (Unscheduled)',
            data: hoursData,
            backgroundColor: '#f43f5e',
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });
  },

  /**
   * Daftar unit yang masih berstatus Breakdown (Open / Finish Date kosong di Excel)
   */
  renderActiveBreakdowns(list) {
    const tbody = document.getElementById('tbody-active-bd');
    const badge = document.getElementById('badge-active-bd-count');
    if (!tbody) return;

    if (badge) badge.textContent = `${list.length} Unit Down`;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-4 py-4 text-center text-xs text-slate-400">
            Tidak ada unit berstatus Breakdown (Open).
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr class="border-b border-slate-100 text-xs hover:bg-rose-50/40">
        <td class="px-3 py-2 font-bold text-rose-700">${item.unitId}</td>
        <td class="px-3 py-2 font-medium text-slate-700">${item.model}</td>
        <td class="px-3 py-2">${item.startDate} (${item.timeIn})</td>
        <td class="px-3 py-2"><span class="px-1.5 py-0.5 bg-slate-200 rounded font-semibold">${item.code}</span></td>
        <td class="px-3 py-2">${item.location || '-'}</td>
        <td class="px-3 py-2 text-slate-600">${item.problem || '-'}</td>
      </tr>
    `).join('');
  },

  /**
   * Tabel Rekap KPI Per Model Unit
   */
  renderModelTable(list, target) {
    const tbody = document.getElementById('tbody-kpi-model');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="px-4 py-6 text-center text-sm text-slate-400">Belum ada data pada periode ini.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(m => `
      <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
        <td class="px-3 py-2.5 font-bold text-slate-800">${m.model}</td>
        <td class="px-3 py-2.5 text-right">${m.wh.toFixed(1)}</td>
        <td class="px-3 py-2.5 text-right text-rose-600 font-medium">${m.bdUnsched.toFixed(1)}</td>
        <td class="px-3 py-2.5 text-right text-amber-600">${m.bdSched.toFixed(1)}</td>
        <td class="px-3 py-2.5 text-right">${m.stbyHrs.toFixed(1)}</td>
        <td class="px-3 py-2.5 text-right font-bold ${m.pa >= target ? 'text-emerald-600' : 'text-rose-600'}">${m.pa.toFixed(2)}%</td>
        <td class="px-3 py-2.5 text-right font-bold ${m.ma >= target ? 'text-emerald-600' : 'text-rose-600'}">${m.ma.toFixed(2)}%</td>
        <td class="px-3 py-2.5 text-right font-bold ${m.ua >= target ? 'text-emerald-600' : 'text-rose-600'}">${m.ua.toFixed(2)}%</td>
        <td class="px-3 py-2.5 text-right font-semibold text-slate-700">${m.mttr.toFixed(2)}j</td>
        <td class="px-3 py-2.5 text-right font-semibold text-slate-700">${m.mtbr.toFixed(2)}j</td>
      </tr>
    `).join('');
  },

  /**
   * Tabel Rekap KPI Per Unit (mendukung pencarian cepat per kode unit)
   */
  renderUnitTable(list, target) {
    const tbody = document.getElementById('tbody-kpi-unit');
    const searchVal = String(document.getElementById('dash-unit-search')?.value || '').trim().toLowerCase();
    if (!tbody) return;

    const sourceList = list || (this.latestData ? this.latestData.byUnit : []);
    const filtered = sourceList.filter(u => {
      if (!searchVal) return true;
      return u.unitId.toLowerCase().includes(searchVal) || u.model.toLowerCase().includes(searchVal);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="px-4 py-6 text-center text-sm text-slate-400">Tidak ada data unit yang cocok.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(u => `
      <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
        <td class="px-3 py-2 font-bold text-slate-800">${u.unitId}</td>
        <td class="px-3 py-2 text-slate-600">${u.model}</td>
        <td class="px-3 py-2 text-right">${u.wh.toFixed(1)}</td>
        <td class="px-3 py-2 text-right text-rose-600 font-medium">${u.bdUnsched.toFixed(1)}</td>
        <td class="px-3 py-2 text-right text-amber-600">${u.bdSched.toFixed(1)}</td>
        <td class="px-3 py-2 text-right">${u.stbyHrs.toFixed(1)}</td>
        <td class="px-3 py-2 text-right font-bold ${u.pa >= target ? 'text-emerald-600' : 'text-rose-600'}">${u.pa.toFixed(2)}%</td>
        <td class="px-3 py-2 text-right font-bold ${u.ma >= target ? 'text-emerald-600' : 'text-rose-600'}">${u.ma.toFixed(2)}%</td>
        <td class="px-3 py-2 text-right font-bold ${u.ua >= target ? 'text-emerald-600' : 'text-rose-600'}">${u.ua.toFixed(2)}%</td>
        <td class="px-3 py-2 text-right font-semibold text-slate-700">${u.mttr.toFixed(2)}j</td>
        <td class="px-3 py-2 text-right font-semibold text-slate-700">${u.mtbr.toFixed(2)}j</td>
      </tr>
    `).join('');
  },

  /**
   * Export laporan KPI Per Model & Per Unit ke file Excel (.xlsx)
   */
  exportToExcel() {
    if (!this.latestData || typeof XLSX === 'undefined') return;

    const wb = XLSX.utils.book_new();
    const wsModel = XLSX.utils.json_to_sheet(this.latestData.byModel || []);
    const wsUnit = XLSX.utils.json_to_sheet(this.latestData.byUnit || []);

    XLSX.utils.book_append_sheet(wb, wsModel, 'KPI_Per_Model');
    XLSX.utils.book_append_sheet(wb, wsUnit, 'KPI_Per_Unit');

    const startDate = document.getElementById('dash-start-date')?.value || 'report';
    const endDate = document.getElementById('dash-end-date')?.value || '';
    XLSX.writeFile(wb, `Plant_KPI_${AuthModule.currentSite}_${startDate}_to_${endDate}.xlsx`);
  }
};
