import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth';
import { chatRoutes } from './routes/chat';
import { sessionRoutes } from './routes/sessions';
import { promptRoutes } from './routes/prompts';
import { DatabaseService } from './services/database';
import { errorHandler } from './middleware/errorHandler';
import type { Request, Response } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Validate required environment variables
if (!process.env.VITE_ANTHROPIC_API_KEY) {
  console.error('ERROR: Missing required VITE_ANTHROPIC_API_KEY environment variable');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('ERROR: Missing required JWT_SECRET environment variable');
  process.exit(1);
}

// Initialize database
await DatabaseService.initialize();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://api.anthropic.com"]
    },
    reportOnly: false,
    useDefaults: false
  },
  hsts: false, // nginx handles SSL
  contentTypeOptions: true,
  frameguard: true,
  xssFilter: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many API requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true, // Allow all origins in development
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(limiter);

// API routes
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/prompts', promptRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
  
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

// Error handling
app.use(errorHandler);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;