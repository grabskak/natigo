import type {
  OpenRouterConfig,
  CompletionOptions,
  CompletionResult,
  ResponseFormat,
  JsonSchema,
  ModelInfo,
  FlashcardGenerationOptions,
  AIFlashcard,
  OpenRouterRequest,
  OpenRouterResponse,
} from "../types/openrouter.types";

import {
  OpenRouterConfigError,
  OpenRouterAuthenticationError,
  OpenRouterValidationError,
  OpenRouterRateLimitError,
  OpenRouterModelNotFoundError,
  OpenRouterServiceError,
  OpenRouterNetworkError,
  OpenRouterParseError,
  OpenRouterTimeoutError,
  OpenRouterInsufficientCreditsError,
  OpenRouterError,
} from "../errors/openrouter.errors";

/**
 * OpenRouter Service - warstwa abstrakcji do interakcji z API OpenRouter.ai
 *
 * Zapewnia niezawodną i łatwą w utrzymaniu komunikację z różnymi modelami LLM
 * poprzez zunifikowany interfejs OpenRouter.
 */
export class OpenRouterService {
  // Pola prywatne tylko do odczytu
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultSystemMessage?: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly httpReferer?: string;
  private readonly appTitle?: string;

  // Cache dla listy modeli
  private modelsCache?: { data: ModelInfo[]; timestamp: number };
  private readonly modelsCacheTTL = 3600000; // 1 godzina

  // Publiczna konfiguracja tylko do odczytu
  public readonly config: Readonly<OpenRouterConfig>;

  /**
   * Inicjalizacja usługi OpenRouter z konfiguracją i walidacja wymaganych parametrów
   *
   * @param config - Konfiguracja OpenRouter
   * @throws {OpenRouterConfigError} Gdy konfiguracja jest niepoprawna
   *
   * @example
   * ```typescript
   * const service = new OpenRouterService({
   *   apiKey: 'sk-or-...',
   *   defaultModel: 'anthropic/claude-3-haiku',
   *   timeout: 60000,
   *   maxRetries: 3
   * });
   * ```
   */
  constructor(config: OpenRouterConfig) {
    // Walidacja klucza API
    if (!config.apiKey || typeof config.apiKey !== "string" || config.apiKey.trim().length === 0) {
      throw new OpenRouterConfigError("Klucz API jest wymagany i musi być niepustym ciągiem znaków");
    }

    this.apiKey = config.apiKey.trim();

    // Ostrzeżenie jeśli klucz nie pasuje do formatu OpenRouter
    if (!this.apiKey.startsWith("sk-or-")) {
      // console.warn("Klucz API nie pasuje do oczekiwanego formatu OpenRouter (sk-or-...)");
    }

    // Walidacja i ustawienie baseUrl
    const defaultBaseUrl = "https://openrouter.ai/api/v1/chat/completions";
    this.baseUrl = config.baseUrl?.trim() || defaultBaseUrl;

    // Walidacja HTTPS
    if (!this.baseUrl.startsWith("https://")) {
      throw new OpenRouterConfigError("Bazowy URL musi używać protokołu HTTPS");
    }

    // Walidacja URL
    try {
      new URL(this.baseUrl);
    } catch {
      throw new OpenRouterConfigError("Bazowy URL ma niepoprawny format");
    }

    // Walidacja timeout
    const defaultTimeout = 60000;
    this.timeout = config.timeout ?? defaultTimeout;

    if (this.timeout < 5000 || this.timeout > 300000) {
      throw new OpenRouterConfigError("Timeout musi być liczbą między 5000 a 300000 ms (5s-5min)", {
        provided: this.timeout,
      });
    }

    // Walidacja maxRetries
    const defaultMaxRetries = 3;
    this.maxRetries = config.maxRetries ?? defaultMaxRetries;

    if (this.maxRetries < 0 || this.maxRetries > 10 || !Number.isInteger(this.maxRetries)) {
      throw new OpenRouterConfigError("Maksymalna liczba ponownych prób musi być liczbą całkowitą między 0 a 10", {
        provided: this.maxRetries,
      });
    }

    // Walidacja retryDelay
    const defaultRetryDelay = 1000;
    this.retryDelay = config.retryDelay ?? defaultRetryDelay;

    if (this.retryDelay < 100 || this.retryDelay > 10000) {
      throw new OpenRouterConfigError("Opóźnienie ponownej próby musi być liczbą między 100 a 10000 ms", {
        provided: this.retryDelay,
      });
    }

    // Ustawienie domyślnego modelu
    this.defaultModel = config.defaultModel || "xiaomi/mimo-v2-flash:free";

    // Opcjonalne parametry
    this.defaultSystemMessage = config.defaultSystemMessage;
    this.httpReferer = config.httpReferer?.trim();
    this.appTitle = config.appTitle?.trim();

    // Przechowaj konfigurację
    this.config = Object.freeze({ ...config });

    // Logowanie konfiguracji (z ukrytym kluczem API)
    // console.info("OpenRouter Service zainicjalizowany:", this.getRedactedConfig());
  }

  /**
   * Zwraca konfigurację z ukrytym kluczem API do celów logowania
   * @private
   */
  private getRedactedConfig(): Partial<OpenRouterConfig> {
    const keyLength = this.apiKey.length;
    const redactedKey =
      keyLength > 12 ? `${this.apiKey.substring(0, 8)}...${this.apiKey.substring(keyLength - 4)}` : "[UKRYTO]";

    return {
      apiKey: redactedKey,
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      httpReferer: this.httpReferer,
      appTitle: this.appTitle,
    };
  }

  /**
   * Waliduje opcje uzupełnienia przed budowaniem żądania
   * @private
   */
  private validateCompletionOptions(options: CompletionOptions): void {
    // Walidacja tablicy wiadomości
    if (!Array.isArray(options.messages) || options.messages.length === 0) {
      throw new OpenRouterValidationError("Tablica wiadomości jest wymagana i nie może być pusta", 400);
    }

    // Walidacja każdej wiadomości
    const MAX_MESSAGE_LENGTH = 100000; // 100k znaków
    const validRoles = ["system", "user", "assistant"];

    for (const [index, message] of options.messages.entries()) {
      if (!message || typeof message !== "object") {
        throw new OpenRouterValidationError(`Wiadomość na pozycji ${index} jest niepoprawna`, 400);
      }

      if (!validRoles.includes(message.role)) {
        throw new OpenRouterValidationError(
          `Niepoprawna rola wiadomości: ${message.role}. Dozwolone: ${validRoles.join(", ")}`,
          400,
          { index, role: message.role }
        );
      }

      if (typeof message.content !== "string") {
        throw new OpenRouterValidationError(`Zawartość wiadomości musi być ciągiem znaków (pozycja ${index})`, 400, {
          index,
        });
      }

      if (message.content.length > MAX_MESSAGE_LENGTH) {
        throw new OpenRouterValidationError(
          `Zawartość wiadomości przekracza maksymalną długość ${MAX_MESSAGE_LENGTH} znaków (pozycja ${index})`,
          400,
          { index, length: message.content.length }
        );
      }
    }

    // Walidacja temperature
    if (options.temperature !== undefined) {
      if (typeof options.temperature !== "number" || options.temperature < 0.0 || options.temperature > 2.0) {
        throw new OpenRouterValidationError("Temperature musi być liczbą między 0.0 a 2.0", 400, {
          provided: options.temperature,
        });
      }
    }

    // Walidacja maxTokens
    if (options.maxTokens !== undefined) {
      if (!Number.isInteger(options.maxTokens) || options.maxTokens <= 0) {
        throw new OpenRouterValidationError("MaxTokens musi być dodatnią liczbą całkowitą", 400, {
          provided: options.maxTokens,
        });
      }
    }

    // Walidacja topP
    if (options.topP !== undefined) {
      if (typeof options.topP !== "number" || options.topP < 0.0 || options.topP > 1.0) {
        throw new OpenRouterValidationError("TopP musi być liczbą między 0.0 a 1.0", 400, { provided: options.topP });
      }
    }

    // Walidacja topK
    if (options.topK !== undefined) {
      if (!Number.isInteger(options.topK) || options.topK <= 0) {
        throw new OpenRouterValidationError("TopK musi być dodatnią liczbą całkowitą", 400, { provided: options.topK });
      }
    }

    // Walidacja frequencyPenalty
    if (options.frequencyPenalty !== undefined) {
      if (
        typeof options.frequencyPenalty !== "number" ||
        options.frequencyPenalty < -2.0 ||
        options.frequencyPenalty > 2.0
      ) {
        throw new OpenRouterValidationError("FrequencyPenalty musi być liczbą między -2.0 a 2.0", 400, {
          provided: options.frequencyPenalty,
        });
      }
    }

    // Walidacja presencePenalty
    if (options.presencePenalty !== undefined) {
      if (
        typeof options.presencePenalty !== "number" ||
        options.presencePenalty < -2.0 ||
        options.presencePenalty > 2.0
      ) {
        throw new OpenRouterValidationError("PresencePenalty musi być liczbą między -2.0 a 2.0", 400, {
          provided: options.presencePenalty,
        });
      }
    }

    // Walidacja responseFormat
    if (options.responseFormat) {
      if (options.responseFormat.type !== "json_schema") {
        throw new OpenRouterValidationError('ResponseFormat musi mieć type: "json_schema"', 400);
      }

      if (!options.responseFormat.json_schema) {
        throw new OpenRouterValidationError("ResponseFormat musi zawierać pole json_schema", 400);
      }

      const jsonSchema = options.responseFormat.json_schema;

      if (!jsonSchema.name || typeof jsonSchema.name !== "string") {
        throw new OpenRouterValidationError("ResponseFormat.json_schema musi zawierać pole name", 400);
      }

      if (typeof jsonSchema.strict !== "boolean") {
        throw new OpenRouterValidationError("ResponseFormat.json_schema musi zawierać pole strict (boolean)", 400);
      }

      if (!jsonSchema.schema || typeof jsonSchema.schema !== "object") {
        throw new OpenRouterValidationError("ResponseFormat.json_schema musi zawierać pole schema (object)", 400);
      }
    }
  }

  /**
   * Helper do budowania obiektu response_format
   * @private
   */
  private createResponseFormat(name: string, schema: JsonSchema): ResponseFormat {
    return {
      type: "json_schema",
      json_schema: {
        name,
        strict: true,
        schema,
      },
    };
  }

  /**
   * Konstruuje payload żądania dla API OpenRouter
   * @private
   */
  private buildRequest(options: CompletionOptions): OpenRouterRequest {
    // Waliduj opcje przed budowaniem
    this.validateCompletionOptions(options);

    // Rozpocznij od podstawowej struktury żądania
    const request: OpenRouterRequest = {
      model: options.model || this.defaultModel,
      messages: [],
    };

    // Zbuduj tablicę wiadomości - dodaj systemową jeśli podana
    const systemMessage = options.systemMessage || this.defaultSystemMessage;

    if (systemMessage) {
      request.messages.push({
        role: "system",
        content: systemMessage,
      });
    }

    // Dodaj pozostałe wiadomości
    request.messages.push(...options.messages);

    // Dodaj response_format jeśli podany
    if (options.responseFormat) {
      request.response_format = options.responseFormat;
    }

    // Dodaj parametry modelu
    if (options.temperature !== undefined) {
      request.temperature = options.temperature;
    }

    if (options.maxTokens !== undefined) {
      request.max_tokens = options.maxTokens;
    }

    if (options.topP !== undefined) {
      request.top_p = options.topP;
    }

    if (options.topK !== undefined) {
      request.top_k = options.topK;
    }

    if (options.frequencyPenalty !== undefined) {
      request.frequency_penalty = options.frequencyPenalty;
    }

    if (options.presencePenalty !== undefined) {
      request.presence_penalty = options.presencePenalty;
    }

    return request;
  }

  /**
   * Zwraca nagłówki HTTP dla żądania
   * @private
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    if (this.httpReferer) {
      headers["HTTP-Referer"] = this.httpReferer;
    }

    if (this.appTitle) {
      headers["X-Title"] = this.appTitle;
    }

    return headers;
  }

  /**
   * Sanityzuje komunikaty błędów (usuwa potencjalne klucze API)
   * @private
   */
  private sanitizeErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    // Usuń potencjalne klucze API, tokeny lub wrażliwe wzorce
    return message.replace(/sk-[a-zA-Z0-9-_]+/g, "[UKRYTO]");
  }

  /**
   * Wykonuje żądanie HTTP z logiką ponownych prób i obsługą timeout
   * @private
   */
  private async executeRequest(
    request: OpenRouterRequest,
    timeout: number,
    maxRetries: number
  ): Promise<OpenRouterResponse> {
    let attemptNumber = 0;
    let lastError: Error | null = null;

    while (attemptNumber <= maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Obsługa błędów uwierzytelniania (nie ponawiamy)
        if (response.status === 401 || response.status === 403) {
          const errorBody = await response.json().catch(() => ({}));
          throw new OpenRouterAuthenticationError(
            "Niepoprawny klucz API lub niewystarczające uprawnienia",
            response.status,
            errorBody
          );
        }

        // Obsługa niewystarczających środków (nie ponawiamy)
        if (response.status === 402) {
          const errorBody = await response.json().catch(() => ({}));
          throw new OpenRouterInsufficientCreditsError("Niewystarczające środki na koncie OpenRouter", errorBody);
        }

        // Obsługa błędów walidacji (nie ponawiamy)
        if (response.status === 400 || response.status === 422 || response.status === 413) {
          const errorBody = await response.json().catch(() => ({}));
          throw new OpenRouterValidationError(
            `Niepoprawne żądanie: ${errorBody.error?.message || response.statusText}`,
            response.status,
            errorBody
          );
        }

        // Obsługa nieznalezienia modelu (nie ponawiamy)
        if (response.status === 404) {
          const errorBody = await response.json().catch(() => ({}));
          throw new OpenRouterModelNotFoundError(
            `Nie znaleziono modelu: ${request.model}. Sprawdź dostępne modele za pomocą listModels()`,
            request.model,
            errorBody
          );
        }

        // Obsługa limitowania szybkości (ponawiamy)
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;

          if (attemptNumber < maxRetries) {
            const backoffMs = this.retryDelay * Math.pow(2, attemptNumber);
            // console.warn(
            //   `Limitowanie szybkości (429), ponowienie za ${backoffMs}ms... (próba ${attemptNumber + 1}/${maxRetries})`
            // );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            attemptNumber++;
            continue;
          }

          throw new OpenRouterRateLimitError(
            "Przekroczono limit szybkości i wyczerpano maksymalną liczbę ponownych prób",
            retryAfterSeconds,
            { attempts: attemptNumber + 1 }
          );
        }

        // Obsługa błędów serwera (ponawiamy)
        if (response.status >= 500) {
          if (attemptNumber < maxRetries) {
            const backoffMs = this.retryDelay * Math.pow(2, attemptNumber);
            // console.warn(
            //   `Błąd serwera ${response.status}, ponowienie za ${backoffMs}ms... (próba ${attemptNumber + 1}/${maxRetries})`
            // );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            attemptNumber++;
            continue;
          }

          const errorBody = await response.text().catch(() => "Nieznany błąd");
          throw new OpenRouterServiceError(
            `Błąd usługi OpenRouter (${response.status}) po ${maxRetries} ponownych próbach`,
            response.status,
            { body: errorBody, attempts: attemptNumber + 1 }
          );
        }

        // Sukces - parsuj i zwróć odpowiedź
        if (response.ok) {
          const data = await response.json();
          return data as OpenRouterResponse;
        }

        // Inne błędy
        const errorBody = await response.text().catch(() => "Nieznany błąd");
        throw new OpenRouterServiceError(`Nieoczekiwany błąd HTTP: ${response.status}`, response.status, {
          body: errorBody,
        });
      } catch (error) {
        clearTimeout(timeoutId);

        // Timeout
        if (error instanceof Error && error.name === "AbortError") {
          throw new OpenRouterTimeoutError(`Upłynął limit czasu żądania po ${timeout}ms`, timeout);
        }

        // Ponownie rzuć nasze niestandardowe błędy
        if (error instanceof OpenRouterError) {
          throw error;
        }

        // Błędy sieciowe - próbujemy ponowić
        if (attemptNumber < maxRetries) {
          const backoffMs = this.retryDelay * Math.pow(2, attemptNumber);
          // console.warn(
          //   `Błąd sieciowy, ponowienie za ${backoffMs}ms... (próba ${attemptNumber + 1}/${maxRetries})`,
          //   this.sanitizeErrorMessage(error)
          // );
          lastError = error as Error;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          attemptNumber++;
          continue;
        }

        // Wyczerpano próby
        throw new OpenRouterNetworkError(`Błąd sieciowy: ${this.sanitizeErrorMessage(error)}`, error as Error);
      }
    }

    // Nie powinniśmy tu dotrzeć, ale na wszelki wypadek
    throw (
      lastError || new OpenRouterError("Nieoczekiwany błąd podczas wykonywania żądania", "OPENROUTER_UNKNOWN_ERROR")
    );
  }

  /**
   * Parsuje i waliduje strukturę odpowiedzi API
   * @private
   */
  private parseResponse<T>(response: OpenRouterResponse): CompletionResult<T> {
    // Waliduj czy odpowiedź ma tablicę choices
    if (!response.choices || !Array.isArray(response.choices)) {
      throw new OpenRouterParseError("Odpowiedź API nie zawiera tablicy choices", { response });
    }

    // Waliduj czy istnieje pierwszy wybór
    if (response.choices.length === 0) {
      throw new OpenRouterParseError("Odpowiedź API zawiera pustą tablicę choices", { response });
    }

    const choice = response.choices[0];

    // Waliduj strukturę wyboru
    if (!choice.message || typeof choice.message.content !== "string") {
      throw new OpenRouterParseError("Niepoprawna struktura wyboru w odpowiedzi API", { choice });
    }

    const rawContent = choice.message.content;
    let content: T;

    // Parsuj JSON jeśli to strukturyzowana odpowiedź
    try {
      // Usuń markdown code fences jeśli obecne (```json ... ```)
      let cleanedContent = rawContent.trim();
      if (cleanedContent.startsWith("```")) {
        // Usuń opening fence (```json lub ```)
        cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/, "");
        // Usuń closing fence (```)
        cleanedContent = cleanedContent.replace(/\n?```\s*$/, "");
        cleanedContent = cleanedContent.trim();
      }

      content = JSON.parse(cleanedContent) as T;
    } catch {
      // Jeśli parsowanie się nie powiodło, zwróć surową zawartość jako string
      content = rawContent as unknown as T;
    }

    // Waliduj informacje o użyciu
    if (!response.usage) {
      throw new OpenRouterParseError("Odpowiedź API nie zawiera informacji o użyciu tokenów", { response });
    }

    // Zbuduj obiekt wyniku
    const result: CompletionResult<T> = {
      content,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      model: response.model,
      finishReason: choice.finish_reason,
      metadata: {
        requestId: response.id,
        processingTime: 0, // Będzie ustawione w metodzie complete
      },
    };

    // Loguj użycie tokenów
    // this.logTokenUsage(result.usage, result.model);

    return result;
  }

  /**
   * Loguje użycie tokenów dla monitorowania kosztów
   * @private
   */
  // private logTokenUsage(
  //   _usage: { promptTokens: number; completionTokens: number; totalTokens: number },
  //   _model: string
  // ): void {
  //   // console.info("Użycie Tokenów OpenRouter:", {
  //   //   model: _model,
  //   //   promptTokens: _usage.promptTokens,
  //   //   completionTokens: _usage.completionTokens,
  //   //   totalTokens: _usage.totalTokens,
  //   //   timestamp: new Date().toISOString(),
  //   // });
  // }

  /**
   * Loguje błędy ze strukturyzowanymi informacjami
   * @private
   */
  // private logError(_error: OpenRouterError, _context: Record<string, unknown>): void {
  //   // console.error("Błąd OpenRouter:", {
  //   //   name: _error.name,
  //   //   code: _error.code,
  //   //   message: _error.message,
  //   //   statusCode: _error.statusCode,
  //   //   details: _error.details,
  //   //   context: _context,
  //   //   timestamp: new Date().toISOString(),
  //   // });
  // }

  // ============================================================================
  // METODY PUBLICZNE
  // ============================================================================

  /**
   * Generuj uzupełnienia czatu z pełną kontrolą nad wiadomościami, modelem i parametrami
   *
   * @template T Typ sparsowanej zawartości odpowiedzi
   * @param options Opcje uzupełnienia
   * @returns Promise z wynikiem uzupełnienia
   * @throws {OpenRouterValidationError} Gdy opcje są niepoprawne
   * @throws {OpenRouterAuthenticationError} Gdy klucz API jest niepoprawny
   * @throws {OpenRouterTimeoutError} Gdy upłynął limit czasu żądania
   * @throws {OpenRouterError} Dla innych błędów API
   *
   * @example
   * Proste uzupełnienie tekstowe:
   * ```typescript
   * const result = await service.complete({
   *   messages: [{ role: 'user', content: 'Czym jest TypeScript?' }],
   *   temperature: 0.7,
   *   maxTokens: 200
   * });
   * console.log(result.content);
   * ```
   *
   * @example
   * Strukturyzowana odpowiedź JSON:
   * ```typescript
   * const result = await service.complete<{ items: string[] }>({
   *   messages: [{ role: 'user', content: 'Lista 5 języków programowania' }],
   *   responseFormat: {
   *     type: 'json_schema',
   *     json_schema: {
   *       name: 'language_list',
   *       strict: true,
   *       schema: {
   *         type: 'object',
   *         properties: {
   *           items: { type: 'array', items: { type: 'string' } }
   *         },
   *         required: ['items']
   *       }
   *     }
   *   }
   * });
   * console.log(result.content.items);
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async complete<T = any>(options: CompletionOptions): Promise<CompletionResult<T>> {
    const startTime = Date.now();

    // 1. Zbuduj żądanie (walidacja jest wewnątrz)
    const request = this.buildRequest(options);

    // 2. Określ timeout i maxRetries (użyj podanych lub domyślnych)
    const timeout = options.timeout ?? this.timeout;
    const maxRetries = options.maxRetries ?? this.maxRetries;

    // 3. Wykonaj żądanie z ponowieniami
    const response = await this.executeRequest(request, timeout, maxRetries);

    // 4. Parsuj odpowiedź
    const result = this.parseResponse<T>(response);

    // 5. Dodaj czas przetwarzania
    result.metadata.processingTime = Date.now() - startTime;

    return result;
  }

  /**
   * Metoda wygody specjalnie do generowania fiszek z tekstu wejściowego
   *
   * @param inputText Tekst do przetworzenia na fiszki
   * @param options Opcje generowania fiszek
   * @returns Promise z tablicą wygenerowanych fiszek
   * @throws {OpenRouterValidationError} Gdy tekst wejściowy jest niepoprawny
   * @throws {OpenRouterError} Dla błędów API
   *
   * @example
   * ```typescript
   * const flashcards = await service.generateFlashcards(
   *   'TypeScript to typowany nadzbiór JavaScript. Dodaje statyczne typowanie.',
   *   {
   *     model: 'anthropic/claude-3.5-sonnet',
   *     temperature: 0.3,
   *     minFlashcards: 2,
   *     maxFlashcards: 5
   *   }
   * );
   *
   * console.log(`Wygenerowano ${flashcards.length} fiszek`);
   * flashcards.forEach(card => {
   *   console.log(`Q: ${card.front}`);
   *   console.log(`A: ${card.back}`);
   * });
   * ```
   */
  async generateFlashcards(inputText: string, options?: FlashcardGenerationOptions): Promise<AIFlashcard[]> {
    // Walidacja tekstu wejściowego
    if (!inputText || typeof inputText !== "string" || inputText.trim().length === 0) {
      throw new OpenRouterValidationError("Tekst wejściowy jest wymagany i nie może być pusty", 400);
    }

    const trimmedText = inputText.trim();

    if (trimmedText.length < 50) {
      throw new OpenRouterValidationError(
        "Tekst wejściowy musi mieć co najmniej 50 znaków aby wygenerować sensowne fiszki",
        400,
        { length: trimmedText.length }
      );
    }

    // Ustaw domyślne wartości
    const minFlashcards = options?.minFlashcards ?? 8;
    const maxFlashcards = options?.maxFlashcards ?? 15;

    // Walidacja zakresu
    if (minFlashcards < 1 || minFlashcards > 50) {
      throw new OpenRouterValidationError("MinFlashcards musi być liczbą między 1 a 50", 400, {
        provided: minFlashcards,
      });
    }

    if (maxFlashcards < minFlashcards || maxFlashcards > 50) {
      throw new OpenRouterValidationError(
        "MaxFlashcards musi być większe lub równe minFlashcards i nie większe niż 50",
        400,
        { minFlashcards, maxFlashcards }
      );
    }

    // Zbuduj prompt systemowy
    const systemPrompt = `You are an expert in creating educational flashcards. Your task is to analyze the provided text and create high-quality flashcards for learning.

CRITICAL: You MUST use English field names in JSON output: "front" and "back" (NOT Polish names like "pytanie" or "odpowiedź").
The content of questions and answers should be in Polish, but the JSON field names must be in English.

FLASHCARD CREATION RULES:
1. Generate between ${minFlashcards} and ${maxFlashcards} flashcards from the provided text
2. Each flashcard consists of a question (field name: "front") and an answer (field name: "back")
3. Questions must be clear, specific, and concise (1-200 characters)
4. Answers must be complete but concise (1-500 characters)
5. Focus on key concepts, definitions, facts, and relationships between concepts
6. Avoid overly simple or trivial questions
7. Each flashcard should test one specific concept or fact
8. Use clear and precise language in Polish
9. Questions should be formulated to require understanding, not just memorization

QUESTION FORMATS (use various formats):
- "Czym jest X?"
- "Jakie są cechy/właściwości X?"
- "Jaka jest różnica między X a Y?"
- "Jak działa X?"
- "Dlaczego X jest ważne/używane?"
- "Co się stanie, gdy X?"

IMPORTANT: Generate flashcards in the specified JSON format with English field names "front" and "back".

Example output structure:
{
  "flashcards": [
    {
      "front": "Czym jest fotosynteza?",
      "back": "Proces, w którym rośliny przekształcają światło słoneczne w energię chemiczną"
    }
  ]
}`;

    // Zbuduj schemat JSON dla fiszek
    const flashcardSchema: JsonSchema = {
      type: "object",
      properties: {
        flashcards: {
          type: "array",
          description: "Array of flashcard objects. Each flashcard MUST have 'front' and 'back' fields in English.",
          items: {
            type: "object",
            properties: {
              front: {
                type: "string",
                description:
                  "Question on the flashcard (1-200 characters). Field name MUST be 'front' in English. Content should be in Polish.",
              },
              back: {
                type: "string",
                description:
                  "Answer on the flashcard (1-500 characters). Field name MUST be 'back' in English. Content should be in Polish.",
              },
            },
            required: ["front", "back"],
            additionalProperties: false,
          },
          minItems: minFlashcards,
          maxItems: maxFlashcards,
        },
      },
      required: ["flashcards"],
      additionalProperties: false,
    };

    // Wywołaj complete z odpowiednią konfiguracją
    // console.info("📤 Wysyłam żądanie do OpenRouter API...");
    const result = await this.complete<{ flashcards: AIFlashcard[] }>({
      systemMessage: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Przeanalizuj poniższy tekst i wygeneruj ${minFlashcards}-${maxFlashcards} fiszek edukacyjnych.

WAŻNE: Użyj ANGIELSKICH nazw pól w JSON: "flashcards", "front", "back" (NIE polskich jak "fiszki", "pytanie", "odpowiedź").
Treść pytań i odpowiedzi powinna być po polsku, ale nazwy pól w JSON muszą być po angielsku.

Tekst do analizy:
${trimmedText}`,
        },
      ],
      model: options?.model,
      temperature: options?.temperature ?? 0.3,
      maxTokens: 4000,
      responseFormat: this.createResponseFormat("flashcard_generation", flashcardSchema),
      timeout: options?.timeout,
    });

    // console.info("📥 Otrzymano odpowiedź z OpenRouter API");
    // console.info("Surowa odpowiedź content:", JSON.stringify(result.content, null, 2));

    // Waliduj i filtruj wygenerowane fiszki
    // console.info("🔍 Sprawdzanie surowej odpowiedzi AI...");
    // console.info("Typ content:", typeof result.content);
    // console.info("Content keys:", result.content ? Object.keys(result.content) : "brak");

    if (!result.content.flashcards || !Array.isArray(result.content.flashcards)) {
      // console.error("❌ Odpowiedź API nie zawiera tablicy fiszek:", {
      //   hasFlashcards: "flashcards" in result.content,
      //   flashcardsType: result.content.flashcards ? typeof result.content.flashcards : "undefined",
      //   content: JSON.stringify(result.content, null, 2),
      // });
      throw new OpenRouterParseError("Odpowiedź API nie zawiera tablicy fiszek", { content: result.content });
    }

    // console.info(`✅ Otrzymano ${result.content.flashcards.length} fiszek od AI, rozpoczynam walidację...`);

    const validFlashcards: AIFlashcard[] = [];
    const validationErrors: { index: number; reason: string; card?: unknown }[] = [];

    for (const [index, card] of result.content.flashcards.entries()) {
      // Walidacja struktury
      if (!card || typeof card !== "object") {
        const reason = `niepoprawna struktura (typ: ${typeof card})`;
        // console.warn(`⚠️  Fiszka ${index}: ${reason}`);
        validationErrors.push({ index, reason, card });
        continue;
      }

      // Walidacja front
      if (typeof card.front !== "string" || card.front.trim().length === 0) {
        const reason = `brak pytania (front) - typ: ${typeof card.front}`;
        // console.warn(`⚠️  Fiszka ${index}: ${reason}`);
        validationErrors.push({ index, reason, card });
        continue;
      }

      const front = card.front.trim();
      if (front.length < 1 || front.length > 200) {
        const reason = `pytanie ma niepoprawną długość (${front.length} znaków, dozwolone: 1-200)`;
        // console.warn(`⚠️  Fiszka ${index}: ${reason}`);
        // console.warn(`    Front: "${front.substring(0, 100)}${front.length > 100 ? "..." : ""}"`);
        validationErrors.push({ index, reason, card: { front: front.substring(0, 100), back: card.back } });
        continue;
      }

      // Walidacja back
      if (typeof card.back !== "string" || card.back.trim().length === 0) {
        const reason = `brak odpowiedzi (back) - typ: ${typeof card.back}`;
        // console.warn(`⚠️  Fiszka ${index}: ${reason}`);
        validationErrors.push({ index, reason, card });
        continue;
      }

      const back = card.back.trim();
      if (back.length < 1 || back.length > 500) {
        const reason = `odpowiedź ma niepoprawną długość (${back.length} znaków, dozwolone: 1-500)`;
        // console.warn(`⚠️  Fiszka ${index}: ${reason}`);
        // console.warn(`    Back: "${back.substring(0, 100)}${back.length > 100 ? "..." : ""}"`);
        validationErrors.push({ index, reason, card: { front, back: back.substring(0, 100) } });
        continue;
      }

      // Dodaj poprawną fiszkę
      // console.info(
      //   `✅ Fiszka ${index} POPRAWNA - Front: "${front.substring(0, 50)}..." (${front.length} znaków), Back: ${back.length} znaków`
      // );
      validFlashcards.push({ front, back });
    }

    // console.info(`\n📊 Podsumowanie walidacji fiszek:`);
    // console.info(`   Otrzymano od AI: ${result.content.flashcards.length}`);
    // console.info(`   Poprawnych: ${validFlashcards.length}`);
    // console.info(`   Odrzuconych: ${validationErrors.length}`);

    // Sprawdź czy mamy wystarczającą liczbę fiszek
    if (validFlashcards.length === 0) {
      // console.error("❌ Nie udało się wygenerować żadnych poprawnych fiszek!");
      // console.error("Błędy walidacji:", JSON.stringify(validationErrors, null, 2));
      throw new OpenRouterParseError("Nie udało się wygenerować żadnych poprawnych fiszek", {
        generatedCount: result.content.flashcards.length,
        validationErrors: validationErrors,
        rawContent: result.content,
      });
    }

    if (validFlashcards.length < minFlashcards) {
      // console.warn(`Wygenerowano tylko ${validFlashcards.length} fiszek, oczekiwano co najmniej ${minFlashcards}`);
    }

    // console.info(
    //   `Pomyślnie wygenerowano ${validFlashcards.length} fiszek z ${result.content.flashcards.length} kandydatów`
    // );

    return validFlashcards;
  }

  /**
   * Sprawdza czy cache modeli jest ważny
   * @private
   */
  private isCacheValid(): boolean {
    if (!this.modelsCache) {
      return false;
    }
    return Date.now() - this.modelsCache.timestamp < this.modelsCacheTTL;
  }

  /**
   * Pobiera dostępne modele z OpenRouter (z cache i TTL)
   *
   * @returns Promise z listą dostępnych modeli
   * @throws {OpenRouterError} Dla błędów API
   *
   * @example
   * ```typescript
   * const models = await service.listModels();
   *
   * models.forEach(model => {
   *   console.log(`${model.name} (${model.id})`);
   *   console.log(`  Context: ${model.contextLength} tokens`);
   *   console.log(`  Pricing: $${model.pricing.prompt}/1M prompt tokens`);
   * });
   * ```
   */
  async listModels(): Promise<ModelInfo[]> {
    // Sprawdź cache
    if (this.isCacheValid() && this.modelsCache) {
      // console.info("Zwracanie modeli z cache");
      return this.modelsCache.data;
    }

    try {
      // Pobierz z API
      const modelsEndpoint = "https://openrouter.ai/api/v1/models";

      const response = await fetch(modelsEndpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new OpenRouterServiceError(`Nie udało się pobrać listy modeli: ${response.statusText}`, response.status);
      }

      const data = await response.json();

      // Transformuj odpowiedź API do ModelInfo[]
      if (!data.data || !Array.isArray(data.data)) {
        throw new OpenRouterParseError("Odpowiedź API nie zawiera tablicy modeli", { data });
      }

      // Typ dla pojedynczego modelu z API
      interface ApiModel {
        id: string;
        name?: string;
        description?: string;
        pricing?: {
          prompt?: string;
          completion?: string;
        };
        context_length?: string | number;
        supports_streaming?: boolean;
        supports_function_calling?: boolean;
        supports_json_mode?: boolean;
      }

      const models: ModelInfo[] = (data.data as ApiModel[]).map((model) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || "",
        pricing: {
          prompt: parseFloat(model.pricing?.prompt || "0"),
          completion: parseFloat(model.pricing?.completion || "0"),
        },
        contextLength: parseInt(String(model.context_length || "0"), 10),
        supports: {
          streaming: model.supports_streaming ?? false,
          functionCalling: model.supports_function_calling ?? false,
          jsonMode: model.supports_json_mode ?? true,
        },
      }));

      // Aktualizuj cache
      this.modelsCache = {
        data: models,
        timestamp: Date.now(),
      };

      // console.info(`Pobrano ${models.length} modeli z API`);

      return models;
    } catch (error) {
      // Jeśli to już nasz błąd, ponownie go rzuć
      if (error instanceof OpenRouterError) {
        throw error;
      }

      // Inne błędy
      throw new OpenRouterNetworkError(
        `Błąd podczas pobierania listy modeli: ${this.sanitizeErrorMessage(error)}`,
        error as Error
      );
    }
  }

  /**
   * Testuje poprawność klucza API bez wykonywania pełnego żądania uzupełnienia
   *
   * @returns Promise z wartością boolean - true jeśli klucz jest poprawny
   * @throws {OpenRouterNetworkError} Dla problemów sieciowych
   *
   * @example
   * ```typescript
   * const isValid = await service.validateApiKey();
   *
   * if (isValid) {
   *   console.log('Klucz API jest poprawny');
   * } else {
   *   console.log('Klucz API jest niepoprawny');
   * }
   * ```
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Wykonaj minimalne żądanie aby przetestować klucz API
      await this.complete({
        messages: [{ role: "user", content: "test" }],
        maxTokens: 1,
        temperature: 0,
      });

      return true;
    } catch (error) {
      // Jeśli to błąd uwierzytelniania, klucz jest niepoprawny
      if (error instanceof OpenRouterAuthenticationError) {
        return false;
      }

      // Jeśli to błąd niewystarczających środków, klucz jest poprawny (ale brak środków)
      if (error instanceof OpenRouterInsufficientCreditsError) {
        return true;
      }

      // Inne błędy - przepuść je dalej
      throw error;
    }
  }
}
