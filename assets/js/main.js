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
  };
  document.querySelectorAll('[data-ui-action]').forEach((element) => {
    const handler = handlers[element.dataset.uiAction];
    if (handler) element.addEventListener('click', handler);
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
