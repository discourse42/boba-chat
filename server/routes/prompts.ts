import express from 'express';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import type { Request, Response } from 'express';

const router = express.Router();

// Get available prompts
router.get('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  try {
    const promptsDir = join(process.cwd(), 'prompts');
    const files = await readdir(promptsDir);
    const markdownFiles = files
      .filter(file => file.endsWith('.md'))
      .map(file => ({
        name: file.replace('.md', ''),
        filename: file
      }));

    res.json(markdownFiles);
  } catch (error) {
    // If prompts directory doesn't exist, return empty array
    res.json([]);
  }
}));

// Get specific prompt content
router.get('/:promptName', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { promptName } = req.params;

  // Validate prompt name (alphanumeric, hyphens, underscores only)
  if (!/^[a-zA-Z0-9_-]+$/.test(promptName)) {
    throw createError('Invalid prompt name', 400);
  }

  try {
    const promptPath = join(process.cwd(), 'prompts', `${promptName}.md`);
    const content = await readFile(promptPath, 'utf-8');

    res.json({
      name: promptName,
      content: content.trim()
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw createError('Prompt not found', 404);
    }
    throw error;
  }
}));

export { router as promptRoutes };