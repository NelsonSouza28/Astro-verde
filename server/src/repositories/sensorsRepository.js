/**
 * @file sensorsRepository.js
 * @module sensorsRepository
 * @description Acesso a leituras e configuracoes de sensores no Supabase.
 * @requisitos RN01, RN06, RN10
 * @ator Sistema
 * @mode real
 */

function makeSensorsRepository(supabase) {
  return {
    async getLatest(limit = 50) {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return data || [];
    },

    async getByType(sensorType, hours = 24) {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('sensor', sensorType)
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(1000);
      if (error) throw new Error(error.message);
      return data || [];
    },

    async insertReading({ device_id: deviceId, sensor, value, source = 'real', timestamp }) {
      const createdAt = timestamp || new Date().toISOString();
      const row = {
        device_id: deviceId,
        sensor,
        value: { value, timestamp: createdAt },
        source,
        created_at: createdAt,
        timestamp_device: createdAt,
      };
      const { data, error } = await supabase.from('sensor_readings').insert(row).select().single();
      if (error) throw new Error(error.message);
      return data;
    },

    async exportRows(hours = 24) {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },

    async getConfigMap() {
      const out = {};

      const { data: culturas, error: culturasErr } = await supabase
        .from('culturas')
        .select('ph_min,ph_max')
        .order('created_at', { ascending: false })
        .limit(1);
      if (culturasErr) throw new Error(culturasErr.message);

      if (culturas?.length) {
        out.ph_min = Number(culturas[0].ph_min);
        out.ph_max = Number(culturas[0].ph_max);
      }

      const { data: modulo, error: moduloErr } = await supabase
        .from('modulo_nft')
        .select('fluxo_minimo')
        .order('created_at', { ascending: false })
        .limit(1);
      if (moduloErr) throw new Error(moduloErr.message);

      if (modulo?.length) {
        out.fluxo_minimo = Number(modulo[0].fluxo_minimo);
      }

      return out;
    },
  };
}

module.exports = makeSensorsRepository;
