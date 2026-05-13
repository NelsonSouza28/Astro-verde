/**
 * @module config
 * @description Configuracoes de dominio e infraestrutura para operacao real.
 * @hardware esp32/esp8266
 * @mode real
 */

const config = {
  PORT: process.env.PORT || 3001,
  DB_PATH: process.env.DB_PATH || './src/database/astroverde.db',

  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',

  ESP_OFFLINE_THRESHOLD_MS: Number(process.env.ESP_OFFLINE_THRESHOLD_MS || 300000),
  ESP_DEVICE_IDS: (process.env.ESP_DEVICE_IDS || '').split(',').map((v) => v.trim()).filter(Boolean),

  PH_MIN: Number(process.env.PH_MIN || 5.5),
  PH_MAX: Number(process.env.PH_MAX || 6.5),
  BOIA_VAZIA_TIMEOUT_MIN: Number(process.env.BOIA_VAZIA_TIMEOUT_MIN || 5),
  NIVEL_RESERVATORIO_ALERTA: Number(process.env.NIVEL_RESERVATORIO_ALERTA || 20),

  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',

  SENSOR_LIMITS: {
    ph: { min: 5.5, max: 6.5 },
    ec: { min: 1.2, max: 2.5 },
    temperature: { min: 18, max: 26, critical: 30 },
    luminosity: { minExpected: 200 },
  },
  CORS_ORIGINS: (process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((v) => v.trim()).filter(Boolean)
    : ['http://localhost:5500', 'http://127.0.0.1:5500']),
};

module.exports = config;
