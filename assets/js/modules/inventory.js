/**
 * @file inventory.js
 * @module inventory
 * @description Gestao de insumos com modo consulta para Visualizador e edicao para Operador/Administrador.
 * @requisitos RF11, RN09, RN05
 * @ator Administrador, Operador, Visualizador
 * @mode real
 */

const Inventory = {
  items: [
    { id: 1, name: 'Solucao Nutritiva A (Macronutrientes)', quantity: 15, unit: 'L', minStock: 5 },
    { id: 2, name: 'Solucao Nutritiva B (Micronutrientes)', quantity: 12, unit: 'L', minStock: 5 },
    { id: 3, name: 'Solucao Redutora de pH', quantity: 2, unit: 'L', minStock: 3 },
    { id: 4, name: 'Sementes - Alface Crespa', quantity: 5000, unit: 'un', minStock: 1000 },
  ],

  _nextId: 5,

  _canEdit() {
    return (typeof Auth !== 'undefined') ? Auth.isOperadorOuAdmin() : true;
  },

  init() {
    const container = document.getElementById('inventoryList');
    if (!container || container.dataset.bound === 'true') return;

    container.dataset.bound = 'true';
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-inventory-action]');
      if (!button) return;

      if (!this._canEdit()) {
        Modal.show('Acesso restrito', 'Visualizador pode apenas consultar o estoque.', 'warning');
        return;
      }

      const itemId = Number(button.dataset.id);
      if (button.dataset.inventoryAction === 'edit') this.openEditForm(itemId);
      if (button.dataset.inventoryAction === 'remove') this.remove(itemId);
    });
  },

  render() {
    const container = document.getElementById('inventoryList');
    if (!container) return;

    if (this.items.length === 0) {
      container.innerHTML = '<div class="list-item"><div class="item-info"><p>Nenhum insumo cadastrado.</p></div></div>';
      return;
    }

    const canEdit = this._canEdit();
    container.innerHTML = '';
    this.items.forEach((item) => {
      const isLow = item.quantity <= item.minStock;
      const div = document.createElement('div');
      div.className = `list-item${isLow ? ' list-item-warning' : ''}`;
      div.innerHTML = `
        <div class="item-info">
          <h4>${item.name}</h4>
          <p>Quantidade: ${item.quantity} ${item.unit} | Minimo: ${item.minStock} ${item.unit}</p>
        </div>
        <div class="item-actions">
          <span class="badge-status ${isLow ? 'warning' : 'active'}">${isLow ? 'Estoque Baixo' : 'Estoque OK'}</span>
          ${canEdit ? `<button class="btn btn-primary btn-sm" type="button" data-inventory-action="edit" data-id="${item.id}">Editar</button>
          <button class="btn btn-danger btn-sm" type="button" data-inventory-action="remove" data-id="${item.id}">Remover</button>` : ''}
        </div>
      `;
      container.appendChild(div);
    });
  },

  openAddForm() {
    if (!this._canEdit()) {
      Modal.show('Acesso restrito', 'Visualizador pode apenas consultar o estoque.', 'warning');
      return;
    }

    document.getElementById('formModalTitle').textContent = 'Novo Insumo';
    document.getElementById('formModalBody').innerHTML = `
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">Nome do Insumo</label>
          <input id="fi_name" class="form-input" type="text" placeholder="Ex: Solucao Nutritiva A">
        </div>
        <div class="form-row-2">
          <div class="form-field">
            <label class="form-label">Quantidade</label>
            <input id="fi_qty" class="form-input" type="number" min="0" placeholder="0">
          </div>
          <div class="form-field">
            <label class="form-label">Unidade</label>
            <select id="fi_unit" class="form-select">
              <option value="L">L (litros)</option>
              <option value="mL">mL</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="un">un (unidades)</option>
            </select>
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">Estoque Minimo (alerta abaixo disso)</label>
          <input id="fi_min" class="form-input" type="number" min="0" placeholder="0">
        </div>
      </div>
    `;

    document.getElementById('formModalSave').onclick = () => {
      const name = document.getElementById('fi_name').value.trim();
      const qty = parseFloat(document.getElementById('fi_qty').value);
      const unit = document.getElementById('fi_unit').value;
      const min = parseFloat(document.getElementById('fi_min').value) || 0;

      if (!name) {
        Modal.show('Campo obrigatorio', 'Informe o nome do insumo.', 'warning');
        return;
      }

      if (Number.isNaN(qty) || qty < 0) {
        Modal.show('Valor invalido', 'Informe uma quantidade valida.', 'warning');
        return;
      }

      this.items.push({ id: this._nextId++, name, quantity: qty, unit, minStock: min });
      Logger.add('success', 'Insumo Adicionado', `${name} (${qty} ${unit}) cadastrado.`);
      closeFormModal();
      this.render();
    };

    document.getElementById('formModal').classList.add('show');
  },

  openEditForm(id) {
    if (!this._canEdit()) {
      Modal.show('Acesso restrito', 'Visualizador pode apenas consultar o estoque.', 'warning');
      return;
    }

    const item = this.items.find((entry) => entry.id === id);
    if (!item) return;

    document.getElementById('formModalTitle').textContent = 'Editar Insumo';
    document.getElementById('formModalBody').innerHTML = `
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">Nome do Insumo</label>
          <input id="fi_name" class="form-input" type="text" value="${item.name}">
        </div>
        <div class="form-row-2">
          <div class="form-field">
            <label class="form-label">Quantidade</label>
            <input id="fi_qty" class="form-input" type="number" min="0" value="${item.quantity}">
          </div>
          <div class="form-field">
            <label class="form-label">Unidade</label>
            <input id="fi_unit" class="form-input" type="text" value="${item.unit}">
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">Estoque Minimo</label>
          <input id="fi_min" class="form-input" type="number" min="0" value="${item.minStock}">
        </div>
      </div>
    `;

    document.getElementById('formModalSave').onclick = () => {
      const name = document.getElementById('fi_name').value.trim();
      const qty = parseFloat(document.getElementById('fi_qty').value);
      const unit = document.getElementById('fi_unit').value.trim() || item.unit;
      const min = parseFloat(document.getElementById('fi_min').value) || 0;

      if (!name) {
        Modal.show('Campo obrigatorio', 'Informe o nome.', 'warning');
        return;
      }

      if (Number.isNaN(qty) || qty < 0) {
        Modal.show('Valor invalido', 'Informe uma quantidade valida.', 'warning');
        return;
      }

      item.name = name;
      item.quantity = qty;
      item.unit = unit;
      item.minStock = min;

      Logger.add('info', 'Insumo Atualizado', `${name} atualizado para ${qty} ${unit}.`);
      closeFormModal();
      this.render();
    };

    document.getElementById('formModal').classList.add('show');
  },

  remove(id) {
    if (!this._canEdit()) {
      Modal.show('Acesso restrito', 'Visualizador pode apenas consultar o estoque.', 'warning');
      return;
    }

    const item = this.items.find((entry) => entry.id === id);
    if (!item) return;
    if (!confirm(`Remover "${item.name}"?`)) return;

    this.items = this.items.filter((entry) => entry.id !== id);
    Logger.add('warning', 'Insumo Removido', `${item.name} removido do estoque.`);
    this.render();
  },
};
