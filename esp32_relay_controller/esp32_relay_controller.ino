/*
 * ============================================================================
 *  ESP32 Smart Relay Controller — REALTIME Firebase RTDB
 *  - 4 Relays (ACTIVE LOW) with runtime tracking
 *  - Energy cost calculation updated every minute
 *  - Scheduling: none / daily / weekly / monthly
 *  - OTA firmware updates
 *  - REALTIME sync via Firebase RTDB Stream Listeners
 * ============================================================================
 *  Required Libraries (install via Arduino Library Manager):
 *    1. Firebase_ESP_Client  (by mobizt)
 *    2. ArduinoJson          (by Benoit Blanchon, usually bundled)
 *  Required Board Package:
 *    ESP32 by Espressif Systems (via Boards Manager)
 * ============================================================================
 */

#include <ArduinoOTA.h>
#include <Firebase_ESP_Client.h>
#include <WiFi.h>
#include <time.h>

// ─── Provide TokenHelper & RTDBHelper from Firebase library ───
#include "addons/RTDBHelper.h"
#include "addons/TokenHelper.h"

// ═══════════════════════════════════════════════════════════════
//  USER CONFIGURATION — CHANGE THESE
// ═══════════════════════════════════════════════════════════════
#define WIFI_SSID "iot"
#define WIFI_PASSWORD "12185624"

// Firebase project settings
#define FIREBASE_HOST "https://hackathon-tgpcet-default-rtdb.firebaseio.com"
#define API_KEY "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" // Your Web API Key

// Firebase service account (for auth)
#define FIREBASE_CLIENT_EMAIL                                                  \
  "firebase-adminsdk-fbsvc@hackathon-tgpcet.iam.gserviceaccount.com"
#define FIREBASE_PROJECT_ID "hackathon-tgpcet"

// Service account private key — MUST include PEM header/footer
const char PRIVATE_KEY[] PROGMEM = R"EOF(-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDq7MRuBM5iiPkl
tRdA1Gz7lZYrcnD9Da5u6w9Te8Hxz89ZxD7ubxRFlsFHgjbNsthbs1L36vmDCKWS
G4eIL2qx9AfZmcnpPED5zL32vzWJpSeW6AXq8kPcXnC1KEoWMak6r+unei2wYU7V
mK3cCgzpQqpNiJ4i8pT125C/WwPGljAM/dufHBVCZiZGDW8t+rL7WxhTwK3qvRLx
3NzASOruWNgMOXSMNLy5hJkRGtebpbA185f7te/IyzveATJ8AYbVFQzaklhzzeWN
pWV3xG8eqNBWrfdGIc4s6yG1XWuds+1OBc5ztO6l4IHPe7Ez4qE9hL7QeyG94svB
daZjP8FRAgMBAAECggEADW/acmKC/X7RJVd8y3/69c7iBn0mukqgigaW21MOTkrx
FLTVVqTy12Iejv0DLnPGzUPuAHEnsVd6xOcfMupnY2NOWaNiuZzxKHiN+wGHyeYw
5ABEamJOAFpEfxAdYLSZddpfE7a4y0hdjnkLpLTMdUETZZjlVqFiZMeYuWE2z5Jm
fQs0QjA3HNMr1KTi4G7XHMcX0Xnxc/E1Uo75pWj7XHN/WVC79rycmY9Yoe81DrUN
DpNHDx/lKan5HWgt7oJWXt1xT33O5JfJG0lzGJRf90Ssh1dXzjHFdVpVzMeWhokr
Yavw7tkTsHd+/jW5dA6m8eomtVKn0u6n6AeWJD++YwKBgQD+5jKAdh+57AZWedRE
fPgUe8cwREUHlPi797xAB6cs0ItgZma6E3IIrylgshb0ZOv5pjFRJlZGqWVNF5Lv
4pyrfKOOXt80Ruv+/Vjzdu2FKazFw3oOpjRKXC4PyvwBWLX4B/tcCGGTVFWQP+tw
4AdM5tlsLZA3U3zexzNWyIeIfwKBgQDr8HzMIC15SBTZM2aUsjDIY36x1I/EZGeu
To11dcNknyk75z48+8cEV6s2pQcHlg5yqzCy6lfSRAdTldHGh8F4v9Gslg2axkrs
VF3nBeUvKcQoE7Tn8HDvrWBZuAV4d1h0Cb/UINDyYb/6A+Mu5LN60VGTe7nnnAyb
se+p3blOLwKBgEeIorOactzieATcu81cpOJaulO5VQYDsKpPo+z0ON5CyFqNYlbm
DiKRxbL1R6vehrrRARYdBClgcKVp8DqSBhW6LMxPo6QwIxq0TrpErfOo9mupqB9k
VVho9iRIeuCF3Mt2sfvp/jgyerC4v4I13NagEnRhdQ+RxoFetfGs5RxRAoGAMEqq
4IT9icNtMP/KUUkfnwRuXCuruYDrj8vYPGB8O84v/GjaXlUSaRsgmjCw/aaDEolj
kFtS2mC+NyeFJmOHABYS7oZQBovrre+ewLh+LmcYFTPjZU3bb9NG01ZNGFklK6sL
LnoBCntjdeLxzxlUeyD4130NkhBorD2BVn1hflUCgYEAjMlvW5kaBQ8PWg8oTHnY
eW6tY7Yx6ctXa6uk3TEAlU6aqoFFL5UssGSJtDHLuDkvmndmF/LshvxhMqSio3o1
htBQwFP/pA8w3/8VNB1Y8v8qAhKadnudhvswkCav+0Y7v2fnkPs3IM9Zz6eh+Gd5
4RSFKxvGtU+EB/94zpng0Ws=
-----END PRIVATE KEY-----)EOF";

// ═══════════════════════════════════════════════════════════════
//  HARDWARE CONFIG
// ═══════════════════════════════════════════════════════════════
// Relay pins (Active LOW — LOW = ON, HIGH = OFF)
#define RELAY_1_PIN 26
#define RELAY_2_PIN 27
#define RELAY_3_PIN 14
#define RELAY_4_PIN 12

#define NUM_RELAYS 4

const int relayPins[NUM_RELAYS] = {RELAY_1_PIN, RELAY_2_PIN, RELAY_3_PIN,
                                   RELAY_4_PIN};
const char *relayNames[NUM_RELAYS] = {"relay1", "relay2", "relay3", "relay4"};

// Active LOW helpers
#define RELAY_ON LOW
#define RELAY_OFF HIGH

// ═══════════════════════════════════════════════════════════════
//  NTP / TIMEZONE
// ═══════════════════════════════════════════════════════════════
#define NTP_SERVER "pool.ntp.org"
#define IST_OFFSET_SEC 19800 // +5:30 in seconds
#define DST_OFFSET_SEC 0

// ═══════════════════════════════════════════════════════════════
//  TIMING INTERVALS
// ═══════════════════════════════════════════════════════════════
#define RUNTIME_UPDATE_INTERVAL 60000UL // 1 minute — update runtime & cost
#define SCHEDULE_CHECK_INTERVAL 30000UL // 30 seconds — check schedules
#define CONFIG_READ_INTERVAL 60000UL    // 1 minute — re-read config
#define STREAM_RECONNECT_INTERVAL                                              \
  15000UL                           // 15 seconds — reconnect stream if lost
#define WIFI_CHECK_INTERVAL 30000UL // 30 seconds — check WiFi

// ═══════════════════════════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════════════════════════

// Firebase objects
FirebaseData fbdo;         // For write operations
FirebaseData relayStream;  // Stream for /relays (realtime listener)
FirebaseData configStream; // Stream for /config (realtime listener)
FirebaseAuth auth;
FirebaseConfig fbConfig;

bool firebaseReady = false;
bool relayStreamStarted = false;
bool configStreamStarted = false;

// Relay state tracking
struct RelayState {
  bool currentState;            // true = ON
  bool previousState;           // for edge detection
  unsigned long onStartMillis;  // millis() when relay turned ON
  unsigned long totalRuntimeMs; // accumulated ON-time in ms this session
  float runtimeMinutes; // total runtime in minutes (from Firebase + session)
  float energyCostINR;  // cumulative cost
  float wattage;        // per-relay wattage (from Firebase config)

  // Schedule
  String scheduleType; // "none", "daily", "weekly", "monthly"
  int onHour;
  int onMinute;
  int offHour;
  int offMinute;
  int dayOfWeek;  // 0=Sun, 1=Mon, ... 6=Sat
  int dayOfMonth; // 1-31
};

RelayState relays[NUM_RELAYS];

float ratePerKWh = 7.5; // default, updated from Firebase
bool initialDataLoaded = false;

// Timing
unsigned long lastRuntimeUpdate = 0;
unsigned long lastScheduleCheck = 0;
unsigned long lastConfigRead = 0;
unsigned long lastWiFiCheck = 0;

// ═══════════════════════════════════════════════════════════════
//  FORWARD DECLARATIONS
// ═══════════════════════════════════════════════════════════════
void connectWiFi();
void setupFirebase();
void setupOTA();
void syncNTP();
void initRelays();
void startRelayStream();
void startConfigStream();
void handleRelayStream();
void handleConfigStream();
void processRelayStreamData(FirebaseData &data);
void processConfigStreamData(FirebaseData &data);
void loadInitialData();
void readConfigFromFirebase();
void readSchedulesFromFirebase();
void updateRuntimeAndCost();
void writeRuntimeToFirebase(int idx);
void checkSchedules();
void setRelay(int idx, bool on);
void checkWiFiConnection();
String getISOTimestamp();
int getRelayIndex(const String &path);

// ═══════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  Serial.println("\n==========================================");
  Serial.println("  ESP32 Smart Relay Controller v2.0");
  Serial.println("  Active LOW | REALTIME Firebase | OTA");
  Serial.println("==========================================\n");

  initRelays();
  connectWiFi();
  syncNTP();
  setupFirebase();
  setupOTA();

  // Load initial data from Firebase (one-time poll)
  loadInitialData();

  // Start realtime stream listeners
  startRelayStream();
  startConfigStream();

  Serial.println("\n[OK] System ready — REALTIME mode active!\n");
}

// ═══════════════════════════════════════════════════════════════
//  LOOP — Stream-driven, no more polling for relay states
// ═══════════════════════════════════════════════════════════════
void loop() {
  ArduinoOTA.handle();

  unsigned long now = millis();

  // ─── Handle realtime streams ───
  handleRelayStream();
  handleConfigStream();

  // ─── Check WiFi connectivity ───
  if (now - lastWiFiCheck >= WIFI_CHECK_INTERVAL) {
    lastWiFiCheck = now;
    checkWiFiConnection();
  }

  // ─── Check schedules every 30s ───
  if (now - lastScheduleCheck >= SCHEDULE_CHECK_INTERVAL) {
    lastScheduleCheck = now;
    readSchedulesFromFirebase();
    checkSchedules();
  }

  // ─── Update runtime & cost every 60s ───
  if (now - lastRuntimeUpdate >= RUNTIME_UPDATE_INTERVAL) {
    lastRuntimeUpdate = now;
    updateRuntimeAndCost();
  }

  // Small yield to avoid watchdog
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
    Serial.printf("\n[WiFi] Connected! IP: %s\n",
                  WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] FAILED — restarting...");
    ESP.restart();
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Disconnected! Reconnecting...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("[WiFi] Reconnected!");
      // Restart streams after reconnect
      relayStreamStarted = false;
      configStreamStarted = false;
      startRelayStream();
      startConfigStream();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  NTP Time Sync
// ═══════════════════════════════════════════════════════════════
void syncNTP() {
  Serial.println("[NTP] Syncing time...");
  configTime(IST_OFFSET_SEC, DST_OFFSET_SEC, NTP_SERVER);

  struct tm timeinfo;
  int retries = 0;
  while (!getLocalTime(&timeinfo) && retries < 10) {
    Serial.print(".");
    delay(1000);
    retries++;
  }

  if (retries < 10) {
    char buf[64];
    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S IST", &timeinfo);
    Serial.printf("\n[NTP] Time: %s\n", buf);
  } else {
    Serial.println("\n[NTP] Failed to sync — continuing anyway...");
  }
}

// ═══════════════════════════════════════════════════════════════
//  Firebase Setup
// ═══════════════════════════════════════════════════════════════
void setupFirebase() {
  Serial.println("[Firebase] Initializing...");

  fbConfig.database_url = FIREBASE_HOST;
  fbConfig.api_key = API_KEY;

  // Service account auth
  fbConfig.service_account.data.client_email = FIREBASE_CLIENT_EMAIL;
  fbConfig.service_account.data.project_id = FIREBASE_PROJECT_ID;
  fbConfig.service_account.data.private_key = PRIVATE_KEY;

  fbConfig.token_status_callback = tokenStatusCallback;
  fbConfig.timeout.serverResponse = 10 * 1000;

  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectNetwork(true);

  // Wait for token
  Serial.print("[Firebase] Authenticating");
  unsigned long start = millis();
  while (!Firebase.ready() && millis() - start < 15000) {
    Serial.print(".");
    delay(500);
  }

  if (Firebase.ready()) {
    firebaseReady = true;
    Serial.println("\n[Firebase] Connected & authenticated!");
  } else {
    Serial.println("\n[Firebase] Auth failed — will retry...");
  }
}

// ═══════════════════════════════════════════════════════════════
//  REALTIME STREAM: /relays — instant relay state changes
// ═══════════════════════════════════════════════════════════════
void startRelayStream() {
  if (!Firebase.ready() || relayStreamStarted)
    return;

  Serial.println("[Stream] Starting /relays stream...");
  if (Firebase.RTDB.beginStream(&relayStream, "/relays")) {
    relayStreamStarted = true;
    Serial.println("[Stream] /relays stream ACTIVE ✓");
  } else {
    Serial.printf("[Stream] /relays stream FAILED: %s\n",
                  relayStream.errorReason().c_str());
  }
}

void handleRelayStream() {
  if (!relayStreamStarted) {
    startRelayStream();
    return;
  }

  if (Firebase.ready() && Firebase.RTDB.readStream(&relayStream)) {
    if (relayStream.streamAvailable()) {
      Serial.printf("\n[REALTIME] /relays changed → type: %s, path: %s\n",
                    relayStream.dataType().c_str(),
                    relayStream.dataPath().c_str());
      processRelayStreamData(relayStream);
    }
  } else {
    // Stream disconnected — mark for reconnect
    if (!relayStream.httpConnected()) {
      Serial.println("[Stream] /relays disconnected — will reconnect");
      relayStreamStarted = false;
    }
  }
}

void processRelayStreamData(FirebaseData &data) {
  String path = data.dataPath();
  String type = data.dataType();

  // ─── Handle individual field changes: /relayX/state ───
  // Path format from stream: "/relay1/state", "/relay2/state", etc.
  for (int i = 0; i < NUM_RELAYS; i++) {
    String relayPath = "/" + String(relayNames[i]);

    // Direct state change: /relay1/state
    if (path == relayPath + "/state" && type == "boolean") {
      bool newState = data.boolData();
      if (newState != relays[i].currentState) {
        Serial.printf("[REALTIME] Relay %d → %s (instant)\n", i + 1,
                      newState ? "ON" : "OFF");
        setRelay(i, newState);
      }
      return;
    }

    // Schedule changes: /relay1/schedule/type, /relay1/schedule/onHour, etc.
    if (path.startsWith(relayPath + "/schedule/")) {
      String field = path.substring((relayPath + "/schedule/").length());

      if (field == "type" && type == "string") {
        relays[i].scheduleType = data.stringData();
        Serial.printf("[REALTIME] Relay %d schedule type → %s\n", i + 1,
                      relays[i].scheduleType.c_str());
      } else if (field == "onHour" && type == "int")
        relays[i].onHour = data.intData();
      else if (field == "onMinute" && type == "int")
        relays[i].onMinute = data.intData();
      else if (field == "offHour" && type == "int")
        relays[i].offHour = data.intData();
      else if (field == "offMinute" && type == "int")
        relays[i].offMinute = data.intData();
      else if (field == "dayOfWeek" && type == "int")
        relays[i].dayOfWeek = data.intData();
      else if (field == "dayOfMonth" && type == "int")
        relays[i].dayOfMonth = data.intData();

      // Immediately re-check schedule after a change
      checkSchedules();
      return;
    }
  }

  // ─── Handle bulk JSON data (initial stream or large update) ───
  if (path == "/" && type == "json") {
    Serial.println("[REALTIME] Full /relays JSON received — parsing...");
    FirebaseJson json = data.jsonData();

    for (int i = 0; i < NUM_RELAYS; i++) {
      FirebaseJsonData result;
      String relayKey = relayNames[i];

      // State
      if (json.get(result, relayKey + "/state") && result.type == "boolean") {
        bool newState = result.boolValue;
        if (newState != relays[i].currentState) {
          setRelay(i, newState);
        }
      }

      // Runtime
      if (json.get(result, relayKey + "/runtimeMinutes") &&
          (result.type == "int" || result.type == "float" ||
           result.type == "double")) {
        relays[i].runtimeMinutes = result.floatValue;
      }

      // Energy cost
      if (json.get(result, relayKey + "/energyCostINR") &&
          (result.type == "int" || result.type == "float" ||
           result.type == "double")) {
        relays[i].energyCostINR = result.floatValue;
      }

      // Schedule
      if (json.get(result, relayKey + "/schedule/type") &&
          result.type == "string") {
        relays[i].scheduleType = result.stringValue;
      }
      if (json.get(result, relayKey + "/schedule/onHour"))
        relays[i].onHour = result.intValue;
      if (json.get(result, relayKey + "/schedule/onMinute"))
        relays[i].onMinute = result.intValue;
      if (json.get(result, relayKey + "/schedule/offHour"))
        relays[i].offHour = result.intValue;
      if (json.get(result, relayKey + "/schedule/offMinute"))
        relays[i].offMinute = result.intValue;
      if (json.get(result, relayKey + "/schedule/dayOfWeek"))
        relays[i].dayOfWeek = result.intValue;
      if (json.get(result, relayKey + "/schedule/dayOfMonth"))
        relays[i].dayOfMonth = result.intValue;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  REALTIME STREAM: /config — instant config changes
// ═══════════════════════════════════════════════════════════════
void startConfigStream() {
  if (!Firebase.ready() || configStreamStarted)
    return;

  Serial.println("[Stream] Starting /config stream...");
  if (Firebase.RTDB.beginStream(&configStream, "/config")) {
    configStreamStarted = true;
    Serial.println("[Stream] /config stream ACTIVE ✓");
  } else {
    Serial.printf("[Stream] /config stream FAILED: %s\n",
                  configStream.errorReason().c_str());
  }
}

void handleConfigStream() {
  if (!configStreamStarted) {
    startConfigStream();
    return;
  }

  if (Firebase.ready() && Firebase.RTDB.readStream(&configStream)) {
    if (configStream.streamAvailable()) {
      Serial.printf("[REALTIME] /config changed → path: %s\n",
                    configStream.dataPath().c_str());
      processConfigStreamData(configStream);
    }
  } else {
    if (!configStream.httpConnected()) {
      Serial.println("[Stream] /config disconnected — will reconnect");
      configStreamStarted = false;
    }
  }
}

void processConfigStreamData(FirebaseData &data) {
  String path = data.dataPath();
  String type = data.dataType();

  // Rate per kWh changed
  if (path == "/ratePerKWh" &&
      (type == "int" || type == "float" || type == "double")) {
    ratePerKWh = data.floatData();
    Serial.printf("[REALTIME] Rate updated → ₹%.2f/kWh\n", ratePerKWh);
    return;
  }

  // Individual relay wattage: /relayWattage/relay1
  for (int i = 0; i < NUM_RELAYS; i++) {
    String wattPath = "/relayWattage/" + String(relayNames[i]);
    if (path == wattPath &&
        (type == "int" || type == "float" || type == "double")) {
      relays[i].wattage = data.floatData();
      Serial.printf("[REALTIME] Relay %d wattage → %.1f W\n", i + 1,
                    relays[i].wattage);
      return;
    }
  }

  // Full config JSON
  if (path == "/" && type == "json") {
    Serial.println("[REALTIME] Full /config JSON — parsing...");
    FirebaseJson json = data.jsonData();
    FirebaseJsonData result;

    if (json.get(result, "ratePerKWh")) {
      ratePerKWh = result.floatValue;
      Serial.printf("  Rate: ₹%.2f/kWh\n", ratePerKWh);
    }

    for (int i = 0; i < NUM_RELAYS; i++) {
      if (json.get(result, "relayWattage/" + String(relayNames[i]))) {
        relays[i].wattage = result.floatValue;
        Serial.printf("  Relay %d: %.1f W\n", i + 1, relays[i].wattage);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  OTA Setup
// ═══════════════════════════════════════════════════════════════
void setupOTA() {
  ArduinoOTA.setHostname("ESP32-RelayController");

  ArduinoOTA.onStart([]() {
    String type =
        (ArduinoOTA.getCommand() == U_FLASH) ? "Firmware" : "Filesystem";
    Serial.printf("[OTA] Start updating %s\n", type.c_str());
    // Turn off all relays during OTA for safety
    for (int i = 0; i < NUM_RELAYS; i++) {
      setRelay(i, false);
    }
  });

  ArduinoOTA.onEnd(
      []() { Serial.println("\n[OTA] Update complete! Rebooting..."); });

  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("[OTA] Progress: %u%%\r", (progress / (total / 100)));
  });

  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("[OTA] Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR)
      Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR)
      Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR)
      Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR)
      Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR)
      Serial.println("End Failed");
  });

  ArduinoOTA.begin();
  Serial.printf("[OTA] Ready — Hostname: %s\n", "ESP32-RelayController");
}

// ═══════════════════════════════════════════════════════════════
//  Relay Hardware Init
// ═══════════════════════════════════════════════════════════════
void initRelays() {
  Serial.println("[Relays] Initializing GPIOs (Active LOW)...");
  for (int i = 0; i < NUM_RELAYS; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], RELAY_OFF); // Start with all OFF

    relays[i].currentState = false;
    relays[i].previousState = false;
    relays[i].onStartMillis = 0;
    relays[i].totalRuntimeMs = 0;
    relays[i].runtimeMinutes = 0.0;
    relays[i].energyCostINR = 0.0;
    relays[i].wattage = 100.0;

    relays[i].scheduleType = "none";
    relays[i].onHour = 0;
    relays[i].onMinute = 0;
    relays[i].offHour = 0;
    relays[i].offMinute = 0;
    relays[i].dayOfWeek = 0;
    relays[i].dayOfMonth = 1;

    Serial.printf("  Relay %d → GPIO %d [OFF]\n", i + 1, relayPins[i]);
  }
}

// ═══════════════════════════════════════════════════════════════
//  Set Relay (Active LOW)
// ═══════════════════════════════════════════════════════════════
void setRelay(int idx, bool on) {
  if (idx < 0 || idx >= NUM_RELAYS)
    return;

  relays[idx].previousState = relays[idx].currentState;
  relays[idx].currentState = on;

  // Active LOW: ON = LOW, OFF = HIGH
  digitalWrite(relayPins[idx], on ? RELAY_ON : RELAY_OFF);

  // Track ON-start time
  if (on && !relays[idx].previousState) {
    relays[idx].onStartMillis = millis();
    Serial.printf("[Relay %d] TURNED ON ⚡\n", idx + 1);
  } else if (!on && relays[idx].previousState) {
    unsigned long elapsed = millis() - relays[idx].onStartMillis;
    relays[idx].totalRuntimeMs += elapsed;
    Serial.printf("[Relay %d] TURNED OFF (session: %lu ms)\n", idx + 1,
                  elapsed);
  }
}

// ═══════════════════════════════════════════════════════════════
//  Load Initial Data (one-time poll at boot)
// ═══════════════════════════════════════════════════════════════
void loadInitialData() {
  if (!Firebase.ready())
    return;

  Serial.println("[Init] Loading initial data from Firebase...");

  // Read config
  if (Firebase.RTDB.getFloat(&fbdo, "/config/ratePerKWh")) {
    ratePerKWh = fbdo.floatData();
    Serial.printf("  Rate: ₹%.2f/kWh\n", ratePerKWh);
  }

  for (int i = 0; i < NUM_RELAYS; i++) {
    // Wattage
    String wattPath = "/config/relayWattage/" + String(relayNames[i]);
    if (Firebase.RTDB.getFloat(&fbdo, wattPath.c_str())) {
      relays[i].wattage = fbdo.floatData();
    }

    String base = "/relays/" + String(relayNames[i]);

    // State
    if (Firebase.RTDB.getBool(&fbdo, (base + "/state").c_str())) {
      bool state = fbdo.boolData();
      setRelay(i, state);
    }

    // Runtime
    if (Firebase.RTDB.getFloat(&fbdo, (base + "/runtimeMinutes").c_str())) {
      relays[i].runtimeMinutes = fbdo.floatData();
    }

    // Energy cost
    if (Firebase.RTDB.getFloat(&fbdo, (base + "/energyCostINR").c_str())) {
      relays[i].energyCostINR = fbdo.floatData();
    }

    // Schedule
    if (Firebase.RTDB.getString(&fbdo, (base + "/schedule/type").c_str())) {
      relays[i].scheduleType = fbdo.stringData();
    }
    if (Firebase.RTDB.getInt(&fbdo, (base + "/schedule/onHour").c_str()))
      relays[i].onHour = fbdo.intData();
    if (Firebase.RTDB.getInt(&fbdo, (base + "/schedule/onMinute").c_str()))
      relays[i].onMinute = fbdo.intData();
    if (Firebase.RTDB.getInt(&fbdo, (base + "/schedule/offHour").c_str()))
      relays[i].offHour = fbdo.intData();
    if (Firebase.RTDB.getInt(&fbdo, (base + "/schedule/offMinute").c_str()))
      relays[i].offMinute = fbdo.intData();
    if (Firebase.RTDB.getInt(&fbdo, (base + "/schedule/dayOfWeek").c_str()))
      relays[i].dayOfWeek = fbdo.intData();
    if (Firebase.RTDB.getInt(&fbdo, (base + "/schedule/dayOfMonth").c_str()))
      relays[i].dayOfMonth = fbdo.intData();

    Serial.printf("  Relay %d: %s | %.1f min | ₹%.2f | %s schedule\n", i + 1,
                  relays[i].currentState ? "ON" : "OFF",
                  relays[i].runtimeMinutes, relays[i].energyCostINR,
                  relays[i].scheduleType.c_str());
  }

  initialDataLoaded = true;
  Serial.println("[Init] Initial data loaded ✓");
}

// ═══════════════════════════════════════════════════════════════
//  Read Config from Firebase (fallback periodic read)
// ═══════════════════════════════════════════════════════════════
void readConfigFromFirebase() {
  if (!Firebase.ready())
    return;

  if (Firebase.RTDB.getFloat(&fbdo, "/config/ratePerKWh")) {
    ratePerKWh = fbdo.floatData();
  }

  for (int i = 0; i < NUM_RELAYS; i++) {
    String path = "/config/relayWattage/" + String(relayNames[i]);
    if (Firebase.RTDB.getFloat(&fbdo, path.c_str())) {
      relays[i].wattage = fbdo.floatData();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  Read Schedules from Firebase (periodic refresh)
// ═══════════════════════════════════════════════════════════════
void readSchedulesFromFirebase() {
  if (!Firebase.ready())
    return;

  for (int i = 0; i < NUM_RELAYS; i++) {
    String base = "/relays/" + String(relayNames[i]) + "/schedule/";

    if (Firebase.RTDB.getString(&fbdo, (base + "type").c_str()))
      relays[i].scheduleType = fbdo.stringData();
    if (Firebase.RTDB.getInt(&fbdo, (base + "onHour").c_str()))
      relays[i].onHour = fbdo.intData();
    if (Firebase.RTDB.getInt(&fbdo, (base + "onMinute").c_str()))
      relays[i].onMinute = fbdo.intData();
    if (Firebase.RTDB.getInt(&fbdo, (base + "offHour").c_str()))
      relays[i].offHour = fbdo.intData();
    if (Firebase.RTDB.getInt(&fbdo, (base + "offMinute").c_str()))
      relays[i].offMinute = fbdo.intData();
    if (Firebase.RTDB.getInt(&fbdo, (base + "dayOfWeek").c_str()))
      relays[i].dayOfWeek = fbdo.intData();
    if (Firebase.RTDB.getInt(&fbdo, (base + "dayOfMonth").c_str()))
      relays[i].dayOfMonth = fbdo.intData();
  }
}

// ═══════════════════════════════════════════════════════════════
//  Schedule Checker
// ═══════════════════════════════════════════════════════════════
void checkSchedules() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("[Schedule] Cannot get time — skipping.");
    return;
  }

  int nowHour = timeinfo.tm_hour;
  int nowMinute = timeinfo.tm_min;
  int nowWday = timeinfo.tm_wday;
  int nowMday = timeinfo.tm_mday;

  for (int i = 0; i < NUM_RELAYS; i++) {
    String type = relays[i].scheduleType;
    if (type == "none")
      continue;

    bool shouldBeOn = false;
    bool dayMatch = false;

    if (type == "daily") {
      dayMatch = true;
    } else if (type == "weekly") {
      dayMatch = (nowWday == relays[i].dayOfWeek);
    } else if (type == "monthly") {
      dayMatch = (nowMday == relays[i].dayOfMonth);
    }

    if (dayMatch) {
      int onTotal = relays[i].onHour * 60 + relays[i].onMinute;
      int offTotal = relays[i].offHour * 60 + relays[i].offMinute;
      int nowTotal = nowHour * 60 + nowMinute;

      if (onTotal <= offTotal) {
        shouldBeOn = (nowTotal >= onTotal && nowTotal < offTotal);
      } else {
        shouldBeOn = (nowTotal >= onTotal || nowTotal < offTotal);
      }
    }

    if (shouldBeOn != relays[i].currentState) {
      Serial.printf("[Schedule] Relay %d → %s (type: %s)\n", i + 1,
                    shouldBeOn ? "ON" : "OFF", type.c_str());
      setRelay(i, shouldBeOn);

      // Update Firebase state to reflect schedule change
      String statePath = "/relays/" + String(relayNames[i]) + "/state";
      Firebase.RTDB.setBool(&fbdo, statePath.c_str(), shouldBeOn);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  Update Runtime & Energy Cost (every 60s)
// ═══════════════════════════════════════════════════════════════
void updateRuntimeAndCost() {
  if (!Firebase.ready())
    return;

  float totalCost = 0.0;
  float totalRuntime = 0.0;

  for (int i = 0; i < NUM_RELAYS; i++) {
    if (relays[i].currentState) {
      relays[i].runtimeMinutes += 1.0;
    }

    // cost = wattage × runtimeMinutes × ratePerKWh / 60000
    relays[i].energyCostINR =
        (relays[i].wattage * relays[i].runtimeMinutes * ratePerKWh) / 60000.0;

    writeRuntimeToFirebase(i);

    totalCost += relays[i].energyCostINR;
    totalRuntime += relays[i].runtimeMinutes;

    Serial.printf("[Runtime] Relay %d: %.1f min | ₹%.2f | %s\n", i + 1,
                  relays[i].runtimeMinutes, relays[i].energyCostINR,
                  relays[i].currentState ? "ON" : "OFF");
  }

  Firebase.RTDB.setFloat(&fbdo, "/summary/totalCostINR", totalCost);
  Firebase.RTDB.setFloat(&fbdo, "/summary/totalRuntimeMinutes", totalRuntime);
  Firebase.RTDB.setString(&fbdo, "/summary/lastUpdated",
                          getISOTimestamp().c_str());

  Serial.printf("[Summary] Total: %.1f min | ₹%.2f\n", totalRuntime, totalCost);
}

// ═══════════════════════════════════════════════════════════════
//  Write Single Relay Runtime to Firebase
// ═══════════════════════════════════════════════════════════════
void writeRuntimeToFirebase(int idx) {
  String base = "/relays/" + String(relayNames[idx]) + "/";

  Firebase.RTDB.setFloat(&fbdo, (base + "runtimeMinutes").c_str(),
                         relays[idx].runtimeMinutes);
  Firebase.RTDB.setFloat(&fbdo, (base + "energyCostINR").c_str(),
                         relays[idx].energyCostINR);
  Firebase.RTDB.setString(&fbdo, (base + "lastUpdated").c_str(),
                          getISOTimestamp().c_str());
  Firebase.RTDB.setBool(&fbdo, (base + "state").c_str(),
                        relays[idx].currentState);
}

// ═══════════════════════════════════════════════════════════════
//  Utility: ISO Timestamp
// ═══════════════════════════════════════════════════════════════
String getISOTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "1970-01-01T00:00:00+05:30";
  }
  char buf[32];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S+05:30", &timeinfo);
  return String(buf);
}
