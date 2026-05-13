/**
 * @file users.js
 * @module users
 * @description Gestao de usuarios e perfis (somente Administrador) com fallback Supabase direto.
 * @requisitos RF09, RN05
 * @ator Administrador
 * @mode real
 */

const Users = {
  _supabaseClient() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return null;
    return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  },

  async _listUsers() {
    try {
      const data = await ApiService.listUsers();
      return data?.users || [];
    } catch (_) {
      const client = this._supabaseClient();
      if (!client) throw new Error('Supabase indisponivel.');
      const { data, error } = await client
        .from('usuario')
        .select('id,nome,email,perfil,auth_user_id,created_at')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }
  },

  async _updateRole(id, perfil) {
    try {
      await ApiService.updateUserRole(id, perfil);
      return;
    } catch (_) {
      const client = this._supabaseClient();
      if (!client) throw new Error('Supabase indisponivel para atualizar perfil.');
      const { error } = await client.from('usuario').update({ perfil }).eq('id', id);
      if (error) throw new Error(error.message);
    }
  },

  async render() {
    const container = document.getElementById('usersList');
    if (!container) return;

    if (AppState.auth.user?.perfil !== 'Administrador') {
      container.innerHTML = '<div class="list-item"><div class="item-info"><h4>Acesso restrito</h4><p>Somente Administrador pode gerenciar usuarios.</p></div></div>';
      return;
    }

    try {
      const users = await this._listUsers();
      if (!users.length) {
        container.innerHTML = '<div class="list-item"><div class="item-info"><p>Nenhum usuario cadastrado.</p></div></div>';
        return;
      }

      container.innerHTML = users.map((u) => `
        <div class="list-item">
          <div class="item-info"><h4>${u.nome}</h4><p>${u.email}</p></div>
          <div class="manual-control-fields">
            <select data-user-role="${u.id}" class="form-select">
              <option value="Visualizador" ${u.perfil === 'Visualizador' ? 'selected' : ''}>Visualizador</option>
              <option value="Operador" ${u.perfil === 'Operador' ? 'selected' : ''}>Operador</option>
              <option value="Administrador" ${u.perfil === 'Administrador' ? 'selected' : ''}>Administrador</option>
            </select>
            <button class="btn btn-primary" data-user-save="${u.id}" type="button">Salvar</button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('[data-user-save]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-user-save');
          const roleEl = container.querySelector(`[data-user-role="${id}"]`);
          await this._updateRole(id, roleEl.value);
          Modal.show('Perfil atualizado', 'Permissao alterada com sucesso.', 'success');
        });
      });
    } catch (error) {
      container.innerHTML = '<div class="list-item"><div class="item-info"><p>Falha ao carregar usuarios.</p></div></div>';
      Logger.add('error', 'users', error.message);
    }
  },

  bindCreate() {
    document.getElementById('btnCriarUsuario')?.addEventListener('click', async () => {
      if (AppState.auth.user?.perfil !== 'Administrador') {
        Modal.show('Sem permissao', 'Somente Administrador pode criar usuarios.', 'warning');
        return;
      }
      const payload = {
        nome: document.getElementById('novoNome')?.value?.trim(),
        email: document.getElementById('novoEmail')?.value?.trim(),
        senha: document.getElementById('novaSenha')?.value,
        perfil: document.getElementById('novoPerfil')?.value,
      };

      try {
        await ApiService.createUser(payload);
        Modal.show('Usuario criado', 'Novo acesso criado com sucesso.', 'success');
        this.render();
      } catch (error) {
        Modal.show(
          'Criacao indisponivel aqui',
          'Use o painel Authentication do Supabase para criar o login e depois vincule perfil na tabela usuario.',
          'warning',
        );
        Logger.add('warning', 'users', `Criacao via API indisponivel: ${error.message}`);
      }
    });
  },

  init() {
    this.bindCreate();
  },
};
