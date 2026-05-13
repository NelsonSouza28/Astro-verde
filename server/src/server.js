/**
 * @module server
 * @description Bootstrap do backend com operacao real, bridge ESP e bot Telegram.
 * @hardware esp32/esp8266
 * @mode real
 */

const createApp = require('./app');
const config = require('./config');
const { getSupabase } = require('./integrations/supabase');
const makeEspService = require('./services/espService');
const makeAlertasService = require('./services/alertas.service');
const logger = require('./services/logger');
const { startTelegramBot } = require('./services/telegramBot');

const app = createApp();

const supabase = getSupabase();
let bot = null;
let offlineTimer = null;
if (supabase) {
  const alertasService = makeAlertasService({ supabase, logger, config });
  const espService = makeEspService({ supabase, logger, alertasService });
  bot = startTelegramBot({ supabase, espService, logger });
  offlineTimer = setInterval(async () => {
    try {
      await alertasService.verificarDispositivosOffline();
    } catch (error) {
      await logger.error('esp', 'Falha na verificacao periodica de dispositivos offline.', { message: error.message });
    }
  }, 60 * 1000);
}

const server = app.listen(config.PORT, () => {
  console.log(`Astro Verde backend online em http://localhost:${config.PORT}`);
});

process.on('SIGINT', () => {
  if (offlineTimer) clearInterval(offlineTimer);
  if (bot) bot.stopPolling();
  server.close(() => process.exit(0));
});
