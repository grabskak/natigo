/**
 * Bazowa klasa błędów dla wszystkich błędów OpenRouter
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/**
 * Błędy konfiguracji (niepoprawny klucz API, źle sformułowana konfiguracja, itp.)
 */
export class OpenRouterConfigError extends OpenRouterError {
  constructor(message: string, details?: unknown) {
    super(message, "OPENROUTER_CONFIG_ERROR", undefined, details);
    this.name = "OpenRouterConfigError";
  }
}

/**
 * Błędy uwierzytelniania (401, 403)
 */
export class OpenRouterAuthenticationError extends OpenRouterError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, "OPENROUTER_AUTH_ERROR", statusCode, details);
    this.name = "OpenRouterAuthenticationError";
  }
}

/**
 * Błędy walidacji (400, 422, niepoprawny format żądania)
 */
export class OpenRouterValidationError extends OpenRouterError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, "OPENROUTER_VALIDATION_ERROR", statusCode, details);
    this.name = "OpenRouterValidationError";
  }
}

/**
 * Błędy limitowania szybkości (429)
 */
export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    details?: unknown
  ) {
    super(message, "OPENROUTER_RATE_LIMIT", 429, details);
    this.name = "OpenRouterRateLimitError";
  }
}

/**
 * Błędy nieznalezienia modelu (404)
 */
export class OpenRouterModelNotFoundError extends OpenRouterError {
  constructor(
    message: string,
    public readonly requestedModel: string,
    details?: unknown
  ) {
    super(message, "OPENROUTER_MODEL_NOT_FOUND", 404, details);
    this.name = "OpenRouterModelNotFoundError";
  }
}

/**
 * Błędy niedostępności usługi (500, 502, 503, 504)
 */
export class OpenRouterServiceError extends OpenRouterError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, "OPENROUTER_SERVICE_ERROR", statusCode, details);
    this.name = "OpenRouterServiceError";
  }
}

/**
 * Błędy sieciowe (timeout, odmowa połączenia, itp.)
 */
export class OpenRouterNetworkError extends OpenRouterError {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message, "OPENROUTER_NETWORK_ERROR", undefined, cause);
    this.name = "OpenRouterNetworkError";
  }
}

/**
 * Błędy parsowania odpowiedzi (niepoprawny JSON, niezgodność schematu)
 */
export class OpenRouterParseError extends OpenRouterError {
  constructor(message: string, details?: unknown) {
    super(message, "OPENROUTER_PARSE_ERROR", undefined, details);
    this.name = "OpenRouterParseError";
  }
}

/**
 * Błędy timeout
 */
export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(
    message: string,
    public readonly timeoutMs: number
  ) {
    super(message, "OPENROUTER_TIMEOUT", undefined, { timeoutMs });
    this.name = "OpenRouterTimeoutError";
  }
}

/**
 * Błąd niewystarczających środków (specyficzny dla OpenRouter)
 */
export class OpenRouterInsufficientCreditsError extends OpenRouterError {
  constructor(message: string, details?: unknown) {
    super(message, "OPENROUTER_INSUFFICIENT_CREDITS", 402, details);
    this.name = "OpenRouterInsufficientCreditsError";
  }
}

/**
 * Mapuj wewnętrzne błędy na przyjazne dla użytkownika komunikaty
 */
export function getUserFriendlyErrorMessage(error: OpenRouterError): string {
  switch (error.code) {
    case "OPENROUTER_AUTH_ERROR":
      return "Uwierzytelnianie nie powiodło się. Sprawdź swój klucz API.";
    case "OPENROUTER_RATE_LIMIT":
      return "Za dużo żądań. Spróbuj ponownie za chwilę.";
    case "OPENROUTER_TIMEOUT":
      return "Upłynął limit czasu żądania. Spróbuj ponownie.";
    case "OPENROUTER_NETWORK_ERROR":
      return "Błąd sieci. Sprawdź swoje połączenie i spróbuj ponownie.";
    case "OPENROUTER_MODEL_NOT_FOUND":
      return "Model niedostępny. Wybierz inny model.";
    case "OPENROUTER_INSUFFICIENT_CREDITS":
      return "Niewystarczające środki. Doładuj swoje konto OpenRouter.";
    case "OPENROUTER_PARSE_ERROR":
      return "Nie udało się przetworzyć odpowiedzi AI. Spróbuj ponownie.";
    case "OPENROUTER_SERVICE_ERROR":
      return "Usługa AI jest tymczasowo niedostępna. Spróbuj ponownie później.";
    case "OPENROUTER_VALIDATION_ERROR":
      return "Niepoprawne żądanie. Sprawdź swoje dane wejściowe i spróbuj ponownie.";
    default:
      return "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
  }
}
