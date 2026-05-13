/**
 * @file api/[...path].js
 * @module vercelApiCatchAll
 * @description Catch-all serverless da Vercel para rotas /api/*.
 * @requisitos RF03, RF07, RF08, RF10, RF12, RF13
 * @ator Sistema
 * @mode real
 */

const createApp = require('../server/src/app');

const app = createApp();

module.exports = app;
