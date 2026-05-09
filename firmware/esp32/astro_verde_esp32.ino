/**
 * @module esp32_firmware
 * @description Coleta pH e boia, envia para backend e processa fila de comandos.
 * @hardware esp32 + sensor pH analogico + boia digital
 * @mode real
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== CONFIGURACAO =====
const char* WIFI_SSID = "SEU_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA";

const char* BACKEND_BASE_URL = "http://SEU_BACKEND:3001";
const char* DEVICE_ID = "astro-verde-esp";

// pH analogico (ajuste para seu hardware)
const int PH_PIN = 34;
const float PH_VREF = 3.3f;
const int PH_ADC_MAX = 4095;

// Calibracao linear: ph = PH_A * voltage + PH_B
// Ajuste com solucoes padrao (ex.: pH 4 e pH 7)
float PH_A = -5.70f;
float PH_B = 21.34f;

// Boia digital
const int BOIA_PIN = 27;
// Ajuste se sua boia for invertida
const bool BOIA_ACTIVE_LOW = true;

// Intervalos
const unsigned long SEND_INTERVAL_MS = 5000;
const unsigned long COMMAND_POLL_MS = 5000;

unsigned long lastSendAt = 0;
unsigned long lastPollAt = 0;

String isoNow() {
  // Sem RTC/NTP: usa millis no campo timestamp para teste.
  // Em producao, prefira NTP e timestamp real UTC.
  unsigned long s = millis() / 1000;
  char buf[32];
  snprintf(buf, sizeof(buf), "1970-01-01T00:%02lu:%02luZ", (s / 60) % 60, s % 60);
  return String(buf);
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
  if (BOIA_ACTIVE_LOW) return raw == LOW;
  return raw == HIGH;
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

void ackCommand(const String& commandId) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/esp/ack";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<192> doc;
  doc["command_id"] = commandId;
  doc["device_id"] = DEVICE_ID;

  String body;
  serializeJson(doc, body);
  http.POST(body);
  http.end();
}

void handleCommand(const JsonObject& cmd) {
  const char* command = cmd["command"] | "";
  const String commandId = String((const char*)cmd["id"]);

  // TODO: mapeie aqui os atuadores reais
  // Ex.: SET_LIGHT, SET_FLOW_RATE
  if (strcmp(command, "SET_LIGHT") == 0) {
    // aplicar comando de luz
  } else if (strcmp(command, "SET_FLOW_RATE") == 0) {
    // aplicar comando de fluxo
  }

  ackCommand(commandId);
}

void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/esp/commands/" + DEVICE_ID;
  http.begin(url);

  int code = http.GET();
  if (code < 200 || code >= 300) {
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();

  StaticJsonDocument<2048> doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) return;

  JsonArray commands = doc["data"]["commands"].as<JsonArray>();
  for (JsonObject cmd : commands) {
    handleCommand(cmd);
  }
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BOIA_PIN, INPUT_PULLUP);
  analogReadResolution(12);
  connectWiFi();
}

void loop() {
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

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
