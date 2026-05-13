/**
 * @file main.js
 * @module main
 * @description Bootstrap com dados reais e Supabase Realtime.
 * @requisitos RF03, RF07, RF08, RNF13
 * @ator Sistema
 * @mode real
 */

const Modal = {
  show(title, message, type = 'warning') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    const icon = document.getElementById('modalIcon');
    icon.className = 'ph modal-icon';
    if (type === 'success' || type === 'info') icon.classList.add('ph-check-circle', 'success');
    else if (type === 'danger' || type === 'critical') icon.classList.add('ph-warning-circle', 'danger');
    else icon.classList.add('ph-warning-circle', 'warning');
    document.getElementById('customModal').classList.add('show');
  },
  close() { document.getElementById('customModal').classList.remove('show'); },
};

function closeModal() { Modal.close(); }
function closeFormModal() { document.getElementById('formModal').classList.remove('show'); }

function bindStaticActions() {
  const handlers = {
    'close-modal': closeModal,
    'close-form-modal': closeFormModal,
    'inventory-add': () => Inventory.openAddForm(),
    'harvest-add': () => Harvest.openAddForm(),
    'check-api-health': async () => {
      const textEl = document.getElementById('apiHealthText');
      if (textEl) textEl.textContent = 'Verificando API...';
      try {
        const response = await HttpClient.request(`${ApiConfig.baseUrl}${ApiConfig.endpoints.health}`);
        const isOk = response?.status === 'ok' || response?.data?.status === 'ok';
        if (textEl) textEl.textContent = isOk ? 'API online e pronta para hardware.' : 'API respondeu, mas sem status ok.';
        Logger.add(isOk ? 'info' : 'warn', 'hardware', 'Verificacao de saude da API executada.');
      } catch (error) {
        if (textEl) textEl.textContent = 'Falha ao conectar API.';
        Logger.add('error', 'hardware', `Falha health-check API: ${error.message}`);
      }
    },
    'check-esp-device': async () => {
      const deviceId = (document.getElementById('espDeviceId')?.value || '').trim();
      if (!deviceId) {
        Modal.show('Device obrigatorio', 'Informe o device_id do ESP.', 'warning');
        return;
      }
      try {
        const payload = await HttpClient.request(`${ApiConfig.baseUrl}/esp/comandos/${deviceId}`);
        const count = payload?.data?.commands?.length || 0;
        Modal.show('ESP consultado', `Device ${deviceId} respondeu polling com ${count} comando(s).`, 'success');
        Logger.add('action', 'hardware', `Polling consultado para ${deviceId}: ${count} comando(s).`);
      } catch (error) {
        Modal.show('Falha no ESP bridge', `Nao foi possivel consultar ${deviceId}.`, 'danger');
        Logger.add('error', 'hardware', `Falha ao consultar ESP ${deviceId}: ${error.message}`);
      }
    },
  };

  document.querySelectorAll('[data-ui-action]').forEach((element) => {
    const action = element.dataset.uiAction;
    const handler = handlers[action];
    if (!handler) return;
    element.addEventListener('click', (event) => handler(event));
  });
}

function applyRealtimeReading(row) {
  AppState.sensorMeta[row.sensor] = AppState.sensorMeta[row.sensor] || { mode: row.source || 'real', lastReadingAt: null };
  AppState.sensorMeta[row.sensor].mode = row.source || AppState.sensorMeta[row.sensor].mode;
  AppState.sensorMeta[row.sensor].lastReadingAt = row.created_at;

  const v = row.value?.value;
  if (row.sensor === 'ph') AppState.sensors.ph = Number(v);
  if (row.sensor === 'boia') AppState.sensors.boia = (v === true || v === false) ? v : null;
  if (row.sensor === 'ec') {
    AppState.sensors.ec = Number(v);
    AppState.sensors.tds = Number.isFinite(AppState.sensors.ec) ? Math.round(AppState.sensors.ec * 500) : null;
  }
  if (row.sensor === 'temperatura' || row.sensor === 'temperature') AppState.sensors.temperature = Number(v);
  if (row.sensor === 'umidade' || row.sensor === 'humidity') AppState.sensors.humidity = Number(v);
  if (row.sensor === 'luminosidade' || row.sensor === 'luminosity') AppState.sensors.luminosity = Number(v);
  if (row.sensor === 'fluxo_nft') AppState.sensors.nftFlow = Number(v) > 0;
  if (row.sensor === 'fluxo_laminar') {
    AppState.sensors.fluxo_laminar = Number(v);
    if (AppState.sensors.nftFlow === null) AppState.sensors.nftFlow = Number(v) > 0;
  }
  if (row.sensor === 'iluminacao') AppState.sensors.iluminacao = (v && typeof v === 'object') ? v : null;
  if (row.sensor === 'nivel_reservatorio') {
    AppState.sensors.nivel_reservatorio = Number(v);
    AppState.sensors.waterLevel = Number(v);
  }
}

function bindRealtime() {
  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  client
    .channel('sensor-readings')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (payload) => {
      applyRealtimeReading(payload.new);
      Dashboard.refresh();
    })
    .subscribe();

  client
    .channel('system-logs')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_logs' }, (payload) => {
      const row = payload.new;
      AppState.logs.push({
        type: row.level,
        title: row.category,
        category: row.category,
        message: row.message,
        timestamp: row.created_at,
      });
      if (AppState.logs.length > 300) AppState.logs.shift();
      Logger.render();
    })
    .subscribe();

  client
    .channel('alertas')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerta' }, (payload) => {
      const row = payload.new;
      AppState.alerts.unshift({
        id: row.tipo || row.id,
        type: row.critica ? 'critical' : 'warning',
        title: row.tipo || 'Alerta',
        message: row.mensagem || '',
        timestamp: new Date(row.aberto_em || row.created_at || Date.now()).toLocaleString('pt-BR'),
        active: true,
      });
      if (AppState.alerts.length > 200) AppState.alerts.pop();
      Alerts.render();
    })
    .subscribe();
}

document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();
  const hasSession = await Auth.bootSession();
  if (!hasSession) {
    window.location.href = 'login.html';
    return;
  }

  bindStaticActions();
  Inventory.init();
  Harvest.init();
  if (window.Users && Users.init) Users.init();
  Charts.init();

  Inventory.render();
  Harvest.render();
  Alerts.render();
  Dashboard.refresh();
  Automation.init();
  Router.init();

  await ApiService.syncState();
  await ApiService.syncAlerts();
  await ApiService.syncLogs();
  bindRealtime();

  Logger.render();
  const statusEl = document.getElementById('sysStatusText');
  if (statusEl) statusEl.textContent = 'Modo Producao Ativo';
});
