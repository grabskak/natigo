# E2E Test Selectors - Data TestID Mapping

Dokument zawiera mapowanie wszystkich dodanych selektorów `data-testid` do kluczowych komponentów w przepływie E2E testów.

---

## 1. AUTENTYKACJA (Auth Flow)

### **AuthForm** (`src/components/auth/AuthForm.tsx`)

| Selektor | Element | Opis |
|----------|---------|------|
| `auth-form` | `<form>` | Główny formularz auth (login/register) |
| `auth-email-input` | `<Input>` | Pole email |
| `auth-email-error` | `<p>` | Komunikat błędu walidacji email |
| `auth-password-input` | `<Input>` | Pole hasła |
| `auth-password-error` | `<p>` | Komunikat błędu walidacji hasła |
| `auth-confirm-password-input` | `<Input>` | Pole potwierdzenia hasła (tylko register) |
| `auth-confirm-password-error` | `<p>` | Komunikat błędu potwierdzenia hasła |
| `auth-form-error` | `<p>` | Ogólny komunikat błędu formularza |
| `auth-submit-button` | `<Button>` | Przycisk submit (Zaloguj się / Utwórz konto) |
| `auth-email-confirmation-message` | `<div>` | Komunikat po rejestracji (email confirmation) |
| `auth-go-to-login-link` | `<a>` | Link do strony logowania |
| `auth-change-email-button` | `<button>` | Przycisk zmiany emaila |

**Przykład użycia w Playwright:**
```typescript
await page.getByTestId('auth-email-input').fill('test@example.com');
await page.getByTestId('auth-password-input').fill('password123');
await page.getByTestId('auth-submit-button').click();
await expect(page.getByTestId('auth-form-error')).not.toBeVisible();
```

---

## 2. GENEROWANIE FISZEK (Generation Flow)

### **GenerateForm** (`src/components/GenerateForm.tsx`)

| Selektor | Element | Opis |
|----------|---------|------|
| `generate-form` | `<form>` | Główny formularz generowania |
| `generate-input-textarea` | `<Textarea>` | Pole tekstowe (1000-10000 znaków) |
| `generate-validation-error` | `<p>` | Komunikat błędu walidacji długości tekstu |
| `generate-submit-button` | `<Button>` | Przycisk "Generuj fiszki" |
| `generate-clear-button` | `<Button>` | Przycisk "Wyczyść" |

**Przykład użycia w Playwright:**
```typescript
const longText = 'a'.repeat(1500); // 1500 znaków
await page.getByTestId('generate-input-textarea').fill(longText);
await page.getByTestId('generate-submit-button').click();
await expect(page.getByTestId('generate-validation-error')).not.toBeVisible();
```

---

## 3. REVIEW KANDYDATÓW (Candidates Review)

### **CandidateCard** (`src/components/CandidateCard.tsx`)

| Selektor | Element | Opis |
|----------|---------|------|
| `candidate-card-{n}` | `<div>` | Kontener karty kandydata (n = sequence number) |
| `candidate-number-{n}` | `<span>` | Badge z numerem sekwencyjnym |
| `candidate-accept-button-{n}` | `<Button>` | Przycisk "Akceptuj" |
| `candidate-reject-button-{n}` | `<Button>` | Przycisk "Odrzuć" |
| `candidate-edit-button-{n}` | `<Button>` | Przycisk "Edytuj" |
| `candidate-save-edit-button-{n}` | `<Button>` | Przycisk "Zapisz edycję" (w trybie edycji) |
| `candidate-cancel-edit-button-{n}` | `<Button>` | Przycisk "Anuluj" (w trybie edycji) |
| `candidate-front-input-{n}` | `<input>` | Pole front (w trybie edycji) |
| `candidate-back-textarea-{n}` | `<Textarea>` | Pole back (w trybie edycji) |

**Przykład użycia w Playwright:**
```typescript
// Akceptuj pierwszą fiszkę
await page.getByTestId('candidate-accept-button-1').click();

// Edytuj drugą fiszkę
await page.getByTestId('candidate-edit-button-2').click();
await page.getByTestId('candidate-front-input-2').fill('Nowy przód');
await page.getByTestId('candidate-back-textarea-2').fill('Nowy tył');
await page.getByTestId('candidate-save-edit-button-2').click();

// Odrzuć trzecią fiszkę
await page.getByTestId('candidate-reject-button-3').click();
```

### **CandidatesReview** (`src/components/CandidatesReview.tsx`)

| Selektor | Element | Opis |
|----------|---------|------|
| `candidates-review-container` | `<div>` | Główny kontener review |
| `candidates-review-error` | `<div>` | Komunikat błędu (save error) |

### **SaveActionsBar** (`src/components/SaveActionsBar.tsx`)

| Selektor | Element | Opis |
|----------|---------|------|
| `save-actions-bar` | `<div>` | Sticky bottom bar |
| `save-actions-counter` | `<span>` | Licznik zaakceptowanych fiszek |
| `save-actions-cancel-button` | `<Button>` | Przycisk "Anuluj" |
| `save-actions-save-button` | `<Button>` | Przycisk "Zapisz" |

**Przykład użycia w Playwright:**
```typescript
// Sprawdź licznik
await expect(page.getByTestId('save-actions-counter')).toContainText('3 fiszki gotowe do zapisu');

// Zapisz
await page.getByTestId('save-actions-save-button').click();
await expect(page).toHaveURL(/\/flashcards\?source=ai-full/);
```

---

## 4. ZARZĄDZANIE FISZKAMI (Flashcards CRUD)

### **FlashcardsHeader** (`src/components/flashcards/FlashcardsHeader.tsx`)

| Selektor | Element | Opis |
|----------|---------|------|
| `flashcards-generate-button` | `<Button>` | Przycisk "Generuj nowe fiszki" |
| `flashcards-add-button` | `<Button>` | Przycisk "Dodaj fiszkę ręcznie" |

### **FlashcardsFilterBar** (`src/components/flashcards/FlashcardsFilterBar.tsx`)

| Selektor | Element | Opis |
|----------|---------|------|
| `flashcards-source-filter` | `<SelectTrigger>` | Filtr źródła (all/manual/ai-full/ai-edited) |
| `flashcards-sort-filter` | `<SelectTrigger>` | Filtr sortowania (created_at/updated_at) |
| `flashcards-order-filter` | `<SelectTrigger>` | Filtr kolejności (asc/desc) |

**Przykład użycia w Playwright:**
```typescript
// Filtruj po źródle
await page.getByTestId('flashcards-source-filter').click();
await page.getByRole('option', { name: 'Wygenerowane przez AI' }).click();

// Sortuj po dacie aktualizacji
await page.getByTestId('flashcards-sort-filter').click();
await page.getByRole('option', { name: 'Data aktualizacji' }).click();
```

### **FlashcardCard** (`src/components/flashcards/FlashcardCard.tsx`)

| Selektor | Element | Opis |
|----------|---------|------|
| `flashcard-card-{id}` | `<Card>` | Kontener karty fiszki (id = flashcard.id UUID) |
| `flashcard-menu-button-{id}` | `<Button>` | Przycisk menu (⋮) |
| `flashcard-edit-menu-item-{id}` | `<DropdownMenuItem>` | Opcja "Edytuj" w menu |
| `flashcard-delete-menu-item-{id}` | `<DropdownMenuItem>` | Opcja "Usuń" w menu |

**Przykład użycia w Playwright:**
```typescript
const flashcardId = 'some-uuid-here';

// Otwórz menu
await page.getByTestId(`flashcard-menu-button-${flashcardId}`).click();

// Edytuj
await page.getByTestId(`flashcard-edit-menu-item-${flashcardId}`).click();

// Lub usuń
await page.getByTestId(`flashcard-delete-menu-item-${flashcardId}`).click();
```

### **FlashcardModal** (`src/components/flashcards/FlashcardModal.tsx`)

| Selektor | Element | Opis |
|----------|---------|------|
| `flashcard-modal` | `<DialogContent>` | Kontener modala |
| `flashcard-modal-front-input` | `<Input>` | Pole front (przód fiszki) |
| `flashcard-modal-back-textarea` | `<Textarea>` | Pole back (tył fiszki) |
| `flashcard-modal-error` | `<div>` | Komunikat błędu API |
| `flashcard-modal-cancel-button` | `<Button>` | Przycisk "Anuluj" |
| `flashcard-modal-submit-button` | `<Button>` | Przycisk "Zapisz" |

**Przykład użycia w Playwright:**
```typescript
// Dodaj nową fiszkę
await page.getByTestId('flashcards-add-button').click();
await page.getByTestId('flashcard-modal-front-input').fill('Pytanie?');
await page.getByTestId('flashcard-modal-back-textarea').fill('Odpowiedź!');
await page.getByTestId('flashcard-modal-submit-button').click();

// Sprawdź czy modal się zamknął
await expect(page.getByTestId('flashcard-modal')).not.toBeVisible();
```

### **DeleteFlashcardDialog** (`src/components/flashcards/DeleteFlashcardDialog.tsx`)

| Selektor | Element | Opis |
|----------|---------|------|
| `delete-flashcard-dialog` | `<AlertDialogContent>` | Kontener dialogu usuwania |
| `delete-flashcard-cancel-button` | `<AlertDialogCancel>` | Przycisk "Anuluj" |
| `delete-flashcard-confirm-button` | `<AlertDialogAction>` | Przycisk "Usuń" (destructive) |

**Przykład użycia w Playwright:**
```typescript
const flashcardId = 'some-uuid-here';

// Otwórz menu i kliknij usuń
await page.getByTestId(`flashcard-menu-button-${flashcardId}`).click();
await page.getByTestId(`flashcard-delete-menu-item-${flashcardId}`).click();

// Potwierdź usunięcie
await expect(page.getByTestId('delete-flashcard-dialog')).toBeVisible();
await page.getByTestId('delete-flashcard-confirm-button').click();

// Sprawdź czy dialog się zamknął
await expect(page.getByTestId('delete-flashcard-dialog')).not.toBeVisible();
```

---

## 5. KOMPLETNY SCENARIUSZ E2E

```typescript
test('Pełny flow: Auth → Generate → Review → Save → CRUD', async ({ page }) => {
  // 1. LOGIN
  await page.goto('/login');
  await page.getByTestId('auth-email-input').fill('test@example.com');
  await page.getByTestId('auth-password-input').fill('password123');
  await page.getByTestId('auth-submit-button').click();
  await expect(page).toHaveURL('/flashcards');

  // 2. NAVIGATE TO GENERATE
  await page.getByTestId('flashcards-generate-button').click();
  await expect(page).toHaveURL('/generations');

  // 3. GENERATE FLASHCARDS
  const longText = 'Lorem ipsum '.repeat(150); // ~1500 znaków
  await page.getByTestId('generate-input-textarea').fill(longText);
  await page.getByTestId('generate-submit-button').click();

  // 4. REVIEW CANDIDATES
  await expect(page.getByTestId('candidates-review-container')).toBeVisible();
  await page.getByTestId('candidate-accept-button-1').click();
  await page.getByTestId('candidate-accept-button-2').click();
  
  // Edit third candidate
  await page.getByTestId('candidate-edit-button-3').click();
  await page.getByTestId('candidate-front-input-3').fill('Edited front');
  await page.getByTestId('candidate-save-edit-button-3').click();

  // 5. SAVE FLASHCARDS
  await expect(page.getByTestId('save-actions-counter')).toContainText('3 fiszki');
  await page.getByTestId('save-actions-save-button').click();
  await expect(page).toHaveURL(/\/flashcards\?source=ai-full/);

  // 6. VERIFY FLASHCARDS LIST
  await expect(page.getByTestId('flashcards-source-filter')).toHaveValue('ai-full');
  
  // 7. CRUD - ADD MANUAL FLASHCARD
  await page.getByTestId('flashcards-add-button').click();
  await page.getByTestId('flashcard-modal-front-input').fill('Manual front');
  await page.getByTestId('flashcard-modal-back-textarea').fill('Manual back');
  await page.getByTestId('flashcard-modal-submit-button').click();

  // 8. CRUD - EDIT FLASHCARD
  const firstCard = page.locator('[data-testid^="flashcard-card-"]').first();
  const cardId = await firstCard.getAttribute('data-testid').then(id => id.replace('flashcard-card-', ''));
  
  await page.getByTestId(`flashcard-menu-button-${cardId}`).click();
  await page.getByTestId(`flashcard-edit-menu-item-${cardId}`).click();
  await page.getByTestId('flashcard-modal-front-input').clear();
  await page.getByTestId('flashcard-modal-front-input').fill('Updated front');
  await page.getByTestId('flashcard-modal-submit-button').click();

  // 9. CRUD - DELETE FLASHCARD
  await page.getByTestId(`flashcard-menu-button-${cardId}`).click();
  await page.getByTestId(`flashcard-delete-menu-item-${cardId}`).click();
  await page.getByTestId('delete-flashcard-confirm-button').click();
  
  // Verify deletion
  await expect(page.getByTestId(`flashcard-card-${cardId}`)).not.toBeVisible();
});
```

---

## 6. KONWENCJE NAZEWNICTWA

### **Zasady:**

1. **Kebab-case** - wszystkie selektory w formacie kebab-case
2. **Prefiks komponentu** - nazwa komponentu na początku (np. `auth-`, `generate-`, `candidate-`)
3. **Dynamiczne ID** - dla list używamy `{id}` lub `{n}` (sequence number)
4. **Sufiks typu** - typ elementu na końcu (np. `-button`, `-input`, `-error`)

### **Przykłady:**

✅ **DOBRE:**
- `auth-email-input`
- `candidate-accept-button-1`
- `flashcard-card-{uuid}`
- `save-actions-counter`

❌ **ZŁE:**
- `emailInput` (camelCase)
- `auth_email` (snake_case)
- `button-accept` (odwrócona kolejność)
- `flashcard-{uuid}-card` (ID w środku)

---

## 7. UWAGI DOTYCZĄCE TESTOWANIA

### **Stabilność selektorów:**

✅ **data-testid** - najbardziej stabilne, nie zmieniają się przez style
- Używaj zawsze `data-testid` jako głównego selektora
- Fallback na `role` + `name` tylko gdy brak testid

❌ **class names** - niestabilne, zmieniają się przez Tailwind
❌ **text content** - niestabilne, zmienia się przez tłumaczenia

### **Accessibility:**

Wszystkie interaktywne elementy mają:
- `aria-invalid` dla błędów walidacji
- `aria-describedby` dla komunikatów pomocniczych
- `role="alert"` dla komunikatów błędów
- Odpowiednie `<label>` dla inputów

### **Dynamiczne wartości:**

Przy testowaniu list/kart z UUID:
```typescript
// Pobierz pierwszy element i wyciągnij ID
const firstCard = page.locator('[data-testid^="flashcard-card-"]').first();
const cardId = await firstCard.getAttribute('data-testid')
  .then(id => id?.replace('flashcard-card-', ''));
```

---

**Dokument zaktualizowany:** 2026-01-25  
**Liczba dodanych selektorów:** 45  
**Status:** Gotowe do testów E2E
