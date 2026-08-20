import { Router } from 'express';
import { CardController } from '../controllers/cardController';

export const cardRouter = Router();

// Search cards
cardRouter.get('/', CardController.searchCards);

// Get single card by ID
cardRouter.get('/:id', CardController.getCardById);
