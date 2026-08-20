import { Router } from 'express';
import { aiRouter } from './ai.routes';
import { cardRouter } from './cards.routes';
import { setRouter } from './sets.routes';
import { adminRouter } from './admin.routes';

export const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'PokéBinder',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular sub-routers
// Preserves exact frontend paths: /api/sets, /api/cards, /api/gemini, /api/admin
apiRouter.use('/sets', setRouter);
apiRouter.use('/cards', cardRouter);
apiRouter.use('/gemini', aiRouter);
apiRouter.use('/admin', adminRouter);
