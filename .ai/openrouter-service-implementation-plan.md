# Plan Implementacji Usługi OpenRouter

## Spis Treści
1. [Opis Usługi](#1-opis-usługi)
2. [Opis Konstruktora](#2-opis-konstruktora)
3. [Metody i Pola Publiczne](#3-metody-i-pola-publiczne)
4. [Metody i Pola Prywatne](#4-metody-i-pola-prywatne)
5. [Obsługa Błędów](#5-obsługa-błędów)
6. [Zagadnienia Bezpieczeństwa](#6-zagadnienia-bezpieczeństwa)
7. [Plan Wdrożenia Krok po Kroku](#7-plan-wdrożenia-krok-po-kroku)

---

## 1. Opis Usługi

OpenRouter Service to warstwa abstrakcji oparta na TypeScript do interakcji z API OpenRouter.ai. Zapewnia  niezawodną i łatwą w utrzymaniu komunikację z różnymi modelami LLM poprzez zunifikowany interfejs OpenRouter.

### Kluczowe Odpowiedzialności

1. **Zarządzanie Konfiguracją**: Obsługa kluczy API, bazowych URL, domyślnych ustawień modelu i parametrów
2. **Konstrukcja Żądań**: Budowanie poprawnie sformatowanych żądań uzupełnień czatu z obsługą:
   - Wiadomości systemowych (role: "system")
   - Wiadomości użytkownika (role: "user")
   - Strukturyzowanych odpowiedzi poprzez `response_format` ze schematem JSON
   - Wyboru modelu i konfiguracji parametrów
3. **Komunikacja HTTP**: Wykonywanie bezpiecznych żądań API z odpowiednimi nagłówkami i obsługą timeoutu
4. **Przetwarzanie Odpowiedzi**: Parsowanie, walidacja i zwracanie typobezpiecznych odpowiedzi
5. **Obsługa Błędów**: Przechwytywanie, kategoryzowanie i dostarczanie praktycznych komunikatów błędów dla wszystkich scenariuszy awarii
6. **Logika Ponownych Prób**: Implementacja wykładniczego wycofania dla przejściowych awarii

### Zasady Projektowe

- **Bezpieczeństwo Typów**: Wykorzystanie TypeScript dla bezpieczeństwa w czasie kompilacji
- **Pojedyncza Odpowiedzialność**: Każda metoda ma jasny, skoncentrowany cel
- **Szybkie Wykrywanie Błędów**: Wczesna walidacja danych wejściowych i konfiguracji
- **Graceful Degradation**: Obsługa błędów bez awarii
- **Testowalność**: Projekt ułatwiający mockowanie i testy jednostkowe

---

## 2. Opis Konstruktora

### Cel
Inicjalizacja usługi OpenRouter z konfiguracją i walidacja wymaganych parametrów.

### Parametry

```typescript
interface OpenRouterConfig {
  apiKey: string;                      // Klucz API OpenRouter (wymagany)
  baseUrl?: string;                    // Bazowy URL API (opcjonalny, domyślnie endpoint OpenRouter)
  defaultModel?: string;               // Domyślny model do użycia (opcjonalny)
  defaultSystemMessage?: string;       // Domyślny prompt systemowy (opcjonalny)
  timeout?: number;                    // Timeout żądania w ms (opcjonalny, domyślnie: 60000)
  maxRetries?: number;                 // Maksymalna liczba ponownych prób (opcjonalny, domyślnie: 3)
  retryDelay?: number;                 // Początkowe opóźnienie ponownej próby w ms (opcjonalny, domyślnie: 1000)
  httpReferer?: string;                // Nagłówek HTTP-Referer (opcjonalny)
  appTitle?: string;                   // Nagłówek X-Title (opcjonalny)
}
```

### Reguły Walidacji

1. **apiKey**: Musi być niepustym ciągiem znaków; rzuć `OpenRouterConfigError` jeśli brakuje
2. **baseUrl**: Jeśli podany, musi być poprawnym URL; domyślnie `https://openrouter.ai/api/v1/chat/completions`
3. **timeout**: Musi być liczbą dodatnią między 5000-300000 (5s-5min)
4. **maxRetries**: Musi być nieujemną liczbą całkowitą ≤ 10
5. **retryDelay**: Musi być liczbą dodatnią między 100-10000 ms

### Przykład

```typescript
const openRouter = new OpenRouterService({
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultModel: 'anthropic/claude-3-haiku',
  defaultSystemMessage: 'Jesteś pomocnym asystentem.',
  timeout: 60000,
  maxRetries: 3,
  httpReferer: 'https://natigo.app',
  appTitle: 'Natigo Flashcard Generator'
});
```

---

## 3. Metody i Pola Publiczne

### 3.1 Metoda: `complete`

Generuj uzupełnienia czatu z pełną kontrolą nad wiadomościami, modelem i parametrami.

#### Sygnatura

```typescript
async complete<T = any>(options: CompletionOptions): Promise<CompletionResult<T>>
```

#### Parametry

```typescript
interface CompletionOptions {
  // Konfiguracja wiadomości
  messages: ChatMessage[];              // Tablica wiadomości czatu (wymagane)
  systemMessage?: string;               // Nadpisz domyślną wiadomość systemową (opcjonalny)
  
  // Konfiguracja modelu
  model?: string;                       // Nadpisz domyślny model (opcjonalny)
  
  // Format odpowiedzi
  responseFormat?: ResponseFormat;      // Schemat strukturyzowanego wyjścia (opcjonalny)
  
  // Parametry modelu
  temperature?: number;                 // 0.0-2.0, kontroluje losowość (opcjonalny)
  maxTokens?: number;                   // Maksymalna liczba tokenów do wygenerowania (opcjonalny)
  topP?: number;                        // 0.0-1.0, nucleus sampling (opcjonalny)
  topK?: number;                        // Top-K sampling (opcjonalny)
  frequencyPenalty?: number;            // -2.0 do 2.0 (opcjonalny)
  presencePenalty?: number;             // -2.0 do 2.0 (opcjonalny)
  
  // Konfiguracja żądania
  timeout?: number;                     // Nadpisz domyślny timeout (opcjonalny)
  maxRetries?: number;                  // Nadpisz domyślną maksymalną liczbę ponownych prób (opcjonalny)
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;                       // Nazwa schematu (wymagana)
    strict: boolean;                    // Wymuś ścisły schemat (wymagane)
    schema: JsonSchema;                 // Obiekt schematu JSON (wymagany)
  };
}

interface CompletionResult<T> {
  content: T;                           // Sparsowana zawartość odpowiedzi
  usage: {                              // Informacje o użyciu tokenów
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;                        // Model, który wygenerował odpowiedź
  finishReason: string;                 // Powód zakończenia (stop, length, itp.)
  metadata: {                           // Dodatkowe metadane
    requestId?: string;
    processingTime: number;
  };
}
```

#### Przykład 1: Proste Uzupełnienie Tekstowe

```typescript
const result = await openRouter.complete({
  messages: [
    { role: 'user', content: 'Czym jest TypeScript?' }
  ],
  temperature: 0.7,
  maxTokens: 200
});

console.log(result.content);
```

#### Przykład 2: Strukturyzowana Odpowiedź JSON

```typescript
const result = await openRouter.complete<{ flashcards: Array<{ front: string; back: string }> }>({
  systemMessage: 'Jesteś generatorem fiszek.',
  messages: [
    { role: 'user', content: inputText }
  ],
  model: 'anthropic/claude-3-haiku',
  temperature: 0.5,
  responseFormat: {
    type: 'json_schema',
    json_schema: {
      name: 'flashcard_generation',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          flashcards: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                front: { type: 'string' },
                back: { type: 'string' }
              },
              required: ['front', 'back'],
              additionalProperties: false
            }
          }
        },
        required: ['flashcards'],
        additionalProperties: false
      }
    }
  }
});

// result.content jest typowane jako { flashcards: Array<{ front: string; back: string }> }
const flashcards = result.content.flashcards;
```

### 3.2 Metoda: `generateFlashcards`

Metoda wygody specjalnie do generowania fiszek (owija `complete` z predefiniowaną konfiguracją).

#### Sygnatura

```typescript
async generateFlashcards(inputText: string, options?: FlashcardGenerationOptions): Promise<AIFlashcard[]>
```

#### Parametry

```typescript
interface FlashcardGenerationOptions {
  model?: string;
  temperature?: number;
  minFlashcards?: number;              // Minimalna oczekiwana liczba fiszek (domyślnie: 8)
  maxFlashcards?: number;              // Maksymalna oczekiwana liczba fiszek (domyślnie: 15)
  timeout?: number;
}

interface AIFlashcard {
  front: string;                       // Pytanie (1-200 znaków)
  back: string;                        // Odpowiedź (1-500 znaków)
}
```

#### Przykład

```typescript
const flashcards = await openRouter.generateFlashcards(inputText, {
  model: 'anthropic/claude-3.5-sonnet',
  temperature: 0.3,
  minFlashcards: 10,
  maxFlashcards: 20
});

console.log(`Wygenerowano ${flashcards.length} fiszek`);
```

### 3.3 Metoda: `listModels`

Pobierz dostępne modele z OpenRouter (z cache i TTL).

#### Sygnatura

```typescript
async listModels(): Promise<ModelInfo[]>
```

#### Typ Zwracany

```typescript
interface ModelInfo {
  id: string;                          // Identyfikator modelu
  name: string;                        // Nazwa czytelna dla człowieka
  description: string;                 // Opis modelu
  pricing: {                           // Informacje o kosztach
    prompt: number;                    // Koszt za 1M tokenów promptu
    completion: number;                // Koszt za 1M tokenów uzupełnienia
  };
  contextLength: number;               // Maksymalne okno kontekstowe
  supports: {                          // Flagi możliwości
    streaming: boolean;
    functionCalling: boolean;
    jsonMode: boolean;
  };
}
```

### 3.4 Metoda: `validateApiKey`

Testuj poprawność klucza API bez wykonywania pełnego żądania uzupełnienia.

#### Sygnatura

```typescript
async validateApiKey(): Promise<boolean>
```

#### Zwraca
- `true` jeśli klucz API jest poprawny
- `false` jeśli klucz API jest niepoprawny
- Rzuca `OpenRouterNetworkError` dla problemów sieciowych

### 3.5 Pola Publiczne

```typescript
class OpenRouterService {
  public readonly config: Readonly<OpenRouterConfig>;  // Niezmienna konfiguracja
}
```

---

## 4. Metody i Pola Prywatne

### 4.1 Metoda: `buildRequest`

Konstruuj payload żądania dla API OpenRouter.

#### Sygnatura

```typescript
private buildRequest(options: CompletionOptions): OpenRouterRequest
```

#### Logika

1. Rozpocznij od podstawowej struktury żądania
2. Scal wiadomość systemową z tablicą wiadomości (jeśli podana)
3. Dodaj model (użyj podanego lub domyślnego)
4. Dodaj response_format (jeśli podany)
5. Dodaj parametry modelu (temperature, maxTokens, itp.)
6. Waliduj końcową strukturę żądania
7. Zwróć obiekt żądania

#### Przykładowe Wyjście

```typescript
{
  model: 'anthropic/claude-3-haiku',
  messages: [
    { role: 'system', content: 'Jesteś generatorem fiszek.' },
    { role: 'user', content: 'Wygeneruj fiszki o TypeScript...' }
  ],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'flashcard_generation',
      strict: true,
      schema: { /* Schemat JSON */ }
    }
  },
  temperature: 0.5,
  max_tokens: 2000
}
```

### 4.2 Metoda: `executeRequest`

Wykonaj żądanie HTTP z logiką ponownych prób i obsługą timeout.

#### Sygnatura

```typescript
private async executeRequest(
  request: OpenRouterRequest, 
  timeout: number, 
  maxRetries: number
): Promise<OpenRouterResponse>
```

#### Logika

1. Utwórz AbortController dla timeout
2. Ustaw timer timeout
3. Próbuj fetch z odpowiednimi nagłówkami:
   - `Authorization: Bearer ${apiKey}`
   - `Content-Type: application/json`
   - `HTTP-Referer: ${httpReferer}`
   - `X-Title: ${appTitle}`
4. Jeśli żądanie nie powiedzie się z błędem możliwym do ponowienia (429, 500, 502, 503, 504, błąd sieciowy):
   a. Sprawdź czy pozostały ponowne próby
   b. Oblicz opóźnienie wycofania: `retryDelay * 2^attemptNumber`
   c. Czekaj i ponów
5. Jeśli żądanie powiedzie się lub błąd niemożliwy do ponowienia, zwróć/rzuć
6. Wyczyść timeout po zakończeniu

#### Kody Statusu Możliwe do Ponowienia
- 429 (Too Many Requests - Za dużo żądań)
- 500 (Internal Server Error - Błąd wewnętrzny serwera)
- 502 (Bad Gateway - Zła brama)
- 503 (Service Unavailable - Usługa niedostępna)
- 504 (Gateway Timeout - Timeout bramy)
- Błędy sieciowe (ECONNREFUSED, ETIMEDOUT, itp.)

#### Kody Statusu Niemożliwe do Ponowienia
- 400 (Bad Request - Złe żądanie) → `OpenRouterValidationError`
- 401 (Unauthorized - Nieautoryzowany) → `OpenRouterAuthenticationError`
- 403 (Forbidden - Zabroniony) → `OpenRouterAuthenticationError`
- 404 (Not Found - Nie znaleziono) → `OpenRouterModelNotFoundError`
- 413 (Payload Too Large - Zbyt duży payload) → `OpenRouterValidationError`
- 422 (Unprocessable Entity - Jednostka nieprzetwarzalna) → `OpenRouterValidationError`

### 4.3 Metoda: `parseResponse`

Parsuj i waliduj strukturę odpowiedzi API.

#### Sygnatura

```typescript
private parseResponse<T>(response: OpenRouterResponse): CompletionResult<T>
```

#### Logika

1. Waliduj czy odpowiedź ma tablicę `choices`
2. Waliduj czy istnieje pierwszy wybór
3. Wyodrębnij zawartość z `choices[0].message.content`
4. Jeśli response_format był json_schema, parsuj zawartość jako JSON
5. Wyodrębnij informacje o użyciu
6. Wyodrębnij finish_reason
7. Zbuduj i zwróć CompletionResult
8. Rzuć `OpenRouterParseError` jeśli jakakolwiek walidacja nie powiedzie się

### 4.4 Metoda: `createResponseFormat`

Helper do budowania obiektu response_format z odpowiednią strukturą.

#### Sygnatura

```typescript
private createResponseFormat(name: string, schema: JsonSchema): ResponseFormat
```

#### Logika

```typescript
return {
  type: 'json_schema',
  json_schema: {
    name,
    strict: true,
    schema
  }
};
```

### 4.5 Metoda: `validateCompletionOptions`

Waliduj opcje uzupełnienia przed budowaniem żądania.

#### Sygnatura

```typescript
private validateCompletionOptions(options: CompletionOptions): void
```

#### Walidacje

1. `messages` musi być niepustą tablicą
2. Każda wiadomość musi mieć poprawną `role` i niepustą `content`
3. Jeśli podane `temperature`, musi być 0.0-2.0
4. Jeśli podane `maxTokens`, musi być dodatnią liczbą całkowitą
5. Jeśli podane `topP`, musi być 0.0-1.0
6. Jeśli podane `responseFormat`, musi mieć wymagane pola
7. Rzuć `OpenRouterValidationError` jeśli jakakolwiek walidacja nie powiedzie się

### 4.6 Pola Prywatne

```typescript
private readonly apiKey: string;
private readonly baseUrl: string;
private readonly defaultModel: string;
private readonly defaultSystemMessage?: string;
private readonly timeout: number;
private readonly maxRetries: number;
private readonly retryDelay: number;
private readonly httpReferer?: string;
private readonly appTitle?: string;
private modelsCache?: { data: ModelInfo[]; timestamp: number };
private readonly modelsCacheTTL = 3600000; // 1 godzina
```

---

## 5. Obsługa Błędów

### 5.1 Niestandardowe Klasy Błędów

Utwórz hierarchię niestandardowych błędów w `src/lib/errors/openrouter.errors.ts`:

```typescript
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
    this.name = 'OpenRouterError';
  }
}

/**
 * Błędy konfiguracji (niepoprawny klucz API, źle sformułowana konfiguracja, itp.)
 */
export class OpenRouterConfigError extends OpenRouterError {
  constructor(message: string, details?: unknown) {
    super(message, 'OPENROUTER_CONFIG_ERROR', undefined, details);
    this.name = 'OpenRouterConfigError';
  }
}

/**
 * Błędy uwierzytelniania (401, 403)
 */
export class OpenRouterAuthenticationError extends OpenRouterError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, 'OPENROUTER_AUTH_ERROR', statusCode, details);
    this.name = 'OpenRouterAuthenticationError';
  }
}

/**
 * Błędy walidacji (400, 422, niepoprawny format żądania)
 */
export class OpenRouterValidationError extends OpenRouterError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, 'OPENROUTER_VALIDATION_ERROR', statusCode, details);
    this.name = 'OpenRouterValidationError';
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
    super(message, 'OPENROUTER_RATE_LIMIT', 429, details);
    this.name = 'OpenRouterRateLimitError';
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
    super(message, 'OPENROUTER_MODEL_NOT_FOUND', 404, details);
    this.name = 'OpenRouterModelNotFoundError';
  }
}

/**
 * Błędy niedostępności usługi (500, 502, 503, 504)
 */
export class OpenRouterServiceError extends OpenRouterError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, 'OPENROUTER_SERVICE_ERROR', statusCode, details);
    this.name = 'OpenRouterServiceError';
  }
}

/**
 * Błędy sieciowe (timeout, odmowa połączenia, itp.)
 */
export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message: string, public readonly cause?: Error) {
    super(message, 'OPENROUTER_NETWORK_ERROR', undefined, cause);
    this.name = 'OpenRouterNetworkError';
  }
}

/**
 * Błędy parsowania odpowiedzi (niepoprawny JSON, niezgodność schematu)
 */
export class OpenRouterParseError extends OpenRouterError {
  constructor(message: string, details?: unknown) {
    super(message, 'OPENROUTER_PARSE_ERROR', undefined, details);
    this.name = 'OpenRouterParseError';
  }
}

/**
 * Błędy timeout
 */
export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message, 'OPENROUTER_TIMEOUT', undefined, { timeoutMs });
    this.name = 'OpenRouterTimeoutError';
  }
}

/**
 * Błąd niewystarczających środków (specyficzny dla OpenRouter)
 */
export class OpenRouterInsufficientCreditsError extends OpenRouterError {
  constructor(message: string, details?: unknown) {
    super(message, 'OPENROUTER_INSUFFICIENT_CREDITS', 402, details);
    this.name = 'OpenRouterInsufficientCreditsError';
  }
}
```

### 5.2 Scenariusze Obsługi Błędów

#### Scenariusz 1: Niepoprawna Konfiguracja
```typescript
// W konstruktorze
if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
  throw new OpenRouterConfigError('Klucz API jest wymagany i musi być niepustym ciągiem znaków');
}
```

#### Scenariusz 2: Błąd Uwierzytelniania
```typescript
// W executeRequest
if (response.status === 401 || response.status === 403) {
  const errorBody = await response.json().catch(() => ({}));
  throw new OpenRouterAuthenticationError(
    'Niepoprawny klucz API lub niewystarczające uprawnienia',
    response.status,
    errorBody
  );
}
```

#### Scenariusz 3: Limitowanie Szybkości
```typescript
// W executeRequest
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
  
  if (attemptNumber < maxRetries) {
    const backoffMs = this.retryDelay * Math.pow(2, attemptNumber);
    await new Promise(resolve => setTimeout(resolve, backoffMs));
    // Ponów próbę...
  } else {
    throw new OpenRouterRateLimitError(
      'Przekroczono limit szybkości i wyczerpano maksymalną liczbę ponownych prób',
      retryAfterSeconds,
      { attempts: attemptNumber + 1 }
    );
  }
}
```

#### Scenariusz 4: Nie Znaleziono Modelu
```typescript
// W executeRequest
if (response.status === 404) {
  const errorBody = await response.json().catch(() => ({}));
  throw new OpenRouterModelNotFoundError(
    `Nie znaleziono modelu: ${request.model}. Sprawdź dostępne modele za pomocą listModels()`,
    request.model,
    errorBody
  );
}
```

#### Scenariusz 5: Timeout Żądania
```typescript
// W executeRequest
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeout);

try {
  const response = await fetch(this.baseUrl, {
    signal: controller.signal,
    // ... inne opcje
  });
  clearTimeout(timeoutId);
  return response;
} catch (error) {
  clearTimeout(timeoutId);
  
  if (error.name === 'AbortError') {
    throw new OpenRouterTimeoutError(
      `Upłynął limit czasu żądania po ${timeout}ms`,
      timeout
    );
  }
  throw error;
}
```

#### Scenariusz 6: Błąd Parsowania Odpowiedzi
```typescript
// W parseResponse
try {
  const content = JSON.parse(rawContent);
  return content;
} catch (error) {
  throw new OpenRouterParseError(
    'Nie udało się sparsować odpowiedzi jako JSON',
    { rawContent, error: error.message }
  );
}
```

#### Scenariusz 7: Błąd Sieciowy
```typescript
// W executeRequest
try {
  // ... żądanie fetch
} catch (error) {
  if (error instanceof OpenRouterError) {
    throw error; // Ponownie rzuć nasze niestandardowe błędy
  }
  
  // Błędy sieciowe
  throw new OpenRouterNetworkError(
    `Błąd sieciowy: ${error.message}`,
    error
  );
}
```

#### Scenariusz 8: Błędy Serwera z Ponowieniem
```typescript
// W executeRequest
if (response.status >= 500) {
  if (attemptNumber < maxRetries) {
    const backoffMs = this.retryDelay * Math.pow(2, attemptNumber);
    console.warn(`Błąd serwera ${response.status}, ponowienie za ${backoffMs}ms...`);
    await new Promise(resolve => setTimeout(resolve, backoffMs));
    // Ponów próbę...
  } else {
    const errorBody = await response.text().catch(() => 'Nieznany błąd');
    throw new OpenRouterServiceError(
      `Błąd usługi OpenRouter (${response.status}) po ${maxRetries} ponownych próbach`,
      response.status,
      { body: errorBody, attempts: attemptNumber + 1 }
    );
  }
}
```

### 5.3 Strategia Logowania Błędów

Wszystkie błędy powinny być logowane ze strukturyzowanymi informacjami:

```typescript
private logError(error: OpenRouterError, context: Record<string, unknown>): void {
  console.error('Błąd OpenRouter:', {
    name: error.name,
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    details: error.details,
    context,
    timestamp: new Date().toISOString()
  });
}
```

### 5.4 Przyjazne dla Użytkownika Komunikaty Błędów

Mapuj wewnętrzne błędy na przyjazne dla użytkownika komunikaty:

```typescript
export function getUserFriendlyErrorMessage(error: OpenRouterError): string {
  switch (error.code) {
    case 'OPENROUTER_AUTH_ERROR':
      return 'Uwierzytelnianie nie powiodło się. Sprawdź swój klucz API.';
    case 'OPENROUTER_RATE_LIMIT':
      return 'Za dużo żądań. Spróbuj ponownie za chwilę.';
    case 'OPENROUTER_TIMEOUT':
      return 'Upłynął limit czasu żądania. Spróbuj ponownie.';
    case 'OPENROUTER_NETWORK_ERROR':
      return 'Błąd sieci. Sprawdź swoje połączenie i spróbuj ponownie.';
    case 'OPENROUTER_MODEL_NOT_FOUND':
      return `Model niedostępny. Wybierz inny model.`;
    case 'OPENROUTER_INSUFFICIENT_CREDITS':
      return 'Niewystarczające środki. Doładuj swoje konto OpenRouter.';
    case 'OPENROUTER_PARSE_ERROR':
      return 'Nie udało się przetworzyć odpowiedzi AI. Spróbuj ponownie.';
    case 'OPENROUTER_SERVICE_ERROR':
      return 'Usługa AI jest tymczasowo niedostępna. Spróbuj ponownie później.';
    case 'OPENROUTER_VALIDATION_ERROR':
      return 'Niepoprawne żądanie. Sprawdź swoje dane wejściowe i spróbuj ponownie.';
    default:
      return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';
  }
}
```

---

## 6. Zagadnienia Bezpieczeństwa

### 6.1 Ochrona Klucza API

**Wymagania:**
1. Nigdy nie loguj kluczy API w komunikatach błędów lub logach
2. Przechowuj klucze API tylko w zmiennych środowiskowych
3. Waliduj format klucza API w konstruktorze (podstawowe sprawdzenie)
4. Używaj pól readonly aby zapobiec modyfikacji po inicjalizacji

**Implementacja:**

```typescript
// Walidacja konstruktora
if (!config.apiKey.startsWith('sk-or-')) {
  console.warn('Klucz API nie pasuje do oczekiwanego formatu OpenRouter (sk-or-...)');
}

// Logowanie - ukryj klucz API
private getRedactedConfig(): Partial<OpenRouterConfig> {
  return {
    ...this.config,
    apiKey: `${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}`
  };
}
```

### 6.2 Walidacja i Sanityzacja Danych Wejściowych

**Wymagania:**
1. Waliduj wszystkie dane wejściowe użytkownika przed wysłaniem do API
2. Sanityzuj komunikaty błędów aby uniknąć wycieku wrażliwych danych
3. Ogranicz długość zawartości wiadomości aby zapobiec nadużyciom
4. Waliduj strukturę schematu JSON

**Implementacja:**

```typescript
// Walidacja wiadomości
private validateMessages(messages: ChatMessage[]): void {
  const MAX_MESSAGE_LENGTH = 100000; // 100k znaków
  
  for (const message of messages) {
    if (!['system', 'user', 'assistant'].includes(message.role)) {
      throw new OpenRouterValidationError(`Niepoprawna rola wiadomości: ${message.role}`, 400);
    }
    
    if (typeof message.content !== 'string') {
      throw new OpenRouterValidationError('Zawartość wiadomości musi być ciągiem znaków', 400);
    }
    
    if (message.content.length > MAX_MESSAGE_LENGTH) {
      throw new OpenRouterValidationError(
        `Zawartość wiadomości przekracza maksymalną długość ${MAX_MESSAGE_LENGTH} znaków`,
        400
      );
    }
  }
}

// Sanityzacja błędów
private sanitizeErrorMessage(error: any): string {
  const message = error?.message || String(error);
  // Usuń potencjalne klucze API, tokeny lub wrażliwe wzorce
  return message.replace(/sk-[a-zA-Z0-9-_]+/g, '[UKRYTO]');
}
```

### 6.3 Limitowanie Szybkości i Kontrola Kosztów

**Wymagania:**
1. Implementuj timeout żądania aby zapobiec zawieszaniu żądań
2. Obsługuj konfigurowalne limity ponownych prób aby kontrolować koszty
3. Loguj użycie tokenów dla monitorowania kosztów
4. Rozważ implementację limitowania szybkości po stronie klienta

**Implementacja:**

```typescript
// Śledzenie użycia tokenów
private logTokenUsage(usage: TokenUsage, model: string): void {
  console.info('Użycie Tokenów OpenRouter:', {
    model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    timestamp: new Date().toISOString()
  });
}

// Opcjonalnie: Limiter szybkości po stronie klienta
class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  async checkLimit(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitMs = this.windowMs - (now - oldestRequest);
      throw new OpenRouterRateLimitError(
        `Limit szybkości po stronie klienta: max ${this.maxRequests} żądań na ${this.windowMs}ms`,
        Math.ceil(waitMs / 1000)
      );
    }
    
    this.requests.push(now);
  }
}
```

### 6.4 HTTPS i Bezpieczeństwo Nagłówków

**Wymagania:**
1. Zawsze używaj HTTPS do komunikacji API
2. Ustaw odpowiednie nagłówki (Referer, Title) dla śledzenia OpenRouter
3. Waliduj certyfikaty SSL (domyślne zachowanie w fetch)
4. Ustaw rozsądne wartości timeout

**Implementacja:**

```typescript
// Zapewnij HTTPS
if (!this.baseUrl.startsWith('https://')) {
  throw new OpenRouterConfigError('Bazowy URL musi używać protokołu HTTPS');
}

// Nagłówki żądania
private getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Authorization': `Bearer ${this.apiKey}`,
    'Content-Type': 'application/json',
  };
  
  if (this.httpReferer) {
    headers['HTTP-Referer'] = this.httpReferer;
  }
  
  if (this.appTitle) {
    headers['X-Title'] = this.appTitle;
  }
  
  return headers;
}
```

### 6.5 Bezpieczeństwo Zależności

**Wymagania:**
1. Minimalizuj zewnętrzne zależności
2. Aktualizuj TypeScript i zależności runtime
3. Używaj wbudowanego API `fetch` (dostępne w Node.js 18+)
4. Regularnie audytuj zależności

**Uwagi:**
- Ta usługa używa tylko wbudowanych API Node.js/przeglądarki (fetch, crypto)
- Nie są potrzebne zewnętrzne biblioteki klienta HTTP
- Rozważ użycie `npm audit` w pipeline CI/CD

---

## 7. Plan Wdrożenia Krok po Kroku

### Faza 1: Klasy Błędów i Typy (Dzień 1)

#### Krok 1.1: Utwórz Klasy Błędów

**Plik**: `src/lib/errors/openrouter.errors.ts`

1. Utwórz bazową klasę `OpenRouterError` z code, statusCode, details
2. Utwórz specyficzne klasy błędów (łącznie 11):
   - OpenRouterConfigError
   - OpenRouterAuthenticationError
   - OpenRouterValidationError
   - OpenRouterRateLimitError
   - OpenRouterModelNotFoundError
   - OpenRouterServiceError
   - OpenRouterNetworkError
   - OpenRouterParseError
   - OpenRouterTimeoutError
   - OpenRouterInsufficientCreditsError
3. Eksportuj funkcję pomocniczą `getUserFriendlyErrorMessage`
4. Dodaj komentarze JSDoc dla każdej klasy błędu

**Testowanie:**
```typescript
// Test tworzenia instancji błędu
const error = new OpenRouterAuthenticationError('Test', 401, { detail: 'test' });
expect(error.code).toBe('OPENROUTER_AUTH_ERROR');
expect(error.statusCode).toBe(401);
```

#### Krok 1.2: Utwórz Typy TypeScript

**Plik**: `src/lib/types/openrouter.types.ts`

1. Zdefiniuj typy konfiguracji:
   ```typescript
   export interface OpenRouterConfig { /* ... */ }
   ```

2. Zdefiniuj typy żądań:
   ```typescript
   export interface CompletionOptions { /* ... */ }
   export interface ChatMessage { /* ... */ }
   export interface ResponseFormat { /* ... */ }
   export interface JsonSchema { /* ... */ }
   ```

3. Zdefiniuj typy odpowiedzi:
   ```typescript
   export interface CompletionResult<T> { /* ... */ }
   export interface TokenUsage { /* ... */ }
   export interface ModelInfo { /* ... */ }
   ```

4. Zdefiniuj wewnętrzne typy API:
   ```typescript
   interface OpenRouterRequest { /* ... */ }
   interface OpenRouterResponse { /* ... */ }
   ```

5. Dodaj komentarze JSDoc z przykładami dla każdego interfejsu

**Testowanie:**
```typescript
// Sprawdzanie typów (w czasie kompilacji)
const config: OpenRouterConfig = {
  apiKey: 'test',
  defaultModel: 'anthropic/claude-3-haiku'
};
```

#### Krok 1.3: Aktualizuj Typy Globalne

**Plik**: `src/types.ts`

1. Eksportuj typy OpenRouter do użycia w innych częściach aplikacji:
   ```typescript
   export type { OpenRouterConfig, CompletionOptions, CompletionResult, AIFlashcard } from './lib/types/openrouter.types';
   ```

### Faza 2: Implementacja Podstawowej Usługi (Dni 2-3)

#### Krok 2.1: Konstruktor i Walidacja

**Plik**: `src/lib/services/openrouter.service.ts`

1. Utwórz szkielet klasy:
   ```typescript
   export class OpenRouterService {
     private readonly apiKey: string;
     // ... inne pola
     
     constructor(config: OpenRouterConfig) {
       // Implementacja
     }
   }
   ```

2. Implementuj walidację konstruktora:
   - Waliduj klucz API (wymagany, niepusty)
   - Waliduj baseUrl (poprawny format URL, HTTPS)
   - Waliduj timeout (zakres 5000-300000ms)
   - Waliduj maxRetries (zakres 0-10)
   - Waliduj retryDelay (zakres 100-10000ms)
   - Ustaw domyślne wartości dla opcjonalnych parametrów

3. Przechowuj konfigurację w prywatnych polach

4. Dodaj logowanie konfiguracji (z ukrytym kluczem API)

**Testowanie:**
```typescript
// Poprawna konfiguracja
const service = new OpenRouterService({
  apiKey: 'sk-or-test123',
  defaultModel: 'anthropic/claude-3-haiku'
});

// Niepoprawna konfiguracja
expect(() => new OpenRouterService({ apiKey: '' }))
  .toThrow(OpenRouterConfigError);
```

#### Krok 2.2: Builder Żądań

**Plik**: `src/lib/services/openrouter.service.ts`

1. Implementuj metodę `buildRequest`:
   ```typescript
   private buildRequest(options: CompletionOptions): OpenRouterRequest {
     // 1. Rozpocznij od podstawowej struktury
     // 2. Zbuduj tablicę wiadomości
     // 3. Dodaj model
     // 4. Dodaj response_format
     // 5. Dodaj parametry
     // 6. Waliduj
     // 7. Zwróć
   }
   ```

2. Implementuj pomocnika `createResponseFormat`:
   ```typescript
   private createResponseFormat(name: string, schema: JsonSchema): ResponseFormat {
     return {
       type: 'json_schema',
       json_schema: { name, strict: true, schema }
     };
   }
   ```

3. Implementuj metodę `validateCompletionOptions`:
   - Sprawdź tablicę wiadomości
   - Waliduj strukturę wiadomości
   - Waliduj parametry (temperature, topP, itp.)
   - Rzuć OpenRouterValidationError dla niepoprawnych danych wejściowych

**Testowanie:**
```typescript
const request = service['buildRequest']({
  messages: [{ role: 'user', content: 'Test' }],
  temperature: 0.7
});
expect(request.model).toBeDefined();
expect(request.messages).toHaveLength(1);
```

#### Krok 2.3: Klient HTTP z Logiką Ponownych Prób

**Plik**: `src/lib/services/openrouter.service.ts`

1. Implementuj metodę `executeRequest`:
   ```typescript
   private async executeRequest(
     request: OpenRouterRequest,
     timeout: number,
     maxRetries: number
   ): Promise<OpenRouterResponse> {
     let attemptNumber = 0;
     let lastError: Error | null = null;
     
     while (attemptNumber <= maxRetries) {
       try {
         // Utwórz abort controller
         // Ustaw timeout
         // Wykonaj żądanie fetch
         // Obsłuż status odpowiedzi
         // Zwróć odpowiedź w przypadku sukcesu
       } catch (error) {
         // Sprawdź czy można ponowić
         // Oblicz backoff
         // Ponów lub rzuć
       }
       attemptNumber++;
     }
     
     throw lastError;
   }
   ```

2. Implementuj logikę ponownych prób:
   - Wykładnicze wycofanie: `retryDelay * 2^attemptNumber`
   - Ponów przy: 429, 500, 502, 503, 504, błędach sieciowych
   - Nie ponawiaj przy: 400, 401, 403, 404, 422

3. Implementuj obsługę timeout:
   - Użyj AbortController
   - Wyczyść timeout przy sukcesie
   - Rzuć OpenRouterTimeoutError przy abort

4. Implementuj mapowanie błędów:
   - Mapuj kody statusu HTTP na klasy błędów
   - Wyodrębnij szczegóły błędu z treści odpowiedzi
   - Loguj błędy z kontekstem

**Testowanie:**
```typescript
// Mockuj fetch aby symulować ponowne próby
let callCount = 0;
global.fetch = jest.fn(() => {
  callCount++;
  if (callCount < 3) {
    return Promise.resolve({ status: 503 });
  }
  return Promise.resolve({ status: 200, json: () => ({}) });
});

await service['executeRequest'](request, 60000, 3);
expect(callCount).toBe(3);
```

#### Krok 2.4: Parser Odpowiedzi

**Plik**: `src/lib/services/openrouter.service.ts`

1. Implementuj metodę `parseResponse`:
   ```typescript
   private parseResponse<T>(response: OpenRouterResponse): CompletionResult<T> {
     // 1. Waliduj strukturę odpowiedzi
     // 2. Wyodrębnij zawartość
     // 3. Parsuj JSON jeśli potrzeba
     // 4. Wyodrębnij informacje o użyciu
     // 5. Zbuduj obiekt wyniku
     // 6. Loguj użycie tokenów
     // 7. Zwróć typowany wynik
   }
   ```

2. Implementuj parsowanie JSON z obsługą błędów:
   - Spróbuj sparsować zawartość jako JSON
   - Złap SyntaxError i rzuć OpenRouterParseError
   - Dołącz surową zawartość w szczegółach błędu

3. Implementuj walidację odpowiedzi:
   - Sprawdź wymagane pola (choices, usage)
   - Waliduj struktury tablic
   - Rzuć OpenRouterParseError jeśli niepoprawne

**Testowanie:**
```typescript
const apiResponse = {
  choices: [{
    message: { content: '{"result": "test"}' },
    finish_reason: 'stop'
  }],
  usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  model: 'test-model'
};

const result = service['parseResponse'](apiResponse);
expect(result.content).toEqual({ result: 'test' });
expect(result.usage.totalTokens).toBe(30);
```

### Faza 3: Metody Publiczne (Dzień 4)

#### Krok 3.1: Metoda Complete

**Plik**: `src/lib/services/openrouter.service.ts`

1. Implementuj metodę `complete`:
   ```typescript
   async complete<T = any>(options: CompletionOptions): Promise<CompletionResult<T>> {
     // 1. Waliduj opcje
     // 2. Zbuduj żądanie
     // 3. Wykonaj żądanie z ponowieniami
     // 4. Parsuj odpowiedź
     // 5. Zwróć typowany wynik
   }
   ```

2. Dodaj kompleksową obsługę błędów:
   - Owij w try-catch
   - Loguj błędy z kontekstem
   - Ponownie rzuć typowane błędy
   - Konwertuj nieznane błędy na OpenRouterError

3. Dodaj pomiar wydajności:
   - Śledź czas rozpoczęcia żądania
   - Oblicz czas przetwarzania
   - Dołącz do metadanych wyniku

**Testowanie:**
```typescript
const result = await service.complete({
  messages: [{ role: 'user', content: 'Cześć' }],
  model: 'anthropic/claude-3-haiku'
});
expect(result.content).toBeDefined();
expect(result.usage).toBeDefined();
```

#### Krok 3.2: Metoda Generate Flashcards

**Plik**: `src/lib/services/openrouter.service.ts`

1. Implementuj metodę `generateFlashcards`:
   ```typescript
   async generateFlashcards(
     inputText: string,
     options?: FlashcardGenerationOptions
   ): Promise<AIFlashcard[]> {
     // 1. Zbuduj wiadomość systemową
     // 2. Utwórz schemat formatu odpowiedzi
     // 3. Wywołaj metodę complete
     // 4. Wyodrębnij fiszki z wyniku
     // 5. Waliduj fiszki
     // 6. Zwróć tablicę
   }
   ```

2. Utwórz schemat JSON fiszek:
   ```typescript
   const flashcardSchema = {
     type: 'object',
     properties: {
       flashcards: {
         type: 'array',
         items: {
           type: 'object',
           properties: {
             front: { type: 'string' },
             back: { type: 'string' }
           },
           required: ['front', 'back'],
           additionalProperties: false
         }
       }
     },
     required: ['flashcards'],
     additionalProperties: false
   };
   ```

3. Zbuduj prompt systemowy:
   ```typescript
   const systemPrompt = `Jesteś generatorem fiszek. Twoim zadaniem jest analiza dostarczonego tekstu i tworzenie wysokiej jakości fiszek do nauki.

Zasady:
- Wygeneruj ${minFlashcards}-${maxFlashcards} fiszek z tekstu
- Każda fiszka powinna mieć jasne pytanie (front) i odpowiedź (back)
- Pytania powinny być zwięzłe (1-200 znaków)
- Odpowiedzi powinny być pełne, ale zwięzłe (1-500 znaków)
- Skup się na kluczowych koncepcjach, definicjach, faktach i relacjach
- Unikaj zbyt prostych lub trywialnych pytań`;
   ```

4. Waliduj fiszki po wygenerowaniu:
   - Sprawdź liczbę (minFlashcards ≤ liczba ≤ maxFlashcards)
   - Waliduj każdą fiszkę (front: 1-200 znaków, back: 1-500 znaków)
   - Filtruj niepoprawne fiszki
   - Rzuć błąd jeśli brak poprawnych fiszek

**Testowanie:**
```typescript
const flashcards = await service.generateFlashcards(
  'TypeScript to typowany nadzbiór JavaScript.',
  { minFlashcards: 1, maxFlashcards: 5 }
);
expect(flashcards).toBeInstanceOf(Array);
expect(flashcards.length).toBeGreaterThan(0);
expect(flashcards[0]).toHaveProperty('front');
expect(flashcards[0]).toHaveProperty('back');
```

#### Krok 3.3: Metoda List Models

**Plik**: `src/lib/services/openrouter.service.ts`

1. Implementuj metodę `listModels`:
   ```typescript
   async listModels(): Promise<ModelInfo[]> {
     // 1. Sprawdź cache
     // 2. Jeśli cache ważny, zwróć dane z cache
     // 3. Jeśli cache nieważny/brakujący, pobierz z API
     // 4. Parsuj odpowiedź
     // 5. Aktualizuj cache
     // 6. Zwróć modele
   }
   ```

2. Implementuj logikę cache:
   ```typescript
   private modelsCache?: {
     data: ModelInfo[];
     timestamp: number;
   };
   private readonly modelsCacheTTL = 3600000; // 1 godzina
   
   private isCacheValid(): boolean {
     if (!this.modelsCache) return false;
     return Date.now() - this.modelsCache.timestamp < this.modelsCacheTTL;
   }
   ```

3. Wykonaj żądanie GET do endpointu `/api/v1/models`

4. Przekształć odpowiedź API do formatu `ModelInfo[]`

**Testowanie:**
```typescript
const models = await service.listModels();
expect(models).toBeInstanceOf(Array);
expect(models.length).toBeGreaterThan(0);

// Drugie wywołanie powinno użyć cache
const models2 = await service.listModels();
expect(models2).toEqual(models);
```

#### Krok 3.4: Metoda Validate API Key

**Plik**: `src/lib/services/openrouter.service.ts`

1. Implementuj metodę `validateApiKey`:
   ```typescript
   async validateApiKey(): Promise<boolean> {
     try {
       // Wykonaj minimalne żądanie aby przetestować klucz API
       await this.complete({
         messages: [{ role: 'user', content: 'test' }],
         maxTokens: 1
       });
       return true;
     } catch (error) {
       if (error instanceof OpenRouterAuthenticationError) {
         return false;
       }
       throw error; // Ponownie rzuć inne błędy
     }
   }
   ```

**Testowanie:**
```typescript
const isValid = await service.validateApiKey();
expect(typeof isValid).toBe('boolean');
```

### Faza 4: Integracja i Migracja (Dzień 5)

#### Krok 4.1: Utwórz Instancję Usługi

**Plik**: `src/lib/services/openrouter.instance.ts`

1. Utwórz instancję singleton:
   ```typescript
   import { OpenRouterService } from './openrouter.service';
   
   if (!import.meta.env.OPENROUTER_API_KEY) {
     throw new Error('Zmienna środowiskowa OPENROUTER_API_KEY jest wymagana');
   }
   
   export const openRouterService = new OpenRouterService({
     apiKey: import.meta.env.OPENROUTER_API_KEY,
     baseUrl: import.meta.env.OPENROUTER_API_URL,
     defaultModel: import.meta.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku',
     timeout: 60000,
     maxRetries: 3,
     retryDelay: 1000,
     httpReferer: 'https://natigo.app',
     appTitle: 'Natigo Flashcard Generator'
   });
   ```

#### Krok 4.2: Aktualizuj Usługę AI

**Plik**: `src/lib/services/ai.service.ts`

1. Importuj nową usługę OpenRouter:
   ```typescript
   import { openRouterService } from './openrouter.instance';
   import type { AIFlashcard } from '../types/openrouter.types';
   ```

2. Zastąp istniejącą implementację `generateFlashcardsWithAI`:
   ```typescript
   export async function generateFlashcardsWithAI(
     inputText: string,
     timeoutMs = 60000
   ): Promise<AIFlashcard[]> {
     const MOCK_MODE = import.meta.env.OPENROUTER_API_KEY === "mock" || 
                       !import.meta.env.OPENROUTER_API_KEY;
     
     if (MOCK_MODE) {
       // Zachowaj istniejącą logikę mockowania
       await new Promise((resolve) => setTimeout(resolve, 2000));
       return [ /* mockowe fiszki */ ];
     }
     
     // Użyj nowej usługi OpenRouter
     return await openRouterService.generateFlashcards(inputText, {
       timeout: timeoutMs
     });
   }
   ```

3. Zachowaj istniejące typy błędów dla kompatybilności wstecznej:
   ```typescript
   // Mapuj błędy OpenRouter na istniejące błędy AI
   import { 
     OpenRouterError,
     OpenRouterTimeoutError,
     getUserFriendlyErrorMessage 
   } from '../errors/openrouter.errors';
   
   try {
     return await openRouterService.generateFlashcards(inputText, options);
   } catch (error) {
     if (error instanceof OpenRouterTimeoutError) {
       throw new AITimeoutError(error.message);
     }
     if (error instanceof OpenRouterError) {
       throw new AIServiceError(
         getUserFriendlyErrorMessage(error),
         error.details
       );
     }
     throw error;
   }
   ```

#### Krok 4.3: Aktualizuj Zmienne Środowiskowe

**Plik**: `.env.example` (utwórz jeśli nie istnieje)

```bash
# Konfiguracja API OpenRouter
OPENROUTER_API_KEY=sk-or-twoj-klucz-tutaj
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_MODEL=anthropic/claude-3-haiku

# Dla rozwoju/testowania
# OPENROUTER_API_KEY=mock
```

#### Krok 4.4: Aktualizuj Eksporty Typów

**Plik**: `src/types.ts`

1. Ponownie eksportuj typy OpenRouter:
   ```typescript
   // Typy OpenRouter
   export type {
     OpenRouterConfig,
     CompletionOptions,
     CompletionResult,
     ChatMessage,
     ResponseFormat,
     ModelInfo
   } from './lib/types/openrouter.types';
   
   export type { AIFlashcard } from './lib/types/openrouter.types';
   ```

### Faza 5: Testowanie i Dokumentacja (Dzień 6)

#### Krok 5.1: Testy Jednostkowe

**Plik**: `src/lib/services/__tests__/openrouter.service.test.ts`

Utwórz kompleksowy zestaw testów:

1. Testy konstruktora:
   - Poprawna konfiguracja
   - Niepoprawny klucz API
   - Niepoprawny timeout
   - Wartości domyślne

2. Testy budowania żądań:
   - Podstawowe żądanie
   - Z wiadomością systemową
   - Z formatem odpowiedzi
   - Z niestandardowymi parametrami

3. Testy obsługi błędów:
   - Błędy uwierzytelniania
   - Limitowanie szybkości
   - Timeouty
   - Błędy sieciowe
   - Błędy parsowania

4. Testy logiki ponownych prób:
   - Udane ponowienie
   - Wyczerpanie maksymalnej liczby ponownych prób
   - Błędy niemożliwe do ponowienia

5. Testy parsowania odpowiedzi:
   - Poprawna odpowiedź JSON
   - Niepoprawny JSON
   - Brakujące pola
   - Rzutowanie typów

6. Testy integracyjne (z mockowanym API):
   - Metoda complete end-to-end
   - Generowanie fiszek end-to-end
   - Lista modeli
   - Walidacja klucza API

#### Krok 5.2: Testy Integracyjne

**Plik**: `src/lib/services/__tests__/openrouter.integration.test.ts`

1. Test z prawdziwym API (pominięty w CI):
   ```typescript
   describe.skip('Testy Integracyjne OpenRouter', () => {
     // Uruchamiaj tylko ręcznie z prawdziwym kluczem API
   });
   ```

2. Testuj generowanie fiszek z różnymi danymi wejściowymi
3. Testuj scenariusze błędów
4. Testuj zachowanie limitowania szybkości

#### Krok 5.3: Dokumentacja JSDoc

Dodaj kompleksowe komentarze JSDoc do wszystkich metod publicznych:

```typescript
/**
 * Generuj uzupełnienia czatu używając API OpenRouter
 * 
 * @template T - Typ zawartości odpowiedzi (domyślnie: any)
 * @param options - Opcje uzupełnienia włącznie z wiadomościami, modelem i parametrami
 * @returns Promise rozwiązująca się do wyniku uzupełnienia z typowaną zawartością
 * 
 * @throws {OpenRouterValidationError} Jeśli opcje są niepoprawne
 * @throws {OpenRouterAuthenticationError} Jeśli klucz API jest niepoprawny
 * @throws {OpenRouterRateLimitError} Jeśli przekroczono limit szybkości
 * @throws {OpenRouterTimeoutError} Jeśli upłynie timeout żądania
 * @throws {OpenRouterNetworkError} Jeśli wystąpi błąd sieciowy
 * @throws {OpenRouterServiceError} Jeśli usługa OpenRouter zawiedzie
 * @throws {OpenRouterParseError} Jeśli parsowanie odpowiedzi zawiedzie
 * 
 * @example
 * ```typescript
 * const result = await openRouter.complete({
 *   messages: [{ role: 'user', content: 'Cześć!' }],
 *   model: 'anthropic/claude-3-haiku',
 *   temperature: 0.7
 * });
 * console.log(result.content);
 * ```
 * 
 * @example Ze strukturyzowanym wyjściem
 * ```typescript
 * const result = await openRouter.complete<{ answer: string }>({
 *   messages: [{ role: 'user', content: 'Ile to 2+2?' }],
 *   responseFormat: {
 *     type: 'json_schema',
 *     json_schema: {
 *       name: 'math_answer',
 *       strict: true,
 *       schema: {
 *         type: 'object',
 *         properties: { answer: { type: 'string' } },
 *         required: ['answer'],
 *         additionalProperties: false
 *       }
 *     }
 *   }
 * });
 * console.log(result.content.answer); // Dostęp typobezpieczny
 * ```
 */
async complete<T = any>(options: CompletionOptions): Promise<CompletionResult<T>>
```

#### Krok 5.4: Dokumentacja README

**Plik**: `src/lib/services/README.md`

Utwórz dokumentację usługi:

1. Przegląd
2. Instalacja (zmienne środowiskowe)
3. Podstawowe przykłady użycia
4. Zaawansowane przykłady użycia
5. Przewodnik obsługi błędów
6. Odniesienie do konfiguracji
7. Najlepsze praktyki
8. FAQ

### Faza 6: Czyszczenie i Optymalizacja (Dzień 7)

#### Krok 6.1: Usuń Przestarzały Kod

1. Przejrzyj `ai.service.ts` pod kątem nieużywanego kodu
2. Usuń starą implementację fetch (zachowaj wrapper dla kompatybilności)
3. Aktualizuj importy w całej bazie kodu

#### Krok 6.2: Optymalizacja Wydajności

1. Przejrzyj wartości timeout
2. Optymalizuj opóźnienia ponownych prób
3. Rozważ grupowanie żądań (przyszłe ulepszenie)
4. Profiluj użycie pamięci z dużymi żądaniami

#### Krok 6.3: Linting i Jakość Kodu

1. Uruchom ESLint i napraw wszystkie problemy:
   ```bash
   npm run lint
   ```

2. Formatuj kod z Prettier (jeśli używany):
   ```bash
   npm run format
   ```

3. Sprawdź typy TypeScript:
   ```bash
   npm run type-check
   ```

4. Przejrzyj wszystkie TODO i FIXME

#### Krok 6.4: Końcowe Testowanie

1. Uruchom pełny zestaw testów:
   ```bash
   npm test
   ```

2. Testuj w środowisku deweloperskim:
   ```bash
   npm run dev
   ```

3. Testuj generowanie fiszek przez UI
4. Testuj scenariusze błędów
5. Zweryfikuj czy komunikaty błędów są przyjazne dla użytkownika

#### Krok 6.5: Przygotowanie do Wdrożenia

1. Aktualizuj `package.json` jeśli potrzeba (brak nowych zależności)
2. Aktualizuj dokumentację zmiennych środowiskowych
3. Utwórz notatki migracyjne dla zespołu
4. Aktualizuj dokumentację API
5. Utwórz checklistę wdrożeniową

---

## Checklista Implementacji

### Faza 1: Klasy Błędów i Typy ✓
- [ ] Utwórz `src/lib/errors/openrouter.errors.ts`
- [ ] Implementuj 11 klas błędów z odpowiednią hierarchią
- [ ] Dodaj pomocnika `getUserFriendlyErrorMessage`
- [ ] Utwórz `src/lib/types/openrouter.types.ts`
- [ ] Zdefiniuj wszystkie interfejsy (Config, Options, Result, itp.)
- [ ] Aktualizuj `src/types.ts` z eksportami
- [ ] Napisz testy jednostkowe dla klas błędów

### Faza 2: Implementacja Podstawowej Usługi ✓
- [ ] Utwórz `src/lib/services/openrouter.service.ts`
- [ ] Implementuj konstruktor z walidacją
- [ ] Implementuj metodę `buildRequest`
- [ ] Implementuj pomocnika `createResponseFormat`
- [ ] Implementuj metodę `validateCompletionOptions`
- [ ] Implementuj `executeRequest` z logiką ponownych prób
- [ ] Implementuj obsługę timeout z AbortController
- [ ] Implementuj mapowanie błędów (status HTTP → klasy błędów)
- [ ] Implementuj metodę `parseResponse`
- [ ] Napisz testy jednostkowe dla każdej metody

### Faza 3: Metody Publiczne ✓
- [ ] Implementuj metodę `complete`
- [ ] Implementuj metodę `generateFlashcards`
- [ ] Utwórz schemat JSON fiszek
- [ ] Zbuduj prompt systemowy fiszek
- [ ] Implementuj walidację fiszek
- [ ] Implementuj metodę `listModels`
- [ ] Implementuj cache modeli
- [ ] Implementuj metodę `validateApiKey`
- [ ] Napisz testy jednostkowe dla metod publicznych

### Faza 4: Integracja i Migracja ✓
- [ ] Utwórz `src/lib/services/openrouter.instance.ts`
- [ ] Aktualizuj `src/lib/services/ai.service.ts`
- [ ] Mapuj błędy OpenRouter na istniejące błędy AI
- [ ] Aktualizuj obsługę zmiennych środowiskowych
- [ ] Utwórz/aktualizuj `.env.example`
- [ ] Aktualizuj eksporty `src/types.ts`
- [ ] Testuj kompatybilność wsteczną

### Faza 5: Testowanie i Dokumentacja ✓
- [ ] Napisz kompleksowe testy jednostkowe
- [ ] Napisz testy integracyjne
- [ ] Dodaj komentarze JSDoc do wszystkich metod publicznych
- [ ] Utwórz `src/lib/services/README.md`
- [ ] Dokumentuj opcje konfiguracji
- [ ] Dokumentuj obsługę błędów
- [ ] Dodaj przykłady użycia
- [ ] Dokumentuj najlepsze praktyki

### Faza 6: Czyszczenie i Optymalizacja ✓
- [ ] Usuń przestarzały kod
- [ ] Optymalizuj wydajność (timeouty, ponowne próby)
- [ ] Uruchom linter i napraw problemy
- [ ] Uruchom sprawdzanie typów
- [ ] Uruchom pełny zestaw testów
- [ ] Testuj w środowisku deweloperskim
- [ ] Testuj generowanie fiszek przez UI
- [ ] Zweryfikuj przyjazne dla użytkownika komunikaty błędów
- [ ] Aktualizuj dokumentację wdrożeniową
- [ ] Utwórz checklistę wdrożeniową

---

## Rozważania Po Implementacji

### Przyszłe Ulepszenia

1. **Obsługa Streamingu**: Dodaj obsługę odpowiedzi streamingowych
   ```typescript
   async stream(options: CompletionOptions): AsyncIterableIterator<string>
   ```

2. **Grupowanie Żądań**: Implementuj grupowanie dla wielu żądań
   ```typescript
   async batchComplete(requests: CompletionOptions[]): Promise<CompletionResult[]>
   ```

3. **Śledzenie Kosztów**: Dodaj kalkulację kosztów na podstawie użycia tokenów
   ```typescript
   interface CompletionResult<T> {
     // ...
     cost?: { prompt: number; completion: number; total: number; };
   }
   ```

4. **Fallback Modelu**: Automatyczne przełączanie na alternatywne modele w przypadku awarii
   ```typescript
   interface OpenRouterConfig {
     // ...
     fallbackModels?: string[];
   }
   ```

5. **Zarządzanie Historią Konwersacji**: Helper do zarządzania wieloetapowymi konwersacjami
   ```typescript
   class Conversation {
     addMessage(role: string, content: string): void;
     getMessages(): ChatMessage[];
     clear(): void;
   }
   ```

6. **Szablony Promptów**: Wielokrotnego użytku szablony promptów z podstawianiem zmiennych
   ```typescript
   class PromptTemplate {
     constructor(template: string);
     render(variables: Record<string, string>): string;
   }
   ```

### Monitorowanie i Obserwowalność

1. **Zbieranie Metryk**:
   - Liczba żądań (całkowita, sukces, awaria)
   - Percentyle czasu odpowiedzi (p50, p95, p99)
   - Użycie tokenów (według modelu, według endpointu)
   - Wskaźniki błędów (według typu)
   - Wskaźniki ponownych prób

2. **Integracja Logowania**:
   - Format strukturyzowanego logowania
   - Poziomy logów (debug, info, warn, error)
   - ID korelacji żądanie/odpowiedź
   - Sanityzowane szczegóły błędów

3. **Alarmowanie**:
   - Wysokie wskaźniki błędów
   - Powolne czasy odpowiedzi
   - Zbliżanie się do limitu szybkości
   - Wysokie koszty (użycie tokenów)

### Utrzymanie

1. **Regularne Aktualizacje**:
   - Monitoruj zmiany API OpenRouter
   - Regularnie aktualizuj listę modeli
   - Przejrzyj i aktualizuj informacje o cenach
   - Aktualizuj dokumentację

2. **Dostrajanie Wydajności**:
   - Przejrzyj wartości timeout na podstawie użycia
   - Dostosuj logikę ponownych prób na podstawie wskaźników sukcesu
   - Optymalizuj wartości TTL cache
   - Monitoruj użycie pamięci

3. **Audyty Bezpieczeństwa**:
   - Regularne aktualizacje zależności
   - Procedury rotacji kluczy API
   - Przeglądy walidacji danych wejściowych
   - Sprawdzanie sanityzacji komunikatów błędów

---

## Podsumowanie

Ten plan implementacji zapewnia kompleksowy przewodnik do budowania solidnej, typobezpiecznej i łatwej w utrzymaniu usługi OpenRouter. Usługa została zaprojektowana z myślą o:

- **Niezawodności**: Logika ponownych prób, obsługa timeout, kompleksowa obsługa błędów
- **Bezpieczeństwie**: Ochrona klucza API, walidacja danych wejściowych, wymuszanie HTTPS
- **Łatwości Utrzymania**: Jasne rozdzielenie odpowiedzialności, typy TypeScript, dokładna dokumentacja
- **Rozszerzalności**: Łatwe dodawanie nowych funkcji, wsparcie dla wielu przypadków użycia
- **Doświadczeniu Deweloperskim**: Typobezpieczne API, pomocne komunikaty błędów, obszerne przykłady

Postępuj zgodnie z planem krok po kroku, wykonuj każdy element checklisty i dokładnie testuj na każdym etapie. Rezultatem będzie gotowa do produkcji usługa, która bezproblemowo integruje się z Twoją aplikacją Natigo do generowania fiszek.
