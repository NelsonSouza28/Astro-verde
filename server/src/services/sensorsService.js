/**
 * @file sensorsService.js
 * @module sensorsService
 * @description Regras de monitoramento com dados reais persistidos no Supabase.
 * @requisitos RF03, RF07, RF08, RF10, RF12, RN01, RN02, RN06, RN07, RN10, RNF03, RNF06
 * @ator Operador, Sistema
 * @mode real
 */

const { validarFaixaPh, detectarInterrupcaoFluxoNft } = require('./formulas');

function makeSensorsService(sensorsRepo, alertsRepo, logsRepo) {
  function _defaultSnapshot() {
    return {
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
    };
  }

  function _value(row) {
    if (!row) return null;
    const raw = row.value;
    if (raw && typeof raw === 'object' && 'value' in raw) return raw.value;
    return raw ?? null;
  }

  function _mapSensorName(sensorName) {
    const alias = {
      temperatura: 'temperature',
      temperature: 'temperature',
      umidade: 'humidity',
      humidity: 'humidity',
      luminosidade: 'luminosity',
      luminosity: 'luminosity',
      nivel_reservatorio: 'nivel_reservatorio',
      fluxo_nft: 'nftFlow',
      fluxo_laminar: 'fluxo_laminar',
      ph: 'ph',
      ec: 'ec',
      boia: 'boia',
      iluminacao: 'iluminacao',
    };
    return alias[sensorName] || sensorName;
  }

  return {
    async getLatestReading() {
      const rows = await sensorsRepo.getLatest(400);
      const sensors = _defaultSnapshot();
      const bySensor = new Map();

      for (const row of rows) {
        if (!bySensor.has(row.sensor)) bySensor.set(row.sensor, row);
      }

      for (const [sensorName, row] of bySensor.entries()) {
        const key = _mapSensorName(sensorName);
        const value = _value(row);
        if (key === 'nftFlow') {
          sensors.nftFlow = value !== null ? Number(value) > 0 : null;
          continue;
        }
        if (key === 'boia') {
          sensors.boia = typeof value === 'boolean' ? value : null;
          continue;
        }
        if (key === 'iluminacao') {
          sensors.iluminacao = (value && typeof value === 'object') ? value : null;
          continue;
        }
        sensors[key] = value !== null && value !== undefined ? Number(value) : null;
      }

      if (Number.isFinite(sensors.nivel_reservatorio)) {
        sensors.waterLevel = sensors.nivel_reservatorio;
      }
      if (Number.isFinite(sensors.ec)) {
        sensors.tds = Math.round(sensors.ec * 500);
      }

      return {
        sensors,
        lastKnown: rows[0] || null,
        timestamp: rows[0]?.created_at || null,
      };
    },

    async ingestTelemetry(payload = {}) {
      this._validateTelemetry(payload);

      const faixaPh = await sensorsRepo.getConfigMap();
      const phMin = Number.isFinite(faixaPh.ph_min) ? faixaPh.ph_min : 5.5;
      const phMax = Number.isFinite(faixaPh.ph_max) ? faixaPh.ph_max : 6.5;
      const fluxoMin = Number.isFinite(faixaPh.fluxo_minimo) ? faixaPh.fluxo_minimo : 0.5;

      const phOk = validarFaixaPh(payload.ph, phMin, phMax);
      const fluxoInterrompido = detectarInterrupcaoFluxoNft(payload.fluxo_nft ?? payload.fluxo_laminar ?? 0, fluxoMin);

      const timestamp = payload.timestamp || new Date().toISOString();
      await sensorsRepo.insertReading({
        device_id: payload.device_id,
        sensor: 'ph',
        value: payload.ph,
        timestamp,
        source: 'real',
      });

      if (payload.temperatura !== undefined || payload.temperature !== undefined) {
        await sensorsRepo.insertReading({
          device_id: payload.device_id,
          sensor: 'temperatura',
          value: payload.temperatura ?? payload.temperature,
          timestamp,
          source: 'real',
        });
      }

      if (payload.umidade !== undefined || payload.humidity !== undefined) {
        await sensorsRepo.insertReading({
          device_id: payload.device_id,
          sensor: 'umidade',
          value: payload.umidade ?? payload.humidity,
          timestamp,
          source: 'real',
        });
      }

      if (payload.luminosidade !== undefined || payload.luminosity !== undefined) {
        await sensorsRepo.insertReading({
          device_id: payload.device_id,
          sensor: 'luminosidade',
          value: payload.luminosidade ?? payload.luminosity,
          timestamp,
          source: 'real',
        });
      }

      if (payload.fluxo_nft !== undefined || payload.fluxo_laminar !== undefined) {
        await sensorsRepo.insertReading({
          device_id: payload.device_id,
          sensor: 'fluxo_nft',
          value: payload.fluxo_nft ?? payload.fluxo_laminar,
          timestamp,
          source: 'real',
        });
      }

      if (!phOk) {
        await alertsRepo.upsert(
          'ph_out_of_range',
          'warning',
          'pH fora da faixa da cultura',
          `Leitura ${payload.ph} fora de ${phMin}-${phMax}`,
        );
      }

      if (fluxoInterrompido) {
        await alertsRepo.upsert(
          'nft_flow_failure',
          'critical',
          'Interrupcao de fluxo NFT',
          'Fluxo abaixo do minimo configurado.',
        );
      }

      await logsRepo.insert(phOk ? 'info' : 'warning', 'telemetria', `device=${payload.device_id} ph=${payload.ph}`);
      return { accepted: true, phOk, fluxoInterrompido };
    },

    _validateTelemetry(payload) {
      if (!payload.device_id) throw new Error('Campo "device_id" e obrigatorio.');
      if (typeof payload.ph !== 'number' || payload.ph < 0 || payload.ph > 14) {
        throw new Error('Campo "ph" invalido.');
      }
    },

    async getExportData(hours = 24) {
      return sensorsRepo.exportRows(hours);
    },
  };
}

module.exports = makeSensorsService;
