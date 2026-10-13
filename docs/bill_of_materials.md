# 📦 Bill of Materials (BOM) & Cost Estimation

This Bill of Materials lists all hardware components required to construct one physical prototype node of the **Smart Manhole Guardian System**. Prices reflect typical local Indian electronics markets (e.g., Nehru Place / Lamington Road / SP Road) and online hobbyist retailers (Robocraze, Robu.in, Amazon India).

---

## 🛒 Hardware Components Table

| Item No. | Component Name | Model / Specification | Qty | Approx Cost (INR) | Primary Purpose / Role |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | Main Microcontroller | **Arduino Uno R3** (ATmega328P DIP / SMD) with USB Cable | 1 | ₹450 | Edge controller, sensor sampling, and local alarm logic |
| **2** | Toxic Gas Sensor | **MQ-135** (Air Quality / Ammonia / Sulfide / Benzene / Smoke) | 1 | ₹150 | Detects hazardous sewer gases (H2S, Methane, NH3) |
| **3** | Water Level Sensor | **HC-SR04** Ultrasonic Distance Sensor (2cm–400cm range) | 1 | ₹110 | Non-contact water level measurement inside chamber |
| **4** | Chamber Lid Switch | **Magnetic Reed Switch** with Neodymium Magnet (or Limit Switch) | 1 | ₹60 | Detects unauthorized lid opening / theft / displacement |
| **5** | Wi-Fi Gateway | **NodeMCU ESP8266** (CP2102 or CH340 USB chip) | 1 | ₹280 | Wi-Fi client forwarding telemetry via HTTP POST |
| **6** | Audible Alarm | **Active 5V Piezo Buzzer** (Continuous tone, 85 dB) | 1 | ₹30 | On-site audible warning for approaching workers |
| **7** | Visual LED Indicators | 5mm Diffused LEDs (1x Red, 1x Yellow, 1x Green) | 3 | ₹15 | Tri-color safety level indicator on chamber exterior |
| **8** | Current Limiting Resistors | 220 $\Omega$, 1/4W Metal Film Resistors | 3 | ₹5 | Prevents LED burnout |
| **9** | Prototyping Board | 830-point Solderless Breadboard (or Perfboard) | 1 | ₹120 | Circuit assembly and component interconnection |
| **10** | Connecting Wires | Premium Dupont Jumper Wires (M-M, M-F, F-F) | 30 | ₹80 | Breadboard and sensor module interconnects |
| **11** | Power Supply | 5V 2A DC USB Power Adapter / 9V Battery with DC Jack | 1 | ₹180 | Powers Arduino Uno and sensor load |
| **12** | Chamber Enclosure Model | Clear Acrylic / Plastic Box or PVC Pipe fitting | 1 | ₹120 | Scale model representation of manhole chamber |
| **TOTAL** | **Complete Hardware Prototype (1 Field Node)** | | | **₹1,600** | (~$19 USD) |

---

## 💡 Low-Cost Alternatives & Scaling
* **Single-Chip Solution**: For even lower bill of materials, the entire edge controller and Wi-Fi stack can be consolidated directly onto an **ESP32 Dev Module** (₹380 total), eliminating the Arduino Uno and bringing total cost down to **₹1,100 per unit**.
* **Serial Fallback Mode (₹0 Wi-Fi Cost)**: In college labs without an active Wi-Fi router, the included Node.js USB serial bridge allows running the hardware using just the Arduino Uno plugged into a laptop over USB, saving ₹280 on the ESP8266.
