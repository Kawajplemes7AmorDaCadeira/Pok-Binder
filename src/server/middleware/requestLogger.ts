import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  if (req.path.startsWith('/api')) {
    const timestamp = new Date().toISOString();
    console.log(`[API ${timestamp}] ${req.method} ${req.path}`);
  }
  next();
}
