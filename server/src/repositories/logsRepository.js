/**
 * @file logsRepository.js
 * @module logsRepository
 * @description Acesso ao log operacional no Supabase.
 * @requisitos RF10
 * @ator Sistema
 * @mode real
 */

function makeLogsRepository(supabase) {
  return {
    async getRecent(limit = 50) {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return data || [];
    },

    async insert(level, category, message) {
      const { data, error } = await supabase
        .from('system_logs')
        .insert({
          level,
          category,
          message,
          metadata: null,
        })
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data || null;
    },
  };
}

module.exports = makeLogsRepository;
