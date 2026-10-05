// ========================================================
// Simple Smoke Detector - Client-side Logic (Vanilla JS)
// ========================================================

// Application State
const state = {
  currentUser: null,
  activeTab: 1,
  currentPage: 1,
  totalPages: 1,
  limit: 8,
  warningThreshold: 350,
  dangerThreshold: 650,
  isOnline: false,
  ledStatus: 'OFF',
  ledManualOverride: false,
  pollTimer: null,
  liveChart: null,
  historyChart: null
};

// ========================================================
// DOM Elements
// ========================================================
const el = {
  // Auth
  authScreen: document.getElementById('authScreen'),
  authTabLogin: document.getElementById('authTabLogin'),
  authTabRegister: document.getElementById('authTabRegister'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  regName: document.getElementById('regName'),
  regEmail: document.getElementById('regEmail'),
  regPassword: document.getElementById('regPassword'),
  authAlert: document.getElementById('authAlert'),
  btnQuickDemo: document.getElementById('btnQuickDemo'),
  headerUserName: document.getElementById('headerUserName'),
  btnLogout: document.getElementById('btnLogout'),

  // ESP8266 Status Badge
  espStatusBadge: document.getElementById('espStatusBadge'),
  espStatusDot: document.getElementById('espStatusDot'),
  espStatusText: document.getElementById('espStatusText'),

  // Theme Toggle
  btnThemeToggle: document.getElementById('btnThemeToggle'),
  themeIconSun: document.getElementById('themeIconSun'),
  themeIconMoon: document.getElementById('themeIconMoon'),

  // Navigation Tabs
  navTab1: document.getElementById('navTab1'),
  navTab2: document.getElementById('navTab2'),
  navTab3: document.getElementById('navTab3'),
  tabContent1: document.getElementById('tabContent1'),
  tabContent2: document.getElementById('tabContent2'),
  tabContent3: document.getElementById('tabContent3'),

  // Tab 1 Hero & Gauge
  currentSensorValue: document.getElementById('currentSensorValue'),
  sensorLevelPercent: document.getElementById('sensorLevelPercent'),
  gaugeArcFill: document.getElementById('gaugeArcFill'),
  safetyStatusBadge: document.getElementById('safetyStatusBadge'),
  safetyStatusText: document.getElementById('safetyStatusText'),
  safetyStatusIcon: document.getElementById('safetyStatusIcon'),
  heroCardGlow: document.getElementById('heroCardGlow'),
  seekBarIndicator: document.getElementById('seekBarIndicator'),
  seekBarValText: document.getElementById('seekBarValText'),
  lblWarningThreshold: document.getElementById('lblWarningThreshold'),
  lblDangerThreshold: document.getElementById('lblDangerThreshold'),
  lastUpdatedTime: document.getElementById('lastUpdatedTime'),
  lastUpdatedDate: document.getElementById('lastUpdatedDate'),

  // Thresholds Form
  thresholdForm: document.getElementById('thresholdForm'),
  inputWarningThreshold: document.getElementById('inputWarningThreshold'),
  inputDangerThreshold: document.getElementById('inputDangerThreshold'),
  badgeWarningVal: document.getElementById('badgeWarningVal'),
  badgeDangerVal: document.getElementById('badgeDangerVal'),

  // Table & Pagination
  readingsTableBody: document.getElementById('readingsTableBody'),
  btnRefreshTable: document.getElementById('btnRefreshTable'),
  btnPrevPage: document.getElementById('btnPrevPage'),
  btnNextPage: document.getElementById('btnNextPage'),
  paginationPages: document.getElementById('paginationPages'),
  paginationInfo: document.getElementById('paginationInfo'),

  // Tab 2 Smart Display
  smartDisplayForm: document.getElementById('smartDisplayForm'),
  lcdField1: document.getElementById('lcdField1'),
  lcdField2: document.getElementById('lcdField2'),
  charCountR1: document.getElementById('charCountR1'),
  charCountR2: document.getElementById('charCountR2'),
  lcdPreviewR1: document.getElementById('lcdPreviewR1'),
  lcdPreviewR2: document.getElementById('lcdPreviewR2'),

  // Tab 3 LED Control
  ledBulbElement: document.getElementById('ledBulbElement'),
  ledBulbIcon: document.getElementById('ledBulbIcon'),
  ledBulbStateText: document.getElementById('ledBulbStateText'),
  ledAuraGlow: document.getElementById('ledAuraGlow'),
  ledStateHeroBadge: document.getElementById('ledStateHeroBadge'),
  ledStateIndicatorDot: document.getElementById('ledStateIndicatorDot'),
  ledStateHeroText: document.getElementById('ledStateHeroText'),
  btnToggleLed: document.getElementById('btnToggleLed'),
  btnToggleLedText: document.getElementById('btnToggleLedText'),
  btnResetAutoLed: document.getElementById('btnResetAutoLed'),
  lblLedMode: document.getElementById('lblLedMode'),
  telemetrySmokeStatus: document.getElementById('telemetrySmokeStatus'),
  telemetryEspStatus: document.getElementById('telemetryEspStatus'),
  telemetryLedPin: document.getElementById('telemetryLedPin'),
  noticeDangerThreshold: document.getElementById('noticeDangerThreshold'),

  // Hardware Simulator Modal
  btnOpenSimulator: document.getElementById('btnOpenSimulator'),
  simModal: document.getElementById('simModal'),
  btnCloseSim: document.getElementById('btnCloseSim'),
  simSlider: document.getElementById('simSlider'),
  simValPreview: document.getElementById('simValPreview'),
  btnSendSimReading: document.getElementById('btnSendSimReading'),

  // Toast Container
  toastContainer: document.getElementById('toastContainer')
};

// ========================================================
// INITIALIZATION
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initTheme();
  checkAuth();
  setupEventListeners();
  initCharts();
});

function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ========================================================
// THEME HANDLING (Light / Dark)
// ========================================================
function initTheme() {
  const savedTheme = localStorage.getItem('smd_theme') || 'dark';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    el.themeIconSun.classList.add('hidden');
    el.themeIconMoon.classList.remove('hidden');
    localStorage.setItem('smd_theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    el.themeIconSun.classList.remove('hidden');
    el.themeIconMoon.classList.add('hidden');
    localStorage.setItem('smd_theme', 'light');
  }
  updateChartThemes();
  initIcons();
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
}

// ========================================================
// AUTHENTICATION FLOW
// ========================================================
function checkAuth() {
  const storedUser = localStorage.getItem('smd_user');
  if (storedUser) {
    try {
      state.currentUser = JSON.parse(storedUser);
      showDashboard();
      return;
    } catch (e) {
      localStorage.removeItem('smd_user');
    }
  }
  showAuthModal();
}

function showAuthModal() {
  el.authScreen.classList.remove('hidden');
  stopPolling();
}

function showDashboard() {
  el.authScreen.classList.add('hidden');
  el.headerUserName.textContent = state.currentUser ? state.currentUser.name : 'User';
  fetchDashboardData();
  fetchReadingsTable(1);
  fetchChartHistory();
  startPolling();
  initIcons();
}

function handleLogout() {
  localStorage.removeItem('smd_user');
  state.currentUser = null;
  stopPolling();
  showAuthModal();
  showToast('Logged out successfully', 'info');
}

function showAuthError(msg) {
  el.authAlert.className = 'mb-4 p-3 rounded-lg text-xs font-medium border flex items-center gap-2 bg-rose-500/10 text-rose-300 border-rose-500/30';
  el.authAlert.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4"></i> <span>${msg}</span>`;
  el.authAlert.classList.remove('hidden');
  initIcons();
}

function showAuthSuccess(msg) {
  el.authAlert.className = 'mb-4 p-3 rounded-lg text-xs font-medium border flex items-center gap-2 bg-teal-500/10 text-teal-300 border-teal-500/30';
  el.authAlert.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> <span>${msg}</span>`;
  el.authAlert.classList.remove('hidden');
  initIcons();
}

// ========================================================
// NAVIGATION TABS
// ========================================================
function switchTab(tabNumber) {
  state.activeTab = tabNumber;

  // Buttons
  [el.navTab1, el.navTab2, el.navTab3].forEach((btn, idx) => {
    if (idx + 1 === tabNumber) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Content Sections
  el.tabContent1.classList.toggle('hidden', tabNumber !== 1);
  el.tabContent2.classList.toggle('hidden', tabNumber !== 2);
  el.tabContent3.classList.toggle('hidden', tabNumber !== 3);

  if (tabNumber === 1 && state.liveChart) {
    state.liveChart.resize();
    if (state.historyChart) state.historyChart.resize();
  }

  initIcons();
}

// ========================================================
// API DATA FETCHING & UI UPDATES
// ========================================================
async function fetchDashboardData() {
  try {
    const res = await fetch('/api/dashboard/status');
    if (!res.ok) return;
    const data = await res.json();

    state.warningThreshold = data.warningThreshold || 350;
    state.dangerThreshold = data.dangerThreshold || 650;
    state.isOnline = data.isOnline;
    state.ledStatus = data.ledStatus || 'OFF';
    state.ledManualOverride = !!data.ledManualOverride;

    updateHeroSensorCard(data);
    updateEspStatusBadge(data.isOnline);
    updateLedActuatorUI(data.ledStatus, data.ledManualOverride);
    updateLcdInputs(data.lcdLine1, data.lcdLine2);

    // Update Live Chart with latest reading
    if (data.sensorValue !== undefined && data.time) {
      appendReadingToLiveChart(data.time, data.sensorValue);
    }
  } catch (err) {
    console.warn('Dashboard fetch error:', err);
  }
}

// Update Hero Card & Gauge
function updateHeroSensorCard(data) {
  const val = Number(data.sensorValue) || 0;
  const status = data.status || 'SAFE';

  // Value and percentage
  el.currentSensorValue.textContent = val;
  const percent = Math.min(100, Math.round((val / 1023) * 100));
  el.sensorLevelPercent.textContent = `${percent}% of 1023 max scale`;
  el.seekBarValText.textContent = `${val} / 1023`;
  el.seekBarIndicator.style.width = `${percent}%`;

  // Semi-circle gauge arc offset (circumference = 251.2)
  const offset = 251.2 - (val / 1023) * 251.2;
  el.gaugeArcFill.style.strokeDashoffset = Math.max(0, offset);

  // Status Badge and Colors
  el.safetyStatusText.textContent = status;
  el.telemetrySmokeStatus.textContent = status;

  if (status === 'DANGER') {
    el.gaugeArcFill.setAttribute('stroke', '#ef4444'); // Red
    el.safetyStatusBadge.className = 'px-5 py-2 rounded-2xl text-sm font-bold tracking-wider uppercase flex items-center gap-2 shadow-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse';
    el.safetyStatusIcon.setAttribute('data-lucide', 'alert-octagon');
    el.heroCardGlow.className = 'absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 glow-danger';
    el.telemetrySmokeStatus.className = 'text-sm font-bold text-rose-400 mt-1 uppercase';
  } else if (status === 'WARNING') {
    el.gaugeArcFill.setAttribute('stroke', '#f59e0b'); // Amber
    el.safetyStatusBadge.className = 'px-5 py-2 rounded-2xl text-sm font-bold tracking-wider uppercase flex items-center gap-2 shadow-lg bg-amber-500/20 text-amber-300 border border-amber-500/40';
    el.safetyStatusIcon.setAttribute('data-lucide', 'alert-triangle');
    el.heroCardGlow.className = 'absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 glow-warning';
    el.telemetrySmokeStatus.className = 'text-sm font-bold text-amber-400 mt-1 uppercase';
  } else {
    el.gaugeArcFill.setAttribute('stroke', '#14b8a6'); // Teal
    el.safetyStatusBadge.className = 'px-5 py-2 rounded-2xl text-sm font-bold tracking-wider uppercase flex items-center gap-2 shadow-lg bg-teal-500/20 text-teal-300 border border-teal-500/40';
    el.safetyStatusIcon.setAttribute('data-lucide', 'shield-check');
    el.heroCardGlow.className = 'absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 glow-safe';
    el.telemetrySmokeStatus.className = 'text-sm font-bold text-teal-400 mt-1 uppercase';
  }

  // Update timestamps
  el.lastUpdatedTime.textContent = data.time || '--:--';
  el.lastUpdatedDate.textContent = (data.date || '--') + ' IST';

  // Update thresholds UI labels
  el.lblWarningThreshold.textContent = `${state.warningThreshold} Warning`;
  el.lblDangerThreshold.textContent = `${state.dangerThreshold} Danger`;
  el.noticeDangerThreshold.textContent = state.dangerThreshold;

  // Sync inputs if not focused
  if (document.activeElement !== el.inputWarningThreshold) {
    el.inputWarningThreshold.value = state.warningThreshold;
    el.badgeWarningVal.textContent = state.warningThreshold;
  }
  if (document.activeElement !== el.inputDangerThreshold) {
    el.inputDangerThreshold.value = state.dangerThreshold;
    el.badgeDangerVal.textContent = state.dangerThreshold;
  }

  initIcons();
}

// Update ESP8266 ONLINE / OFFLINE Status Badge
function updateEspStatusBadge(isOnline) {
  if (isOnline) {
    el.espStatusBadge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shadow-sm';
    el.espStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping';
    el.espStatusText.textContent = 'ESP8266 ONLINE';
    el.telemetryEspStatus.textContent = 'ONLINE';
    el.telemetryEspStatus.className = 'text-sm font-bold text-emerald-400 mt-1 uppercase';
  } else {
    el.espStatusBadge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-400 shadow-sm';
    el.espStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-500';
    el.espStatusText.textContent = 'ESP8266 OFFLINE';
    el.telemetryEspStatus.textContent = 'OFFLINE';
    el.telemetryEspStatus.className = 'text-sm font-bold text-slate-400 mt-1 uppercase';
  }
}

// Update LED UI Elements (Tab 3 & Indicators)
function updateLedActuatorUI(status, isManual) {
  const isOn = status === 'ON';

  if (isOn) {
    el.ledBulbElement.classList.add('led-on-glow');
    el.ledAuraGlow.classList.add('led-on-aura');
    el.ledBulbIcon.className = 'w-16 h-16 text-teal-200 transition-all duration-500';
    el.ledBulbStateText.textContent = 'ON';
    el.ledBulbStateText.className = 'text-xs font-mono font-bold text-white mt-1 uppercase tracking-wider';

    el.ledStateHeroBadge.className = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-lg';
    el.ledStateIndicatorDot.className = 'w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping';
    el.ledStateHeroText.textContent = 'LED IS ACTIVE (HIGH)';

    el.btnToggleLedText.textContent = 'Turn LED OFF';
    el.btnToggleLed.className = 'px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-300 flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700';

    el.telemetryLedPin.textContent = 'HIGH (ON)';
    el.telemetryLedPin.className = 'text-sm font-bold text-teal-400 mt-1 uppercase';
  } else {
    el.ledBulbElement.classList.remove('led-on-glow');
    el.ledAuraGlow.classList.remove('led-on-aura');
    el.ledBulbIcon.className = 'w-16 h-16 text-slate-600 transition-all duration-500';
    el.ledBulbStateText.textContent = 'OFF';
    el.ledBulbStateText.className = 'text-xs font-mono font-bold text-slate-500 mt-1 uppercase tracking-wider';

    el.ledStateHeroBadge.className = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold bg-slate-800 text-slate-400 border border-slate-700';
    el.ledStateIndicatorDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-500';
    el.ledStateHeroText.textContent = 'LED IS OFF (LOW)';

    el.btnToggleLedText.textContent = 'Turn LED ON';
    el.btnToggleLed.className = 'px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-300 flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700';

    el.telemetryLedPin.textContent = 'LOW (OFF)';
    el.telemetryLedPin.className = 'text-sm font-bold text-slate-400 mt-1 uppercase';
  }

  if (isManual) {
    el.lblLedMode.innerHTML = `Mode: <strong class="text-amber-400 font-medium">Manual Override</strong>`;
  } else {
    el.lblLedMode.innerHTML = `Mode: <strong class="text-teal-400 font-medium">Automatic (Danger Alert)</strong>`;
  }

  initIcons();
}

// Update LCD Text Fields if not actively typing
function updateLcdInputs(line1, line2) {
  if (document.activeElement !== el.lcdField1 && line1 !== undefined) {
    el.lcdField1.value = line1;
    el.charCountR1.textContent = `${line1.length} / 16`;
    el.lcdPreviewR1.textContent = line1.padEnd(16, ' ').substring(0, 16);
  }
  if (document.activeElement !== el.lcdField2 && line2 !== undefined) {
    el.lcdField2.value = line2;
    el.charCountR2.textContent = `${line2.length} / 16`;
    el.lcdPreviewR2.textContent = line2.padEnd(16, ' ').substring(0, 16);
  }
}

// ========================================================
// SECTION 2: SAVED RECORDS TABLE & PAGINATION
// ========================================================
async function fetchReadingsTable(page = 1) {
  try {
    const res = await fetch(`/api/readings?page=${page}&limit=${state.limit}`);
    if (!res.ok) return;
    const data = await res.json();

    state.currentPage = data.page;
    state.totalPages = data.totalPages;

    renderReadingsTable(data.readings, data.page, data.limit);
    renderPaginationControls(data.page, data.totalPages, data.total);
  } catch (err) {
    console.error('Failed to load table readings:', err);
  }
}

function renderReadingsTable(readings, page, limit) {
  if (!readings || readings.length === 0) {
    el.readingsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-8 text-center text-slate-500 text-xs">
          No records found. Readings from the ESP8266 or simulator will be saved here automatically.
        </td>
      </tr>
    `;
    return;
  }

  const startIdx = (page - 1) * limit;
  let rowsHtml = '';

  readings.forEach((r, idx) => {
    const rowNum = startIdx + idx + 1;
    let badgeClass = 'bg-teal-500/10 text-teal-300 border-teal-500/20';
    if (r.status === 'WARNING') badgeClass = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    if (r.status === 'DANGER') badgeClass = 'bg-rose-500/10 text-rose-300 border-rose-500/20';

    rowsHtml += `
      <tr class="hover:bg-slate-700/30 transition">
        <td class="px-4 py-3 font-mono text-xs text-slate-400 font-semibold">${rowNum}</td>
        <td class="px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="font-bold text-sm text-white">${r.sensorValue}</span>
            <span class="text-[10px] text-slate-500 uppercase">ADC</span>
          </div>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}">
            ${r.status}
          </span>
        </td>
        <td class="px-4 py-3 font-mono text-xs text-slate-300">${r.time || '--'}</td>
        <td class="px-4 py-3 font-mono text-xs text-slate-400">${r.date || '--'}</td>
        <td class="px-4 py-3 text-right">
          <button class="btn-delete-row p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  data-id="${r.id}" title="Delete Record">
            <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
          </button>
        </td>
      </tr>
    `;
  });

  el.readingsTableBody.innerHTML = rowsHtml;
  initIcons();

  // Attach delete listeners
  document.querySelectorAll('.btn-delete-row').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.getAttribute('data-id');
      if (!confirm('Are you sure you want to delete this sensor record?')) return;
      try {
        const res = await fetch(`/api/readings/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Record deleted successfully', 'success');
          fetchReadingsTable(state.currentPage);
          fetchChartHistory();
        } else {
          showToast('Failed to delete record', 'error');
        }
      } catch (err) {
        showToast('Network error while deleting', 'error');
      }
    });
  });
}

function renderPaginationControls(page, totalPages, total) {
  const startItem = total === 0 ? 0 : (page - 1) * state.limit + 1;
  const endItem = Math.min(page * state.limit, total);

  el.paginationInfo.innerHTML = `
    Showing <span class="font-semibold text-slate-200">${startItem}</span> to <span class="font-semibold text-slate-200">${endItem}</span> of <span class="font-semibold text-slate-200">${total}</span> records
  `;

  el.btnPrevPage.disabled = page <= 1;
  el.btnNextPage.disabled = page >= totalPages;

  let pagesHtml = '';
  const maxButtons = 5;
  let startP = Math.max(1, page - 2);
  let endP = Math.min(totalPages, startP + maxButtons - 1);
  if (endP - startP < maxButtons - 1) {
    startP = Math.max(1, endP - maxButtons + 1);
  }

  for (let p = startP; p <= endP; p++) {
    const isActive = p === page;
    pagesHtml += `
      <button class="page-num-btn px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
        isActive
          ? 'bg-teal-500 text-white shadow'
          : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600'
      }" data-page="${p}">${p}</button>
    `;
  }
  el.paginationPages.innerHTML = pagesHtml;

  document.querySelectorAll('.page-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPage = parseInt(btn.getAttribute('data-page'));
      fetchReadingsTable(targetPage);
    });
  });
}

// ========================================================
// GRAPHS (CHART.JS)
// ========================================================
function initCharts() {
  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  // Live Chart (Realtime Stream)
  const ctxLive = document.getElementById('liveChart').getContext('2d');
  const gradientLive = ctxLive.createLinearGradient(0, 0, 0, 200);
  gradientLive.addColorStop(0, 'rgba(20, 184, 166, 0.4)');
  gradientLive.addColorStop(1, 'rgba(20, 184, 166, 0.0)');

  state.liveChart = new Chart(ctxLive, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Sensor Value (A0)',
        data: [],
        borderColor: '#14b8a6',
        backgroundColor: gradientLive,
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#2dd4bf'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 } }
        },
        y: {
          min: 0,
          max: 1024,
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#2dd4bf',
          bodyColor: '#ffffff',
          borderColor: '#14b8a6',
          borderWidth: 1
        }
      }
    }
  });

  // History Chart
  const ctxHistory = document.getElementById('historyChart').getContext('2d');
  const gradientHistory = ctxHistory.createLinearGradient(0, 0, 0, 200);
  gradientHistory.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
  gradientHistory.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

  state.historyChart = new Chart(ctxHistory, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Historical MQ-2 Reading',
        data: [],
        backgroundColor: '#06b6d4',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 }
        },
        y: {
          min: 0,
          max: 1024,
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#38bdf8',
          bodyColor: '#ffffff',
          borderColor: '#06b6d4',
          borderWidth: 1
        }
      }
    }
  });
}

function updateChartThemes() {
  if (!state.liveChart || !state.historyChart) return;
  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  [state.liveChart, state.historyChart].forEach(chart => {
    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.x.ticks.color = textColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.scales.y.ticks.color = textColor;
    chart.update();
  });
}

function appendReadingToLiveChart(timeLabel, value) {
  if (!state.liveChart) return;
  const labels = state.liveChart.data.labels;
  const dataset = state.liveChart.data.datasets[0].data;

  // Avoid duplicate back-to-back timestamp
  if (labels.length > 0 && labels[labels.length - 1] === timeLabel && dataset[dataset.length - 1] === value) {
    return;
  }

  labels.push(timeLabel);
  dataset.push(value);

  // Keep last 15 points
  if (labels.length > 15) {
    labels.shift();
    dataset.shift();
  }

  state.liveChart.update('none');
}

async function fetchChartHistory() {
  try {
    const res = await fetch('/api/readings/history');
    if (!res.ok) return;
    const history = await res.json();
    if (!state.historyChart) return;

    const labels = history.map(h => h.time || '');
    const data = history.map(h => h.sensorValue || 0);

    state.historyChart.data.labels = labels;
    state.historyChart.data.datasets[0].data = data;

    // Color bars by status
    const bgColors = history.map(h => {
      if (h.status === 'DANGER') return '#ef4444';
      if (h.status === 'WARNING') return '#f59e0b';
      return '#14b8a6';
    });
    state.historyChart.data.datasets[0].backgroundColor = bgColors;

    state.historyChart.update();
  } catch (err) {
    console.error('Error fetching history chart:', err);
  }
}

// ========================================================
// POLLING LOOP (Every 3 seconds)
// ========================================================
function startPolling() {
  stopPolling();
  state.pollTimer = setInterval(() => {
    fetchDashboardData();
  }, 3000);
}

function stopPolling() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

// ========================================================
// EVENT LISTENERS SETUP
// ========================================================
function setupEventListeners() {
  // Theme Toggle
  el.btnThemeToggle.addEventListener('click', toggleTheme);

  // Auth Tabs (Sign In vs Register)
  el.authTabLogin.addEventListener('click', () => {
    el.authTabLogin.className = 'flex-1 py-2 text-sm font-semibold rounded-lg bg-teal-500 text-white shadow-md transition-all';
    el.authTabRegister.className = 'flex-1 py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-white transition-all';
    el.loginForm.classList.remove('hidden');
    el.registerForm.classList.add('hidden');
    el.authAlert.classList.add('hidden');
  });

  el.authTabRegister.addEventListener('click', () => {
    el.authTabRegister.className = 'flex-1 py-2 text-sm font-semibold rounded-lg bg-teal-500 text-white shadow-md transition-all';
    el.authTabLogin.className = 'flex-1 py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-white transition-all';
    el.registerForm.classList.remove('hidden');
    el.loginForm.classList.add('hidden');
    el.authAlert.classList.add('hidden');
  });

  // Login Form Submit
  el.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el.loginEmail.value.trim();
    const password = el.loginPassword.value.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        state.currentUser = data.user;
        localStorage.setItem('smd_user', JSON.stringify(data.user));
        showDashboard();
        showToast(`Welcome back, ${data.user.name}!`, 'success');
      } else {
        showAuthError(data.message || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      showAuthError('Unable to connect to server. Check network connection.');
    }
  });

  // Register Form Submit
  el.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = el.regName.value.trim();
    const email = el.regEmail.value.trim();
    const password = el.regPassword.value.trim();

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        state.currentUser = data.user;
        localStorage.setItem('smd_user', JSON.stringify(data.user));
        showDashboard();
        showToast(`Account created! Welcome, ${data.user.name}!`, 'success');
      } else {
        showAuthError(data.message || 'Registration failed.');
      }
    } catch (err) {
      showAuthError('Unable to connect to server.');
    }
  });

  // Quick Demo Access
  el.btnQuickDemo.addEventListener('click', () => {
    el.loginEmail.value = 'rudraksh@example.com';
    el.loginPassword.value = 'password123';
    el.loginForm.dispatchEvent(new Event('submit'));
  });

  // Logout
  el.btnLogout.addEventListener('click', handleLogout);

  // Tab Navigation
  el.navTab1.addEventListener('click', () => switchTab(1));
  el.navTab2.addEventListener('click', () => switchTab(2));
  el.navTab3.addEventListener('click', () => switchTab(3));

  // Threshold sliders live badge update
  el.inputWarningThreshold.addEventListener('input', (e) => {
    el.badgeWarningVal.textContent = e.target.value;
  });
  el.inputDangerThreshold.addEventListener('input', (e) => {
    el.badgeDangerVal.textContent = e.target.value;
  });

  // Save Thresholds Form
  el.thresholdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const warning = parseInt(el.inputWarningThreshold.value);
    const danger = parseInt(el.inputDangerThreshold.value);

    if (danger <= warning) {
      showToast('Danger threshold must be strictly greater than Warning threshold', 'error');
      return;
    }

    try {
      const res = await fetch('/api/settings/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warningThreshold: warning, dangerThreshold: danger })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Thresholds saved! ESP8266 synced.', 'success');
        fetchDashboardData();
      } else {
        showToast(data.message || 'Failed to update thresholds', 'error');
      }
    } catch (err) {
      showToast('Network error while saving thresholds', 'error');
    }
  });

  // Refresh Table Button
  el.btnRefreshTable.addEventListener('click', () => {
    fetchReadingsTable(state.currentPage);
    fetchChartHistory();
    showToast('Records refreshed', 'info');
  });

  // Pagination Prev / Next
  el.btnPrevPage.addEventListener('click', () => {
    if (state.currentPage > 1) fetchReadingsTable(state.currentPage - 1);
  });
  el.btnNextPage.addEventListener('click', () => {
    if (state.currentPage < state.totalPages) fetchReadingsTable(state.currentPage + 1);
  });

  // Smart Display Input Char Counters & Live Preview
  el.lcdField1.addEventListener('input', (e) => {
    const val = e.target.value;
    el.charCountR1.textContent = `${val.length} / 16`;
    el.lcdPreviewR1.textContent = val.padEnd(16, ' ').substring(0, 16);
  });

  el.lcdField2.addEventListener('input', (e) => {
    const val = e.target.value;
    el.charCountR2.textContent = `${val.length} / 16`;
    el.lcdPreviewR2.textContent = val.padEnd(16, ' ').substring(0, 16);
  });

  // Preset Buttons for Smart Display
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const r1 = btn.getAttribute('data-r1');
      const r2 = btn.getAttribute('data-r2');
      el.lcdField1.value = r1;
      el.lcdField2.value = r2;
      el.charCountR1.textContent = `${r1.length} / 16`;
      el.charCountR2.textContent = `${r2.length} / 16`;
      el.lcdPreviewR1.textContent = r1.padEnd(16, ' ').substring(0, 16);
      el.lcdPreviewR2.textContent = r2.padEnd(16, ' ').substring(0, 16);
    });
  });

  // Save Smart Display Text Form
  el.smartDisplayForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const line1 = el.lcdField1.value.trim().substring(0, 16);
    const line2 = el.lcdField2.value.trim().substring(0, 16);

    try {
      const res = await fetch('/api/smart-display', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line1, line2 })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Smart Display updated! Ready for ESP8266 LCD.', 'success');
      } else {
        showToast('Failed to update Smart Display', 'error');
      }
    } catch (err) {
      showToast('Network error updating Smart Display', 'error');
    }
  });

  // LED Toggle Handlers
  el.btnToggleLed.addEventListener('click', toggleLedState);
  el.ledBulbElement.addEventListener('click', toggleLedState);

  // LED Reset Auto Mode
  el.btnResetAutoLed.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/led/auto', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('LED switched back to Automatic Danger Alert mode', 'info');
        fetchDashboardData();
      }
    } catch (err) {
      showToast('Error resetting LED mode', 'error');
    }
  });

  // Hardware Simulator Controls
  el.btnOpenSimulator.addEventListener('click', () => {
    el.simModal.classList.remove('hidden');
  });
  el.btnCloseSim.addEventListener('click', () => {
    el.simModal.classList.add('hidden');
  });

  el.simSlider.addEventListener('input', (e) => {
    el.simValPreview.textContent = e.target.value;
  });

  document.querySelectorAll('.sim-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-val');
      el.simSlider.value = v;
      el.simValPreview.textContent = v;
    });
  });

  el.btnSendSimReading.addEventListener('click', async () => {
    const val = parseInt(el.simSlider.value);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensorValue: val })
      });
      if (res.ok) {
        showToast(`Injected Reading: ${val} ADC`, 'success');
        fetchDashboardData();
        fetchReadingsTable(1);
        fetchChartHistory();
      }
    } catch (err) {
      showToast('Failed to send simulation', 'error');
    }
  });
}

// Toggle LED Action
async function toggleLedState() {
  try {
    const res = await fetch('/api/led/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, 'info');
      fetchDashboardData();
    }
  } catch (err) {
    showToast('Failed to toggle LED state', 'error');
  }
}

// ========================================================
// TOAST NOTIFICATIONS
// ========================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  let iconName = 'info';
  let borderClass = 'border-teal-500/40 bg-slate-900/90 text-teal-300';

  if (type === 'success') {
    iconName = 'check-circle';
    borderClass = 'border-emerald-500/40 bg-slate-900/90 text-emerald-300';
  } else if (type === 'error') {
    iconName = 'alert-triangle';
    borderClass = 'border-rose-500/40 bg-slate-900/90 text-rose-300';
  }

  toast.className = `toast-animate pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border ${borderClass} shadow-xl backdrop-blur-md text-xs font-semibold`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>
    <span>${message}</span>
  `;

  el.toastContainer.appendChild(toast);
  initIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
