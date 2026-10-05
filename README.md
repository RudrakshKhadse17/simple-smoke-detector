# 🚨 Simple Smoke Detector — IoT & Web Application

An end-to-end **IoT + Web Application** for an **MQ-2 Smoke and Gas Detection System** featuring a NodeMCU ESP8266 microcontroller, an analog MQ-2 sensor, a 16x2 I2C LCD display, an actuator alert LED, and a full-stack **Express / NodeJS** dashboard with a simple JSON database deployable seamlessly on **Render**.

---

## 🌟 Key Features

- **Microcontroller**: ESP8266 (NodeMCU CP2102) with WiFi connectivity.
- **Sensor**: MQ-2 Smoke/Gas Sensor (Analog Output A0).
- **Actuators & Display**:
  - 16x2 I2C LCD Display (@ address `0x27`) on pins `D1` (SCL) and `D2` (SDA).
  - Actuator Alert LED on pin `D3` (GPIO 0).
- **Web Application Stack**:
  - **Frontend**: Responsive HTML5, Vanilla JavaScript, Tailwind CSS, Chart.js.
  - **Backend**: Express & Node.js REST API.
  - **Database**: Simple JSON database (`users.json`, `readings.json`, `settings.json`).
- **Page 1 (Auth)**: Sleek Glassmorphism Login & Registration (Name, Email, Password, Quick Demo login).
- **Page 2 (Header)**: Web App Name, Logged-in User Greeting (`Welcome Rudraksh`), Real-time `ESP8266 ONLINE / OFFLINE` indicator (30s timeout), Light/Dark Theme toggle.
- **Page 2 (Tab 1: Dashboard)**:
  - Large Hero Card with Current Smoke/Gas level, raw ADC value (0–1023), and Safety Status (`SAFE`, `WARNING`, `DANGER`).
  - Colorful semi-circular UI/UX gauge and multi-zone seek bar.
  - Configurable threshold sliders (Warning and Danger trip points).
  - Real-time live sensor stream graph & historical readings graph (Chart.js).
  - Saved sensor records table with **pagination** and individual record **deletion**.
  - All timestamps formatted in **Asia/Kolkata (+5:30)** (`HH:MM AM/PM` and `DD-MM-YYYY`).
- **Page 2 (Tab 2: Smart Display)**:
  - 2 text fields (Max 16 characters each: Row 1 & Row 2).
  - Live 16x2 LCD authentic bezel preview with dot-matrix styling.
  - Quick message presets ("Smoke Alert", "All Clear", "Evacuate", "SB Jain Project").
  - Transmits text to the ESP8266 to display on the physical 16x2 LCD!
- **Page 2 (Tab 3: Innovative LED Control)**:
  - Interactive 3D glowing LED bulb with neon aura effect.
  - Remote manual toggle switch (`Turn LED ON` / `Turn LED OFF`).
  - Automatic Danger Mode trigger (turns ON automatically when sensor reaches DANGER).
  - Telemetry badges for Smoke Status, ESP8266 State, and D3 Pin Level.
- **Footer**:
  - `Developed with Love ❤️ by ONE PIECE. Department of ETC, SB Jain, Nagpur` (with animated pulse heart icon).

---

## 📁 1. Complete Project Folder Structure

```text
VAC HACKATHON/
│
├── package.json                   # Project manifest, dependencies & scripts
├── server.js                      # Express backend with IoT, Auth, and Dashboard REST APIs
├── README.md                      # Complete documentation & deployment guide
│
├── data/                          # Simple JSON Database
│   ├── users.json                 # Registered user profiles & authentication data
│   ├── readings.json              # Historical sensor readings with Asia/Kolkata timestamps
│   └── settings.json              # System configuration, thresholds, LCD text & LED state
│
├── public/                        # Frontend Web Application
│   ├── index.html                 # Single Page Application (Login, Dashboard, Smart Display, LED)
│   ├── css/
│   │   └── style.css              # Custom styles, neon glows, animations & theme overrides
│   └── js/
│       └── app.js                 # Client-side logic, real-time polling, charts, pagination & events
│
└── esp8266/
    └── simple_smoke_detector.ino  # Complete Arduino sketch for NodeMCU ESP8266 CP2102
```

---

## 🔌 2. Hardware Wiring & Pin Mapping

| Component | Pin on Component | ESP8266 NodeMCU Pin | Description / Notes |
| :--- | :--- | :--- | :--- |
| **MQ-2 Sensor** | `AO` (Analog Out) | `A0` (ADC0) | Raw analog reading (0 to 1023) |
| **MQ-2 Sensor** | `VCC` | `VIN` (5V) | ⚠️ MQ-2 internal heater requires 5V |
| **MQ-2 Sensor** | `GND` | `GND` | Common Ground |
| **16x2 LCD I2C** | `SCL` | `D1` (GPIO 5) | I2C Clock Line |
| **16x2 LCD I2C** | `SDA` | `D2` (GPIO 4) | I2C Data Line |
| **16x2 LCD I2C** | `VCC` | `VIN` (5V) / `3V3` | 5V recommended for bright backlight |
| **16x2 LCD I2C** | `GND` | `GND` | Common Ground |
| **Alert LED** | Anode `(+)` | `D3` (GPIO 0) | Actuator output (via 220Ω resistor) |
| **Alert LED** | Cathode `(-)` | `GND` | Common Ground |

> **Note on I2C Address**: The code uses default address `0x27`. If your PCF8574 backpack uses `0x3F`, simply change `0x27` to `0x3F` in the sketch line: `LiquidCrystal_I2C lcd(0x27, 16, 2);`.

---

## 📟 3. ESP8266 LCD Display Sequences

### Setup LCD Sequence:
```text
[Step 1]
Row 1: MyProject
Row 2: WELCOME
(delay 3s)

[Step 2]
Row 1: CONNECTING TO
Row 2: WiFi.........

[Step 3 (Upon connection)]
Row 1: CONNECTED TO
Row 2: WiFi...SUCCESS
(delay 2s)
```

### Loop LCD Sequence (Repeats Continuously):
```text
1. Reads MQ-2 sensor from pin A0
2. Row 1: SMOKE/GAS
   Row 2: [Sensor Value, e.g. 350]
   (delay 2s)

3. Row 1: STATUS
   Row 2: [SAFE / WARNING / DANGER]
   (delay 2s)

4. Row 1: SMART DISPLAY
   Row 2: [Text sent from Web Dashboard, e.g. CHECK AREA]
   (delay 2s)

5. Row 1: LED STATUS
   Row 2: [ON / OFF]
   (delay 2s)
```

- **Periodic Data Sync**: Every 10 seconds, the ESP8266 sends its sensor value to the server and receives updated Smart Display lines and LED status in a single roundtrip.
- **Fail-safe Operation**: If WiFi or the server is temporarily offline, the ESP8266 continues reading the MQ-2 sensor, evaluating thresholds, switching the alert LED, and cycling the LCD display without blocking or freezing!

---

## 🗄️ 4. JSON Database Structure

### `data/users.json`
```json
[
  {
    "id": "usr_rudraksh_01",
    "name": "Rudraksh",
    "email": "rudraksh@example.com",
    "password": "password123",
    "createdAt": "2026-10-05T12:00:00.000Z"
  }
]
```

### `data/settings.json`
```json
{
  "warningThreshold": 350,
  "dangerThreshold": 650,
  "ledStatus": "OFF",
  "ledManualOverride": false,
  "lcdLine1": "SMOKE ALERT",
  "lcdLine2": "CHECK AREA",
  "lastSeen": 1791184294976,
  "currentReading": {
    "sensorValue": 350,
    "status": "SAFE",
    "time": "12:30 PM",
    "date": "05-10-2026",
    "timestamp": 1791183600000
  }
}
```

### `data/readings.json`
```json
[
  {
    "id": "rec_1791184294976",
    "sensorValue": 350,
    "status": "SAFE",
    "time": "12:30 PM",
    "date": "05-10-2026",
    "timestamp": 1791183600000
  }
]
```

---

## 🌐 5. REST API Endpoints

| Method | Endpoint | Description | Payload / Query Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account | `{ "name": "...", "email": "...", "password": "..." }` |
| `POST` | `/api/auth/login` | Login to web app | `{ "email": "...", "password": "..." }` |
| `GET` | `/api/dashboard/status` | Fetch live readings, gauge, online state | _None_ |
| `GET` | `/api/readings` | Paginated historical records | `?page=1&limit=10` |
| `DELETE`| `/api/readings/:id` | Delete specific sensor record | URL Parameter `id` |
| `GET` | `/api/readings/history` | Last 20 readings for Chart.js | _None_ |
| `POST` | `/api/settings/thresholds` | Update Warning & Danger thresholds | `{ "warningThreshold": 350, "dangerThreshold": 650 }` |
| `GET` | `/api/smart-display` | Fetch current LCD Row 1 & Row 2 | _None_ |
| `POST` | `/api/smart-display` | Save custom text for 16x2 LCD | `{ "line1": "SMOKE ALERT", "line2": "CHECK AREA" }` |
| `GET` | `/api/led/status` | Fetch current LED actuator state | _None_ |
| `POST` | `/api/led/toggle` | Manually toggle LED (`ON`/`OFF`) | `{ "status": "ON" }` (or toggle if empty) |
| `POST` | `/api/led/auto` | Switch LED back to auto danger mode | _None_ |
| `POST` | `/api/iot/update` | **ESP8266 IoT Data Exchange** | `{ "sensorValue": 350 }` |
| `POST` | `/api/simulate` | Test simulator reading without hardware | `{ "sensorValue": 450 }` |

---

## 💻 6. Instructions for Running Locally

### Step 1: Install Node.js
Ensure Node.js (version 16 or newer) is installed on your computer.

### Step 2: Install Dependencies
Open your terminal inside the project directory:
```bash
cd "c:\Users\CCLab\Desktop\VAC HACKATHON"
npm install
```

### Step 3: Start the Express Server
```bash
npm start
```
The server will start on:
```text
http://localhost:3000
```

### Step 4: Open in Your Browser
Visit `http://localhost:3000` in Google Chrome, Microsoft Edge, or Firefox.
- Click **"⚡ Quick Demo: Use pre-filled demo account (Rudraksh)"** or log in with:
  - **Email**: `rudraksh@example.com`
  - **Password**: `password123`
- You can also register a brand new account with your own name, email, and password.

---

## ☁️ 7. Instructions for Deploying on Render

Render is a modern cloud hosting platform with automatic GitHub continuous deployment and free Web Service tiers.

### Step 1: Push your project to GitHub
1. Initialize git (if not already done) and push your code to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Simple Smoke Detector initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/simple-smoke-detector.git
   git push -u origin main
   ```

### Step 2: Create a Web Service on Render
1. Go to [https://render.com](https://render.com) and log in.
2. Click **New +** &rarr; select **Web Service**.
3. Connect your GitHub repository (`simple-smoke-detector`).
4. Configure the Web Service settings:
   - **Name**: `simple-smoke-detector` (or any unique name)
   - **Region**: Choose the closest region (e.g., Singapore or Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: (Leave blank)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (or `node server.js`)
   - **Plan Type**: `Free`
5. Click **Create Web Service**.

Render will install packages, start `server.js`, and provide you with a live HTTPS URL:
```text
https://simple-smoke-detector.onrender.com
```

---

## 🔗 8. Where to Add the Render URL in the ESP8266 Code

In [`esp8266/simple_smoke_detector.ino`](file:///c:/Users/CCLab/Desktop/VAC%20HACKATHON/esp8266/simple_smoke_detector.ino), navigate to line **53**:

```cpp
// ==========================================
// 2. NETWORK & SERVER CONFIGURATION
// ==========================================
// WiFi Credentials as specified
const char* ssid     = "ESP8266";
const char* password = "12345678";

// RENDER / SERVER URL:
// Leave blank initially as requested.
// Once deployed on Render, paste your live URL here:
// Example: "https://simple-smoke-detector.onrender.com"
String serverUrl = ""; 
```

### 👉 Instructions to Add Your Render URL:
1. Copy your deployed Render URL (e.g. `https://simple-smoke-detector.onrender.com`).
2. Paste it inside the quotation marks:
   ```cpp
   String serverUrl = "https://simple-smoke-detector.onrender.com";
   ```
3. Open the `.ino` file in the **Arduino IDE**.
4. Select board: **NodeMCU 1.0 (ESP-12E Module)**.
5. Select the COM Port of your ESP8266.
6. Click **Upload** (Arrow icon).

Once uploaded, your NodeMCU ESP8266 will connect to your WiFi and communicate seamlessly with your Render-deployed web application every 10 seconds!

---

## 👨‍💻 Credits & Attribution

- **Project Name**: Simple Smoke Detector
- **Organization / Team**: **ONE PIECE**
- **Department**: Department of Electronics & Telecommunication Engineering (ETC), SB Jain Institute of Technology, Management and Research, Nagpur
