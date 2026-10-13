/*
 * =========================================================================================
 * Smart Manhole Guardian System - ESP8266 / NodeMCU Wi-Fi Gateway Firmware
 * =========================================================================================
 * Project: Wi-Fi bridge forwarding JSON sensor packets from Arduino Uno to Express Backend
 * Compatible Boards: ESP8266 NodeMCU, WeMos D1 Mini, or ESP32
 * 
 * Hardware Interfacing with Arduino Uno:
 *  - Arduino TX (Pin 1 or SoftwareSerial) -> ESP8266 RX (Pin D7 / GPIO13 via SoftwareSerial)
 *  - Common Ground: Arduino GND connected directly to ESP8266 GND!
 * 
 * Libraries Required (Standard in ESP Core):
 *  - ESP8266WiFi / WiFi
 *  - ESP8266HTTPClient / HTTPClient
 *  - SoftwareSerial (for receiving Arduino UART without blocking USB debug)
 * =========================================================================================
 */

#include "config.h"

#if defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <ESP8266HTTPClient.h>
  #include <WiFiClient.h>
  #include <SoftwareSerial.h>
  // SoftSerial RX on D7 (GPIO 13), TX on D8 (GPIO 15)
  SoftwareSerial arduinoSerial(13, 15);
#elif defined(ESP32)
  #include <WiFi.h>
  #include <HTTPClient.h>
  // HardwareSerial 2 on ESP32
  HardwareSerial arduinoSerial(2);
#endif

// Built-in LED on NodeMCU (Active LOW on GPIO 2 or GPIO 16)
const int LED_STATUS = 2;

void setup() {
  pinMode(LED_STATUS, OUTPUT);
  digitalWrite(LED_STATUS, HIGH); // Off initially

  // Debug Serial over USB
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n================================================");
  Serial.println("🛡️ Smart Manhole Guardian - ESP8266 Wi-Fi Gateway");
  Serial.println("================================================");

  // Serial interface connected to Arduino Uno
  #if defined(ESP8266)
    arduinoSerial.begin(9600);
  #elif defined(ESP32)
    arduinoSerial.begin(9600, SERIAL_8N1, 16, 17); // RX=16, TX=17
  #endif

  // Connect to Wi-Fi
  connectToWiFi();
}

void loop() {
  // Check Wi-Fi connection health
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ Wi-Fi disconnected. Reconnecting...");
    connectToWiFi();
  }

  // Read incoming JSON string from Arduino
  if (arduinoSerial.available()) {
    String incomingPayload = arduinoSerial.readStringUntil('\n');
    incomingPayload.trim();

    // Check if packet looks like valid JSON
    if (incomingPayload.startsWith("{") && incomingPayload.endsWith("}")) {
      Serial.println("\n📥 Received Telemetry from Arduino:");
      Serial.println(incomingPayload);

      // Forward to Web Server via HTTP POST
      postDataToServer(incomingPayload);
    }
  }

  // Brief loop yield
  delay(10);
}

void connectToWiFi() {
  Serial.print("Connecting to Wi-Fi SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_STATUS, !digitalRead(LED_STATUS)); // Toggle LED
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_STATUS, LOW); // Solid LED = Connected
    Serial.println("\n✅ Wi-Fi Connected!");
    Serial.print("📡 ESP IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    digitalWrite(LED_STATUS, HIGH);
    Serial.println("\n❌ Wi-Fi Connection failed. Retrying in loop...");
  }
}

void postDataToServer(String jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Cannot POST: Wi-Fi not connected");
    return;
  }

  #if defined(ESP8266)
    WiFiClient client;
    HTTPClient http;
    if (!http.begin(client, SERVER_API_URL)) {
      Serial.println("❌ HTTP begin failed");
      return;
    }
  #elif defined(ESP32)
    HTTPClient http;
    if (!http.begin(SERVER_API_URL)) {
      Serial.println("❌ HTTP begin failed");
      return;
    }
  #endif

  http.addHeader("Content-Type", "application/json");

  // Flash LED during transmission
  digitalWrite(LED_STATUS, HIGH);
  int httpResponseCode = http.POST(jsonPayload);
  digitalWrite(LED_STATUS, LOW);

  if (httpResponseCode > 0) {
    Serial.print("🚀 POST Dispatched. Response Code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.print("Server Response: ");
    Serial.println(response);
  } else {
    Serial.print("❌ Error on HTTP POST: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}
