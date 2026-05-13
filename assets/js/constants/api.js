/**
 * @module apiConfig
 * @description Endpoints HTTP de infraestrutura e automacao.
 * @hardware esp32/esp8266
 * @mode real
 */

const ApiConfig = {
  baseUrl: (() => {
    const custom = window.APP_API_BASE_URL || window.API_BASE_URL;
    if (custom) return `${custom.replace(/\/$/, '')}/api`;
    return `${window.location.origin}/api`;
  })(),
  endpoints: {
    sensorsLatest: '/sensors/latest',
    sensorsCsv: '/sensors/export/csv',
    alerts: '/alerts',
    logs: '/logs',
    health: '/health',
    setFluxo: '/manual-controls/fluxo',
    setLuz: '/manual-controls/luz',
    authMe: '/auth/me',
    users: '/users',
  },
};
