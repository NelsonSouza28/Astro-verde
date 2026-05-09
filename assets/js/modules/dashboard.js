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
    const meta = AppState.sensorMeta[sensorKey] || { mode: 'simulated', lastReadingAt: null };
    const created = meta.lastReadingAt ? new Date(meta.lastReadingAt) : null;
    const offline = created ? (Date.now() - created.getTime()) > 60000 : false;
    if (offline) return '<span class="badge-status danger">OFFLINE</span>';
    if (meta.mode === 'real') return '<span class="badge-status active">REAL</span>';
    if (meta.mode === 'editable') return '<span class="badge-status editable">EDITAVEL</span>';
    return '<span class="badge-status info">SIM (FUTURO)</span>';
  },

  _setHeaderBadge(headerId, sensorKey, timestampId) {
    const header = document.getElementById(headerId);
    if (!header) return;
    const base = header.dataset.baseLabel || header.textContent.trim();
    header.dataset.baseLabel = base;
    header.innerHTML = `${base} ${this._badge(sensorKey)}`;

    if (timestampId) {
      const stampEl = document.getElementById(timestampId);
      if (stampEl) {
        const last = AppState.sensorMeta[sensorKey]?.lastReadingAt;
        stampEl.textContent = last ? `Ultima leitura: ${new Date(last).toLocaleTimeString('pt-BR')}` : 'Ultima leitura: -';
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
    ecEl.textContent = AppState.sensors.ec.toFixed(2);
    if (tdsEl) tdsEl.textContent = AppState.sensors.tds;
  },

  _updateTemperature() {
    const el = document.getElementById('tempValue');
    const status = document.getElementById('tempStatus');
    if (!el) return;
    this._setHeaderBadge('tempHeader', 'temperature');
    const temp = AppState.sensors.temperature;
    const cfg = AppState.config.temperature;
    el.textContent = `${temp.toFixed(1)}°C`;
    status.textContent = temp > cfg.max || temp < cfg.min ? 'Fora da faixa' : `Ideal (${cfg.min}-${cfg.max}°C)`;
    status.className = temp > cfg.max || temp < cfg.min ? 'status-text status-alert' : 'status-text status-ok';
  },

  _updateNft() {
    const valEl = document.getElementById('nftStatusVal');
    const subEl = document.getElementById('nftStatusSub');
    if (!valEl) return;
    this._setHeaderBadge('nftHeader', 'fluxo_laminar');
    valEl.textContent = AppState.sensors.nftFlow ? 'Circulando' : 'INTERROMPIDO';
    valEl.classList.toggle('status-danger', !AppState.sensors.nftFlow);
    if (subEl) subEl.innerHTML = AppState.sensors.nftFlow ? 'Bomba Principal: <span class="status-ok">Ligada</span>' : 'Bomba Principal: <span class="status-danger">Falha Critica</span>';
  },

  _updateLighting() {
    const stateEl = document.getElementById('lightingState');
    const subEl = document.getElementById('lightingSub');
    if (!stateEl) return;
    this._setHeaderBadge('lightingHeader', 'iluminacao');
    const state = AppState.actuators.lightingState;
    const power = AppState.actuators.lightingPower;
    stateEl.innerHTML = `<span class="light-state ${state === 'acesa' ? 'on' : 'off'}">${state === 'acesa' ? 'Acesa' : 'Apagada'}</span>`;
    if (subEl) subEl.textContent = `Potencia: ${power}%`;
  },

  _updateWaterLevel() {
    const el = document.getElementById('waterLevel');
    if (!el) return;
    this._setHeaderBadge('waterHeader', 'nivel_reservatorio', 'waterTimestamp');
    el.textContent = `${Number(AppState.sensors.nivel_reservatorio || AppState.sensors.waterLevel).toFixed(1)}%`;
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
