# Plan implementacji widoku Generate Screen

## 1. Przegląd

Widok Generate Screen (`/generations`) umożliwia użytkownikowi:
1. Wklejenie tekstu (1000-10000 znaków)
2. Wygenerowanie kandydatów fiszek przez AI
3. Recenzję kandydatów (zaakceptuj/edytuj/odrzuć)
4. Zbiorczy zapis zaakceptowanych fiszek do bazy

To kluczowy widok aplikacji realizujący główny przypadek użycia: AI-assisted flashcard creation.

## 2. Routing widoku

- **Ścieżka:** `/generations`
- **Dostęp:** Wymaga uwierzytelnienia (ProtectedRoute)
- **Przekierowania:**
  - Niezalogowany → `/login`
  - Po zapisie → `/flashcards?source=ai-full`

## 3. Struktura komponentów

```
GenerationsPage (Astro)
└── GenerateScreenContainer (React, client:load)
    ├── GenerateForm
    │   ├── Textarea
    │   ├── CharacterCounter
    │   └── Buttons (Generate, Clear)
    ├── LoadingState (conditionally rendered)
    ├── ErrorDisplay (conditionally rendered)
    └── CandidatesReview (conditionally rendered)
        ├── CandidatesHeader (stats & counters)
        ├── CandidatesList
        │   └── CandidateCard (repeated)
        │       ├── Sequential badge (#1, #2...)
        │       ├── Status badge
        │       ├── Front/Back fields (editable)
        │       └── Action buttons
        └── SaveActionsBar (sticky bottom)
```

## 4. Szczegóły komponentów

### GenerateScreenContainer
- **Cel:** Główny kontener zarządzający przepływem i stanem
- **Stan:** `screenState` ('form' | 'loading' | 'error' | 'review')
- **Odpowiada za:** Conditional rendering, API calls, koordynację

### GenerateForm
- **Cel:** Formularz z textarea do wklejania tekstu
- **Elementy:** Textarea (15-20 rows, autofocus), CharacterCounter, przyciski
- **Walidacja:** 
  - Min: 1000 znaków (po trim)
  - Max: 10000 znaków (po trim)
  - Przycisk Generate disabled gdy invalid
- **Props:** `onGenerate: (text: string) => void`, `isLoading: boolean`

### CharacterCounter
- **Cel:** Reużywalny licznik znaków z color-coding
- **Format:** "X / 10,000 characters"
- **Kolory:** Grey (<1000), Green (1000-10000), Red (>10000)
- **Props:** `current: number`, `max: number`, `min?: number`

### LoadingState
- **Cel:** Komunikat podczas oczekiwania na AI
- **Elementy:** Spinner + "Generating flashcards... This may take up to 60 seconds."

### ErrorDisplay
- **Cel:** Wyświetlanie błędów z opcją retry
- **Elementy:** Ikona, komunikat, przyciski "Try Again" i "Back to Form"
- **Props:** `error: ApiError`, `onRetry: () => void`, `onBackToForm: () => void`

### CandidatesReview
- **Cel:** Główny komponent recenzji kandydatów
- **Elementy:** Header (stats), lista kandydatów, SaveActionsBar
- **Stan:** Zarządza decyzjami użytkownika (Map<index, decision>)
- **Props:** `generationId`, `candidates`, `metadata`, `onSave`, `onCancel`

### CandidateCard
- **Cel:** Pojedyncza karta kandydata z opcjami akcji
- **Elementy:**
  - Sequential badge (#1, #2...)
  - Status badge (Pending/Accepted/Edited/Rejected)
  - Front field (Input, 1-200 chars)
  - Back field (Textarea, 1-500 chars)
  - Przyciski: Accept, Edit/Cancel, Reject
- **Tryby:** Display mode vs Edit mode
- **Walidacja inline:** Character limits, niepuste pola
- **Props:** `candidate`, `sequenceNumber`, `decision`, `editedContent`, callbacks

### SaveActionsBar
- **Cel:** Sticky bottom bar z zapisem
- **Elementy:** "Save X flashcards" button, Cancel button
- **Warunki:** Save disabled gdy acceptedCount = 0
- **Props:** `acceptedCount`, `onSave`, `onCancel`, `isSaving`

## 5. Typy

### Typy z API (types.ts)
```typescript
// Request/Response dla generowania
interface GenerateFlashcardsCommand { input_text: string }
interface GenerateFlashcardsResponse {
  generation_id: string;
  candidates: FlashcardCandidateDto[];
  metadata: GenerationMetadata;
}
interface FlashcardCandidateDto {
  front: string;
  back: string;
  source: "ai-full";
}

// Request/Response dla zapisu
interface CreateFlashcardCommand {
  front: string;
  back: string;
  source: "ai-full" | "ai-edited";
  generation_id: string;
}
interface CreateFlashcardsResponse {
  created_count: number;
  flashcards: FlashcardDto[];
}
```

### ViewModel Types (nowe)
```typescript
// Stan głównego kontenera
type GenerateScreenState = 
  | { status: 'form' }
  | { status: 'loading' }
  | { status: 'error', error: ApiError }
  | { status: 'review', data: GenerationResult };

interface GenerationResult {
  generationId: string;
  candidates: FlashcardCandidateDto[];
  metadata: GenerationMetadata;
}

// Decyzje użytkownika
type CandidateDecisionState = 'pending' | 'accepted' | 'edited' | 'rejected';

interface CandidateDecision {
  candidateIndex: number;
  state: CandidateDecisionState;
  editedContent?: { front: string; back: string };
}

interface DecisionStats {
  total: number;
  pending: number;
  accepted: number;
  edited: number;
  rejected: number;
}

// Walidacja
interface ValidationState {
  isValid: boolean;
  message: string | null;
}
```

## 6. Zarządzanie stanem

### Stan lokalny (useState)
**GenerateScreenContainer:**
- `screenState: GenerateScreenState` - główny stan UI
- `inputText: string` - tekst wejściowy

**CandidatesReview:**
- `decisions: Map<number, CandidateDecision>` - decyzje użytkownika
- `isSaving: boolean` - stan zapisu
- `saveError: ApiError | null` - błąd zapisu

**CandidateCard:**
- `isEditing: boolean` - czy w trybie edycji
- `localFront/localBack: string` - lokalna kopia do edycji
- `validation: ValidationState` - stan walidacji pól

**GenerateForm:**
- `text: string` - treść textarea
- `validation: ValidationState` - walidacja długości

### Custom Hooks

**useGenerateFlashcards:**
- Enkapsuluje wywołanie POST /api/generations
- Zwraca: `{ generate: (text: string) => Promise<GenerateFlashcardsResponse> }`

**useSaveFlashcards:**
- Enkapsuluje wywołanie POST /api/flashcards
- Zwraca: `{ save: (flashcards: CreateFlashcardCommand[]) => Promise<CreateFlashcardsResponse> }`

**useDecisions:**
- Zarządza decyzjami użytkownika
- Metody: `accept()`, `reject()`, `edit()`, `cancelEdit()`
- Zwraca: `getStats()`, `getAcceptedCount()`

## 7. Integracja API

### POST /api/generations
- **Kiedy:** Po kliknięciu "Generate Flashcards"
- **Request:** `{ input_text: string }` (1000-10000 chars, po trim)
- **Success (201):** `{ generation_id, candidates, metadata }`
- **Errors:** 400, 401, 422, 429, 500, 504
- **Headers:** `Authorization: Bearer {token}`, `Content-Type: application/json`

### POST /api/flashcards
- **Kiedy:** Po kliknięciu "Save X flashcards"
- **Request:** `CreateFlashcardCommand[]` - array zaakceptowanych kandydatów
  - `source: "ai-full"` gdy nie edytowano
  - `source: "ai-edited"` gdy edytowano
- **Success (201):** `{ created_count, flashcards }`
- **Errors:** 400, 401, 422, 403, 500

## 8. Interakcje użytkownika

### Wklejenie tekstu
1. User wkleja tekst → onChange → aktualizacja state
2. Automatyczna walidacja (trim)
3. CharacterCounter zmienia kolor (grey/green/red)
4. Inline validation message gdy invalid
5. Przycisk Generate disabled/enabled

### Generowanie kandydatów
1. Klik "Generate" → state: loading
2. API call POST /api/generations
3. Success → state: review (lista kandydatów)
4. Error → state: error (komunikat + retry)

### Akceptacja kandydata
1. Klik "Accept" → decision: 'accepted'
2. Status badge: "Accepted" (green)
3. AcceptedCount++

### Edycja kandydata
1. Klik "Edit" → tryb edycji (pola edytowalne)
2. Zmiana treści → walidacja inline
3. Klik "Save Edit" (gdy valid) → decision: 'edited'
4. Status badge: "Edited" (orange)
5. "Cancel Edit" → reset do oryginału

### Odrzucenie kandydata
1. Klik "Reject" → decision: 'rejected'
2. Status badge: "Rejected" (red)
3. Karta wyszarzona (opcjonalnie)

### Zapis fiszek
1. Klik "Save X flashcards"
2. Budowanie payload (tylko accepted/edited)
3. API call POST /api/flashcards
4. Success → toast + redirect `/flashcards?source=ai-full`
5. Error → inline message + "Try Again"

## 9. Warunki i walidacja

### Tekst wejściowy (GenerateForm)
- **Min:** 1000 znaków (po trim)
- **Max:** 10000 znaków (po trim)
- **UI:** CharacterCounter color, inline message, przycisk disabled/enabled

### Edytowane pola (CandidateCard)
- **Front:** 1-200 znaków, niepuste
- **Back:** 1-500 znaków, niepuste
- **UI:** CharacterCounter, inline messages, "Save Edit" disabled gdy invalid

### Zapis fiszek (SaveActionsBar)
- **Warunek:** acceptedCount > 0
- **UI:** "Save" disabled gdy 0, komunikat "No flashcards to save"

## 10. Obsługa błędów

### Błędy generowania (POST /api/generations)
| Kod | Przyczyna | UI Action |
|-----|-----------|-----------|
| 400 | Nieprawidłowy input | Error state + "Back to Form" |
| 401 | Brak autoryzacji | Redirect `/login` + toast |
| 429 | Rate limit | Error state + retry_after info |
| 500 | Błąd AI service | Error state + "Try Again" |
| 504 | Timeout (60s) | Error state + "Try Again" |
| Network | Brak połączenia | Error state + "Try Again" |

### Błędy zapisu (POST /api/flashcards)
| Kod | Przyczyna | UI Action |
|-----|-----------|-----------|
| 400 | Duplikaty/pusta tablica | Inline error + action zależna od kodu |
| 401 | Wygasła sesja | Toast + redirect `/login` |
| 422 | Walidacja failed | Inline error z details + możliwość poprawy |
| 403 | Nieprawidłowy generation_id | Error + redirect `/generations` |
| 500 | Błąd bazy | Inline error + "Try Again" |

### Edge Cases
- **Refresh podczas loading/review:** Utrata stanu, powrót do form
- **0 kandydatów z AI:** Error state + "Try with different text"
- **Wszystkie odrzucone:** Save disabled + komunikat
- **Wygasła sesja podczas review:** 401 → redirect login (decyzje tracone)

## 11. Kroki implementacji

### 1. Przygotowanie (struktura i typy)
- Utworzyć `src/pages/generations.astro` z ProtectedRoute
- Dodać typy do `src/types/generate.types.ts`
- Skonfigurować routing

### 2. Custom Hooks
- `src/lib/hooks/useGenerateFlashcards.ts` - API call dla generowania
- `src/lib/hooks/useSaveFlashcards.ts` - API call dla zapisu
- `src/lib/hooks/useDecisions.ts` - zarządzanie decyzjami

### 3. Komponenty prezentacyjne
- `CharacterCounter.tsx` - reużywalny licznik
- `LoadingState.tsx` - spinner + komunikat
- `ErrorDisplay.tsx` - wyświetlanie błędów

### 4. Formularz generowania
- `GenerateForm.tsx` - textarea + walidacja + przyciski
- Integracja z CharacterCounter
- Inline validation messages

### 5. Recenzja kandydatów
- `CandidateCard.tsx` - karta kandydata z akcjami
  - Display/Edit modes
  - Inline validation w trybie edit
  - Status badges
- `SaveActionsBar.tsx` - sticky bottom bar
- `CandidatesHeader.tsx` - stats i counters
- `CandidatesReview.tsx` - główny kontener recenzji

### 6. Główny kontener
- `GenerateScreenContainer.tsx` - orchestracja całego flow
  - State management
  - Conditional rendering
  - API integration
  - Error handling

### 7. Integracja i styling
- Dodać do `generations.astro` z `client:load`
- Tailwind styling wszystkich komponentów
- Color-coding (grey/green/orange/red)
- Responsive design

### 8. Walidacja i błędy
- Przetestować wszystkie scenariusze walidacji
- Przetestować wszystkie błędy API
- Obsługa edge cases
- Toast notifications (success/error)

### 9. Accessibility i UX
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support

### 10. Testing i dokumentacja
- Unit tests dla hooks i validation functions
- Integration tests dla głównych flows
- JSDoc comments
- Final review i polish

## Podsumowanie

Plan implementacji pokrywa:
- **US-012:** Ekran generowania z textarea i limitami
- **US-013:** Walidacja długości tekstu 1000-10000
- **US-014:** Uruchomienie generowania z loading state

Stack technologiczny:
- **Astro 5** - routing i struktura
- **React 19** - interaktywne komponenty
- **TypeScript 5** - typowanie
- **Tailwind 4** - styling
- **Shadcn/ui** - komponenty UI

Implementacja w 10 krokach, od struktury do testowania.
