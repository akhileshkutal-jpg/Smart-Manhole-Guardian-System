#ifndef CONFIG_H
#define CONFIG_H

// =========================================================================
// Smart Manhole Guardian System - ESP8266 / ESP32 Network Configuration
// Edit these settings to match your local Wi-Fi router & computer IP address
// =========================================================================

// Wi-Fi Access Point Credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server API Endpoint
// (Replace with your laptop/server's local IPv4 address, e.g. "http://192.168.1.45:3000/api/data")
const char* SERVER_API_URL = "http://192.168.1.100:3000/api/data";

// Telemetry dispatch interval (milliseconds)
const unsigned long HTTP_POST_INTERVAL_MS = 2000;

#endif // CONFIG_H
