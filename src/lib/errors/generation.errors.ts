/**
 * Custom error classes for generation endpoint
 * These allow for specific error handling and appropriate HTTP status codes
 */

/**
 * Error thrown when user exceeds rate limit (10 generations per hour)
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
    public currentCount: number,
    public limit: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Error thrown when AI service doesn't respond within timeout period
 */
export class AITimeoutError extends Error {
  constructor(message = "AI service timeout") {
    super(message);
    this.name = "AITimeoutError";
  }
}

/**
 * Error thrown when AI service returns an error or invalid response
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

/**
 * Error thrown when database transaction fails
 */
export class TransactionError extends Error {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "TransactionError";
  }
}
