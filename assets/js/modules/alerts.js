/*
 * modules/alerts.js — Motor de Regras e Gerenciamento de Alertas
 *
 * Este módulo contém duas responsabilidades:
 *
 * 1. BusinessRules — avalia o estado dos sensores e gera alertas
 *    quando os valores saem das faixas ideais.
 *
 * 2. Alerts — gerencia a lista de alertas ativos e
 *    atualiza a interface com os alertas relevantes.
 *
 * Regras implementadas (conforme documentação do projeto):
 * - pH fora da faixa ideal
 * - EC/TDS zerado persistente (possível falha de sensor)
 * - Fluxo NFT interrompido
 * - Iluminação queimada (comando=on, lux incompatível)
 * - Temperatura acima do limite → reduz luminosidade
 * - Temperatura crítica → desliga iluminação em proteção
 * - Temperatura abaixo do mínimo → aciona aquecimento
 */

/* ============================================================
   BUSINESS RULES — avalia sensores e dispara alertas
   ============================================================ */
const BusinessRules = {

  /* Chamado apos atualizacao de leituras reais do dashboard */
  evaluate() {
    this._checkPh();
    this._checkEc();
    this._checkNftFlow();
    this._checkLighting();
    this._checkTemperature();
  },

  /* --- Regra RF08: pH --- */
  _checkPh() {
    const { ph } = AppState.sensors;
    const { min, max } = AppState.config.ph;

    if (ph < min || ph > max) {
      Alerts.raise({
        id: 'ph_out_of_range',
        type: ph < min - 0.5 || ph > max + 0.5 ? 'critical' : 'warning',
        title: 'pH Fora da Faixa',
        message: `pH atual: ${ph.toFixed(1)}. Faixa ideal: ${min}–${max}. Considere acionar a bomba dosadora.`,
      });
    } else {
      Alerts.resolve('ph_out_of_range');
    }
  },

  /* --- Regra: EC/TDS zerado persistente --- */
  _checkEc() {
    if (AppState.sensors.ec < 0.1 && AppState.sensors.nftFlow) {
      Alerts.raise({
        id: 'ec_sensor_failure',
        type: 'critical',
        title: 'Possível Falha no Sensor de Minerais',
        message: 'EC/TDS zerado com fluxo ativo. Verifique o sensor ou o cabo.',
      });
    } else {
      Alerts.resolve('ec_sensor_failure');
    }
  },

  /* --- Regra RF07: Fluxo NFT --- */
  _checkNftFlow() {
    if (!AppState.sensors.nftFlow) {
      Alerts.raise({
        id: 'nft_flow_failure',
        type: 'critical',
        title: 'Fluxo NFT Interrompido',
        message: 'Interrupção crítica no fluxo laminar. Verifique as bombas imediatamente.',
      });
    } else {
      Alerts.resolve('nft_flow_failure');
    }
  },

  /* --- Regra RF02: Iluminação queimada --- */
  _checkLighting() {
    if (AppState.actuators.lightingState === 'queimada') {
      Alerts.raise({
        id: 'light_burned',
        type: 'critical',
        title: 'Iluminação Queimada',
        message: 'Comando de ligar enviado, mas luminosidade insuficiente detectada. Verifique a lâmpada.',
      });
    } else {
      Alerts.resolve('light_burned');
    }
  },

  /* --- Regra RF03: Temperatura --- */
  _checkTemperature() {
    const temp = AppState.sensors.temperature;
    const cfg  = AppState.config.temperature;

    if (temp > cfg.critical) {
      // Temperatura crítica — desliga iluminação em proteção
      if (AppState.actuators.lightingCommand !== 'off') {
        AppState.actuators.lightingCommand = 'off';
        AppState.actuators.lightingPower   = 0;
        Logger.add('critical', 'Proteção Térmica',
          `Temperatura crítica (${temp.toFixed(1)}°C). Iluminação desligada em proteção.`);
      }
      AppState.actuators.coolingActive = true;
      AppState.actuators.heatingActive = false;

      Alerts.raise({
        id: 'temp_critical',
        type: 'critical',
        title: 'Temperatura Crítica',
        message: `${temp.toFixed(1)}°C — acima de ${cfg.critical}°C. Iluminação desligada. Resfriamento ativo.`,
      });

    } else if (temp > cfg.max) {
      // Temperatura alta — reduz potência da luz
      const newPower = 60; // reduz para 60%
      if (AppState.actuators.lightingPower > newPower) {
        AppState.actuators.lightingPower = newPower;
        Logger.add('warning', 'Temperatura Alta',
          `${temp.toFixed(1)}°C. Potência da iluminação reduzida para ${newPower}%.`);
      }
      AppState.actuators.coolingActive = true;
      AppState.actuators.heatingActive = false;

      Alerts.raise({
        id: 'temp_high',
        type: 'warning',
        title: 'Temperatura Elevada',
        message: `${temp.toFixed(1)}°C — acima de ${cfg.max}°C. Resfriamento acionado.`,
      });
      Alerts.resolve('temp_critical');

    } else if (temp < cfg.min) {
      // Temperatura baixa — aciona aquecimento
      AppState.actuators.heatingActive = true;
      AppState.actuators.coolingActive = false;

      Alerts.raise({
        id: 'temp_low',
        type: 'warning',
        title: 'Temperatura Baixa',
        message: `${temp.toFixed(1)}°C — abaixo de ${cfg.min}°C. Aquecimento ativado.`,
      });
      Alerts.resolve('temp_critical');
      Alerts.resolve('temp_high');

    } else {
      // Temperatura ideal — desativa atuadores de compensação
      if (AppState.actuators.heatingActive || AppState.actuators.coolingActive) {
        AppState.actuators.heatingActive = false;
        AppState.actuators.coolingActive = false;
        // Restaura potência da luz se ela foi reduzida
        if (AppState.actuators.lightingCommand === 'on') {
          AppState.actuators.lightingPower = 100;
        }
      }
      Alerts.resolve('temp_critical');
      Alerts.resolve('temp_high');
      Alerts.resolve('temp_low');
    }
  },
};

/* ============================================================
   ALERTS — gerencia a lista de alertas ativos
   ============================================================ */
const Alerts = {

  /* Levanta um alerta (cria ou atualiza pelo id) */
  raise(alert) {
    const existing = AppState.alerts.find(a => a.id === alert.id);
    if (!existing) {
      AppState.alerts.unshift({
        ...alert,
        timestamp: new Date().toLocaleString('pt-BR'),
        active: true,
      });
      // Incrementa o badge de notificações
      AppState.unreadNotifications++;
      this._updateBadge();
      // Também adiciona ao log do sistema
      Logger.add(alert.type, alert.title, alert.message);
    }
  },

  /* Remove um alerta quando a condição for normalizada */
  resolve(alertId) {
    const idx = AppState.alerts.findIndex(a => a.id === alertId);
    if (idx !== -1) {
      AppState.alerts.splice(idx, 1);
    }
  },

  /* Atualiza a bolinha de notificação na topbar */
  _updateBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    if (AppState.unreadNotifications > 0) {
      badge.textContent = AppState.unreadNotifications;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },

  /* Renderiza os alertas no topo do dashboard */
  render() {
    const container = document.getElementById('alertsBanner');
    if (!container) return;

    container.innerHTML = '';

    // Mostra no máximo 3 alertas no banner
    const visible = AppState.alerts.slice(0, 3);

    visible.forEach(alert => {
      const icons = {
        info:     'ph-info',
        warning:  'ph-warning',
        critical: 'ph-warning-circle',
      };
      const div = document.createElement('div');
      div.className = `alert-item ${alert.type}`;
      div.innerHTML = `
        <i class="ph ${icons[alert.type] || 'ph-info'}"></i>
        <div>
          <strong>${alert.title}</strong>
          <p>${alert.message}</p>
          <div class="alert-time">${alert.timestamp}</div>
        </div>
      `;
      container.appendChild(div);
    });

    // Atualiza o badge na topbar
    this._updateBadge();
  },
};
