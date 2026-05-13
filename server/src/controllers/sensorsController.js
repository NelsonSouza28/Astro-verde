/*
 * controllers/sensorsController.js - Controller HTTP de sensores.
 *
 * Responsabilidade:
 * - receber requisicoes HTTP de sensores
 * - chamar a camada de servico
 * - devolver resposta padronizada
 */

const { sendSuccess, sendError } = require('../utils/httpResponse');

function makeSensorsController(sensorsService) {
  return {
    /* GET /api/sensors/latest - leitura mais recente para dashboard. */
    async getLatest(req, res) {
      try {
        const data = await sensorsService.getLatestReading();
        return sendSuccess(res, 'Leitura mais recente carregada com sucesso.', data);
      } catch (err) {
        return sendError(res, err.message, 500);
      }
    },

    /*
     * POST /api/telemetry - endpoint para telemetria do ESP32.
     *
     * Payload esperado:
     * {
     *   "device_id": "astroverde-node-01",
     *   "ph": 6.18,
     *   "ec": 1.74,
     *   "temperature": 23.5,
     *   "humidity": 65,
     *   "luminosity": 820,
     *   "nft_flow": true,
     *   "is_retransmit": false
     * }
     */
    async ingestTelemetry(req, res) {
      try {
        const data = await sensorsService.ingestTelemetry(req.body);
        return sendSuccess(res, 'Telemetria recebida com sucesso.', data, 201);
      } catch (err) {
        return sendError(res, err.message, 400);
      }
    },

    /* GET /api/sensors/export/csv - exporta historico bruto em CSV. */
    async exportCsv(req, res) {
      try {
        const rows = await sensorsService.getExportData();
        const header = 'device_id,sensor,valor,source,created_at,timestamp_device\n';
        const body = rows.map((row) =>
          `${row.device_id},${row.sensor},${JSON.stringify(row.value ?? {})},${row.source || ''},${row.created_at || ''},${row.timestamp_device || ''}`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="astroverde-export.csv"');
        return res.send(header + body);
      } catch (err) {
        return sendError(res, err.message, 500);
      }
    },
  };
}

module.exports = makeSensorsController;
