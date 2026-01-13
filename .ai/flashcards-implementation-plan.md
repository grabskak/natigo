# API Endpoint Implementation Plan: Create Flashcard(s)

## 1. Przegląd punktu końcowego

### Cel
Endpoint `POST /api/flashcards` umożliwia tworzenie jednej lub wielu fiszek na podstawie danych wprowadzonych przez użytkownika. Fiszki mogą pochodzić z trzech źródeł:
- **manual** - fiszki tworzone ręcznie przez użytkownika
- **ai-full** - fiszki wygenerowane przez AI i zaakceptowane bez edycji
- **ai-edited** - fiszki wygenerowane przez AI i edytowane przed zapisaniem

### Kluczowe funkcjonalności
- Wsadowe tworzenie wielu fiszek w jednym requestcie
- Walidacja spójności źródła fiszki z ID generacji
- Weryfikacja własności generacji (użytkownik może zapisywać tylko fiszki z własnych generacji)
- Szczegółowe raportowanie błędów walidacji dla każdej fiszki osobno
- Automatyczne przypisanie user_id z tokenu autentykacji

## 2. Szczegóły żądania

### Metoda HTTP i URL
- **Metoda**: `POST`
- **Ścieżka**: `/api/flashcards`
- **Content-Type**: `application/json`

### Nagłówki
- **Authorization**: `Bearer {access_token}` (wymagany)
  - Token JWT z Supabase Auth
  - Używany do identyfikacji użytkownika i autoryzacji

### Struktura Request Body
```json
[
  {
    "front": "Hello",
    "back": "Cześć",
    "source": "manual",
    "generation_id": null
  },
  {
    "front": "Goodbye",
    "back": "Do widzenia",
    "source": "ai-full",
    "generation_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  {
    "front": "Thank you",
    "back": "Dziękuję",
    "source": "ai-edited",
    "generation_id": "550e8400-e29b-41d4-a716-446655440000"
  }
]
```

### Parametry
#### Wymagane (dla każdej fiszki):
- `front`: string
  - Przód fiszki (pytanie/termin)
  - Po przycięciu białych znaków: 1-200 znaków
  - Nie może być pusty
  
- `back`: string
  - Tył fiszki (odpowiedź/definicja)
  - Po przycięciu białych znaków: 1-500 znaków
  - Nie może być pusty

#### Opcjonalne (z logiką warunkową):
- `source`: FlashcardSource ('manual' | 'ai-full' | 'ai-edited')
  - Domyślnie: 'manual' jeśli nie podano
  - Określa źródło pochodzenia fiszki
  
- `generation_id`: string (UUID) | null
  - ID generacji AI, z której pochodzi fiszka
  - Wymagany gdy source = 'ai-full' lub 'ai-edited'
  - Musi być null gdy source = 'manual'

### Zasady walidacji
1. **Struktura requesta**:
   - Body musi być niepustą tablicą
   - Każdy element musi być obiektem z polami front i back
   - Maksymalna liczba fiszek w jednym requeście: np. 10 (do ustalenia)

2. **Walidacja tekstu**:
   - `front`: trim() → długość 1-200 znaków
   - `back`: trim() → długość 1-500 znaków
   - Puste stringi po trim() są odrzucane

3. **Walidacja source i generation_id**:
   - Jeśli `source` = 'manual':
     - `generation_id` musi być null lub nie podany
   - Jeśli `source` = 'ai-full' lub 'ai-edited':
     - `generation_id` musi być podany
     - `generation_id` musi być poprawnym UUID
     - Generacja musi istnieć w bazie danych
     - Generacja musi należeć do użytkownika z tokenu
     - Generacja nie może być usunięta (ON DELETE SET NULL)

4. **Ograniczenia z bazy danych**:
   - CHECK constraint w tabeli flashcards:
     ```sql
     CHECK (
       (source IN ('manual','flashcard') AND generation_id IS NULL) OR 
       (source IN ('ai-full','ai-edited') AND generation_id IS NOT NULL)
     )
     ```

## 3. Wykorzystywane typy

### Istniejące typy z src/types.ts

#### Typy wejściowe
```typescript
// Command dla tworzenia fiszki
export interface CreateFlashcardCommand {
  front: string;
  back: string;
  source: FlashcardSource;
  generation_id?: string | null;
}

// Enum źródła fiszki
export type FlashcardSource = 'manual' | 'ai-full' | 'ai-edited';
```

#### Typy wyjściowe
```typescript
// Odpowiedź sukcesu
export interface CreateFlashcardsResponse {
  created_count: number;
  flashcards: FlashcardDto[];
}

// DTO fiszki w odpowiedzi
export type FlashcardDto = Pick<
  FlashcardEntity,
  "id" | "generation_id" | "front" | "back" | "source" | "created_at" | "updated_at"
>;
```

#### Typy błędów
```typescript
// Struktura błędu walidacji
export interface ValidationErrorDetail {
  index: number;      // Indeks fiszki w tablicy
  field: string;      // Nazwa pola z błędem
  message: string;    // Opis błędu
}

// Ogólna struktura błędu API
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown> | ValidationErrorDetail[];
}

// Wrapper odpowiedzi błędu
export interface ErrorResponse {
  error: ApiError;
}
```

#### Typy bazodanowe
```typescript
// Typ do wstawiania rekordu do bazy
export type FlashcardInsert = Database["public"]["Tables"]["flashcards"]["Insert"];

// Encja fiszki z bazy danych
export type FlashcardEntity = Database["public"]["Tables"]["flashcards"]["Row"];
```

### Nowe schematy Zod (do utworzenia)

#### src/lib/schemas/flashcard.schema.ts
```typescript
import { z } from "zod";

// Enum źródła fiszki
const FlashcardSourceEnum = z.enum(['manual', 'ai-full', 'ai-edited']);

// Schema dla pojedynczej fiszki
export const CreateFlashcardSchema = z.object({
  front: z.string()
    .trim()
    .min(1, "Front text cannot be empty")
    .max(200, "Front text must not exceed 200 characters"),
  
  back: z.string()
    .trim()
    .min(1, "Back text cannot be empty")
    .max(500, "Back text must not exceed 500 characters"),
  
  source: FlashcardSourceEnum.default('manual'),
  
  generation_id: z.string().uuid().nullable().optional(),
});

// Schema dla całego requesta (tablica fiszek)
export const CreateFlashcardsRequestSchema = z.array(CreateFlashcardSchema)
  .min(1, "At least one flashcard is required")
  .max(10, "Maximum 10 flashcards per request");

// Typy inferred z schematów
export type CreateFlashcardInput = z.infer<typeof CreateFlashcardSchema>;
export type CreateFlashcardsRequestInput = z.infer<typeof CreateFlashcardsRequestSchema>;
```

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (201 Created)
```json
{
  "created_count": 3,
  "flashcards": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "generation_id": null,
      "front": "Hello",
      "back": "Cześć",
      "source": "manual",
      "created_at": "2025-01-13T10:30:00.000Z",
      "updated_at": "2025-01-13T10:30:00.000Z"
    },
    {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "generation_id": "550e8400-e29b-41d4-a716-446655440000",
      "front": "Goodbye",
      "back": "Do widzenia",
      "source": "ai-full",
      "created_at": "2025-01-13T10:30:00.000Z",
      "updated_at": "2025-01-13T10:30:00.000Z"
    },
    {
      "id": "323e4567-e89b-12d3-a456-426614174002",
      "generation_id": "550e8400-e29b-41d4-a716-446655440000",
      "front": "Thank you",
      "back": "Dziękuję",
      "source": "ai-edited",
      "created_at": "2025-01-13T10:30:00.000Z",
      "updated_at": "2025-01-13T10:30:00.000Z"
    }
  ]
}
```

**Struktura:**
- `created_count`: liczba pomyślnie utworzonych fiszek
- `flashcards`: tablica utworzonych fiszek z pełnymi danymi
  - Zawiera wygenerowane ID, timestamps i wszystkie pola
  - Nie zawiera `user_id` (dane prywatne)

### Odpowiedzi błędów

#### 400 Bad Request - Nieprawidłowe dane wejściowe
**Przypadki:**
- Pusta tablica
- Niepoprawny JSON
- Brak wymaganych pól

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "At least one flashcard is required",
    "details": {
      "issue": "Request body must be a non-empty array"
    }
  }
}
```

#### 401 Unauthorized - Brak autoryzacji
**Przypadki:**
- Brak nagłówka Authorization
- Niepoprawny format tokenu
- Token wygasły lub nieprawidłowy

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Valid authentication token is required"
  }
}
```

#### 403 Forbidden - Zabroniona operacja
**Przypadki:**
- generation_id nie należy do użytkownika
- Próba użycia nieistniejącej generacji

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Generation does not belong to the authenticated user",
    "details": {
      "generation_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

#### 422 Unprocessable Entity - Błędy walidacji fiszek
**Przypadki:**
- Jedna lub więcej fiszek nie przeszło walidacji
- Szczegółowe informacje dla każdej niepoprawnej fiszki

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more flashcards failed validation",
    "details": [
      {
        "index": 0,
        "field": "front",
        "message": "Front text must be between 1 and 200 characters"
      },
      {
        "index": 1,
        "field": "back",
        "message": "Back text cannot be empty"
      },
      {
        "index": 2,
        "field": "generation_id",
        "message": "generation_id is required when source is 'ai-full' or 'ai-edited'"
      }
    ]
  }
}
```

#### 500 Internal Server Error - Błąd serwera
**Przypadki:**
- Błąd połączenia z bazą danych
- Niespodziewane błędy podczas przetwarzania

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred while creating flashcards"
  }
}
```

## 5. Przepływ danych

### Diagram sekwencji
```
Client                API Endpoint           Middleware           Service              Database
  |                        |                      |                   |                    |
  |--POST /api/flashcards->|                      |                   |                    |
  |  (Bearer token)        |                      |                   |                    |
  |                        |---Get supabase----->|                   |                    |
  |                        |<---supabase client---|                   |                    |
  |                        |                      |                   |                    |
  |                        |---Extract token----->|                   |                    |
  |                        |---Verify token--------------------------------------->|         |
  |                        |<--user object-----------------------------------------|         |
  |                        |                      |                   |                    |
  |                        |---Parse & validate-->|                   |                    |
  |                        |  JSON + Zod          |                   |                    |
  |                        |                      |                   |                    |
  |                        |---Call service------------------>|                            |
  |                        |                      |          |                             |
  |                        |                      |          |--Validate each flashcard->  |
  |                        |                      |          |                             |
  |                        |                      |          |--Verify generation ownership->|
  |                        |                      |          |<--generation data------------|
  |                        |                      |          |                             |
  |                        |                      |          |--Bulk insert flashcards---->|
  |                        |                      |          |<--inserted flashcards-------|
  |                        |                      |          |                             |
  |                        |<--FlashcardsResponse-|----------|                             |
  |                        |                      |                                        |
  |<--201 Created----------|                      |                                        |
  |  CreateFlashcardsResponse                     |                                        |
```

### Szczegółowy opis kroków

#### 1. Walidacja żądania (API Endpoint)
```typescript
// Krok 1.1: Pobranie klienta Supabase z locals (ustawiony przez middleware)
const supabase = locals.supabase;

// Krok 1.2: Ekstrakcja i walidacja nagłówka Authorization
const authHeader = request.headers.get("Authorization");
if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return 401 Unauthorized;
}

// Krok 1.3: Walidacja tokenu JWT i pobranie użytkownika
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return 401 Unauthorized;
}

// Krok 1.4: Parsowanie body requesta
let body: unknown;
try {
  body = await request.json();
} catch {
  return 400 Bad Request - Invalid JSON;
}

// Krok 1.5: Walidacja z użyciem Zod
const validation = CreateFlashcardsRequestSchema.safeParse(body);
if (!validation.success) {
  return 400 Bad Request - Validation errors;
}
```

#### 2. Przetwarzanie logiki biznesowej (Service)
```typescript
// Krok 2.1: Wywołanie service
const result = await processFlashcardCreation(
  supabase,
  user.id,
  validation.data
);

// W service processFlashcardCreation:

// Krok 2.2: Walidacja logiki biznesowej dla każdej fiszki
const validationErrors: ValidationErrorDetail[] = [];
for (const [index, flashcard] of flashcards.entries()) {
  // Walidacja source i generation_id
  const error = await validateFlashcardCommand(flashcard, index);
  if (error) validationErrors.push(error);
}

if (validationErrors.length > 0) {
  throw new ValidationError(validationErrors);
}

// Krok 2.3: Weryfikacja własności generacji (jeśli applicable)
const generationIds = new Set(
  flashcards
    .filter(f => f.generation_id)
    .map(f => f.generation_id!)
);

for (const genId of generationIds) {
  const owned = await verifyGenerationOwnership(supabase, userId, genId);
  if (!owned) {
    throw new ForbiddenError("Generation does not belong to user");
  }
}

// Krok 2.4: Bulk insert do bazy danych
const insertData: FlashcardInsert[] = flashcards.map(card => ({
  user_id: userId,
  front: card.front.trim(),
  back: card.back.trim(),
  source: card.source,
  generation_id: card.generation_id || null,
}));

const { data, error } = await supabase
  .from("flashcards")
  .insert(insertData)
  .select();

// Krok 2.5: Mapowanie wyników do DTO
const flashcardDtos: FlashcardDto[] = data.map(mapToFlashcardDto);

return {
  created_count: flashcardDtos.length,
  flashcards: flashcardDtos,
};
```

#### 3. Zwrócenie odpowiedzi (API Endpoint)
```typescript
// Krok 3.1: Sukces
return new Response(JSON.stringify(result), {
  status: 201,
  headers: { "Content-Type": "application/json" },
});

// Krok 3.2: Obsługa błędów
catch (error) {
  if (error instanceof ValidationError) {
    return 422 Unprocessable Entity;
  }
  if (error instanceof ForbiddenError) {
    return 403 Forbidden;
  }
  // Generic error
  return 500 Internal Server Error;
}
```

### Interakcje z bazą danych

#### Query 1: Weryfikacja własności generacji
```sql
SELECT id, user_id 
FROM generations 
WHERE id = $1 AND user_id = $2;
```
- Wykonywane dla każdego unikalnego generation_id w requeście
- Weryfikuje czy generacja istnieje i należy do użytkownika

#### Query 2: Bulk insert fiszek
```sql
INSERT INTO flashcards (user_id, front, back, source, generation_id)
VALUES 
  ($1, $2, $3, $4, $5),
  ($6, $7, $8, $9, $10),
  ...
RETURNING *;
```
- Jedna transakcja dla wszystkich fiszek
- Wykorzystanie RETURNING do pobrania wstawionych rekordów z ID i timestamps

### Interakcje z zewnętrznymi usługami
- **Supabase Auth**: weryfikacja tokenu JWT
- **Supabase Database**: insert fiszek, weryfikacja generacji

## 6. Względy bezpieczeństwa

### Uwierzytelnianie (Authentication)
- **Metoda**: JWT Bearer token w nagłówku Authorization
- **Provider**: Supabase Auth
- **Walidacja**: 
  - Token musi być w formacie `Bearer {token}`
  - Token jest weryfikowany przez `supabase.auth.getUser(token)`
  - Token musi być aktywny (nie wygasły)
- **Błędy**: 401 Unauthorized dla niepoprawnych/brakujących tokenów

### Autoryzacja (Authorization)
- **Zasada**: Użytkownik może tworzyć fiszki tylko dla siebie
- **Implementacja**: 
  - `user_id` jest pobierany z zweryfikowanego tokenu JWT
  - `user_id` jest automatycznie przypisywany do każdej tworzonej fiszki
  - Użytkownik nie może ustawić innego `user_id` (pole nie jest akceptowane w input)
- **Weryfikacja własności generacji**:
  - Jeśli `generation_id` jest podany, system sprawdza czy generacja należy do użytkownika
  - Query: `SELECT id FROM generations WHERE id = {generation_id} AND user_id = {user_id}`
  - 403 Forbidden jeśli generacja nie należy do użytkownika lub nie istnieje

### Walidacja danych wejściowych
- **Parsowanie JSON**: Try-catch dla złego JSON
- **Walidacja schematu**: Zod dla struktury i typów
- **Walidacja logiki biznesowej**:
  - Spójność source i generation_id
  - Istnienie generacji w bazie
  - Własność generacji
- **Sanityzacja**:
  - Trim wszystkich stringów
  - Walidacja długości przed i po trim
  - Odrzucenie pustych stringów

### Ochrona przed atakami

#### SQL Injection
- **Zabezpieczenie**: Supabase Client używa prepared statements
- **Praktyki**: Nigdy nie budować raw SQL z danymi użytkownika

#### Mass Assignment
- **Zabezpieczenie**: Używanie TypeScript types i explicit mapping
- **Implementacja**: 
  ```typescript
  // Użytkownik nie może ustawić:
  // - user_id (zawsze z tokenu)
  // - id (generowane przez bazę)
  // - created_at/updated_at (timestamp z bazy)
  const insertData: FlashcardInsert = {
    user_id: userId,  // Z tokenu, nie z requesta
    front: card.front.trim(),
    back: card.back.trim(),
    source: card.source,
    generation_id: card.generation_id || null,
  };
  ```

#### Cross-Site Scripting (XSS)
- **Kontekst**: Backend API nie renderuje HTML
- **Zabezpieczenie**: Frontend odpowiedzialny za escapowanie przy wyświetlaniu
- **Praktyka**: Nie sanityzować HTML na backendzie (użytkownik może chcieć przechowywać znaczniki markdown)

#### Denial of Service (DoS)
- **Limity**:
  - Maksymalnie 10 fiszek w jednym requeście
  - Maksymalnie 200 znaków na front
  - Maksymalnie 500 znaków na back
- **Rate limiting**: Rozważyć dodanie w przyszłości (np. 100 requestów/minutę)

### Prywatność danych
- **Nie logować**:
  - Tokenów JWT
  - Treści fiszek w production logs
  - Danych osobowych użytkownika
- **Logować tylko**:
  - Kod błędu i typ
  - ID użytkownika (dla debugowania)
  - Metadane (liczba fiszek, timestamp)

### Row Level Security (RLS)
- **Supabase RLS policies** (należy skonfigurować):
  ```sql
  -- Polityka INSERT: użytkownik może wstawiać tylko swoje fiszki
  CREATE POLICY "Users can insert own flashcards"
    ON flashcards FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  
  -- Polityka SELECT: użytkownik może czytać tylko swoje fiszki
  CREATE POLICY "Users can view own flashcards"
    ON flashcards FOR SELECT
    USING (auth.uid() = user_id);
  ```
- **Warstwy zabezpieczeń**:
  1. Aplikacja ustawia user_id z tokenu
  2. RLS policy weryfikuje na poziomie bazy danych
  3. Podwójna ochrona przed błędami aplikacji

## 7. Obsługa błędów

### Kody statusu i ich zastosowanie

| Status | Kod błędu | Kiedy używać |
|--------|-----------|--------------|
| **400** | `VALIDATION_FAILED` | Niepoprawny JSON, pusta tablica, błędy Zod schema |
| **401** | `AUTH_REQUIRED` | Brak tokenu, niepoprawny token, token wygasły |
| **403** | `FORBIDDEN` | generation_id nie należy do użytkownika |
| **422** | `VALIDATION_FAILED` | Błędy walidacji biznesowej (source/generation_id) |
| **500** | `INTERNAL_SERVER_ERROR` | Błędy bazy danych, niespodziewane błędy |

### Custom Error Classes

W pliku `src/lib/errors/flashcard.errors.ts`:

```typescript
import type { ValidationErrorDetail } from "../../types";

// Błędy walidacji biznesowej
export class ValidationError extends Error {
  constructor(public validationErrors: ValidationErrorDetail[]) {
    super("One or more flashcards failed validation");
    this.name = "ValidationError";
  }
}

// Błędy autoryzacji
export class ForbiddenError extends Error {
  constructor(message: string, public generationId?: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
```

### Struktura endpointa z obsługą błędów

```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Walidacja tokenu i użytkownika (401)
    const supabase = locals.supabase;
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(401, "AUTH_REQUIRED", "Valid authentication token is required");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return errorResponse(401, "AUTH_REQUIRED", "Valid authentication token is required");
    }
    
    // 2. Parsowanie JSON (400)
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "VALIDATION_FAILED", "Invalid JSON in request body");
    }
    
    // 3. Walidacja Zod schema (400)
    const validation = CreateFlashcardsRequestSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(400, "VALIDATION_FAILED", validation.error.errors[0].message);
    }
    
    // 4. Przetwarzanie logiki biznesowej
    const result = await processFlashcardCreation(supabase, user.id, validation.data);
    
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    // Obsługa błędów z service layer
    if (error instanceof ValidationError) {
      return errorResponse(422, "VALIDATION_FAILED", error.message, error.validationErrors);
    }
    
    if (error instanceof ForbiddenError) {
      return errorResponse(403, "FORBIDDEN", error.message, { generation_id: error.generationId });
    }
    
    // Nieoczekiwane błędy
    console.error("Unexpected error in POST /api/flashcards:", error);
    return errorResponse(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred");
  }
};

// Helper function
function errorResponse(status: number, code: string, message: string, details?: unknown): Response {
  return new Response(
    JSON.stringify({
      error: { code, message, ...(details && { details }) }
    } satisfies ErrorResponse),
    { status, headers: { "Content-Type": "application/json" } }
  );
}
```

### Przykłady odpowiedzi błędów

#### 400 - Validation Failed
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "At least one flashcard is required"
  }
}
```

#### 422 - Business Validation Failed
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more flashcards failed validation",
    "details": [
      {
        "index": 0,
        "field": "generation_id",
        "message": "generation_id is required when source is 'ai-full'"
      }
    ]
  }
}
```

#### 403 - Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Generation does not belong to the authenticated user",
    "details": {
      "generation_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

### Zasady logowania

**Loguj:**
- Błędy serwera (500) z pełnymi szczegółami dla debugowania
- Metryki sukcesu (liczba utworzonych fiszek)

**NIE loguj:**
- Tokenów JWT
- Treści fiszek (mogą być wrażliwe)
- Stack traces dla błędów klienta (4xx)

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

#### 1. Weryfikacja własności generacji
1.Zakładamy że w pojedynczym reqest znajduje sie tylko jeden generation_id

#### 2. Bulk INSERT do bazy danych
**Problem:**
- INSERT pojedynczych rekordów w pętli jest nieefektywny
- Network roundtrips dla każdego INSERT

**Optymalizacja:**
```typescript
// Złe: N INSERTs
for (const flashcard of flashcards) {
  await supabase.from("flashcards").insert(flashcard);
}

// Dobre: 1 bulk INSERT
const insertData: FlashcardInsert[] = flashcards.map(card => ({
  user_id: userId,
  front: card.front.trim(),
  back: card.back.trim(),
  source: card.source,
  generation_id: card.generation_id || null,
}));

const { data, error } = await supabase
  .from("flashcards")
  .insert(insertData)
  .select();
```

**Koszt:**
- Przed: O(n) INSERT queries
- Po: O(1) bulk INSERT query

**Transakcyjność:**
- Bulk INSERT zapewnia atomiczność (wszystkie rekordy lub żaden)
- W przypadku błędu, żaden rekord nie zostanie wstawiony

#### 3. Walidacja danych
**Problem:**
- Zod validation może być kosztowna dla dużych tablic
- Szczególnie przy zagnieżdżonych obiektach i custom refinements

**Optymalizacja:**
```typescript
// Limitowanie rozmiaru requesta
export const CreateFlashcardsRequestSchema = z.array(CreateFlashcardSchema)
  .min(1, "At least one flashcard is required")
  .max(10, "Maximum 10 flashcards per request"); // Limit!

// Szybka walidacja przed Zod (fail fast)
if (!Array.isArray(body) || body.length === 0) {
  return 400 Bad Request;
}

if (body.length > 10) {
  return 400 Bad Request;
}

// Dopiero potem Zod validation
const validation = CreateFlashcardsRequestSchema.safeParse(body);
```

**Benchmark estymaty:**
- 10 fiszek: ~1-2ms
- 50 fiszek: ~5-10ms
- 100 fiszek: ~15-25ms

### Strategie optymalizacji

#### 1. Batching i limity
- **Max 100 fiszek per request** - balance między efektywnością a UX
- Frontend może dzielić większe grupy na batches
- Użytkownik widzi progress bar dla długich operacji

#### 2. Database Indexing
```sql
-- Index na user_id dla szybkiego filtrowania
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);

-- Index na generation_id dla weryfikacji własności
CREATE INDEX idx_flashcards_generation_id ON flashcards(generation_id);

-- Composite index dla queries filtrujących po user_id i source
CREATE INDEX idx_flashcards_user_source ON flashcards(user_id, source);

-- Index na created_at dla sortowania
CREATE INDEX idx_flashcards_created_at ON flashcards(created_at DESC);
```

#### 3. Connection Pooling
- Supabase automatycznie zarządza connection pooling
- Konfiguracja w Supabase dashboard jeśli potrzeba
- Monitorować connection limits w production

#### 4. Caching (przyszła optymalizacja)
**Nie dla tego endpointa:**
- POST request nie powinien być cache'owany
- Każde wywołanie tworzy nowe dane

**Dla powiązanych endpoints:**
- Cache wyników GET /api/flashcards
- Cache weryfikacji generation ownership (krótki TTL: 1 min)

#### 5. Monitoring wydajności
**Metryki do śledzenia:**
- Czas odpowiedzi endpointa (p50, p95, p99)
- Liczba fiszek per request (średnia, max)
- Database query time
- Częstość poszczególnych błędów

**Alerty:**
- p95 > 1000ms
- p99 > 2000ms
- Error rate > 5%

### Szacunki wydajności

#### Typowy request (10 fiszek, 2 unikalne generation_ids)
1. JWT verification: ~50ms
2. JSON parsing: ~5ms
3. Zod validation: ~2ms
4. Generation ownership verification (1 query): ~20ms
5. Bulk INSERT (1 query): ~50ms
6. Response serialization: ~5ms



## 9. Etapy wdrożenia

### Faza 1: Przygotowanie struktury

#### 1.1. Utworzenie custom error classes
**Plik:** `src/lib/errors/flashcard.errors.ts`

**Zadanie:**
- Zdefiniować `ValidationError` class z `validationErrors: ValidationErrorDetail[]`
- Zdefiniować `ForbiddenError` class z optional `generationId: string`
- Export error classes

**Przykład:**
```typescript
import type { ValidationErrorDetail } from "../../types";

export class ValidationError extends Error {
  constructor(public validationErrors: ValidationErrorDetail[]) {
    super("One or more flashcards failed validation");
    this.name = "ValidationError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string, public generationId?: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
```

#### 1.2. Utworzenie Zod schemas
**Plik:** `src/lib/schemas/flashcard.schema.ts`

**Zadanie:**
- Zdefiniować `CreateFlashcardSchema` zgodnie z sekcją 3
- Zdefiniować `CreateFlashcardsRequestSchema` (tablica, min 1, max 100)
- Export schematów i inferred types

**Przykład:**
```typescript
import { z } from "zod";

const FlashcardSourceEnum = z.enum(['manual', 'ai-full', 'ai-edited']);

export const CreateFlashcardSchema = z.object({
  front: z.string()
    .trim()
    .min(1, "Front text cannot be empty")
    .max(200, "Front text must not exceed 200 characters"),
  
  back: z.string()
    .trim()
    .min(1, "Back text cannot be empty")
    .max(500, "Back text must not exceed 500 characters"),
  
  source: FlashcardSourceEnum.default('manual'),
  
  generation_id: z.string().uuid().nullable().optional(),
});

export const CreateFlashcardsRequestSchema = z.array(CreateFlashcardSchema)
  .min(1, "At least one flashcard is required")
  .max(100, "Maximum 100 flashcards per request");

export type CreateFlashcardInput = z.infer<typeof CreateFlashcardSchema>;
export type CreateFlashcardsRequestInput = z.infer<typeof CreateFlashcardsRequestSchema>;
```

**Testy:**
- Valid manual flashcard
- Valid AI flashcard with generation_id
- Invalid: empty front/back
- Invalid: too long front/back
- Invalid: empty array
- Invalid: > 100 flashcards

### Faza 2: Implementacja service layer

#### 2.1. Utworzenie flashcard service
**Plik:** `src/lib/services/flashcard.service.ts`

**Zadanie:**
- Implementować `validateFlashcardCommand()`
- Implementować `verifyGenerationOwnership()`
- Implementować `createFlashcards()`
- Implementować `processFlashcardCreation()` (orchestration function)

**Funkcja 1: validateFlashcardCommand**
```typescript
/**
 * Validates business logic for a single flashcard
 * Checks source and generation_id consistency
 *
 * @param flashcard - Flashcard to validate
 * @param index - Index in array (for error reporting)
 * @returns ValidationErrorDetail if invalid, null if valid
 */
export function validateFlashcardCommand(
  flashcard: CreateFlashcardInput,
  index: number
): ValidationErrorDetail | null {
  // Rule: manual source must have null generation_id
  if (flashcard.source === 'manual' && flashcard.generation_id) {
    return {
      index,
      field: "generation_id",
      message: "generation_id must be null when source is 'manual'"
    };
  }
  
  // Rule: AI sources must have generation_id
  if (['ai-full', 'ai-edited'].includes(flashcard.source) && !flashcard.generation_id) {
    return {
      index,
      field: "generation_id",
      message: `generation_id is required when source is '${flashcard.source}'`
    };
  }
  
  return null;
}
```

**Funkcja 2: verifyGenerationOwnership**
```typescript
/**
 * Verifies that all provided generation IDs belong to the user
 * Uses single query for efficiency
 *
 * @param supabase - Supabase client
 * @param userId - User ID to check ownership for
 * @param generationIds - Array of generation IDs to verify
 * @throws {ForbiddenError} When one or more generations don't belong to user
 */
export async function verifyGenerationOwnership(
  supabase: SupabaseClient,
  userId: string,
  generationIds: string[]
): Promise<void> {
  if (generationIds.length === 0) {
    return; // No generations to verify
  }
  
  const { data, error } = await supabase
    .from("generations")
    .select("id")
    .in("id", generationIds)
    .eq("user_id", userId);
  
  if (error) {
    console.error("Failed to verify generation ownership:", error);
    throw new Error("Failed to verify generation ownership");
  }
  
  // Check if all generations were found
  if (!data || data.length !== generationIds.length) {
    const foundIds = new Set(data?.map(g => g.id) || []);
    const missingIds = generationIds.filter(id => !foundIds.has(id));
    
    throw new ForbiddenError(
      "One or more generations do not belong to the authenticated user",
      missingIds[0] // Include first missing ID in error
    );
  }
}
```

**Funkcja 3: createFlashcards**
```typescript
/**
 * Performs bulk insert of flashcards to database
 *
 * @param supabase - Supabase client
 * @param userId - User ID who owns the flashcards
 * @param flashcards - Validated flashcard data
 * @returns Array of created flashcard DTOs
 * @throws {Error} When database insert fails
 */
export async function createFlashcards(
  supabase: SupabaseClient,
  userId: string,
  flashcards: CreateFlashcardInput[]
): Promise<FlashcardDto[]> {
  // Prepare insert data
  const insertData: FlashcardInsert[] = flashcards.map(card => ({
    user_id: userId,
    front: card.front.trim(),
    back: card.back.trim(),
    source: card.source,
    generation_id: card.generation_id || null,
  }));
  
  // Bulk insert with RETURNING
  const { data, error } = await supabase
    .from("flashcards")
    .insert(insertData)
    .select();
  
  if (error || !data) {
    console.error("Failed to insert flashcards:", error);
    throw new Error("Failed to create flashcards");
  }
  
  // Map to DTOs (exclude user_id)
  return data.map(flashcard => ({
    id: flashcard.id,
    generation_id: flashcard.generation_id,
    front: flashcard.front,
    back: flashcard.back,
    source: flashcard.source,
    created_at: flashcard.created_at,
    updated_at: flashcard.updated_at,
  }));
}
```

**Funkcja 4: processFlashcardCreation (orchestration)**
```typescript
/**
 * Main orchestration function for flashcard creation
 * Coordinates validation, ownership verification, and database insert
 *
 * @param supabase - Supabase client
 * @param userId - Authenticated user ID
 * @param flashcards - Validated flashcard data from request
 * @returns CreateFlashcardsResponse with created flashcards
 * @throws {ValidationError} When business validation fails
 * @throws {ForbiddenError} When generation ownership verification fails
 * @throws {Error} When database operations fail
 */
export async function processFlashcardCreation(
  supabase: SupabaseClient,
  userId: string,
  flashcards: CreateFlashcardInput[]
): Promise<CreateFlashcardsResponse> {
  // Step 1: Validate business logic for each flashcard
  const validationErrors: ValidationErrorDetail[] = [];
  
  for (const [index, flashcard] of flashcards.entries()) {
    const error = validateFlashcardCommand(flashcard, index);
    if (error) {
      validationErrors.push(error);
    }
  }
  
  if (validationErrors.length > 0) {
    throw new ValidationError(validationErrors);
  }
  
  // Step 2: Extract unique generation IDs that need verification
  const uniqueGenerationIds = Array.from(
    new Set(
      flashcards
        .filter(f => f.generation_id)
        .map(f => f.generation_id!)
    )
  );
  
  // Step 3: Verify generation ownership (single query for all IDs)
  if (uniqueGenerationIds.length > 0) {
    await verifyGenerationOwnership(supabase, userId, uniqueGenerationIds);
  }
  
  // Step 4: Create flashcards in database
  const createdFlashcards = await createFlashcards(supabase, userId, flashcards);
  
  // Step 5: Build response
  return {
    created_count: createdFlashcards.length,
    flashcards: createdFlashcards,
  };
}
```



### Faza 3: Implementacja API endpoint

#### 3.1. Utworzenie struktury folderów
**Struktura:**
```
src/pages/api/
└── flashcards/
    └── index.ts
```

**Zadanie:**
- Utworzyć folder `flashcards` w `src/pages/api/`
- Utworzyć plik `index.ts`

#### 3.2. Implementacja endpoint
**Plik:** `src/pages/api/flashcards/index.ts`

**Zadanie:**
- Implementować `POST` handler zgodnie z wzorcem z `generation/index.ts`
- Użyć helper functions dla centralizacji logiki

**Struktura:**
```typescript
import type { APIRoute } from "astro";
import { CreateFlashcardsRequestSchema } from "../../../lib/schemas/flashcard.schema";
import { processFlashcardCreation } from "../../../lib/services/flashcard.service";
import { ValidationError, ForbiddenError } from "../../../lib/errors/flashcard.errors";
import type { ErrorResponse, CreateFlashcardsResponse } from "../../../types";

export const prerender = false;

/**
 * POST /api/flashcards
 * Creates one or multiple flashcards (manual or AI-generated)
 *
 * @returns 201 with CreateFlashcardsResponse on success
 * @returns 400 for validation errors
 * @returns 401 for authentication errors
 * @returns 403 for forbidden operations (generation ownership)
 * @returns 422 for unprocessable entity (business validation)
 * @returns 500 for server errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Get Supabase client from locals (set by middleware)
    const supabase = locals.supabase;
    
    // Step 2: Extract and validate Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AUTH_REQUIRED",
            message: "Valid authentication token is required",
          },
        } satisfies ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Step 3: Validate JWT token and get user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AUTH_REQUIRED",
            message: "Valid authentication token is required",
          },
        } satisfies ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Step 4: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: "Invalid JSON in request body",
            details: {
              issue: "Request body must be valid JSON",
            },
          },
        } satisfies ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Step 5: Quick validation before Zod (fail fast)
    if (!Array.isArray(body)) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: "Request body must be an array",
            details: {
              issue: "Expected array of flashcards",
            },
          },
        } satisfies ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    if (body.length === 0) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: "At least one flashcard is required",
            details: {
              issue: "Request body must be a non-empty array",
            },
          },
        } satisfies ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Step 6: Validate request body with Zod schema
    const validation = CreateFlashcardsRequestSchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: firstError.message,
            details: {
              field: firstError.path.join(".") || "flashcards",
              issue: firstError.message,
            },
          },
        } satisfies ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Step 7: Process flashcard creation (main business logic)
    const result = await processFlashcardCreation(
      supabase,
      user.id,
      validation.data
    );
    
    // Step 8: Return success response
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (error) {
    // Handle specific error types with appropriate HTTP status codes
    
    // Business validation failed (422)
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: error.message,
            details: error.validationErrors,
          },
        } satisfies ErrorResponse),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Forbidden operation (403)
    if (error instanceof ForbiddenError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: error.message,
            ...(error.generationId && {
              details: { generation_id: error.generationId }
            }),
          },
        } satisfies ErrorResponse),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Generic server error (500)
    console.error("Unexpected error in POST /api/flashcards:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while creating flashcards",
        },
      } satisfies ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

## Podsumowanie

Ten plan wdrożenia dostarcza kompleksowy przewodnik dla zespołu programistów do implementacji endpointa `POST /api/flashcards`. Plan obejmuje:

1. **Szczegółową specyfikację** - jasne wymagania i zasady walidacji
2. **Architekture i podział na layers** - schemas, services, endpoints
3. **Best practices** - error handling, security, performance
4. **Konkretne przykłady kodu** - gotowe do użycia snippets




Kluczowe punkty do zapamiętania:
- ✅ Używać bulk operations dla wydajności
- ✅ Walidować na wielu poziomach (schema + business logic)
- ✅ Weryfikować ownership generacji dla bezpieczeństwa
- ✅ Zwracać szczegółowe błędy walidacji (index + field + message)
- ✅ Logować błędy ale nie ujawniać internal details klientowi
