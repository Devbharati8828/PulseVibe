import type { Request, Response, NextFunction } from 'express';
import { sessionsService } from '../services/sessions.service.js';
import { CreateSessionSchema, GetSessionsQuerySchema } from '../validation/session.schema.js';
import type { CreateSessionDTO } from '../types/session.types.js';

export class SessionsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = CreateSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const dto: CreateSessionDTO = parsed.data;
      const session = await sessionsService.createSession(dto);
      res.status(201).json({ data: session });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = GetSessionsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid query parameters', code: 'VALIDATION_ERROR' });
        return;
      }

      const result = await sessionsService.getSessions(parsed.data);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await sessionsService.getSession(req.params.id);
      if (!session) {
        res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
        return;
      }
      res.json({ data: session });
    } catch (err) {
      next(err);
    }
  }

  async deleteOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = await sessionsService.deleteSession(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async deleteAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await sessionsService.clearAllSessions();
      res.json({ message: `Deleted ${count} session(s)` });
    } catch (err) {
      next(err);
    }
  }
}

export const sessionsController = new SessionsController();
