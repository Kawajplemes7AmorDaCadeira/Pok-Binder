import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { createRateLimiter } from '../middleware/rateLimit';

export const aiRouter = Router();

// Rate limit AI calls: max 20 requests per minute per IP
const aiLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 20 });

// AI Deck Generation
aiRouter.post('/generate-deck', aiLimiter, AIController.generateDeck);

// AI Coach
aiRouter.post('/deck-coach', aiLimiter, AIController.coachChat);
