/**
 * @file auth.js
 * @module auth
 * @description Autenticacao simplificada para sistema geral com usuario unico.
 * @requisitos RF09
 * @ator UsuarioUnico
 * @mode real
 */

const Auth = {
  client: null,

  init() {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) return;
    this.client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const logout = document.getElementById('btnLogout');
    if (logout) logout.addEventListener('click', () => this.logout());
  },

  async bootSession() {
    if (!this.client) return false;
    const { data } = await this.client.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return false;
    return this.applySession(token);
  },

  async applySession(accessToken) {
    AppState.auth.accessToken = accessToken;
    try {
      const { data, error } = await this.client.auth.getUser(accessToken);
      if (error || !data?.user?.id) throw new Error('Sessao invalida');

      const email = data.user.email || 'usuario@astroverde.local';
      AppState.auth.user = {
        id: data.user.id,
        authId: data.user.id,
        nome: (data.user.user_metadata?.name || email.split('@')[0] || 'Usuario').toString(),
        email,
        perfil: 'Geral',
      };

      this.applyUserUi();
      return true;
    } catch (_) {
      AppState.auth.accessToken = null;
      AppState.auth.user = null;
      return false;
    }
  },

  applyUserUi() {
    const avatar = document.querySelector('.user-avatar');
    if (avatar) {
      const nome = AppState.auth.user?.nome || 'US';
      avatar.textContent = nome.slice(0, 2).toUpperCase();
      avatar.title = 'Usuario do Sistema';
    }
    this.applyPermissions();
  },

  getPerfil() {
    return 'Geral';
  },

  isAdministrador() {
    return true;
  },

  isOperadorOuAdmin() {
    return true;
  },

  canAccessTab(tabId) {
    return tabId !== 'usuarios';
  },

  applyPermissions() {
    const usersTab = document.querySelector('.nav-item[data-tab="usuarios"]');
    if (usersTab) usersTab.style.display = 'none';

    const editSelectors = [
      '[data-ui-action="inventory-add"]',
      '[data-ui-action="harvest-add"]',
      '[data-ui-action="save-wpp"]',
      '[data-ui-action="save-interval"]',
      '[data-ui-action="check-esp-device"]',
      '[data-ui-action="cmd-pump-on"]',
      '[data-ui-action="cmd-pump-off"]',
      '[data-ui-action="cmd-light-on"]',
      '[data-ui-action="cmd-light-off"]',
      '[data-ui-action="send-test-notif"]',
      '#btnSalvarFluxo',
      '#btnSalvarLuz',
      '#btnCriarUsuario',
    ];

    document.querySelectorAll(editSelectors.join(',')).forEach((el) => {
      el.disabled = false;
    });
  },

  async logout() {
    if (this.client) await this.client.auth.signOut();
    AppState.auth.accessToken = null;
    AppState.auth.user = null;
    window.location.href = 'login.html';
  },
};

window.Auth = Auth;
