/**
 * js/config.js
 * Konfigurasi URL Google Apps Script Web App & Helper Request API
 */

const APP_CONFIG = {
  APP_NAME: 'PLANT KPI MONITORING SYSTEM',
  COMPANY_NAME: 'PT. KTC COAL MINING & ENERGY',
  API_URL: 'https://script.google.com/macros/s/AKfycbwx0hDu5L7zKA_nMIz4eb0h9Z2mDGHYNoZD2tq_YYg16tET8ZbtPQAVW52fvcS0ehzopQ/exec',
  KPI_TARGET: 85,
  SITES: ['TTLP', 'TNPN']
};

/**
 * Helper utama untuk mengirim request POST ke Google Apps Script
 * Menggunakan text/plain agar tidak terkena blokir CORS preflight (OPTIONS) dari browser
 */
async function callBackendApi(action, payload = {}, customAuth = null) {
  const session = getUserSession();
  const auth = customAuth || (session ? {
    username: session.username,
    password: session.password
  } : {});

  try {
    const response = await fetch(APP_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: action,
        auth: auth,
        payload: payload
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API Request Failed:', error);
    return {
      status: 'error',
      message: 'Gagal terhubung ke server: ' + error.message
    };
  }
}

/**
 * Manajemen Sesi Login di Browser (sessionStorage)
 */
function saveUserSession(userObj, rawPassword) {
  const sessionData = {
    username: userObj.username,
    password: rawPassword,
    fullName: userObj.fullName,
    role: userObj.role,
    siteAccess: userObj.siteAccess
  };
  sessionStorage.setItem('plant_kpi_session', JSON.stringify(sessionData));
}

function getUserSession() {
  const raw = sessionStorage.getItem('plant_kpi_session');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function clearUserSession() {
  sessionStorage.removeItem('plant_kpi_session');
}
