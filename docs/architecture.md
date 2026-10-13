# 🏗️ System Architecture & Dataflow

The **Smart Manhole Guardian System** is structured as an end-to-end multi-tier IoT and telemetry platform designed for municipal utility safety and sanitation worker protection.

---

## 📐 High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph PhysicalNode["IoT Field Node (Chamber Level)"]
        Sensors["Sensors: MQ-135 Gas | HC-SR04 Water | Reed Switch Lid"]
        MCU["Arduino Uno Microcontroller\n(Edge Logic & Threshold Evaluation)"]
        Actuators["Local Alarms:\nTri-Color LEDs & 85dB Piezo Buzzer"]
        Comm["ESP8266 NodeMCU Wi-Fi\n(or USB Serial Bridge)"]
        
        Sensors -->|Analog / Digital| MCU
        MCU -->|Direct Drive| Actuators
        MCU -->|JSON over UART 9600 Baud| Comm
    end

    subgraph Network["Transit Layer"]
        HTTPPost["HTTP POST /api/data\n(JSON Telemetry Payload)"]
        Comm --> HTTPPost
    end

    subgraph Backend["Centralized Backend Layer (Node.js & Express)"]
        REST["REST API Engine (/api/data, /api/devices, /api/alerts)"]
        Store["In-Memory Telemetry Store & Offline Watchdog (>30s)"]
        SocketServer["Socket.IO WebSocket Server (Bi-directional Broadcast)"]
        TelegramEngine["Telegram Bot Notification Engine (HTTPS API)"]

        HTTPPost --> REST
        REST --> Store
        Store -->|State Change Event| SocketServer
        Store -->|Hazard Trigger Event| TelegramEngine
    end

    subgraph Presentation["User & Supervisory Layer"]
        Dashboard["Web Dashboard (Dark Theme Glassmorphism UI)"]
        LeafletMap["Leaflet GIS Map (OpenStreetMap Tiles & Pulsing Pins)"]
        ChartJS["Chart.js Real-Time Telemetry Trends"]
        SupervisorActions["Alert Acknowledgment & CSV Audit Export"]
        TelegramApp["Telegram Mobile App\n(Sanitation Worker Dispatch Channel)"]

        SocketServer -->|Live WebSocket Events| Dashboard
        Dashboard --- LeafletMap
        Dashboard --- ChartJS
        Dashboard --- SupervisorActions
        TelegramEngine -->|Instant Alert Message| TelegramApp
    end
```

---

## 🔄 End-to-End Data Lifecycle

### 1. Edge Sampling & Assessment
* **Cycle**: Every 1.5 seconds, the Arduino Uno samples the MQ-135 gas sensor (analog A0), computes distance via HC-SR04 ultrasonic echo (digital D9/D10), and inspects the reed switch (digital D2).
* **Local State Machine**:
  * **SAFE**: Green LED ON. Buzzer OFF.
  * **WARNING**: Yellow LED ON. Intermittent beep pattern (200ms ON / 800ms OFF).
  * **DANGER**: Red LED ON. Continuous piercing buzzer (85 dB).

### 2. Telemetry Serialization
* The Uno serializes telemetry into a JSON payload:
  ```json
  {
    "deviceId": "MH-101",
    "name": "Connaught Place Sector 1",
    "lat": 28.6328,
    "lng": 77.2197,
    "gas": 620,
    "water": 45,
    "lidOpen": false,
    "status": "DANGER"
  }
  ```

### 3. Ingestion & Storage Pipeline
* The ESP8266 transmits an `HTTP POST` request to `/api/data`.
* The Express server parses the telemetry and stores it in the `DataStore`:
  * Updates current status for device `MH-101`.
  * Appends reading to the rolling 100-sample telemetry buffer.
  * Checks if device transitioned into `WARNING` or `DANGER`. If so, creates a new alert record.

### 4. Real-Time Push & GIS Map Integration
* The server broadcasts events across active Socket.IO connections:
  * `sensor_update`: Delivered to all dashboard instances within milliseconds.
  * `device_list_update`: Re-sorts the device sidebar by severity.
  * `new_alert`: Triggers browser audio siren and red alert banner.
* Leaflet.js updates the marker on the map:
  * **Green pin**: Safe
  * **Yellow pin**: Warning
  * **Red pulsing pin**: Danger with radiating radar wave animation
  * **Grey pin**: Offline

### 5. Automated Telegram Emergency Alerts
* The `TelegramService` dispatches an instant formatted alert to the designated Telegram group or supervisor chat.
* **Cooldown Mechanism**: A 60-second cooldown per node prevents alert flooding while allowing severity escalations to break through immediately.
* **Recovery Message**: When conditions normalize back to SAFE, a confirmation message is automatically dispatched.

### 6. Offline Device Watchdog
* Every 5 seconds, the backend inspects all registered manholes.
* If any node fails to transmit for $\ge 30$ seconds, it is marked `OFFLINE`.
* The dashboard marks the node grey in both the sidebar and map.
