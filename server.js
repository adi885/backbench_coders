/* ═══════════════════════════════════════════════════════════════
   PHANTOM POWER COST ESTIMATOR — Local Node.js Server
   Express + WebSocket for ESP32 ↔ Dashboard communication
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

// ─── Middleware ───
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ═══════════════════════════════════════════════════════════════
//  IN-MEMORY DATA STORE
// ═══════════════════════════════════════════════════════════════
const dataStore = {
  relays: {
    relay1: { state: false, wattage: 100, runtimeMinutes: 0, energyCostINR: 0, name: "Relay 1", lastUpdated: null, schedule: { type: "none", onHour: 0, onMinute: 0, offHour: 0, offMinute: 0, dayOfWeek: 0, dayOfMonth: 1 } },
    relay2: { state: false, wattage: 100, runtimeMinutes: 0, energyCostINR: 0, name: "Relay 2", lastUpdated: null, schedule: { type: "none", onHour: 0, onMinute: 0, offHour: 0, offMinute: 0, dayOfWeek: 0, dayOfMonth: 1 } },
    relay3: { state: false, wattage: 100, runtimeMinutes: 0, energyCostINR: 0, name: "Relay 3", lastUpdated: null, schedule: { type: "none", onHour: 0, onMinute: 0, offHour: 0, offMinute: 0, dayOfWeek: 0, dayOfMonth: 1 } },
    relay4: { state: false, wattage: 100, runtimeMinutes: 0, energyCostINR: 0, name: "Relay 4", lastUpdated: null, schedule: { type: "none", onHour: 0, onMinute: 0, offHour: 0, offMinute: 0, dayOfWeek: 0, dayOfMonth: 1 } },
  },
  config: {
    ratePerKWh: 7.5,
  },
  esp32: {
    connected: false,
    ip: null,
    lastSeen: null,
    uptime: 0,
    freeHeap: 0,
  },
  summary: {
    totalCostINR: 0,
    totalRuntimeMinutes: 0,
    lastUpdated: null,
  }
};

// Track ESP32 connection timeout (mark disconnected after 15s no contact)
let esp32Timeout = null;

function markESP32Connected(ip) {
  dataStore.esp32.connected = true;
  dataStore.esp32.ip = ip;
  dataStore.esp32.lastSeen = new Date().toISOString();

  if (esp32Timeout) clearTimeout(esp32Timeout);
  esp32Timeout = setTimeout(() => {
    dataStore.esp32.connected = false;
    broadcastToClients({ type: 'esp32_status', data: dataStore.esp32 });
  }, 15000);
}

// ═══════════════════════════════════════════════════════════════
//  WebSocket — Broadcast to all dashboard clients
// ═══════════════════════════════════════════════════════════════
function broadcastToClients(message) {
  const msg = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', (ws, req) => {
  console.log(`[WS] Dashboard client connected from ${req.socket.remoteAddress}`);

  // Send current state immediately
  ws.send(JSON.stringify({ type: 'full_state', data: dataStore }));

  ws.on('close', () => {
    console.log('[WS] Dashboard client disconnected');
  });
});

// ═══════════════════════════════════════════════════════════════
//  REST API — ESP32 Data Endpoint
// ═══════════════════════════════════════════════════════════════

// ESP32 posts its data here every few seconds
app.post('/api/data', (req, res) => {
  const { relays, uptime, freeHeap } = req.body;
  const esp32IP = req.ip.replace('::ffff:', '');

  markESP32Connected(esp32IP);

  if (uptime !== undefined) dataStore.esp32.uptime = uptime;
  if (freeHeap !== undefined) dataStore.esp32.freeHeap = freeHeap;

  // Update relay data from ESP32
  if (relays && Array.isArray(relays)) {
    relays.forEach(r => {
      const key = `relay${r.id}`;
      if (dataStore.relays[key]) {
        dataStore.relays[key].state = r.state;
        if (r.runtimeMinutes !== undefined) dataStore.relays[key].runtimeMinutes = r.runtimeMinutes;
        if (r.energyCostINR !== undefined) dataStore.relays[key].energyCostINR = r.energyCostINR;
        if (r.wattage !== undefined) dataStore.relays[key].wattage = r.wattage;
        dataStore.relays[key].lastUpdated = new Date().toISOString();
      }
    });
  }

  // Update summary
  let totalCost = 0, totalRuntime = 0;
  Object.values(dataStore.relays).forEach(r => {
    totalCost += r.energyCostINR;
    totalRuntime += r.runtimeMinutes;
  });
  dataStore.summary.totalCostINR = totalCost;
  dataStore.summary.totalRuntimeMinutes = totalRuntime;
  dataStore.summary.lastUpdated = new Date().toISOString();

  // Broadcast to dashboard(s)
  broadcastToClients({ type: 'relay_update', data: dataStore.relays });
  broadcastToClients({ type: 'esp32_status', data: dataStore.esp32 });
  broadcastToClients({ type: 'summary', data: dataStore.summary });

  // Respond with any pending commands (relay state changes from dashboard)
  const commands = [];
  Object.keys(dataStore.relays).forEach(key => {
    const idx = parseInt(key.replace('relay', ''));
    commands.push({ id: idx, state: dataStore.relays[key].state });
  });

  res.json({ ok: true, relays: commands, config: dataStore.config });
});

// ═══════════════════════════════════════════════════════════════
//  REST API — Relay Control (from Dashboard)
// ═══════════════════════════════════════════════════════════════

// Get all relay states
app.get('/api/relays', (req, res) => {
  res.json(dataStore.relays);
});

// Toggle specific relay
app.post('/api/relays/:id/toggle', (req, res) => {
  const key = `relay${req.params.id}`;
  if (!dataStore.relays[key]) return res.status(404).json({ error: 'Relay not found' });

  dataStore.relays[key].state = !dataStore.relays[key].state;
  console.log(`[API] Relay ${req.params.id} toggled → ${dataStore.relays[key].state ? 'ON' : 'OFF'}`);

  broadcastToClients({ type: 'relay_update', data: dataStore.relays });
  res.json({ ok: true, relay: key, state: dataStore.relays[key].state });
});

// Set specific relay state
app.post('/api/relays/:id/state', (req, res) => {
  const key = `relay${req.params.id}`;
  if (!dataStore.relays[key]) return res.status(404).json({ error: 'Relay not found' });

  const { state } = req.body;
  if (typeof state !== 'boolean') return res.status(400).json({ error: 'state must be boolean' });

  dataStore.relays[key].state = state;
  console.log(`[API] Relay ${req.params.id} set → ${state ? 'ON' : 'OFF'}`);

  broadcastToClients({ type: 'relay_update', data: dataStore.relays });
  res.json({ ok: true, relay: key, state });
});

// Update relay name
app.post('/api/relays/:id/name', (req, res) => {
  const key = `relay${req.params.id}`;
  if (!dataStore.relays[key]) return res.status(404).json({ error: 'Relay not found' });

  const { name } = req.body;
  dataStore.relays[key].name = name || `Relay ${req.params.id}`;
  broadcastToClients({ type: 'relay_update', data: dataStore.relays });
  res.json({ ok: true });
});

// Update relay wattage
app.post('/api/relays/:id/wattage', (req, res) => {
  const key = `relay${req.params.id}`;
  if (!dataStore.relays[key]) return res.status(404).json({ error: 'Relay not found' });

  const { wattage } = req.body;
  dataStore.relays[key].wattage = parseFloat(wattage) || 100;
  broadcastToClients({ type: 'relay_update', data: dataStore.relays });
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════
//  REST API — Kill Switch
// ═══════════════════════════════════════════════════════════════
app.post('/api/kill-switch', (req, res) => {
  const { active } = req.body; // true = kill all, false = restore

  Object.keys(dataStore.relays).forEach(key => {
    dataStore.relays[key].state = !active; // Kill = turn OFF all relays
  });

  console.log(`[API] Kill Switch ${active ? 'ACTIVATED — all relays OFF' : 'DEACTIVATED'}`);

  broadcastToClients({ type: 'relay_update', data: dataStore.relays });
  broadcastToClients({ type: 'kill_switch', active });
  res.json({ ok: true, active });
});

// ═══════════════════════════════════════════════════════════════
//  REST API — Config
// ═══════════════════════════════════════════════════════════════
app.get('/api/config', (req, res) => {
  res.json(dataStore.config);
});

app.post('/api/config', (req, res) => {
  const { ratePerKWh } = req.body;
  if (ratePerKWh !== undefined) dataStore.config.ratePerKWh = parseFloat(ratePerKWh);
  broadcastToClients({ type: 'config_update', data: dataStore.config });
  res.json({ ok: true, config: dataStore.config });
});

// ═══════════════════════════════════════════════════════════════
//  REST API — ESP32 Status
// ═══════════════════════════════════════════════════════════════
app.get('/api/esp32', (req, res) => {
  res.json(dataStore.esp32);
});

// ═══════════════════════════════════════════════════════════════
//  REST API — Full State
// ═══════════════════════════════════════════════════════════════
app.get('/api/state', (req, res) => {
  res.json(dataStore);
});

// ═══════════════════════════════════════════════════════════════
//  REST API — Reset Runtime
// ═══════════════════════════════════════════════════════════════
app.post('/api/reset-runtime', (req, res) => {
  Object.keys(dataStore.relays).forEach(key => {
    dataStore.relays[key].runtimeMinutes = 0;
    dataStore.relays[key].energyCostINR = 0;
  });
  dataStore.summary.totalCostINR = 0;
  dataStore.summary.totalRuntimeMinutes = 0;

  broadcastToClients({ type: 'relay_update', data: dataStore.relays });
  broadcastToClients({ type: 'summary', data: dataStore.summary });
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════
//  SERVE DASHBOARD — Fallback to index.html
// ═══════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ═══════════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════════
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  ⚡ Phantom Power Cost Estimator — Server');
  console.log('══════════════════════════════════════════════════');
  console.log(`  🌐 Dashboard: http://localhost:${PORT}`);

  // Show all local IPs for ESP32 config
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(name => {
    interfaces[name].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`  📡 Network:   http://${iface.address}:${PORT}`);
        console.log(`  🔧 ESP32 IP:  Set SERVER_IP to "${iface.address}"`);
      }
    });
  });

  console.log('══════════════════════════════════════════════════');
  console.log('  Waiting for ESP32 connection...\n');
});
