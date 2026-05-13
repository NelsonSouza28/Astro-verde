/**
 * @module manualControlsRoutes
 * @description Rotas de fluxo laminar e iluminacao editaveis.
 * @hardware bomba/iluminacao
 * @mode editable
 */

const express = require('express');
const { exigirPerfil } = require('../middlewares/authz');

function makeManualControlsRouter(controller) {
  const router = express.Router();
  router.post('/fluxo', exigirPerfil('Operador'), (req, res) => controller.setFluxo(req, res));
  router.post('/luz', exigirPerfil('Operador'), (req, res) => controller.setLuz(req, res));
  return router;
}

module.exports = makeManualControlsRouter;
