import pinoHttp from 'pino-http';

export const requestLogger = pinoHttp({
  level: process.env.LOG_LEVEL ?? 'info',
  autoLogging: {
    ignore: (req) => req.url === '/api/v1/health',
  },
  customLogLevel: (_req, res, _err) => {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
