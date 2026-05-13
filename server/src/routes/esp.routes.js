/**
 * @module espRoutes
 * @description Rotas do bridge ESP para telemetria e fila de comandos.
 * @hardware esp32/esp8266
 * @mode real
 */

const express = require('express');
const { exigirPerfil } = require('../middlewares/authz');

function makeEspRouter(espController) {
  const router = express.Router();
  router.post('/leitura', exigirPerfil('Operador'), (req, res) => espController.postLeitura(req, res));
  router.get('/comandos/:device_id', exigirPerfil('Operador'), (req, res) => espController.getComandos(req, res));
  router.post('/ack', exigirPerfil('Operador'), (req, res) => espController.postAck(req, res));
  router.get('/status', exigirPerfil('Visualizador'), (req, res) => espController.getStatus(req, res));
  router.get('/historico/:sensor', exigirPerfil('Visualizador'), (req, res) => espController.getHistorico(req, res));

  /* compatibilidade temporaria com rotas antigas */
  router.post('/data', exigirPerfil('Operador'), (req, res) => espController.postLeitura(req, res));
  router.get('/commands/:device_id', exigirPerfil('Operador'), (req, res) => espController.getComandos(req, res));
  return router;
}

module.exports = makeEspRouter;
