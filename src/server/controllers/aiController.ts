import { Request, Response, NextFunction } from 'express';
import { AIService } from '../services/aiService';

const aiService = new AIService();

export class AIController {
  public static async generateDeck(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await aiService.generateDeck({
        prompt: req.body.prompt,
        format: req.body.format,
        lang: req.body.lang,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async coachChat(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await aiService.chatWithCoach({
        deckName: req.body.deckName,
        deckDescription: req.body.deckDescription,
        cards: req.body.cards,
        message: req.body.message,
        chatHistory: req.body.chatHistory,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
