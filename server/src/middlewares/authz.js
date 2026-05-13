/**
 * @file authz.js
 * @module authz
 * @description Autenticacao simplificada via Supabase Auth para sistema com usuario unico.
 * @requisitos RF09
 * @ator UsuarioUnico
 * @mode real
 */

const { getSupabase } = require('../integrations/supabase');

async function autenticar(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ status: 'error', message: 'Supabase auth nao configurado no backend.' });

    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const deviceToken = req.headers['x-device-token'];

    if (!token && deviceToken && req.originalUrl.startsWith('/api/esp')) {
      const { data, error } = await supabase
        .from('dispositivos')
        .select('id,device_id,nome,token,ativo')
        .eq('token', String(deviceToken))
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();

      if (error) return res.status(401).json({ status: 'error', message: 'Falha ao validar token do dispositivo.' });
      if (!data?.device_id) return res.status(401).json({ status: 'error', message: 'X-Device-Token invalido.' });

      req.user = {
        id: data.id,
        authId: data.id,
        nome: data.nome || data.device_id,
        email: `${data.device_id}@device.local`,
        perfil: 'Operador',
        deviceId: data.device_id,
        authType: 'device-token',
      };
      return next();
    }

    if (!token) return res.status(401).json({ status: 'error', message: 'Token ausente.' });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return res.status(401).json({ status: 'error', message: 'Token invalido.' });

    const email = userData.user.email || 'usuario@astroverde.local';
    req.user = {
      authId: userData.user.id,
      id: userData.user.id,
      nome: userData.user.user_metadata?.name || email.split('@')[0] || 'Usuario',
      email,
      perfil: 'Geral',
    };

    return next();
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

function exigirPerfil() {
  return (req, res, next) => next();
}

module.exports = { autenticar, exigirPerfil };
