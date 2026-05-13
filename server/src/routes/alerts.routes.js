/**
 * @file alerts.routes.js
 * @module alertsRoutes
 * @description Rotas de consulta e resolucao de alertas.
 * @requisitos RF07, RF08, RF12
 * @ator Operador, Visualizador
 * @mode real
 */

const express = require('express');
const { exigirPerfil } = require('../middlewares/authz');

function makeAlertsRouter(alertsController) {
  const router = express.Router();
  router.get('/', exigirPerfil('Visualizador'), (req, res) => alertsController.getActive(req, res));
  router.get('/history', exigirPerfil('Visualizador'), (req, res) => alertsController.getHistory(req, res));
  router.post('/:type/resolve', exigirPerfil('Operador'), (req, res) => alertsController.resolve(req, res));
  return router;
}

module.exports = makeAlertsRouter;
