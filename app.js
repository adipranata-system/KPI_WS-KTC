/**
 * app.js
 * Machine Performance System (MPS) - PT. KTC Coal Mining & Energy
 * System Architect & Designed by: Adi Pranata
 * Copyright (c) 2026 Adi Pranata. All Rights Reserved.
 */

const APP_CONFIG = {
  APP_NAME: 'MACHINE PERFORMANCE SYSTEM',
  COMPANY_NAME: 'PT. KTC COAL MINING & ENERGY',
  API_URL: 'https://script.google.com/macros/s/AKfycbwx0hDu5L7zKA_nMIz4eb0h9Z2mDGHYNoZD2tq_YYg16tET8ZbtPQAVW52fvcS0ehzopQ/exec',
  KPI_TARGET: 85,
  MTTR_TARGET: 4.0,
  MTBR_TARGET: 40.0,
  SITES: ['TTLP', 'TNPN']
};

let activeTabId = 'tab-dashboard';

/**
 * Toggle Show/Hide Password on Login Screen
 */
function togglePasswordVisibility() {
  const passInput = document.getElementById('login-password');
  const eyeOpen = document.getElementById('icon-eye-open');
  const eyeClosed = document.getElementById('icon-eye-closed');
  if (!passInput) return;

  const isHidden = passInput.type === 'password';
  passInput.type = isHidden ? 'text' : 'password';
  if (eyeOpen && eyeClosed) {
    eyeOpen.classList.toggle('hidden', isHidden);
    eyeClosed.classList.toggle('hidden', !isHidden);
  }
}

/**
 * Universal CSV Download Helper
 * Uses 'sep=,' directive on line 1 so Microsoft Excel on Indonesian Windows
 * automatically splits every column cleanly instead of merging into Column A.
 */
function downloadCsvFile(filename, headers, rows, btnElement = null) {
  const originalHtml = btnElement ? btnElement.innerHTML : '';
  if (btnElement) {
    btnElement.disabled = true;
    btnElement.innerHTML = `
      <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      <span>Exporting CSV...</span>`;
  }

  setTimeout(() => {
    try {
      const escapeCell = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvLines = ['sep=,', headers.map(escapeCell).join(',')];
      rows.forEach((row) => {
        csvLines.push(row.map(escapeCell).join(','));
      });

      const csvContent = csvLines.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      if (btnElement) {
        setTimeout(() => {
          btnElement.disabled = false;
          btnElement.innerHTML = originalHtml;
        }, 350);
      }
    }
  }, 150);
}

/**
 * Non-blocking Toast Notification Helper
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const styles = {
    success: 'bg-emerald-600 text-white border-emerald-700',
    error: 'bg-rose-600 text-white border-rose-700',
    warning: 'bg-amber-500 text-slate-950 border-amber-600',
    info: 'bg-slate-900 text-white border-slate-700'
  }[type] || 'bg-slate-900 text-white border-slate-700';

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold transition-all duration-300 transform translate-y-0 opacity-100 ${styles}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3400);
}

/**
 * Backend API Request Handler (Zero Storage Disclosure)
 */
async function callBackendApi(action, payload = {}, customAuth = null) {
  const session = getUserSession();

  if (session && session.isPreviewMode) {
    return getDemoApiResponse(action, payload, session);
  }

  const auth = customAuth || (session ? {
    username: session.username,
    password: session.password
  } : {});

  try {
    const response = await fetch(APP_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: action,
        auth: auth,
        payload: payload
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Status ${response.status}`);
    }

    const result = await response.json();
    if (result && result.message) {
      result.message = sanitizeSystemMessage(result.message);
    }
    return result;
  } catch (error) {
    console.error('Enterprise Server Request Failed:', error);
    return {
      status: 'error',
      message: 'Unable to connect to Central Fleet Database: ' + error.message
    };
  }
}

/**
 * Sanitizes any storage technology terms from server messages
 */
function sanitizeSystemMessage(msg) {
  return String(msg || '')
    .replace(/google\s*sheets?/gi, 'Central Fleet Database')
    .replace(/spreadsheet/gi, 'Fleet Database')
    .replace(/apps\s*script/gi, 'Enterprise Server');
}

/**
 * Session Storage Management
 */
function saveUserSession(userObj, rawPassword, isPreviewMode = false) {
  const sessionData = {
    username: userObj.username,
    password: rawPassword,
    fullName: userObj.fullName,
    role: userObj.role,
    siteAccess: userObj.siteAccess,
    isPreviewMode: Boolean(isPreviewMode)
  };
  sessionStorage.setItem('mps_ktc_session', JSON.stringify(sessionData));
}

function getUserSession() {
  const raw = sessionStorage.getItem('mps_ktc_session');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function clearUserSession() {
  sessionStorage.removeItem('mps_ktc_session');
}

/**
 * Navigation Tab Switcher
 */
function switchAppTab(tabId) {
  const session = getUserSession();
  const roleUpper = String(session?.role || '').trim().toUpperCase();
  if ((tabId === 'tab-population' || tabId === 'tab-report') && !['SUPERADMIN', 'PLANNER'].includes(roleUpper)) {
    showToast('Access denied: This module is restricted to Planner and Superadmin roles.', 'error');
    return;
  }

  activeTabId = tabId;

  document.querySelectorAll('.app-tab-panel').forEach((panel) => {
    if (panel.id === tabId) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  });

  document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
    const isTarget = btn.getAttribute('data-tab') === tabId;
    if (isTarget) {
      btn.classList.remove('border-transparent', 'text-slate-300', 'text-amber-300');
      btn.classList.add('border-blue-500', 'text-white');
    } else {
      btn.classList.remove('border-blue-500', 'text-white');
      btn.classList.add('border-transparent');
      if (btn.getAttribute('data-tab') === 'tab-report') {
        btn.classList.add('text-amber-300');
      } else {
        btn.classList.add('text-slate-300');
      }
    }
  });

  if (tabId === 'tab-dashboard') {
    DashboardModule.load();
  } else if (tabId === 'tab-history') {
    HistoryModule.load();
  } else if (tabId === 'tab-input-hm') {
    InputHmModule.init();
    InputHmModule.loadDate();
  } else if (tabId === 'tab-population') {
    PopulationModule.init();
    PopulationModule.loadMonth();
  } else if (tabId === 'tab-report') {
    ReportModule.init();
    ReportModule.load();
  }
}

/**
 * Global Refresh Trigger
 */
async function refreshCurrentView() {
  const icon = document.getElementById('icon-global-refresh');
  if (icon) icon.classList.add('animate-spin');

  await AuthModule.loadMasterData(AuthModule.currentSite);
  if (activeTabId === 'tab-upload-bd') {
    UploadExcelModule.resetForm();
  } else {
    await switchAppTab(activeTabId);
  }

  if (icon) icon.classList.remove('animate-spin');
  showToast(`Latest data refreshed for site ${AuthModule.currentSite}.`, 'info');
}

/* ============================================================================
 * 1. AUTHENTICATION & ROLE ACCESS CONTROL MODULE
 * ============================================================================ */
const AuthModule = {
  currentSite: 'TTLP',
  masterData: {
    units: [],
    allSiteUnits: [],
    models: [],
    components: {}
  },

  init() {
    const rememberedUser = localStorage.getItem('mps_remembered_user');
    const userInput = document.getElementById('login-username');
    const rememberChk = document.getElementById('login-remember-user');
    if (rememberedUser && userInput) {
      userInput.value = rememberedUser;
      if (rememberChk) rememberChk.checked = true;
    }

    const formLogin = document.getElementById('form-login');
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username')?.value || '';
        const p = document.getElementById('login-password')?.value || '';
        const errBox = document.getElementById('login-error-msg');
        const btn = document.getElementById('btn-login-submit');

        if (errBox) errBox.textContent = '';
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Authenticating...';
        }

        const res = await this.login(u, p);

        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Sign In';
        }

        if (res.status !== 'success' && errBox) {
          errBox.textContent = res.message;
        }
      });
    }

    const session = getUserSession();
    if (session && session.username) {
      this.onLoginSuccess(session);
    } else {
      this.showLoginView();
    }
  },

  async login(username, password) {
    const cleanUser = String(username || '').trim();
    const cleanPass = String(password || '').trim();

    if (!cleanUser || !cleanPass) {
      return { status: 'error', message: 'Username and password are required.' };
    }

    const rememberChk = document.getElementById('login-remember-user');
    if (rememberChk && rememberChk.checked) {
      localStorage.setItem('mps_remembered_user', cleanUser);
    } else {
      localStorage.removeItem('mps_remembered_user');
    }

    const res = await callBackendApi('LOGIN', {
      username: cleanUser,
      password: cleanPass
    });

    if (res.status === 'success' && res.user) {
      saveUserSession(res.user, cleanPass, false);
      const session = getUserSession();
      await this.onLoginSuccess(session);
      showToast(`Welcome back, ${res.user.fullName || res.user.username}!`, 'success');
      return { status: 'success' };
    }

    return { status: 'error', message: res.message || 'Invalid username or password.' };
  },

  async enterPreviewMode() {
    const demoUser = {
      username: 'demo.superadmin',
      fullName: 'Adi Pranata (Demo)',
      role: 'Superadmin',
      siteAccess: 'ALL'
    };
    saveUserSession(demoUser, 'demo', true);
    await this.onLoginSuccess(getUserSession());
    showToast('Entered Live UI Demo Mode (Simulated Fleet Dataset).', 'info');
  },

  async onLoginSuccess(session) {
    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('app-shell')?.classList.remove('hidden');

    const userBadge = document.getElementById('user-display-name');
    const roleBadge = document.getElementById('user-role-badge');
    if (userBadge) userBadge.textContent = session.fullName || session.username;
    if (roleBadge) roleBadge.textContent = `${session.role} (${session.siteAccess})`;

    const siteSelector = document.getElementById('global-site-selector');
    const accessUpper = String(session.siteAccess || 'ALL').toUpperCase();
    if (siteSelector) {
      if (accessUpper === 'ALL') {
        siteSelector.disabled = false;
        this.currentSite = siteSelector.value || 'TTLP';
      } else {
        siteSelector.value = accessUpper;
        siteSelector.disabled = true;
        this.currentSite = accessUpper;
      }
    }

    this.applyRolePermissions(session.role);
    await this.loadMasterData(this.currentSite);
    this.applyRolePermissions(session.role);
    switchAppTab('tab-dashboard');
  },

  /**
   * Role Permissions Matrix (Case-Insensitive):
   * - Superadmin: All tabs (including Unit Population & Executive Report) & all sites
   * - Planner: Monitoring + Operational + Unit Population + Executive Report (locked to assigned Site_Access)
   * - Admin: Monitoring + Daily Operational Input only (NO Unit Population & NO Executive Report)
   * - Viewer: KPI Dashboard & KPI History only
   */
  applyRolePermissions(role) {
    const roleUpper = String(role || '').trim().toUpperCase();
    const adminMenus = document.querySelectorAll('.admin-only-menu');
    const plannerMenus = document.querySelectorAll('.planner-only-menu');

    const canOperate = ['SUPERADMIN', 'PLANNER', 'ADMIN'].includes(roleUpper);
    const canPlanOrSuper = ['SUPERADMIN', 'PLANNER'].includes(roleUpper);

    adminMenus.forEach((el) => {
      if (canOperate) el.classList.remove('hidden');
      else el.classList.add('hidden');
    });

    plannerMenus.forEach((el) => {
      if (canPlanOrSuper) el.classList.remove('hidden');
      else el.classList.add('hidden');
    });
  },

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
      this.populateUnitDatalist();
    } else {
      showToast(res.message || 'Failed to load fleet master data.', 'error');
    }
  },

  populateModelFilters() {
    ['dash-filter-model', 'hist-filter-model', 'rep-filter-model'].forEach((selectId) => {
      const el = document.getElementById(selectId);
      if (!el) return;
      const prev = el.value;
      el.innerHTML = '<option value="ALL">All Unit Models</option>';
      this.masterData.models.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        el.appendChild(opt);
      });
      if (this.masterData.models.includes(prev)) {
        el.value = prev;
      }
    });
  },

  populateUnitDatalist() {
    const dl = document.getElementById('datalist-active-units');
    if (!dl) return;
    dl.innerHTML = (this.masterData.units || [])
      .map((u) => `<option value="${u.unitId}">${u.model} (${u.status})</option>`)
      .join('');
  },

  async switchSite(newSite) {
    const session = getUserSession();
    const accessUpper = String(session?.siteAccess || 'ALL').toUpperCase();
    const cleanNew = String(newSite).toUpperCase();

    if (accessUpper !== 'ALL' && accessUpper !== cleanNew) {
      showToast(`Access denied: Your account is restricted to site ${accessUpper}.`, 'error');
      const sel = document.getElementById('global-site-selector');
      if (sel) sel.value = accessUpper;
      return;
    }

    this.currentSite = cleanNew;
    await this.loadMasterData(this.currentSite);
    if (activeTabId === 'tab-upload-bd') {
      UploadExcelModule.resetForm();
    } else {
      switchAppTab(activeTabId);
    }
    showToast(`Switched active site to ${this.currentSite}.`, 'info');
  },

  logout() {
    clearUserSession();
    this.showLoginView();
    showToast('You have been logged out.', 'info');
  },

  showLoginView() {
    document.getElementById('login-screen')?.classList.remove('hidden');
    document.getElementById('app-shell')?.classList.add('hidden');
  }
};

/* ============================================================================
 * 2. KPI DASHBOARD MODULE
 * ============================================================================ */
const DashboardModule = {
  trendChartInstance: null,
  paretoChartInstance: null,
  latestData: null,
  sortState: { field: 'unitId', asc: true },

  init() {
    const startInput = document.getElementById('dash-start-date');
    const endInput = document.getElementById('dash-end-date');
    if (startInput && endInput && (!startInput.value || !endInput.value)) {
      this.applyDatePreset('MTD', false);
    }
  },

  clearPresetHighlight() {
    document.querySelectorAll('.dash-preset-btn').forEach((btn) => {
      btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
      btn.classList.add('bg-slate-100', 'text-slate-700', 'border-slate-200');
    });
  },

  applyDatePreset(preset, triggerLoad = true) {
    const startInput = document.getElementById('dash-start-date');
    const endInput = document.getElementById('dash-end-date');
    if (!startInput || !endInput) return;

    const now = new Date();
    const fmt = (dt) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    let startStr = '';
    let endStr = fmt(now);
    let label = '';

    if (preset === 'MTD') {
      startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      label = 'Month-to-Date (MTD)';
    } else if (preset === 'LAST_7') {
      const d7 = new Date(now);
      d7.setDate(now.getDate() - 6);
      startStr = fmt(d7);
      label = 'Last 7 Days';
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      startStr = fmt(yest);
      endStr = fmt(yest);
      label = 'Yesterday';
    } else if (preset === 'LAST_MONTH') {
      const firstLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastLast = new Date(now.getFullYear(), now.getMonth(), 0);
      startStr = fmt(firstLast);
      endStr = fmt(lastLast);
      label = 'Last Month';
    }

    startInput.value = startStr;
    endInput.value = endStr;

    document.querySelectorAll('.dash-preset-btn').forEach((btn) => {
      const isMatch = btn.getAttribute('data-preset') === preset;
      if (isMatch) {
        btn.classList.remove('bg-slate-100', 'text-slate-700', 'border-slate-200');
        btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
      } else {
        btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        btn.classList.add('bg-slate-100', 'text-slate-700', 'border-slate-200');
      }
    });

    if (triggerLoad) {
      showToast(`Period applied: ${label} (${startStr} to ${endStr})`, 'info');
      this.load();
    }
  },

  async load() {
    this.init();

    const startDate = document.getElementById('dash-start-date')?.value;
    const endDate = document.getElementById('dash-end-date')?.value;
    const model = document.getElementById('dash-filter-model')?.value || 'ALL';
    const statusBox = document.getElementById('dash-status-msg');

    if (!startDate || !endDate) return;

    if (statusBox) {
      statusBox.textContent = 'Loading KPI metrics...';
      statusBox.className = 'text-xs text-blue-600 font-medium';
    }

    const res = await callBackendApi('GET_DASHBOARD_KPI', {
      site: AuthModule.currentSite,
      startDate: startDate,
      endDate: endDate,
      model: model
    });

    if (res.status === 'success') {
      this.latestData = res;
      const target = res.target || APP_CONFIG.KPI_TARGET;
      this.renderKpiCards(res.overall, target);
      this.renderTimeDistributionBar(res.overall);
      this.renderTrendChart(res.trend || [], target);
      this.renderParetoChart(res.pareto || []);
      this.renderActiveBreakdowns(res.activeBreakdowns || []);
      this.renderModelTable(res.byModel || [], target);
      this.renderUnitTable();

      if (statusBox) {
        statusBox.textContent = `KPI metrics for ${res.site} (${startDate} to ${endDate}) updated.`;
        statusBox.className = 'text-xs text-emerald-600 font-semibold';
      }
    } else if (statusBox) {
      statusBox.textContent = res.message || 'Failed to load KPI dashboard.';
      statusBox.className = 'text-xs text-rose-600 font-semibold';
    }
  },

  renderKpiCards(overall, target) {
    if (!overall) return;

    const setPercentCard = (idVal, idBadge, val) => {
      const elVal = document.getElementById(idVal);
      const elBadge = document.getElementById(idBadge);
      if (elVal) elVal.textContent = val.toFixed(2) + '%';
      if (elBadge) {
        const isPass = val >= target;
        elBadge.textContent = isPass ? `Target ≥ ${target}% (Passed)` : `Target ≥ ${target}% (Below)`;
        elBadge.className = isPass
          ? 'inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-700'
          : 'inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-700';
      }
    };

    setPercentCard('kpi-val-pa', 'kpi-badge-pa', overall.pa || 0);
    setPercentCard('kpi-val-ma', 'kpi-badge-ma', overall.ma || 0);
    setPercentCard('kpi-val-ua', 'kpi-badge-ua', overall.ua || 0);

    const mttrVal = Number(overall.mttr) || 0;
    const elMttr = document.getElementById('kpi-val-mttr');
    const badgeMttr = document.getElementById('kpi-badge-mttr');
    if (elMttr) elMttr.textContent = mttrVal.toFixed(2) + ' Hrs';
    if (badgeMttr) {
      const ok = mttrVal <= APP_CONFIG.MTTR_TARGET;
      badgeMttr.textContent = ok ? `Target ≤ ${APP_CONFIG.MTTR_TARGET}h (Optimal)` : `Target ≤ ${APP_CONFIG.MTTR_TARGET}h (High)`;
      badgeMttr.className = ok
        ? 'inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-700'
        : 'inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800';
    }

    const mtbrVal = Number(overall.mtbr) || 0;
    const elMtbr = document.getElementById('kpi-val-mtbr');
    const badgeMtbr = document.getElementById('kpi-badge-mtbr');
    if (elMtbr) elMtbr.textContent = mtbrVal.toFixed(2) + ' Hrs';
    if (badgeMtbr) {
      const ok = mtbrVal >= APP_CONFIG.MTBR_TARGET;
      badgeMtbr.textContent = ok ? `Target ≥ ${APP_CONFIG.MTBR_TARGET}h (Optimal)` : `Target ≥ ${APP_CONFIG.MTBR_TARGET}h (Watch)`;
      badgeMtbr.className = ok
        ? 'inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-700'
        : 'inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800';
    }
  },

  renderTimeDistributionBar(overall) {
    if (!overall) return;
    const wh = Number(overall.wh) || 0;
    const bdUnsch = Number(overall.bdUnsched) || 0;
    const bdSch = Number(overall.bdSched) || 0;
    const rain = Number(overall.rainHrs) || 0;
    const stby = Number(overall.stbyHrs) || 0;
    const totalCal = Math.round((wh + bdUnsch + bdSch + rain + stby) * 10) / 10;

    const calBadge = document.getElementById('kpi-total-cal-badge');
    if (calBadge) calBadge.textContent = `Total Calendar: ${totalCal.toFixed(1)} Hrs (100%)`;

    const pct = (val) => (totalCal > 0 ? (val / totalCal) * 100 : 0);
    const pWh = pct(wh);
    const pUnsch = pct(bdUnsch);
    const pSch = pct(bdSch);
    const pRain = pct(rain);
    const pStby = pct(stby);

    const setLeg = (id, hrs, p, extra = '') => {
      const el = document.getElementById(id);
      if (el) el.textContent = `${hrs.toFixed(1)}h (${p.toFixed(1)}%)${extra}`;
    };

    setLeg('leg-wh', wh, pWh);
    setLeg('leg-bd-unsch', bdUnsch, pUnsch, overall.freqUnsched ? ` • ${overall.freqUnsched}x` : '');
    setLeg('leg-bd-sch', bdSch, pSch);
    setLeg('leg-rain', rain, pRain);
    setLeg('leg-stby', stby, pStby);

    const bar = document.getElementById('kpi-time-bar');
    if (!bar) return;

    if (totalCal <= 0) {
      bar.innerHTML = '<div class="w-full flex items-center justify-center text-slate-400">No calendar hours recorded</div>';
      return;
    }

    const segments = [
      { label: 'Working (WH)', hrs: wh, p: pWh, bg: 'bg-emerald-500' },
      { label: 'BD Unscheduled', hrs: bdUnsch, p: pUnsch, bg: 'bg-rose-500' },
      { label: 'BD Scheduled', hrs: bdSch, p: pSch, bg: 'bg-amber-400 text-slate-900' },
      { label: 'Rain / Slippery', hrs: rain, p: pRain, bg: 'bg-sky-500' },
      { label: 'Standby', hrs: stby, p: pStby, bg: 'bg-slate-400' }
    ];

    bar.innerHTML = segments
      .filter((s) => s.p > 0)
      .map((s) => {
        const innerText = s.p >= 7 ? `${s.p.toFixed(1)}%` : '';
        return `<div style="width: ${s.p.toFixed(2)}%" title="${s.label}: ${s.hrs.toFixed(1)} Hrs (${s.p.toFixed(1)}%)"
          class="${s.bg} h-full flex items-center justify-center transition-all duration-300 border-r border-white/20 last:border-r-0">
          ${innerText}
        </div>`;
      })
      .join('');
  },

  renderTrendChart(trendList, target) {
    const canvas = document.getElementById('chart-kpi-trend');
    if (!canvas || typeof Chart === 'undefined') return;
    if (this.trendChartInstance) this.trendChartInstance.destroy();

    const labels = trendList.map((t) => t.date.slice(5));
    this.trendChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'PA (%)',
            data: trendList.map((t) => t.pa),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            tension: 0.25,
            borderWidth: 2
          },
          {
            label: 'MA (%)',
            data: trendList.map((t) => t.ma),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            tension: 0.25,
            borderWidth: 2
          },
          {
            label: 'UA (%)',
            data: trendList.map((t) => t.ua),
            borderColor: '#d97706',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            tension: 0.25,
            borderWidth: 2
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
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 100, ticks: { callback: (v) => v + '%' } }
        }
      }
    });
  },

  renderParetoChart(paretoList) {
    const canvas = document.getElementById('chart-component-pareto');
    if (!canvas || typeof Chart === 'undefined') return;
    if (this.paretoChartInstance) this.paretoChartInstance.destroy();

    const top10 = paretoList.slice(0, 10);
    this.paretoChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top10.map((p) => p.component),
        datasets: [
          {
            label: 'Unscheduled BD Hours',
            data: top10.map((p) => p.totalHours),
            backgroundColor: '#f43f5e',
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  },

  calculateDownDuration(startDate, timeIn) {
    if (!startDate) return { text: '-', isCritical: false };
    const parts = startDate.split('-').map(Number);
    const tParts = String(timeIn || '06:00').split(':').map(Number);
    const startMs = new Date(parts[0], parts[1] - 1, parts[2], tParts[0] || 0, tParts[1] || 0).getTime();
    const diffHrs = Math.max(0, (Date.now() - startMs) / 3600000);
    return {
      text: `${diffHrs.toFixed(1)} Hrs`,
      isCritical: diffHrs >= 24
    };
  },

  renderActiveBreakdowns(list) {
    const tbody = document.getElementById('tbody-active-bd');
    const badge = document.getElementById('badge-active-bd-count');
    if (!tbody) return;

    if (badge) badge.textContent = `${list.length} Units Down`;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="px-4 py-4 text-center text-xs text-slate-400">
            No units currently in active Breakdown (Open) status.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = list
      .map((item) => {
        const dur = this.calculateDownDuration(item.startDate, item.timeIn);
        const durBadge = dur.isCritical
          ? `<span class="px-2 py-0.5 text-[11px] font-bold bg-rose-600 text-white rounded">${dur.text} (&gt;24h)</span>`
          : `<span class="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded">${dur.text}</span>`;

        return `
          <tr class="border-b border-slate-100 text-xs hover:bg-rose-50/40">
            <td class="px-3 py-2 font-bold text-rose-700">${item.unitId}</td>
            <td class="px-3 py-2 font-medium text-slate-700">${item.model}</td>
            <td class="px-3 py-2">${item.startDate} (${item.timeIn})</td>
            <td class="px-3 py-2">${durBadge}</td>
            <td class="px-3 py-2"><span class="px-1.5 py-0.5 bg-slate-200 rounded font-semibold">${item.code}</span></td>
            <td class="px-3 py-2">${item.location || '-'}</td>
            <td class="px-3 py-2 text-slate-600">${item.problem || '-'}</td>
          </tr>`;
      })
      .join('');
  },

  renderModelTable(list, target) {
    const tbody = document.getElementById('tbody-kpi-model');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="px-4 py-6 text-center text-sm text-slate-400">No model records found for this period.</td></tr>`;
      return;
    }

    tbody.innerHTML = list
      .map(
        (m) => `
        <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
          <td class="px-3 py-2.5 font-bold text-slate-800">${m.model}</td>
          <td class="px-3 py-2.5 text-right">${m.wh.toFixed(1)}</td>
          <td class="px-3 py-2.5 text-right text-rose-600 font-medium">${m.bdUnsched.toFixed(1)}</td>
          <td class="px-3 py-2.5 text-right text-amber-600">${m.bdSched.toFixed(1)}</td>
          <td class="px-3 py-2.5 text-right">${m.stbyHrs.toFixed(1)}</td>
          <td class="px-3 py-2.5 text-right font-bold ${m.pa >= target ? 'text-emerald-600' : 'text-rose-600'}">${m.pa.toFixed(2)}%</td>
          <td class="px-3 py-2.5 text-right font-bold ${m.ma >= target ? 'text-emerald-600' : 'text-rose-600'}">${m.ma.toFixed(2)}%</td>
          <td class="px-3 py-2.5 text-right font-bold ${m.ua >= target ? 'text-emerald-600' : 'text-rose-600'}">${m.ua.toFixed(2)}%</td>
          <td class="px-3 py-2.5 text-right font-semibold text-slate-700">${m.mttr.toFixed(2)}h</td>
          <td class="px-3 py-2.5 text-right font-semibold text-slate-700">${m.mtbr.toFixed(2)}h</td>
        </tr>`
      )
      .join('');
  },

  sortUnitBy(field) {
    if (this.sortState.field === field) {
      this.sortState.asc = !this.sortState.asc;
    } else {
      this.sortState.field = field;
      this.sortState.asc = field === 'unitId' || field === 'model';
    }
    this.renderUnitTable();
  },

  renderUnitTable() {
    const tbody = document.getElementById('tbody-kpi-unit');
    if (!tbody || !this.latestData) return;

    const target = this.latestData.target || APP_CONFIG.KPI_TARGET;
    const statusFilter = document.getElementById('dash-unit-target-filter')?.value || 'ALL';
    const searchVal = String(document.getElementById('dash-unit-search')?.value || '').trim().toLowerCase();

    let list = [...(this.latestData.byUnit || [])];

    list = list.filter((u) => {
      if (statusFilter === 'BELOW' && u.pa >= target) return false;
      if (statusFilter === 'PASS' && u.pa < target) return false;
      if (searchVal) {
        return u.unitId.toLowerCase().includes(searchVal) || u.model.toLowerCase().includes(searchVal);
      }
      return true;
    });

    const { field, asc } = this.sortState;
    list.sort((a, b) => {
      const valA = a[field];
      const valB = b[field];
      if (typeof valA === 'string') {
        return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return asc ? valA - valB : valB - valA;
    });

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="px-4 py-6 text-center text-sm text-slate-400">No matching unit records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = list
      .map(
        (u) => `
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
          <td class="px-3 py-2 text-right font-semibold text-slate-700">${u.mttr.toFixed(2)}h</td>
          <td class="px-3 py-2 text-right font-semibold text-slate-700">${u.mtbr.toFixed(2)}h</td>
        </tr>`
      )
      .join('');
  },

  exportToCsv() {
    if (!this.latestData) {
      showToast('No KPI data available to export.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-dash-export-csv');
    const startDate = document.getElementById('dash-start-date')?.value || 'report';
    const endDate = document.getElementById('dash-end-date')?.value || '';
    const headers = ['Site', 'Period_From', 'Period_To', 'Unit_ID', 'Model', 'WH_Hrs', 'BD_Unsched_Hrs', 'BD_Sched_Hrs', 'Standby_Hrs', 'PA_Pct', 'MA_Pct', 'UA_Pct', 'MTTR_Hrs', 'MTBR_Hrs'];
    const rows = (this.latestData.byUnit || []).map((u) => [
      AuthModule.currentSite,
      startDate,
      endDate,
      u.unitId,
      u.model,
      u.wh.toFixed(2),
      u.bdUnsched.toFixed(2),
      u.bdSched.toFixed(2),
      u.stbyHrs.toFixed(2),
      u.pa.toFixed(2),
      u.ma.toFixed(2),
      u.ua.toFixed(2),
      u.mttr.toFixed(2),
      u.mtbr.toFixed(2)
    ]);

    downloadCsvFile(`MPS_KPI_Summary_${AuthModule.currentSite}_${startDate}_to_${endDate}.csv`, headers, rows, btn);
    showToast('KPI summary exported to CSV.', 'success');
  },

  exportToExcel() {
    if (!this.latestData || typeof XLSX === 'undefined') {
      showToast('Excel export engine is not ready.', 'warning');
      return;
    }

    const wb = XLSX.utils.book_new();
    const wsModel = XLSX.utils.json_to_sheet(this.latestData.byModel || []);
    const wsUnit = XLSX.utils.json_to_sheet(this.latestData.byUnit || []);

    XLSX.utils.book_append_sheet(wb, wsModel, 'KPI_By_Model');
    XLSX.utils.book_append_sheet(wb, wsUnit, 'KPI_By_Unit');

    const startDate = document.getElementById('dash-start-date')?.value || 'report';
    const endDate = document.getElementById('dash-end-date')?.value || '';
    XLSX.writeFile(wb, `MPS_KPI_Report_${AuthModule.currentSite}_${startDate}_to_${endDate}.xlsx`);
    showToast('KPI report exported to Excel (.xlsx).', 'success');
  }
};

/* ============================================================================
 * 3. KPI HISTORY MODULE
 * ============================================================================ */
const HistoryModule = {
  data: null,

  init() {
    const picker = document.getElementById('hist-month-picker');
    if (picker && !picker.value) {
      const now = new Date();
      picker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
  },

  async load() {
    this.init();
    const monthVal = document.getElementById('hist-month-picker')?.value;
    const statusBox = document.getElementById('hist-status-msg');
    if (!monthVal) return;

    if (statusBox) statusBox.textContent = `Loading KPI history for ${monthVal}...`;

    const res = await callBackendApi('GET_KPI_HISTORY', {
      site: AuthModule.currentSite,
      month: monthVal
    });

    if (res.status === 'success') {
      this.data = res;
      this.render();
      if (statusBox) {
        statusBox.textContent = `Showing KPI history for ${res.site} (${res.month}).`;
      }
    } else if (statusBox) {
      statusBox.textContent = res.message || 'Failed to load KPI history.';
    }
  },

  render() {
    if (!this.data) return;

    const mode = document.getElementById('hist-view-mode')?.value || 'DAILY';
    const modelWrap = document.getElementById('hist-model-filter-wrap');
    const modelFilter = document.getElementById('hist-filter-model')?.value || 'ALL';
    const statusFilter = document.getElementById('hist-filter-status')?.value || 'ALL';
    const keyword = String(document.getElementById('hist-search-input')?.value || '').trim().toLowerCase();
    const target = this.data.target || APP_CONFIG.KPI_TARGET;

    if (modelWrap) {
      if (mode === 'UNIT') modelWrap.classList.remove('hidden');
      else modelWrap.classList.add('hidden');
    }

    const thead = document.getElementById('thead-kpi-history');
    const tbody = document.getElementById('tbody-kpi-history');
    const tfoot = document.getElementById('tfoot-kpi-history');
    const countBadge = document.getElementById('hist-row-count');
    if (!thead || !tbody || !tfoot) return;

    if (mode === 'DAILY') {
      thead.innerHTML = `
        <tr class="border-b border-slate-200 text-[11px] uppercase text-slate-500">
          <th class="px-3 py-2.5">Date</th>
          <th class="px-3 py-2.5">Day</th>
          <th class="px-3 py-2.5 text-right">Fleet Size</th>
          <th class="px-3 py-2.5 text-right">Cal Hrs</th>
          <th class="px-3 py-2.5 text-right">WH</th>
          <th class="px-3 py-2.5 text-right">BD Unsch</th>
          <th class="px-3 py-2.5 text-right">BD Sch</th>
          <th class="px-3 py-2.5 text-right">Rain</th>
          <th class="px-3 py-2.5 text-right">Standby</th>
          <th class="px-3 py-2.5 text-right">PA (%)</th>
          <th class="px-3 py-2.5 text-right">MA (%)</th>
          <th class="px-3 py-2.5 text-right">UA (%)</th>
          <th class="px-3 py-2.5 text-right">MTTR</th>
        </tr>`;

      const rows = (this.data.dailyHistory || []).filter((r) => {
        if (statusFilter === 'PASS' && r.pa < target) return false;
        if (statusFilter === 'BELOW' && r.pa >= target) return false;
        if (keyword && !r.date.includes(keyword) && !r.dayName.toLowerCase().includes(keyword)) return false;
        return true;
      });

      if (countBadge) countBadge.textContent = `${rows.length} Days`;

      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="px-4 py-6 text-center text-sm text-slate-400">No historical records found.</td></tr>`;
        tfoot.innerHTML = '';
        return;
      }

      let sumCal = 0, sumWh = 0, sumUnsch = 0, sumSch = 0, sumRain = 0, sumStby = 0;
      tbody.innerHTML = rows
        .map((r) => {
          sumCal += r.calHrs;
          sumWh += r.wh;
          sumUnsch += r.bdUnsched;
          sumSch += r.bdSched;
          sumRain += r.rainHrs;
          sumStby += r.stbyHrs;

          return `
            <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
              <td class="px-3 py-2 font-bold text-slate-800">${r.date}</td>
              <td class="px-3 py-2 text-slate-600">${r.dayName}</td>
              <td class="px-3 py-2 text-right">${r.unitCount}</td>
              <td class="px-3 py-2 text-right">${r.calHrs.toFixed(1)}</td>
              <td class="px-3 py-2 text-right font-semibold">${r.wh.toFixed(1)}</td>
              <td class="px-3 py-2 text-right text-rose-600">${r.bdUnsched.toFixed(1)}</td>
              <td class="px-3 py-2 text-right text-amber-600">${r.bdSched.toFixed(1)}</td>
              <td class="px-3 py-2 text-right text-sky-600">${r.rainHrs.toFixed(1)}</td>
              <td class="px-3 py-2 text-right">${r.stbyHrs.toFixed(1)}</td>
              <td class="px-3 py-2 text-right font-bold ${r.pa >= target ? 'text-emerald-600' : 'text-rose-600'}">${r.pa.toFixed(2)}%</td>
              <td class="px-3 py-2 text-right font-bold ${r.ma >= target ? 'text-emerald-600' : 'text-rose-600'}">${r.ma.toFixed(2)}%</td>
              <td class="px-3 py-2 text-right font-bold ${r.ua >= target ? 'text-emerald-600' : 'text-rose-600'}">${r.ua.toFixed(2)}%</td>
              <td class="px-3 py-2 text-right">${r.mttr.toFixed(2)}h</td>
            </tr>`;
        })
        .join('');

      const avail = Math.max(0, sumCal - sumUnsch - sumSch);
      const totPa = sumCal > 0 ? (avail / sumCal) * 100 : 0;
      const totMa = sumWh + sumUnsch > 0 ? (sumWh / (sumWh + sumUnsch)) * 100 : 100;
      const totUa = avail > 0 ? (sumWh / avail) * 100 : 0;

      tfoot.innerHTML = `
        <tr>
          <td colspan="3" class="px-3 py-2.5 uppercase">Period Total / Average</td>
          <td class="px-3 py-2.5 text-right">${sumCal.toFixed(1)}</td>
          <td class="px-3 py-2.5 text-right">${sumWh.toFixed(1)}</td>
          <td class="px-3 py-2.5 text-right">${sumUnsch.toFixed(1)}</td>
          <td class="px-3 py-2.5 text-right">${sumSch.toFixed(1)}</td>
          <td class="px-3 py-2.5 text-right">${sumRain.toFixed(1)}</td>
          <td class="px-3 py-2.5 text-right">${sumStby.toFixed(1)}</td>
          <td class="px-3 py-2.5 text-right">${totPa.toFixed(2)}%</td>
          <td class="px-3 py-2.5 text-right">${totMa.toFixed(2)}%</td>
          <td class="px-3 py-2.5 text-right">${totUa.toFixed(2)}%</td>
          <td class="px-3 py-2.5 text-right">-</td>
        </tr>`;
    } else {
      thead.innerHTML = `
        <tr class="border-b border-slate-200 text-[11px] uppercase text-slate-500">
          <th class="px-3 py-2.5">Date</th>
          <th class="px-3 py-2.5">Unit ID</th>
          <th class="px-3 py-2.5">Model</th>
          <th class="px-3 py-2.5 text-right">Cal Hrs</th>
          <th class="px-3 py-2.5 text-right">WH</th>
          <th class="px-3 py-2.5 text-right">BD Unsch</th>
          <th class="px-3 py-2.5 text-right">BD Sch</th>
          <th class="px-3 py-2.5 text-right">Rain</th>
          <th class="px-3 py-2.5 text-right">Standby</th>
          <th class="px-3 py-2.5 text-right">PA (%)</th>
          <th class="px-3 py-2.5 text-right">MA (%)</th>
          <th class="px-3 py-2.5 text-right">UA (%)</th>
        </tr>`;

      const rows = (this.data.unitHistory || []).filter((r) => {
        if (modelFilter !== 'ALL' && r.model !== modelFilter) return false;
        if (statusFilter === 'PASS' && r.pa < target) return false;
        if (statusFilter === 'BELOW' && r.pa >= target) return false;
        if (keyword && !r.date.includes(keyword) && !r.unitId.toLowerCase().includes(keyword) && !r.model.toLowerCase().includes(keyword)) {
          return false;
        }
        return true;
      });

      if (countBadge) countBadge.textContent = `${rows.length} Unit-Days`;
      tfoot.innerHTML = '';

      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="px-4 py-6 text-center text-sm text-slate-400">No unit history records match the filter.</td></tr>`;
        return;
      }

      tbody.innerHTML = rows
        .slice(0, 500)
        .map(
          (r) => `
          <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
            <td class="px-3 py-2 font-medium text-slate-700">${r.date}</td>
            <td class="px-3 py-2 font-bold text-slate-900">${r.unitId}</td>
            <td class="px-3 py-2 text-slate-600">${r.model}</td>
            <td class="px-3 py-2 text-right">${r.calHrs.toFixed(1)}</td>
            <td class="px-3 py-2 text-right font-semibold">${r.wh.toFixed(1)}</td>
            <td class="px-3 py-2 text-right text-rose-600">${r.bdUnsched.toFixed(1)}</td>
            <td class="px-3 py-2 text-right text-amber-600">${r.bdSched.toFixed(1)}</td>
            <td class="px-3 py-2 text-right text-sky-600">${r.rainHrs.toFixed(1)}</td>
            <td class="px-3 py-2 text-right">${r.stbyHrs.toFixed(1)}</td>
            <td class="px-3 py-2 text-right font-bold ${r.pa >= target ? 'text-emerald-600' : 'text-rose-600'}">${r.pa.toFixed(2)}%</td>
            <td class="px-3 py-2 text-right font-bold ${r.ma >= target ? 'text-emerald-600' : 'text-rose-600'}">${r.ma.toFixed(2)}%</td>
            <td class="px-3 py-2 text-right font-bold ${r.ua >= target ? 'text-emerald-600' : 'text-rose-600'}">${r.ua.toFixed(2)}%</td>
          </tr>`
        )
        .join('');
    }
  },

  exportCsv() {
    if (!this.data) {
      showToast('No KPI history data available to export.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-hist-export-csv');
    const mode = document.getElementById('hist-view-mode')?.value || 'DAILY';
    const monthVal = this.data.month || 'history';

    if (mode === 'DAILY') {
      const headers = ['Site', 'Date', 'Day', 'Fleet_Size', 'Cal_Hrs', 'WH', 'BD_Unsched', 'BD_Sched', 'Rain_Hrs', 'Standby_Hrs', 'PA_Pct', 'MA_Pct', 'UA_Pct', 'MTTR_Hrs'];
      const rows = (this.data.dailyHistory || []).map((r) => [
        AuthModule.currentSite, r.date, r.dayName, r.unitCount, r.calHrs, r.wh, r.bdUnsched, r.bdSched, r.rainHrs, r.stbyHrs, r.pa, r.ma, r.ua, r.mttr
      ]);
      downloadCsvFile(`MPS_Daily_History_${AuthModule.currentSite}_${monthVal}.csv`, headers, rows, btn);
    } else {
      const headers = ['Site', 'Date', 'Unit_ID', 'Model', 'Cal_Hrs', 'WH', 'BD_Unsched', 'BD_Sched', 'Rain_Hrs', 'Standby_Hrs', 'PA_Pct', 'MA_Pct', 'UA_Pct'];
      const rows = (this.data.unitHistory || []).map((r) => [
        AuthModule.currentSite, r.date, r.unitId, r.model, r.calHrs, r.wh, r.bdUnsched, r.bdSched, r.rainHrs, r.stbyHrs, r.pa, r.ma, r.ua
      ]);
      downloadCsvFile(`MPS_Unit_History_${AuthModule.currentSite}_${monthVal}.csv`, headers, rows, btn);
    }
    showToast('KPI history exported to CSV.', 'success');
  }
};

/* ============================================================================
 * 4. UPLOAD BREAKDOWN REPORT MODULE (DRAG & DROP, SHEET SELECT & DIAGNOSTICS)
 * ============================================================================ */
const UploadExcelModule = {
  workbook: null,
  parsedRows: [],
  cachedMatrix: null,
  showAllRows: false,
  diagnostics: {
    totalDataRows: 0,
    unmatchedUnits: [],
    excludedByDate: 0
  },

  resetForm() {
    this.workbook = null;
    this.parsedRows = [];
    this.cachedMatrix = null;
    this.showAllRows = false;
    this.diagnostics = { totalDataRows: 0, unmatchedUnits: [], excludedByDate: 0 };

    const fileInput = document.getElementById('excel-file-input');
    const sheetSelect = document.getElementById('excel-sheet-select');
    const fromInput = document.getElementById('excel-filter-from');
    const toInput = document.getElementById('excel-filter-to');
    const searchInput = document.getElementById('excel-preview-search');
    const dropTitle = document.getElementById('excel-drop-title');
    const fileMeta = document.getElementById('excel-file-meta');
    const diagBox = document.getElementById('excel-diagnostic-box');
    const cards = document.getElementById('excel-summary-cards');
    const progressWrap = document.getElementById('excel-progress-wrap');
    const btnUpload = document.getElementById('btn-submit-excel');
    const statusBox = document.getElementById('upload-status-msg');

    if (fileInput) fileInput.value = '';
    if (sheetSelect) {
      sheetSelect.innerHTML = '<option value="">-- Load Excel File First --</option>';
      sheetSelect.disabled = true;
    }
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
    if (searchInput) searchInput.value = '';
    if (dropTitle) {
      dropTitle.textContent = 'Click to browse or drag & drop Daily Report Machine (.xlsx / .xls) here';
    }
    if (fileMeta) {
      fileMeta.textContent = 'Supports multi-sheet Excel workbooks • Automatically detects "Daily Report Machine" tab';
    }
    if (diagBox) diagBox.classList.add('hidden');
    if (cards) cards.classList.add('hidden');
    if (progressWrap) progressWrap.classList.add('hidden');
    if (btnUpload) {
      btnUpload.disabled = true;
      btnUpload.textContent = 'Upload to Database';
    }
    if (statusBox) {
      statusBox.textContent = 'Select or drop a Daily Machine Report file to begin.';
      statusBox.className = 'text-sm text-slate-500';
    }
    this.renderPreviewTable();
  },

  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const zone = document.getElementById('excel-drop-zone');
    if (zone) {
      zone.classList.add('border-blue-600', 'bg-blue-50/70');
    }
  },

  handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const zone = document.getElementById('excel-drop-zone');
    if (zone) {
      zone.classList.remove('border-blue-600', 'bg-blue-50/70');
    }
  },

  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const zone = document.getElementById('excel-drop-zone');
    if (zone) {
      zone.classList.remove('border-blue-600', 'bg-blue-50/70');
    }
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  },

  handleFileSelect(event) {
    const file = event.target?.files?.[0];
    if (file) {
      this.processFile(file);
    }
  },

  processFile(file) {
    const statusBox = document.getElementById('upload-status-msg');
    const dropTitle = document.getElementById('excel-drop-title');
    const fileMeta = document.getElementById('excel-file-meta');
    const sheetSelect = document.getElementById('excel-sheet-select');
    const btnUpload = document.getElementById('btn-submit-excel');

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      showToast('Please select a valid Excel file (.xlsx or .xls).', 'error');
      return;
    }

    if (typeof XLSX === 'undefined') {
      if (statusBox) {
        statusBox.textContent = 'Error: Spreadsheet parser module is not loaded.';
        statusBox.className = 'text-sm text-rose-600 font-semibold';
      }
      return;
    }

    const sizeKb = (file.size / 1024).toFixed(1);
    if (dropTitle) dropTitle.textContent = `Loaded File: ${file.name}`;
    if (fileMeta) fileMeta.textContent = `File Size: ${sizeKb} KB • Reading worksheets...`;
    if (statusBox) {
      statusBox.textContent = `Parsing "${file.name}"...`;
      statusBox.className = 'text-sm text-blue-600 font-medium';
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        this.workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const names = this.workbook.SheetNames || [];
        if (names.length === 0) {
          throw new Error('No worksheets found inside this Excel file.');
        }

        const defaultSheet = names.includes('Daily Report Machine')
          ? 'Daily Report Machine'
          : names[0];

        if (sheetSelect) {
          sheetSelect.innerHTML = names
            .map((n) => `<option value="${n}" ${n === defaultSheet ? 'selected' : ''}>${n}</option>`)
            .join('');
          sheetSelect.disabled = false;
        }

        if (fileMeta) {
          fileMeta.textContent = `File Size: ${sizeKb} KB • ${names.length} Worksheet(s) detected`;
        }

        this.onSheetChange(defaultSheet);
      } catch (err) {
        if (statusBox) {
          statusBox.textContent = 'Failed to parse report file: ' + err.message;
          statusBox.className = 'text-sm text-rose-600 font-semibold';
        }
        if (btnUpload) btnUpload.disabled = true;
      }
    };
    reader.readAsArrayBuffer(file);
  },

  onSheetChange(sheetName) {
    if (!this.workbook || !sheetName) return;
    const worksheet = this.workbook.Sheets[sheetName];
    if (!worksheet) return;

    this.cachedMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    this.reprocessCachedSheet();
  },

  reprocessCachedSheet() {
    if (!this.cachedMatrix) return;
    const statusBox = document.getElementById('upload-status-msg');
    const btnUpload = document.getElementById('btn-submit-excel');

    try {
      this.extractBreakdownRows(this.cachedMatrix);
      this.updateSummaryCards();
      this.renderDiagnostics();
      this.renderPreviewTable();

      if (this.parsedRows.length > 0) {
        if (statusBox) {
          statusBox.textContent = `Parsed ${this.parsedRows.length} valid daily breakdown segments for site ${AuthModule.currentSite}. Ready to upload.`;
          statusBox.className = 'text-sm text-emerald-600 font-semibold';
        }
        if (btnUpload) btnUpload.disabled = false;
      } else {
        if (statusBox) {
          statusBox.textContent = `No breakdown rows matched active units / date filter in site ${AuthModule.currentSite}.`;
          statusBox.className = 'text-sm text-amber-600 font-semibold';
        }
        if (btnUpload) btnUpload.disabled = true;
      }
    } catch (err) {
      if (statusBox) {
        statusBox.textContent = 'Sheet structure error: ' + err.message;
        statusBox.className = 'text-sm text-rose-600 font-semibold';
      }
      if (btnUpload) btnUpload.disabled = true;
    }
  },

  extractBreakdownRows(matrix) {
    this.parsedRows = [];
    this.diagnostics = { totalDataRows: 0, unmatchedUnits: [], excludedByDate: 0 };
    if (!matrix || matrix.length < 2) return;

    let headerRowIdx = -1;
    let colIdx = {};

    for (let r = 0; r < Math.min(25, matrix.length); r++) {
      const row = matrix[r];
      if (!row) continue;
      const normalized = row.map((cell) => String(cell || '').trim().toLowerCase());
      const unitCol = normalized.findIndex((h) => h === 'unit' || h === 'unit id' || h === 'unit no' || h === 'cn');
      const inCol = normalized.findIndex((h) => h === 'in' || h === 'time in');
      if (unitCol !== -1 && inCol !== -1) {
        headerRowIdx = r;
        colIdx = {
          tanggal: normalized.findIndex((h) => h.startsWith('tanggal') || h === 'date'),
          wo: normalized.indexOf('wo'),
          unit: unitCol,
          model: normalized.indexOf('model'),
          location: normalized.indexOf('location'),
          code: normalized.indexOf('code'),
          problem: normalized.indexOf('problem'),
          finishDate: normalized.findIndex((h) => h.includes('finis') || h.includes('finish')),
          timeIn: inCol,
          timeOut: normalized.findIndex((h) => h === 'out' || h === 'time out'),
          codeComp: normalized.findIndex((h) => h.includes('code component'))
        };
        break;
      }
    }

    if (headerRowIdx === -1) {
      throw new Error('Required columns "Unit" and "IN" were not found in the selected worksheet.');
    }

    const normId = (s) => String(s || '').trim().toUpperCase().replace(/[\s\-_]+/g, '');
    const validUnitMap = {};
    (AuthModule.masterData.units || []).forEach((u) => {
      validUnitMap[normId(u.unitId)] = { exactId: u.unitId, model: u.model };
    });

    const unmatchedSet = new Set();
    const filterFrom = document.getElementById('excel-filter-from')?.value || '';
    const filterTo = document.getElementById('excel-filter-to')?.value || '';
    const todayYMD = this.formatExcelDate(new Date());

    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row) continue;

      const rawUnit = String(row[colIdx.unit] || '').trim();
      const startDate = this.formatExcelDate(row[colIdx.tanggal]);
      const timeIn = this.formatExcelTime(row[colIdx.timeIn]);
      if (!rawUnit || !startDate || !timeIn) continue;

      this.diagnostics.totalDataRows += 1;

      const matchedUnit = validUnitMap[normId(rawUnit)];
      if (!matchedUnit) {
        unmatchedSet.add(rawUnit.toUpperCase());
        continue;
      }

      const unitId = matchedUnit.exactId;
      const rawFinishDate = colIdx.finishDate !== -1 ? this.formatExcelDate(row[colIdx.finishDate]) : '';
      const rawTimeOut = colIdx.timeOut !== -1 ? this.formatExcelTime(row[colIdx.timeOut]) : '';
      const isReady = Boolean(rawFinishDate && rawTimeOut);
      const endDate = rawFinishDate || todayYMD;

      const model = (colIdx.model !== -1 ? String(row[colIdx.model] || '').trim() : '') || matchedUnit.model;
      const wo = colIdx.wo !== -1 ? String(row[colIdx.wo] || '').trim() : '';
      const location = colIdx.location !== -1 ? String(row[colIdx.location] || '').trim() : '';
      const code = colIdx.code !== -1 ? String(row[colIdx.code] || 'USCH').trim().toUpperCase() : 'USCH';
      const problem = colIdx.problem !== -1 ? String(row[colIdx.problem] || '').trim() : '';
      const codeComponent = colIdx.codeComp !== -1 ? String(row[colIdx.codeComp] || '').trim().toUpperCase() : '';

      const segments = this.splitDailySegments(startDate, timeIn, endDate, rawTimeOut, isReady);
      segments.forEach((seg) => {
        if ((filterFrom && seg.date < filterFrom) || (filterTo && seg.date > filterTo)) {
          this.diagnostics.excludedByDate += 1;
          return;
        }

        this.parsedRows.push({
          startDate: seg.date,
          wo: wo,
          unitId: unitId,
          model: model,
          location: location,
          code: code,
          problem: problem,
          finishDate: seg.finishDate,
          timeIn: seg.timeIn,
          timeOut: seg.timeOut,
          pureHours: seg.pureHours,
          codeComponent: codeComponent
        });
      });
    }

    this.diagnostics.unmatchedUnits = Array.from(unmatchedSet).sort();
  },

  renderDiagnostics() {
    const diagBox = document.getElementById('excel-diagnostic-box');
    const diagTitle = document.getElementById('excel-diag-title');
    const diagBody = document.getElementById('excel-diag-body');
    if (!diagBox || !diagTitle || !diagBody) return;

    const session = getUserSession();
    const { totalDataRows, unmatchedUnits, excludedByDate } = this.diagnostics;

    if (session && session.isPreviewMode && totalDataRows > 0 && this.parsedRows.length === 0) {
      diagBox.classList.remove('hidden');
      diagTitle.textContent = 'Live UI Demo Mode Active';
      diagBody.textContent = `Read ${totalDataRows} rows from Excel, but you are currently in Live UI Demo Mode (which only simulates 4 sample units: EX-1320, EX-1351, DT-4012, DZ-85). Sign in with your real account to match your site ${AuthModule.currentSite} fleet.`;
      return;
    }

    if (unmatchedUnits.length > 0 || (totalDataRows > 0 && this.parsedRows.length === 0)) {
      diagBox.classList.remove('hidden');
      diagTitle.textContent = `Workbook Parsing Summary (${totalDataRows} Data Rows Scanned)`;
      const msgs = [];
      if (unmatchedUnits.length > 0) {
        const previewList = unmatchedUnits.slice(0, 12).join(', ');
        const more = unmatchedUnits.length > 12 ? ` (+${unmatchedUnits.length - 12} more)` : '';
        msgs.push(`Skipped ${unmatchedUnits.length} Unit ID(s) not active in site ${AuthModule.currentSite} (check Unit Population or selected Site): ${previewList}${more}.`);
      }
      if (excludedByDate > 0) {
        msgs.push(`${excludedByDate} daily segment(s) excluded by the From/To Date filter.`);
      }
      diagBody.textContent = msgs.join(' ');
    } else {
      diagBox.classList.add('hidden');
    }
  },

  splitDailySegments(startYMD, timeIn, endYMD, timeOut, isReady) {
    const toMs = (ymd, hm) => {
      const dp = ymd.split('-').map(Number);
      const tp = hm.split(':').map(Number);
      return new Date(dp[0], dp[1] - 1, dp[2], tp[0] || 0, tp[1] || 0, 0).getTime();
    };
    const overlap = (a1, a2, b1, b2) => Math.max(0, (Math.min(a2, b2) - Math.max(a1, b1)) / 3600000);

    const startMs = toMs(startYMD, timeIn);
    const effOut = isReady && timeOut ? timeOut : '05:00';
    let endMs = toMs(endYMD, effOut);
    if (!isReady || (startYMD === endYMD && effOut === '05:00' && timeIn >= '06:00')) {
      endMs += 24 * 3600000;
    }

    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      return [{
        date: startYMD,
        finishDate: isReady ? endYMD : '',
        timeIn: timeIn,
        timeOut: isReady ? timeOut : '',
        pureHours: 0
      }];
    }

    const sp = startYMD.split('-').map(Number);
    const ep = endYMD.split('-').map(Number);
    let cur = new Date(sp[0], sp[1] - 1, sp[2], 12, 0, 0);
    const end = new Date(ep[0], ep[1] - 1, ep[2], 12, 0, 0);

    const out = [];
    let guard = 0;
    while (cur.getTime() <= end.getTime() && guard < 60) {
      const ymd = this.formatExcelDate(cur);
      const isFri = cur.getDay() === 5;
      const isFirst = ymd === startYMD;
      const isLast = ymd === endYMD;

      const dStart = toMs(ymd, '06:00');
      const dEnd = toMs(ymd, isFri ? '16:00' : '17:00');
      const dRest1 = toMs(ymd, '12:00');
      const dRest2 = toMs(ymd, '13:00');
      const dayPure = Math.max(0, overlap(startMs, endMs, dStart, dEnd) - overlap(startMs, endMs, dRest1, dRest2));

      const nStart = toMs(ymd, '18:00');
      const nRest1 = nStart + 6 * 3600000;
      const nRest2 = nStart + 7 * 3600000;
      const nEnd = nStart + 11 * 3600000;
      const nightPure = Math.max(0, overlap(startMs, endMs, nStart, nEnd) - overlap(startMs, endMs, nRest1, nRest2));

      const totalPure = Math.round((dayPure + nightPure) * 100) / 100;
      if (!isFirst && isLast && totalPure <= 0 && isReady) break;

      out.push({
        date: ymd,
        finishDate: isLast && !isReady ? '' : ymd,
        timeIn: isFirst ? timeIn : '06:00',
        timeOut: isLast ? (isReady ? timeOut : '') : '05:00',
        pureHours: totalPure
      });

      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    return out;
  },

  updateSummaryCards() {
    const cards = document.getElementById('excel-summary-cards');
    if (!cards) return;

    if (this.parsedRows.length === 0) {
      cards.classList.add('hidden');
      return;
    }

    cards.classList.remove('hidden');
    const schedCodes = ['SCH', 'SVC'];
    let unschHrs = 0;
    let schHrs = 0;

    this.parsedRows.forEach((r) => {
      const hrs = Number(r.pureHours) || 0;
      if (schedCodes.includes(String(r.code || '').toUpperCase())) {
        schHrs += hrs;
      } else {
        unschHrs += hrs;
      }
    });

    const uniqueUnits = new Set(this.parsedRows.map((r) => r.unitId)).size;

    document.getElementById('excel-sum-rows').textContent = `${this.parsedRows.length} Rows`;
    document.getElementById('excel-sum-unsch').textContent = `${unschHrs.toFixed(2)} Hrs`;
    document.getElementById('excel-sum-sch').textContent = `${schHrs.toFixed(2)} Hrs`;
    document.getElementById('excel-sum-units').textContent = `${uniqueUnits} Units`;
  },

  toggleShowAllRows() {
    this.showAllRows = !this.showAllRows;
    this.renderPreviewTable();
  },

  renderPreviewTable() {
    const tbody = document.getElementById('tbody-excel-preview');
    const heading = document.getElementById('excel-preview-heading');
    const btnToggle = document.getElementById('btn-excel-toggle-rows');
    const keyword = String(document.getElementById('excel-preview-search')?.value || '').trim().toLowerCase();
    if (!tbody) return;

    if (this.parsedRows.length === 0) {
      if (heading) heading.textContent = 'Daily Breakdown Segments Preview (Latest 50 Rows)';
      if (btnToggle) btnToggle.classList.add('hidden');
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="px-4 py-6 text-center text-sm text-slate-400">
            No report file processed yet. Select or drop an .xlsx file above to preview daily segments.
          </td>
        </tr>`;
      return;
    }

    const filtered = this.parsedRows.filter((item) => {
      if (!keyword) return true;
      return (
        item.unitId.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword) ||
        (item.codeComponent || '').toLowerCase().includes(keyword) ||
        (item.problem || '').toLowerCase().includes(keyword) ||
        item.startDate.includes(keyword)
      );
    });

    if (btnToggle) {
      if (filtered.length > 50) {
        btnToggle.classList.remove('hidden');
        btnToggle.textContent = this.showAllRows ? 'Show Latest 50' : `Show All (${filtered.length} Rows)`;
      } else {
        btnToggle.classList.add('hidden');
      }
    }

    const ordered = [...filtered].reverse();
    const previewSlice = this.showAllRows ? ordered : ordered.slice(0, 50);

    if (heading) {
      heading.textContent = this.showAllRows
        ? `Daily Breakdown Segments Preview (Showing All ${previewSlice.length} Rows)`
        : `Daily Breakdown Segments Preview (Showing ${previewSlice.length} of ${filtered.length} Rows)`;
    }

    if (previewSlice.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="px-4 py-6 text-center text-sm text-slate-400">
            No breakdown segments match your search filter.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = previewSlice
      .map((item) => {
        const isOpen = !item.finishDate || !item.timeOut;
        const badge = isOpen
          ? '<span class="px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700 rounded">Breakdown (Open)</span>'
          : '<span class="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded">Ready</span>';

        return `
          <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
            <td class="px-3 py-2 font-medium">${item.startDate}</td>
            <td class="px-3 py-2 font-bold text-slate-800">${item.unitId}</td>
            <td class="px-3 py-2"><span class="px-1.5 py-0.5 bg-slate-200 rounded font-semibold">${item.code}</span></td>
            <td class="px-3 py-2">${badge}</td>
            <td class="px-3 py-2">${item.timeIn}</td>
            <td class="px-3 py-2">${isOpen ? '<em>Auto Shift End</em>' : `${item.finishDate} ${item.timeOut}`}</td>
            <td class="px-3 py-2 text-right font-bold text-rose-600">${Number(item.pureHours).toFixed(2)}h</td>
            <td class="px-3 py-2">${item.codeComponent || '-'}</td>
            <td class="px-3 py-2 max-w-md truncate" title="${item.problem}">${item.problem || '-'}</td>
          </tr>`;
      })
      .join('');
  },

  async submitToServer() {
    if (this.parsedRows.length === 0) return;

    const btnUpload = document.getElementById('btn-submit-excel');
    const statusBox = document.getElementById('upload-status-msg');
    const progressWrap = document.getElementById('excel-progress-wrap');
    const progressBar = document.getElementById('excel-progress-bar');
    const progressPct = document.getElementById('excel-progress-pct');
    const progressLabel = document.getElementById('excel-progress-label');

    if (btnUpload) {
      btnUpload.disabled = true;
      btnUpload.textContent = 'Uploading to Central Database...';
    }
    if (progressWrap) progressWrap.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '5%';
    if (progressPct) progressPct.textContent = '5%';

    const batchSize = 150;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (let i = 0; i < this.parsedRows.length; i += batchSize) {
      const chunk = this.parsedRows.slice(i, i + batchSize);
      const processedCount = Math.min(i + batchSize, this.parsedRows.length);
      const pct = Math.round((processedCount / this.parsedRows.length) * 100);

      if (progressBar) progressBar.style.width = `${pct}%`;
      if (progressPct) progressPct.textContent = `${pct}%`;
      if (progressLabel) {
        progressLabel.textContent = `Uploading ${processedCount} of ${this.parsedRows.length} segments to Central Fleet Database...`;
      }
      if (statusBox) {
        statusBox.textContent = `Processing batch (${processedCount}/${this.parsedRows.length})...`;
        statusBox.className = 'text-sm text-blue-600 font-medium';
      }

      const res = await callBackendApi('UPLOAD_BREAKDOWN_BATCH', {
        site: AuthModule.currentSite,
        rows: chunk
      });

      if (res.status !== 'success') {
        if (statusBox) {
          statusBox.textContent = `Upload stopped at row ${i + 1}: ${res.message}`;
          statusBox.className = 'text-sm text-rose-600 font-semibold';
        }
        if (btnUpload) {
          btnUpload.disabled = false;
          btnUpload.textContent = 'Upload to Database';
        }
        return;
      }

      if (res.stats) {
        totalInserted += res.stats.inserted || 0;
        totalUpdated += res.stats.updated || 0;
        totalSkipped += res.stats.skipped || 0;
      }
    }

    if (progressLabel) progressLabel.textContent = 'Upload complete & KPI metrics recalculated.';
    if (statusBox) {
      statusBox.textContent = `Success! ${totalInserted} new segments added, ${totalUpdated} updated, ${totalSkipped} skipped. KPI metrics recalculated.`;
      statusBox.className = 'text-sm text-emerald-600 font-semibold';
    }
    showToast('Breakdown report uploaded and KPI recalculated.', 'success');

    if (btnUpload) {
      btnUpload.disabled = false;
      btnUpload.textContent = 'Upload to Database';
    }
  },

  formatExcelDate(val) {
    if (!val) return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof val === 'number' && typeof XLSX !== 'undefined') {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      }
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    return '';
  },

  formatExcelTime(val) {
    if (val === null || val === undefined || val === '') return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
      return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`;
    }
    if (typeof val === 'number') {
      const totalMinutes = Math.round((val % 1) * 24 * 60);
      return `${String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
    }
    const match = String(val).trim().match(/^(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
  }
};

/* ============================================================================
 * 6. UNIT POPULATION REGISTRY & MONTHLY FLEET ROSTER LOCK MODULE
 * ============================================================================ */
const PopulationModule = {
  selectedMonth: '',
  rosterUnits: [],
  auditLogs: [],
  lockState: {
    mode: 'GRACE_PERIOD',
    isLocked: false,
    label: 'Loading...',
    description: ''
  },
  isMaterialized: false,
  inheritedFrom: '',

  init() {
    const picker = document.getElementById('pop-month-picker');
    if (picker && !picker.value) {
      const now = new Date();
      picker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    this.selectedMonth = picker ? picker.value : '';
  },

  async loadMonth() {
    this.init();
    const picker = document.getElementById('pop-month-picker');
    const targetMonth = picker?.value || this.selectedMonth;
    this.selectedMonth = targetMonth;

    const statusBox = document.getElementById('pop-status-msg');
    if (statusBox) {
      statusBox.textContent = `Loading fleet roster snapshot for ${targetMonth}...`;
      statusBox.className = 'text-xs text-blue-600 font-medium';
    }

    const res = await callBackendApi('GET_MASTER_DATA', {
      site: AuthModule.currentSite,
      month: targetMonth
    });

    if (res.status === 'success') {
      this.rosterUnits = (res.allSiteUnits || []).map((u) => ({
        ...u,
        _origStatus: u.status,
        _origPending: Boolean(u.pendingOffHire),
        _origReplaced: u.replacedUnitId || '',
        _origReason: u.reason || ''
      }));
      this.auditLogs = res.auditLogs || [];
      this.lockState = res.lockState || {
        mode: 'GRACE_PERIOD',
        isLocked: false,
        label: 'Roster Unlocked',
        description: ''
      };
      this.isMaterialized = Boolean(res.isMaterialized);
      this.inheritedFrom = res.inheritedFrom || '';

      // Sinkronkan masterData bulan berjalan jika periode sama dengan bulan aktif
      const now = new Date();
      const curYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (targetMonth === curYM) {
        AuthModule.masterData.units = res.units || [];
        AuthModule.masterData.allSiteUnits = res.allSiteUnits || [];
        AuthModule.populateModelFilters();
        AuthModule.populateUnitDatalist();
      }

      this.renderLockBanner();
      this.renderTable();
      this.renderAuditLogs();

      if (statusBox) {
        statusBox.textContent = `Loaded ${this.rosterUnits.length} fleet units for ${res.site} (${targetMonth}).`;
        statusBox.className = 'text-xs text-emerald-600 font-semibold';
      }
    } else if (statusBox) {
      statusBox.textContent = res.message || 'Failed to load monthly fleet roster.';
      statusBox.className = 'text-xs text-rose-600 font-semibold';
    }
  },

  renderLockBanner() {
    const badge = document.getElementById('pop-lock-badge');
    const info = document.getElementById('pop-inherited-info');
    const banner = document.getElementById('pop-lock-banner');
    const desc = document.getElementById('pop-lock-desc');
    const btnCopy = document.getElementById('btn-copy-prev-roster');
    const btnSave = document.getElementById('btn-save-bulk-status');

    const mode = this.lockState.mode || 'GRACE_PERIOD';

    if (badge) {
      badge.textContent = this.lockState.label || mode;
      const badgeStyles = {
        PLANNING: 'px-3 py-1.5 text-xs font-extrabold rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200',
        GRACE_PERIOD: 'px-3 py-1.5 text-xs font-extrabold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200',
        LOCKED_MID_MONTH: 'px-3 py-1.5 text-xs font-extrabold rounded-lg bg-amber-100 text-amber-900 border border-amber-300',
        HISTORICAL_FROZEN: 'px-3 py-1.5 text-xs font-extrabold rounded-lg bg-slate-200 text-slate-700 border border-slate-300'
      };
      badge.className = badgeStyles[mode] || badgeStyles.GRACE_PERIOD;
    }

    if (info) {
      info.textContent = this.isMaterialized
        ? `Snapshot Saved (${this.selectedMonth})`
        : `Draft Inherited from ${this.inheritedFrom || 'Previous Period'} (Not Yet Locked)`;
    }

    if (banner && desc) {
      desc.textContent = this.lockState.description || '';
      banner.className = mode === 'LOCKED_MID_MONTH'
        ? 'p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-start gap-2'
        : 'p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2';
    }

    if (btnCopy) {
      btnCopy.disabled = Boolean(this.lockState.isLocked);
    }
    if (btnSave) {
      btnSave.disabled = mode === 'HISTORICAL_FROZEN';
    }
  },

  async pullFromMaster() {
    const btn = document.getElementById('btn-pull-master');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Syncing...';
    }

    await this.loadMonth();

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sync Roster';
    }
    showToast(`Synced fleet roster for ${AuthModule.currentSite} (${this.selectedMonth}).`, 'success');
  },

  async copyPreviousRoster() {
    if (this.lockState.isLocked) {
      showToast('This roster period is locked and cannot be overwritten.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-copy-prev-roster');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Finalizing Roster...';
    }

    const res = await callBackendApi('MANAGE_UNIT_POPULATION', {
      mode: 'COPY_PREVIOUS_ROSTER',
      site: AuthModule.currentSite,
      month: this.selectedMonth
    });

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Copy / Finalize from Previous Month';
    }

    if (res.status === 'success') {
      showToast(res.message, 'success');
      await this.loadMonth();
    } else {
      showToast(res.message || 'Failed to copy previous roster.', 'error');
    }
  },

  renderTable() {
    const tbody = document.getElementById('tbody-population-list');
    const searchVal = String(document.getElementById('pop-search-input')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('pop-status-filter')?.value || 'ALL';
    const badge = document.getElementById('pop-total-badge');
    if (!tbody) return;

    const allUnits = this.rosterUnits || [];
    const counts = { W: 0, SW: 0, OH: 0, S: 0 };
    allUnits.forEach((u) => {
      if (counts[u.status] !== undefined) counts[u.status] += 1;
    });

    document.getElementById('pop-count-w').textContent = counts.W;
    document.getElementById('pop-count-sw').textContent = counts.SW;
    document.getElementById('pop-count-oh').textContent = counts.OH;
    document.getElementById('pop-count-s').textContent = counts.S;

    const onHiredTotal = counts.W + counts.SW;
    if (badge) {
      badge.textContent = `${onHiredTotal} On-Hired / ${allUnits.length} Total (${AuthModule.currentSite})`;
    }

    const filtered = allUnits.filter((u) => {
      if (statusFilter === 'ON_HIRED' && !['W', 'SW'].includes(u.status)) return false;
      if (statusFilter === 'PENDING_OH' && !u.pendingOffHire) return false;
      if (['W', 'SW', 'OH', 'S'].includes(statusFilter) && u.status !== statusFilter) return false;

      if (searchVal) {
        return (
          u.unitId.toLowerCase().includes(searchVal) ||
          u.model.toLowerCase().includes(searchVal) ||
          u.brand.toLowerCase().includes(searchVal) ||
          u.equipment.toLowerCase().includes(searchVal)
        );
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center text-sm text-slate-400">No units match the current filter.</td></tr>`;
      return;
    }

    const mode = this.lockState.mode || 'GRACE_PERIOD';
    const isMidMonthLocked = mode === 'LOCKED_MID_MONTH';
    const isFrozen = mode === 'HISTORICAL_FROZEN';

    const statusOptions = [
      { val: 'W', label: 'W (Working - On-Hired)' },
      { val: 'SW', label: 'SW (Standby Working - On-Hired)' },
      { val: 'OH', label: 'OH (Off Hired - Excluded)' },
      { val: 'S', label: 'S (Scrap / Demob)' }
    ];

    tbody.innerHTML = filtered
      .map((u) => {
        const isScrap = u.status === 'S';
        const isOffHired = u.status === 'OH';
        const isOnHired = ['W', 'SW'].includes(u.status);
        const isModified =
          u.status !== u._origStatus ||
          Boolean(u.pendingOffHire) !== u._origPending ||
          (u.replacedUnitId || '') !== u._origReplaced ||
          (u.reason || '') !== u._origReason;

        const rowCls = isModified
          ? 'bg-blue-50/60'
          : isScrap
          ? 'bg-slate-50 text-slate-400'
          : isOffHired
          ? 'bg-amber-50/30 hover:bg-slate-50'
          : 'hover:bg-slate-50';

        const selectStyle = {
          W: 'border-emerald-300 bg-emerald-50 text-emerald-800',
          SW: 'border-blue-300 bg-blue-50 text-blue-800',
          OH: 'border-amber-300 bg-amber-50 text-amber-800',
          S: 'border-rose-300 bg-rose-50 text-rose-700'
        }[u.status] || 'border-slate-300 bg-white';

        // Tentukan opsi dropdown sesuai aturan penguncian bulan
        let allowedOptions = statusOptions;
        let disableSelect = isFrozen;

        if (isMidMonthLocked) {
          if (isOnHired && u._origStatus && ['W', 'SW'].includes(u._origStatus)) {
            // Unit On-Hired terkunci W/SW hingga akhir bulan
            allowedOptions = statusOptions.filter((o) => ['W', 'SW'].includes(o.val));
          } else if (isOnHired && !['W', 'SW'].includes(u._origStatus)) {
            // Baru ditarik darurat dari OH -> terkunci W/SW
            allowedOptions = statusOptions.filter((o) => ['W', 'SW'].includes(o.val));
          } else {
            // OH atau S tidak bisa diubah langsung lewat dropdown saat terkunci
            disableSelect = true;
          }
        }

        const opts = allowedOptions
          .map((o) => `<option value="${o.val}" ${u.status === o.val ? 'selected' : ''}>${o.label}</option>`)
          .join('');

        // Kolom Governance & Catatan Mutasi
        let govHtml = '';
        if (u.pendingOffHire) {
          govHtml += `<div class="inline-flex flex-wrap items-center gap-1.5">
            <span class="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500 text-slate-950 rounded">PENDING OFF-HIRE (Eff. 1st Next Month)</span>
            ${!isFrozen ? `<button type="button" onclick="PopulationModule.cancelPendingOffHire('${u.unitId}')" class="text-[11px] font-bold text-rose-600 hover:underline">Cancel</button>` : ''}
          </div>`;
        } else if (isOnHired && !isFrozen) {
          govHtml += `<button type="button" onclick="PopulationModule.openActionModal('${u.unitId}', 'PENDING_OH')"
            class="px-2.5 py-1 text-[11px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg transition">
            Schedule Pending Off-Hire
          </button>`;
        } else if (isOffHired && isMidMonthLocked) {
          govHtml += `<button type="button" onclick="PopulationModule.openActionModal('${u.unitId}', 'EMERGENCY_PULL_IN')"
            class="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition">
            &#9889; Emergency Pull-In (OH &rarr; W)
          </button>`;
        } else if (isScrap) {
          govHtml += `<span class="text-[11px] text-slate-400 italic">Decommissioned / Excluded from KPI</span>`;
        } else {
          govHtml += `<span class="text-[11px] text-slate-400">Standby Yard / Long-Term BD (Excluded)</span>`;
        }

        if (u.replacedUnitId) {
          govHtml += `<div class="text-[11px] font-bold text-indigo-700 mt-1">Replaces Unit: ${u.replacedUnitId}</div>`;
        }
        if (u.reason) {
          govHtml += `<div class="text-[11px] text-slate-600 mt-0.5 max-w-md">${u.reason}</div>`;
        }

        return `
          <tr class="border-b border-slate-100 text-xs ${rowCls}">
            <td class="px-4 py-2 font-bold ${isScrap ? 'line-through' : 'text-slate-900'}">${u.unitId}</td>
            <td class="px-4 py-2">${u.category || '-'}</td>
            <td class="px-4 py-2">${u.equipment || '-'}</td>
            <td class="px-4 py-2">${u.brand || '-'}</td>
            <td class="px-4 py-2 font-medium">${u.model}</td>
            <td class="px-4 py-2">
              <select ${disableSelect ? 'disabled' : ''}
                onchange="PopulationModule.onInlineStatusChange('${u.unitId}', this.value)"
                class="px-2.5 py-1 text-xs font-semibold rounded border focus:outline-none disabled:opacity-75 ${selectStyle}">
                ${opts}
              </select>
            </td>
            <td class="px-4 py-2">${govHtml}</td>
          </tr>`;
      })
      .join('');
  },

  onInlineStatusChange(unitId, newStatus) {
    const target = this.rosterUnits.find((u) => u.unitId === unitId);
    if (!target) return;
    target.status = newStatus;
    if (!['W', 'SW'].includes(newStatus)) {
      target.pendingOffHire = false;
    }
    this.renderTable();
  },

  cancelPendingOffHire(unitId) {
    const target = this.rosterUnits.find((u) => u.unitId === unitId);
    if (!target) return;
    target.pendingOffHire = false;
    target.reason = '';
    this.renderTable();
    showToast(`Pending Off-Hire cancelled for ${unitId}. Click "Save Roster Changes" to confirm.`, 'info');
  },

  openActionModal(unitId, actionMode) {
    const unit = this.rosterUnits.find((u) => u.unitId === unitId);
    if (!unit) return;

    const modal = document.getElementById('modal-roster-action');
    const title = document.getElementById('modal-roster-title');
    const subtitle = document.getElementById('modal-roster-subtitle');
    const pullFields = document.getElementById('modal-roster-pull-fields');
    const replacedSelect = document.getElementById('modal-roster-replaced-unit');
    const reasonInput = document.getElementById('modal-roster-reason');

    document.getElementById('modal-roster-unit-id').value = unitId;
    document.getElementById('modal-roster-mode').value = actionMode;
    document.getElementById('modal-roster-unit-label').textContent = `${unit.unitId} (${unit.model}) — Current: ${unit.status}`;
    if (reasonInput) reasonInput.value = unit.reason || '';

    if (actionMode === 'PENDING_OH') {
      if (title) title.textContent = 'Schedule Pending Off-Hire (Effective 1st Next Month)';
      if (subtitle) subtitle.textContent = 'Unit remains On-Hired until end of current month to preserve honest KPI accountability.';
      pullFields?.classList.add('hidden');
    } else {
      if (title) title.textContent = 'Emergency Pull-In Replacement (Off-Hired to On-Hired)';
      if (subtitle) subtitle.textContent = 'Activated unit will be locked as On-Hired through the end of this month.';
      pullFields?.classList.remove('hidden');

      if (replacedSelect) {
        const onHiredUnits = this.rosterUnits.filter((u) => ['W', 'SW'].includes(u.status) && u.unitId !== unitId);
        replacedSelect.innerHTML = ['<option value="">-- Select Broken On-Hired Unit Being Replaced --</option>']
          .concat(onHiredUnits.map((u) => `<option value="${u.unitId}">${u.unitId} (${u.model} - ${u.status})</option>`))
          .join('');
      }
    }

    modal?.classList.remove('hidden');
  },

  closeActionModal() {
    document.getElementById('modal-roster-action')?.classList.add('hidden');
  },

  async submitActionModal() {
    const unitId = document.getElementById('modal-roster-unit-id')?.value;
    const actionMode = document.getElementById('modal-roster-mode')?.value;
    const reason = String(document.getElementById('modal-roster-reason')?.value || '').trim();
    const target = this.rosterUnits.find((u) => u.unitId === unitId);

    if (!target) return;
    if (!reason) {
      showToast('Technical justification / WO reference is required.', 'error');
      return;
    }

    if (actionMode === 'PENDING_OH') {
      target.pendingOffHire = true;
      target.reason = reason;
    } else if (actionMode === 'EMERGENCY_PULL_IN') {
      const targetStatus = document.getElementById('modal-roster-target-status')?.value || 'W';
      const replacedUnitId = document.getElementById('modal-roster-replaced-unit')?.value || '';
      if (!replacedUnitId) {
        showToast('Please select the On-Hired Unit ID being replaced.', 'error');
        return;
      }
      target.status = targetStatus;
      target.replacedUnitId = replacedUnitId;
      target.reason = reason;
    }

    this.closeActionModal();
    this.renderTable();
    await this.saveBulkStatus(true);
  },

  renderAuditLogs() {
    const tbody = document.getElementById('tbody-pop-audit-logs');
    const badge = document.getElementById('pop-audit-count');
    if (!tbody) return;

    const logs = this.auditLogs || [];
    if (badge) badge.textContent = `${logs.length} Logs`;

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-5 text-center text-xs text-slate-400">No roster mutations recorded for period ${this.selectedMonth}.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs
      .map((l) => {
        const badgeCls = {
          EMERGENCY_PULL_IN: 'bg-indigo-100 text-indigo-800',
          PENDING_OFF_HIRE: 'bg-amber-100 text-amber-900',
          CANCEL_PENDING_OH: 'bg-slate-200 text-slate-700',
          COPY_ROSTER: 'bg-emerald-100 text-emerald-800'
        }[l.actionType] || 'bg-blue-100 text-blue-800';

        return `
          <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
            <td class="px-3 py-2 font-mono text-[11px] text-slate-600 whitespace-nowrap">${l.timestamp}</td>
            <td class="px-3 py-2 font-semibold text-slate-800">${l.username}</td>
            <td class="px-3 py-2 font-bold text-slate-900">${l.unitId}</td>
            <td class="px-3 py-2"><span class="px-2 py-0.5 text-[10px] font-bold rounded ${badgeCls}">${l.actionType}</span></td>
            <td class="px-3 py-2 text-slate-700">${l.detail}</td>
          </tr>`;
      })
      .join('');
  },

  exportCsv() {
    const allUnits = this.rosterUnits || [];
    if (allUnits.length === 0) {
      showToast('No fleet roster records to export.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-pop-export-csv');
    const headers = ['Site', 'Roster_Month', 'Unit_ID', 'Category', 'Equipment', 'Brand', 'Model', 'Roster_Status', 'On_Hired_Flag', 'Pending_Off_Hire', 'Replaced_Unit_ID', 'Technical_Reason'];
    const rows = allUnits.map((u) => [
      AuthModule.currentSite,
      this.selectedMonth,
      u.unitId,
      u.category,
      u.equipment,
      u.brand,
      u.model,
      u.status,
      ['W', 'SW'].includes(u.status) ? 'ON_HIRED' : 'OFF_HIRED',
      u.pendingOffHire ? 'YES' : 'NO',
      u.replacedUnitId || '',
      u.reason || ''
    ]);
    downloadCsvFile(`MPS_Monthly_Roster_${AuthModule.currentSite}_${this.selectedMonth}.csv`, headers, rows, btn);
    showToast('Monthly fleet roster exported to CSV.', 'success');
  },

  async saveBulkStatus(forceSave = false) {
    if (this.lockState.mode === 'HISTORICAL_FROZEN') {
      showToast('Historical roster period is permanently locked.', 'error');
      return;
    }

    const btn = document.getElementById('btn-save-bulk-status');
    const hasChanges = this.rosterUnits.some(
      (u) =>
        u.status !== u._origStatus ||
        Boolean(u.pendingOffHire) !== u._origPending ||
        (u.replacedUnitId || '') !== u._origReplaced ||
        (u.reason || '') !== u._origReason
    );

    if (!hasChanges && !forceSave && this.isMaterialized) {
      showToast('No roster changes detected.', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving Roster...';
    }

    const payloadUnits = this.rosterUnits.map((u) => ({
      unitId: u.unitId,
      status: u.status,
      pendingOffHire: Boolean(u.pendingOffHire),
      replacedUnitId: u.replacedUnitId || '',
      reason: u.reason || ''
    }));

    const res = await callBackendApi('MANAGE_UNIT_POPULATION', {
      mode: 'SAVE_MONTHLY_ROSTER',
      site: AuthModule.currentSite,
      month: this.selectedMonth,
      units: payloadUnits
    });

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Save Roster Changes';
    }

    if (res.status === 'success') {
      showToast(res.message, 'success');
      await this.loadMonth();
    } else {
      showToast(res.message || 'Failed to save monthly fleet roster.', 'error');
    }
  }
};

/* ============================================================================
 * 6. UNIT POPULATION REGISTRY MODULE
 * ============================================================================ */
const PopulationModule = {
  async pullFromMaster() {
    const btn = document.getElementById('btn-pull-master');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Syncing...';
    }

    await AuthModule.loadMasterData(AuthModule.currentSite);
    this.renderTable();

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sync from Master Data';
    }
    showToast(`Synced fleet population for site ${AuthModule.currentSite}.`, 'success');
  },

  renderTable() {
    const tbody = document.getElementById('tbody-population-list');
    const searchVal = String(document.getElementById('pop-search-input')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('pop-status-filter')?.value || 'ALL';
    const badge = document.getElementById('pop-total-badge');
    if (!tbody) return;

    const allUnits = AuthModule.masterData.allSiteUnits || [];
    const counts = { W: 0, SW: 0, R: 0, S: 0 };
    allUnits.forEach((u) => {
      if (counts[u.status] !== undefined) counts[u.status] += 1;
    });

    document.getElementById('pop-count-w').textContent = counts.W;
    document.getElementById('pop-count-sw').textContent = counts.SW;
    document.getElementById('pop-count-r').textContent = counts.R;
    document.getElementById('pop-count-s').textContent = counts.S;

    const activeTotal = counts.W + counts.SW + counts.R;
    if (badge) badge.textContent = `${activeTotal} Active / ${allUnits.length} Total (${AuthModule.currentSite})`;

    const filtered = allUnits.filter((u) => {
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (searchVal) {
        return (
          u.unitId.toLowerCase().includes(searchVal) ||
          u.model.toLowerCase().includes(searchVal) ||
          u.brand.toLowerCase().includes(searchVal) ||
          u.equipment.toLowerCase().includes(searchVal)
        );
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-slate-400">No units match the current filter.</td></tr>`;
      return;
    }

    const statusOptions = [
      { val: 'W', label: 'W (Working)' },
      { val: 'SW', label: 'SW (Standby Working)' },
      { val: 'R', label: 'R (Repair)' },
      { val: 'S', label: 'S (Scrap / Inactive)' }
    ];

    tbody.innerHTML = filtered
      .map((u) => {
        const isScrap = u.status === 'S';
        const rowCls = isScrap ? 'bg-slate-50 text-slate-400' : 'hover:bg-slate-50';
        const selectStyle = {
          W: 'border-emerald-300 bg-emerald-50 text-emerald-800',
          SW: 'border-blue-300 bg-blue-50 text-blue-800',
          R: 'border-amber-300 bg-amber-50 text-amber-800',
          S: 'border-rose-300 bg-rose-50 text-rose-700'
        }[u.status] || 'border-slate-300 bg-white';

        const opts = statusOptions
          .map((o) => `<option value="${o.val}" ${u.status === o.val ? 'selected' : ''}>${o.label}</option>`)
          .join('');

        return `
          <tr class="border-b border-slate-100 text-xs ${rowCls}">
            <td class="px-4 py-2 font-bold ${isScrap ? 'line-through' : 'text-slate-900'}">${u.unitId}</td>
            <td class="px-4 py-2">${u.category || '-'}</td>
            <td class="px-4 py-2">${u.equipment || '-'}</td>
            <td class="px-4 py-2">${u.brand || '-'}</td>
            <td class="px-4 py-2 font-medium">${u.model}</td>
            <td class="px-4 py-2">
              <select data-unit-id="${u.unitId}" data-old-status="${u.status}"
                onchange="PopulationModule.onInlineStatusChange(this)"
                class="pop-status-select px-2.5 py-1 text-xs font-semibold rounded border focus:outline-none ${selectStyle}">
                ${opts}
              </select>
            </td>
          </tr>`;
      })
      .join('');
  },

  onInlineStatusChange(selectEl) {
    if (selectEl.getAttribute('data-old-status') !== selectEl.value) {
      selectEl.classList.add('ring-2', 'ring-blue-500');
    } else {
      selectEl.classList.remove('ring-2', 'ring-blue-500');
    }
  },

  exportCsv() {
    const allUnits = AuthModule.masterData.allSiteUnits || [];
    if (allUnits.length === 0) {
      showToast('No fleet population records to export.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-pop-export-csv');
    const headers = ['Site', 'Unit_ID', 'Category', 'Equipment', 'Brand', 'Model', 'Population_Status'];
    const rows = allUnits.map((u) => [
      AuthModule.currentSite, u.unitId, u.category, u.equipment, u.brand, u.model, u.status
    ]);
    downloadCsvFile(`MPS_Unit_Population_${AuthModule.currentSite}.csv`, headers, rows, btn);
    showToast('Fleet population exported to CSV.', 'success');
  },

  async saveBulkStatus() {
    const btn = document.getElementById('btn-save-bulk-status');
    const changes = [];

    document.querySelectorAll('.pop-status-select').forEach((sel) => {
      const unitId = sel.getAttribute('data-unit-id');
      const oldStatus = sel.getAttribute('data-old-status');
      const newStatus = sel.value;
      if (unitId && oldStatus !== newStatus) {
        changes.push({ unitId: unitId, status: newStatus });
      }
    });

    if (changes.length === 0) {
      showToast('No status changes detected.', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = `Saving (${changes.length})...`;
    }

    const res = await callBackendApi('MANAGE_UNIT_POPULATION', {
      mode: 'BULK_UPDATE_STATUS',
      site: AuthModule.currentSite,
      changes: changes
    });

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Save Status Changes';
    }

    if (res.status === 'success') {
      showToast(res.message, 'success');
      await AuthModule.loadMasterData(AuthModule.currentSite);
      this.renderTable();
    } else {
      showToast(res.message || 'Failed to update unit status.', 'error');
    }
  }
};

/* ============================================================================
 * 7. EXECUTIVE REPORT MODULE (WEEKLY VS MONTHLY MANAGEMENT DETAIL PDF)
 *    - System Controls: English
 *    - PDF Report Content: Formal Indonesian Paper (BAB I - IV)
 * ============================================================================ */
const ReportModule = {
  reportType: 'MONTHLY', // 'WEEKLY' | 'MONTHLY'
  kpiData: null,
  analysisData: {
    source: 'SMART_ENGINE',
    summaryText: '',
    recommendations: []
  },
  trendChart: null,
  paretoChart: null,

  init() {
    const startInput = document.getElementById('rep-start-date');
    const endInput = document.getElementById('rep-end-date');
    if (startInput && endInput && (!startInput.value || !endInput.value)) {
      this.applyDatePreset('MTD', false);
    }
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

    this.load();
  },

  applyDatePreset(preset, triggerLoad = true) {
    const startInput = document.getElementById('rep-start-date');
    const endInput = document.getElementById('rep-end-date');
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

    if (triggerLoad) this.load();
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
    if (!startDate || !endDate) return;

    if (statusMsg) statusMsg.textContent = 'Preparing executive report preview...';

    const res = await callBackendApi('GET_DASHBOARD_KPI', {
      site: AuthModule.currentSite,
      startDate: startDate,
      endDate: endDate,
      model: model
    });

    if (res.status === 'success') {
      this.kpiData = res;
      this.analysisData = this.buildLocalIndonesianAnalysis(res, startDate, endDate, model, this.reportType);
      this.renderPreviewSheet();
      if (statusMsg) {
        statusMsg.textContent = `Executive report ready (${this.reportType === 'WEEKLY' ? 'Weekly Operational' : 'Monthly Management Detail'}).`;
      }
    } else if (statusMsg) {
      statusMsg.textContent = res.message || 'Failed to load report data.';
    }
  },

  async enhanceWithAi() {
    if (!this.kpiData) {
      await this.load();
    }
    const btn = document.getElementById('btn-report-ai');
    const statusMsg = document.getElementById('rep-status-msg');
    const startDate = document.getElementById('rep-start-date')?.value;
    const endDate = document.getElementById('rep-end-date')?.value;
    const model = document.getElementById('rep-filter-model')?.value || 'ALL';

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>&#9203;</span><span>Generating Gemini AI Analysis...</span>';
    }
    if (statusMsg) statusMsg.textContent = 'Connecting to Gemini AI Reliability Engine...';

    const res = await callBackendApi('GENERATE_AI_REPORT', {
      site: AuthModule.currentSite,
      startDate: startDate,
      endDate: endDate,
      model: model,
      reportType: this.reportType
    });

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>&#10024;</span><span>Generate AI Analysis (Gemini)</span>';
    }

    if (res.status === 'success' && res.summaryText) {
      this.analysisData = {
        source: res.source || 'GEMINI_AI',
        summaryText: res.summaryText,
        recommendations: res.recommendations || []
      };
      this.renderPreviewSheet();
      showToast(
        res.source === 'GEMINI_AI'
          ? 'Gemini AI Executive Analysis generated in Indonesian!'
          : 'Smart Reliability Engine analysis updated.',
        'success'
      );
      if (statusMsg) statusMsg.textContent = 'Executive analysis updated. Ready to download PDF.';
    } else {
      showToast(res.message || 'Using Smart Rule Engine analysis.', 'warning');
    }
  },

  buildLocalIndonesianAnalysis(kpiRes, startDate, endDate, filterModel, reportType) {
    const ov = kpiRes.overall;
    const target = kpiRes.target || 85;
    const isWeekly = reportType === 'WEEKLY';
    const paOk = ov.pa >= target;
    const uaOk = ov.ua >= target;
    const topComp = kpiRes.pareto && kpiRes.pareto.length > 0 ? kpiRes.pareto[0] : null;
    const lowestUnits = (kpiRes.byUnit || []).filter((u) => u.pa < target).sort((a, b) => a.pa - b.pa);
    const openCount = (kpiRes.activeBreakdowns || []).length;

    const scopeLabel = isWeekly
      ? `evaluasi operasional mingguan periode ${startDate} s/d ${endDate}`
      : `evaluasi bulanan manajemen periode ${startDate} s/d ${endDate}`;

    const parts = [];
    if (paOk) {
      parts.push(
        `Berdasarkan ${scopeLabel} (${filterModel === 'ALL' ? 'Seluruh Populasi Armada' : 'Model ' + filterModel}), kesiapan mekanis armada site ${kpiRes.site} tercapai sangat baik dengan Physical Availability (PA) sebesar ${ov.pa.toFixed(2)}% dan Mechanical Availability (MA) ${ov.ma.toFixed(2)}% (melampaui target manajemen ${target}%).`
      );
    } else {
      parts.push(
        `Berdasarkan ${scopeLabel} (${filterModel === 'ALL' ? 'Seluruh Populasi Armada' : 'Model ' + filterModel}), pencapaian Physical Availability (PA) site ${kpiRes.site} berada pada angka ${ov.pa.toFixed(2)}% (selisih ${(ov.pa - target).toFixed(2)}% terhadap target ${target}%), dipengaruhi oleh Unscheduled Breakdown sebesar ${ov.bdUnsched} jam (${ov.freqUnsched} kejadian) dengan rata-rata waktu perbaikan (MTTR) ${ov.mttr.toFixed(2)} jam.`
      );
    }

    if (!uaOk) {
      parts.push(
        `Dari sisi pemanfaatan unit siap operasi, Use of Availability (UA) tercatat ${ov.ua.toFixed(2)}% akibat akumulasi jam Standby (${ov.stbyHrs} jam) serta faktor cuaca/hujan (${ov.rainHrs} jam).`
      );
    } else {
      parts.push(
        `Pemanfaatan armada berjalan efektif dengan Use of Availability (UA) mencapai ${ov.ua.toFixed(2)}% dan jarak rata-rata antar kerusakan (MTBR) terjaga pada ${ov.mtbr.toFixed(2)} jam.`
      );
    }

    if (topComp) {
      parts.push(
        `Penyumbang kehilangan jam breakdown tidak terjadwal terbesar berasal dari kelompok komponen ${topComp.component} (${topComp.totalHours} jam).`
      );
    }

    const recs = [];
    if (topComp) {
      recs.push(`Lakukan inspeksi preventif terfokus (targeted inspection) dan pastikan ketersediaan fast-moving sparepart untuk kelompok komponen ${topComp.component}.`);
    }
    if (lowestUnits.length > 0) {
      const sample = lowestUnits.slice(0, 3).map((u) => `${u.unitId} (PA ${u.pa.toFixed(1)}%)`).join(', ');
      recs.push(`Prioritaskan backlog review dan evaluasi teknis pada unit dengan performa di bawah target: ${sample}.`);
    } else {
      recs.push(`Pertahankan kedisiplinan jadwal Preventive Maintenance (SVC/SCH) dan pemeriksaan harian P2H agar seluruh unit konsisten di atas target ${target}%.`);
    }
    if (openCount > 0) {
      recs.push(`Percepat penyelesaian perbaikan dan monitoring suplai suku cadang pada ${openCount} unit yang masih berstatus Breakdown (Belum RFU).`);
    }
    if (ov.stbyHrs > ov.wh * 0.15) {
      recs.push(`Optimalkan koordinasi harian antara tim Plant dan Operasional/Produksi untuk menekan jam Standby (${ov.stbyHrs} jam).`);
    }

    return {
      source: 'SMART_ENGINE',
      summaryText: parts.join(' '),
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

    // Executive Summary & Recommendations
    const isAi = this.analysisData.source === 'GEMINI_AI';
    document.getElementById('rep-ai-badge').textContent = isAi
      ? 'Analysis Engine: Gemini AI (Active)'
      : 'Analysis Engine: Smart Rule Engine';
    document.getElementById('rep-summary-source-tag').textContent = isAi
      ? 'Analisa Otomatis Gemini AI'
      : 'Analisa Otomatis Reliabilitas';
    document.getElementById('rep-summary-text').textContent = this.analysisData.summaryText;

    const recList = document.getElementById('rep-recommendations-list');
    recList.innerHTML = (this.analysisData.recommendations || []).map((r) => `<li>${r}</li>`).join('');
    this.syncCustomNotes();

    // Render Report Charts
    this.renderReportCharts(target);

    // Monthly Detailed Pareto Table (Hidden in Weekly mode, Shown in Monthly Management Detail mode)
    const paretoWrap = document.getElementById('rep-monthly-pareto-wrap');
    const tbodyPareto = document.getElementById('rep-tbody-pareto-detail');
    if (isWeekly) {
      paretoWrap?.classList.add('hidden');
    } else {
      paretoWrap?.classList.remove('hidden');
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

    // 3.2 Model Summary Table
    const byModel = this.kpiData.byModel || [];
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

    // 3.3 Unit Table (Weekly = Watchlist PA < 85%, Monthly = Full Fleet Audit)
    const allUnits = [...(this.kpiData.byUnit || [])];
    const displayUnits = isWeekly
      ? allUnits.filter((u) => u.pa < target).sort((a, b) => a.pa - b.pa)
      : allUnits.sort((a, b) => a.unitId.localeCompare(b.unitId));

    document.getElementById('rep-unit-section-title').textContent = isWeekly
      ? '3.3 Watchlist Unit Prioritas (PA Di Bawah Target 85%)'
      : '3.3 Rincian Lengkap Performa Seluruh Unit (Audit Bulanan Manajemen)';
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
   * Loads logo-ktc.png into Base64 PNG for embedding inside jsPDF header
   */
  loadLogoDataUrl(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 120;
          canvas.height = img.naturalHeight || 120;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
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
   * Bypasses browser window.print() blocking and downloads an official .pdf file directly.
   */
  async downloadPdf() {
    if (!this.kpiData) {
      await this.load();
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
      const logoAsset = await this.loadLogoDataUrl('logo-ktc.png');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();   // 297 mm
      const pageH = doc.internal.pageSize.getHeight();  // 210 mm
      const margin = 12;
      const contentW = pageW - margin * 2;

      const session = getUserSession();
      const startDate = document.getElementById('rep-start-date')?.value || '-';
      const endDate = document.getElementById('rep-end-date')?.value || '-';
      const model = document.getElementById('rep-filter-model')?.value || 'ALL';
      const isWeekly = this.reportType === 'WEEKLY';
      const target = this.kpiData.target || APP_CONFIG.KPI_TARGET;
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
        doc.addImage(logoAsset.dataUrl, 'PNG', margin + 4, 13.8, logoW, logoH - 1.6);
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
      curY += 5;

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
        doc.roundedRect(cx, curY, cardW, 18, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(c.title, cx + 2.5, curY + 4.5);

        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(c.val, cx + 2.5, curY + 11.2);

        doc.setFontSize(6.8);
        doc.setTextColor(c.ok ? 4 : 190, c.ok ? 120 : 18, c.ok ? 87 : 60);
        doc.text(c.sub, cx + 2.5, curY + 15.8);
      });
      curY += 22;

      // 1.1 Time Distribution Bar
      const totalCal = Math.round((ov.wh + ov.bdUnsched + ov.bdSched + ov.rainHrs + ov.stbyHrs) * 10) / 10;
      const pct = (v) => (totalCal > 0 ? (v / totalCal) * 100 : 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`1.1 Distribusi Alokasi Waktu Armada (Total Calendar: ${totalCal.toFixed(1)} Jam / 100%)`, margin, curY);
      curY += 2.5;

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
          doc.rect(barX, curY, w, 5.5, 'F');
          if (s.p >= 9) {
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6.8);
            doc.text(`${s.p.toFixed(1)}%`, barX + w / 2, curY + 3.8, { align: 'center' });
          }
          barX += w;
        }
      });
      curY += 8.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(timeSegs.map((s) => `• ${s.label}`).join('     '), margin, curY);
      curY += 5.5;

      // 1.2 Executive Summary Narrative Box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      const engineTag = this.analysisData.source === 'GEMINI_AI' ? '[Analisa Gemini AI]' : '[Analisa Otomatis Reliabilitas]';
      doc.text(`1.2 Ulasan Eksekutif (Executive Summary) ${engineTag}`, margin, curY);
      curY += 2.5;

      const summaryLines = doc.splitTextToSize(this.analysisData.summaryText || '-', contentW - 6);
      const boxH = summaryLines.length * 4 + 4;
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(147, 197, 253);
      doc.roundedRect(margin, curY, contentW, boxH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(summaryLines, margin + 3, curY + 4.5);
      curY += boxH + 6;

      // --- BAB II. ANALISIS TREN & PARETO KOMPONEN ---
      if (curY > 130) {
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
        const trendImg = trendCanvas.toDataURL('image/png', 1.0);
        const paretoImg = paretoCanvas.toDataURL('image/png', 1.0);
        const leftW = contentW * 0.62;
        const rightW = contentW * 0.36;

        doc.setFontSize(7.8);
        doc.text('Gambar 2.1 Tren Harian PA, MA & UA (%) vs Target 85%', margin, curY + 2);
        doc.text('Gambar 2.2 Top Komponen Breakdown (Jam)', margin + leftW + 5, curY + 2);

        doc.addImage(trendImg, 'PNG', margin, curY + 3.5, leftW, 44);
        doc.addImage(paretoImg, 'PNG', margin + leftW + 5, curY + 3.5, rightW, 44);
        curY += 51;
      }

      // Monthly Detailed Pareto Table
      if (!isWeekly && (this.kpiData.pareto || []).length > 0) {
        const paretoList = this.kpiData.pareto.slice(0, 10);
        const totPareto = paretoList.reduce((a, b) => a + b.totalHours, 0);
        let cum = 0;
        const pRows = paretoList.map((p, idx) => {
          const share = totPareto > 0 ? (p.totalHours / totPareto) * 100 : 0;
          cum = Math.min(100, cum + share);
          return [`#${idx + 1}`, p.component, `${p.totalHours.toFixed(2)} Jam`, `${share.toFixed(1)}%`, `${cum.toFixed(1)}%`];
        });

        doc.autoTable({
          startY: curY,
          margin: { left: margin, right: margin },
          head: [['Rank', 'Kelompok Komponen', 'Total Jam BD Unscheduled', 'Kontribusi (%)', 'Kumulatif (%)']],
          body: pRows,
          theme: 'grid',
          styles: { fontSize: 7.5, cellPadding: 1.8 },
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { halign: 'center', cellWidth: 16 },
            2: { halign: 'right', cellWidth: 45 },
            3: { halign: 'right', cellWidth: 32 },
            4: { halign: 'right', cellWidth: 32 }
          }
        });
        curY = doc.lastAutoTable.finalY + 6;
      }

      // --- BAB III. EVALUASI PERFORMA ARMADA & STATUS BREAKDOWN ---
      doc.addPage();
      curY = 15;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('BAB III. EVALUASI PERFORMA ARMADA & STATUS BREAKDOWN AKTIF', margin, curY);
      doc.line(margin, curY + 1.5, margin + contentW, curY + 1.5);
      curY += 5;

      // 3.1 Active Breakdown Table
      doc.setFontSize(8.5);
      doc.setTextColor(159, 18, 57);
      doc.text(`3.1 Status Unit Masih Breakdown / Belum RFU (${(this.kpiData.activeBreakdowns || []).length} Unit Down)`, margin, curY);
      curY += 2;

      const activeRows = (this.kpiData.activeBreakdowns || []).map((b) => {
        const dur = DashboardModule.calculateDownDuration(b.startDate, b.timeIn);
        return [b.unitId, b.model, `${b.startDate} (${b.timeIn})`, dur.text, b.code, b.location || '-', b.problem || '-'];
      });

      doc.autoTable({
        startY: curY,
        margin: { left: margin, right: margin },
        head: [['Unit ID', 'Model', 'Waktu Masuk BD', 'Durasi Down', 'Code', 'Lokasi', 'Keterangan Kerusakan (Problem)']],
        body: activeRows.length > 0 ? activeRows : [['-', '-', '-', '-', '-', '-', 'Seluruh unit dalam status siap operasi (RFU).']],
        theme: 'grid',
        styles: { fontSize: 7.3, cellPadding: 1.8 },
        headStyles: { fillColor: [159, 18, 57], textColor: 255, fontStyle: 'bold' }
      });
      curY = doc.lastAutoTable.finalY + 6;

      // 3.2 Model Summary Table
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
        theme: 'grid',
        styles: { fontSize: 7.4, cellPadding: 1.8 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' }, 6: { halign: 'right', fontStyle: 'bold' },
          7: { halign: 'right', fontStyle: 'bold' }, 8: { halign: 'right' }, 9: { halign: 'right' }
        }
      });
      curY = doc.lastAutoTable.finalY + 6;

      // 3.3 Unit Table (Weekly Watchlist vs Monthly Full Audit)
      const allUnits = [...(this.kpiData.byUnit || [])];
      const unitList = isWeekly
        ? allUnits.filter((u) => u.pa < target).sort((a, b) => a.pa - b.pa)
        : allUnits.sort((a, b) => a.unitId.localeCompare(b.unitId));

      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        isWeekly
          ? `3.3 Watchlist Unit Prioritas (PA < ${target}%): ${unitList.length} Unit`
          : `3.3 Rincian Lengkap Performa Seluruh Unit (Audit Bulanan Manajemen): ${unitList.length} Unit`,
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
        styles: { fontSize: 7.2, cellPadding: 1.6 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
          6: { halign: 'right', fontStyle: 'bold' }, 7: { halign: 'right' }, 8: { halign: 'right' },
          9: { halign: 'right' }, 10: { halign: 'right' }, 11: { halign: 'center', fontStyle: 'bold' }
        }
      });
      curY = doc.lastAutoTable.finalY + 6;

      // 3.4 Fleet Roster Mutation Audit Table in PDF
      const mutations = this.kpiData.rosterMutations || [];
      doc.setFontSize(8.5);
      doc.setTextColor(146, 64, 14);
      doc.text(`3.4 Catatan Mutasi Status Armada / On-Hired <-> Off-Hired Audit Log (${mutations.length} Mutasi)`, margin, curY);
      curY += 2;

      const mutRows = mutations.map((m) => [m.timestamp, m.unitId, m.actionType, m.username, m.detail]);
      doc.autoTable({
        startY: curY,
        margin: { left: margin, right: margin },
        head: [['Waktu', 'Unit ID', 'Jenis Mutasi', 'Oleh', 'Keterangan Teknis & Unit Pengganti']],
        body: mutRows.length > 0 ? mutRows : [['-', '-', '-', '-', 'Tidak ada perubahan mutasi status armada selama periode laporan ini.']],
        theme: 'grid',
        styles: { fontSize: 7.2, cellPadding: 1.6 },
        headStyles: { fillColor: [146, 64, 14], textColor: 255, fontStyle: 'bold' }
      });
      curY = doc.lastAutoTable.finalY + 8;

      // --- BAB IV. REKOMENDASI & LEMBAR PENGESAHAN ---
      if (curY > pageH - 68) {
        doc.addPage();
        curY = 15;
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('BAB IV. KESIMPULAN, REKOMENDASI TINDAK LANJUT & PENGESAHAN', margin, curY);
      doc.line(margin, curY + 1.5, margin + contentW, curY + 1.5);
      curY += 5;

      doc.setFontSize(8.2);
      doc.text('4.1 Rencana Tindak Lanjut Teknis (Action Plan):', margin, curY);
      curY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      (this.analysisData.recommendations || []).forEach((rec, i) => {
        const wrapped = doc.splitTextToSize(`${i + 1}. ${rec}`, contentW - 4);
        doc.text(wrapped, margin + 2, curY);
        curY += wrapped.length * 3.8 + 1;
      });

      const customNotes = String(document.getElementById('rep-custom-notes')?.value || '').trim();
      if (customNotes) {
        curY += 1.5;
        doc.setFont('helvetica', 'bold');
        const noteWrapped = doc.splitTextToSize(`Catatan Lapangan Khusus: ${customNotes}`, contentW - 4);
        doc.text(noteWrapped, margin + 2, curY);
        doc.setFont('helvetica', 'normal');
        curY += noteWrapped.length * 3.8 + 2;
      }

      // 3 Signature Columns
      curY = Math.max(curY + 6, pageH - 44);
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
        doc.line(centerX - 28, curY + 18, centerX + 28, curY + 18);
        doc.text(sc.role, centerX, curY + 22, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(sc.dept, centerX, curY + 25.5, { align: 'center' });
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
          'Generated by Machine Performance System (MPS) — Digital Fleet Reliability & KPI Intelligence developed at PT. KTC Coal Mining & Energy Workshop by Adi Pranata.',
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
        btn.innerHTML = '<span>Download PDF Report (A4 Landscape)</span>';
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
        { date: '2026-11-08', pa: 89.5, ma: 92.0, ua: 86.4 },
        { date: '2026-11-09', pa: 87.0, ma: 90.5, ua: 88.1 },
        { date: '2026-11-10', pa: 91.2, ma: 94.0, ua: 89.5 },
        { date: '2026-11-11', pa: 84.5, ma: 88.2, ua: 85.0 },
        { date: '2026-11-12', pa: 88.8, ma: 92.4, ua: 87.2 },
        { date: '2026-11-13', pa: 90.0, ma: 93.1, ua: 88.0 },
        { date: '2026-11-14', pa: 86.8, ma: 91.2, ua: 86.2 }
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
    const isFri = dObj.getDay() === 5;
    return {
      status: 'success',
      site: site,
      date: dt,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dObj.getDay()],
      isFriday: isFri,
      shifts: {
        DAY: { isWorking: true, standardHours: isFri ? 9 : 10, rainHours: 0 },
        NIGHT: { isWorking: true, standardHours: 10, rainHours: 0 }
      },
      operations: { DAY: [], NIGHT: [] },
      lastHmMap: { 'EX-1320': 14250.5, 'EX-1351': 11890.0, 'DT-4012': 22410.2 },
      breakdownMap: { DAY: { 'EX-1351': { hours: 2.5, codes: ['USCH'] } }, NIGHT: {} },
      monthlyStatus: { '2026-11-01': 'COMPLETE', '2026-11-02': 'COMPLETE', '2026-11-12': 'BD_ONLY' }
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
