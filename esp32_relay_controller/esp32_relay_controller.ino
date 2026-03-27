/*
 * ============================================================================
 *  ESP32 Smart Relay Controller — FIREBASE RTDB (REST API)
 *  - 4 Relays mapped to: cooler, fan, Light, speaker
 *  - Firebase Realtime Database via HTTP REST (no SDK needed)
 *  - Active LOW relay logic
 *  - Energy cost & runtime tracking
 * ============================================================================
 *  Required: ESP32 board package only — NO external libraries!
 *  Uses built-in WiFi.h + HTTPClient.h
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>

// ═══════════════════════════════════════════════════════════════
//  USER CONFIGURATION
// ═══════════════════════════════════════════════════════════════
#define WIFI_SSID       "iot"
#define WIFI_PASSWORD   "12185624"

// Firebase RTDB REST URL (no trailing slash)
#define FIREBASE_HOST   "https://spdf-24053-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_DEVICES FIREBASE_HOST "/devices.json"

// ═══════════════════════════════════════════════════════════════
//  HARDWARE CONFIG — Relay Pin Mapping
// ═══════════════════════════════════════════════════════════════
#define RELAY_1_PIN   26   // cooler
#define RELAY_2_PIN   27   // fan
#define RELAY_3_PIN   14   // Light
#define RELAY_4_PIN   12   // speaker
#define NUM_RELAYS    4

const int relayPins[NUM_RELAYS] = { RELAY_1_PIN, RELAY_2_PIN, RELAY_3_PIN, RELAY_4_PIN };

// Device names matching Firebase DB structure
const char* deviceNames[NUM_RELAYS] = { "cooler", "fan", "light", "speaker" };
const char* deviceLabels[NUM_RELAYS] = { "AC", "Fan", "Light", "TV" };

#define RELAY_ON   LOW    // Active LOW
#define RELAY_OFF  HIGH

// ═══════════════════════════════════════════════════════════════
//  TIMING INTERVALS
// ═══════════════════════════════════════════════════════════════
#define POLL_INTERVAL            2000UL   // Poll Firebase every 2s
#define STATUS_PUSH_INTERVAL     10000UL  // Push status data every 10s
#define RUNTIME_UPDATE_INTERVAL  60000UL  // Update cost every 60s
#define WIFI_CHECK_INTERVAL      30000UL

// ═══════════════════════════════════════════════════════════════
//  NTP
// ═══════════════════════════════════════════════════════════════
#define NTP_SERVER      "pool.ntp.org"
#define IST_OFFSET_SEC  19800

// ═══════════════════════════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════════════════════════
struct RelayState {
  bool currentState;
  float runtimeMinutes;
  float energyCostINR;
  float activeWatts;
  float standbyWatts;
};

RelayState relays[NUM_RELAYS];
float ratePerKWh = 7.5;
bool firebaseConnected = false;

// Timing
unsigned long lastPoll = 0;
unsigned long lastStatusPush = 0;
unsigned long lastRuntimeUpdate = 0;
unsigned long lastWiFiCheck = 0;

// ═══════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  Serial.println("\n==========================================");
  Serial.println("  ESP32 Relay Controller v5.0");
  Serial.println("  Firebase RTDB | REST API | Active LOW");
  Serial.println("==========================================\n");

  initRelays();
  connectWiFi();

  // NTP sync
  configTime(IST_OFFSET_SEC, 0, NTP_SERVER);
  Serial.print("[NTP] Syncing");
  struct tm timeinfo;
  int retries = 0;
  while (!getLocalTime(&timeinfo) && retries < 10) {
    Serial.print(".");
    delay(1000);
    retries++;
  }
  Serial.println(" OK");

  // Initial poll to sync relay states from Firebase
  pollFirebase();

  Serial.println("\n[OK] System ready — Firebase REST mode!\n");
  Serial.printf("[OK] Database: %s\n\n", FIREBASE_HOST);
}

// ═══════════════════════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════════════════════
void loop() {
  unsigned long now = millis();

  // Poll Firebase for relay commands every 2s
  if (now - lastPoll >= POLL_INTERVAL) {
    lastPoll = now;
    pollFirebase();
  }

  // Push status data every 10s
  if (now - lastStatusPush >= STATUS_PUSH_INTERVAL) {
    lastStatusPush = now;
    pushStatusToFirebase();
  }

  // Update runtime & cost every 60s
  if (now - lastRuntimeUpdate >= RUNTIME_UPDATE_INTERVAL) {
    lastRuntimeUpdate = now;
    updateRuntimeAndCost();
  }

  // WiFi check every 30s
  if (now - lastWiFiCheck >= WIFI_CHECK_INTERVAL) {
    lastWiFiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] Reconnecting...");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
  }

  delay(10);
}

// ═══════════════════════════════════════════════════════════════
//  WiFi
// ═══════════════════════════════════════════════════════════════
void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] FAILED — restarting...");
    ESP.restart();
  }
}

// ═══════════════════════════════════════════════════════════════
//  Relay Init
// ═══════════════════════════════════════════════════════════════
void initRelays() {
  Serial.println("[Relays] Initializing (Active LOW)...");
  float defaultWatts[NUM_RELAYS] = { 200.0, 75.0, 60.0, 30.0 };
  float defaultStandby[NUM_RELAYS] = { 5.0, 1.0, 0.5, 2.0 };

  for (int i = 0; i < NUM_RELAYS; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], RELAY_OFF);

    relays[i].currentState = false;
    relays[i].runtimeMinutes = 0.0;
    relays[i].energyCostINR = 0.0;
    relays[i].activeWatts = defaultWatts[i];
    relays[i].standbyWatts = defaultStandby[i];

    Serial.printf("  %s → GPIO %d [OFF] (%gW)\n",
                  deviceLabels[i], relayPins[i], relays[i].activeWatts);
  }
}

// ═══════════════════════════════════════════════════════════════
//  Set Relay (Active LOW)
// ═══════════════════════════════════════════════════════════════
void setRelay(int idx, bool on) {
  if (idx < 0 || idx >= NUM_RELAYS) return;
  if (on == relays[idx].currentState) return;  // no change

  relays[idx].currentState = on;
  digitalWrite(relayPins[idx], on ? RELAY_ON : RELAY_OFF);

  Serial.printf("[Relay] %s → %s\n", deviceLabels[idx], on ? "ON ⚡" : "OFF");
}

// ═══════════════════════════════════════════════════════════════
//  Poll Firebase RTDB — GET /devices.json
// ═══════════════════════════════════════════════════════════════
void pollFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(FIREBASE_DEVICES);
  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    firebaseConnected = true;

    // Parse each device state from JSON
    // Expected format: {"cooler":{"state":"OFF"},"fan":{"state":"ON"},...}
    for (int i = 0; i < NUM_RELAYS; i++) {
      String deviceKey = "\"" + String(deviceNames[i]) + "\"";
      int deviceIdx = payload.indexOf(deviceKey);
      if (deviceIdx >= 0) {
        // Find "state":"ON" or "state":"OFF" after the device key
        int stateIdx = payload.indexOf("\"state\":", deviceIdx);
        if (stateIdx >= 0 && stateIdx < deviceIdx + 80) {
          // Extract the state value (it's a string: "ON" or "OFF")
          int valStart = payload.indexOf("\"", stateIdx + 8) + 1;
          int valEnd = payload.indexOf("\"", valStart);
          if (valStart > 0 && valEnd > valStart) {
            String stateVal = payload.substring(valStart, valEnd);
            bool newState = (stateVal == "ON");

            if (newState != relays[i].currentState) {
              Serial.printf("[Firebase] %s → %s\n", deviceLabels[i], newState ? "ON" : "OFF");
              setRelay(i, newState);
            }
          }
        }
      }
    }
  } else {
    if (firebaseConnected) {
      Serial.printf("[Firebase] GET failed: %d\n", httpCode);
    }
    firebaseConnected = false;
  }

  http.end();
}

// ═══════════════════════════════════════════════════════════════
//  Push Status to Firebase — PUT /device_status.json
// ═══════════════════════════════════════════════════════════════
void pushStatusToFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(FIREBASE_HOST) + "/device_status.json";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  // Build JSON
  String json = "{";
  json += "\"online\":true,";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"uptime\":" + String(millis() / 1000) + ",";
  json += "\"freeHeap\":" + String(ESP.getFreeHeap()) + ",";
  json += "\"ratePerKWh\":" + String(ratePerKWh, 2) + ",";

  // Per-device stats
  json += "\"stats\":{";
  float totalCost = 0;
  for (int i = 0; i < NUM_RELAYS; i++) {
    if (i > 0) json += ",";
    json += "\"" + String(deviceNames[i]) + "\":{";
    json += "\"state\":\"" + String(relays[i].currentState ? "ON" : "OFF") + "\",";
    json += "\"activeWatts\":" + String(relays[i].activeWatts, 1) + ",";
    json += "\"standbyWatts\":" + String(relays[i].standbyWatts, 1) + ",";
    json += "\"runtimeMinutes\":" + String(relays[i].runtimeMinutes, 1) + ",";
    json += "\"energyCostINR\":" + String(relays[i].energyCostINR, 2);
    json += "}";
    totalCost += relays[i].energyCostINR;
  }
  json += "},";
  json += "\"totalCostINR\":" + String(totalCost, 2);
  json += "}";

  int httpCode = http.PUT(json);
  if (httpCode != 200) {
    Serial.printf("[Firebase] Status push failed: %d\n", httpCode);
  }

  http.end();
}

// ═══════════════════════════════════════════════════════════════
//  Write Single Device State to Firebase
//  PUT /devices/{name}/state.json
// ═══════════════════════════════════════════════════════════════
void writeDeviceState(int idx, bool on) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(FIREBASE_HOST) + "/devices/" + String(deviceNames[idx]) + "/state.json";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String value = on ? "\"ON\"" : "\"OFF\"";
  int httpCode = http.PUT(value);

  if (httpCode == 200) {
    Serial.printf("[Firebase] Wrote %s → %s\n", deviceNames[idx], on ? "ON" : "OFF");
  } else {
    Serial.printf("[Firebase] Write failed: %d\n", httpCode);
  }

  http.end();
}

// ═══════════════════════════════════════════════════════════════
//  Update Runtime & Cost (every 60s)
// ═══════════════════════════════════════════════════════════════
void updateRuntimeAndCost() {
  for (int i = 0; i < NUM_RELAYS; i++) {
    if (relays[i].currentState) {
      relays[i].runtimeMinutes += 1.0;
    }
    // cost = activeWatts × runtimeMinutes × rate / 60000
    relays[i].energyCostINR =
        (relays[i].activeWatts * relays[i].runtimeMinutes * ratePerKWh) / 60000.0;

    Serial.printf("[Stats] %s: %.0fmin | ₹%.2f | %s\n",
                  deviceLabels[i], relays[i].runtimeMinutes,
                  relays[i].energyCostINR,
                  relays[i].currentState ? "ON" : "OFF");
  }
}
