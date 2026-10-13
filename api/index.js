/**
 * Vercel Serverless Function Entrypoint
 * Forwards requests to Express application
 */

const app = require('../backend/server');

module.exports = app;
