/**
 * @module state
 * @description Estado global incluindo sensores reais/editaveis e metadados de origem.
 * @hardware esp32/esp8266
 * @mode real
 */

const AppState = {
  sensors: {
    ph: null,
    ec: null,
    tds: null,
    temperature: null,
    humidity: null,
    luminosity: null,
    waterLevel: null,
    nftFlow: null,
    boia: null,
    nivel_reservatorio: null,
    fluxo_laminar: null,
    iluminacao: null,
  },

  sensorMeta: {
    ph: { mode: 'real', lastReadingAt: null },
    boia: { mode: 'real', lastReadingAt: null },
    nivel_reservatorio: { mode: 'real', lastReadingAt: null },
    ec: { mode: 'real', lastReadingAt: null },
    temperature: { mode: 'real', lastReadingAt: null },
    humidity: { mode: 'real', lastReadingAt: null },
    luminosity: { mode: 'real', lastReadingAt: null },
    fluxo_nft: { mode: 'real', lastReadingAt: null },
    fluxo_laminar: { mode: 'editable', lastReadingAt: null },
    iluminacao: { mode: 'editable', lastReadingAt: null },
  },

  actuators: {
    lightingCommand: 'on',
    lightingState: 'acesa',
    lightingPower: 100,
    coolingActive: false,
    heatingActive: false,
  },

  system: {
    phAtual: null,
    bombaLigada: false,
    modoAtual: 'real',
    ultimaAtualizacao: null,
    origemLeitura: 'hardware',
  },

  config: {
    ph: { min: 5.5, max: 6.5 },
    ec: { min: 1.2, max: 2.5 },
    temperature: { min: 18, max: 26, critical: 30 },
    luminosity: { minExpected: 200 },
    lightCycleHours: { on: 16, off: 8 },
  },

  alerts: [],
  logs: [],
  liveLogsFilter: 'all',

  modules: [
    { id: 'torreA', name: 'Torre A - 3 Modulos Empilhados', active: true },
    { id: 'torreB', name: 'Torre B - 2 Modulos Empilhados', active: true },
    { id: 'bombaPh', name: 'Bomba Dosadora de pH', active: true },
    { id: 'bombaNutrientes', name: 'Bomba dos Nutrientes', active: false },
    { id: 'iluminacao', name: 'Sistema de Iluminacao LED', active: true },
  ],

  dataSource: 'api',
  unreadNotifications: 1,
  auth: {
    accessToken: null,
    user: null,
  },
};
