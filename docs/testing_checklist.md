# 🧪 Viva & Demonstration Testing Checklist

Use this checklist during your college laboratory viva or project expo to demonstrate each feature systematically to external examiners.

---

## 📋 Comprehensive Demonstration Checklist

| Hazard Scenario | Physical Trigger Method (Demo Action) | Expected Hardware Response | Expected Dashboard Response | Expected Telegram Bot Action |
| :--- | :--- | :--- | :--- | :--- |
| **1. Normal Baseline (SAFE)** | Chamber lid closed, normal ambient air, water level $<50\text{ cm}$. | • **Green LED ON**<br>• Yellow & Red LEDs OFF<br>• Buzzer silent | • Green marker on Leaflet map<br>• Status badge: **SAFE**<br>• Metric cards show normal values | No alert dispatched (System nominal). |
| **2. Toxic Gas Hazard (DANGER)** | Release a tiny burst of unlit butane gas from a cigarette lighter (or hold an alcohol sanitizer cotton swab 2 cm from MQ-135). | • **Red LED turns ON**<br>• Green LED turns OFF<br>• **Continuous loud buzzer** | • Selected marker pulses red with radar wave<br>• Top critical hazard banner appears<br>• Browser audio siren beeps<br>• Chart gas curve spikes past 550 ppm | Instant Telegram dispatch: 🚨 `CRITICAL MANHOLE HAZARD` with gas level and location. |
| **3. Rising Water Level (WARNING)** | Hold a flat notebook or cup of water $30\text{ cm}$ below the HC-SR04 ultrasonic sensor. | • **Yellow LED turns ON**<br>• Green & Red LEDs OFF<br>• **Intermittent beeping buzzer** (200ms ON / 800ms OFF) | • Marker turns yellow on map<br>• Status badge: **WARNING**<br>• Water level bar turns amber $(>50\text{ cm})$ | Telegram alert: ⚠️ `ATTENTION: ELEVATED RISK` - Rising water level. |
| **4. Chamber Flood Overflow (DANGER)** | Move the object closer to sensor ($<15\text{ cm}$ from sensor, simulating water height $>80\text{ cm}$). | • **Red LED turns ON**<br>• **Continuous piercing buzzer** | • Status badge changes to **DANGER**<br>• Critical hazard banner triggers | Telegram alert: 🚨 `High water flooding`. |
| **5. Chamber Lid Tampering (DANGER)** | Move the magnet away from the magnetic reed switch (simulating lid removal/theft). | • **Red LED turns ON**<br>• **Continuous buzzer** | • Lid status card flashes: **OPEN / TAMPER**<br>• Status turns **DANGER** immediately | Instant Telegram security alert: `Chamber Lid: OPEN / TAMPERED`. |
| **6. Emergency Normalization (Recovery)** | Remove gas source and place magnet back onto reed switch. | • Red/Yellow LEDs turn OFF<br>• **Green LED turns back ON**<br>• Buzzer stops completely | • Dashboard returns to normal<br>• Hazard banner disappears<br>• Siren silences automatically | Telegram recovery dispatch: 🟢 `ALL CLEAR - NORMALCY RESTORED`. |
| **7. Supervisor Acknowledgement** | Click the **🔔 Acknowledge / Dispatch** button on the dashboard alert log. | N/A (Server / UI workflow) | • Modal opens prompting for supervisor action note<br>• Table changes to `✅ Acknowledged` with timestamp | Record stored in database/store for municipal audit. |
| **8. Audit Log CSV Export** | Click the **📥 Export CSV** button on the dashboard header. | N/A | • Browser downloads `.csv` containing full telemetry timestamps, coordinates, severity, and supervisor notes | Verifiable CSV file ready to inspect in MS Excel. |
| **9. Device Offline Watchdog** | Unplug sensor node power (or in simulation mode, wait for simulated node dropout). | Sensor node turns OFF | • After 30 seconds of inactivity, marker turns **GREY**<br>• Status shows **OFFLINE** | Alert log notes connectivity interruption. |

---

## 🎯 Pro Tips for Examiners' Viva Questions
* **Q: Why does the MQ-135 take time to stabilize on startup?**
  * *Answer*: The MQ-135 utilizes an internal tin dioxide ($SnO_2$) heating element that must reach thermal equilibrium (~$150^\circ\text{C}$ to $200^\circ\text{C}$) to accurately measure surface resistance variation in the presence of reducing gases.
* **Q: Why use an ultrasonic sensor instead of a conductive probe for water?**
  * *Answer*: Manhole wastewater is corrosive and contains organic slurries. Mechanical and conductive submerged probes suffer from rapid corrosion, electrode fouling, and short circuits. The HC-SR04 is a non-contact sensor mounted safely on the ceiling of the chamber, providing long operational lifespan.
* **Q: How does the system prevent alert spamming if gas remains high?**
  * *Answer*: We implemented a tokenized cooldown timer (60 seconds) in the backend. If a danger state persists, it won't repeatedly flood worker phones. However, if the status escalates (e.g., from WARNING to DANGER), the cooldown is bypassed immediately.
