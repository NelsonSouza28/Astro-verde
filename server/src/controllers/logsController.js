/*
 * controllers/logsController.js - Controller HTTP de logs operacionais.
 *
 * Exibe eventos gravados no backend para suporte e diagnostico.
 */

const { sendSuccess, sendError } = require('../utils/httpResponse');

function makeLogsController(logsRepo) {
  return {
    /* GET /api/logs - lista logs recentes do sistema. */
    async getRecent(req, res) {
      try {
        const limit = parseInt(req.query.limit, 10) || 50;
        const logs = await logsRepo.getRecent(limit);
        return sendSuccess(res, 'Logs carregados com sucesso.', { logs });
      } catch (err) {
        return sendError(res, err.message, 500);
      }
    },
  };
}

module.exports = makeLogsController;
