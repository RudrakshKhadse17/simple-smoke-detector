const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database File Paths
const DATA_DIR = path.join(__dirname, 'data');
const DB_USERS = path.join(DATA_DIR, 'users.json');
const DB_READINGS = path.join(DATA_DIR, 'readings.json');
const DB_SETTINGS = path.join(DATA_DIR, 'settings.json');

// Ensure database files exist
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_USERS)) {
    fs.writeFileSync(DB_USERS, JSON.stringify([
      {
        id: 'usr_rudraksh_01',
        name: 'Rudraksh',
        email: 'rudraksh@example.com',
        password: 'password123',
        createdAt: new Date().toISOString()
      }
    ], null, 2));
  }

  if (!fs.existsSync(DB_SETTINGS)) {
    fs.writeFileSync(DB_SETTINGS, JSON.stringify({
      warningThreshold: 350,
      dangerThreshold: 650,
      ledStatus: 'OFF',
      ledManualOverride: false,
      lcdLine1: 'SMOKE ALERT',
      lcdLine2: 'CHECK AREA',
      lastSeen: 0,
      currentReading: {
        sensorValue: 350,
        status: 'SAFE',
        time: '12:30 PM',
        date: '05-10-2026',
        timestamp: Date.now()
      }
    }, null, 2));
  }

  if (!fs.existsSync(DB_READINGS)) {
    fs.writeFileSync(DB_READINGS, JSON.stringify([
      {
        id: 'rec_1',
        sensorValue: 350,
        status: 'SAFE',
        time: '12:30 PM',
        date: '05-10-2026',
        timestamp: Date.now()
      }
    ], null, 2));
  }
}

initDatabase();

// JSON Helper Functions
function readJSON(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return fallback;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

// Helper: Get Asia/Kolkata (+5:30) Formatted Time & Date
function getISTDateTime(dateObj = new Date()) {
  const istDateOptions = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  const istTimeOptions = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };

  // Convert to DD-MM-YYYY
  const parts = new Intl.DateTimeFormat('en-GB', istDateOptions).formatToParts(dateObj);
  let day = '01', month = '01', year = '2026';
  for (const p of parts) {
    if (p.type === 'day') day = p.value;
    if (p.type === 'month') month = p.value;
    if (p.type === 'year') year = p.value;
  }
  const dateStr = `${day}-${month}-${year}`;

  // Convert to HH:MM AM/PM
  const timeStr = new Intl.DateTimeFormat('en-US', istTimeOptions).format(dateObj);

  return {
    date: dateStr,
    time: timeStr,
    timestamp: dateObj.getTime()
  };
}

// Helper: Determine status based on thresholds
function evaluateStatus(val, warningThreshold, dangerThreshold) {
  const num = Number(val);
  if (num >= dangerThreshold) return 'DANGER';
  if (num >= warningThreshold) return 'WARNING';
  return 'SAFE';
}

// Timeout for ESP8266 Online Status (30 seconds)
const OFFLINE_TIMEOUT_MS = 30000;

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

// Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields (Name, Email, Password) are required.' });
  }

  const users = readJSON(DB_USERS, []);
  const existingUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
  }

  const newUser = {
    id: 'usr_' + Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeJSON(DB_USERS, users);

  return res.json({
    success: true,
    message: 'Registration successful!',
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const users = readJSON(DB_USERS, []);
  const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password.trim());

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  return res.json({
    success: true,
    message: 'Login successful!',
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// ==========================================
// 2. DASHBOARD & SENSOR READINGS ENDPOINTS
// ==========================================

// Dashboard Status (realtime polling)
app.get('/api/dashboard/status', (req, res) => {
  const settings = readJSON(DB_SETTINGS, {});
  const isOnline = (Date.now() - (settings.lastSeen || 0)) < OFFLINE_TIMEOUT_MS;

  const currentReading = settings.currentReading || {
    sensorValue: 0,
    status: 'SAFE',
    time: '--:--',
    date: '--'
  };

  res.json({
    sensorValue: currentReading.sensorValue,
    status: currentReading.status,
    time: currentReading.time,
    date: currentReading.date,
    isOnline: isOnline,
    lastSeen: settings.lastSeen || 0,
    ledStatus: settings.ledStatus || 'OFF',
    ledManualOverride: settings.ledManualOverride || false,
    warningThreshold: settings.warningThreshold || 350,
    dangerThreshold: settings.dangerThreshold || 650,
    lcdLine1: settings.lcdLine1 || '',
    lcdLine2: settings.lcdLine2 || ''
  });
});

// Paginated Saved Records
app.get('/api/readings', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const readings = readJSON(DB_READINGS, []);
  // Sort newest first
  readings.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const total = readings.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedItems = readings.slice(startIndex, startIndex + limit);

  res.json({
    readings: paginatedItems,
    total: total,
    page: page,
    totalPages: totalPages,
    limit: limit
  });
});

// Recent History for Charts (last 20 readings chronological)
app.get('/api/readings/history', (req, res) => {
  const readings = readJSON(DB_READINGS, []);
  const sorted = [...readings].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const recent = sorted.slice(-20);
  res.json(recent);
});

// Delete Record
app.delete('/api/readings/:id', (req, res) => {
  const id = req.params.id;
  let readings = readJSON(DB_READINGS, []);
  const initialLength = readings.length;
  readings = readings.filter(r => String(r.id) !== String(id));

  if (readings.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Record not found.' });
  }

  writeJSON(DB_READINGS, readings);
  res.json({ success: true, message: 'Record deleted successfully.' });
});

// Clear All Records (optional utility)
app.delete('/api/readings', (req, res) => {
  writeJSON(DB_READINGS, []);
  res.json({ success: true, message: 'All records cleared.' });
});

// Update Thresholds
app.post('/api/settings/thresholds', (req, res) => {
  const { warningThreshold, dangerThreshold } = req.body;
  const w = parseInt(warningThreshold);
  const d = parseInt(dangerThreshold);

  if (isNaN(w) || isNaN(d) || w <= 0 || d <= w) {
    return res.status(400).json({
      success: false,
      message: 'Invalid thresholds. Warning must be > 0 and Danger must be > Warning.'
    });
  }

  const settings = readJSON(DB_SETTINGS, {});
  settings.warningThreshold = w;
  settings.dangerThreshold = d;

  // Re-evaluate current reading status
  if (settings.currentReading) {
    settings.currentReading.status = evaluateStatus(settings.currentReading.sensorValue, w, d);
  }

  writeJSON(DB_SETTINGS, settings);
  res.json({ success: true, message: 'Thresholds updated successfully!', settings });
});

// ==========================================
// 3. SMART DISPLAY (TAB 2) ENDPOINTS
// ==========================================

// Get Smart Display Text
app.get('/api/smart-display', (req, res) => {
  const settings = readJSON(DB_SETTINGS, {});
  res.json({
    lcdLine1: settings.lcdLine1 || '',
    lcdLine2: settings.lcdLine2 || ''
  });
});

// Save Smart Display Text (Max 16 chars per line)
app.post('/api/smart-display', (req, res) => {
  const { line1, line2 } = req.body;

  let l1 = (line1 || '').trim().substring(0, 16);
  let l2 = (line2 || '').trim().substring(0, 16);

  const settings = readJSON(DB_SETTINGS, {});
  settings.lcdLine1 = l1;
  settings.lcdLine2 = l2;
  writeJSON(DB_SETTINGS, settings);

  res.json({
    success: true,
    message: 'Smart Display text updated successfully!',
    lcdLine1: l1,
    lcdLine2: l2
  });
});

// ==========================================
// 4. LED CONTROL (TAB 3) ENDPOINTS
// ==========================================

// Get LED Status
app.get('/api/led/status', (req, res) => {
  const settings = readJSON(DB_SETTINGS, {});
  res.json({
    ledStatus: settings.ledStatus || 'OFF',
    manualOverride: settings.ledManualOverride || false
  });
});

// Toggle / Set LED Status manually
app.post('/api/led/toggle', (req, res) => {
  const settings = readJSON(DB_SETTINGS, {});
  let targetStatus;

  if (req.body && req.body.status) {
    targetStatus = req.body.status.toUpperCase() === 'ON' ? 'ON' : 'OFF';
  } else {
    targetStatus = settings.ledStatus === 'ON' ? 'OFF' : 'ON';
  }

  settings.ledStatus = targetStatus;
  settings.ledManualOverride = true; // Mark as manual override until auto reset
  writeJSON(DB_SETTINGS, settings);

  res.json({
    success: true,
    ledStatus: settings.ledStatus,
    manualOverride: true,
    message: `LED turned ${settings.ledStatus} manually.`
  });
});

// Reset LED back to Automatic Control
app.post('/api/led/auto', (req, res) => {
  const settings = readJSON(DB_SETTINGS, {});
  settings.ledManualOverride = false;

  // Auto determine LED based on current reading
  const status = settings.currentReading ? settings.currentReading.status : 'SAFE';
  settings.ledStatus = status === 'DANGER' ? 'ON' : 'OFF';
  writeJSON(DB_SETTINGS, settings);

  res.json({
    success: true,
    ledStatus: settings.ledStatus,
    manualOverride: false,
    message: 'LED switched back to Automatic mode.'
  });
});

// ==========================================
// 5. ESP8266 IoT COMMUNICATION ENDPOINTS
// ==========================================

// Primary IoT endpoint for ESP8266 (Called every 10 seconds)
// Sends MQ-2 reading and receives LCD & LED commands in one roundtrip
app.post('/api/iot/update', (req, res) => {
  const sensorValue = parseInt(req.body.sensorValue ?? req.body.value ?? req.body.mq2 ?? 0);
  const settings = readJSON(DB_SETTINGS, {});
  const now = new Date();
  const ist = getISTDateTime(now);

  // Update ESP8266 heartbeat / online status
  settings.lastSeen = now.getTime();

  // Evaluate Safety Status
  const status = evaluateStatus(sensorValue, settings.warningThreshold || 350, settings.dangerThreshold || 650);

  // Update LED status if not manually overridden
  if (!settings.ledManualOverride) {
    if (status === 'DANGER') {
      settings.ledStatus = 'ON';
    } else {
      settings.ledStatus = 'OFF';
    }
  }

  // Update current reading in settings
  settings.currentReading = {
    sensorValue: sensorValue,
    status: status,
    time: ist.time,
    date: ist.date,
    timestamp: ist.timestamp
  };

  writeJSON(DB_SETTINGS, settings);

  // Append new record to readings database
  const readings = readJSON(DB_READINGS, []);
  const newRecord = {
    id: 'rec_' + Date.now(),
    sensorValue: sensorValue,
    status: status,
    time: ist.time,
    date: ist.date,
    timestamp: ist.timestamp
  };
  readings.unshift(newRecord);

  // Keep last 500 records to prevent file growing indefinitely
  if (readings.length > 500) {
    readings.length = 500;
  }
  writeJSON(DB_READINGS, readings);

  // Return response expected by ESP8266
  res.json({
    success: true,
    status: status,
    ledStatus: settings.ledStatus,
    lcdLine1: settings.lcdLine1 || 'SMOKE ALERT',
    lcdLine2: settings.lcdLine2 || 'CHECK AREA',
    warningThreshold: settings.warningThreshold,
    dangerThreshold: settings.dangerThreshold
  });
});

// IoT Config Poll (Optional individual GET endpoint for ESP8266)
app.get('/api/iot/config', (req, res) => {
  const settings = readJSON(DB_SETTINGS, {});
  res.json({
    ledStatus: settings.ledStatus || 'OFF',
    lcdLine1: settings.lcdLine1 || 'SMOKE ALERT',
    lcdLine2: settings.lcdLine2 || 'CHECK AREA',
    warningThreshold: settings.warningThreshold || 350,
    dangerThreshold: settings.dangerThreshold || 650
  });
});

// IoT Ping (Heartbeat)
app.get('/api/iot/ping', (req, res) => {
  const settings = readJSON(DB_SETTINGS, {});
  settings.lastSeen = Date.now();
  writeJSON(DB_SETTINGS, settings);
  res.json({ success: true, message: 'pong', timestamp: settings.lastSeen });
});

// ==========================================
// 6. SIMULATION ENDPOINT (For Demonstration)
// ==========================================
// Allows simulating sensor values from the UI without hardware
app.post('/api/simulate', (req, res) => {
  const val = parseInt(req.body.sensorValue);
  if (isNaN(val)) {
    return res.status(400).json({ success: false, message: 'Valid sensor value is required.' });
  }

  // Forward to /api/iot/update logic
  const settings = readJSON(DB_SETTINGS, {});
  const now = new Date();
  const ist = getISTDateTime(now);
  settings.lastSeen = now.getTime();

  const status = evaluateStatus(val, settings.warningThreshold || 350, settings.dangerThreshold || 650);

  if (!settings.ledManualOverride) {
    settings.ledStatus = status === 'DANGER' ? 'ON' : 'OFF';
  }

  settings.currentReading = {
    sensorValue: val,
    status: status,
    time: ist.time,
    date: ist.date,
    timestamp: ist.timestamp
  };
  writeJSON(DB_SETTINGS, settings);

  const readings = readJSON(DB_READINGS, []);
  readings.unshift({
    id: 'rec_' + Date.now(),
    sensorValue: val,
    status: status,
    time: ist.time,
    date: ist.date,
    timestamp: ist.timestamp
  });
  if (readings.length > 500) readings.length = 500;
  writeJSON(DB_READINGS, readings);

  res.json({
    success: true,
    message: 'Simulation reading recorded successfully!',
    reading: settings.currentReading
  });
});

// Serve frontend for all standard routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  Simple Smoke Detector Server Running!        `);
  console.log(`  Local URL: http://localhost:${PORT}          `);
  console.log(`  Timezone:  Asia/Kolkata (+5:30)              `);
  console.log(`===============================================`);
});
