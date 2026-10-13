# 🛡️ Smart Manhole Guardian System

> **IoT-based Real-Time Toxic Gas, Flood, and Chamber Tamper Monitoring for Sanitation Worker Safety and Smart City Infrastructure**

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Arduino](https://img.shields.io/badge/Arduino-Uno%20R3-00979D.svg)](https://www.arduino.cc/)
[![ESP8266](https://img.shields.io/badge/Wi--Fi-ESP8266%20%2F%20ESP32-red.svg)](https://espressif.com/)
[![Leaflet](https://img.shields.io/badge/GIS-Leaflet.js-199900.svg)](https://leafletjs.com/)
[![Socket.IO](https://img.shields.io/badge/Real--Time-Socket.IO-black.svg)](https://socket.io/)
[![Telegram](https://img.shields.io/badge/Alerts-Telegram%20Bot%20API-0088cc.svg)](https://core.telegram.org/bots/api)

---

## 📖 Project Overview

Manual scavenging and sewer chamber maintenance remain among the most hazardous municipal operations in the world. Sanitation workers routinely encounter toxic gas asphyxiation (from Hydrogen Sulfide $H_2S$, Methane $CH_4$, Ammonia $NH_3$), sudden flash flood influxes during monsoons, and open manhole accidents caused by theft or displacement of heavy cast-iron covers.

The **Smart Manhole Guardian System** is a complete, production-grade college IoT solution that solves this crisis through a three-layer architecture:
1. **Edge Sensing & Local Alarms**: An **Arduino Uno** continuously reads an **MQ-135** toxic gas sensor, an **HC-SR04** ultrasonic water level sensor, and a **Magnetic Reed Switch** lid tamper sensor. It drives local visual (Tri-color LEDs) and acoustic (85 dB buzzer) alarms directly at the manhole mouth to warn workers before entry.
2. **IoT Telemetry Transmission**: Data is formatted as JSON and dispatched over Wi-Fi via an **ESP8266 NodeMCU** (or USB Serial Bridge) to a centralized Node.js/Express server.
3. **Centralized GIS Command Dashboard & Telegram Dispatch**: A modern dark-theme web dashboard displays real-time telemetry on an interactive **Leaflet.js map**, live **Chart.js graphs**, automated **Telegram emergency alerts**, supervisor **incident acknowledgement**, and **CSV audit export**.

---

## ✨ Key Features

* **Multi-Node GIS Map**: Real-time Leaflet.js map with OpenStreetMap tiles displaying multiple manholes with custom status pins (**Green** = Safe, **Yellow** = Warning, **Pulsing Red** = Danger, **Grey** = Offline).
* **Tri-Tier Safety State Machine**:
  * 🟢 **SAFE**: Gas $< 300\text{ ppm}$, Water $< 50\text{ cm}$, Lid Closed $\rightarrow$ Green LED ON.
  * 🟡 **WARNING**: Gas $300\text{--}550\text{ ppm}$ or Water $50\text{--}80\text{ cm}$ $\rightarrow$ Yellow LED + Intermittent Beep (200ms ON / 800ms OFF).
  * 🔴 **DANGER**: Gas $> 550\text{ ppm}$, Water $> 80\text{ cm}$, or Lid Tampered $\rightarrow$ Red LED + Continuous 85 dB Siren.
* **Instant Telegram Emergency Alerts**: Native HTTPS integration with the Telegram Bot API sending instant formatted notifications to municipal groups. Features a 60-second cooldown to prevent chat spam and sends recovery ("All Clear") notifications when safe.
* **Zero-Hardware Simulation Engine**: Run `npm run simulate` to emulate 5 municipal manhole nodes with realistic gas fluctuations, monsoon flooding, lid tampering, recovery cycles, and network dropout timeouts.
* **Device Offline Watchdog**: Background timer marks any node as `OFFLINE` if no telemetry arrives for $\ge 30$ seconds.
* **Supervisor Action Log & Acknowledgement**: Allows supervisors to mark active alerts as *"Worker notified / Action dispatched"* with custom notes and timestamps.
* **Audit Compliance Export**: Download one-click `.csv` reports of all logged incidents with full telemetry snapshots.
* **Synthesized Browser Siren**: Built-in Web Audio API alarm sound that triggers in the browser during DANGER status without external audio files.

---

## 🗂️ Project Repository Structure

```
manhole-guardian-system-main/
├── .env.example                       # Telegram credentials & environment template
├── .gitignore                         # Git exclusion rules
├── package.json                       # Scripts: npm start, npm run simulate
├── README.md                          # Project documentation and guide
│
├── backend/                           # Node.js + Express + Socket.IO Server
│   ├── server.js                      # Main HTTP server and static file hosting
│   ├── store.js                       # In-memory telemetry repository, history & watchdog
│   ├── telegram.js                    # Direct HTTPS Telegram Bot service with mock fallback
│   ├── simulator.js                   # 5-node city simulation engine
│   └── routes/
│       └── api.js                     # REST endpoints (/api/data, /api/devices, /api/alerts, etc.)
│
├── dashboard/                         # Modern Dark-Themed Web Dashboard
│   ├── index.html                     # Responsive glassmorphism dashboard UI
│   ├── css/
│   │   └── style.css                  # Custom styling, dark theme, and pulsing animations
│   └── js/
│       ├── app.js                     # Socket.IO client, Chart.js trends, audio alarm, ack workflow
│       └── map.js                     # Leaflet.js interactive map engine and custom SVG pins
│
├── firmware/                          # Microcontroller Source Code
│   ├── arduino_manhole_guardian/
│   │   └── arduino_manhole_guardian.ino   # Arduino Uno sensor acquisition & local alarm logic
│   ├── esp8266_manhole_guardian/
│   │   ├── esp8266_manhole_guardian.ino   # NodeMCU ESP8266 / ESP32 Wi-Fi HTTP POST client
│   │   └── config.h                       # Wi-Fi SSID, Password, and Server IP config
│   └── serial_bridge/
│       ├── package.json               # Serial bridge dependencies
│       └── serial_bridge.js           # USB Serial COM port forwarder for laptop demo
│
└── docs/                              # College Viva & Technical Documentation
    ├── circuit_diagram.md             # Pin connection table and Mermaid/ASCII schematics
    ├── architecture.md                # System architecture and data pipeline
    ├── bill_of_materials.md           # Component list with INR pricing (~₹1,600 total)
    ├── setup_and_demo.md              # Step-by-step running instructions
    ├── testing_checklist.md           # How to trigger each alert in front of examiners
    ├── telegram_setup.md              # BotFather and chat ID configuration guide
    └── viva_demo_script.md            # 5-Minute Faculty Presentation Script
```

---

## 🚀 Quick Start (Running in 60 Seconds)

### 1. Software Simulation Demo (No hardware needed)

```powershell
# 1. Install dependencies
npm install

# 2. Start backend server with 5-manhole simulation
npm run simulate
```
*(On Windows systems with PowerShell script restrictions, use `npm.cmd install`)*

Open your browser and navigate to:
```
http://localhost:3000
```
* **Dashboard Features**:
  * 5 manhole markers populate the Leaflet map around central Delhi (Connaught Place).
  * Watch telemetry trends update in real time every 2 seconds.
  * Every 24 seconds, an incident is triggered (Gas spike, Flood, or Lid Tamper).
  * Observe the pulsing red pin, top hazard banner, and terminal Telegram alert!

---

### 2. Physical Hardware Demo (Arduino Uno + USB Cable)

If you have real sensors wired to an Arduino Uno:

1. Upload `firmware/arduino_manhole_guardian/arduino_manhole_guardian.ino` to your Arduino Uno via the Arduino IDE.
2. Start the web server:
   ```powershell
   npm start
   ```
3. In a separate terminal, launch the USB serial bridge:
   ```powershell
   node firmware/serial_bridge/serial_bridge.js
   ```
4. Open `http://localhost:3000` to monitor live physical sensor data!

---

### 3. Full IoT Wi-Fi Demo (Arduino Uno + ESP8266)

1. Open `firmware/esp8266_manhole_guardian/config.h` and enter your Wi-Fi credentials and your laptop's IP address (`http://<YOUR_IP>:3000/api/data`).
2. Upload `firmware/esp8266_manhole_guardian/esp8266_manhole_guardian.ino` to the NodeMCU ESP8266.
3. Connect Arduino TX to ESP8266 RX (Pin D7) and connect **GND to GND**.
4. Start the server (`npm start`) and observe incoming HTTP POST requests.

---

### 4. Deploy Live to Vercel (Public Website)

Want a permanent live URL to share with professors and examiners?
```powershell
# Deploy with Vercel CLI
npx vercel
```
Or import your GitHub repository into [Vercel.com](https://vercel.com).
The repository includes `vercel.json` and a built-in **Live Cloud Mode** so the full interactive Leaflet map, telemetry graphs, and incident alerts work immediately online!
See detailed instructions in [`docs/vercel_deployment.md`](docs/vercel_deployment.md).

---

## 📡 REST API Reference

| Endpoint | Method | Description | Sample Payload / Parameters |
| :--- | :---: | :--- | :--- |
| `/api/data` | `POST` | Ingest sensor telemetry | `{"deviceId":"MH-101","gas":620,"water":25,"lidOpen":false}` |
| `/api/devices` | `GET` | List all manholes sorted by severity | Returns array of devices with live status |
| `/api/devices/:id` | `GET` | Get diagnostic details for one manhole | Returns single device object |
| `/api/history` | `GET` | Recent telemetry readings | `?deviceId=MH-101&limit=50` |
| `/api/alerts` | `GET` | Historical alert incident log | Returns array of all recorded hazard events |
| `/api/alerts/:id/ack` | `POST` | Supervisor alert acknowledgement | `{"note":"Worker notified with ventilation blower"}` |
| `/api/alerts/export` | `GET` | Download full alert log as CSV | Returns downloadable `.csv` file attachment |
| `/api/config` | `GET` | Server metadata & thresholds | Returns system settings & Telegram mode |

---

## 🤖 Telegram Bot Configuration

1. Chat with `@BotFather` on Telegram and create a bot with `/newbot`. Copy the API token.
2. Find your Chat ID by messaging your bot and opening `https://api.telegram.org/bot<TOKEN>/getUpdates`.
3. Create a `.env` file in the project root:
   ```env
   PORT=3000
   TELEGRAM_BOT_TOKEN=your_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   ALERT_COOLDOWN_SECONDS=60
   ```
4. Restart the server. If no token is provided, the system automatically uses **MOCK MODE**, logging formatted alerts to the server console.

See [`docs/telegram_setup.md`](docs/telegram_setup.md) for full instructions.

---

## 🎓 Viva Questions & Answers for Students

* **Q1: Which gases does the MQ-135 detect in sewers?**
  * *A*: The MQ-135 is sensitive to Ammonia ($NH_3$), Nitrogen Oxides ($NO_x$), Alcohol, Benzene, Smoke, and Carbon Dioxide ($CO_2$). For dedicated sewage monitoring, MQ-4 (Methane $CH_4$) and MQ-136 (Hydrogen Sulfide $H_2S$) are also used.
* **Q2: Why use an ultrasonic sensor for water level instead of a float switch?**
  * *A*: Float switches and submerged conductive probes rapidly clog and corrode in sewage slurry. The HC-SR04 ultrasonic sensor provides non-contact distance measurement from the chamber ceiling.
* **Q3: What communication protocols are used?**
  * *A*: **UART Serial** (9600 baud) between Arduino Uno and ESP8266; **HTTP REST (JSON)** over Wi-Fi between ESP8266 and Express backend; **WebSockets (Socket.IO)** for real-time sub-second browser updates; and **HTTPS REST** to the Telegram Bot API.
* **Q4: How does offline detection work?**
  * *A*: The backend runs a periodic watchdog every 5 seconds. If any node's `lastSeen` timestamp exceeds 30 seconds, it is marked `OFFLINE`, and a status event updates the map pin to grey.

---

## 📄 License
This project is open-source under the MIT License. Developed for university IoT and embedded systems engineering curriculum.
