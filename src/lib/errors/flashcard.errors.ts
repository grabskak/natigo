import type { ValidationErrorDetail } from "../../types";

/**
 * Error thrown when one or more flashcards fail business logic validation
 * Contains detailed information about each validation failure
 */
export class ValidationError extends Error {
  constructor(public validationErrors: ValidationErrorDetail[]) {
    super("One or more flashcards failed validation");
    this.name = "ValidationError";
  }
}

/**
 * Error thrown when user attempts to access or use a generation that doesn't belong to them
 */
export class ForbiddenError extends Error {
  constructor(
    message: string,
    public generationId?: string
  ) {
    super(message);
    this.name = "ForbiddenError";
  }
}
