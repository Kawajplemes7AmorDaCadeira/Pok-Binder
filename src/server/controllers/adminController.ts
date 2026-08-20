import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/adminService';
import { CardLanguage } from '../../types';

export class AdminController {
  public static async validateCatalog(req: Request, res: Response, next: NextFunction) {
    try {
      const lang = (req.query.lang as CardLanguage) || 'pt';
      const setId = (req.query.setId as string) || 'sv03.5';
      const result = await AdminService.validateCatalog(setId, lang);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
