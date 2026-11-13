/**
 * js/population.js
 * Form Mandiri Admin untuk Menambah Unit Baru & Mengubah Status Populasi (W, SW, R, S)
 */

const PopulationModule = {
  /**
   * Merender daftar unit aktif pada site saat ini beserta form ubah status cepat
   */
  renderTable() {
    const tbody = document.getElementById('tbody-population-list');
    const searchInput = document.getElementById('pop-search-input');
    const countBadge = document.getElementById('pop-total-badge');

    if (!tbody) return;

    const keyword = String(searchInput?.value || '').trim().toLowerCase();
    const units = AuthModule.masterData.units || [];

    const filtered = units.filter(u => {
      if (!keyword) return true;
      return (
        u.unitId.toLowerCase().includes(keyword) ||
        u.model.toLowerCase().includes(keyword) ||
        u.equipment.toLowerCase().includes(keyword) ||
        u.brand.toLowerCase().includes(keyword)
      );
    });

    if (countBadge) {
      countBadge.textContent = `${filtered.length} Unit Aktif (${AuthModule.currentSite})`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-4 py-6 text-center text-sm text-slate-400">
            Tidak ada unit yang sesuai dengan pencarian.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      const badgeColor = {
        W: 'bg-emerald-100 text-emerald-700',
        SW: 'bg-blue-100 text-blue-700',
        R: 'bg-amber-100 text-amber-700'
      }[u.status] || 'bg-slate-100 text-slate-700';

      return `
        <tr class="border-b border-slate-100 text-sm hover:bg-slate-50">
          <td class="px-4 py-2.5 font-bold text-slate-800">${u.unitId}</td>
          <td class="px-4 py-2.5 text-slate-600">${u.equipment || '-'}</td>
          <td class="px-4 py-2.5 text-slate-600">${u.brand || '-'}</td>
          <td class="px-4 py-2.5 font-medium text-slate-800">${u.model}</td>
          <td class="px-4 py-2.5">
            <span class="px-2 py-0.5 text-xs font-semibold rounded ${badgeColor}">${u.status}</span>
          </td>
          <td class="px-4 py-2.5 text-right">
            <button type="button" onclick="PopulationModule.openStatusModal('${u.unitId}', '${u.model}', '${u.status}')"
              class="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200">
              Ubah Status
            </button>
          </td>
        </tr>
      `;
    }).join('');
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
  },

  /**
   * Membuka form inline/panel untuk mengubah status unit (misal menjadi S / Scrap)
   */
  openStatusModal(unitId, model, currentStatus) {
    const panel = document.getElementById('panel-update-status');
    if (!panel) return;

    document.getElementById('edit-unit-id').value = unitId;
    document.getElementById('edit-unit-label').textContent = `${unitId} (${model}) - Status Saat Ini: ${currentStatus}`;
    document.getElementById('edit-unit-status').value = currentStatus;
    document.getElementById('edit-unit-reason').value = '';

    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  closeStatusModal() {
    const panel = document.getElementById('panel-update-status');
    if (panel) panel.classList.add('hidden');
  },

  /**
   * Mengirim pembaruan status unit ke server (jika diubah ke S, unit otomatis keluar dari populasi aktif)
   */
  async submitStatusUpdate(event) {
    if (event) event.preventDefault();

    const statusBox = document.getElementById('pop-status-msg');
    const unitId = document.getElementById('edit-unit-id')?.value.trim();
    const newStatus = document.getElementById('edit-unit-status')?.value;
    const reason = document.getElementById('edit-unit-reason')?.value.trim();

    if (!reason) {
      statusBox.textContent = 'Keterangan / alasan perubahan status wajib diisi untuk log monitoring.';
      statusBox.className = 'text-sm text-rose-600 font-semibold';
      return;
    }

    const res = await callBackendApi('MANAGE_UNIT_POPULATION', {
      mode: 'UPDATE_STATUS',
      site: AuthModule.currentSite,
      unitId: unitId,
      status: newStatus,
      reason: reason
    });

    if (res.status === 'success') {
      statusBox.textContent = res.message;
      statusBox.className = 'text-sm text-emerald-600 font-semibold';
      this.closeStatusModal();
      await AuthModule.loadMasterData(AuthModule.currentSite);
      this.renderTable();
    } else {
      statusBox.textContent = res.message || 'Gagal memperbarui status unit.';
      statusBox.className = 'text-sm text-rose-600 font-semibold';
    }
  }
};
