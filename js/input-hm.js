/**
 * js/input-hm.js
 * Logika Form Input Harian (Day Shift & Night Shift), Saklar Shift Libur, dan Hujan Global
 */

const InputHmModule = {
  selectedDate: '',
  isFriday: false,
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
      statusBox.textContent = 'Memuat data shift...';
      statusBox.className = 'text-sm text-slate-500';
    }

    const res = await callBackendApi('GET_DAILY_OPERATION', {
      site: AuthModule.currentSite,
      date: this.selectedDate
    });

    if (res.status === 'success') {
      this.isFriday = Boolean(res.isFriday);
      this.shifts = res.shifts;
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
   * Menghitung WH real-time saat admin mengetik HM Awal / HM Akhir & memvalidasi batas jam shift
   */
  onRowChange(shiftName, index, field, value) {
    const row = this.operations[shiftName][index];
    if (!row) return;

    row[field] = value;

    // Jika Unit ID dipilih, otomatis isi Model dari masterData
    if (field === 'unitId') {
      const foundUnit = AuthModule.masterData.units.find(u => u.unitId === String(value).trim());
      row.model = foundUnit ? foundUnit.model : '';
      const modelCell = document.getElementById(`model-${shiftName}-${index}`);
      if (modelCell) modelCell.textContent = row.model || '-';
    }

    // Hitung selisih WH
    const start = parseFloat(row.hmStart);
    const end = parseFloat(row.hmEnd);
    const maxShiftHrs = (shiftName === 'DAY' && this.isFriday) ? 9 : 10;

    const whCell = document.getElementById(`wh-${shiftName}-${index}`);
    const noteCell = document.getElementById(`note-${shiftName}-${index}`);

    if (!isNaN(start) && !isNaN(end)) {
      const diff = Math.round((end - start) * 100) / 100;
      row.wh = diff;

      if (whCell) {
        whCell.textContent = diff.toFixed(2) + ' jam';
        if (diff < 0 || diff > maxShiftHrs) {
          whCell.className = 'px-3 py-2 font-bold text-rose-600';
        } else {
          whCell.className = 'px-3 py-2 font-bold text-emerald-700';
        }
      }

      if (noteCell) {
        if (diff < 0) {
          noteCell.textContent = 'HM Akhir < HM Awal!';
          noteCell.className = 'px-3 py-2 text-xs text-rose-600 font-semibold';
        } else if (diff > maxShiftHrs) {
          noteCell.textContent = `Melebihi ${maxShiftHrs} jam!`;
          noteCell.className = 'px-3 py-2 text-xs text-rose-600 font-semibold';
        } else {
          const sisa = Math.round((maxShiftHrs - diff) * 100) / 100;
          noteCell.textContent = sisa > 0
            ? `Sisa ${sisa} jam (ditutup BD/Hujan/Stby)`
            : 'Full Operasi';
          noteCell.className = 'px-3 py-2 text-xs text-slate-500';
        }
      }
    } else {
      row.wh = 0;
      if (whCell) whCell.textContent = '0.00 jam';
      if (noteCell) noteCell.textContent = '-';
    }
  },

  /**
   * Merender tabel baris input unit untuk masing-masing shift
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

    // Buat opsi datalist/select dari populasi aktif site
    const unitOptions = AuthModule.masterData.units
      .map(u => `<option value="${u.unitId}">${u.unitId} - ${u.model}</option>`)
      .join('');

    tbody.innerHTML = list.map((row, idx) => {
      const whVal = Number(row.wh) || 0;
      const sisa = Math.max(0, Math.round((maxShiftHrs - whVal) * 100) / 100);
      const infoText = whVal > 0
        ? (sisa > 0 ? `Sisa ${sisa} jam (ditutup BD/Hujan/Stby)` : 'Full Operasi')
        : '-';

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
          <td class="px-3 py-2">
            <input type="text" list="unit-datalist-${shiftName}" value="${row.unitId}"
              placeholder="Ketik/Pilih Unit"
              onchange="InputHmModule.onRowChange('${shiftName}', ${idx}, 'unitId', this.value)"
              class="w-32 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500" />
          </td>
          <td id="model-${shiftName}-${idx}" class="px-3 py-2 text-xs font-medium text-slate-600">
            ${row.model || '-'}
          </td>
          <td class="px-3 py-2">
            <input type="number" step="0.1" value="${row.hmStart}" placeholder="0.0"
              oninput="InputHmModule.onRowChange('${shiftName}', ${idx}, 'hmStart', this.value)"
              class="w-28 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500" />
          </td>
          <td class="px-3 py-2">
            <input type="number" step="0.1" value="${row.hmEnd}" placeholder="0.0"
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
    }).join('') + `<datalist id="unit-datalist-${shiftName}">${unitOptions}</datalist>`;
  },

  /**
   * Validasi dan kirim seluruh data Day & Night Shift ke Google Sheets
   */
  async saveAll() {
    const btnSave = document.getElementById('btn-save-op');
    const statusBox = document.getElementById('op-status-msg');

    if (!this.selectedDate) {
      statusBox.textContent = 'Pilih tanggal terlebih dahulu.';
      statusBox.className = 'text-sm text-rose-600 font-medium';
      return;
    }

    // Validasi duplikat unit dalam shift yang sama & validasi angka HM
    for (const shiftName of ['DAY', 'NIGHT']) {
      if (!this.shifts[shiftName].isWorking) continue;
      const maxHrs = (shiftName === 'DAY' && this.isFriday) ? 9 : 10;
      const seenUnits = {};

      for (const row of this.operations[shiftName]) {
        const uid = String(row.unitId || '').trim();
        if (!uid) continue;

        if (seenUnits[uid]) {
          statusBox.textContent = `Error: Unit ${uid} diinput lebih dari sekali pada ${shiftName} SHIFT.`;
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
        if ((end - start) > maxHrs) {
          statusBox.textContent = `Error: WH unit ${uid} (${shiftName} SHIFT) melebihi ${maxHrs} jam.`;
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
