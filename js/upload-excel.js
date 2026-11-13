/**
 * js/upload-excel.js
 * Pembacaan File Excel (.xlsx) Daily Report Machine di Browser & Pengiriman ke Backend
 */

const UploadExcelModule = {
  parsedRows: [],

  /**
   * Menangani pembacaan file Excel saat admin memilih file
   */
  handleFileSelect(event) {
    const file = event.target.files[0];
    const statusBox = document.getElementById('upload-status-msg');
    const btnUpload = document.getElementById('btn-submit-excel');

    if (!file) return;

    if (typeof XLSX === 'undefined') {
      statusBox.textContent = 'Error: Library pembaca Excel (SheetJS) belum termuat.';
      statusBox.className = 'text-sm text-rose-600 font-semibold';
      return;
    }

    statusBox.textContent = `Membaca file "${file.name}"...`;
    statusBox.className = 'text-sm text-slate-600';

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // Cari sheet bernama "Daily Report Machine" atau gunakan sheet pertama jika tidak ditemukan
        const targetSheetName = workbook.SheetNames.includes('Daily Report Machine')
          ? 'Daily Report Machine'
          : workbook.SheetNames[0];

        const worksheet = workbook.Sheets[targetSheetName];
        const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        this.extractBreakdownRows(rawMatrix);

        if (this.parsedRows.length > 0) {
          statusBox.textContent = `Ditemukan ${this.parsedRows.length} baris data breakdown valid untuk site ${AuthModule.currentSite}. Siap dikirim.`;
          statusBox.className = 'text-sm text-emerald-600 font-semibold';
          if (btnUpload) btnUpload.disabled = false;
        } else {
          statusBox.textContent = `Tidak ditemukan baris data yang cocok dengan daftar unit aktif site ${AuthModule.currentSite}.`;
          statusBox.className = 'text-sm text-amber-600 font-semibold';
          if (btnUpload) btnUpload.disabled = true;
        }

        this.renderPreviewTable();
      } catch (err) {
        console.error(err);
        statusBox.textContent = 'Gagal membaca struktur file Excel: ' + err.message;
        statusBox.className = 'text-sm text-rose-600 font-semibold';
      }
    };

    reader.readAsArrayBuffer(file);
  },

  /**
   * Mengekstrak kolom sesuai header Excel (Tanggal, Wo, Unit, Code, Problem, Finis Job Date, IN, Out, Code Component, Location)
   */
  extractBreakdownRows(matrix) {
    this.parsedRows = [];
    if (!matrix || matrix.length < 2) return;

    // Cari baris header (mengandung "Unit" dan "IN")
    let headerRowIdx = -1;
    let colIdx = {};

    for (let r = 0; r < Math.min(15, matrix.length); r++) {
      const row = matrix[r];
      if (!row) continue;
      const normalized = row.map(cell => String(cell || '').trim().toLowerCase());
      if (normalized.includes('unit') && normalized.includes('in')) {
        headerRowIdx = r;
        colIdx = {
          tanggal: normalized.findIndex(h => h.startsWith('tanggal')),
          wo: normalized.indexOf('wo'),
          unit: normalized.indexOf('unit'),
          model: normalized.indexOf('model'),
          location: normalized.indexOf('location'),
          code: normalized.indexOf('code'),
          problem: normalized.indexOf('problem'),
          finishDate: normalized.findIndex(h => h.includes('finis') || h.includes('finish')),
          timeIn: normalized.indexOf('in'),
          timeOut: normalized.indexOf('out'),
          codeComp: normalized.findIndex(h => h.includes('code component'))
        };
        break;
      }
    }

    if (headerRowIdx === -1) {
      throw new Error('Header kolom "Unit" dan "IN" tidak ditemukan pada file Excel.');
    }

    // Buat set unit aktif site saat ini untuk memfilter baris Excel
    const validUnitSet = new Set(AuthModule.masterData.units.map(u => String(u.unitId).trim()));

    // Filter rentang tanggal opsional dari UI (jika admin ingin upload tanggal tertentu saja)
    const filterFrom = document.getElementById('excel-filter-from')?.value || '';
    const filterTo = document.getElementById('excel-filter-to')?.value || '';

    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row) continue;

      const unitId = String(row[colIdx.unit] || '').trim();
      if (!unitId || !validUnitSet.has(unitId)) continue;

      const startDate = this.formatExcelDate(row[colIdx.tanggal]);
      const timeIn = this.formatExcelTime(row[colIdx.timeIn]);
      if (!startDate || !timeIn) continue;

      if (filterFrom && startDate < filterFrom) continue;
      if (filterTo && startDate > filterTo) continue;

      const finishDate = colIdx.finishDate !== -1 ? this.formatExcelDate(row[colIdx.finishDate]) : '';
      const timeOut = colIdx.timeOut !== -1 ? this.formatExcelTime(row[colIdx.timeOut]) : '';

      this.parsedRows.push({
        startDate: startDate,
        wo: colIdx.wo !== -1 ? String(row[colIdx.wo] || '').trim() : '',
        unitId: unitId,
        model: colIdx.model !== -1 ? String(row[colIdx.model] || '').trim() : '',
        location: colIdx.location !== -1 ? String(row[colIdx.location] || '').trim() : '',
        code: colIdx.code !== -1 ? String(row[colIdx.code] || 'USCH').trim().toUpperCase() : 'USCH',
        problem: colIdx.problem !== -1 ? String(row[colIdx.problem] || '').trim() : '',
        finishDate: finishDate,
        timeIn: timeIn,
        timeOut: timeOut,
        codeComponent: colIdx.codeComp !== -1 ? String(row[colIdx.codeComp] || '').trim().toUpperCase() : ''
      });
    }
  },

  /**
   * Menampilkan preview maksimal 50 baris terakhir sebelum di-upload ke Google Sheets
   */
  renderPreviewTable() {
    const tbody = document.getElementById('tbody-excel-preview');
    if (!tbody) return;

    if (this.parsedRows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-4 py-6 text-center text-sm text-slate-400">
            Belum ada data Excel yang diproses. Pilih file .xlsx di atas untuk melihat preview.
          </td>
        </tr>`;
      return;
    }

    const previewSlice = this.parsedRows.slice(-50).reverse();
    tbody.innerHTML = previewSlice.map(item => {
      const isOpen = !item.finishDate || !item.timeOut;
      const statusBadge = isOpen
        ? '<span class="px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700 rounded">Breakdown (Open)</span>'
        : '<span class="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded">Ready</span>';

      return `
        <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
          <td class="px-3 py-2 font-medium">${item.startDate}</td>
          <td class="px-3 py-2 font-bold text-slate-800">${item.unitId}</td>
          <td class="px-3 py-2"><span class="px-1.5 py-0.5 bg-slate-200 rounded font-semibold">${item.code}</span></td>
          <td class="px-3 py-2">${statusBadge}</td>
          <td class="px-3 py-2">${item.timeIn}</td>
          <td class="px-3 py-2">${isOpen ? '<em>Auto End Shift</em>' : `${item.finishDate} ${item.timeOut}`}</td>
          <td class="px-3 py-2">${item.codeComponent || '-'}</td>
          <td class="px-3 py-2 max-w-xs truncate" title="${item.problem}">${item.problem || '-'}</td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Mengirim data hasil parsing ke Google Apps Script secara bertahap (batch per 150 baris agar anti-timeout)
   */
  async submitToServer() {
    if (this.parsedRows.length === 0) return;

    const btnUpload = document.getElementById('btn-submit-excel');
    const statusBox = document.getElementById('upload-status-msg');

    if (btnUpload) {
      btnUpload.disabled = true;
      btnUpload.textContent = 'Mengunggah & Menghitung Jam Murni...';
    }

    const batchSize = 150;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (let i = 0; i < this.parsedRows.length; i += batchSize) {
      const chunk = this.parsedRows.slice(i, i + batchSize);
      const progress = Math.min(i + batchSize, this.parsedRows.length);
      statusBox.textContent = `Memproses ${progress} dari ${this.parsedRows.length} baris ke server...`;
      statusBox.className = 'text-sm text-blue-600 font-medium';

      const res = await callBackendApi('UPLOAD_BREAKDOWN_BATCH', {
        site: AuthModule.currentSite,
        rows: chunk
      });

      if (res.status !== 'success') {
        statusBox.textContent = `Terhenti pada baris ${i + 1}: ${res.message}`;
        statusBox.className = 'text-sm text-rose-600 font-semibold';
        if (btnUpload) {
          btnUpload.disabled = false;
          btnUpload.textContent = 'Upload ke Database';
        }
        return;
      }

      if (res.stats) {
        totalInserted += res.stats.inserted || 0;
        totalUpdated += res.stats.updated || 0;
        totalSkipped += res.stats.skipped || 0;
      }
    }

    statusBox.textContent = `Sukses! ${totalInserted} data baru ditambahkan, ${totalUpdated} data diperbarui, ${totalSkipped} dilewati. KPI otomatis diperbarui.`;
    statusBox.className = 'text-sm text-emerald-600 font-semibold';

    if (btnUpload) {
      btnUpload.disabled = false;
      btnUpload.textContent = 'Upload ke Database';
    }
  },

  /**
   * Helper konversi nilai tanggal dari Excel (Date object / serial / string) ke YYYY-MM-DD
   */
  formatExcelDate(val) {
    if (!val) return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof val === 'number') {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      }
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    return '';
  },

  /**
   * Helper konversi nilai jam dari Excel (Date object / desimal pecahan hari / string HH:mm) ke HH:mm
   */
  formatExcelTime(val) {
    if (val === null || val === undefined || val === '') return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
      const hh = String(val.getHours()).padStart(2, '0');
      const mm = String(val.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    if (typeof val === 'number') {
      const totalMinutes = Math.round((val % 1) * 24 * 60);
      const hh = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
      const mm = String(totalMinutes % 60).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const match = String(val).trim().match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    return '';
  }
};
