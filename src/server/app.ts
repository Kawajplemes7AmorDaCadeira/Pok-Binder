import express, { Express } from 'express';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { apiRouter } from './routes';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(requestLogger);

  // Mount API router under /api
  app.use('/api', apiRouter);

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}
