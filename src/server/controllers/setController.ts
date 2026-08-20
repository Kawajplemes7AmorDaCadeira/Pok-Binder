import { Request, Response, NextFunction } from 'express';
import { CardService } from '../services/cardService';
import { CardLanguage } from '../../types';

export class SetController {
  public static async getSets(req: Request, res: Response, next: NextFunction) {
    try {
      const lang = (req.query.lang as CardLanguage) || 'pt';
      const sets = await CardService.getSets(lang);
      res.json(sets);
    } catch (err) {
      next(err);
    }
  }

  public static async getSetById(req: Request, res: Response, next: NextFunction) {
    try {
      const lang = (req.query.lang as CardLanguage) || 'pt';
      const setInfo = await CardService.getSetById(req.params.id, lang);
      res.json(setInfo);
    } catch (err) {
      next(err);
    }
  }

  public static async getCardsBySet(req: Request, res: Response, next: NextFunction) {
    try {
      const lang = (req.query.lang as CardLanguage) || 'pt';
      const cards = await CardService.getCardsBySet(req.params.id, lang);
      res.json(cards);
    } catch (err) {
      next(err);
    }
  }
}
