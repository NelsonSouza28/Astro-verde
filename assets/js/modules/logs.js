/**
 * @module logs
 * @description LiveLogs com filtro por nivel e scroll automatico.
 * @hardware esp32/esp8266
 * @mode real
 */

const Logger = {
  MAX_ENTRIES: 200,

  add(type, title, message) {
    AppState.logs.unshift({ type, title, message, timestamp: new Date().toISOString(), category: title });
    if (AppState.logs.length > this.MAX_ENTRIES) AppState.logs.pop();
    this._renderLogEntries();
  },

  render() {
    this._renderModuleStatus();
    this._bindFilters();
    this._renderLogEntries();
  },

  _bindFilters() {
    document.querySelectorAll('[data-log-filter]').forEach((btn) => {
      btn.onclick = () => {
        AppState.liveLogsFilter = btn.dataset.logFilter;
        document.querySelectorAll('[data-log-filter]').forEach((item) => {
          item.classList.toggle('btn-primary', item.dataset.logFilter === AppState.liveLogsFilter);
        });
        this._renderLogEntries();
      };
    });
  },

  _renderModuleStatus() {
    const container = document.getElementById('moduleStatus');
    if (!container) return;
    container.innerHTML = '';
    AppState.modules.forEach((m) => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `<div class="item-info"><h4>${m.name}</h4><p>Status: <span class="${m.active ? 'status-ok' : 'status-danger'}">${m.active ? 'Ativo' : 'Inativo'}</span></p></div><span class="badge-status ${m.active ? 'active' : 'inactive'}">${m.active ? 'Online' : 'Offline'}</span>`;
      container.appendChild(div);
    });
  },

  _renderLogEntries() {
    const container = document.getElementById('logsContainer');
    if (!container) return;
    const countEl = document.getElementById('logCount');

    const filter = AppState.liveLogsFilter;
    const logs = AppState.logs.filter((entry) => filter === 'all' || entry.type === filter);
    if (countEl) countEl.textContent = `${logs.length} entrada(s)`;

    container.innerHTML = logs.slice(0, 100).reverse().map((log) => {
      const hhmmss = new Date(log.timestamp).toLocaleTimeString('pt-BR');
      return `<div class="live-log-line log-${log.type}">[${hhmmss}] [${(log.category || 'system').toUpperCase()}] ${log.message}</div>`;
    }).join('');

    container.scrollTop = container.scrollHeight;
  },
};
