/**
 * @module espService
 * @description Ingestao de sensores reais, fila de comandos, historico e deteccao de offline.
 * @hardware esp32/esp8266
 * @mode real
 */

const config = require('../config');

function makeEspService({ supabase, logger, alertasService = null }) {
  const validSensors = new Set([
    'ph',
    'boia',
    'nivel_reservatorio',
    'fluxo_nft',
    'temperatura',
    'umidade',
    'luminosidade',
    'ec',
    'fluxo_laminar',
    'iluminacao',
  ]);

  const SENSOR_RANGES = {
    ph: { min: 0, max: 14 },
    nivel_reservatorio: { min: 0, max: 200 },
    fluxo_nft: { min: 0, max: 50 },
    temperatura: { min: 0, max: 60 },
    umidade: { min: 0, max: 100 },
    luminosidade: { min: 0, max: 10000 },
    ec: { min: 0, max: 10 },
    fluxo_laminar: { min: 0, max: 10000 },
  };

  function parseValue(sensor, rawValue) {
    if (sensor === 'boia') {
      if (typeof rawValue === 'boolean') return rawValue;
      if (rawValue === 'true' || rawValue === 1 || rawValue === '1') return true;
      if (rawValue === 'false' || rawValue === 0 || rawValue === '0') return false;
      throw new Error('boia deve ser boolean.');
    }

    if (sensor === 'iluminacao') {
      if (rawValue && typeof rawValue === 'object') return rawValue;
      throw new Error('iluminacao deve ser objeto.');
    }

    const num = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (!Number.isFinite(num)) throw new Error(`${sensor} deve ser number.`);
    return num;
  }

  function validarFaixaFisica(sensor, value) {
    if (sensor === 'boia' || sensor === 'iluminacao') return;
    const range = SENSOR_RANGES[sensor];
    if (!range) return;
    if (value < range.min || value > range.max) {
      throw new Error(`${sensor} fora da faixa fisica (${range.min}-${range.max}).`);
    }
  }

  function validateData(payload = {}) {
    const { device_id: deviceId, sensor } = payload;
    const timestamp = payload.timestamp || payload.timestamp_device;
    const value = payload.valor !== undefined ? payload.valor : payload.value;
    if (!deviceId || typeof deviceId !== 'string') throw new Error('device_id obrigatorio.');
    if (!validSensors.has(sensor)) throw new Error('sensor invalido.');
    if (!timestamp || Number.isNaN(Date.parse(timestamp))) throw new Error('timestamp invalido.');
    const parsed = parseValue(sensor, value);
    validarFaixaFisica(sensor, parsed);
    return { deviceId, sensor, value: parsed, timestamp };
  }

  async function ingestData(payload) {
    const normalized = validateData(payload);
    const row = {
      device_id: normalized.deviceId,
      sensor: normalized.sensor,
      value: { value: normalized.value, timestamp: normalized.timestamp },
      source: 'real',
      created_at: normalized.timestamp,
      timestamp_device: normalized.timestamp,
    };

    const { data, error } = await supabase.from('sensor_readings').insert(row).select().single();
    if (error) throw new Error(error.message);

    await logger.info('esp', 'Leitura recebida do ESP.', {
      device_id: normalized.deviceId,
      sensor: normalized.sensor,
      value: normalized.value,
    });

    if (alertasService) {
      await alertasService.avaliarLeitura({
        deviceId: normalized.deviceId,
        sensor: normalized.sensor,
        valor: normalized.value,
        timestamp: normalized.timestamp,
      });
    }

    return data;
  }

  async function getPendingCommands(deviceId) {
    const { data, error } = await supabase
      .from('esp_commands')
      .select('*')
      .eq('device_id', deviceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    if (!data.length) return [];

    const ids = data.map((cmd) => cmd.id);
    const { error: updateError } = await supabase
      .from('esp_commands')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .in('id', ids);

    if (updateError) throw new Error(updateError.message);

    await logger.action('esp', 'Comandos enviados para polling do ESP.', { device_id: deviceId, count: data.length });

    return data.map((cmd) => ({
      id: cmd.id,
      comando: cmd.command,
      payload: cmd.payload || {},
      criado_em: cmd.created_at,
    }));
  }

  async function ackCommand({
    command_id: commandIdRaw,
    comando_id: comandoIdRaw,
    device_id: deviceId,
    status = 'ok',
    mensagem = null,
  }) {
    const commandId = commandIdRaw || comandoIdRaw;
    if (!commandId || !deviceId) throw new Error('command_id e device_id obrigatorios.');

    const normalizedStatus = status === 'erro' ? 'failed' : 'ack';
    const { error } = await supabase
      .from('esp_commands')
      .update({
        status: normalizedStatus,
        mensagem,
        ack_at: new Date().toISOString(),
        ack_em: new Date().toISOString(),
      })
      .eq('id', commandId)
      .eq('device_id', deviceId);

    if (error) throw new Error(error.message);

    if (normalizedStatus === 'failed' && alertasService) {
      await alertasService.registrarFalhaComando({ comandoId: commandId, deviceId, mensagem });
    }

    await logger.action('esp', 'ACK de comando recebido.', {
      command_id: commandId,
      device_id: deviceId,
      status: normalizedStatus,
    });
    return { ok: true };
  }

  async function enqueueCommand({ deviceId, command, payload }) {
    const { data, error } = await supabase
      .from('esp_commands')
      .insert({ device_id: deviceId, command, payload, status: 'pending' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    await logger.action('esp', 'Comando enfileirado.', { device_id: deviceId, command, payload });
    return data;
  }

  async function checkOfflineDevices() {
    if (!config.ESP_DEVICE_IDS.length) return [];
    const now = Date.now();
    const offline = [];

    for (const deviceId of config.ESP_DEVICE_IDS) {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('created_at,sensor,value,device_id')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) continue;
      if (!data) {
        offline.push({ device_id: deviceId, offline: true, reason: 'sem leitura' });
        continue;
      }

      const delta = now - new Date(data.created_at || data.timestamp_device).getTime();
      if (delta > config.ESP_OFFLINE_THRESHOLD_MS) {
        offline.push({ device_id: deviceId, offline: true, last_seen: data.created_at || data.timestamp_device, delta_ms: delta });
      }
    }

    for (const entry of offline) {
      await logger.error('esp', 'Device offline detectado.', entry);
    }

    return offline;
  }

  async function getDeviceStatus() {
    const devices = new Set(config.ESP_DEVICE_IDS || []);
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('device_id,created_at,timestamp_device')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);
    for (const row of data || []) {
      if (row?.device_id) devices.add(row.device_id);
    }

    const response = [];
    const threshold = 60 * 1000;
    for (const deviceId of devices) {
      const { data: last, error: lastErr } = await supabase
        .from('sensor_readings')
        .select('created_at,timestamp_device')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastErr) throw new Error(lastErr.message);

      const latest = last?.created_at || last?.timestamp_device || null;
      const online = latest ? (Date.now() - new Date(latest).getTime()) < threshold : false;
      response.push({
        device_id: deviceId,
        status: online ? 'online' : 'offline',
        ultimo_contato: latest,
      });
    }

    return response;
  }

  async function getHistory({ sensor, inicio, fim, deviceId = null }) {
    if (!sensor || !validSensors.has(sensor)) throw new Error('sensor invalido.');
    if (!inicio || !fim) throw new Error('inicio e fim sao obrigatorios.');

    const start = new Date(inicio);
    const end = new Date(fim);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error('Periodo invalido.');
    if (end < start) throw new Error('Periodo invalido: fim menor que inicio.');
    if ((end.getTime() - start.getTime()) > 90 * 24 * 60 * 60 * 1000) throw new Error('Periodo maximo permitido: 90 dias.');

    let query = supabase
      .from('sensor_readings')
      .select('id,device_id,sensor,value,created_at,timestamp_device')
      .eq('sensor', sensor)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true });

    if (deviceId) query = query.eq('device_id', deviceId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  return {
    ingestData,
    getPendingCommands,
    ackCommand,
    checkOfflineDevices,
    enqueueCommand,
    getDeviceStatus,
    getHistory,
  };
}

module.exports = makeEspService;
