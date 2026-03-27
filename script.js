/* ═══════════════════════════════════════════════════════════════
   PHANTOM POWER COST ESTIMATOR — Complete Dashboard Engine
   Firebase RTDB REST API + Energy Breakdown
   Pure HTML/CSS/JS — No build tools needed
   ═══════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════
//  FIREBASE CONFIG
// ═══════════════════════════════════════════════════════════════
const FIREBASE_HOST = "https://spdf-24053-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIREBASE_DEVICES = FIREBASE_HOST + "/devices.json";
const FIREBASE_STATUS = FIREBASE_HOST + "/device_status.json";

// Device names matching Firebase DB: devices/{cooler,fan,Light,speaker}/state
const FIREBASE_DEVICES_LIST = [
  { key: "cooler",  label: "Cooler",  icon: "❄️", activeWatts: 200, standbyWatts: 5,   activeHours: 8 },
  { key: "fan",     label: "Fan",     icon: "💨", activeWatts: 75,  standbyWatts: 1,   activeHours: 10 },
  { key: "light",   label: "Light",   icon: "💡", activeWatts: 60,  standbyWatts: 0.5, activeHours: 6 },
  { key: "speaker", label: "Speaker", icon: "🔊", activeWatts: 30,  standbyWatts: 2,   activeHours: 3 },
];

// ═══════════════════════════════════════════════════════════════
//  1. APPLIANCE DATABASE (for phantom power calculator)
// ═══════════════════════════════════════════════════════════════
const APPLIANCE_DB = [
  { name: "LED TV (40\"–55\")",        icon: "📺", standbyWatts: 5.0,   activeWatts: 80,   activeHours: 5,  category: "Entertainment" },
  { name: "CRT TV",                    icon: "📺", standbyWatts: 8.0,   activeWatts: 120,  activeHours: 4,  category: "Entertainment" },
  { name: "Set-Top Box (DTH)",         icon: "📡", standbyWatts: 12.0,  activeWatts: 25,   activeHours: 5,  category: "Entertainment" },
  { name: "Home Theater / Soundbar",   icon: "🔊", standbyWatts: 8.5,   activeWatts: 50,   activeHours: 3,  category: "Entertainment" },
  { name: "Gaming Console",            icon: "🎮", standbyWatts: 10.0,  activeWatts: 150,  activeHours: 3,  category: "Entertainment" },
  { name: "WiFi Router",               icon: "📶", standbyWatts: 6.0,   activeWatts: 10,   activeHours: 24, category: "Network" },
  { name: "Phone Charger (plugged)",   icon: "🔌", standbyWatts: 0.5,   activeWatts: 5,    activeHours: 2,  category: "Chargers" },
  { name: "Laptop Charger (plugged)",  icon: "💻", standbyWatts: 4.5,   activeWatts: 65,   activeHours: 6,  category: "Chargers" },
  { name: "Tablet Charger",            icon: "📱", standbyWatts: 1.0,   activeWatts: 10,   activeHours: 2,  category: "Chargers" },
  { name: "Desktop Computer",          icon: "🖥️", standbyWatts: 6.0,   activeWatts: 250,  activeHours: 8,  category: "Computing" },
  { name: "Monitor",                   icon: "🖥️", standbyWatts: 3.0,   activeWatts: 40,   activeHours: 8,  category: "Computing" },
  { name: "Printer / Scanner",         icon: "🖨️", standbyWatts: 5.0,   activeWatts: 50,   activeHours: 1,  category: "Computing" },
  { name: "Microwave Oven",            icon: "🍳", standbyWatts: 3.0,   activeWatts: 1000, activeHours: 0.5,category: "Kitchen" },
  { name: "Coffee Maker",              icon: "☕", standbyWatts: 1.5,   activeWatts: 800,  activeHours: 0.3,category: "Kitchen" },
  { name: "Dishwasher",                icon: "🍽️", standbyWatts: 2.0,   activeWatts: 1500, activeHours: 1,  category: "Kitchen" },
  { name: "Washing Machine",           icon: "👕", standbyWatts: 3.0,   activeWatts: 500,  activeHours: 1,  category: "Laundry" },
  { name: "Dryer",                     icon: "🌀", standbyWatts: 4.0,   activeWatts: 2000, activeHours: 1,  category: "Laundry" },
  { name: "Air Conditioner (standby)", icon: "❄️", standbyWatts: 5.0,   activeWatts: 1500, activeHours: 8,  category: "Climate" },
  { name: "Ceiling Fan (remote)",      icon: "💨", standbyWatts: 1.0,   activeWatts: 75,   activeHours: 10, category: "Climate" },
  { name: "Geyser / Water Heater",     icon: "🔥", standbyWatts: 2.5,   activeWatts: 2000, activeHours: 1,  category: "Climate" },
  { name: "Smart Speaker (Alexa)",     icon: "🗣️", standbyWatts: 3.0,   activeWatts: 5,    activeHours: 24, category: "Smart Home" },
  { name: "Smart Plug / Hub",          icon: "🏠", standbyWatts: 1.5,   activeWatts: 3,    activeHours: 24, category: "Smart Home" },
  { name: "CCTV / Security Camera",    icon: "📷", standbyWatts: 5.0,   activeWatts: 10,   activeHours: 24, category: "Security" },
  { name: "Electric Kettle",           icon: "🫖", standbyWatts: 1.0,   activeWatts: 1500, activeHours: 0.2,category: "Kitchen" },
  { name: "Inverter / UPS",            icon: "🔋", standbyWatts: 8.0,   activeWatts: 50,   activeHours: 24, category: "Power" },
  { name: "Refrigerator (standby)",    icon: "🧊", standbyWatts: 2.5,   activeWatts: 150,  activeHours: 8,  category: "Kitchen" },
];

const CO2_FACTOR = 0.82;
const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
  '#eab308', '#dc2626', '#7c3aed', '#2563eb', '#d946ef'
];

// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════
let appliances = [];
let nextId = 1;
let killSwitchActive = false;
let esp32Connected = false;
let firebasePolling = null;

// ═══════════════════════════════════════════════════════════════
//  DOM REFS
// ═══════════════════════════════════════════════════════════════
const $ = (sel) => document.querySelector(sel);
const selAppliance     = $('#sel-appliance');
const inpCustomName    = $('#inp-custom-name');
const inpCustomWatts   = $('#inp-custom-watts');
const inpActiveWatts   = $('#inp-active-watts');
const inpActiveHours   = $('#inp-active-hours');
const inpRate          = $('#inp-rate');
const inpStandbyHours  = $('#inp-standby-hours');
const applianceList    = $('#appliance-list');
const emptyState       = $('#empty-state');
const phantomBanner    = $('#phantom-banner');
const optimizeResult   = $('#optimize-result');
const killSwitchBtn    = $('#kill-switch');

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  populateDropdown();
  loadFromStorage();
  bindEvents();
  recalcAll();
  initCharts();
  updateCharts();
  renderBadges();
  updateEnergyComparison();
  updateBreakdownTable();

  // Start Firebase polling
  startFirebasePolling();

  setTimeout(() => {
    if (appliances.length === 0) showToast('💡 Start by adding your household appliances!', 'success');
  }, 2000);
});

// ═══════════════════════════════════════════════════════════════
//  FIREBASE REST API — Polling
// ═══════════════════════════════════════════════════════════════
function startFirebasePolling() {
  fetchFirebaseDevices();
  firebasePolling = setInterval(fetchFirebaseDevices, 3000);

  // Also fetch ESP32 device status
  fetchFirebaseStatus();
  setInterval(fetchFirebaseStatus, 10000);
}

function fetchFirebaseDevices() {
  fetch(FIREBASE_DEVICES)
    .then(res => res.json())
    .then(data => {
      if (!data) return;
      if (!esp32Connected) {
        esp32Connected = true;
        updateESP32StatusUI(true);
        showToast('🔥 Firebase connected! Device states synced.', 'success', 3000);
        renderBadges();
      }
      updateESP32StatusUI(true);
      updateDeviceCards(data);
    })
    .catch(() => {
      if (esp32Connected) {
        esp32Connected = false;
        updateESP32StatusUI(false);
      }
    });
}

function fetchFirebaseStatus() {
  fetch(FIREBASE_STATUS)
    .then(res => res.json())
    .then(data => {
      if (!data) return;
      // Update system info from ESP32 status
      if (data.uptime) {
        const h = Math.floor(data.uptime / 3600);
        const m = Math.floor((data.uptime % 3600) / 60);
        $('#esp32-uptime').textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }
      if (data.freeHeap) {
        $('#esp32-heap').textContent = `${(data.freeHeap / 1024).toFixed(0)} KB`;
      }
      if (data.stats) {
        let totalCost = 0, totalRuntime = 0;
        FIREBASE_DEVICES_LIST.forEach(dev => {
          const s = data.stats[dev.key];
          if (s) {
            totalCost += s.energyCostINR || 0;
            totalRuntime += s.runtimeMinutes || 0;
            // Update per-device stats
            const rtEl = $(`#device-runtime-${dev.key}`);
            const costEl = $(`#device-cost-${dev.key}`);
            if (rtEl) {
              const mins = s.runtimeMinutes || 0;
              rtEl.textContent = mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${mins.toFixed(0)} min`;
            }
            if (costEl) costEl.textContent = `₹${(s.energyCostINR || 0).toFixed(2)}`;
            if (s.activeWatts) {
              const awEl = $(`#device-active-watt-${dev.key}`);
              if (awEl) awEl.textContent = `${s.activeWatts}W`;
            }
            if (s.standbyWatts) {
              const swEl = $(`#device-standby-watt-${dev.key}`);
              if (swEl) swEl.textContent = `${s.standbyWatts}W`;
            }
          }
        });
        const rh = Math.floor(totalRuntime / 60);
        const rm = Math.floor(totalRuntime % 60);
        $('#esp32-total-runtime').textContent = rh > 0 ? `${rh}h ${rm}m` : `${rm} min`;
        $('#esp32-total-cost').textContent = `₹${totalCost.toFixed(2)}`;
      }
      if (data.totalCostINR !== undefined) {
        $('#esp32-total-cost').textContent = `₹${data.totalCostINR.toFixed(2)}`;
      }
    })
    .catch(() => {});
}

function updateDeviceCards(data) {
  // data = { cooler: { state: "ON" }, fan: { state: "OFF" }, ... }
  FIREBASE_DEVICES_LIST.forEach(dev => {
    const deviceData = data[dev.key];
    if (!deviceData) return;

    const isOn = deviceData.state === "ON";
    const card = $(`#relay-card-${dev.key}`);
    const toggle = $(`#relay-toggle-${dev.key}`);

    if (card) card.classList.toggle('on', isOn);
    if (toggle && toggle.checked !== isOn) toggle.checked = isOn;
  });
}

function updateESP32StatusUI(connected) {
  const dot = $('#esp32-dot');
  const dotSm = $('#esp32-dot-sm');
  const statusText = $('#esp32-status-text');
  const statusBadge = $('#esp32-status-badge');
  const ipText = $('#esp32-ip-text');

  if (connected) {
    dot.className = 'status-dot connected';
    dotSm.className = 'status-dot-sm connected';
    statusText.textContent = 'Firebase Live';
    statusBadge.classList.add('online');
    ipText.textContent = 'Connected to Firebase';
  } else {
    dot.className = 'status-dot disconnected';
    dotSm.className = 'status-dot-sm disconnected';
    statusText.textContent = 'Offline';
    statusBadge.classList.remove('online');
    ipText.textContent = 'Reconnecting...';
  }
}

// ═══════════════════════════════════════════════════════════════
//  TOGGLE DEVICE — Write to Firebase RTDB
// ═══════════════════════════════════════════════════════════════
function toggleDevice(deviceName, state) {
  const url = FIREBASE_HOST + "/devices/" + deviceName + "/state.json";
  const value = state ? '"ON"' : '"OFF"';

  fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: value
  })
  .then(res => res.json())
  .then(() => {
    showToast(`${state ? '⚡' : '🔌'} ${deviceName} turned ${state ? 'ON' : 'OFF'}`, 'success', 2000);
  })
  .catch(() => {
    showToast('❌ Failed to toggle — check Firebase connection', 'danger');
  });
}

// ═══════════════════════════════════════════════════════════════
//  APPLIANCE DROPDOWN & ADD
// ═══════════════════════════════════════════════════════════════
function populateDropdown() {
  const categories = {};
  APPLIANCE_DB.forEach(a => {
    if (!categories[a.category]) categories[a.category] = [];
    categories[a.category].push(a);
  });
  Object.keys(categories).sort().forEach(cat => {
    const group = document.createElement('optgroup');
    group.label = cat;
    categories[cat].forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.name;
      opt.textContent = `${a.icon} ${a.name} (${a.standbyWatts}W standby / ${a.activeWatts}W active)`;
      group.appendChild(opt);
    });
    selAppliance.appendChild(group);
  });
}

function addAppliance(name, icon, standbyWatts, activeWatts, activeHours, category) {
  const existing = appliances.find(a => a.name === name);
  if (existing) { existing.qty++; showToast(`📦 ${name} qty → ${existing.qty}`, 'success'); }
  else {
    appliances.push({ id: nextId++, name, icon, standbyWatts, activeWatts, activeHours, qty: 1, active: false, category: category || 'Custom' });
    showToast(`✅ ${name} added (${activeWatts}W / ${standbyWatts}W standby)`, 'success');
  }
  saveToStorage(); renderApplianceList(); recalcAll(); updateCharts(); renderBadges(); phantomDetection(); updateEnergyComparison(); updateBreakdownTable();
}

function bindEvents() {
  $('#btn-add').addEventListener('click', () => {
    const val = selAppliance.value;
    if (!val) { showToast('⚠️ Select an appliance', 'warning'); return; }
    const db = APPLIANCE_DB.find(a => a.name === val);
    if (db) addAppliance(db.name, db.icon, db.standbyWatts, db.activeWatts, db.activeHours, db.category);
    selAppliance.value = '';
  });

  $('#btn-add-custom').addEventListener('click', () => {
    const name = inpCustomName.value.trim();
    const sw = parseFloat(inpCustomWatts.value) || 0;
    const aw = parseFloat(inpActiveWatts.value) || 0;
    const ah = parseFloat(inpActiveHours.value) || 4;
    if (!name) { showToast('⚠️ Enter name', 'warning'); return; }
    addAppliance(name, '🔧', sw, aw, ah, 'Custom');
    inpCustomName.value = ''; inpCustomWatts.value = ''; inpActiveWatts.value = '';
  });

  inpRate.addEventListener('input', () => { recalcAll(); updateCharts(); updateEnergyComparison(); updateBreakdownTable(); saveToStorage(); });
  inpStandbyHours.addEventListener('input', () => { recalcAll(); updateCharts(); updateEnergyComparison(); updateBreakdownTable(); saveToStorage(); });

  $('#btn-optimize').addEventListener('click', runOptimize);
  $('#btn-run-optimize').addEventListener('click', runOptimize);
  $('#btn-export').addEventListener('click', exportPDF);
  $('#btn-reset').addEventListener('click', resetAll);
  killSwitchBtn.addEventListener('click', toggleKillSwitch);
}

// ═══════════════════════════════════════════════════════════════
//  RENDER APPLIANCE LIST
// ═══════════════════════════════════════════════════════════════
function renderApplianceList() {
  if (appliances.length === 0) { emptyState.style.display = ''; Array.from(applianceList.children).forEach(c => { if (c !== emptyState) c.remove(); }); return; }
  emptyState.style.display = 'none';
  Array.from(applianceList.children).forEach(c => { if (c !== emptyState) c.remove(); });

  const rate = getRate(), sHrs = getStandbyHours();
  appliances.forEach(a => {
    const pDaily = (a.standbyWatts * a.qty * sHrs) / 1000;
    const nDaily = (a.activeWatts * a.qty * a.activeHours) / 1000;
    const totalMo = (pDaily + nDaily) * 30 * rate;
    const isPhantom = !a.active && a.standbyWatts > 0;

    const div = document.createElement('div');
    div.className = 'appliance-item' + (isPhantom ? ' phantom-alert' : '');
    div.innerHTML = `
      <div class="appliance-icon">${a.icon}</div>
      <div class="appliance-info">
        <div class="appliance-name">${a.name}</div>
        <div class="appliance-meta">
          <span>${a.activeWatts}W active</span><span>${a.standbyWatts}W standby</span><span>×${a.qty}</span>
          ${isPhantom ? '<span style="color:var(--accent-red);">⚠️ Phantom</span>' : ''}
        </div>
      </div>
      <div class="appliance-cost">₹${formatINR(totalMo)}/mo</div>
      <div class="appliance-actions">
        <div class="qty-control"><button onclick="changeQty(${a.id},-1)">−</button><span>${a.qty}</span><button onclick="changeQty(${a.id},1)">+</button></div>
        <label class="status-toggle"><input type="checkbox" ${a.active ? 'checked' : ''} onchange="toggleActive(${a.id},this.checked)"><span class="slider"></span></label>
        <button class="btn-icon" onclick="removeAppliance(${a.id})">✕</button>
      </div>`;
    applianceList.insertBefore(div, emptyState);
  });
  $('#badge-count').textContent = `${appliances.reduce((s, a) => s + a.qty, 0)} devices`;
}

function changeQty(id, d) { const a = appliances.find(x => x.id === id); if (!a) return; a.qty = Math.max(1, a.qty + d); saveToStorage(); renderApplianceList(); recalcAll(); updateCharts(); updateEnergyComparison(); updateBreakdownTable(); }
function toggleActive(id, active) { const a = appliances.find(x => x.id === id); if (!a) return; a.active = active; saveToStorage(); renderApplianceList(); recalcAll(); updateCharts(); phantomDetection(); updateEnergyComparison(); updateBreakdownTable(); }
function removeAppliance(id) { appliances = appliances.filter(x => x.id !== id); saveToStorage(); renderApplianceList(); recalcAll(); updateCharts(); renderBadges(); phantomDetection(); updateEnergyComparison(); updateBreakdownTable(); showToast('🗑️ Removed', 'success'); }

// ═══════════════════════════════════════════════════════════════
//  COST CALCULATOR
// ═══════════════════════════════════════════════════════════════
function getRate() { return parseFloat(inpRate.value) || 7.5; }
function getStandbyHours() { return parseFloat(inpStandbyHours.value) || 20; }

function recalcAll() {
  const rate = getRate(), sHrs = getStandbyHours();
  const phantom = appliances.filter(a => !a.active);
  let pDailyKWh = 0;
  phantom.forEach(a => { pDailyKWh += (a.standbyWatts * a.qty * sHrs) / 1000; });

  const dCost = pDailyKWh * rate, mCost = dCost * 30, aCost = dCost * 365;
  const aKWh = pDailyKWh * 365, aCO2 = aKWh * CO2_FACTOR;
  const total = appliances.reduce((s, a) => s + a.qty, 0);
  const activeD = appliances.filter(a => a.active).reduce((s, a) => s + a.qty, 0);

  $('#stat-devices').textContent = total;
  $('#stat-devices-sub').textContent = `${activeD} active · ${total - activeD} standby`;
  $('#stat-daily-cost').textContent = `₹${formatINR(dCost)}`;
  $('#stat-monthly-cost').textContent = `₹${formatINR(mCost)}`;
  $('#stat-monthly-sub').textContent = `₹${formatINR(aCost)} annually`;
  $('#stat-energy').textContent = `${aKWh.toFixed(1)} kWh`;
  $('#stat-co2').textContent = `${aCO2.toFixed(1)} kg`;

  if (phantom.length > 0) {
    const sorted = [...phantom].sort((a, b) => (b.standbyWatts * b.qty) - (a.standbyWatts * a.qty));
    const v = sorted[0]; $('#stat-vampire').textContent = v.icon + ' ' + v.name;
    $('#stat-vampire-sub').textContent = `₹${formatINR((v.standbyWatts * v.qty * sHrs / 1000) * 365 * rate)}/yr`;
  } else { $('#stat-vampire').textContent = '—'; $('#stat-vampire-sub').textContent = total > 0 ? 'All active!' : 'Add devices'; }

  updateCO2Display(aCO2, aKWh);
}

// ═══════════════════════════════════════════════════════════════
//  ENERGY COMPARISON: Normal vs Phantom
// ═══════════════════════════════════════════════════════════════
function updateEnergyComparison() {
  const rate = getRate(), sHrs = getStandbyHours();
  let nDaily = 0, pDaily = 0;
  appliances.forEach(a => {
    nDaily += (a.activeWatts * a.qty * a.activeHours) / 1000;
    if (!a.active) pDaily += (a.standbyWatts * a.qty * sHrs) / 1000;
  });
  const tDaily = nDaily + pDaily;

  $('#normal-daily-kwh').textContent = `${nDaily.toFixed(3)} kWh`; $('#normal-daily-cost').textContent = `₹${formatINR(nDaily * rate)}`;
  $('#normal-monthly-kwh').textContent = `${(nDaily * 30).toFixed(1)} kWh`; $('#normal-monthly-cost').textContent = `₹${formatINR(nDaily * 30 * rate)}`;
  $('#normal-yearly-kwh').textContent = `${(nDaily * 365).toFixed(1)} kWh`; $('#normal-yearly-cost').textContent = `₹${formatINR(nDaily * 365 * rate)}`;

  $('#phantom-daily-kwh').textContent = `${pDaily.toFixed(3)} kWh`; $('#phantom-daily-cost').textContent = `₹${formatINR(pDaily * rate)}`;
  $('#phantom-monthly-kwh').textContent = `${(pDaily * 30).toFixed(1)} kWh`; $('#phantom-monthly-cost').textContent = `₹${formatINR(pDaily * 30 * rate)}`;
  $('#phantom-yearly-kwh').textContent = `${(pDaily * 365).toFixed(1)} kWh`; $('#phantom-yearly-cost').textContent = `₹${formatINR(pDaily * 365 * rate)}`;

  $('#total-daily-kwh').textContent = `${tDaily.toFixed(3)} kWh`; $('#total-daily-cost').textContent = `₹${formatINR(tDaily * rate)}`;
  $('#total-monthly-kwh').textContent = `${(tDaily * 30).toFixed(1)} kWh`; $('#total-monthly-cost').textContent = `₹${formatINR(tDaily * 30 * rate)}`;
  $('#total-yearly-kwh').textContent = `${(tDaily * 365).toFixed(1)} kWh`; $('#total-yearly-cost').textContent = `₹${formatINR(tDaily * 365 * rate)}`;
}

// ═══════════════════════════════════════════════════════════════
//  BREAKDOWN TABLE
// ═══════════════════════════════════════════════════════════════
function updateBreakdownTable() {
  const rate = getRate(), sHrs = getStandbyHours();
  const tbody = $('#breakdown-tbody');
  if (appliances.length === 0) { tbody.innerHTML = '<tr><td colspan="9" class="empty-row">Add appliances to see breakdown</td></tr>'; $('#breakdown-count').textContent = '0 appliances'; return; }
  $('#breakdown-count').textContent = `${appliances.length} appliances`;

  let html = '', tN = 0, tP = 0;
  appliances.forEach(a => {
    const nD = (a.activeWatts * a.qty * a.activeHours) / 1000;
    const pD = !a.active ? (a.standbyWatts * a.qty * sHrs) / 1000 : 0;
    tN += nD; tP += pD;
    html += `<tr><td>${a.icon} ${a.name}${a.qty > 1 ? ' ×' + a.qty : ''}</td><td>${a.activeWatts}W</td><td>${a.standbyWatts}W</td><td>${a.activeHours}h</td>
      <td class="normal-val">${nD.toFixed(3)}</td><td class="normal-val">₹${formatINR(nD * 30 * rate)}</td>
      <td class="phantom-val">${pD.toFixed(3)}</td><td class="phantom-val">₹${formatINR(pD * 30 * rate)}</td>
      <td class="total-val">₹${formatINR((nD + pD) * 365 * rate)}</td></tr>`;
  });
  html += `<tr style="background:var(--bg-input); font-weight:700;"><td>📊 TOTAL</td><td>—</td><td>—</td><td>—</td>
    <td class="normal-val">${tN.toFixed(3)}</td><td class="normal-val">₹${formatINR(tN * 30 * rate)}</td>
    <td class="phantom-val">${tP.toFixed(3)}</td><td class="phantom-val">₹${formatINR(tP * 30 * rate)}</td>
    <td class="total-val">₹${formatINR((tN + tP) * 365 * rate)}</td></tr>`;
  tbody.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
//  CHARTS
// ═══════════════════════════════════════════════════════════════
let pieChart = null, barChart = null;

function initCharts() {
  Chart.defaults.color = '#475569'; Chart.defaults.font.family = "'Inter', sans-serif";

  pieChart = new Chart($('#chart-pie').getContext('2d'), {
    type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(2)} kWh/yr` } } } }
  });

  barChart = new Chart($('#chart-bar').getContext('2d'), {
    type: 'bar',
    data: { labels: [], datasets: [
      { label: 'Normal ₹/mo', data: [], backgroundColor: '#10b981', borderRadius: 4 },
      { label: 'Phantom ₹/mo', data: [], backgroundColor: '#ef4444', borderRadius: 4 }
    ] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ₹${formatINR(ctx.parsed.x)}` } } },
      scales: { x: { stacked: true, ticks: { callback: v => '₹' + v } }, y: { stacked: true } } }
  });
}

function updateCharts() {
  if (!pieChart || !barChart) return;
  const rate = getRate(), sHrs = getStandbyHours();
  const phantom = appliances.filter(a => !a.active).sort((a, b) => (b.standbyWatts * b.qty) - (a.standbyWatts * a.qty));

  pieChart.data.labels = phantom.map(a => `${a.icon} ${a.name}`);
  pieChart.data.datasets[0].data = phantom.map(a => (a.standbyWatts * a.qty * sHrs / 1000) * 365);
  pieChart.data.datasets[0].backgroundColor = phantom.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
  pieChart.update('none');

  const all = [...appliances].sort((a, b) => (b.activeWatts * b.qty) - (a.activeWatts * a.qty));
  barChart.data.labels = all.map(a => `${a.icon} ${a.name}`);
  barChart.data.datasets[0].data = all.map(a => (a.activeWatts * a.qty * a.activeHours / 1000) * rate * 30);
  barChart.data.datasets[1].data = all.map(a => !a.active ? (a.standbyWatts * a.qty * sHrs / 1000) * rate * 30 : 0);
  barChart.update('none');
}

// ═══════════════════════════════════════════════════════════════
//  OPTIMIZE
// ═══════════════════════════════════════════════════════════════
function runOptimize() {
  const rate = getRate(), sHrs = getStandbyHours();
  const phantom = appliances.filter(a => !a.active);
  if (!phantom.length) { showToast('🎉 Nothing to optimize!', 'success'); return; }
  const sorted = [...phantom].sort((a, b) => (b.standbyWatts * b.qty) - (a.standbyWatts * a.qty));
  let total = 0; phantom.forEach(a => { total += (a.standbyWatts * a.qty * sHrs / 1000) * 365 * rate; });
  const top = sorted.slice(0, 3); let topSave = 0; top.forEach(a => { topSave += (a.standbyWatts * a.qty * sHrs / 1000) * 365 * rate; });
  const pct = total > 0 ? Math.round((topSave / total) * 100) : 0;
  optimizeResult.classList.add('show');
  $('#optimize-pct').textContent = `${pct}% savings`;
  $('#savings-bar-fill').style.width = `${Math.min(pct, 100)}%`;
  $('#optimize-tips').innerHTML = top.map((a, i) => `<div class="tip-item"><span>${['🥇','🥈','🥉'][i]}</span><span><strong>${a.icon} ${a.name}</strong> — Save ₹${formatINR((a.standbyWatts * a.qty * sHrs / 1000) * 365 * rate)}/yr</span></div>`).join('') +
    `<div class="tip-item" style="background:#ecfdf5;border:1px solid #a7f3d0;margin-top:8px;"><span>💡</span><span>Unplug top ${top.length} vampires = <strong>₹${formatINR(topSave)}/yr saved!</strong></span></div>`;
}

// ═══════════════════════════════════════════════════════════════
//  BADGES
// ═══════════════════════════════════════════════════════════════
const BADGES = [
  { id: 'first', icon: '🌱', name: 'First Step', desc: 'Add first appliance', check: () => appliances.length >= 1 },
  { id: 'tracker', icon: '📊', name: 'Energy Tracker', desc: '5+ appliances', check: () => appliances.length >= 5 },
  { id: 'hunter', icon: '🧛', name: 'Vampire Hunter', desc: '10+ appliances', check: () => appliances.length >= 10 },
  { id: 'aware', icon: '💡', name: 'Awareness', desc: 'Find phantom device', check: () => appliances.some(a => !a.active && a.standbyWatts > 2) },
  { id: 'saver', icon: '🌿', name: 'Eco Saver', desc: 'Run optimizer', check: () => optimizeResult.classList.contains('show') },
  { id: 'ninja', icon: '⚡', name: 'Power Ninja', desc: 'Kill phantom power', check: () => killSwitchActive },
  { id: 'connected', icon: '🔥', name: 'Firebase Live', desc: 'Connect to Firebase', check: () => esp32Connected },
  { id: 'master', icon: '🏆', name: 'Energy Master', desc: 'Earn all badges', check: () => false },
];

function renderBadges() {
  const grid = $('#badges-grid'); let html = '', earned = 0;
  BADGES.forEach(b => {
    const e = b.id === 'master' ? BADGES.filter(x => x.id !== 'master').every(x => x.check()) : b.check();
    if (e) earned++;
    html += `<div class="badge ${e ? 'earned' : 'locked'}"><span class="badge-icon">${b.icon}</span><span class="badge-text"><span class="badge-name">${b.name}</span><span class="badge-desc">${b.desc}</span></span></div>`;
  });
  grid.innerHTML = html;
  $('#leaderboard-msg').textContent = earned === 0 ? '🌍 Add appliances to start!' : earned >= BADGES.length ? '🎉 Energy Master!' : `🌍 More aware than ${Math.min(95, 30 + earned * 8)}% of users!`;
}

// ═══════════════════════════════════════════════════════════════
//  PHANTOM DETECTION, TOASTS, KILL SWITCH, CO2
// ═══════════════════════════════════════════════════════════════
function phantomDetection() {
  const p = appliances.filter(a => !a.active && a.standbyWatts > 0);
  if (p.length) { const w = p.reduce((m, a) => (a.standbyWatts * a.qty) > (m.standbyWatts * m.qty) ? a : m, p[0]); phantomBanner.classList.add('show'); $('#phantom-banner-text').textContent = `⚠️ ${w.name} consuming ${w.standbyWatts}W standby! (${p.length} phantom devices)`; }
  else phantomBanner.classList.remove('show');
}

function showToast(msg, type = 'success', dur = 4000) {
  const c = $('#toast-container'), t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${{success:'✅',warning:'⚠️',danger:'🚨'}[type]||'💡'}</span><span>${msg}</span><span class="toast-close" onclick="this.parentElement.remove()">✕</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, dur);
}

function toggleKillSwitch() {
  killSwitchActive = !killSwitchActive;
  if (killSwitchActive) {
    appliances.forEach(a => { a.active = true; });
    killSwitchBtn.classList.add('active');
    $('#kill-label').textContent = '✅ Phantom Power KILLED';
    showToast('⚡ All phantom power eliminated!', 'success');
    // Send kill to all Firebase devices
    FIREBASE_DEVICES_LIST.forEach(dev => {
      fetch(FIREBASE_HOST + "/devices/" + dev.key + "/state.json", { method: 'PUT', body: '"OFF"' }).catch(() => {});
    });
  } else {
    killSwitchBtn.classList.remove('active');
    $('#kill-label').textContent = 'Kill Phantom Power';
    showToast('🔌 Kill switch deactivated.', 'warning');
  }
  saveToStorage(); renderApplianceList(); recalcAll(); updateCharts(); renderBadges(); phantomDetection(); updateEnergyComparison(); updateBreakdownTable();
}

function updateCO2Display(co2, kwh) {
  $('#co2-big-value').innerHTML = `${co2.toFixed(1)} <span class="co2-unit">kg CO₂/yr</span>`;
  const pct = Math.min(100, (co2 / 200) * 100);
  const fill = $('#co2-bar-fill'); fill.style.width = `${pct}%`;
  fill.style.background = pct < 30 ? 'var(--accent-green)' : pct < 60 ? 'linear-gradient(90deg,var(--accent-green),var(--accent-orange))' : 'linear-gradient(90deg,var(--accent-orange),var(--accent-red))';
  $('#co2-context').textContent = co2 === 0 ? 'No emissions!' : co2 < 20 ? 'Low impact' : co2 < 50 ? 'Moderate' : 'High impact!';
  $('#co2-trees').textContent = Math.ceil(co2 / 22);
  $('#co2-km').textContent = Math.round(co2 / 0.21);
  $('#co2-bulb-hrs').textContent = formatINR(Math.round(kwh / 0.01));
}

// ═══════════════════════════════════════════════════════════════
//  STORAGE & PDF
// ═══════════════════════════════════════════════════════════════
function saveToStorage() { localStorage.setItem('phantom-power-data', JSON.stringify({ appliances, nextId, rate: inpRate.value, hours: inpStandbyHours.value, killSwitchActive })); }

function loadFromStorage() {
  try {
    const d = JSON.parse(localStorage.getItem('phantom-power-data'));
    if (!d) return;
    appliances = d.appliances || [];
    appliances.forEach(a => { if (!a.standbyWatts) a.standbyWatts = a.watts || 5; if (!a.activeWatts) a.activeWatts = 100; if (!a.activeHours) a.activeHours = 4; });
    nextId = d.nextId || 1;
    if (d.rate) inpRate.value = d.rate;
    if (d.hours) inpStandbyHours.value = d.hours;
    killSwitchActive = d.killSwitchActive || false;
    if (killSwitchActive) { killSwitchBtn.classList.add('active'); $('#kill-label').textContent = '✅ Killed'; }
    renderApplianceList(); phantomDetection();
  } catch (e) {}
}

function resetAll() {
  if (!confirm('Reset all data?')) return;
  appliances = []; nextId = 1; killSwitchActive = false;
  killSwitchBtn.classList.remove('active'); $('#kill-label').textContent = 'Kill Phantom Power';
  localStorage.removeItem('phantom-power-data'); optimizeResult.classList.remove('show');
  renderApplianceList(); recalcAll(); updateCharts(); renderBadges(); phantomDetection(); updateEnergyComparison(); updateBreakdownTable();
  showToast('🔄 Reset.', 'success');
}

async function exportPDF() {
  showToast('📄 Generating...', 'success');
  try {
    const canvas = await html2canvas($('#capture-area'), { backgroundColor: '#f8fafc', scale: 1.5, useCORS: true, logging: false });
    const { jsPDF } = window.jspdf, pdf = new jsPDF('p', 'mm', 'a4');
    const w = 210, h = (canvas.height * w) / canvas.width;
    const img = canvas.toDataURL('image/jpeg', 0.85);
    let left = h, pos = 0;
    pdf.addImage(img, 'JPEG', 0, pos, w, h); left -= 297;
    while (left > 0) { pos -= 297; pdf.addPage(); pdf.addImage(img, 'JPEG', 0, pos, w, h); left -= 297; }
    pdf.save('Phantom-Power-Report.pdf');
    showToast('✅ PDF saved!', 'success');
  } catch (e) { showToast('❌ PDF failed', 'danger'); }
}

function formatINR(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  const [i, d] = n.toFixed(2).split('.');
  let r = ''; const l = i.length;
  if (l <= 3) r = i;
  else { r = i.substring(l - 3); let rem = i.substring(0, l - 3); while (rem.length > 2) { r = rem.substring(rem.length - 2) + ',' + r; rem = rem.substring(0, rem.length - 2); } if (rem.length) r = rem + ',' + r; }
  return parseFloat(d) > 0 ? r + '.' + d : r;
}
