# 🚀 Setup and Demo Guide

This guide walks you through running the **Smart Manhole Guardian System** in both **Simulation Mode** (instant demo with zero hardware required) and **Physical Hardware Mode** (with Arduino Uno & ESP8266 or USB Serial).

---

## ⚡ Option 1: Instant Simulation Mode (Zero Hardware)

Simulation mode emulates **5 geographically distributed smart manhole nodes** across a city sector with real-time incidents (gas surges, monsoon flooding, lid tampering, offline timeouts).

### Step 1: Install Dependencies
Open PowerShell or your terminal in the project directory:
```powershell
npm install
```
*(On Windows systems with execution policy restrictions, use `npm.cmd install`)*

### Step 2: Configure Environment (Optional)
Copy the template configuration:
```powershell
cp .env.example .env
```
*(If you leave `.env` as default or don't set a Telegram token, the backend runs in **Mock Telegram Mode**, logging formatted alerts directly into your terminal!)*

### Step 3: Launch Server & Simulation
Run the simulation script:
```powershell
npm run simulate
```

### Step 4: Open Dashboard
Open your browser and navigate to:
```
http://localhost:3000
```
* Observe the 5 manhole markers on the interactive Leaflet map.
* Watch real-time gas and water telemetry charts update every 2 seconds.
* When a hazard occurs, witness the **pulsing red marker**, **browser siren**, **alert log entry**, and **Telegram console alert**!

---

## 🔌 Option 2: Physical Hardware Mode (USB Serial Bridge)

This option is the fastest way to demo real hardware without configuring Wi-Fi router credentials.

1. **Upload Arduino Firmware**:
   - Open Arduino IDE.
   - Open `firmware/arduino_manhole_guardian/arduino_manhole_guardian.ino`.
   - Select Board: **Arduino Uno**, select your COM port, and click **Upload**.
2. **Wire Sensors & Actuators**:
   - Follow the wiring diagram in `docs/circuit_diagram.md`.
3. **Start the Web Server**:
   ```powershell
   npm start
   ```
4. **Launch the Serial Bridge**:
   In a second terminal window:
   ```powershell
   node firmware/serial_bridge/serial_bridge.js
   ```
   *(The bridge autodetects your Arduino's COM port, reads the JSON packets, and forwards them to `http://localhost:3000/api/data`)*
5. **View Dashboard**: Open `http://localhost:3000`.

---

## 📡 Option 3: Full IoT Mode with ESP8266 Wi-Fi

1. **Wire Arduino to ESP8266**:
   - Connect Arduino Pin 1 (TX) to ESP8266 Pin D7 (GPIO 13).
   - Connect Arduino GND to ESP8266 GND (**MANDATORY**).
2. **Configure Wi-Fi Credentials**:
   - Open `firmware/esp8266_manhole_guardian/config.h`.
   - Set `WIFI_SSID` and `WIFI_PASSWORD`.
   - Set `SERVER_API_URL` to your laptop's local IPv4 address, e.g.:
     `http://192.168.1.45:3000/api/data`
3. **Upload ESP Firmware**:
   - In Arduino IDE, select Board: **NodeMCU 1.0 (ESP-12E Module)**.
   - Open and upload `firmware/esp8266_manhole_guardian/esp8266_manhole_guardian.ino`.
4. **Start Backend**:
   ```powershell
   npm start
   ```
5. **Monitor System**:
   - Open Serial Monitor on ESP8266 at 115200 baud to confirm Wi-Fi connection and HTTP 200 POST responses.
   - Monitor the live dashboard at `http://localhost:3000`.
