import { Router } from 'express';
import { sessionsController } from '../controllers/sessions.controller.js';

const router = Router();

// POST   /api/v1/sessions        — save a completed session
router.post('/', (req, res, next) => sessionsController.create(req, res, next));

// GET    /api/v1/sessions        — list all sessions (paginated)
router.get('/', (req, res, next) => sessionsController.getAll(req, res, next));

// DELETE /api/v1/sessions        — clear all sessions
router.delete('/', (req, res, next) => sessionsController.deleteAll(req, res, next));

// GET    /api/v1/sessions/:id    — get one session
router.get('/:id', (req, res, next) => sessionsController.getOne(req, res, next));

// DELETE /api/v1/sessions/:id   — delete one session
router.delete('/:id', (req, res, next) => sessionsController.deleteOne(req, res, next));

export default router;
