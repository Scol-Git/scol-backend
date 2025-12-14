// api/index.js - Vercel Serverless Function Entrypoint
// This file imports from the pre-built dist/ folder to ensure path aliases are resolved
const express = require('express');
const { ExpressAdapter } = require('@nestjs/platform-express');

// Initialize Sentry before anything else
const { initSentry } = require('../dist/APP.Infrastructure/monitoring/sentry');
initSentry();

// Lazy-initialize the Nest app once and reuse across invocations
let cachedHandler = null;

async function getHandler() {
  if (cachedHandler) {
    return cachedHandler;
  }

  const server = express();
  const expressAdapter = new ExpressAdapter(server);

  // Import bootstrap from compiled dist folder
  const { createNestApp } = require('../dist/bootstrap');
  await createNestApp({ expressAdapter });

  cachedHandler = server;
  return server;
}

module.exports = async function handler(req, res) {
  const server = await getHandler();
  server(req, res);
};

