/**
 * @file harvest.js
 * @module harvest
 * @description Planejamento e registro de safras em modo leitura para Visualizador.
 * @requisitos RF04, RF05, RN05
 * @ator Administrador, Operador, Visualizador
 * @mode real
 */

const Harvest = {
  items: [
    { id: 1, crop: 'Alface Crespa', lot: 'Lote 04A', plantedAt: '01/04/2026', harvestAt: '10/05/2026', totalDays: 40, currentDay: 7, status: 'growing' },
    { id: 2, crop: 'Manjericao', lot: 'Lote 02B', plantedAt: '15/03/2026', harvestAt: '25/04/2026', totalDays: 40, currentDay: 24, status: 'final' },
  ],

  _nextId: 3,

  _canEdit() {
    return (typeof Auth !== 'undefined') ? Auth.isOperadorOuAdmin() : true;
  },

  init() {
    const container = document.getElementById('harvestList');
    if (!container || container.dataset.bound === 'true') return;

    container.dataset.bound = 'true';
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-harvest-action]');
      if (!button) return;

      if (!this._canEdit()) {
        Modal.show('Acesso restrito', 'Visualizador pode apenas consultar as safras.', 'warning');
        return;
      }

      const itemId = Number(button.dataset.id);
      if (button.dataset.harvestAction === 'edit') this.openEditForm(itemId);
      if (button.dataset.harvestAction === 'remove') this.remove(itemId);
    });
  },

  statusLabel(status) {
    const labels = {
      growing: { label: 'Em Andamento', cls: 'status-ok' },
      final: { label: 'Fase Final', cls: 'status-ok' },
      done: { label: 'Colhida', cls: 'status-alert' },
    };

    return labels[status] || { label: status, cls: '' };
  },

  render() {
    const container = document.getElementById('harvestList');
    if (!container) return;

    if (this.items.length === 0) {
      container.innerHTML = '<div class="list-item"><div class="item-info"><p>Nenhuma safra cadastrada.</p></div></div>';
      return;
    }

    const canEdit = this._canEdit();
    container.innerHTML = '';
    this.items.forEach((item) => {
      const { label, cls } = this.statusLabel(item.status);
      const progress = Math.round((item.currentDay / item.totalDays) * 100);
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `
        <div class="item-info harvest-info">
          <h4>${item.crop} - ${item.lot}</h4>
          <p>Plantio: ${item.plantedAt} | Colheita prevista: ${item.harvestAt}</p>
          <div class="progress-track">
            <div class="progress-bar"></div>
          </div>
          <p class="progress-label">Dia ${item.currentDay} de ${item.totalDays} (${progress}%)</p>
        </div>
        <div class="harvest-actions">
          <span class="status-text harvest-status ${cls}">${label}</span>
          ${canEdit ? `<button class="btn btn-primary btn-sm" type="button" data-harvest-action="edit" data-id="${item.id}">Editar</button>
          <button class="btn btn-danger btn-sm" type="button" data-harvest-action="remove" data-id="${item.id}">Remover</button>` : ''}
        </div>
      `;

      div.querySelector('.progress-bar').style.width = `${progress}%`;
      container.appendChild(div);
    });
  },

  openAddForm() {
    if (!this._canEdit()) {
      Modal.show('Acesso restrito', 'Visualizador pode apenas consultar as safras.', 'warning');
      return;
    }

    document.getElementById('formModalTitle').textContent = 'Nova Safra';
    document.getElementById('formModalBody').innerHTML = `
      <div class="form-grid">
        <div class="form-row-2">
          <div class="form-field">
            <label class="form-label">Cultura</label>
            <input id="fh_crop" class="form-input" type="text" placeholder="Ex: Alface Crespa">
          </div>
          <div class="form-field">
            <label class="form-label">Lote</label>
            <input id="fh_lot" class="form-input" type="text" placeholder="Ex: Lote 05A">
          </div>
        </div>
        <div class="form-row-2">
          <div class="form-field">
            <label class="form-label">Data de Plantio</label>
            <input id="fh_planted" class="form-input" type="date">
          </div>
          <div class="form-field">
            <label class="form-label">Previsao de Colheita</label>
            <input id="fh_harvest" class="form-input" type="date">
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">Duracao estimada (dias)</label>
          <input id="fh_days" class="form-input" type="number" min="1" placeholder="40">
        </div>
      </div>
    `;

    document.getElementById('formModalSave').onclick = () => {
      const crop = document.getElementById('fh_crop').value.trim();
      const lot = document.getElementById('fh_lot').value.trim();
      const planted = document.getElementById('fh_planted').value;
      const harvest = document.getElementById('fh_harvest').value;
      const days = parseInt(document.getElementById('fh_days').value, 10) || 40;

      if (!crop || !lot) {
        Modal.show('Campos obrigatorios', 'Informe a cultura e o lote.', 'warning');
        return;
      }

      if (!planted || !harvest) {
        Modal.show('Campos obrigatorios', 'Informe as datas.', 'warning');
        return;
      }

      const formatDate = (value) => value.split('-').reverse().join('/');
      this.items.push({
        id: this._nextId++,
        crop,
        lot,
        plantedAt: formatDate(planted),
        harvestAt: formatDate(harvest),
        totalDays: days,
        currentDay: 0,
        status: 'growing',
      });

      Logger.add('success', 'Safra Cadastrada', `${crop} - ${lot} iniciada.`);
      closeFormModal();
      this.render();
    };

    document.getElementById('formModal').classList.add('show');
  },

  openEditForm(id) {
    if (!this._canEdit()) {
      Modal.show('Acesso restrito', 'Visualizador pode apenas consultar as safras.', 'warning');
      return;
    }

    const item = this.items.find((entry) => entry.id === id);
    if (!item) return;

    document.getElementById('formModalTitle').textContent = 'Editar Safra';
    document.getElementById('formModalBody').innerHTML = `
      <div class="form-grid">
        <div class="form-row-2">
          <div class="form-field">
            <label class="form-label">Cultura</label>
            <input id="fh_crop" class="form-input" type="text" value="${item.crop}">
          </div>
          <div class="form-field">
            <label class="form-label">Lote</label>
            <input id="fh_lot" class="form-input" type="text" value="${item.lot}">
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">Dia atual do ciclo</label>
          <input id="fh_curday" class="form-input" type="number" min="0" max="${item.totalDays}" value="${item.currentDay}">
        </div>
        <div class="form-field">
          <label class="form-label">Status</label>
          <select id="fh_status" class="form-select">
            <option value="growing" ${item.status === 'growing' ? 'selected' : ''}>Em Andamento</option>
            <option value="final" ${item.status === 'final' ? 'selected' : ''}>Fase Final</option>
            <option value="done" ${item.status === 'done' ? 'selected' : ''}>Colhida</option>
          </select>
        </div>
      </div>
    `;

    document.getElementById('formModalSave').onclick = () => {
      item.crop = document.getElementById('fh_crop').value.trim() || item.crop;
      item.lot = document.getElementById('fh_lot').value.trim() || item.lot;
      item.currentDay = parseInt(document.getElementById('fh_curday').value, 10) || item.currentDay;
      item.status = document.getElementById('fh_status').value;

      Logger.add('info', 'Safra Atualizada', `${item.crop} - ${item.lot} atualizada.`);
      closeFormModal();
      this.render();
    };

    document.getElementById('formModal').classList.add('show');
  },

  remove(id) {
    if (!this._canEdit()) {
      Modal.show('Acesso restrito', 'Visualizador pode apenas consultar as safras.', 'warning');
      return;
    }

    const item = this.items.find((entry) => entry.id === id);
    if (!item) return;
    if (!confirm(`Remover safra "${item.crop} - ${item.lot}"?`)) return;

    this.items = this.items.filter((entry) => entry.id !== id);
    Logger.add('warning', 'Safra Removida', `${item.crop} - ${item.lot} removida.`);
    this.render();
  },
};
