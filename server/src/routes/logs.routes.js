/**
 * @file logs.routes.js
 * @module logsRoutes
 * @description Rotas de historico operacional do sistema.
 * @requisitos RF10
 * @ator Visualizador
 * @mode real
 */

const express = require('express');
const { exigirPerfil } = require('../middlewares/authz');

function makeLogsRouter(logsController) {
  const router = express.Router();
  router.get('/', exigirPerfil('Visualizador'), (req, res) => logsController.getRecent(req, res));
  return router;
}

module.exports = makeLogsRouter;
