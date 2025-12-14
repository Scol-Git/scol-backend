// api/index.ts - Vercel Serverless Function Entrypoint
import type { IncomingMessage, ServerResponse } from 'http';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { initSentry } from '../src/APP.Infrastructure/monitoring/sentry';

// Initialize Sentry before anything else
initSentry();

// Lazy-initialize the Nest app once and reuse across invocations
let cachedHandler: express.Express | null = null;

async function getHandler(): Promise<express.Express> {
  if (cachedHandler) {
    return cachedHandler;
  }

  const server = express();
  const expressAdapter = new ExpressAdapter(server);

  // Import bootstrap dynamically to ensure Sentry is initialized first
  const { createNestApp } = await import('../src/bootstrap');
  await createNestApp({ expressAdapter });

  cachedHandler = server;
  return server;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const server = await getHandler();
  server(req, res);
}

