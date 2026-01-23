/**
 * Konfiguracja dla OpenRouter Service
 *
 * @example
 * ```typescript
 * const config: OpenRouterConfig = {
 *   apiKey: 'sk-or-...',
 *   defaultModel: 'anthropic/claude-3-haiku',
 *   timeout: 60000,
 *   maxRetries: 3
 * };
 * ```
 */
export interface OpenRouterConfig {
  /** Klucz API OpenRouter (wymagany) */
  apiKey: string;
  /** Bazowy URL API (opcjonalny, domyślnie endpoint OpenRouter) */
  baseUrl?: string;
  /** Domyślny model do użycia (opcjonalny) */
  defaultModel?: string;
  /** Domyślny prompt systemowy (opcjonalny) */
  defaultSystemMessage?: string;
  /** Timeout żądania w ms (opcjonalny, domyślnie: 60000) */
  timeout?: number;
  /** Maksymalna liczba ponownych prób (opcjonalny, domyślnie: 3) */
  maxRetries?: number;
  /** Początkowe opóźnienie ponownej próby w ms (opcjonalny, domyślnie: 1000) */
  retryDelay?: number;
  /** Nagłówek HTTP-Referer (opcjonalny) */
  httpReferer?: string;
  /** Nagłówek X-Title (opcjonalny) */
  appTitle?: string;
}

/**
 * Wiadomość czatu w konwersacji
 */
export interface ChatMessage {
  /** Rola nadawcy wiadomości */
  role: "system" | "user" | "assistant";
  /** Zawartość wiadomości */
  content: string;
}

/**
 * Schemat JSON dla strukturyzowanych odpowiedzi
 */
export interface JsonSchema {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items?: any;
  required?: string[];
  additionalProperties?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Format odpowiedzi dla strukturyzowanego wyjścia
 *
 * @example
 * ```typescript
 * const format: ResponseFormat = {
 *   type: 'json_schema',
 *   json_schema: {
 *     name: 'flashcard_generation',
 *     strict: true,
 *     schema: {
 *       type: 'object',
 *       properties: {
 *         flashcards: {
 *           type: 'array',
 *           items: {
 *             type: 'object',
 *             properties: {
 *               front: { type: 'string' },
 *               back: { type: 'string' }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * };
 * ```
 */
export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    /** Nazwa schematu (wymagana) */
    name: string;
    /** Wymuś ścisły schemat (wymagane) */
    strict: boolean;
    /** Obiekt schematu JSON (wymagany) */
    schema: JsonSchema;
  };
}

/**
 * Opcje dla metody complete
 */
export interface CompletionOptions {
  // Konfiguracja wiadomości
  /** Tablica wiadomości czatu (wymagane) */
  messages: ChatMessage[];
  /** Nadpisz domyślną wiadomość systemową (opcjonalny) */
  systemMessage?: string;

  // Konfiguracja modelu
  /** Nadpisz domyślny model (opcjonalny) */
  model?: string;

  // Format odpowiedzi
  /** Schemat strukturyzowanego wyjścia (opcjonalny) */
  responseFormat?: ResponseFormat;

  // Parametry modelu
  /** 0.0-2.0, kontroluje losowość (opcjonalny) */
  temperature?: number;
  /** Maksymalna liczba tokenów do wygenerowania (opcjonalny) */
  maxTokens?: number;
  /** 0.0-1.0, nucleus sampling (opcjonalny) */
  topP?: number;
  /** Top-K sampling (opcjonalny) */
  topK?: number;
  /** -2.0 do 2.0 (opcjonalny) */
  frequencyPenalty?: number;
  /** -2.0 do 2.0 (opcjonalny) */
  presencePenalty?: number;

  // Konfiguracja żądania
  /** Nadpisz domyślny timeout (opcjonalny) */
  timeout?: number;
  /** Nadpisz domyślną maksymalną liczbę ponownych prób (opcjonalny) */
  maxRetries?: number;
}

/**
 * Informacje o użyciu tokenów
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Wynik operacji uzupełnienia
 *
 * @template T Typ sparsowanej zawartości odpowiedzi
 */
export interface CompletionResult<T> {
  /** Sparsowana zawartość odpowiedzi */
  content: T;
  /** Informacje o użyciu tokenów */
  usage: TokenUsage;
  /** Model, który wygenerował odpowiedź */
  model: string;
  /** Powód zakończenia (stop, length, itp.) */
  finishReason: string;
  /** Dodatkowe metadane */
  metadata: {
    requestId?: string;
    processingTime: number;
  };
}

/**
 * Informacje o dostępnym modelu
 */
export interface ModelInfo {
  /** Identyfikator modelu */
  id: string;
  /** Nazwa czytelna dla człowieka */
  name: string;
  /** Opis modelu */
  description: string;
  /** Informacje o kosztach */
  pricing: {
    /** Koszt za 1M tokenów promptu */
    prompt: number;
    /** Koszt za 1M tokenów uzupełnienia */
    completion: number;
  };
  /** Maksymalne okno kontekstowe */
  contextLength: number;
  /** Flagi możliwości */
  supports: {
    streaming: boolean;
    functionCalling: boolean;
    jsonMode: boolean;
  };
}

/**
 * Opcje generowania fiszek
 */
export interface FlashcardGenerationOptions {
  /** Model do użycia (opcjonalny) */
  model?: string;
  /** Temperatura (opcjonalny) */
  temperature?: number;
  /** Minimalna oczekiwana liczba fiszek (domyślnie: 8) */
  minFlashcards?: number;
  /** Maksymalna oczekiwana liczba fiszek (domyślnie: 15) */
  maxFlashcards?: number;
  /** Timeout (opcjonalny) */
  timeout?: number;
}

/**
 * Pojedyncza fiszka wygenerowana przez AI
 */
export interface AIFlashcard {
  /** Pytanie (1-200 znaków) */
  front: string;
  /** Odpowiedź (1-500 znaków) */
  back: string;
}

/**
 * Wewnętrzny typ żądania do API OpenRouter
 * @internal
 */
export interface OpenRouterRequest {
  model: string;
  messages: ChatMessage[];
  response_format?: ResponseFormat;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * Wewnętrzny typ odpowiedzi z API OpenRouter
 * @internal
 */
export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created: number;
}
