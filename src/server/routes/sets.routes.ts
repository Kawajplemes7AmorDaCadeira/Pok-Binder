import { Router } from 'express';
import { SetController } from '../controllers/setController';

export const setRouter = Router();

// Get list of sets
setRouter.get('/', SetController.getSets);

// Get specific set info
setRouter.get('/:id', SetController.getSetById);

// Get cards in a specific set
setRouter.get('/:id/cards', SetController.getCardsBySet);
