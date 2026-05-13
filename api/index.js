/**
 * @file api/index.js
 * @module vercelApi
 * @description Entrada serverless da Vercel para API Express.
 * @requisitos RF03, RF09, RF12
 * @ator Sistema
 * @mode real
 */

const createApp = require('../server/src/app');

const app = createApp();

module.exports = app;
