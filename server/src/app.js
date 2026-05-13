/**
 * @file app.js
 * @module app
 * @description API principal em modo producao real com Supabase e bridge ESP32.
 * @requisitos RF01, RF02, RF03, RF07, RF08, RF09, RF10, RF12, RF13, RN06, RN07, RNF13
 * @ator Sistema
 * @mode real
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { getSupabase } = require('./integrations/supabase');
const { sendSuccess, sendError } = require('./utils/httpResponse');
const { autenticar } = require('./middlewares/authz');
const logger = require('./services/logger');
const makeAlertasService = require('./services/alertas.service');

const makeEspService = require('./services/espService');
const makeEspController = require('./controllers/espController');
const makeEspRouter = require('./routes/esp.routes');

const makeSensorsRepository = require('./repositories/sensorsRepository');
const makeSensorsService = require('./services/sensorsService');
const makeSensorsController = require('./controllers/sensorsController');
const makeSensorsRouter = require('./routes/sensors.routes');

const makeAlertsRepository = require('./repositories/alertsRepository');
const makeAlertsController = require('./controllers/alertsController');
const makeAlertsRouter = require('./routes/alerts.routes');

const makeLogsRepository = require('./repositories/logsRepository');
const makeLogsController = require('./controllers/logsController');
const makeLogsRouter = require('./routes/logs.routes');

const makeManualControlsService = require('./services/manualControlsService');
const makeManualControlsController = require('./controllers/manualControlsController');
const makeManualControlsRouter = require('./routes/manual-controls.routes');

const makeUsersService = require('./services/usersService');
const makeUsersController = require('./controllers/usersController');
const makeUsersRouter = require('./routes/users.routes');

function createApp() {
  const app = express();
  app.use(cors({ origin: config.CORS_ORIGINS }));
  app.use(express.json());

  const frontendPath = path.resolve(__dirname, '../../');
  app.use(express.static(frontendPath));

  app.get('/api', (req, res) => sendSuccess(res, 'API Astro Verde online.', { status: 'online' }));
  app.get('/api/health', (req, res) => sendSuccess(res, 'Servico online.', { status: 'ok', mode: 'real' }));

  const supabase = getSupabase();
  if (!supabase) {
    app.get('/api/auth/me', (req, res) => sendError(res, 'Supabase nao configurado no backend.', 500));
    app.use('/api', (req, res) => sendError(res, 'Supabase nao configurado no backend.', 500));
    app.use((req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
    return app;
  }

  const alertasService = makeAlertasService({ supabase, logger, config });
  const espService = makeEspService({ supabase, logger, alertasService });
  const espCtrl = makeEspController(espService);

  const sensorsRepo = makeSensorsRepository(supabase);
  const alertsRepo = makeAlertsRepository(supabase);
  const logsRepo = makeLogsRepository(supabase);
  const sensorsService = makeSensorsService(sensorsRepo, alertsRepo, logsRepo);

  const sensorsCtrl = makeSensorsController(sensorsService);
  const alertsCtrl = makeAlertsController(alertsRepo);
  const logsCtrl = makeLogsController(logsRepo);

  const defaultDeviceId = config.ESP_DEVICE_IDS[0] || 'astro-verde-esp';
  const manualService = makeManualControlsService({ supabase, espService, logger, defaultDeviceId });
  const manualCtrl = makeManualControlsController(manualService);

  const usersService = makeUsersService({ supabase });
  const usersCtrl = makeUsersController(usersService);

  app.get('/api/auth/me', autenticar, (req, res) => sendSuccess(res, 'Sessao valida.', { user: req.user }));
  app.use('/api/sensors', autenticar, makeSensorsRouter(sensorsCtrl));
  app.use('/api/alerts', autenticar, makeAlertsRouter(alertsCtrl));
  app.use('/api/logs', autenticar, makeLogsRouter(logsCtrl));
  app.use('/api/esp', autenticar, makeEspRouter(espCtrl));
  app.use('/api/manual-controls', autenticar, makeManualControlsRouter(manualCtrl));
  app.use('/api/users', autenticar, makeUsersRouter(usersCtrl));

  app.use('/api', (req, res) => sendError(res, 'Rota nao encontrada.', 404));
  app.use((req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
  return app;
}

module.exports = createApp;
