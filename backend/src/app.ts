import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger } from './middleware/logger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import sessionsRouter from './routes/sessions.router.js';
import { testConnection } from './db/pool.js';

export function createApp() {
  const app = express();

  // ─── Security ──────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  }));

  // ─── Request handling ───────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);
  app.use(rateLimiter);

  // ─── Health check ───────────────────────────────────────────
  app.get('/api/v1/health', async (_req, res) => {
    const dbOk = await testConnection();
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Routes ────────────────────────────────────────────────
  app.use('/api/v1/sessions', sessionsRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
