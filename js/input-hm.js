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
   * Menambah 1 baris input unit baru ke tabel DAY atau NIGHT dan auto-fokus ke Combo Box Unit ID
   */
  addUnitRow(shiftName, autoFocus = false) {
    if (!this.shifts[shiftName].isWorking) return;
    const newIndex = this.operations[shiftName].length;
    this.operations[shiftName].push({
      unitId: '',
      model: '',
      hmStart: '',
      hmEnd: '',
      wh: 0,
      remarks: ''
    });
    this.renderShiftTable(shiftName);

    if (autoFocus) {
      setTimeout(() => {
        const selectEl = document.getElementById(`unit-select-${shiftName}-${newIndex}`);
        if (selectEl) selectEl.focus();
      }, 20);
    }
  },

  /**
   * Navigasi cepat menggunakan tombol Enter pada keyboard:
   * - Enter di Unit ID -> pindah ke HM Awal (atau langsung ke HM Akhir jika HM Awal terisi otomatis)
   * - Enter di HM Awal -> pindah ke HM Akhir
   * - Enter di HM Akhir -> otomatis tambah baris unit baru & fokus ke Combo Box Unit ID berikutnya
   */
  handleRowKeydown(event, shiftName, index, field) {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    if (field === 'unitId') {
      const startInput = document.getElementById(`hm-start-${shiftName}-${index}`);
      const endInput = document.getElementById(`hm-end-${shiftName}-${index}`);
      if (startInput && startInput.value !== '' && endInput) {
        endInput.focus();
        endInput.select();
      } else if (startInput) {
        startInput.focus();
      }
    } else if (field === 'hmStart') {
      const endInput = document.getElementById(`hm-end-${shiftName}-${index}`);
      if (endInput) {
        endInput.focus();
        endInput.select();
      }
    } else if (field === 'hmEnd') {
      const nextIndex = index + 1;
      if (nextIndex < this.operations[shiftName].length) {
        const nextSelect = document.getElementById(`unit-select-${shiftName}-${nextIndex}`);
        if (nextSelect) nextSelect.focus();
      } else {
        this.addUnitRow(shiftName, true);
      }
    }
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
            <select id="unit-select-${shiftName}-${idx}"
              onchange="InputHmModule.onRowChange('${shiftName}', ${idx}, 'unitId', this.value)"
              onkeydown="InputHmModule.handleRowKeydown(event, '${shiftName}', ${idx}, 'unitId')"
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
              onkeydown="InputHmModule.handleRowKeydown(event, '${shiftName}', ${idx}, 'hmStart')"
              class="w-28 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500" />
          </td>
          <td class="px-3 py-2">
            <input type="number" id="hm-end-${shiftName}-${idx}" step="0.1" value="${row.hmEnd}" placeholder="0.0"
              oninput="InputHmModule.onRowChange('${shiftName}', ${idx}, 'hmEnd', this.value)"
              onkeydown="InputHmModule.handleRowKeydown(event, '${shiftName}', ${idx}, 'hmEnd')"
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
