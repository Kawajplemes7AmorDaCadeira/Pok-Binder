import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../errors/AppError';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const requests = new Map<string, number[]>();

  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    const clientTimestamps = (requests.get(ip) || []).filter(timestamp => timestamp > windowStart);

    if (clientTimestamps.length >= options.maxRequests) {
      return next(new RateLimitError(`Muitas requisições enviadas em pouco tempo. Por favor, aguarde alguns segundos antes de tentar novamente.`));
    }

    clientTimestamps.push(now);
    requests.set(ip, clientTimestamps);

    // Garbage collect older entries occasionally
    if (requests.size > 2000) {
      for (const [key, timestamps] of requests.entries()) {
        const valid = timestamps.filter(t => t > windowStart);
        if (valid.length === 0) {
          requests.delete(key);
        } else {
          requests.set(key, valid);
        }
      }
    }

    next();
  };
}
