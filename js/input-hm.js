/**
 * js/input-hm.js
 * Logika Form Input Harian (Day Shift & Night Shift), Combo Box Unit ID,
 * Auto-Fill HM Awal dari HM Akhir sebelumnya, dan Validasi Anti-Lompatan HM
 */

const InputHmModule = {
  selectedDate: '',
  isFriday: false,
  lastHmMap: {}, // Menyimpan HM Akhir terakhir sebelum tanggal terpilih { unitId: hmEnd }
  shifts: {
    DAY: { isWorking: true, standardHours: 10, rainHours: 0 },
    NIGHT: { isWorking: true, standardHours: 10, rainHours: 0 }
  },
  operations: {
    DAY: [],
    NIGHT: []
  },

  /**
   * Inisialisasi tanggal default (hari ini) dan muat data dari server
   */
  init() {
    const dateInput = document.getElementById('op-date-picker');
    if (dateInput && !dateInput.value) {
      dateInput.value = this.getTodayYMD();
    }
    this.loadDate();
  },

  getTodayYMD() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Memuat data operasional yang tersimpan saat tanggal atau site diganti
   */
  async loadDate() {
    const dateInput = document.getElementById('op-date-picker');
    const statusBox = document.getElementById('op-status-msg');
    if (!dateInput) return;

    this.selectedDate = dateInput.value;
    if (!this.selectedDate) return;

    if (statusBox) {
      statusBox.textContent = 'Memuat data shift & riwayat HM terakhir...';
      statusBox.className = 'text-sm text-slate-500';
    }

    const res = await callBackendApi('GET_DAILY_OPERATION', {
      site: AuthModule.currentSite,
      date: this.selectedDate
    });

    if (res.status === 'success') {
      this.isFriday = Boolean(res.isFriday);
      this.shifts = res.shifts;
      this.lastHmMap = res.lastHmMap || {};
      this.operations = {
        DAY: res.operations.DAY || [],
        NIGHT: res.operations.NIGHT || []
      };

      this.syncShiftControlsUI();
      this.renderShiftTable('DAY');
      this.renderShiftTable('NIGHT');

      if (statusBox) {
        statusBox.textContent = `Data tanggal ${this.selectedDate} (${res.dayName}) siap.`;
        statusBox.className = 'text-sm text-emerald-600 font-medium';
      }
    } else {
      if (statusBox) {
        statusBox.textContent = res.message || 'Gagal memuat data shift.';
        statusBox.className = 'text-sm text-rose-600 font-medium';
      }
    }
  },

  /**
   * Mendapatkan referensi HM Akhir terakhir untuk suatu unit:
   * - Jika shift NIGHT, cek terlebih dahulu apakah unit tersebut sudah diinput di shift DAY hari yang sama.
   * - Jika belum, gunakan riwayat HM Akhir dari tanggal sebelumnya (lastHmMap).
   */
  getExpectedStartHm(shiftName, unitId) {
    const cleanId = String(unitId || '').trim();
    if (!cleanId) return null;

    if (shiftName === 'NIGHT') {
      const dayRow = this.operations.DAY.find(r => String(r.unitId || '').trim() === cleanId);
      if (dayRow && dayRow.hmEnd !== '' && !isNaN(parseFloat(dayRow.hmEnd))) {
        return parseFloat(dayRow.hmEnd);
      }
    }

    if (this.lastHmMap && this.lastHmMap[cleanId] !== undefined) {
      return parseFloat(this.lastHmMap[cleanId]);
    }

    return null;
  },

  /**
   * Sinkronisasi checkbox Shift Aktif, indikator Jumat (9 jam), dan input Hujan Global
   */
  syncShiftControlsUI() {
    const fridayBadge = document.getElementById('op-friday-badge');
    if (fridayBadge) {
      fridayBadge.textContent = this.isFriday
        ? 'Jadwal Jumat: Day Shift 9 Jam + Night Shift 10 Jam (Total 19 Jam)'
        : 'Jadwal Normal: Day Shift 10 Jam + Night Shift 10 Jam (Total 20 Jam)';
    }

    ['DAY', 'NIGHT'].forEach(shift => {
      const sLower = shift.toLowerCase();
      const chkWorking = document.getElementById(`chk-${sLower}-working`);
      const inputRain = document.getElementById(`rain-${sLower}-hours`);
      const container = document.getElementById(`panel-${sLower}-shift`);
      const maxBadge = document.getElementById(`max-hrs-${sLower}`);

      const info = this.shifts[shift];
      const maxHrs = info.isWorking ? ((shift === 'DAY' && this.isFriday) ? 9 : 10) : 0;

      if (chkWorking) chkWorking.checked = info.isWorking;
      if (inputRain) {
        inputRain.value = info.rainHours || 0;
        inputRain.max = maxHrs;
        inputRain.disabled = !info.isWorking;
      }
      if (maxBadge) {
        maxBadge.textContent = info.isWorking ? `Kuota: ${maxHrs} Jam` : 'LIBUR (0 Jam)';
      }
      if (container) {
        container.style.opacity = info.isWorking ? '1' : '0.5';
      }
    });
  },

  /**
   * Dipanggil saat admin mencentang / melepas centang Day Shift atau Night Shift
   */
  toggleShiftWorking(shiftName, isChecked) {
    this.shifts[shiftName].isWorking = Boolean(isChecked);
    if (!isChecked) {
      this.shifts[shiftName].rainHours = 0;
    }
    this.syncShiftControlsUI();
  },

  updateRainHours(shiftName, val) {
    this.shifts[shiftName].rainHours = Math.max(0, Number(val) || 0);
  },

  /**
   * Menambah 1 baris input unit baru ke tabel DAY atau NIGHT
   */
  addUnitRow(shiftName) {
    if (!this.shifts[shiftName].isWorking) return;
    this.operations[shiftName].push({
      unitId: '',
      model: '',
      hmStart: '',
      hmEnd: '',
      wh: 0,
      remarks: ''
    });
    this.renderShiftTable(shiftName);
  },

  removeUnitRow(shiftName, index) {
    this.operations[shiftName].splice(index, 1);
    this.renderShiftTable(shiftName);
  },

  /**
   * Menghitung WH real-time & melakukan validasi ketat:
   * 1. Auto-fill Model & HM Awal saat Unit ID dipilih dari Combo Box
   * 2. Validasi HM Awal tidak mundur dan tidak melompat > 24 jam dari HM Akhir sebelumnya
   * 3. Validasi HM Akhir tidak < HM Awal dan WH tidak melebihi kuota shift (9 / 10 jam)
   */
  onRowChange(shiftName, index, field, value) {
    const row = this.operations[shiftName][index];
    if (!row) return;

    row[field] = value;

    // Saat Unit ID dipilih dari Combo Box
    if (field === 'unitId') {
      const cleanId = String(value).trim();
      const foundUnit = AuthModule.masterData.units.find(u => u.unitId === cleanId);
      row.model = foundUnit ? foundUnit.model : '';

      const modelCell = document.getElementById(`model-${shiftName}-${index}`);
      if (modelCell) modelCell.textContent = row.model || '-';

      // Auto-fill HM Awal dari HM Akhir sebelumnya
      const expectedStart = this.getExpectedStartHm(shiftName, cleanId);
      const startInput = document.getElementById(`hm-start-${shiftName}-${index}`);
      if (expectedStart !== null) {
        row.hmStart = expectedStart;
        if (startInput) startInput.value = expectedStart;
      } else {
        row.hmStart = '';
        if (startInput) startInput.value = '';
      }
    }

    // Jika HM Akhir di DAY shift berubah, perbarui otomatis HM Awal unit yang sama di NIGHT shift jika belum diisi manual
    if (shiftName === 'DAY' && field === 'hmEnd' && row.unitId) {
      const nightIdx = this.operations.NIGHT.findIndex(r => String(r.unitId || '').trim() === String(row.unitId).trim());
      if (nightIdx !== -1 && value !== '' && !isNaN(parseFloat(value))) {
        this.operations.NIGHT[nightIdx].hmStart = parseFloat(value);
        this.renderShiftTable('NIGHT');
      }
    }

    this.validateAndRenderRowFeedback(shiftName, index);
  },

  /**
   * Validasi baris dan perbarui indikator visual WH & Keterangan
   */
  validateAndRenderRowFeedback(shiftName, index) {
    const row = this.operations[shiftName][index];
    if (!row) return { valid: true };

    const start = parseFloat(row.hmStart);
    const end = parseFloat(row.hmEnd);
    const maxShiftHrs = (shiftName === 'DAY' && this.isFriday) ? 9 : 10;
    const expectedStart = this.getExpectedStartHm(shiftName, row.unitId);

    const whCell = document.getElementById(`wh-${shiftName}-${index}`);
    const noteCell = document.getElementById(`note-${shiftName}-${index}`);

    // Cek anomali HM Awal terhadap HM Akhir sebelumnya (toleransi maksimal selisih 24 jam)
    let startWarning = '';
    if (!isNaN(start) && expectedStart !== null) {
      const gapFromPrev = Math.round((start - expectedStart) * 100) / 100;
      if (gapFromPrev < 0) {
        startWarning = `HM Awal (${start}) < HM Akhir sblmnya (${expectedStart})!`;
      } else if (gapFromPrev > 24) {
        startWarning = `HM Awal melompat +${gapFromPrev}j dari sblmnya (${expectedStart})!`;
      }
    }

    if (!isNaN(start) && !isNaN(end)) {
      const diff = Math.round((end - start) * 100) / 100;
      row.wh = diff;

      if (whCell) {
        whCell.textContent = diff.toFixed(2) + ' jam';
        const isInvalid = Boolean(startWarning) || diff < 0 || diff > maxShiftHrs;
        whCell.className = isInvalid
          ? 'px-3 py-2 font-bold text-rose-600 text-sm'
          : 'px-3 py-2 font-bold text-emerald-700 text-sm';
      }

      if (noteCell) {
        if (startWarning) {
          noteCell.textContent = startWarning;
          noteCell.className = 'px-3 py-2 text-xs text-rose-600 font-semibold';
        } else if (diff < 0) {
          noteCell.textContent = 'HM Akhir < HM Awal!';
          noteCell.className = 'px-3 py-2 text-xs text-rose-600 font-semibold';
        } else if (diff > maxShiftHrs) {
          noteCell.textContent = `Lompatan WH (${diff}j) melebihi kuota ${maxShiftHrs} jam!`;
          noteCell.className = 'px-3 py-2 text-xs text-rose-600 font-semibold';
        } else {
          const sisa = Math.round((maxShiftHrs - diff) * 100) / 100;
          const prevInfo = expectedStart !== null ? ` [HM Sblm: ${expectedStart}]` : '';
          noteCell.textContent = (sisa > 0
            ? `Sisa ${sisa} jam (ditutup BD/Hujan/Stby)`
            : 'Full Operasi') + prevInfo;
          noteCell.className = 'px-3 py-2 text-xs text-slate-500';
        }
      }
    } else {
      row.wh = 0;
      if (whCell) {
        whCell.textContent = '0.00 jam';
        whCell.className = 'px-3 py-2 font-bold text-slate-400 text-sm';
      }
      if (noteCell) {
        if (startWarning) {
          noteCell.textContent = startWarning;
          noteCell.className = 'px-3 py-2 text-xs text-rose-600 font-semibold';
        } else if (expectedStart !== null) {
          noteCell.textContent = `Auto HM Awal dari HM Akhir sblmnya (${expectedStart})`;
          noteCell.className = 'px-3 py-2 text-xs text-blue-600 font-medium';
        } else {
          noteCell.textContent = '-';
          noteCell.className = 'px-3 py-2 text-xs text-slate-500';
        }
      }
    }
  },

  /**
   * Merender tabel baris input unit dengan Combo Box (<select>) Unit ID dari Master Data
   */
  renderShiftTable(shiftName) {
    const tbody = document.getElementById(`tbody-${shiftName.toLowerCase()}-op`);
    if (!tbody) return;

    const list = this.operations[shiftName];
    const maxShiftHrs = (shiftName === 'DAY' && this.isFriday) ? 9 : 10;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="px-4 py-6 text-center text-sm text-slate-400">
            Belum ada unit beroperasi diinput pada ${shiftName} SHIFT. Unit lain otomatis dihitung Standby / Breakdown.
          </td>
        </tr>`;
      return;
    }

    const activeUnits = AuthModule.masterData.units || [];

    tbody.innerHTML = list.map((row, idx) => {
      const whVal = Number(row.wh) || 0;
      const expectedStart = this.getExpectedStartHm(shiftName, row.unitId);
      const sisa = Math.max(0, Math.round((maxShiftHrs - whVal) * 100) / 100);

      let infoText = '-';
      if (whVal > 0) {
        const prevInfo = expectedStart !== null ? ` [HM Sblm: ${expectedStart}]` : '';
        infoText = (sisa > 0 ? `Sisa ${sisa} jam (ditutup BD/Hujan/Stby)` : 'Full Operasi') + prevInfo;
      } else if (expectedStart !== null) {
        infoText = `Auto HM Awal dari HM Akhir sblmnya (${expectedStart})`;
      }

      // Bangun opsi Combo Box (<select>) dari populasi aktif site
      const optionsHtml = ['<option value="">-- Pilih Unit ID --</option>']
        .concat(activeUnits.map(u => {
          const selected = (String(row.unitId).trim() === u.unitId) ? 'selected' : '';
          return `<option value="${u.unitId}" ${selected}>${u.unitId} (${u.model})</option>`;
        }))
        .join('');

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
          <td class="px-3 py-2">
            <select onchange="InputHmModule.onRowChange('${shiftName}', ${idx}, 'unitId', this.value)"
              class="w-44 px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500">
              ${optionsHtml}
            </select>
          </td>
          <td id="model-${shiftName}-${idx}" class="px-3 py-2 text-xs font-medium text-slate-600">
            ${row.model || '-'}
          </td>
          <td class="px-3 py-2">
            <input type="number" id="hm-start-${shiftName}-${idx}" step="0.1" value="${row.hmStart}" placeholder="0.0"
              oninput="InputHmModule.onRowChange('${shiftName}', ${idx}, 'hmStart', this.value)"
              class="w-28 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500" />
          </td>
          <td class="px-3 py-2">
            <input type="number" id="hm-end-${shiftName}-${idx}" step="0.1" value="${row.hmEnd}" placeholder="0.0"
              oninput="InputHmModule.onRowChange('${shiftName}', ${idx}, 'hmEnd', this.value)"
              class="w-28 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500" />
          </td>
          <td id="wh-${shiftName}-${idx}" class="px-3 py-2 font-bold text-emerald-700 text-sm">
            ${whVal.toFixed(2)} jam
          </td>
          <td id="note-${shiftName}-${idx}" class="px-3 py-2 text-xs text-slate-500">
            ${infoText}
          </td>
          <td class="px-3 py-2 text-right">
            <button type="button" onclick="InputHmModule.removeUnitRow('${shiftName}', ${idx})"
              class="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2 py-1">
              Hapus
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Validasi ketat sebelum mengirim data ke server (mencegah duplikat, HM mundur, dan lompatan jauh)
   */
  async saveAll() {
    const btnSave = document.getElementById('btn-save-op');
    const statusBox = document.getElementById('op-status-msg');

    if (!this.selectedDate) {
      statusBox.textContent = 'Pilih tanggal terlebih dahulu.';
      statusBox.className = 'text-sm text-rose-600 font-medium';
      return;
    }

    for (const shiftName of ['DAY', 'NIGHT']) {
      if (!this.shifts[shiftName].isWorking) continue;
      const maxHrs = (shiftName === 'DAY' && this.isFriday) ? 9 : 10;
      const seenUnits = {};

      for (const row of this.operations[shiftName]) {
        const uid = String(row.unitId || '').trim();
        if (!uid) continue;

        if (seenUnits[uid]) {
          statusBox.textContent = `Error: Unit ${uid} dipilih lebih dari sekali pada ${shiftName} SHIFT.`;
          statusBox.className = 'text-sm text-rose-600 font-semibold';
          return;
        }
        seenUnits[uid] = true;

        const start = parseFloat(row.hmStart);
        const end = parseFloat(row.hmEnd);
        if (isNaN(start) || isNaN(end) || end < start) {
          statusBox.textContent = `Error: Angka HM pada unit ${uid} (${shiftName} SHIFT) tidak valid.`;
          statusBox.className = 'text-sm text-rose-600 font-semibold';
          return;
        }

        const expectedStart = this.getExpectedStartHm(shiftName, uid);
        if (expectedStart !== null) {
          const gap = Math.round((start - expectedStart) * 100) / 100;
          if (gap < 0) {
            statusBox.textContent = `Error: HM Awal unit ${uid} (${start}) lebih kecil dari HM Akhir sebelumnya (${expectedStart}).`;
            statusBox.className = 'text-sm text-rose-600 font-semibold';
            return;
          }
          if (gap > 24) {
            statusBox.textContent = `Error: HM Awal unit ${uid} (${start}) melompat terlalu jauh (+${gap} jam) dari HM Akhir sebelumnya (${expectedStart}).`;
            statusBox.className = 'text-sm text-rose-600 font-semibold';
            return;
          }
        }

        if ((end - start) > maxHrs) {
          statusBox.textContent = `Error: Selisih HM unit ${uid} (${shiftName} SHIFT) melebihi kuota ${maxHrs} jam.`;
          statusBox.className = 'text-sm text-rose-600 font-semibold';
          return;
        }
      }
    }

    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = 'Menyimpan & Menghitung KPI...';
    }

    const res = await callBackendApi('SAVE_DAILY_OPERATION', {
      site: AuthModule.currentSite,
      date: this.selectedDate,
      shifts: this.shifts,
      operations: this.operations
    });

    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = 'Simpan Data Operasional Harian';
    }

    if (res.status === 'success') {
      statusBox.textContent = res.message;
      statusBox.className = 'text-sm text-emerald-600 font-semibold';
    } else {
      statusBox.textContent = res.message || 'Gagal menyimpan data.';
      statusBox.className = 'text-sm text-rose-600 font-semibold';
    }
  }
};
