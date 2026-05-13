/**
 * @file alertsRepository.js
 * @module alertsRepository
 * @description Acesso a dados de alertas no Supabase.
 * @requisitos RF07, RF08, RF12
 * @ator Sistema
 * @mode real
 */

function makeAlertsRepository(supabase) {
  return {
    async getActive() {
      const { data, error } = await supabase
        .from('alerta')
        .select('*')
        .is('resolvido_em', null)
        .order('aberto_em', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },

    async getAll(limit = 100) {
      const { data, error } = await supabase
        .from('alerta')
        .select('*')
        .order('aberto_em', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return data || [];
    },

    async upsert(alertType, severity, title, message) {
      const { data: existing, error: findError } = await supabase
        .from('alerta')
        .select('*')
        .eq('tipo', alertType)
        .is('resolvido_em', null)
        .order('aberto_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (findError) throw new Error(findError.message);
      if (existing) return existing;

      const { data, error } = await supabase
        .from('alerta')
        .insert({
          tipo: alertType,
          severidade: severity === 'critical' ? 'critico' : severity,
          mensagem: `${title}: ${message}`,
          critica: severity === 'critical',
          canal: 'dashboard',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async resolve(alertType) {
      const { error } = await supabase
        .from('alerta')
        .update({ resolvido_em: new Date().toISOString() })
        .eq('tipo', alertType)
        .is('resolvido_em', null);
      if (error) throw new Error(error.message);
    },
  };
}

module.exports = makeAlertsRepository;
