import express from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/database';
import { generateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import type { Request, Response } from 'express';

const router = express.Router();

interface LoginRequest {
  username: string;
  password: string;
}

// Login endpoint
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { username, password }: LoginRequest = req.body;

  if (!username || !password) {
    throw createError('Username and password are required', 400);
  }

  const isValid = await DatabaseService.validatePassword(username, password);
  
  if (!isValid) {
    throw createError('Invalid credentials', 401);
  }

  const user = await DatabaseService.getUserByUsername(username);
  
  if (!user) {
    throw createError('User not found', 404);
  }

  const token = generateToken({ id: user.id, username: user.username });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username
    }
  });
}));

// Verify token endpoint
router.post('/verify', asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    throw createError('Token is required', 400);
  }

  try {
    const secret = process.env.JWT_SECRET!;
    
    if (!secret) {
      console.error('JWT_SECRET not found in environment');
      throw createError('Server configuration error', 500);
    }
    
    const decoded = jwt.verify(token, secret) as { id: number; username: string };
    
    // Verify user still exists
    const user = await DatabaseService.getUserByUsername(decoded.username);
    
    if (!user) {
      throw createError('User no longer exists', 404);
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    throw createError('Invalid token', 401);
  }
}));

export { router as authRoutes };