/**
 * @file astro_verde_esp32.ino
 * @module esp32_firmware
 * @description Coleta pH e boia, envia para backend e mantem ciclos locais offline para bomba/LED.
 * @requisitos RF01, RF02, RF08, RF13, RN08, RNF05, RNF12
 * @ator Sistema
 * @mode real
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "astro_verde_esp32_config.h"

const int PH_PIN = 34;
const float PH_VREF = 3.3f;
const int PH_ADC_MAX = 4095;
float PH_A = -5.70f;
float PH_B = 21.34f;
const int BOIA_PIN = 27;
const bool BOIA_ACTIVE_LOW = true;

const int PUMP_PIN = 26;
const int LED_PIN = 25;
const unsigned long PUMP_PERIOD_MS = 30UL * 60UL * 1000UL;
const unsigned long PUMP_ACTIVE_MS = 15UL * 60UL * 1000UL;
const unsigned long LIGHT_PERIOD_MS = 24UL * 60UL * 60UL * 1000UL;
const unsigned long LIGHT_ACTIVE_MS = 16UL * 60UL * 60UL * 1000UL;

const unsigned long SEND_INTERVAL_MS = 5000;
const unsigned long COMMAND_POLL_MS = 5000;
unsigned long lastSendAt = 0;
unsigned long lastPollAt = 0;

String isoNow() {
  unsigned long s = millis() / 1000;
  char buf[32];
  snprintf(buf, sizeof(buf), "1970-01-01T00:%02lu:%02luZ", (s / 60) % 60, s % 60);
  return String(buf);
}

void applyOfflineCycles() {
  unsigned long now = millis();
  bool pumpOn = (now % PUMP_PERIOD_MS) < PUMP_ACTIVE_MS;
  bool ledOn = (now % LIGHT_PERIOD_MS) < LIGHT_ACTIVE_MS;
  if (pumpOn && ledOn) ledOn = false; // RNF08: evita acionamento simultaneo sem necessidade.
  digitalWrite(PUMP_PIN, pumpOn ? HIGH : LOW);
  digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
}

float readPh() {
  int raw = analogRead(PH_PIN);
  float voltage = (raw * PH_VREF) / PH_ADC_MAX;
  float ph = (PH_A * voltage) + PH_B;
  if (ph < 0) ph = 0;
  if (ph > 14) ph = 14;
  return ph;
}

bool readBoia() {
  int raw = digitalRead(BOIA_PIN);
  return BOIA_ACTIVE_LOW ? raw == LOW : raw == HIGH;
}

bool postSensor(const char* sensor, JsonVariant value) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/esp/data";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["sensor"] = sensor;
  doc["value"] = value;
  doc["timestamp"] = isoNow();
  String body;
  serializeJson(doc, body);
  int code = http.POST(body);
  http.end();
  return code >= 200 && code < 300;
}

void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/esp/commands/" + DEVICE_ID;
  http.begin(url);
  int code = http.GET();
  if (code < 200 || code >= 300) { http.end(); return; }
  http.end();
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    applyOfflineCycles();
    delay(500);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BOIA_PIN, INPUT_PULLUP);
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  analogReadResolution(12);
  connectWiFi();
}

void loop() {
  unsigned long now = millis();
  applyOfflineCycles();

  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  if (now - lastSendAt >= SEND_INTERVAL_MS) {
    lastSendAt = now;
    float ph = readPh();
    bool boia = readBoia();
    postSensor("ph", ph);
    postSensor("boia", boia);
  }

  if (now - lastPollAt >= COMMAND_POLL_MS) {
    lastPollAt = now;
    pollCommands();
  }
}
