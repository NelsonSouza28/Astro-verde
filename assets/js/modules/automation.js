/**
 * @module automation
 * @description Controles editaveis de fluxo e iluminacao com envio via backend.
 * @hardware bomba/iluminacao
 * @mode editable
 */

const Automation = {
  _isBound: false,
  _saving: { fluxo: false, luz: false },

  init() {
    if (!this._isBound) {
      this._bindActions();
      this._isBound = true;
    }
  },

  _bindActions() {
    document.getElementById('btnSalvarFluxo')?.addEventListener('click', async () => {
      if (this._saving.fluxo) return;
      const input = document.getElementById('inputFluxo');
      const button = document.getElementById('btnSalvarFluxo');
      const valor = Number(input?.value);

      if (!Number.isFinite(valor) || valor < 0 || valor > 10000) {
        Modal.show('Valor inválido', 'Informe um fluxo entre 0 e 10000 L/h.', 'warning');
        return;
      }

      this._saving.fluxo = true;
      if (button) button.textContent = 'Salvando...';
      try {
        await ApiService.setFluxo(valor);
        AppState.sensors.fluxo_laminar = valor;
        AppState.sensorMeta.fluxo_laminar.lastReadingAt = new Date().toISOString();
        Logger.add('action', 'manual', `Fluxo laminar atualizado para ${valor} L/h`);
        Modal.show('Fluxo salvo', `Novo fluxo: ${valor} L/h`, 'success');
        Dashboard.refresh();
      } catch (error) {
        Logger.add('error', 'manual', `Falha ao salvar fluxo: ${error.message}`);
        Modal.show('Falha ao salvar', 'Não foi possível salvar o fluxo laminar.', 'danger');
      } finally {
        this._saving.fluxo = false;
        if (button) button.textContent = 'Salvar';
      }
    });

    document.getElementById('btnSalvarLuz')?.addEventListener('click', async () => {
      if (this._saving.luz) return;
      const button = document.getElementById('btnSalvarLuz');
      const payload = {
        modo: document.getElementById('inputLuzModo')?.value || 'manual',
        on: (document.getElementById('inputLuzOn')?.value || 'on') === 'on',
        intensidade: Number(document.getElementById('inputLuzIntensidade')?.value || 100),
        horario_inicio: document.getElementById('inputLuzInicio')?.value || null,
        horario_fim: document.getElementById('inputLuzFim')?.value || null,
      };
      if (!Number.isFinite(payload.intensidade) || payload.intensidade < 0 || payload.intensidade > 100) {
        Modal.show('Intensidade inválida', 'A intensidade deve estar entre 0 e 100%.', 'warning');
        return;
      }

      this._saving.luz = true;
      if (button) button.textContent = 'Salvando...';
      try {
        await ApiService.setLuz(payload);
        AppState.sensors.iluminacao = payload;
        AppState.sensorMeta.iluminacao.lastReadingAt = new Date().toISOString();
        Logger.add('action', 'manual', `Iluminacao atualizada: ${payload.modo}`);
        Modal.show('Iluminação salva', 'Comando enfileirado para o ESP.', 'success');
        Dashboard.refresh();
      } catch (error) {
        Logger.add('error', 'manual', `Falha ao salvar iluminação: ${error.message}`);
        Modal.show('Falha ao salvar', 'Não foi possível salvar a iluminação.', 'danger');
      } finally {
        this._saving.luz = false;
        if (button) button.textContent = 'Salvar';
      }
    });
  },
};
