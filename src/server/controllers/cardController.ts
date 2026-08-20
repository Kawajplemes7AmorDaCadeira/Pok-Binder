import { Request, Response, NextFunction } from 'express';
import { CardService } from '../services/cardService';
import { CardLanguage } from '../../types';

export class CardController {
  public static async getCardById(req: Request, res: Response, next: NextFunction) {
    try {
      const lang = (req.query.lang as CardLanguage) || 'pt';
      const card = await CardService.getCardById(req.params.id, lang);
      res.json(card);
    } catch (err) {
      next(err);
    }
  }

  public static async searchCards(req: Request, res: Response, next: NextFunction) {
    try {
      const lang = (req.query.lang as CardLanguage) || 'pt';
      const searchQuery = (req.query.q as string) || '';
      const setId = (req.query.setId as string) || undefined;
      const type = (req.query.type as string) || undefined;
      const rarity = (req.query.rarity as string) || undefined;
      const artist = (req.query.artist as string) || undefined;

      const result = await CardService.searchCards(
        {
          searchQuery,
          setId,
          type,
          rarity,
          artist,
        },
        lang
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
