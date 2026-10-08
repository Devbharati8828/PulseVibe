import 'dotenv/config';
import { createApp } from './app.js';
import { runMigrations } from './db/migrate.js';
import cors from 'cors';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const PORT = Number(process.env.PORT ?? 3001);

async function bootstrap() {
  try {
    // Run database migrations on startup
    logger.info('[server] Running database migrations...');
    await runMigrations();
    logger.info('[server] Migrations complete');

    const app = createApp((app) => {
      app.use(cors({
        origin: [
          "http://localhost:5173",
          "https://pulse-vibe-rho.vercel.app"
        ],
        credentials: true
      }));
    });

    app.listen(PORT, () => {
      logger.info(`[server] PulseVibe API listening on http://localhost:${PORT}`);
      logger.info(`[server] Health: http://localhost:${PORT}/api/v1/health`);
      logger.info(`[server] Sessions: http://localhost:${PORT}/api/v1/sessions`);
    });
  } catch (err) {
    logger.error(err, '[server] Failed to start');
    process.exit(1);
  }
}

bootstrap();
 
