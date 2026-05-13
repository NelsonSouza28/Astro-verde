/**
 * @module apiService
 * @description Integracao HTTP com backend para leitura e comandos em fila ESP.
 * @hardware esp32/esp8266
 * @mode real
 */

const ApiService = {
  _extractData(payload) {
    if (payload && typeof payload === 'object' && 'data' in payload) return payload.data;
    return payload;
  },

  _url(endpointKeyOrPath) {
    if (ApiConfig.endpoints[endpointKeyOrPath]) return `${ApiConfig.baseUrl}${ApiConfig.endpoints[endpointKeyOrPath]}`;
    const path = endpointKeyOrPath.startsWith('/') ? endpointKeyOrPath : `/${endpointKeyOrPath}`;
    return `${ApiConfig.baseUrl}${path}`;
  },

  async _get(endpointKey) {
    const payload = await HttpClient.request(this._url(endpointKey));
    return this._extractData(payload);
  },

  async _post(endpointKey, body = {}) {
    const payload = await HttpClient.request(this._url(endpointKey), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return this._extractData(payload);
  },
  async _patch(path, body = {}) {
    const payload = await HttpClient.request(this._url(path), {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return this._extractData(payload);
  },

  getSensors() { return this._get('sensorsLatest'); },
  getAlerts() { return this._get('alerts'); },
  getLogs(limit = 50) { return this._get(`logs?limit=${limit}`); },
  setFluxo(valor) { return this._post('setFluxo', { valor }); },
  setLuz(payload) { return this._post('setLuz', payload); },
  listUsers() { return this._get('users'); },
  createUser(payload) { return this._post('users', payload); },
  updateUserRole(id, perfil) { return this._patch(`/users/${id}/perfil`, { perfil }); },

  async syncState() {
    try {
      const sensorData = await this.getSensors();
      if (sensorData?.sensors) Object.assign(AppState.sensors, sensorData.sensors);
      if (sensorData?.timestamp) {
        AppState.system.ultimaAtualizacao = sensorData.timestamp;
      }
      AppState.system.modoAtual = 'real';
      AppState.system.origemLeitura = 'hardware';
      Dashboard.refresh();
    } catch (err) {
      console.warn('[API] Falha na sincronizacao:', err.message);
    }
  },

  async syncLogs(limit = 80) {
    try {
      const data = await this.getLogs(limit);
      if (!data?.logs) return;
      AppState.logs = data.logs.map((row) => ({
        type: row.level || 'info',
        title: row.category || 'system',
        category: row.category || 'system',
        message: row.message || '',
        timestamp: row.created_at || new Date().toISOString(),
      }));
      Logger.render();
    } catch (err) {
      console.warn('[API] Falha ao carregar logs:', err.message);
    }
  },

  async syncAlerts() {
    try {
      const data = await this.getAlerts();
      if (!data?.alerts) return;
      AppState.alerts = data.alerts.map((row) => ({
        id: row.tipo || row.id,
        type: row.critica ? 'critical' : ((row.severidade || '').toLowerCase().includes('crit') ? 'critical' : 'warning'),
        title: row.tipo || 'Alerta',
        message: row.mensagem || '',
        timestamp: new Date(row.aberto_em || row.created_at || Date.now()).toLocaleString('pt-BR'),
        active: !row.resolvido_em,
      }));
      AppState.unreadNotifications = AppState.alerts.length;
      Alerts.render();
    } catch (err) {
      console.warn('[API] Falha ao carregar alertas:', err.message);
    }
  },
};
