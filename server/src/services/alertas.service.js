/**
 * @file alertas.service.js
 * @module alertasService
 * @description Servico central de avaliacao de alertas apos cada leitura recebida do ESP32.
 * @requisitos RF07, RF08, RF12, RN02, RN07
 * @ator Sistema
 * @mode real
 */

function makeAlertasService({ supabase, logger, config }) {
  const cache = {
    phFaixa: null,
    phFaixaAt: 0,
    fluxoMinimoByDevice: new Map(),
    fluxoMinimoAt: new Map(),
    reservatorioCriticoByDevice: new Map(),
    reservatorioCriticoAt: new Map(),
  };

  const CACHE_MS = 60 * 1000;

  function numero(v, fallback = null) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
    if (v && typeof v === 'object' && 'value' in v) return numero(v.value, fallback);
    return fallback;
  }

  async function registrarAlerta({
    tipo,
    severidade = 'warning',
    mensagem,
    critica = false,
    canal = 'telegram',
    deviceId = null,
    sensor = null,
    valor = null,
  }) {
    const row = {
      tipo,
      severidade,
      mensagem,
      critica: Boolean(critica),
      canal,
      device_id: deviceId,
      sensor,
      valor: valor ? { value: valor } : null,
    };

    const { error } = await supabase.from('alerta').insert(row);
    if (error) throw new Error(error.message);

    await logger.error('alerta', mensagem, { tipo, severidade, device_id: deviceId, sensor, valor });
    return row;
  }

  async function enfileirarNotificacaoTelegram(mensagem, payload = null) {
    const { error } = await supabase.from('notificacoes_queue').insert({
      canal: 'telegram',
      destino: config.TELEGRAM_CHAT_ID || null,
      mensagem,
      payload,
      status: 'pendente',
    });
    if (error) throw new Error(error.message);
  }

  async function enfileirarComando(deviceId, command, payload = {}) {
    const { error } = await supabase.from('esp_commands').insert({
      device_id: deviceId,
      command,
      payload,
      status: 'pending',
    });
    if (error) throw new Error(error.message);
  }

  async function obterFaixaPh() {
    if (cache.phFaixa && Date.now() - cache.phFaixaAt < CACHE_MS) return cache.phFaixa;

    const { data, error } = await supabase
      .from('culturas')
      .select('ph_min,ph_max')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    cache.phFaixa = {
      min: numero(data?.ph_min, Number(config.PH_MIN) || 5.5),
      max: numero(data?.ph_max, Number(config.PH_MAX) || 6.5),
    };
    cache.phFaixaAt = Date.now();
    return cache.phFaixa;
  }

  async function obterFluxoMinimo(deviceId) {
    const cached = cache.fluxoMinimoByDevice.get(deviceId);
    const cachedAt = cache.fluxoMinimoAt.get(deviceId) || 0;
    if (cached !== undefined && Date.now() - cachedAt < CACHE_MS) return cached;

    const { data, error } = await supabase
      .from('modulo_nft')
      .select('fluxo_minimo')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    const value = numero(data?.fluxo_minimo, 0.5);
    cache.fluxoMinimoByDevice.set(deviceId, value);
    cache.fluxoMinimoAt.set(deviceId, Date.now());
    return value;
  }

  async function obterNivelCritico(deviceId) {
    const cached = cache.reservatorioCriticoByDevice.get(deviceId);
    const cachedAt = cache.reservatorioCriticoAt.get(deviceId) || 0;
    if (cached !== undefined && Date.now() - cachedAt < CACHE_MS) return cached;

    const { data, error } = await supabase
      .from('reservatorio')
      .select('nivel_critico_pct')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    const value = numero(data?.nivel_critico_pct, Number(config.NIVEL_RESERVATORIO_ALERTA) || 20);
    cache.reservatorioCriticoByDevice.set(deviceId, value);
    cache.reservatorioCriticoAt.set(deviceId, Date.now());
    return value;
  }

  async function avaliarLeitura({ deviceId, sensor, valor, timestamp }) {
    const time = timestamp ? new Date(timestamp) : new Date();
    const iso = Number.isNaN(time.getTime()) ? new Date().toISOString() : time.toISOString();

    if (sensor === 'ph') {
      const ph = numero(valor);
      if (ph === null) return;
      const faixa = await obterFaixaPh();
      if (ph < faixa.min || ph > faixa.max) {
        const mensagem = `pH fora da faixa (${ph.toFixed(2)}). Ideal: ${faixa.min}-${faixa.max}.`;
        await registrarAlerta({
          tipo: 'ph_fora_faixa',
          severidade: 'critico',
          mensagem,
          critica: true,
          deviceId,
          sensor,
          valor: ph,
        });
        await enfileirarNotificacaoTelegram(mensagem, { device_id: deviceId, sensor, valor: ph, timestamp: iso });
      }
      return;
    }

    if (sensor === 'fluxo_nft') {
      const fluxo = numero(valor);
      if (fluxo === null) return;
      const fluxoMinimo = await obterFluxoMinimo(deviceId);
      if (fluxo < fluxoMinimo) {
        const mensagem = `Fluxo NFT interrompido (${fluxo} L/min). Minimo: ${fluxoMinimo}.`;
        await registrarAlerta({
          tipo: 'fluxo_nft_interrompido',
          severidade: 'critico',
          mensagem,
          critica: true,
          deviceId,
          sensor,
          valor: fluxo,
        });
        await enfileirarNotificacaoTelegram(mensagem, { device_id: deviceId, sensor, valor: fluxo, timestamp: iso });
      }
      return;
    }

    if (sensor === 'nivel_reservatorio') {
      const nivel = numero(valor);
      if (nivel === null) return;
      const nivelCritico = await obterNivelCritico(deviceId);
      if (nivel < nivelCritico) {
        const mensagem = `Nivel do reservatorio critico (${nivel}%). Limite: ${nivelCritico}%.`;
        await registrarAlerta({
          tipo: 'nivel_reservatorio_critico',
          severidade: 'critico',
          mensagem,
          critica: true,
          deviceId,
          sensor,
          valor: nivel,
        });
        await enfileirarComando(deviceId, 'LIGAR_BOMBA_REPOSICAO', {});
        await enfileirarNotificacaoTelegram(mensagem, { device_id: deviceId, sensor, valor: nivel, timestamp: iso });
      }
      return;
    }

    if (sensor === 'boia') {
      const boia = typeof valor === 'boolean' ? valor : (valor?.value === true || valor?.value === false ? Boolean(valor.value) : null);
      if (boia !== false) return;

      const timeoutMs = (Number(config.BOIA_VAZIA_TIMEOUT_MIN) || 5) * 60 * 1000;
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('created_at,value')
        .eq('device_id', deviceId)
        .eq('sensor', 'boia')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw new Error(error.message);

      const nowMs = Date.now();
      let oldestFalseMs = nowMs;
      for (const row of data || []) {
        const val = row?.value?.value;
        if (val !== false) break;
        const rowMs = new Date(row.created_at).getTime();
        if (!Number.isNaN(rowMs)) oldestFalseMs = rowMs;
      }

      if (nowMs - oldestFalseMs >= timeoutMs) {
        const mensagem = 'Boia sinaliza reservatorio vazio por tempo acima do limite.';
        await registrarAlerta({
          tipo: 'boia_vazia_timeout',
          severidade: 'critico',
          mensagem,
          critica: true,
          deviceId,
          sensor,
          valor: false,
        });
        await enfileirarNotificacaoTelegram(mensagem, { device_id: deviceId, sensor, timestamp: iso });
      }
    }
  }

  async function registrarFalhaComando({ comandoId, deviceId, mensagem }) {
    const text = mensagem || 'Falha na execucao de comando do ESP32.';
    await registrarAlerta({
      tipo: 'falha_execucao_comando',
      severidade: 'critico',
      mensagem: text,
      critica: true,
      deviceId,
      sensor: 'comando',
      valor: comandoId,
    });
    await enfileirarNotificacaoTelegram(text, { comando_id: comandoId, device_id: deviceId });
  }

  async function verificarDispositivosOffline() {
    const thresholdMs = Number(config.ESP_OFFLINE_THRESHOLD_MS) || 60000;
    const devices = new Set(config.ESP_DEVICE_IDS || []);

    const { data: fromReadings, error: readingsErr } = await supabase
      .from('sensor_readings')
      .select('device_id,created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (readingsErr) throw new Error(readingsErr.message);

    for (const row of fromReadings || []) {
      if (row?.device_id) devices.add(row.device_id);
    }

    const nowMs = Date.now();
    let total = 0;
    for (const deviceId of devices) {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('created_at')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) continue;

      const last = data?.created_at ? new Date(data.created_at).getTime() : null;
      if (!last || nowMs - last > thresholdMs) {
        total += 1;
        const mensagem = `Dispositivo ${deviceId} offline (sem leitura recente).`;
        await registrarAlerta({
          tipo: 'esp_offline',
          severidade: 'critico',
          mensagem,
          critica: true,
          deviceId,
          sensor: 'heartbeat',
          valor: data?.created_at || null,
        });
        await enfileirarNotificacaoTelegram(mensagem, { device_id: deviceId, ultimo_contato: data?.created_at || null });
      }
    }

    return total;
  }

  return {
    avaliarLeitura,
    registrarFalhaComando,
    verificarDispositivosOffline,
  };
}

module.exports = makeAlertasService;
