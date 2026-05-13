/**
 * @file sensors.routes.js
 * @module sensorsRoutes
 * @description Rotas de monitoramento e exportacao de sensores.
 * @requisitos RF03, RF08, RF10, RN10
 * @ator Operador, Visualizador
 * @mode real
 */

const express = require('express');
const { exigirPerfil } = require('../middlewares/authz');

function makeSensorsRouter(sensorsController) {
  const router = express.Router();
  router.get('/latest', exigirPerfil('Visualizador'), (req, res) => sensorsController.getLatest(req, res));
  router.get('/export/csv', exigirPerfil('Visualizador'), (req, res) => sensorsController.exportCsv(req, res));
  router.post('/telemetry', exigirPerfil('Operador'), (req, res) => sensorsController.ingestTelemetry(req, res));
  return router;
}

module.exports = makeSensorsRouter;
