export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request parameters', code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please slow down and try again later.', code = 'RATE_LIMIT_EXCEEDED') {
    super(message, 429, code);
  }
}

export class AIProviderError extends AppError {
  constructor(message = 'AI generation service unavailable', code = 'AI_SERVICE_UNAVAILABLE') {
    super(message, 503, code);
  }
}
