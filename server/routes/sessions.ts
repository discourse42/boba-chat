import express from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { DatabaseService } from '../services/database';
import { asyncHandler, createError } from '../middleware/errorHandler';
import type { Response } from 'express';

const router = express.Router();

// Get all sessions (visible to all authenticated users)
router.get('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Since all users share the same login, show all sessions
  const db = await DatabaseService.getDb();
  const sessions = await db.all(
    'SELECT * FROM sessions ORDER BY updated_at DESC'
  );
  
  res.json(sessions);
}));

// Get a specific session with messages (visible to all authenticated users)
router.get('/:sessionId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.params;

  const session = await DatabaseService.getSession(sessionId);
  
  if (!session) {
    throw createError('Session not found', 404);
  }

  // All authenticated users can view any session
  const messages = await DatabaseService.getMessagesBySessionId(sessionId);

  res.json({
    session,
    messages
  });
}));

// Create a new session
router.post('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title } = req.body;
  const userId = req.user!.id;

  if (!title?.trim()) {
    throw createError('Session title is required', 400);
  }

  const sessionId = await DatabaseService.createSession(userId, title.trim());
  const session = await DatabaseService.getSession(sessionId);

  res.status(201).json(session);
}));

// Update session title
router.patch('/:sessionId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.params;
  const { title } = req.body;
  const userId = req.user!.id;

  if (!title?.trim()) {
    throw createError('Session title is required', 400);
  }

  const session = await DatabaseService.getSession(sessionId);
  
  if (!session) {
    throw createError('Session not found', 404);
  }

  if (session.user_id !== userId) {
    throw createError('Access denied', 403);
  }

  const db = await DatabaseService.getDb();
  await db.run('UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title.trim(), sessionId]);

  const updatedSession = await DatabaseService.getSession(sessionId);
  res.json(updatedSession);
}));

// Delete a session
router.delete('/:sessionId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user!.id;

  const session = await DatabaseService.getSession(sessionId);
  
  if (!session) {
    throw createError('Session not found', 404);
  }

  if (session.user_id !== userId) {
    throw createError('Access denied', 403);
  }

  await DatabaseService.deleteSession(sessionId);

  res.json({ message: 'Session deleted successfully' });
}));

export { router as sessionRoutes };