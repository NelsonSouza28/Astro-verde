/**
 * @file usersService.js
 * @module usersService
 * @description Gestao de usuarios e perfis via Supabase Auth + tabela usuario.
 * @requisitos RF09, RN05
 * @ator Administrador
 * @mode real
 */

function makeUsersService({ supabase }) {
  async function listarUsuarios() {
    const { data, error } = await supabase
      .from('usuario')
      .select('id,nome,email,perfil,auth_user_id,created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async function criarUsuario({ nome, email, senha, perfil }) {
    if (!nome || !email || !senha || !perfil) throw new Error('nome, email, senha e perfil sao obrigatorios.');
    const perfis = new Set(['Administrador', 'Operador', 'Visualizador']);
    if (!perfis.has(perfil)) throw new Error('Perfil invalido.');

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (authErr) throw new Error(authErr.message);

    const { data, error } = await supabase
      .from('usuario')
      .insert({ nome, email, perfil, auth_user_id: authData.user.id })
      .select('id,nome,email,perfil,auth_user_id,created_at')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async function atualizarPerfil(id, perfil) {
    const perfis = new Set(['Administrador', 'Operador', 'Visualizador']);
    if (!perfis.has(perfil)) throw new Error('Perfil invalido.');

    const { data, error } = await supabase
      .from('usuario')
      .update({ perfil })
      .eq('id', id)
      .select('id,nome,email,perfil,auth_user_id,created_at')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  return { listarUsuarios, criarUsuario, atualizarPerfil };
}

module.exports = makeUsersService;
