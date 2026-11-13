/**
 * js/population.js
 * Form Mandiri Admin untuk Menarik Data Populasi dari Master, Mengubah Status Massal, & Menambah Unit Baru
 */

const PopulationModule = {
  /**
   * Menarik ulang seluruh data unit site aktif langsung dari DB_MASTER
   */
  async pullFromMaster() {
    const btnPull = document.getElementById('btn-pull-master');
    const statusBox = document.getElementById('pop-status-msg');

    if (btnPull) {
      btnPull.disabled = true;
      btnPull.textContent = 'Menarik Data...';
    }
    if (statusBox) {
      statusBox.textContent = `Menarik data populasi unit ${AuthModule.currentSite} dari Master Data...`;
      statusBox.className = 'text-sm text-blue-600 font-medium';
    }

    await AuthModule.loadMasterData(AuthModule.currentSite);
    this.renderTable();

    if (btnPull) {
      btnPull.disabled = false;
      btnPull.textContent = 'Tarik Data dari Master';
    }
    if (statusBox) {
      const total = (AuthModule.masterData.allSiteUnits || []).length;
      statusBox.textContent = `Berhasil menarik ${total} unit untuk site ${AuthModule.currentSite}. Ubah status pada baris yang berbeda lalu klik Simpan Perubahan Status.`;
      statusBox.className = 'text-sm text-emerald-600 font-semibold';
    }
  },

  /**
   * Merender seluruh unit milik site saat ini beserta Combo Box status langsung di tabel
   */
  renderTable() {
    const tbody = document.getElementById('tbody-population-list');
    const searchInput = document.getElementById('pop-search-input');
    const countBadge = document.getElementById('pop-total-badge');

    if (!tbody) return;

    const keyword = String(searchInput?.value || '').trim().toLowerCase();
    const allUnits = AuthModule.masterData.allSiteUnits || AuthModule.masterData.units || [];

    const filtered = allUnits.filter(u => {
      if (!keyword) return true;
      return (
        u.unitId.toLowerCase().includes(keyword) ||
        u.model.toLowerCase().includes(keyword) ||
        u.equipment.toLowerCase().includes(keyword) ||
        u.brand.toLowerCase().includes(keyword) ||
        u.category.toLowerCase().includes(keyword)
      );
    });

    const activeCount = allUnits.filter(u => ['W', 'SW', 'R'].includes(u.status)).length;
    if (countBadge) {
      countBadge.textContent = `${activeCount} Aktif / ${allUnits.length} Total (${AuthModule.currentSite})`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-4 py-6 text-center text-sm text-slate-400">
            Tidak ada unit ditemukan. Klik "Tarik Data dari Master" untuk memuat ulang.
          </td>
        </tr>`;
      return;
    }

    const statusOptions = [
      { val: 'W', label: 'W (Working)' },
      { val: 'SW', label: 'SW (Standby Working)' },
      { val: 'R', label: 'R (Repair)' },
      { val: 'S', label: 'S (Scrap / Nonaktif)' }
    ];

    tbody.innerHTML = filtered.map(u => {
      const isScrap = u.status === 'S';
      const rowBg = isScrap ? 'bg-slate-50/80 text-slate-400' : 'hover:bg-slate-50';
      const selectStyle = {
        W: 'border-emerald-300 bg-emerald-50 text-emerald-800',
        SW: 'border-blue-300 bg-blue-50 text-blue-800',
        R: 'border-amber-300 bg-amber-50 text-amber-800',
        S: 'border-rose-300 bg-rose-50 text-rose-700'
      }[u.status] || 'border-slate-300 bg-white text-slate-700';

      const optsHtml = statusOptions.map(opt => {
        const sel = u.status === opt.val ? 'selected' : '';
        return `<option value="${opt.val}" ${sel}>${opt.label}</option>`;
      }).join('');

      return `
        <tr class="border-b border-slate-100 text-xs ${rowBg}">
          <td class="px-4 py-2 font-bold ${isScrap ? 'text-slate-500 line-through' : 'text-slate-800'}">${u.unitId}</td>
          <td class="px-4 py-2">${u.category || '-'}</td>
          <td class="px-4 py-2">${u.equipment || '-'}</td>
          <td class="px-4 py-2">${u.brand || '-'}</td>
          <td class="px-4 py-2 font-medium">${u.model}</td>
          <td class="px-4 py-2">
            <select data-unit-id="${u.unitId}" data-old-status="${u.status}"
              onchange="PopulationModule.onInlineStatusChange(this)"
              class="pop-status-select px-2.5 py-1 text-xs font-semibold rounded border focus:outline-none ${selectStyle}">
              ${optsHtml}
            </select>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Memberi tanda visual pada baris yang statusnya diubah admin sebelum disimpan
   */
  onInlineStatusChange(selectEl) {
    const oldStatus = selectEl.getAttribute('data-old-status');
    const newStatus = selectEl.value;
    if (oldStatus !== newStatus) {
      selectEl.classList.add('ring-2', 'ring-blue-500');
    } else {
      selectEl.classList.remove('ring-2', 'ring-blue-500');
    }
  },

  /**
   * Menyimpan seluruh perubahan status unit yang diubah di tabel ke DB_MASTER sekaligus
   */
  async saveBulkStatus() {
    const statusBox = document.getElementById('pop-status-msg');
    const btnSave = document.getElementById('btn-save-bulk-status');
    const selects = document.querySelectorAll('.pop-status-select');

    const changes = [];
    selects.forEach(sel => {
      const unitId = sel.getAttribute('data-unit-id');
      const oldStatus = sel.getAttribute('data-old-status');
      const newStatus = sel.value;
      if (unitId && oldStatus !== newStatus) {
        changes.push({ unitId: unitId, status: newStatus });
      }
    });

    if (changes.length === 0) {
      statusBox.textContent = 'Tidak ada perubahan status yang perlu disimpan.';
      statusBox.className = 'text-sm text-amber-600 font-semibold';
      return;
    }

    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = `Menyimpan (${changes.length})...`;
    }

    const res = await callBackendApi('MANAGE_UNIT_POPULATION', {
      mode: 'BULK_UPDATE_STATUS',
      site: AuthModule.currentSite,
      changes: changes
    });

    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = 'Simpan Perubahan Status';
    }

    if (res.status === 'success') {
      statusBox.textContent = res.message;
      statusBox.className = 'text-sm text-emerald-600 font-semibold';
      await AuthModule.loadMasterData(AuthModule.currentSite);
      this.renderTable();
    } else {
      statusBox.textContent = res.message || 'Gagal menyimpan perubahan status.';
      statusBox.className = 'text-sm text-rose-600 font-semibold';
    }
  },

  /**
   * Menambah unit baru ke site aktif melalui DB_MASTER
   */
  async addNewUnit(event) {
    if (event) event.preventDefault();

    const statusBox = document.getElementById('pop-status-msg');
    const btnAdd = document.getElementById('btn-add-unit');

    const unitId = document.getElementById('new-unit-id')?.value.trim();
    const category = document.getElementById('new-unit-category')?.value.trim();
    const equipment = document.getElementById('new-unit-equipment')?.value.trim();
    const brand = document.getElementById('new-unit-brand')?.value.trim();
    const model = document.getElementById('new-unit-model')?.value.trim();
    const status = document.getElementById('new-unit-status')?.value || 'W';
    const reason = document.getElementById('new-unit-reason')?.value.trim() || 'Penambahan unit baru di site';

    if (!unitId || !model) {
      statusBox.textContent = 'Unit ID dan Model wajib diisi.';
      statusBox.className = 'text-sm text-rose-600 font-semibold';
      return;
    }

    if (btnAdd) {
      btnAdd.disabled = true;
      btnAdd.textContent = 'Menyimpan...';
    }

    const res = await callBackendApi('MANAGE_UNIT_POPULATION', {
      mode: 'ADD',
      site: AuthModule.currentSite,
      unitId: unitId,
      category: category,
      equipment: equipment,
      brand: brand,
      model: model,
      status: status,
      reason: reason
    });

    if (btnAdd) {
      btnAdd.disabled = false;
      btnAdd.textContent = 'Tambah Unit';
    }

    if (res.status === 'success') {
      statusBox.textContent = res.message;
      statusBox.className = 'text-sm text-emerald-600 font-semibold';
      document.getElementById('form-add-unit')?.reset();
      await AuthModule.loadMasterData(AuthModule.currentSite);
      this.renderTable();
    } else {
      statusBox.textContent = res.message || 'Gagal menambah unit.';
      statusBox.className = 'text-sm text-rose-600 font-semibold';
    }
  }
};
