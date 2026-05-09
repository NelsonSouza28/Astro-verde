/**
 * @module esp32_config
 * @description Configuracao local do ESP32 para conectar no backend Astro Verde.
 * @hardware esp32
 * @mode real
 */

#pragma once

// WIFI
#define WIFI_SSID "SEU_WIFI"
#define WIFI_PASSWORD "SUA_SENHA_WIFI"

// URL do backend Node.js acessivel na mesma rede do ESP32.
// Exemplo local: http://192.168.0.120:3001
#define BACKEND_BASE_URL "http://SEU_IP_LOCAL:3001"

// Mesmo valor configurado em server/.env -> ESP_DEVICE_IDS
#define DEVICE_ID "astro-verde-esp"

