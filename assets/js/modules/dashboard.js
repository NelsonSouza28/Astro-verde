/**
 * @module dashboard
 * @description Render de cards com origem REAL/SIM/OFFLINE e timestamps de leitura.
 * @hardware esp32/esp8266
 * @mode real
 */

const Dashboard = {
  refresh() {
    this._updatePh();
    this._updateEc();
    this._updateTemperature();
    this._updateNft();
    this._updateLighting();
    this._updateWaterLevel();
    this._updateActuatorIndicators();
    Alerts.render();
    Charts.addDataPoint(AppState.sensors.temperature, AppState.sensors.humidity);
  },

  _badge(sensorKey) {
    const meta = AppState.sensorMeta[sensorKey] || { mode: 'real', lastReadingAt: null };
    const created = meta.lastReadingAt ? new Date(meta.lastReadingAt) : null;
    if (!created) return '<span class="badge-status warning">AGUARDANDO SENSOR</span>';
    const offline = created ? (Date.now() - created.getTime()) > 60000 : false;
    if (offline) return '<span class="badge-status danger">OFFLINE</span>';
    if (meta.mode === 'editable') return '<span class="badge-status info">EDITAVEL</span>';
    return '<span class="badge-status active">REAL</span>';
  },

  _setHeaderBadge(headerId, sensorKey, timestampId) {
    const header = document.getElementById(headerId);
    if (!header) return;
    const base = header.dataset.baseLabel || header.textContent.trim();
    header.dataset.baseLabel = base;
    header.innerHTML = `<span class="kpi-title-group">${base} ${this._badge(sensorKey)}</span>`;

    if (timestampId) {
      const stampEl = document.getElementById(timestampId);
      if (stampEl) {
        const last = AppState.sensorMeta[sensorKey]?.lastReadingAt;
        stampEl.textContent = last ? `Ultima leitura: ${new Date(last).toLocaleTimeString('pt-BR')}` : 'Aguardando leitura real do sensor';
      }
    }
  },

  _updatePh() {
    const el = document.getElementById('phValue');
    const status = document.getElementById('phStatus');
    const card = document.getElementById('cardPh');
    if (!el) return;

    this._setHeaderBadge('phHeader', 'ph', 'phTimestamp');
    const ph = AppState.sensors.ph;
    const cfg = AppState.config.ph;
    if (!Number.isFinite(ph)) {
      el.textContent = '--';
      status.textContent = 'AGUARDANDO SENSOR';
      status.className = 'status-text status-alert';
      card.classList.remove('danger');
      card.classList.add('warning');
      return;
    }
    el.textContent = ph.toFixed(1);

    if (ph < cfg.min || ph > cfg.max) {
      status.textContent = `Fora do Ideal (${cfg.min}-${cfg.max})`;
      status.className = 'status-text status-danger';
      card.classList.add('danger');
      card.classList.remove('warning');
    } else {
      status.textContent = `Ideal (${cfg.min}-${cfg.max})`;
      status.className = 'status-text status-ok';
      card.classList.remove('danger', 'warning');
    }
  },

  _updateEc() {
    const ecEl = document.getElementById('ecValue');
    const tdsEl = document.getElementById('tdsValue');
    if (!ecEl) return;
    this._setHeaderBadge('ecHeader', 'ec');
    if (!Number.isFinite(AppState.sensors.ec)) {
      ecEl.textContent = '--';
      if (tdsEl) tdsEl.textContent = '--';
      return;
    }
    ecEl.textContent = AppState.sensors.ec.toFixed(2);
    if (tdsEl) tdsEl.textContent = Number.isFinite(AppState.sensors.tds) ? AppState.sensors.tds : Math.round(AppState.sensors.ec * 500);
  },

  _updateTemperature() {
    const el = document.getElementById('tempValue');
    const status = document.getElementById('tempStatus');
    if (!el) return;
    this._setHeaderBadge('tempHeader', 'temperature');
    const temp = AppState.sensors.temperature;
    const cfg = AppState.config.temperature;
    if (!Number.isFinite(temp)) {
      el.textContent = '--';
      status.textContent = 'AGUARDANDO SENSOR';
      status.className = 'status-text status-alert';
      return;
    }
    el.textContent = `${temp.toFixed(1)}°C`;
    status.textContent = temp > cfg.max || temp < cfg.min ? 'Fora da faixa' : `Ideal (${cfg.min}-${cfg.max}°C)`;
    status.className = temp > cfg.max || temp < cfg.min ? 'status-text status-alert' : 'status-text status-ok';
  },

  _updateNft() {
    const valEl = document.getElementById('nftStatusVal');
    const subEl = document.getElementById('nftStatusSub');
    if (!valEl) return;
    this._setHeaderBadge('nftHeader', 'fluxo_nft');
    valEl.classList.remove('status-alert', 'status-danger');
    if (AppState.sensors.nftFlow === null) {
      valEl.textContent = 'AGUARDANDO SENSOR';
      valEl.classList.add('status-alert');
      if (subEl) subEl.innerHTML = 'Bomba Principal: <span class="status-alert">Sem leitura</span>';
      return;
    }
    valEl.textContent = AppState.sensors.nftFlow ? 'Circulando' : 'INTERROMPIDO';
    valEl.classList.toggle('status-danger', !AppState.sensors.nftFlow);
    if (subEl) subEl.innerHTML = AppState.sensors.nftFlow ? 'Bomba Principal: <span class="status-ok">Ligada</span>' : 'Bomba Principal: <span class="status-danger">Falha Critica</span>';
  },

  _updateLighting() {
    const stateEl = document.getElementById('lightingState');
    const subEl = document.getElementById('lightingSub');
    if (!stateEl) return;
    this._setHeaderBadge('lightingHeader', 'iluminacao');
    const reading = AppState.sensors.iluminacao;
    const state = reading?.on === false ? 'apagada' : (reading?.on === true ? 'acesa' : AppState.actuators.lightingState);
    const power = Number.isFinite(reading?.intensidade) ? reading.intensidade : AppState.actuators.lightingPower;
    if (!reading && !AppState.sensorMeta.iluminacao?.lastReadingAt) {
      stateEl.innerHTML = '<span class="light-state off">AGUARDANDO SENSOR</span>';
      if (subEl) subEl.textContent = 'Aguardando leitura real da iluminacao';
      return;
    }
    stateEl.innerHTML = `<span class="light-state ${state === 'acesa' ? 'on' : 'off'}">${state === 'acesa' ? 'Acesa' : 'Apagada'}</span>`;
    if (subEl) subEl.textContent = `Potencia: ${power}%`;
  },

  _updateWaterLevel() {
    const el = document.getElementById('waterLevel');
    if (!el) return;
    this._setHeaderBadge('waterHeader', 'nivel_reservatorio', 'waterTimestamp');
    const nivel = Number.isFinite(AppState.sensors.nivel_reservatorio)
      ? AppState.sensors.nivel_reservatorio
      : (Number.isFinite(AppState.sensors.waterLevel) ? AppState.sensors.waterLevel : null);
    el.textContent = Number.isFinite(nivel) ? `${Number(nivel).toFixed(1)}%` : '--';
  },

  _updateActuatorIndicators() {
    const coolingEl = document.getElementById('coolingStatus');
    const heatingEl = document.getElementById('heatingStatus');
    if (coolingEl) {
      coolingEl.textContent = AppState.actuators.coolingActive ? 'Ativo' : 'Inativo';
      coolingEl.className = AppState.actuators.coolingActive ? 'status-text status-ok' : 'status-text status-danger';
    }
    if (heatingEl) {
      heatingEl.textContent = AppState.actuators.heatingActive ? 'Ativo' : 'Inativo';
      heatingEl.className = AppState.actuators.heatingActive ? 'status-text status-ok' : 'status-text status-danger';
    }
  },
};
