# Plan implementacji widoku My Flashcards

## 1. Przegląd

Widok "My Flashcards" jest centralnym miejscem do przeglądania, zarządzania i edycji zapisanych fiszek użytkownika. Widok umożliwia:
- Przeglądanie wszystkich fiszek w układzie grid (2 kolumny)
- Filtrowanie fiszek według źródła (manual, ai-full, ai-edited)
- Sortowanie fiszek według daty utworzenia lub modyfikacji
- Dodawanie nowych fiszek manualnie
- Edycję istniejących fiszek
- Usuwanie fiszek z potwierdzeniem
- Paginację wyników (20 fiszek na stronę)
- Obsługę stanów pustych (brak fiszek, brak wyników po filtrze)

Widok realizuje user stories: US-005 (autoryzacja), US-006 (tworzenie), US-007 (walidacja), US-008 (lista), US-009 (podgląd), US-010 (edycja), US-011 (usuwanie), US-028 (przegląd fiszek z AI).

## 2. Routing widoku

**Ścieżka:** `/flashcards`

**Plik Astro:** `src/pages/flashcards.astro`

**Parametry URL (query params):**
- `page` (number, opcjonalny, domyślnie: 1) - numer strony paginacji
- `source` (string, opcjonalny) - filtr źródła: "all" | "manual" | "ai-full" | "ai-edited"
- `sort` (string, opcjonalny, domyślnie: "created_at") - pole sortowania: "created_at" | "updated_at"
- `order` (string, opcjonalny, domyślnie: "desc") - kolejność: "asc" | "desc"

**Wymagania autoryzacyjne:**
- Dostęp tylko dla zalogowanych użytkowników
- Przekierowanie na `/login` jeśli użytkownik niezalogowany

## 3. Struktura komponentów

```
flashcards.astro (Astro page)
└── FlashcardsView (React, client:load)
    ├── FlashcardsHeader
    │   ├── Button ("Generate New Flashcards")
    │   └── Button ("Add Manual Flashcard")
    ├── FlashcardsFilterBar
    │   ├── Select (Source filter)
    │   ├── Select (Sort by)
    │   └── Select (Order)
    ├── FlashcardsList
    │   ├── FlashcardCard (x N)
    │   │   ├── Badge (source indicator)
    │   │   ├── Text (front/back content)
    │   │   └── DropdownMenu
    │   │       ├── MenuItem ("Edit")
    │   │       └── MenuItem ("Delete")
    │   └── EmptyState (conditional)
    ├── Pagination
    │   ├── Button ("Previous")
    │   ├── PageNumbers
    │   └── Button ("Next")
    ├── FlashcardModal (Dialog, conditional)
    │   ├── DialogHeader
    │   ├── Form
    │   │   ├── Input (Front field)
    │   │   ├── Textarea (Back field)
    │   │   ├── CharacterCounter (Front)
    │   │   └── CharacterCounter (Back)
    │   └── DialogFooter
    │       ├── Button ("Cancel")
    │       └── Button ("Save")
    └── DeleteFlashcardDialog (AlertDialog, conditional)
        ├── AlertDialogHeader
        ├── AlertDialogDescription
        └── AlertDialogFooter
            ├── Button ("Cancel")
            └── Button ("Delete", destructive)
```

## 4. Szczegóły komponentów

### FlashcardsView

**Opis:**
Główny kontener zarządzający całym stanem widoku. Jest to komponent React z dyrektywą `client:load` w Astro. Odpowiada za orchestrację wszystkich operacji: pobieranie danych, filtrowanie, paginację, modal handling.

**Główne elementy:**
- Wrapper (`<div className="container mx-auto py-8 px-4">`)
- FlashcardsHeader
- FlashcardsFilterBar
- FlashcardsList lub EmptyState
- Pagination (jeśli są wyniki)
- FlashcardModal (warunkowe renderowanie)
- DeleteFlashcardDialog (warunkowe renderowanie)

**Obsługiwane zdarzenia:**
- `onAddFlashcard` - otwiera modal w trybie "add"
- `onEditFlashcard(flashcard)` - otwiera modal w trybie "edit"
- `onDeleteFlashcard(id)` - otwiera dialog potwierdzenia usunięcia
- `onGenerateFlashcards` - przekierowuje do widoku generowania (/generations)
- `onFilterChange(filters)` - aktualizuje filtry i pobiera dane
- `onPageChange(page)` - zmienia stronę paginacji
- `onModalSubmit(data)` - zapisuje nową/edytowaną fiszkę
- `onDeleteConfirm(id)` - wykonuje usunięcie fiszki

**Warunki walidacji:**
- Brak - walidacja odbywa się w FlashcardModal

**Typy:**
- `FlashcardsViewState` (stan komponentu)
- `FlashcardDto[]` (dane fiszek)
- `PaginatedFlashcardsResponse` (odpowiedź API)
- `ListFlashcardsQuery` (parametry zapytania)

**Propsy:**
- `initialPage?: number` - początkowy numer strony z URL
- `initialFilters?: Partial<ListFlashcardsQuery>` - początkowe filtry z URL
- `onNavigateToGenerate?: () => void` - callback do nawigacji do widoku generowania

### FlashcardsHeader

**Opis:**
Nagłówek strony zawierający tytuł i przyciski do dodawania fiszek manualnie oraz generowania nowych fiszek przez AI. Prosty prezentacyjny komponent.

**Główne elementy:**
- `<div className="flex justify-between items-center mb-6">`
  - `<h1 className="text-3xl font-bold">My Flashcards</h1>`
  - `<div className="flex gap-3">`
    - `<Button variant="outline" onClick={onGenerateClick}>Generate New Flashcards</Button>`
    - `<Button variant="default" onClick={onAddClick}>Add Manual Flashcard</Button>`

**Obsługiwane zdarzenia:**
- `onAddClick` - wywołuje callback do otwarcia modala dodawania fiszki
- `onGenerateClick` - przekierowuje użytkownika do widoku generowania fiszek (/generations)

**Warunki walidacji:**
- Brak

**Typy:**
- Brak specyficznych typów

**Propsy:**
```typescript
interface FlashcardsHeaderProps {
  onAddClick: () => void;
  onGenerateClick: () => void;
}
```

### FlashcardsFilterBar

**Opis:**
Pasek filtrów umożliwiający wybór źródła fiszek, pola sortowania i kolejności. Używa komponentu Select z Shadcn/ui.

**Główne elementy:**
- `<div className="flex gap-4 mb-6 flex-wrap">`
  - `<Select>` (Source filter)
    - Options: "All", "Manual", "AI Generated", "AI Edited"
  - `<Select>` (Sort by)
    - Options: "Created Date", "Updated Date"
  - `<Select>` (Order)
    - Options: "Newest First", "Oldest First"

**Obsługiwane zdarzenia:**
- `onFilterChange(filters)` - wywołuje callback z nowymi filtrami

**Warunki walidacji:**
- Brak - wybory są predefiniowane

**Typy:**
- `FlashcardsFilters`

**Propsy:**
```typescript
interface FlashcardsFilterBarProps {
  filters: FlashcardsFilters;
  onFilterChange: (filters: FlashcardsFilters) => void;
}

interface FlashcardsFilters {
  source: 'all' | FlashcardSource;
  sort: 'created_at' | 'updated_at';
  order: 'asc' | 'desc';
}
```

### FlashcardsList

**Opis:**
Kontener wyświetlający grid fiszek. Renderuje FlashcardCard dla każdej fiszki lub EmptyState gdy brak wyników.

**Główne elementy:**
- `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">`
  - `<FlashcardCard>` (dla każdej fiszki)
- lub `<EmptyState>` (gdy brak fiszek)

**Obsługiwane zdarzenia:**
- Przekazuje callbacki do FlashcardCard:
  - `onEdit(flashcard)`
  - `onDelete(id)`

**Warunki walidacji:**
- Brak

**Typy:**
- `FlashcardDto[]`

**Propsy:**
```typescript
interface FlashcardsListProps {
  flashcards: FlashcardDto[];
  isLoading: boolean;
  onEdit: (flashcard: FlashcardDto) => void;
  onDelete: (id: string) => void;
}
```

### FlashcardCard

**Opis:**
Karta pojedynczej fiszki wyświetlająca przód, tył, badge ze źródłem i menu akcji (edit/delete). Używa Card z Shadcn/ui.

**Główne elementy:**
- `<Card className="p-4">`
  - `<div className="flex justify-between items-start mb-3">`
    - `<Badge>` (source indicator z color-coding)
    - `<DropdownMenu>`
      - `<DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>`
      - `<DropdownMenuItem onClick={onDelete} className="text-destructive">Delete</DropdownMenuItem>`
  - `<div className="mb-3">`
    - `<p className="text-sm text-muted-foreground mb-1">Front:</p>`
    - `<p className="font-medium">{flashcard.front}</p>`
  - `<div>`
    - `<p className="text-sm text-muted-foreground mb-1">Back:</p>`
    - `<p>{flashcard.back}</p>`
  - `<div className="mt-3 text-xs text-muted-foreground">`
    - Created/Updated dates

**Obsługiwane zdarzenia:**
- `onEdit` - otwiera modal edycji
- `onDelete` - otwiera dialog usunięcia

**Warunki walidacji:**
- Brak - walidacja przy zapisie

**Typy:**
- `FlashcardDto`

**Propsy:**
```typescript
interface FlashcardCardProps {
  flashcard: FlashcardDto;
  onEdit: (flashcard: FlashcardDto) => void;
  onDelete: (id: string) => void;
}
```

**Badge color-coding:**
- Manual: `variant="secondary"` (szary)
- AI Generated (ai-full): `variant="default"` (niebieski)
- AI Edited (ai-edited): `variant="outline"` + custom class (pomarańczowy)

### FlashcardModal

**Opis:**
Modal do tworzenia nowej fiszki lub edycji istniejącej. Używa Dialog z Shadcn/ui. Zawiera formularz z walidacją inline, licznikami znaków i obsługą błędów.

**Główne elementy:**
- `<Dialog open={isOpen} onOpenChange={onClose}>`
  - `<DialogContent>`
    - `<DialogHeader>`
      - `<DialogTitle>{mode === 'add' ? 'Add Manual Flashcard' : 'Edit Flashcard'}</DialogTitle>`
    - `<form onSubmit={handleSubmit}>`
      - `<div className="space-y-4">`
        - `<div>` (Front field)
          - `<Label htmlFor="front">Front</Label>`
          - `<Input id="front" value={formData.front} onChange={handleFrontChange} />`
          - `<p className="text-sm text-muted-foreground">{frontLength}/200</p>`
          - `<p className="text-sm text-destructive">{validation.front.message}</p>` (jeśli błąd)
        - `<div>` (Back field)
          - `<Label htmlFor="back">Back</Label>`
          - `<Textarea id="back" value={formData.back} onChange={handleBackChange} rows={4} />`
          - `<p className="text-sm text-muted-foreground">{backLength}/500</p>`
          - `<p className="text-sm text-destructive">{validation.back.message}</p>` (jeśli błąd)
        - `<p className="text-sm text-destructive">{error?.message}</p>` (błąd API)
    - `<DialogFooter>`
      - `<Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>`
      - `<Button type="submit" disabled={!isValid || isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>`

**Obsługiwane zdarzenia:**
- `onChange` dla pól input - aktualizacja formData i walidacja
- `onSubmit` - submit formularza (create/update)
- `onClose` - zamknięcie modala

**Warunki walidacji:**

**Front field:**
- Wymagane (required): nie może być puste po trim
- Minimalna długość: 1 znak po trim
- Maksymalna długość: 200 znaków po trim
- Komunikaty:
  - Puste: "Front is required"
  - Za krótkie: "Front must be at least 1 character"
  - Za długie: "Front must not exceed 200 characters"

**Back field:**
- Wymagane (required): nie może być puste po trim
- Minimalna długość: 1 znak po trim
- Maksymalna długość: 500 znaków po trim
- Komunikaty:
  - Puste: "Back is required"
  - Za krótkie: "Back must be at least 1 character"
  - Za długie: "Back must not exceed 500 characters"

**Walidacja odbywa się:**
1. **Inline (onChange)** - walidacja długości i wymóg niepustego pola, wyświetlanie komunikatów błędów pod polami
2. **OnSubmit** - przed wysłaniem do API, ponowna walidacja całego formularza
3. **Po odpowiedzi API** - wyświetlanie błędów z backendu (422, 400)

**Typy:**
- `FlashcardModalState`
- `FlashcardModalMode`
- `CreateFlashcardCommand`
- `UpdateFlashcardCommand`
- `ValidationState`

**Propsy:**
```typescript
interface FlashcardModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  flashcard: FlashcardDto | null;
  onClose: () => void;
  onSubmit: (data: FlashcardFormData, mode: 'add' | 'edit', flashcardId?: string) => Promise<void>;
}

interface FlashcardFormData {
  front: string;
  back: string;
}
```

### DeleteFlashcardDialog

**Opis:**
Dialog potwierdzenia usunięcia fiszki. Używa AlertDialog z Shadcn/ui. Wyświetla ostrzeżenie o nieodwracalności operacji.

**Główne elementy:**
- `<AlertDialog open={isOpen} onOpenChange={onClose}>`
  - `<AlertDialogContent>`
    - `<AlertDialogHeader>`
      - `<AlertDialogTitle>Delete Flashcard</AlertDialogTitle>`
      - `<AlertDialogDescription>Are you sure you want to delete this flashcard? This action cannot be undone.</AlertDialogDescription>`
    - `<AlertDialogFooter>`
      - `<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>`
      - `<AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive">{isDeleting ? 'Deleting...' : 'Delete'}</AlertDialogAction>`

**Obsługiwane zdarzenia:**
- `onClose` - zamknięcie dialogu (Cancel)
- `onConfirm` - potwierdzenie usunięcia (Delete)

**Warunki walidacji:**
- Brak - tylko potwierdzenie akcji

**Typy:**
- `DeleteDialogState`

**Propsy:**
```typescript
interface DeleteFlashcardDialogProps {
  isOpen: boolean;
  flashcardId: string | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}
```

### Pagination

**Opis:**
Komponent paginacji z przyciskami Previous/Next i numerami stron. Używa Pagination z Shadcn/ui.

**Główne elementy:**
- `<Pagination>`
  - `<PaginationContent>`
    - `<PaginationItem>`
      - `<PaginationPrevious onClick={handlePrevious} disabled={currentPage === 1} />`
    - `<PaginationItem>` (dla każdej strony)
      - `<PaginationLink onClick={() => handlePageClick(page)} isActive={page === currentPage}>{page}</PaginationLink>`
    - `<PaginationItem>`
      - `<PaginationNext onClick={handleNext} disabled={currentPage === totalPages} />`

**Obsługiwane zdarzenia:**
- `onPageChange(page)` - zmiana strony

**Warunki walidacji:**
- Brak

**Typy:**
- `PaginationMeta`

**Propsy:**
```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}
```

### EmptyState

**Opis:**
Komponent wyświetlany gdy brak fiszek. Dwa warianty: całkowity brak fiszek lub brak wyników po filtrze.

**Główne elementy:**
- `<div className="text-center py-12">`
  - `<p className="text-lg text-muted-foreground mb-4">{message}</p>`
  - `<div className="flex gap-4 justify-center">`
    - `<Button onClick={onGenerateClick}>Generate New Flashcards</Button>` (jeśli total brak)
    - `<Button variant="outline" onClick={onAddManualClick}>Add Manual Flashcard</Button>` (jeśli total brak)
    - `<Button onClick={onClearFilters}>Clear Filters</Button>` (jeśli filtered empty)

**Obsługiwane zdarzenia:**
- `onGenerateClick` - przekierowanie do /generations
- `onAddManualClick` - otwarcie modala dodawania
- `onClearFilters` - czyszczenie filtrów

**Warunki walidacji:**
- Brak

**Typy:**
- `EmptyStateVariant`

**Propsy:**
```typescript
interface EmptyStateProps {
  variant: 'total-empty' | 'filtered-empty';
  onGenerateClick?: () => void;
  onAddManualClick?: () => void;
  onClearFilters?: () => void;
}
```

## 5. Typy

### Typy z src/types.ts (już istniejące):

```typescript
// Bazowe typy encji (z database)
export type FlashcardEntity = Database["public"]["Tables"]["flashcards"]["Row"];
export type FlashcardInsert = Database["public"]["Tables"]["flashcards"]["Insert"];
export type FlashcardUpdate = Database["public"]["Tables"]["flashcards"]["Update"];
export type FlashcardSource = Database["public"]["Enums"]["flashcard_source"];
// "manual" | "ai-full" | "ai-edited"

// DTOs dla API
export type FlashcardDto = Pick<
  FlashcardEntity,
  "id" | "generation_id" | "front" | "back" | "source" | "created_at" | "updated_at"
>;

export interface CreateFlashcardCommand {
  front: string;
  back: string;
  source: FlashcardSource;
  generation_id?: string | null;
}

export interface UpdateFlashcardCommand {
  front: string;
  back: string;
}

export interface ListFlashcardsQuery {
  page?: number;
  limit?: number;
  sort?: "created_at" | "updated_at";
  order?: "asc" | "desc";
  source?: FlashcardSource;
  generation_id?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export type PaginatedFlashcardsResponse = PaginatedResponse<FlashcardDto>;
// = { data: FlashcardDto[]; pagination: PaginationMeta }

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown> | ValidationErrorDetail[];
}

export interface ValidationState {
  isValid: boolean;
  message: string | null;
}
```

### Nowe typy ViewModel (do dodania do src/types.ts):

```typescript
// ============================================================================
// Flashcards View Types (ViewModel)
// ============================================================================

/**
 * Typ stanu głównego widoku Flashcards
 */
export interface FlashcardsViewState {
  flashcards: FlashcardDto[];
  isLoading: boolean;
  error: ApiError | null;
  pagination: PaginationState;
  filters: FlashcardsFilters;
  modal: FlashcardModalState;
  deleteDialog: DeleteDialogState;
}

/**
 * Stan paginacji w widoku
 */
export interface PaginationState {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
}

/**
 * Filtry dla listy fiszek
 */
export interface FlashcardsFilters {
  source: 'all' | FlashcardSource;
  sort: 'created_at' | 'updated_at';
  order: 'asc' | 'desc';
}

/**
 * Stan modala fiszki (add/edit)
 */
export interface FlashcardModalState {
  isOpen: boolean;
  mode: 'add' | 'edit';
  flashcard: FlashcardDto | null;
  formData: FlashcardFormData;
  validation: {
    front: ValidationState;
    back: ValidationState;
  };
  isSubmitting: boolean;
  error: ApiError | null;
}

/**
 * Dane formularza fiszki
 */
export interface FlashcardFormData {
  front: string;
  back: string;
}

/**
 * Stan dialogu usuwania fiszki
 */
export interface DeleteDialogState {
  isOpen: boolean;
  flashcardId: string | null;
  isDeleting: boolean;
  error: ApiError | null;
}

/**
 * Wariant pustego stanu
 */
export type EmptyStateVariant = 'total-empty' | 'filtered-empty';

/**
 * Rozszerzona PaginationMeta z total_pages
 */
export interface PaginationMetaExtended extends PaginationMeta {
  total_pages: number;
}
```

## 6. Zarządzanie stanem

Stan widoku będzie zarządzany przez custom hook `useFlashcards`, który enkapsuluje całą logikę biznesową.

### Custom Hook: useFlashcards

**Lokalizacja:** `src/lib/hooks/useFlashcards.ts`

**Odpowiedzialności:**
1. Pobieranie listy fiszek z API
2. Zarządzanie filtrami i sortowaniem
3. Zarządzanie paginacją
4. Zarządzanie stanem modala (add/edit)
5. Zarządzanie dialogu usuwania
6. Obsługa operacji CRUD (create, update, delete)
7. Obsługa błędów i stanów ładowania
8. Synchronizacja z URL (query params)

**Sygnatura:**
```typescript
function useFlashcards(
  initialPage?: number,
  initialFilters?: Partial<FlashcardsFilters>
): UseFlashcardsReturn;

interface UseFlashcardsReturn {
  // Stan danych
  flashcards: FlashcardDto[];
  isLoading: boolean;
  error: ApiError | null;
  
  // Paginacja
  pagination: PaginationState;
  goToPage: (page: number) => void;
  
  // Filtry
  filters: FlashcardsFilters;
  updateFilters: (filters: Partial<FlashcardsFilters>) => void;
  clearFilters: () => void;
  
  // Modal operations
  modalState: FlashcardModalState;
  openAddModal: () => void;
  openEditModal: (flashcard: FlashcardDto) => void;
  closeModal: () => void;
  submitModal: (data: FlashcardFormData) => Promise<void>;
  
  // Delete operations
  deleteDialogState: DeleteDialogState;
  openDeleteDialog: (flashcardId: string) => void;
  closeDeleteDialog: () => void;
  confirmDelete: () => Promise<void>;
  
  // Navigation
  navigateToGenerate: () => void;
  
  // Refresh
  refetch: () => Promise<void>;
}
```

**Wewnętrzny stan (useState):**
```typescript
const [flashcards, setFlashcards] = useState<FlashcardDto[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<ApiError | null>(null);
const [pagination, setPagination] = useState<PaginationState>({
  currentPage: initialPage || 1,
  totalPages: 1,
  total: 0,
  limit: 20,
});
const [filters, setFilters] = useState<FlashcardsFilters>({
  source: initialFilters?.source || 'all',
  sort: initialFilters?.sort || 'created_at',
  order: initialFilters?.order || 'desc',
});
const [modalState, setModalState] = useState<FlashcardModalState>({
  isOpen: false,
  mode: 'add',
  flashcard: null,
  formData: { front: '', back: '' },
  validation: {
    front: { isValid: true, message: null },
    back: { isValid: true, message: null },
  },
  isSubmitting: false,
  error: null,
});
const [deleteDialogState, setDeleteDialogState] = useState<DeleteDialogState>({
  isOpen: false,
  flashcardId: null,
  isDeleting: false,
  error: null,
});
```

**Efekty (useEffect):**

1. **Fetch flashcards przy zmianie paginacji/filtrów:**
```typescript
useEffect(() => {
  fetchFlashcards();
}, [pagination.currentPage, filters]);
```

2. **Synchronizacja URL z filtami i paginacją:**
```typescript
useEffect(() => {
  const params = new URLSearchParams();
  params.set('page', pagination.currentPage.toString());
  if (filters.source !== 'all') params.set('source', filters.source);
  if (filters.sort !== 'created_at') params.set('sort', filters.sort);
  if (filters.order !== 'desc') params.set('order', filters.order);
  
  window.history.replaceState(null, '', `?${params.toString()}`);
}, [pagination.currentPage, filters]);
```

**Kluczowe funkcje:**

1. **fetchFlashcards()** - pobiera listę fiszek z API
2. **goToPage(page)** - zmienia stronę paginacji
3. **updateFilters(filters)** - aktualizuje filtry i resetuje do strony 1
4. **clearFilters()** - resetuje filtry do domyślnych wartości
5. **openAddModal()** - otwiera modal w trybie dodawania
6. **openEditModal(flashcard)** - otwiera modal w trybie edycji
7. **submitModal(data)** - zapisuje fiszkę (create/update)
8. **openDeleteDialog(id)** - otwiera dialog usuwania
9. **confirmDelete()** - wykonuje usunięcie fiszki
10. **navigateToGenerate()** - przekierowuje użytkownika do /generations
11. **refetch()** - odświeża listę fiszek

### Alternatywa: useReducer

Dla bardziej złożonego zarządzania stanem można użyć `useReducer` zamiast wielu `useState`. Jednak dla MVP `useState` + custom hook jest wystarczający i bardziej czytelny.

## 7. Integracja API

### API Endpoints wykorzystywane przez widok:

#### 1. GET /api/flashcards - Lista fiszek

**Cel:** Pobranie paginowanej listy fiszek użytkownika z możliwością filtrowania i sortowania

**Request:**
- **Method:** GET
- **Headers:** 
  - `Authorization: Bearer {access_token}` (zarządzane przez middleware)
- **Query Parameters:**
  ```typescript
  interface ListFlashcardsQueryParams {
    page?: number;        // default: 1
    limit?: number;       // default: 20, max: 100
    sort?: 'created_at' | 'updated_at';  // default: 'created_at'
    order?: 'asc' | 'desc';  // default: 'desc'
    source?: 'manual' | 'ai-full' | 'ai-edited';  // optional
    generation_id?: string;  // optional, nie używane w tym widoku
  }
  ```

**Response (Success - 200 OK):**
```typescript
interface ListFlashcardsResponse {
  data: FlashcardDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// FlashcardDto
interface FlashcardDto {
  id: string;
  generation_id: string | null;
  front: string;
  back: string;
  source: 'manual' | 'ai-full' | 'ai-edited';
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}
```

**Response (Error):**
- **401 Unauthorized:** Token nieprawidłowy lub brak - redirect do /login
- **400 Bad Request:** Nieprawidłowe parametry query
  ```typescript
  {
    error: {
      code: "VALIDATION_FAILED",
      message: "Invalid query parameters",
      details?: { field: string; issue: string; }
    }
  }
  ```

**Implementacja wywołania:**
```typescript
async function fetchFlashcards(
  query: ListFlashcardsQuery
): Promise<PaginatedFlashcardsResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', query.page.toString());
  if (query.limit) params.set('limit', query.limit.toString());
  if (query.sort) params.set('sort', query.sort);
  if (query.order) params.set('order', query.order);
  if (query.source && query.source !== 'all') params.set('source', query.source);
  
  const response = await fetch(`/api/flashcards?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // dla cookies z session
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    const errorData = await response.json();
    throw new Error(errorData.error.message);
  }
  
  return await response.json();
}
```

#### 2. POST /api/flashcards - Tworzenie fiszki

**Cel:** Utworzenie nowej fiszki manualnie

**Request:**
- **Method:** POST
- **Headers:**
  - `Authorization: Bearer {access_token}`
  - `Content-Type: application/json`
- **Body:**
  ```typescript
  // Array of flashcards (bulk create)
  CreateFlashcardCommand[]
  
  interface CreateFlashcardCommand {
    front: string;  // 1-200 chars after trim
    back: string;   // 1-500 chars after trim
    source: 'manual' | 'ai-full' | 'ai-edited';
    generation_id?: string | null;  // null dla manual
  }
  
  // Przykład dla manual flashcard:
  [{
    front: "Hello",
    back: "Cześć",
    source: "manual",
    generation_id: null
  }]
  ```

**Response (Success - 201 Created):**
```typescript
interface CreateFlashcardsResponse {
  created_count: number;
  flashcards: FlashcardDto[];
}
```

**Response (Error):**
- **401 Unauthorized:** Brak autoryzacji
- **400 Bad Request:** Nieprawidłowy JSON lub format
- **422 Unprocessable Entity:** Walidacja nie przeszła
  ```typescript
  {
    error: {
      code: "VALIDATION_FAILED",
      message: string;
      details?: ValidationErrorDetail[];
    }
  }
  
  interface ValidationErrorDetail {
    index: number;
    field: string;
    message: string;
  }
  ```

**Implementacja wywołania:**
```typescript
async function createFlashcard(
  data: FlashcardFormData
): Promise<CreateFlashcardsResponse> {
  const command: CreateFlashcardCommand = {
    front: data.front.trim(),
    back: data.back.trim(),
    source: 'manual',
    generation_id: null,
  };
  
  const response = await fetch('/api/flashcards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify([command]), // Array!
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    const errorData = await response.json();
    throw new Error(errorData.error.message);
  }
  
  return await response.json();
}
```

#### 3. PUT /api/flashcards/{id} - Aktualizacja fiszki

**Cel:** Edycja istniejącej fiszki

**Request:**
- **Method:** PUT
- **Path:** `/api/flashcards/{id}` - id to UUID fiszki
- **Headers:**
  - `Authorization: Bearer {access_token}`
  - `Content-Type: application/json`
- **Body:**
  ```typescript
  interface UpdateFlashcardCommand {
    front: string;  // 1-200 chars after trim
    back: string;   // 1-500 chars after trim
  }
  
  // Przykład:
  {
    front: "Hello (updated)",
    back: "Cześć (zaktualizowane)"
  }
  ```

**Response (Success - 200 OK):**
```typescript
FlashcardDto  // zaktualizowana fiszka
```

**Response (Error):**
- **401 Unauthorized:** Brak autoryzacji
- **404 Not Found:** Fiszka nie istnieje lub nie należy do użytkownika
  ```typescript
  {
    error: {
      code: "NOT_FOUND",
      message: "Flashcard not found"
    }
  }
  ```
- **400 Bad Request:** Brak pól do aktualizacji
- **422 Unprocessable Entity:** Walidacja nie przeszła

**Implementacja wywołania:**
```typescript
async function updateFlashcard(
  id: string,
  data: FlashcardFormData
): Promise<FlashcardDto> {
  const command: UpdateFlashcardCommand = {
    front: data.front.trim(),
    back: data.back.trim(),
  };
  
  const response = await fetch(`/api/flashcards/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(command),
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (response.status === 404) {
      throw new Error('Flashcard not found');
    }
    const errorData = await response.json();
    throw new Error(errorData.error.message);
  }
  
  return await response.json();
}
```

#### 4. DELETE /api/flashcards/{id} - Usunięcie fiszki

**Cel:** Trwałe usunięcie fiszki (hard delete)

**Request:**
- **Method:** DELETE
- **Path:** `/api/flashcards/{id}` - id to UUID fiszki
- **Headers:**
  - `Authorization: Bearer {access_token}`
- **Body:** brak

**Response (Success - 204 No Content):**
- Empty response (brak body)

**Response (Error):**
- **401 Unauthorized:** Brak autoryzacji
- **404 Not Found:** Fiszka nie istnieje lub nie należy do użytkownika
  ```typescript
  {
    error: {
      code: "NOT_FOUND",
      message: "Flashcard not found"
    }
  }
  ```

**Implementacja wywołania:**
```typescript
async function deleteFlashcard(id: string): Promise<void> {
  const response = await fetch(`/api/flashcards/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (response.status === 404) {
      throw new Error('Flashcard not found');
    }
    const errorData = await response.json();
    throw new Error(errorData.error.message);
  }
  
  // 204 No Content - success
}
```

### API Service Layer

Dla lepszej organizacji, wszystkie wywołania API powinny być zgrupowane w service file:

**Lokalizacja:** `src/lib/services/flashcards-api.service.ts`

```typescript
export class FlashcardsApiService {
  static async list(query: ListFlashcardsQuery): Promise<PaginatedFlashcardsResponse> { }
  static async create(data: FlashcardFormData): Promise<CreateFlashcardsResponse> { }
  static async update(id: string, data: FlashcardFormData): Promise<FlashcardDto> { }
  static async delete(id: string): Promise<void> { }
}
```

## 8. Interakcje użytkownika

### 1. Przeglądanie listy fiszek

**Flow:**
1. Użytkownik wchodzi na `/flashcards`
2. System pobiera pierwszą stronę fiszek (page=1, limit=20, sort=created_at, order=desc)
3. Wyświetla grid z fiszkami lub empty state jeśli brak

**Stan UI:**
- Podczas ładowania: skeleton placeholders w grid
- Po załadowaniu: karty fiszek z danymi
- Błąd: error state z przyciskiem "Try Again"

### 2. Dodawanie nowej fiszki manualnie

**Flow:**
1. Użytkownik klika "Add Manual Flashcard" w header
2. Otwiera się modal z pustym formularzem
3. Użytkownik wpisuje tekst w pola Front i Back
4. System waliduje na bieżąco (onChange):
   - Pokazuje licznik znaków (X/200, X/500)
   - Pokazuje błędy walidacji pod polami (jeśli przekroczone limity)
5. Przycisk "Save" jest disabled gdy:
   - Pola są puste (po trim)
   - Przekroczone limity długości
   - Trwa zapisywanie (isSubmitting)
6. Użytkownik klika "Save"
7. System wysyła POST /api/flashcards
8. W przypadku sukcesu:
   - Toast: "Flashcard created successfully"
   - Modal się zamyka
   - Lista fiszek odświeża się (refetch)
   - Nowa fiszka pojawia się na liście
9. W przypadku błędu:
   - Komunikat błędu w modalu (nad footer)
   - Modal pozostaje otwarty
   - Użytkownik może poprawić i spróbować ponownie

**Skróty klawiszowe:**
- ESC - zamyka modal
- Enter (w Input) - submit formularza (jeśli valid)

### 3. Edycja fiszki

**Flow:**
1. Użytkownik klika ikonę menu (⋮) na karcie fiszki
2. Otwiera się dropdown menu
3. Użytkownik klika "Edit"
4. Otwiera się modal z wypełnionym formularzem (front, back)
5. Użytkownik modyfikuje treść
6. System waliduje na bieżąco (jak przy dodawaniu)
7. Użytkownik klika "Save"
8. System wysyła PUT /api/flashcards/{id}
9. W przypadku sukcesu:
   - Toast: "Flashcard updated successfully"
   - Modal się zamyka
   - Karta fiszki aktualizuje się na liście (bez pełnego refetch)
10. W przypadku błędu:
    - Jeśli 404: Toast "Flashcard not found", zamyka modal, refetch listy
    - Inny błąd: komunikat w modalu, możliwość ponowienia

### 4. Usuwanie fiszki

**Flow:**
1. Użytkownik klika ikonę menu (⋮) na karcie fiszki
2. Otwiera się dropdown menu
3. Użytkownik klika "Delete" (czerwony tekst)
4. Otwiera się AlertDialog z ostrzeżeniem:
   - "Delete Flashcard"
   - "Are you sure you want to delete this flashcard? This action cannot be undone."
5. Użytkownik klika "Delete" (czerwony przycisk)
6. System wysyła DELETE /api/flashcards/{id}
7. W przypadku sukcesu:
   - Toast: "Flashcard deleted"
   - Dialog się zamyka
   - Karta znika z listy (optimistic update lub refetch)
   - Jeśli była ostatnia na stronie, przejdź do poprzedniej strony
8. W przypadku błędu:
   - Jeśli 404: Toast "Flashcard not found", zamyka dialog, refetch
   - Inny błąd: Toast "Failed to delete. Try again."

**Bezpieczeństwo:**
- Podwójne potwierdzenie (dropdown + dialog)
- Wyraźne ostrzeżenie o nieodwracalności
- Czerwony kolor dla akcji destrukcyjnej

### 5. Filtrowanie fiszek

**Flow:**
1. Użytkownik klika dropdown "Source"
2. Wybiera opcję: All / Manual / AI Generated / AI Edited
3. System:
   - Resetuje paginację do strony 1
   - Aktualizuje URL: `?page=1&source=manual`
   - Wysyła GET /api/flashcards z nowym filtrem
   - Wyświetla wyniki lub filtered empty state
4. Analogicznie dla "Sort by" i "Order"

**Kombinacje filtrów:**
- Można łączyć wszystkie filtry jednocześnie
- Każda zmiana filtra resetuje do strony 1
- URL zawsze odzwierciedla aktualny stan

### 6. Sortowanie fiszek

**Flow:**
1. Użytkownik wybiera "Sort by": Created Date / Updated Date
2. Użytkownik wybiera "Order": Newest First / Oldest First
3. System:
   - Resetuje do strony 1
   - Aktualizuje URL
   - Pobiera posortowane dane
   - Wyświetla listę

**Mapowanie UI → API:**
- "Created Date" → `sort=created_at`
- "Updated Date" → `sort=updated_at`
- "Newest First" → `order=desc`
- "Oldest First" → `order=asc`

### 7. Nawigacja paginacji

**Flow:**
1. Użytkownik klika przycisk "Next" lub numer strony
2. System:
   - Aktualizuje URL: `?page=2`
   - Scrolluje na górę strony
   - Wysyła GET /api/flashcards z nowym page
   - Wyświetla nowe wyniki
3. Przyciski Previous/Next są disabled na krańcach:
   - Previous disabled na stronie 1
   - Next disabled na ostatniej stronie

**Browser back/forward:**
- Działa poprawnie dzięki synchronizacji z URL
- Back/forward aktualizuje stan i pobiera dane

### 8. Czyszczenie filtrów (filtered empty state)

**Flow:**
1. Użytkownik ustawił filtry, które nie dają wyników
2. Wyświetla się empty state: "No flashcards match your filters"
3. Użytkownik klika "Clear Filters"
4. System:
   - Resetuje filtry do domyślnych (source=all, sort=created_at, order=desc)
   - Resetuje do strony 1
   - Aktualizuje URL: `?page=1`
   - Pobiera dane bez filtrów
   - Wyświetla pełną listę

### 9. Nawigacja do widoku generowania

**Flow:**
1. Użytkownik klika przycisk "Generate New Flashcards" w header lub w empty state
2. System przekierowuje użytkownika do `/generations`
3. Użytkownik przechodzi do widoku generowania fiszek przez AI

**Kontekst użycia:**
- Przycisk dostępny w header zawsze (gdy użytkownik ma fiszki lub nie)
- Przycisk dostępny w total empty state jako główna akcja CTA
- Zapewnia szybki dostęp do głównej funkcjonalności aplikacji (generowanie przez AI)

## 9. Warunki i walidacja

### Walidacja formularza fiszki (FlashcardModal)

Walidacja odbywa się na trzech poziomach:

#### Poziom 1: Walidacja inline (onChange)

**Front field:**
```typescript
function validateFront(value: string): ValidationState {
  const trimmed = value.trim();
  
  if (trimmed.length === 0) {
    return {
      isValid: false,
      message: 'Front is required'
    };
  }
  
  if (trimmed.length > 200) {
    return {
      isValid: false,
      message: 'Front must not exceed 200 characters'
    };
  }
  
  return {
    isValid: true,
    message: null
  };
}
```

**Back field:**
```typescript
function validateBack(value: string): ValidationState {
  const trimmed = value.trim();
  
  if (trimmed.length === 0) {
    return {
      isValid: false,
      message: 'Back is required'
    };
  }
  
  if (trimmed.length > 500) {
    return {
      isValid: false,
      message: 'Back must not exceed 500 characters'
    };
  }
  
  return {
    isValid: true,
    message: null
  };
}
```

**Warunki dla przycisku "Save":**
```typescript
const isSaveDisabled = 
  !validation.front.isValid ||
  !validation.back.isValid ||
  isSubmitting ||
  (formData.front.trim().length === 0) ||
  (formData.back.trim().length === 0);
```

**Wyświetlanie błędów:**
- Błędy pokazują się pod polami w czasie rzeczywistym (po pierwszym blur lub onChange)
- Kolor czerwony (text-destructive)
- Licznik znaków zawsze widoczny (gray gdy OK, red gdy > limit)

#### Poziom 2: Walidacja onSubmit (frontend)

Przed wysłaniem do API, ponowna walidacja całego formularza:

```typescript
function handleSubmit(e: FormEvent) {
  e.preventDefault();
  
  const frontValidation = validateFront(formData.front);
  const backValidation = validateBack(formData.back);
  
  if (!frontValidation.isValid || !backValidation.isValid) {
    setValidation({
      front: frontValidation,
      back: backValidation,
    });
    return;
  }
  
  // Przejdź do wysłania
  submitToApi();
}
```

#### Poziom 3: Walidacja backend (API)

Backend waliduje po otrzymaniu requesta:
- Zod schema validation
- Trimming białych znaków
- Sprawdzenie długości: front 1-200, back 1-500
- Sprawdzenie source (manual/ai-full/ai-edited)

**Odpowiedzi błędów z API:**

422 Unprocessable Entity:
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Front must not exceed 200 characters",
    "details": [
      {
        "index": 0,
        "field": "front",
        "message": "Front must not exceed 200 characters"
      }
    ]
  }
}
```

**Obsługa w UI:**
- Wyświetl `error.message` w modalu nad footer
- Jeśli `details` dostępne, podświetl konkretne pola

### Warunki autoryzacji

**Sprawdzanie na poziomie Astro page:**
```typescript
// src/pages/flashcards.astro
const { data: { session } } = await locals.supabase.auth.getSession();

if (!session) {
  return Astro.redirect('/login');
}
```

**Sprawdzanie na poziomie API calls:**
- Jeśli odpowiedź 401, automatycznie redirect do /login
- Implementowane w każdej funkcji API service

### Warunki dla Empty States

**Total Empty State:**
```typescript
const isTotalEmpty = 
  !isLoading &&
  flashcards.length === 0 &&
  filters.source === 'all' &&
  pagination.total === 0;
```

**Filtered Empty State:**
```typescript
const isFilteredEmpty =
  !isLoading &&
  flashcards.length === 0 &&
  (filters.source !== 'all' || filters.sort !== 'created_at' || filters.order !== 'desc') &&
  pagination.total === 0;
```

### Warunki dla Pagination

**Wyświetlanie komponentu Pagination:**
```typescript
const shouldShowPagination = 
  !isLoading &&
  flashcards.length > 0 &&
  pagination.totalPages > 1;
```

**Disabled Previous:**
```typescript
const isPreviousDisabled = pagination.currentPage === 1;
```

**Disabled Next:**
```typescript
const isNextDisabled = pagination.currentPage === pagination.totalPages;
```

### Warunki dla Delete Dialog

**Disabled przyciski podczas usuwania:**
```typescript
const areButtonsDisabled = deleteDialogState.isDeleting;
```

**Tekst przycisku Delete:**
```typescript
const deleteButtonText = deleteDialogState.isDeleting ? 'Deleting...' : 'Delete';
```

## 10. Obsługa błędów

### Kategorie błędów:

#### 1. Błędy sieciowe (Network errors)

**Przyczyny:**
- Brak połączenia z internetem
- Timeout requesta
- Serwer niedostępny

**Obsługa:**
```typescript
try {
  const response = await fetch('/api/flashcards');
  // ...
} catch (error) {
  if (error instanceof TypeError) {
    // Network error
    setError({
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection and try again.',
    });
  }
}
```

**UI:**
- Error state w głównym widoku z przyciskiem "Try Again"
- Toast notification: "Network error. Please try again."

#### 2. Błędy autoryzacji (401 Unauthorized)

**Przyczyny:**
- Wygasła sesja
- Brak tokenu
- Nieprawidłowy token

**Obsługa:**
```typescript
if (response.status === 401) {
  // Redirect do loginu
  window.location.href = '/login';
  return;
}
```

**UI:**
- Automatyczne przekierowanie na /login
- Opcjonalnie: toast "Session expired. Please log in again."

#### 3. Błędy walidacji (400, 422)

**Przyczyny:**
- Nieprawidłowe dane w formularzu
- Niezgodność ze schematem API
- Przekroczenie limitów

**Obsługa:**
```typescript
if (response.status === 422) {
  const errorData: ErrorResponse = await response.json();
  
  // Wyświetl błąd w modalu
  setModalState(prev => ({
    ...prev,
    error: errorData.error,
  }));
  
  // Opcjonalnie: mapuj details na konkretne pola
  if (errorData.error.details) {
    // highlight specific fields
  }
}
```

**UI:**
- Komunikat błędu w modalu nad footer (czerwony tekst)
- Podświetlenie konkretnych pól (jeśli details dostępne)
- Modal pozostaje otwarty, użytkownik może poprawić

#### 4. Błędy Not Found (404)

**Przyczyny:**
- Fiszka została usunięta przez inną sesję
- Fiszka nie należy do użytkownika
- Nieprawidłowe ID

**Obsługa - Update:**
```typescript
if (response.status === 404) {
  toast.error('Flashcard not found. It may have been deleted.');
  closeModal();
  refetch(); // odśwież listę
  return;
}
```

**Obsługa - Delete:**
```typescript
if (response.status === 404) {
  toast.error('Flashcard not found');
  closeDeleteDialog();
  refetch();
  return;
}
```

**UI:**
- Toast notification
- Modal/dialog zamyka się
- Lista odświeża się automatycznie

#### 5. Błędy serwera (500)

**Przyczyny:**
- Nieoczekiwany błąd w backendzie
- Problem z bazą danych
- Bug w kodzie

**Obsługa:**
```typescript
if (response.status === 500) {
  const errorData = await response.json();
  toast.error('An unexpected error occurred. Please try again later.');
  console.error('Server error:', errorData);
  return;
}
```

**UI:**
- Toast z ogólnym komunikatem
- Opcja ponowienia akcji
- Error state w widoku (jeśli podczas initial fetch)

### Edge cases:

#### Edge case 1: Usunięcie ostatniej fiszki na stronie

**Problem:** Po usunięciu ostatniej fiszki na stronie 3, strona 3 jest pusta

**Rozwiązanie:**
```typescript
async function confirmDelete() {
  await FlashcardsApiService.delete(deleteDialogState.flashcardId);
  
  // Jeśli była ostatnia na stronie i nie jesteśmy na stronie 1
  if (flashcards.length === 1 && pagination.currentPage > 1) {
    goToPage(pagination.currentPage - 1);
  } else {
    refetch();
  }
  
  closeDeleteDialog();
  toast.success('Flashcard deleted');
}
```

#### Edge case 2: Concurrent modification

**Problem:** Użytkownik edytuje fiszkę, która została właśnie usunięta w innej karcie

**Rozwiązanie:**
- Backend zwróci 404
- Frontend obsługuje jak opisano wyżej (toast + refetch)

#### Edge case 3: Page > total_pages w URL

**Problem:** Użytkownik wpisał ręcznie `?page=999` lub fiszki zostały usunięte

**Rozwiązanie:**
```typescript
useEffect(() => {
  if (pagination.currentPage > pagination.totalPages && pagination.totalPages > 0) {
    // Redirect do ostatniej strony
    goToPage(pagination.totalPages);
  }
}, [pagination.currentPage, pagination.totalPages]);
```

#### Edge case 4: Bardzo długi tekst w fiszce

**Problem:** Użytkownik wkleił 200/500 znaków, UI może się rozjechać

**Rozwiązanie:**
- CSS: `overflow-wrap: break-word` na content
- CSS: `max-height` z `overflow: hidden` + "Read more" (opcjonalnie, dla przyszłości)
- Na razie: pozwól tekstowi się wrap'ować

#### Edge case 5: Spamowanie przycisku Save

**Problem:** Użytkownik klika Save wiele razy

**Rozwiązanie:**
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

async function submitModal() {
  if (isSubmitting) return; // guard clause
  
  setIsSubmitting(true);
  try {
    await createOrUpdate();
  } finally {
    setIsSubmitting(false);
  }
}
```

Button disabled podczas submitting.

#### Edge case 6: Browser back podczas otwartego modala

**Problem:** Użytkownik klika browser back, modal powinien się zamknąć

**Rozwiązanie:**
- Domyślnie Dialog z Shadcn/ui zamyka się przy ESC
- Browser back zmieni URL, ale modal zostanie otwarty
- Opcjonalnie: dodaj listener na popstate i zamknij modal
- Dla MVP: akceptowalne, że modal pozostaje otwarty

### Strategia retry:

Dla operacji read (GET):
- Automatyczny retry z exponential backoff (opcjonalnie)
- Przycisk "Try Again" w error state

Dla operacji write (POST, PUT, DELETE):
- Brak automatycznego retry
- Użytkownik musi ręcznie spróbować ponownie (bezpieczeństwo)

### Logging błędów:

```typescript
function logError(context: string, error: unknown) {
  console.error(`[${context}]`, {
    message: error instanceof Error ? error.message : 'Unknown error',
    timestamp: new Date().toISOString(),
    error,
  });
  
  // W przyszłości: wysyłka do zewnętrznego serwisu (Sentry, etc.)
}
```

## 11. Kroki implementacji

### Faza 1: Setup i struktura (1-2h)

1. **Utworzenie struktury plików:**
   ```
   src/pages/flashcards.astro
   src/components/flashcards/FlashcardsView.tsx
   src/components/flashcards/FlashcardsHeader.tsx
   src/components/flashcards/FlashcardsFilterBar.tsx
   src/components/flashcards/FlashcardsList.tsx
   src/components/flashcards/FlashcardCard.tsx
   src/components/flashcards/FlashcardModal.tsx
   src/components/flashcards/DeleteFlashcardDialog.tsx
   src/components/flashcards/EmptyState.tsx
   src/lib/hooks/useFlashcards.ts
   src/lib/services/flashcards-api.service.ts
   src/lib/validators/flashcard.validator.ts
   ```

2. **Dodanie typów ViewModel do src/types.ts:**
   - `FlashcardsViewState`
   - `PaginationState`
   - `FlashcardsFilters`
   - `FlashcardModalState`
   - `DeleteDialogState`
   - `FlashcardFormData`
   - `EmptyStateVariant`
   - `PaginationMetaExtended`

3. **Setup Astro page:**
   - Utworzenie `flashcards.astro`
   - Dodanie sprawdzenia autoryzacji (redirect jeśli niezalogowany)
   - Parsowanie query params z URL
   - Przekazanie initial props do FlashcardsView

### Faza 2: API Service Layer (1h)

4. **Implementacja FlashcardsApiService:**
   - `list()` - GET /api/flashcards
   - `create()` - POST /api/flashcards
   - `update()` - PUT /api/flashcards/{id}
   - `delete()` - DELETE /api/flashcards/{id}
   - Obsługa błędów (401, 404, 422, 500, network)
   - Proper typing z użyciem DTO

5. **Implementacja walidatorów:**
   - `validateFront()` - walidacja pola Front
   - `validateBack()` - walidacja pola Back
   - `validateFlashcardForm()` - walidacja całego formularza

### Faza 3: Custom Hook (2-3h)

6. **Implementacja useFlashcards:**
   - Setup state (useState dla wszystkich części stanu)
   - `fetchFlashcards()` - pobieranie danych z API
   - `goToPage()` - zmiana strony paginacji
   - `updateFilters()` - aktualizacja filtrów
   - `clearFilters()` - reset filtrów
   - `openAddModal()`, `openEditModal()`, `closeModal()`
   - `submitModal()` - create/update fiszki
   - `openDeleteDialog()`, `closeDeleteDialog()`, `confirmDelete()`
   - `refetch()` - odświeżanie listy
   - useEffect dla fetch przy zmianie paginacji/filtrów
   - useEffect dla synchronizacji URL
   - Obsługa błędów w każdej funkcji

### Faza 4: Komponenty prezentacyjne (3-4h)

7. **FlashcardsHeader:**
   - Layout (flex, justify-between)
   - Tytuł h1
   - Grupa przycisków (flex gap-3)
   - Button "Generate New Flashcards" (outline variant)
   - Button "Add Manual Flashcard" (default variant)
   - Props: onAddClick, onGenerateClick

8. **FlashcardsFilterBar:**
   - 3x Select (Source, Sort by, Order)
   - Mapowanie wartości UI ↔ API
   - Props: filters, onFilterChange
   - Używanie Select z Shadcn/ui

9. **FlashcardCard:**
   - Layout Card
   - Badge dla source (z color-coding)
   - Wyświetlanie front/back
   - DropdownMenu z opcjami Edit/Delete
   - Props: flashcard, onEdit, onDelete
   - Formatowanie dat (utworzenia/modyfikacji)

10. **FlashcardsList:**
    - Grid layout (grid-cols-2)
    - Map przez flashcards → FlashcardCard
    - Warunkowe renderowanie EmptyState
    - Loading state (skeleton placeholders)
    - Props: flashcards, isLoading, onEdit, onDelete

11. **EmptyState:**
    - Dwa warianty (total-empty, filtered-empty)
    - Odpowiednie komunikaty
    - Przyciski CTA:
      - Total empty: "Generate New Flashcards" (primary) i "Add Manual Flashcard" (outline)
      - Filtered empty: "Clear Filters"
    - Props: variant, callbacks (onGenerateClick, onAddManualClick, onClearFilters)

12. **Pagination:**
    - Używanie Pagination z Shadcn/ui
    - Previous/Next buttons
    - Page numbers (max 7 widocznych)
    - Disabled states
    - Props: currentPage, totalPages, total, onPageChange

### Faza 5: Komponenty modali (2-3h)

13. **FlashcardModal:**
    - Dialog z Shadcn/ui
    - DialogHeader z tytułem (Add/Edit)
    - Form z polami Front (Input), Back (Textarea)
    - Character counters (X/200, X/500)
    - Inline validation (onChange)
    - Error messages pod polami
    - API error message nad footer
    - DialogFooter z Cancel/Save
    - Props: isOpen, mode, flashcard, onClose, onSubmit
    - Local state dla formData i validation
    - handleSubmit z walidacją

14. **DeleteFlashcardDialog:**
    - AlertDialog z Shadcn/ui
    - AlertDialogHeader z tytułem
    - AlertDialogDescription z ostrzeżeniem
    - AlertDialogFooter z Cancel/Delete
    - Props: isOpen, flashcardId, isDeleting, onClose, onConfirm
    - Disabled state podczas usuwania

### Faza 6: Główny kontener (1-2h)

15. **FlashcardsView:**
    - Setup useFlashcards hook z initial props
    - Layout głównego kontenera
    - Renderowanie wszystkich child components
    - Przekazywanie callbacks i state (w tym navigateToGenerate)
    - Warunkowe renderowanie modala i dialogu
    - Error boundary (opcjonalnie)

### Faza 7: Integracja i styling (2h)

16. **Styling z Tailwind:**
    - Responsive design (md breakpoints)
    - Proper spacing (gap, padding, margin)
    - Color-coding dla source badges
    - Hover states
    - Focus states (accessibility)
    - Loading states (opacity, disabled)

17. **Integracja komponentów Shadcn/ui:**
    - Button, Card, Badge
    - Dialog, AlertDialog
    - Select, Input, Textarea, Label
    - DropdownMenu
    - Pagination
    - Sprawdzenie czy wszystkie zainstalowane
    - Ewentualna instalacja brakujących: `npx shadcn-ui@latest add [component]`

### Faza 8: Toasty i feedback (1h)

18. **Setup toast notifications:**
    - Instalacja Sonner lub Shadcn Toast
    - Dodanie Toaster do layout
    - Implementacja toastów:
      - Success: "Flashcard created/updated/deleted"
      - Error: "Failed to [action]. Try again."
      - Network error
      - 404 errors

### Faza 9: Testing i debugging (2-3h)

19. **Manual testing scenariuszy:**
    - Przeglądanie listy (różne stany)
    - Dodawanie fiszki (happy path + validation errors)
    - Edycja fiszki (happy path + 404)
    - Usuwanie fiszki (happy path + 404)
    - Filtrowanie (wszystkie kombinacje)
    - Sortowanie
    - Paginacja (forward, backward, jump)
    - Browser back/forward
    - Empty states (total, filtered)
    - Błędy sieciowe (offline)
    - Błędy autoryzacji (expired token)

20. **Edge cases testing:**
    - Usunięcie ostatniej fiszki na stronie
    - Page > total_pages w URL
    - Bardzo długi tekst w fiszce
    - Spamowanie Save button
    - Concurrent modifications
    - Modal keyboard navigation (Tab, ESC)

21. **Accessibility testing:**
    - Keyboard navigation
    - Screen reader (aria-labels)
    - Focus management
    - Color contrast

### Faza 10: Optymalizacja i polish (1-2h)

22. **Performance optimization:**
    - Memoization (useMemo, useCallback) jeśli potrzebne
    - Debouncing dla search (nie w MVP, ale przygotować strukturę)
    - Lazy loading images (nie dotyczy MVP)

23. **Code review i cleanup:**
    - Usunięcie console.logs
    - Sprawdzenie typowania (brak `any`)
    - Spójność nazewnictwa
    - Komentarze dla złożonych części
    - README update (jeśli potrzebne)

24. **Final testing:**
    - Full flow: login → add flashcard → edit → delete → logout
    - Different browsers (Chrome, Firefox, Safari)
    - Different screen sizes (mobile, tablet, desktop)

### Całkowity czas estymowany: 18-25 godzin

---

## Appendix A: Checklist User Stories

Mapowanie user stories na implementację:

- ✅ **US-005 (Autoryzacja):** 
  - Sprawdzenie sesji w Astro page
  - Redirect do /login jeśli niezalogowany
  - 401 handling w API calls

- ✅ **US-006 (Utworzenie fiszki manualnie):**
  - FlashcardModal w trybie "add"
  - POST /api/flashcards
  - Walidacja: niepuste front/back

- ✅ **US-007 (Walidacja długości):**
  - Frontend validation: 1-200 (front), 1-500 (back)
  - Backend validation przez API
  - Trim białych znaków
  - Czytelne komunikaty błędów

- ✅ **US-008 (Lista fiszek):**
  - FlashcardsList z grid layout
  - GET /api/flashcards
  - Tylko fiszki użytkownika (RLS)
  - Empty state gdy brak fiszek

- ✅ **US-009 (Podgląd szczegółów):**
  - FlashcardCard z pełną treścią front/back
  - Wyświetlanie dat utworzenia/modyfikacji
  - Akcje Edit/Delete w dropdown

- ✅ **US-010 (Edycja fiszki):**
  - FlashcardModal w trybie "edit"
  - PUT /api/flashcards/{id}
  - Te same walidacje co przy tworzeniu
  - Refetch po zapisie

- ✅ **US-011 (Usunięcie fiszki):**
  - DeleteFlashcardDialog z potwierdzeniem
  - DELETE /api/flashcards/{id}
  - Hard delete
  - Obsługa 404

- ✅ **US-028 (Przegląd fiszek z AI):**
  - Badge indicator dla source (manual/ai-full/ai-edited)
  - Filtrowanie po source
  - Wszystkie fiszki widoczne w jednej liście
  - Przycisk "Generate New Flashcards" dla łatwego dostępu do generowania kolejnych fiszek

## Appendix B: Przykłady kodu kluczowych funkcji

### fetchFlashcards w useFlashcards:

```typescript
async function fetchFlashcards() {
  setIsLoading(true);
  setError(null);
  
  try {
    const query: ListFlashcardsQuery = {
      page: pagination.currentPage,
      limit: pagination.limit,
      sort: filters.sort,
      order: filters.order,
    };
    
    if (filters.source !== 'all') {
      query.source = filters.source;
    }
    
    const response = await FlashcardsApiService.list(query);
    
    setFlashcards(response.data);
    setPagination(prev => ({
      ...prev,
      total: response.pagination.total,
      totalPages: response.pagination.total_pages,
    }));
  } catch (error) {
    logError('fetchFlashcards', error);
    setError({
      code: 'FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to load flashcards',
    });
  } finally {
    setIsLoading(false);
  }
}
```

### submitModal w useFlashcards:

```typescript
async function submitModal(data: FlashcardFormData) {
  setModalState(prev => ({ ...prev, isSubmitting: true, error: null }));
  
  try {
    if (modalState.mode === 'add') {
      await FlashcardsApiService.create(data);
      toast.success('Flashcard created successfully');
    } else if (modalState.mode === 'edit' && modalState.flashcard) {
      await FlashcardsApiService.update(modalState.flashcard.id, data);
      toast.success('Flashcard updated successfully');
    }
    
    closeModal();
    await refetch();
  } catch (error) {
    logError('submitModal', error);
    setModalState(prev => ({
      ...prev,
      error: {
        code: 'SUBMIT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to save flashcard',
      },
    }));
  } finally {
    setModalState(prev => ({ ...prev, isSubmitting: false }));
  }
}
```

---

**Koniec planu implementacji**
