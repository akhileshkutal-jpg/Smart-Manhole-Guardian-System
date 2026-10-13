/*
 * =========================================================================================
 * Smart Manhole Guardian System - Arduino Uno Firmware
 * =========================================================================================
 * Project: IoT-based Real-Time Manhole Hazard Monitoring for Sanitation Worker Safety
 * Target Board: Arduino Uno R3 / Nano (ATmega328P)
 * 
 * Hardware Connections:
 *  - MQ-135 Gas Sensor:        Analog Pin A0 (VCC -> 5V, GND -> GND, AOUT -> A0)
 *  - HC-SR04 Ultrasonic Trig:  Digital Pin 9
 *  - HC-SR04 Ultrasonic Echo:  Digital Pin 10
 *  - Reed / Limit Switch:      Digital Pin 2 (Internal Pullup: Pin 2 -> Switch -> GND)
 *  - Green LED (SAFE):         Digital Pin 5 (Through 220 Ohm resistor)
 *  - Yellow LED (WARNING):     Digital Pin 6 (Through 220 Ohm resistor)
 *  - Red LED (DANGER):         Digital Pin 7 (Through 220 Ohm resistor)
 *  - Active Piezo Buzzer:      Digital Pin 8
 * 
 * Data Output:
 *  - Serial UART at 9600 baud, transmitting JSON telemetry every 1.5 seconds.
 * =========================================================================================
 */

// ==========================================
// 1. CONFIGURABLE THRESHOLDS & SETTINGS
// (Customize these values for your specific chamber dimensions & viva demo)
// ==========================================
const char* DEVICE_ID       = "MH-101";
const char* LOCATION_NAME   = "Connaught Place Sector 1";
const float LATITUDE        = 28.6328;
const float LONGITUDE       = 77.2197;

// Depth of the manhole chamber in centimeters (from top sensor down to floor)
const int CHAMBER_DEPTH_CM  = 100;

// Toxic Gas Thresholds (Analog Raw ADC or calibrated ppm reference)
const int GAS_WARNING_THRESHOLD = 300;   // Above this: Yellow LED, intermittent beep
const int GAS_DANGER_THRESHOLD  = 550;   // Above this: Red LED, continuous alarm

// Water Level Thresholds (Water height in centimeters inside chamber)
const int WATER_WARNING_THRESHOLD = 50;  // Rising sewer water (50 cm)
const int WATER_DANGER_THRESHOLD  = 80;  // Critical overflow hazard (80 cm)

// Sampling Interval
const unsigned long SAMPLE_INTERVAL_MS = 1500; // 1.5 seconds

// ==========================================
// 2. PIN DEFINITIONS
// ==========================================
const int PIN_GAS_ANALOG    = A0;  // MQ-135 Gas Sensor
const int PIN_TRIG          = 9;   // Ultrasonic Trigger
const int PIN_ECHO          = 10;  // Ultrasonic Echo
const int PIN_LID_SWITCH    = 2;   // Reed switch / Tamper limit switch
const int PIN_LED_GREEN     = 5;   // Safe indicator
const int PIN_LED_YELLOW    = 6;   // Warning indicator
const int PIN_LED_RED       = 7   // Danger indicator
const int PIN_BUZZER        = 8;   // Piezo Buzzer alarm

// Global timing variables
unsigned long lastSampleTime = 0;
unsigned long lastBeepToggleTime = 0;
bool beepState = false;

void setup() {
  // Initialize Serial interface
  Serial.begin(9600);
  while (!Serial) { ; } // Wait for serial port to connect

  // Pin modes
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LID_SWITCH, INPUT_PULLUP); // LOW when lid closed (magnet nearby), HIGH when open

  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  // Initial power-on self test (flash each LED & short beep)
  digitalWrite(PIN_LED_GREEN, HIGH);
  digitalWrite(PIN_LED_YELLOW, HIGH);
  digitalWrite(PIN_LED_RED, HIGH);
  digitalWrite(PIN_BUZZER, HIGH);
  delay(200);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_BUZZER, LOW);
  delay(300);
}

void loop() {
  unsigned long currentMillis = millis();

  // Non-blocking sampling interval
  if (currentMillis - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = currentMillis;

    // 1. Read Gas Sensor (MQ-135)
    // MQ-135 gives analog ADC 0-1023. Mapping approximation for demonstration:
    int rawGas = analogRead(PIN_GAS_ANALOG);
    // Linear approximation for PPM estimation in demonstration
    int gasPpm = map(rawGas, 0, 1023, 50, 950);

    // 2. Read Water Level using Ultrasonic Sensor (HC-SR04)
    // Measure distance from sensor to water surface
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);

    long duration = pulseIn(PIN_ECHO, HIGH, 30000); // 30ms timeout (~5 meters max)
    int distanceToSurfaceCm = 0;

    if (duration == 0) {
      // Echo timeout or sensor disconnected; assume sensor distance = CHAMBER_DEPTH_CM
      distanceToSurfaceCm = CHAMBER_DEPTH_CM;
    } else {
      // Speed of sound = 343 m/s = 0.0343 cm/microsecond. Round trip / 2
      distanceToSurfaceCm = duration * 0.034 / 2;
    }

    // Water level height = Total depth - distance to surface
    int waterLevelCm = CHAMBER_DEPTH_CM - distanceToSurfaceCm;
    if (waterLevelCm < 0) waterLevelCm = 0;
    if (waterLevelCm > CHAMBER_DEPTH_CM) waterLevelCm = CHAMBER_DEPTH_CM;

    // 3. Read Lid Tamper Switch
    // With INPUT_PULLUP and a normally-closed reed switch (or switch to GND):
    // HIGH = Circuit opened / Lid removed
    // LOW = Magnet present / Lid closed securely
    bool lidOpen = (digitalRead(PIN_LID_SWITCH) == HIGH);

    // 4. Determine Alert State
    const char* status = "SAFE";
    if (lidOpen || gasPpm >= GAS_DANGER_THRESHOLD || waterLevelCm >= WATER_DANGER_THRESHOLD) {
      status = "DANGER";
    } else if (gasPpm >= GAS_WARNING_THRESHOLD || waterLevelCm >= WATER_WARNING_THRESHOLD) {
      status = "WARNING";
    } else {
      status = "SAFE";
    }

    // 5. Update Local Actuators (LEDs and Buzzer)
    updateLocalAlarms(status, currentMillis);

    // 6. Transmit Telemetry over Serial as JSON
    sendJsonTelemetry(gasPpm, waterLevelCm, lidOpen, status);
  }

  // Handle intermittent warning buzzer pattern asynchronously
  handleWarningBeep(currentMillis);
}

/**
 * Updates local alarm indicators based on computed safety status
 */
void updateLocalAlarms(const char* status, unsigned long currentMillis) {
  if (strcmp(status, "DANGER") == 0) {
    // Critical hazard: Red LED ON, Continuous Buzzer
    digitalWrite(PIN_LED_RED, HIGH);
    digitalWrite(PIN_LED_YELLOW, LOW);
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_BUZZER, HIGH);
  } else if (strcmp(status, "WARNING") == 0) {
    // Warning: Yellow LED ON, Green/Red OFF, Buzzer pulsed
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_LED_YELLOW, HIGH);
    digitalWrite(PIN_LED_GREEN, LOW);
    // Buzzer is pulsed in handleWarningBeep()
  } else {
    // Safe: Green LED ON, Yellow/Red OFF, Buzzer OFF
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_LED_YELLOW, LOW);
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_BUZZER, LOW);
  }
}

/**
 * Handles intermittent pulsing beep for WARNING status (250ms ON, 750ms OFF)
 */
void handleWarningBeep(unsigned long currentMillis) {
  // Check if yellow LED is active (WARNING status)
  if (digitalRead(PIN_LED_YELLOW) == HIGH && digitalRead(PIN_LED_RED) == LOW) {
    if (beepState && (currentMillis - lastBeepToggleTime >= 200)) {
      beepState = false;
      lastBeepToggleTime = currentMillis;
      digitalWrite(PIN_BUZZER, LOW);
    } else if (!beepState && (currentMillis - lastBeepToggleTime >= 800)) {
      beepState = true;
      lastBeepToggleTime = currentMillis;
      digitalWrite(PIN_BUZZER, HIGH);
    }
  }
}

/**
 * Serial JSON serialization
 * Transmits structured JSON packet directly over UART
 */
void sendJsonTelemetry(int gas, int water, bool lidOpen, const char* status) {
  Serial.print("{\"deviceId\":\"");
  Serial.print(DEVICE_ID);
  Serial.print("\",\"name\":\"");
  Serial.print(LOCATION_NAME);
  Serial.print("\",\"lat\":");
  Serial.print(LATITUDE, 4);
  Serial.print(",\"lng\":");
  Serial.print(LONGITUDE, 4);
  Serial.print(",\"gas\":");
  Serial.print(gas);
  Serial.print(",\"water\":");
  Serial.print(water);
  Serial.print(",\"lidOpen\":");
  Serial.print(lidOpen ? "true" : "false");
  Serial.print(",\"status\":\"");
  Serial.print(status);
  Serial.println("\"}");
}
