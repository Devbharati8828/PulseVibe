import { sessionRepository } from '../repositories/sessions.repository.js';
import type {
  CreateSessionDTO,
  SessionResponseDTO,
  PaginatedSessionsResponse,
} from '../types/session.types.js';
import { toResponseDTO } from '../types/session.types.js';
import type { GetSessionsQuery } from '../validation/session.schema.js';

export class SessionsService {
  async createSession(dto: CreateSessionDTO): Promise<SessionResponseDTO> {
    // Check for duplicate
    const existing = await sessionRepository.findById(dto.id);
    if (existing) {
      return toResponseDTO(existing);
    }

    await sessionRepository.create(dto);

    const created = await sessionRepository.findById(dto.id);
    if (!created) {
      throw new Error('Session creation failed — record not found after insert');
    }
    return toResponseDTO(created);
  }

  async getSession(id: string): Promise<SessionResponseDTO | null> {
    const row = await sessionRepository.findById(id);
    return row ? toResponseDTO(row) : null;
  }

  async getSessions(query: GetSessionsQuery): Promise<PaginatedSessionsResponse> {
    const { rows, total } = await sessionRepository.findAll({
      limit: query.limit,
      offset: query.offset,
      validOnly: query.validOnly,
    });

    return {
      data: rows.map(toResponseDTO),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async deleteSession(id: string): Promise<boolean> {
    return sessionRepository.deleteById(id);
  }

  async clearAllSessions(): Promise<number> {
    return sessionRepository.deleteAll();
  }
}

export const sessionsService = new SessionsService();
