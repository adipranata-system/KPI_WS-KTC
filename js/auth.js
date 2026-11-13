/**
 * js/auth.js
 * Manajemen Login, Logout, Sesi Pengguna, dan Pembatasan Menu Berdasarkan Role
 */

const AuthModule = {
  currentSite: 'TTLP',
  masterData: {
    units: [],
    allSiteUnits: [],
    models: [],
    components: {}
  },

  /**
   * Inisialisasi saat halaman pertama kali dibuka
   */
  init() {
    const session = getUserSession();
    if (session && session.username) {
      this.onLoginSuccess(session);
    } else {
      this.showLoginView();
    }
  },

  /**
   * Menangani proses submit form login
   */
  async login(username, password) {
    const cleanUser = String(username || '').trim();
    const cleanPass = String(password || '').trim();

    if (!cleanUser || !cleanPass) {
      return { status: 'error', message: 'Username dan password wajib diisi.' };
    }

    const res = await callBackendApi('LOGIN', {
      username: cleanUser,
      password: cleanPass
    });

    if (res.status === 'success' && res.user) {
      saveUserSession(res.user, cleanPass);
      const session = getUserSession();
      await this.onLoginSuccess(session);
      return { status: 'success' };
    } else {
      return { status: 'error', message: res.message || 'Login gagal.' };
    }
  },

  /**
   * Mengatur tampilan & hak akses setelah login berhasil
   */
  async onLoginSuccess(session) {
    const loginScreen = document.getElementById('login-screen');
    const appShell = document.getElementById('app-shell');

    if (loginScreen) loginScreen.classList.add('hidden');
    if (appShell) appShell.classList.remove('hidden');

    // Tampilkan info user di header
    const userBadge = document.getElementById('user-display-name');
    const roleBadge = document.getElementById('user-role-badge');
    if (userBadge) userBadge.textContent = session.fullName || session.username;
    if (roleBadge) roleBadge.textContent = `${session.role} (${session.siteAccess})`;

    // Atur pemilihan site berdasarkan hak akses
    const siteSelector = document.getElementById('global-site-selector');
    if (siteSelector) {
      if (session.siteAccess === 'ALL') {
        siteSelector.disabled = false;
        this.currentSite = siteSelector.value || 'TTLP';
      } else {
        siteSelector.value = session.siteAccess;
        siteSelector.disabled = true;
        this.currentSite = session.siteAccess;
      }
    }

    // Atur visibilitas menu navigasi berdasarkan Role
    this.applyRolePermissions(session.role);

    // Muat data master unit & model untuk site aktif
    await this.loadMasterData(this.currentSite);

    // Trigger pemuatan dashboard awal
    if (typeof DashboardModule !== 'undefined' && typeof DashboardModule.load === 'function') {
      DashboardModule.load();
    }
  },

  /**
   * Menyembunyikan/menampilkan menu sesuai Role:
   * - Superadmin: Semua menu & semua site
   * - Admin: Semua menu (khusus site miliknya)
   * - Viewer: Hanya Dashboard (tanpa menu Input HM, Upload Excel, Populasi Unit)
   */
  applyRolePermissions(role) {
    const adminOnlyMenus = document.querySelectorAll('.admin-only-menu');
    const isViewer = (role === 'Viewer');

    adminOnlyMenus.forEach(el => {
      if (isViewer) {
        el.classList.add('hidden');
      } else {
        el.classList.remove('hidden');
      }
    });
  },

  /**
   * Mengambil daftar unit aktif, seluruh unit site, & model dari DB_MASTER
   */
  async loadMasterData(site) {
    const targetSite = String(site || this.currentSite).toUpperCase();
    this.currentSite = targetSite;

    const res = await callBackendApi('GET_MASTER_DATA', { site: targetSite });
    if (res.status === 'success') {
      this.masterData = {
        units: res.units || [],
        allSiteUnits: res.allSiteUnits || res.units || [],
        models: res.models || [],
        components: res.components || {}
      };
      this.populateModelFilters();
    } else {
      console.error('Gagal memuat master data:', res.message);
    }
  },

  /**
   * Mengisi dropdown filter Model di Dashboard
   */
  populateModelFilters() {
    const modelSelect = document.getElementById('dash-filter-model');
    if (!modelSelect) return;

    const currentVal = modelSelect.value;
    modelSelect.innerHTML = '<option value="ALL">Semua Model Unit</option>';

    this.masterData.models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      modelSelect.appendChild(opt);
    });

    if (this.masterData.models.includes(currentVal)) {
      modelSelect.value = currentVal;
    }
  },

  /**
   * Menangani perpindahan site (khusus Superadmin / Viewer dengan akses ALL)
   */
  async switchSite(newSite) {
    this.currentSite = String(newSite).toUpperCase();
    await this.loadMasterData(this.currentSite);

    // Refresh halaman yang sedang aktif
    if (typeof DashboardModule !== 'undefined' && typeof DashboardModule.load === 'function') {
      DashboardModule.load();
    }
    if (typeof InputHmModule !== 'undefined' && typeof InputHmModule.loadDate === 'function') {
      InputHmModule.loadDate();
    }
    if (typeof PopulationModule !== 'undefined' && typeof PopulationModule.renderTable === 'function') {
      PopulationModule.renderTable();
    }
  },

  /**
   * Logout & bersihkan sesi
   */
  logout() {
    clearUserSession();
    this.showLoginView();
  },

  showLoginView() {
    const loginScreen = document.getElementById('login-screen');
    const appShell = document.getElementById('app-shell');
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (appShell) appShell.classList.add('hidden');
  }
};
