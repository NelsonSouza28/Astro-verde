/**
 * @module main
 * @description Bootstrap com Realtime Supabase para leituras e logs em tempo real.
 * @hardware esp32/esp8266
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
    'toggle-lighting-card': async () => {
      const isOn = AppState.actuators.lightingState === 'acesa';
      const nextOn = !isOn;
      try {
        try {
          await ApiService.setLuz({
            modo: 'manual',
            on: nextOn,
            intensidade: nextOn ? 100 : 0,
            horario_inicio: null,
            horario_fim: null,
          });
        } catch (_) {
          await ApiService.setLighting(nextOn ? 'on' : 'off', nextOn ? 100 : 0);
        }

        AppState.actuators.lightingState = nextOn ? 'acesa' : 'apagada';
        AppState.actuators.lightingPower = nextOn ? 100 : 0;
        Logger.add('action', 'iluminacao', `Luz ${nextOn ? 'acesa' : 'apagada'} via dashboard.`);
        Dashboard.refresh();
      } catch (error) {
        Modal.show('Falha no comando', 'Nao foi possivel alterar o estado da luz.', 'danger');
        Logger.add('error', 'iluminacao', `Falha ao alternar luz: ${error.message}`);
      }
    },
    'check-api-health': async () => {
      const textEl = document.getElementById('apiHealthText');
      if (textEl) textEl.textContent = 'Verificando API...';
      try {
        const response = await HttpClient.request(`${ApiConfig.baseUrl}${ApiConfig.endpoints.health}`);
        const isOk = response?.status === 'ok' || response?.data?.status === 'ok';
        if (textEl) textEl.textContent = isOk ? 'API online e pronta para hardware.' : 'API respondeu, mas sem status ok.';
        Logger.add(isOk ? 'info' : 'warn', 'hardware', 'Verificação de saúde da API executada.');
      } catch (error) {
        if (textEl) textEl.textContent = 'Falha ao conectar API.';
        Logger.add('error', 'hardware', `Falha health-check API: ${error.message}`);
      }
    },
    'check-esp-device': async () => {
      const deviceId = (document.getElementById('espDeviceId')?.value || '').trim();
      if (!deviceId) {
        Modal.show('Device obrigatório', 'Informe o device_id do ESP.', 'warning');
        return;
      }
      try {
        const payload = await HttpClient.request(`${ApiConfig.baseUrl}/esp/commands/${deviceId}`);
        const count = payload?.data?.commands?.length || 0;
        Modal.show('ESP consultado', `Device ${deviceId} respondeu polling com ${count} comando(s).`, 'success');
        Logger.add('action', 'hardware', `Polling consultado para ${deviceId}: ${count} comando(s).`);
      } catch (error) {
        Modal.show('Falha no ESP bridge', `Não foi possível consultar ${deviceId}.`, 'danger');
        Logger.add('error', 'hardware', `Falha ao consultar ESP ${deviceId}: ${error.message}`);
      }
    },
  };
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-ui-action]');
    if (!target) return;
    const handler = handlers[target.dataset.uiAction];
    if (handler) handler(event);
  });
}

function bindRealtime() {
  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  client.channel('sensor-readings').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (payload) => {
    const row = payload.new;
    AppState.sensorMeta[row.sensor] = AppState.sensorMeta[row.sensor] || { mode: row.source || 'real', lastReadingAt: null };
    AppState.sensorMeta[row.sensor].mode = row.source || AppState.sensorMeta[row.sensor].mode;
    AppState.sensorMeta[row.sensor].lastReadingAt = row.created_at;

    const realValue = row.value?.value;
    if (row.sensor === 'ph') AppState.sensors.ph = Number(realValue);
    if (row.sensor === 'boia') AppState.sensors.boia = Boolean(realValue);
    if (row.sensor === 'nivel_reservatorio') {
      AppState.sensors.nivel_reservatorio = Number(realValue);
      AppState.sensors.waterLevel = Number(realValue);
    }

    Dashboard.refresh();
  }).subscribe();

  client.channel('system-logs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_logs' }, (payload) => {
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
  }).subscribe();
}

document.addEventListener('DOMContentLoaded', () => {
  bindStaticActions();
  Inventory.init();
  Harvest.init();
  Charts.init();
  Inventory.render();
  Harvest.render();
  Alerts.render();
  Dashboard.refresh();
  Automation.init();
  Router.init();
  ApiService.syncState();
  setInterval(() => ApiService.syncState(), 10000);
  bindRealtime();
  Logger.render();
  const statusEl = document.getElementById('sysStatusText');
  if (statusEl) statusEl.textContent = AppState.dataSource === 'api' ? 'Modo Produção Ativo' : 'Modo Mock Ativo';
});
