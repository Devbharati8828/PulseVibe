import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  max: Number(process.env.RATE_LIMIT_MAX ?? 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests — please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});
