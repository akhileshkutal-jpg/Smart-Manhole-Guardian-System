# ⏱️ 5-Minute Faculty Viva & Demo Presentation Script

Follow this structured presentation script to demonstrate the entire project to academic faculty and external examiners within 5 minutes.

---

## 🕒 Minute-by-Minute Presentation Script

### Minute 1: The Problem Statement & Geographical Overview (0:00 – 1:00)
* **What to Say**:
  > *"Good morning respected professors. Every year, thousands of municipal sanitation workers face life-threatening asphyxiation, toxic poisoning, and explosive hazards inside underground sewers due to undetected toxic gases (such as hydrogen sulfide and methane), flash flooding, and missing manhole covers.
  > To solve this, we engineered the **Smart Manhole Guardian System**—an end-to-end IoT safety telemetry solution that combines edge sensing, local acoustic alarms, and a centralized GIS municipal dashboard."*
* **What to Show on Screen**:
  - Show the dark-theme dashboard at `http://localhost:3000`.
  - Point out the **Geographical Sensor Network** on the Leaflet map showing the 5 municipal manholes across Delhi's Connaught Place sector.
  - Point out the **Severity Sorted Sidebar** on the left and the **Header Statistics Pills**.

---

### Minute 2: Chamber Diagnostics & Safety Thresholds (1:00 – 2:00)
* **What to Say**:
  > *"Each manhole node features three primary edge sensors:
  > 1. An **MQ-135** electrochemical sensor detecting dangerous gas concentrations in parts-per-million.
  > 2. An **HC-SR04** ultrasonic sensor measuring chamber water level in centimeters from the ceiling.
  > 3. A **Magnetic Reed Switch** detecting unauthorized lid removal or cover theft.
  > 
  > Our edge firmware implements a three-tier safety state machine:
  > • **SAFE**: Gas $< 300\text{ ppm}$, Water $< 50\text{ cm}$ (Green LED active).
  > • **WARNING**: Gas $300\text{--}550\text{ ppm}$ or Water $50\text{--}80\text{ cm}$ (Yellow LED with intermittent warning pulse).
  > • **DANGER**: Gas $> 550\text{ ppm}$, Water $> 80\text{ cm}$, or Lid Tampered (Red LED with continuous 85dB siren)."*
* **What to Show on Screen**:
  - Click any node on the sidebar (e.g. `MH-101`).
  - Show the **Diagnostics Panel**: Gas metric card, Water level card, and Lid switch indicator.
  - Show the **Real-Time Telemetry Trend Chart** dynamically updating every 2 seconds via WebSockets.

---

### Minute 3: Incident Trigger, GIS Pulsing & Telegram Alert (2:00 – 3:00)
* **What to Say**:
  > *"Now watch what happens when a critical hazard occurs. In our simulation engine, node MH-104 experiences an acute toxic methane surge."*
* **What to Show on Screen**:
  - Point to the map: Node `MH-104` changes to a **pulsing red marker with radiating radar rings**.
  - In the sidebar, `MH-104` instantly jumps to the **very top** because the list is auto-sorted by severity.
  - The top **Global Hazard Banner** flashes across the screen.
  - Point out the browser **Audible Siren** beeping (Web Audio API).
  - Open terminal window to show the **Telegram Alert** dispatched to municipal authorities with full telemetry (or show real Telegram message on phone if configured).

---

### Minute 4: Supervisor Action & Audit Compliance (3:00 – 4:00)
* **What to Say**:
  > *"Safety isn't just detection; it's operational response. Our dashboard includes a supervisory workflow to track rescue dispatches and avoid duplicate responses."*
* **What to Show on Screen**:
  - Scroll to the **Safety Incident & Alert Log** table at the bottom.
  - Click the **🔔 Acknowledge / Dispatch** button on the active hazard row.
  - In the modal dialog, show the action note: *"Worker team notified; exhaust blower dispatched."*
  - Click **Confirm & Acknowledge**: show how the row updates in real time to `✅ Acknowledged` with timestamp.
  - Click the **📥 Export CSV** button: open the downloaded CSV file in Excel/Notepad to show full compliance records with coordinates, timestamps, and resolution notes.

---

### Minute 5: Device Offline Watchdog & Hardware Architecture (4:00 – 5:00)
* **What to Say**:
  > *"In municipal sewer systems, environmental moisture or battery exhaustion can cause sensor nodes to drop offline. If a sensor stops transmitting, that is itself a potential blind spot."*
* **What to Show on Screen**:
  - Point out node `MH-105`: after 30 seconds of missing telemetry, the system watchdog automatically flags it as **OFFLINE (Grey pin)** on both the map and sidebar.
  - Conclude by showing the hardware schematic in `docs/circuit_diagram.md` explaining how the Arduino Uno interfaces with the ESP8266 Wi-Fi client over UART or USB serial bridge.
* **Closing Line**:
  > *"The Smart Manhole Guardian System provides a low-cost, high-reliability safety net for our sanitation workforce. We are ready for any questions."*
