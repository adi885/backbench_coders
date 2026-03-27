/* ═══════════════════════════════════════════════════════════════
   PHANTOM POWER COST ESTIMATOR — Complete Dashboard Engine
   All 10 feature modules in one file
   ═══════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════
//  1. APPLIANCE DATABASE (22+ real appliances with standby watts)
// ═══════════════════════════════════════════════════════════════
const APPLIANCE_DB = [
  { name: "LED TV (40\"–55\")",        icon: "📺", watts: 5.0,   category: "Entertainment" },
  { name: "CRT TV",                    icon: "📺", watts: 8.0,   category: "Entertainment" },
  { name: "Set-Top Box (DTH)",         icon: "📡", watts: 12.0,  category: "Entertainment" },
  { name: "Home Theater / Soundbar",   icon: "🔊", watts: 8.5,   category: "Entertainment" },
  { name: "Gaming Console",            icon: "🎮", watts: 10.0,  category: "Entertainment" },
  { name: "WiFi Router",               icon: "📶", watts: 6.0,   category: "Network" },
  { name: "Phone Charger (plugged)",   icon: "🔌", watts: 0.5,   category: "Chargers" },
  { name: "Laptop Charger (plugged)",  icon: "💻", watts: 4.5,   category: "Chargers" },
  { name: "Tablet Charger",            icon: "📱", watts: 1.0,   category: "Chargers" },
  { name: "Desktop Computer",          icon: "🖥️", watts: 6.0,   category: "Computing" },
  { name: "Monitor",                   icon: "🖥️", watts: 3.0,   category: "Computing" },
  { name: "Printer / Scanner",         icon: "🖨️", watts: 5.0,   category: "Computing" },
  { name: "Microwave Oven",            icon: "🍳", watts: 3.0,   category: "Kitchen" },
  { name: "Coffee Maker",              icon: "☕", watts: 1.5,   category: "Kitchen" },
  { name: "Dishwasher",                icon: "🍽️", watts: 2.0,   category: "Kitchen" },
  { name: "Washing Machine",           icon: "👕", watts: 3.0,   category: "Laundry" },
  { name: "Dryer",                     icon: "🌀", watts: 4.0,   category: "Laundry" },
  { name: "Air Conditioner (standby)", icon: "❄️", watts: 5.0,   category: "Climate" },
  { name: "Ceiling Fan (remote)",      icon: "💨", watts: 1.0,   category: "Climate" },
  { name: "Geyser / Water Heater",     icon: "🔥", watts: 2.5,   category: "Climate" },
  { name: "Smart Speaker (Alexa/Google)", icon: "🗣️", watts: 3.0, category: "Smart Home" },
  { name: "Smart Plug / Hub",          icon: "🏠", watts: 1.5,   category: "Smart Home" },
  { name: "CCTV / Security Camera",    icon: "📷", watts: 5.0,   category: "Security" },
  { name: "Electric Kettle",           icon: "🫖", watts: 1.0,   category: "Kitchen" },
  { name: "Inverter / UPS",            icon: "🔋", watts: 8.0,   category: "Power" },
  { name: "Refrigerator (standby)",    icon: "🧊", watts: 2.5,   category: "Kitchen" },
];

// ═══════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════
const CO2_FACTOR = 0.82;          // kg CO₂ per kWh (India grid average)
const AVG_INDIAN_ANNUAL = 2500;   // ₹ average phantom cost per household

// Chart.js color palette
const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
  '#eab308', '#dc2626', '#7c3aed', '#2563eb', '#d946ef',
  '#16a34a', '#ca8a04', '#9333ea', '#db2777', '#0891b2',
  '#65a30d'
];

// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════
let appliances = [];   // { id, name, icon, watts, qty, active, category }
let nextId = 1;
let killSwitchActive = false;

// ═══════════════════════════════════════════════════════════════
//  DOM REFS
// ═══════════════════════════════════════════════════════════════
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const selAppliance     = $('#sel-appliance');
const inpCustomName    = $('#inp-custom-name');
const inpCustomWatts   = $('#inp-custom-watts');
const inpRate          = $('#inp-rate');
const inpStandbyHours  = $('#inp-standby-hours');
const btnAdd           = $('#btn-add');
const btnAddCustom     = $('#btn-add-custom');
const btnOptimize      = $('#btn-optimize');
const btnRunOptimize   = $('#btn-run-optimize');
const btnExport        = $('#btn-export');
const btnReset         = $('#btn-reset');
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

  // Auto-notifications after 3 seconds
  setTimeout(() => {
    if (appliances.length === 0) {
      showToast('💡 Start by adding your household appliances!', 'success');
    }
  }, 2000);
});

// ═══════════════════════════════════════════════════════════════
//  2. SMART APPLIANCE SELECTION
// ═══════════════════════════════════════════════════════════════
function populateDropdown() {
  // Group by category
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
      opt.textContent = `${a.icon} ${a.name} (${a.watts}W)`;
      group.appendChild(opt);
    });
    selAppliance.appendChild(group);
  });
}

function addAppliance(name, icon, watts, category) {
  // Check for duplicate — if exists, increment qty
  const existing = appliances.find(a => a.name === name);
  if (existing) {
    existing.qty++;
    showToast(`📦 ${name} quantity increased to ${existing.qty}`, 'success');
  } else {
    appliances.push({
      id: nextId++,
      name, icon, watts,
      qty: 1,
      active: false,  // standby = device is OFF but consuming phantom power
      category: category || 'Custom'
    });
    showToast(`✅ ${name} added (${watts}W standby)`, 'success');
  }
  saveToStorage();
  renderApplianceList();
  recalcAll();
  updateCharts();
  renderBadges();
  phantomDetection();
}

// ═══════════════════════════════════════════════════════════════
//  BINDING EVENTS
// ═══════════════════════════════════════════════════════════════
function bindEvents() {
  btnAdd.addEventListener('click', () => {
    const val = selAppliance.value;
    if (!val) { showToast('⚠️ Please select an appliance first', 'warning'); return; }
    const db = APPLIANCE_DB.find(a => a.name === val);
    if (db) addAppliance(db.name, db.icon, db.watts, db.category);
    selAppliance.value = '';
  });

  btnAddCustom.addEventListener('click', () => {
    const name = inpCustomName.value.trim();
    const watts = parseFloat(inpCustomWatts.value);
    if (!name) { showToast('⚠️ Enter a custom appliance name', 'warning'); return; }
    if (isNaN(watts) || watts < 0) { showToast('⚠️ Enter valid wattage', 'warning'); return; }
    addAppliance(name, '🔧', watts, 'Custom');
    inpCustomName.value = '';
    inpCustomWatts.value = '';
  });

  inpRate.addEventListener('input', () => { recalcAll(); updateCharts(); saveToStorage(); });
  inpStandbyHours.addEventListener('input', () => { recalcAll(); updateCharts(); saveToStorage(); });

  btnOptimize.addEventListener('click', runOptimize);
  btnRunOptimize.addEventListener('click', runOptimize);
  btnExport.addEventListener('click', exportPDF);
  btnReset.addEventListener('click', resetAll);

  killSwitchBtn.addEventListener('click', toggleKillSwitch);
}

// ═══════════════════════════════════════════════════════════════
//  RENDER APPLIANCE LIST
// ═══════════════════════════════════════════════════════════════
function renderApplianceList() {
  if (appliances.length === 0) {
    emptyState.style.display = '';
    // Remove all items except empty state
    Array.from(applianceList.children).forEach(c => {
      if (c !== emptyState) c.remove();
    });
    return;
  }
  emptyState.style.display = 'none';

  // Remove old items
  Array.from(applianceList.children).forEach(c => {
    if (c !== emptyState) c.remove();
  });

  const rate = getRate();
  const hours = getHours();

  appliances.forEach(a => {
    const dailyCost = (a.watts * a.qty * hours / 1000) * rate;
    const monthlyCost = dailyCost * 30;
    const isPhantom = !a.active && a.watts > 0;

    const div = document.createElement('div');
    div.className = 'appliance-item' + (isPhantom ? ' phantom-alert' : '');
    div.innerHTML = `
      <div class="appliance-icon">${a.icon}</div>
      <div class="appliance-info">
        <div class="appliance-name">${a.name}</div>
        <div class="appliance-meta">
          <span>${a.watts}W × ${a.qty}</span>
          <span>${(a.watts * a.qty * hours / 1000).toFixed(3)} kWh/day</span>
          ${isPhantom ? '<span style="color:var(--neon-red);">⚠️ Phantom</span>' : ''}
        </div>
      </div>
      <div class="appliance-cost">₹${formatINR(monthlyCost)}/mo</div>
      <div class="appliance-actions">
        <div class="qty-control">
          <button onclick="changeQty(${a.id}, -1)" title="Decrease">−</button>
          <span>${a.qty}</span>
          <button onclick="changeQty(${a.id}, 1)" title="Increase">+</button>
        </div>
        <label class="status-toggle" title="${a.active ? 'Active (using)' : 'Standby (phantom)'}">
          <input type="checkbox" ${a.active ? 'checked' : ''} onchange="toggleActive(${a.id}, this.checked)">
          <span class="slider"></span>
        </label>
        <button class="btn-icon" onclick="removeAppliance(${a.id})" title="Remove">✕</button>
      </div>
    `;
    applianceList.insertBefore(div, emptyState);
  });

  $('#badge-count').textContent = `${appliances.reduce((s, a) => s + a.qty, 0)} devices`;
}

// ═══════════════════════════════════════════════════════════════
//  APPLIANCE ACTIONS
// ═══════════════════════════════════════════════════════════════
function changeQty(id, delta) {
  const a = appliances.find(x => x.id === id);
  if (!a) return;
  a.qty = Math.max(1, a.qty + delta);
  saveToStorage();
  renderApplianceList();
  recalcAll();
  updateCharts();
}

function toggleActive(id, active) {
  const a = appliances.find(x => x.id === id);
  if (!a) return;
  a.active = active;
  if (active) {
    showToast(`✅ ${a.name} marked as actively in use`, 'success');
  } else {
    showToast(`⚠️ ${a.name} is now in standby (phantom power!)`, 'warning');
  }
  saveToStorage();
  renderApplianceList();
  recalcAll();
  updateCharts();
  phantomDetection();
}

function removeAppliance(id) {
  const a = appliances.find(x => x.id === id);
  appliances = appliances.filter(x => x.id !== id);
  if (a) showToast(`🗑️ ${a.name} removed`, 'success');
  saveToStorage();
  renderApplianceList();
  recalcAll();
  updateCharts();
  renderBadges();
  phantomDetection();
}

// ═══════════════════════════════════════════════════════════════
//  3. INTELLIGENT COST CALCULATOR
// ═══════════════════════════════════════════════════════════════
function getRate() {
  return parseFloat(inpRate.value) || 7.5;
}

function getHours() {
  return parseFloat(inpStandbyHours.value) || 20;
}

function recalcAll() {
  const rate = getRate();
  const hours = getHours();
  const phantomAppliances = appliances.filter(a => !a.active); // standby only

  let totalDailyKWh = 0;
  phantomAppliances.forEach(a => {
    totalDailyKWh += (a.watts * a.qty * hours) / 1000;
  });

  const dailyCost   = totalDailyKWh * rate;
  const monthlyCost = dailyCost * 30;
  const annualCost  = dailyCost * 365;
  const annualKWh   = totalDailyKWh * 365;
  const annualCO2   = annualKWh * CO2_FACTOR;

  // Total devices count
  const totalDevices = appliances.reduce((s, a) => s + a.qty, 0);
  const activeDevices = appliances.filter(a => a.active).reduce((s, a) => s + a.qty, 0);
  const standbyDevices = totalDevices - activeDevices;

  // Update stats
  $('#stat-devices').textContent = totalDevices;
  $('#stat-devices-sub').textContent = `${activeDevices} active · ${standbyDevices} standby`;
  $('#stat-daily-cost').textContent = `₹${formatINR(dailyCost)}`;
  $('#stat-monthly-cost').textContent = `₹${formatINR(monthlyCost)}`;
  $('#stat-monthly-sub').textContent = `₹${formatINR(annualCost)} annually`;
  $('#stat-energy').textContent = `${annualKWh.toFixed(1)} kWh`;
  $('#stat-co2').textContent = `${annualCO2.toFixed(1)} kg`;

  // Biggest vampire
  if (phantomAppliances.length > 0) {
    const sorted = [...phantomAppliances].sort((a, b) => (b.watts * b.qty) - (a.watts * a.qty));
    const vampire = sorted[0];
    $('#stat-vampire').textContent = vampire.icon + ' ' + vampire.name;
    const vampireAnnual = (vampire.watts * vampire.qty * hours / 1000) * 365 * rate;
    $('#stat-vampire-sub').textContent = `₹${formatINR(vampireAnnual)}/yr wasted`;
  } else {
    $('#stat-vampire').textContent = '—';
    $('#stat-vampire-sub').textContent = totalDevices > 0 ? 'All devices active!' : 'Add devices to see';
  }

  // CO₂ impact section
  updateCO2Display(annualCO2, annualKWh);
}

// ═══════════════════════════════════════════════════════════════
//  4. CHARTS (Chart.js Pie + Bar)
// ═══════════════════════════════════════════════════════════════
let pieChart = null;
let barChart = null;

function initCharts() {
  // Global Chart.js defaults
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.plugins.legend.labels.padding = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;

  const pieCtx = document.getElementById('chart-pie').getContext('2d');
  pieChart = new Chart(pieCtx, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              return `${ctx.label}: ${ctx.parsed.toFixed(2)} kWh/yr`;
            }
          }
        }
      }
    }
  });

  const barCtx = document.getElementById('chart-bar').getContext('2d');
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Monthly Cost (₹)', data: [], backgroundColor: [], borderWidth: 0, borderRadius: 6 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              return `₹${formatINR(ctx.parsed.x)}/month`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(148,163,184,0.08)' },
          ticks: { callback: v => '₹' + v }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

function updateCharts() {
  if (!pieChart || !barChart) return;

  const rate = getRate();
  const hours = getHours();
  const phantom = appliances.filter(a => !a.active);

  // Sort by cost descending
  const sorted = [...phantom].sort((a, b) => (b.watts * b.qty) - (a.watts * a.qty));

  const labels = sorted.map(a => `${a.icon} ${a.name}${a.qty > 1 ? ' ×' + a.qty : ''}`);
  const kwhData = sorted.map(a => (a.watts * a.qty * hours / 1000) * 365);
  const costData = sorted.map(a => (a.watts * a.qty * hours / 1000) * rate * 30);
  const colors = sorted.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  // Pie
  pieChart.data.labels = labels;
  pieChart.data.datasets[0].data = kwhData;
  pieChart.data.datasets[0].backgroundColor = colors;
  pieChart.update('none');

  // Bar
  barChart.data.labels = labels;
  barChart.data.datasets[0].data = costData;
  barChart.data.datasets[0].backgroundColor = colors;
  barChart.update('none');
}

// ═══════════════════════════════════════════════════════════════
//  5. "OPTIMIZE MY HOME" SAVE MODE
// ═══════════════════════════════════════════════════════════════
function runOptimize() {
  const rate = getRate();
  const hours = getHours();
  const phantom = appliances.filter(a => !a.active);

  if (phantom.length === 0) {
    showToast('🎉 All devices are active or list is empty — nothing to optimize!', 'success');
    return;
  }

  // Sort by wasted cost
  const sorted = [...phantom].sort((a, b) => (b.watts * b.qty) - (a.watts * a.qty));

  // Total phantom cost
  let totalPhantomAnnual = 0;
  phantom.forEach(a => {
    totalPhantomAnnual += (a.watts * a.qty * hours / 1000) * 365 * rate;
  });

  // Top 3 offenders
  const top = sorted.slice(0, 3);
  let topSavings = 0;
  top.forEach(a => {
    topSavings += (a.watts * a.qty * hours / 1000) * 365 * rate;
  });

  const pct = totalPhantomAnnual > 0 ? Math.round((topSavings / totalPhantomAnnual) * 100) : 0;

  // Show result
  optimizeResult.classList.add('show');
  $('#optimize-pct').textContent = `${pct}% potential savings`;
  $('#savings-bar-fill').style.width = `${Math.min(pct, 100)}%`;

  const tipsHTML = top.map((a, i) => {
    const annualCost = (a.watts * a.qty * hours / 1000) * 365 * rate;
    return `<div class="tip-item">
      <span class="icon">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
      <span><strong>${a.icon} ${a.name}</strong> — Unplug to save ₹${formatINR(annualCost)}/yr (${a.watts}W × ${a.qty})</span>
    </div>`;
  }).join('');

  const summaryHTML = `
    <div class="tip-item" style="background:var(--neon-green-dim); border:1px solid var(--border-green); margin-top:8px;">
      <span class="icon">💡</span>
      <span>Unplugging your top ${top.length} vampires saves <strong>₹${formatINR(topSavings)}/yr</strong>. 
      Use smart power strips to auto-cut standby power!</span>
    </div>
  `;

  $('#optimize-tips').innerHTML = tipsHTML + summaryHTML;

  showToast(`🧠 Optimization complete! You can save ${pct}% by unplugging top offenders.`, 'success');
}

// ═══════════════════════════════════════════════════════════════
//  6. GAMIFICATION / BADGES
// ═══════════════════════════════════════════════════════════════
const BADGES = [
  { id: 'first',    icon: '🌱', name: 'First Step',     desc: 'Add your first appliance',        check: () => appliances.length >= 1 },
  { id: 'tracker',  icon: '📊', name: 'Energy Tracker',  desc: 'Track 5+ appliances',             check: () => appliances.length >= 5 },
  { id: 'hunter',   icon: '🧛', name: 'Vampire Hunter',  desc: 'Track 10+ appliances',            check: () => appliances.length >= 10 },
  { id: 'aware',    icon: '💡', name: 'Awareness',       desc: 'Identify a phantom device',        check: () => appliances.some(a => !a.active && a.watts > 2) },
  { id: 'saver',    icon: '🌿', name: 'Eco Saver',       desc: 'Run the optimizer',                check: () => optimizeResult.classList.contains('show') },
  { id: 'ninja',    icon: '⚡', name: 'Power Ninja',     desc: 'Kill all phantom power',           check: () => killSwitchActive },
  { id: 'master',   icon: '🏆', name: 'Energy Master',   desc: 'Earn all other badges',            check: () => false },  // special
];

function renderBadges() {
  const grid = $('#badges-grid');
  const earnedIds = [];

  let html = '';
  BADGES.forEach(b => {
    const earned = b.id === 'master'
      ? BADGES.filter(x => x.id !== 'master').every(x => x.check())
      : b.check();
    if (earned) earnedIds.push(b.id);

    html += `<div class="badge ${earned ? 'earned' : 'locked'}">
      <span class="badge-icon">${b.icon}</span>
      <span class="badge-text">
        <span class="badge-name">${b.name}</span>
        <span class="badge-desc">${b.desc}</span>
      </span>
    </div>`;
  });
  grid.innerHTML = html;

  // Leaderboard message
  const earnedCount = earnedIds.length;
  const totalBadges = BADGES.length;
  const pct = Math.min(95, Math.round(30 + (earnedCount / totalBadges) * 60));
  const msg = earnedCount === 0
    ? '🌍 Add appliances to start earning badges!'
    : earnedCount >= totalBadges
      ? '🎉 You are a true Energy Master! Saving more than 95% of users!'
      : `🌍 You're more energy-aware than ${pct}% of users! Keep going!`;
  $('#leaderboard-msg').textContent = msg;
}

// ═══════════════════════════════════════════════════════════════
//  7. PHANTOM DETECTION AI (Simulated)
// ═══════════════════════════════════════════════════════════════
function phantomDetection() {
  const phantoms = appliances.filter(a => !a.active && a.watts > 0);

  if (phantoms.length > 0) {
    const worst = phantoms.reduce((max, a) => (a.watts * a.qty) > (max.watts * max.qty) ? a : max, phantoms[0]);
    phantomBanner.classList.add('show');
    $('#phantom-banner-text').textContent =
      `⚠️ Phantom Alert: Your ${worst.name} is OFF but still consuming ${worst.watts}W × ${worst.qty}. ` +
      `(${phantoms.length} total phantom device${phantoms.length > 1 ? 's' : ''} detected)`;

    // Fire a notification for new phantoms
    if (phantoms.length > 2) {
      showToast(`🧛 ${phantoms.length} devices draining phantom power!`, 'danger');
    }
  } else {
    phantomBanner.classList.remove('show');
  }
}

// ═══════════════════════════════════════════════════════════════
//  8. TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════════
function showToast(message, type = 'success', duration = 4000) {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconMap = { success: '✅', warning: '⚠️', danger: '🚨' };
  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || '💡'}</span>
    <span>${message}</span>
    <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
  `;

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Smart notifications (idle detection simulation)
let idleTimers = {};
function startIdleNotifications() {
  // Every 5 minutes, check for long-idle devices
  setInterval(() => {
    const phantom = appliances.filter(a => !a.active);
    if (phantom.length > 0) {
      const random = phantom[Math.floor(Math.random() * phantom.length)];
      showToast(`⏰ Your ${random.name} has been idle — unplug to save energy!`, 'warning', 6000);
    }
  }, 300000); // 5 minutes
}
startIdleNotifications();

// ═══════════════════════════════════════════════════════════════
//  9. KILL SWITCH (UI Simulation)
// ═══════════════════════════════════════════════════════════════
function toggleKillSwitch() {
  killSwitchActive = !killSwitchActive;

  if (killSwitchActive) {
    // "Kill" all phantom power — set all standby devices to active
    appliances.forEach(a => { a.active = true; });
    killSwitchBtn.classList.add('active');
    $('#kill-label').textContent = '✅ Phantom Power KILLED';
    showToast('⚡ All phantom power eliminated! Devices marked as active.', 'success');
  } else {
    killSwitchBtn.classList.remove('active');
    $('#kill-label').textContent = 'Kill Phantom Power';
    showToast('🔌 Kill switch deactivated. Devices returned to previous state.', 'warning');
  }

  saveToStorage();
  renderApplianceList();
  recalcAll();
  updateCharts();
  renderBadges();
  phantomDetection();
}

// ═══════════════════════════════════════════════════════════════
//  10. CO₂ IMPACT VISUALIZATION
// ═══════════════════════════════════════════════════════════════
function updateCO2Display(annualCO2, annualKWh) {
  // Big value
  $('#co2-big-value').innerHTML = `${annualCO2.toFixed(1)} <span class="co2-unit">kg CO₂/yr</span>`;

  // Bar color based on severity
  const barFill = $('#co2-bar-fill');
  const maxCO2 = 200; // reasonable max for indication
  const pct = Math.min(100, (annualCO2 / maxCO2) * 100);
  barFill.style.width = `${pct}%`;

  if (pct < 30) {
    barFill.style.background = 'var(--neon-green)';
  } else if (pct < 60) {
    barFill.style.background = 'linear-gradient(90deg, var(--neon-green), var(--neon-yellow))';
  } else {
    barFill.style.background = 'linear-gradient(90deg, var(--neon-yellow), var(--neon-red))';
  }

  // Context message
  const ctx = $('#co2-context');
  if (annualCO2 === 0) {
    ctx.textContent = 'No phantom emissions — great!';
  } else if (annualCO2 < 20) {
    ctx.textContent = 'Low impact — you\'re doing well!';
  } else if (annualCO2 < 50) {
    ctx.textContent = 'Moderate impact — consider unplugging idle devices.';
  } else {
    ctx.textContent = 'High impact! Significant phantom power waste detected.';
  }

  // Equivalencies
  // 1 tree absorbs ~22 kg CO₂/year
  // 1 km driving ≈ 0.21 kg CO₂
  // 1 LED bulb (10W) for 1 hour = 0.01 kWh × 0.82 = 0.0082 kg
  $('#co2-trees').textContent = Math.ceil(annualCO2 / 22);
  $('#co2-km').textContent = Math.round(annualCO2 / 0.21);
  $('#co2-bulb-hrs').textContent = formatINR(Math.round(annualKWh / 0.01)); // hours of 10W LED
}

// ═══════════════════════════════════════════════════════════════
//  LOCALSTORAGE
// ═══════════════════════════════════════════════════════════════
function saveToStorage() {
  const data = {
    appliances,
    nextId,
    rate: inpRate.value,
    hours: inpStandbyHours.value,
    killSwitchActive
  };
  localStorage.setItem('phantom-power-data', JSON.stringify(data));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem('phantom-power-data');
    if (!raw) return;
    const data = JSON.parse(raw);
    appliances = data.appliances || [];
    nextId = data.nextId || 1;
    if (data.rate) inpRate.value = data.rate;
    if (data.hours) inpStandbyHours.value = data.hours;
    killSwitchActive = data.killSwitchActive || false;
    if (killSwitchActive) {
      killSwitchBtn.classList.add('active');
      $('#kill-label').textContent = '✅ Phantom Power KILLED';
    }
    renderApplianceList();
    phantomDetection();
  } catch (e) {
    console.warn('Failed to load saved data:', e);
  }
}

function resetAll() {
  if (!confirm('Reset all data? This cannot be undone.')) return;
  appliances = [];
  nextId = 1;
  killSwitchActive = false;
  killSwitchBtn.classList.remove('active');
  $('#kill-label').textContent = 'Kill Phantom Power';
  localStorage.removeItem('phantom-power-data');
  optimizeResult.classList.remove('show');
  renderApplianceList();
  recalcAll();
  updateCharts();
  renderBadges();
  phantomDetection();
  showToast('🔄 All data has been reset.', 'success');
}

// ═══════════════════════════════════════════════════════════════
//  PDF EXPORT
// ═══════════════════════════════════════════════════════════════
async function exportPDF() {
  showToast('📄 Generating PDF report...', 'success');

  try {
    const captureArea = document.getElementById('capture-area');
    const canvas = await html2canvas(captureArea, {
      backgroundColor: '#0a0e17',
      scale: 1.5,
      useCORS: true,
      logging: false
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297;

    while (heightLeft > 0) {
      position -= 297;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    pdf.save('Phantom-Power-Report.pdf');
    showToast('✅ PDF report saved!', 'success');
  } catch (err) {
    console.error('PDF export error:', err);
    showToast('❌ PDF export failed. Try again.', 'danger');
  }
}

// ═══════════════════════════════════════════════════════════════
//  UTILITY: Indian Number Format
// ═══════════════════════════════════════════════════════════════
function formatINR(num) {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  // Indian number system: last 3, then groups of 2
  let result = '';
  const str = intPart;
  const len = str.length;

  if (len <= 3) {
    result = str;
  } else {
    result = str.substring(len - 3);
    let remaining = str.substring(0, len - 3);
    while (remaining.length > 2) {
      result = remaining.substring(remaining.length - 2) + ',' + result;
      remaining = remaining.substring(0, remaining.length - 2);
    }
    if (remaining.length > 0) {
      result = remaining + ',' + result;
    }
  }

  // Only show decimals if meaningful
  if (parseFloat(decPart) > 0) {
    return result + '.' + decPart;
  }
  return result;
}
