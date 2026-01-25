# Page Object Model (POM) - Documentation

Dokumentacja architektury Page Object Model dla testów E2E w projekcie Natigo.

---

## 📁 Struktura Katalogów

```
e2e/
├── pages/                      # Page Object Models
│   ├── index.ts               # Centralized exports
│   ├── auth.page.ts           # Authentication (login/register)
│   ├── generate.page.ts       # Generation flow
│   ├── candidates-review.page.ts  # Candidates review
│   ├── flashcards.page.ts     # Flashcards CRUD
│   ├── login.page.ts          # Legacy login (backward compat)
│   └── home.page.ts           # Legacy home (backward compat)
├── fixtures.ts                # Test fixtures
├── helpers.ts                 # Test utilities
└── *.spec.ts                  # Test files
```

---

## 🏗️ Architektura POM

### **Zasady projektowania:**

1. **Jedna klasa = jedna strona/komponent**
2. **Enkapsulacja lokatorów** - wszystkie selektory w konstruktorze
3. **Metody wysokiego poziomu** - odzwierciedlają akcje użytkownika
4. **Async/await** - wszystkie metody interakcji są async
5. **TypeScript** - pełne typowanie dla bezpieczeństwa

### **Hierarchia klas:**

```typescript
BasePage (implicit via Playwright Page)
  ├── AuthPage
  ├── GeneratePage
  ├── CandidatesReviewPage
  │   └── CandidateCard (helper class)
  └── FlashcardsPage
      ├── FlashcardCard (helper class)
      ├── FlashcardModal (helper class)
      └── DeleteFlashcardDialog (helper class)
```

---

## 📄 Szczegóły Klas POM

### **1. AuthPage** (`auth.page.ts`)

**Odpowiedzialność:** Logowanie, rejestracja, email confirmation

**Główne metody:**
- `gotoLogin()` - nawigacja do /login
- `gotoRegister()` - nawigacja do /register
- `login(email, password)` - kompletny flow logowania
- `register(email, password, confirmPassword?)` - kompletny flow rejestracji
- `hasEmailError()`, `hasFormError()` - sprawdzanie błędów
- `goToResetPassword()` - nawigacja do reset password

**Przykład użycia:**
```typescript
import { test, expect } from './fixtures';

test('user can login', async ({ authPage }) => {
  await authPage.login('test@example.com', 'password123');
  await expect(authPage.page).toHaveURL('/flashcards');
});
```

---

### **2. GeneratePage** (`generate.page.ts`)

**Odpowiedzialność:** Formularz generowania fiszek

**Główne metody:**
- `goto()` - nawigacja do /generations
- `fillText(text)` - wypełnienie textarea
- `generate(text)` - kompletny flow generowania
- `clearText()` - wyczyszczenie formularza
- `hasValidationError()` - sprawdzenie błędów walidacji
- `isLoading()` - sprawdzenie stanu ładowania
- `waitForGenerationComplete()` - czekanie na zakończenie generowania

**Przykład użycia:**
```typescript
test('generate flashcards with valid text', async ({ generatePage, longText }) => {
  await generatePage.goto();
  await generatePage.generate(longText);
  await generatePage.waitForGenerationComplete();
});
```

---

### **3. CandidatesReviewPage** (`candidates-review.page.ts`)

**Odpowiedzialność:** Przegląd i zarządzanie kandydatami

**Główne metody:**
- `getCandidateCard(n)` - pobranie karty kandydata (zwraca `CandidateCard`)
- `acceptCandidate(n)` - akceptacja kandydata
- `rejectCandidate(n)` - odrzucenie kandydata
- `editCandidate(n, front, back)` - edycja kandydata
- `save()` - zapisanie zaakceptowanych fiszek
- `cancel()` - anulowanie i powrót do formularza
- `isSaveDisabled()` - sprawdzenie stanu przycisku Save

**Helper class: CandidateCard:**
- `accept()`, `reject()`, `startEdit()`, `saveEdit()`, `cancelEdit()`
- `fillEditForm(front, back)`
- `getStatus()` - pobranie statusu (pending/accepted/edited/rejected)

**Przykład użycia:**
```typescript
test('review and save candidates', async ({ candidatesReviewPage }) => {
  await candidatesReviewPage.waitForReview();
  
  // Accept first two candidates
  await candidatesReviewPage.acceptCandidate(1);
  await candidatesReviewPage.acceptCandidate(2);
  
  // Edit third candidate
  await candidatesReviewPage.editCandidate(3, 'New front', 'New back');
  
  // Save
  await candidatesReviewPage.save();
});
```

---

### **4. FlashcardsPage** (`flashcards.page.ts`)

**Odpowiedzialność:** Lista fiszek, filtry, CRUD

**Główne metody:**
- `goto()` - nawigacja do /flashcards
- `goToGenerate()` - przejście do generowania
- `openAddModal()` - otwarcie modala dodawania
- `filterBySource(source)` - filtrowanie po źródle
- `filterBySort(sort)` - sortowanie
- `filterByOrder(order)` - kolejność
- `getFlashcardCard(id)` - pobranie karty fiszki (zwraca `FlashcardCard`)
- `addFlashcard(front, back)` - dodanie fiszki przez modal

**Helper classes:**

**FlashcardCard:**
- `openMenu()`, `clickEdit()`, `clickDelete()`
- `isVisible()`, `getContent()` - pobranie zawartości

**FlashcardModal:**
- `fill(front, back)`, `submit()`, `cancel()`
- `isVisible()`, `hasError()`, `waitForClose()`

**DeleteFlashcardDialog:**
- `confirm()`, `cancel()`
- `isVisible()`, `waitForClose()`

**Przykład użycia:**
```typescript
test('CRUD operations', async ({ flashcardsPage }) => {
  await flashcardsPage.goto();
  
  // Add flashcard
  await flashcardsPage.addFlashcard('Question?', 'Answer!');
  
  // Get first card and edit
  const firstCard = await flashcardsPage.getFirstFlashcardCard();
  const cardId = await extractFlashcardId(firstCard);
  const card = flashcardsPage.getFlashcardCard(cardId);
  
  await card.clickEdit();
  await flashcardsPage.modal.fill('Updated', 'Content');
  await flashcardsPage.modal.submit();
  
  // Delete
  await card.clickDelete();
  await flashcardsPage.deleteDialog.confirm();
});
```

---

## 🔧 Fixtures (`fixtures.ts`)

Fixtures zapewniają pre-configured page objects i dane testowe.

**Dostępne fixtures:**
- `authPage` - instancja AuthPage
- `generatePage` - instancja GeneratePage
- `candidatesReviewPage` - instancja CandidatesReviewPage
- `flashcardsPage` - instancja FlashcardsPage
- `testUser` - użytkownik testowy (email + password)
- `longText` - tekst do generowania (~1500 znaków)

**Użycie:**
```typescript
import { test, expect } from './fixtures';

test('my test', async ({ authPage, testUser, longText }) => {
  await authPage.login(testUser.email, testUser.password);
  // fixtures są automatycznie dostępne
});
```

---

## 🛠️ Helpers (`helpers.ts`)

Utilities i funkcje pomocnicze.

**Kategorie:**

### **Toast notifications:**
- `waitForToast(page, message?)` - czekanie na toast
- `waitForToastClose(page)` - czekanie na zamknięcie

### **Data extraction:**
- `extractFlashcardId(cardLocator)` - wyciąganie UUID z karty
- `getSearchParams(page)` - pobranie query params jako obiekt

### **Text generation:**
- `generateText(charCount, pattern?)` - generowanie tekstu o określonej długości
- `generateTestEmail()` - losowy email testowy
- `generateTestPassword(length?)` - losowe hasło

### **Network:**
- `waitForNetworkIdle(page, timeout?)` - czekanie na sieć
- `mockApiResponse(page, url, response, status?)` - mockowanie API
- `waitForApiCall(page, url, timeout?)` - czekanie na wywołanie API

### **Auth helpers:**
- `quickLogin(page, email, password)` - szybkie logowanie bez POM
- `clearAuth(page)` - czyszczenie cookies i localStorage

### **Viewport:**
- `isInViewport(page, locator)` - sprawdzenie czy element w viewport
- `scrollIntoView(locator)` - scroll do elementu
- `getBoundingBox(locator)` - pobranie wymiarów elementu

### **Debugging:**
- `takeTimestampedScreenshot(page, name)` - screenshot z timestamp

---

## 📋 Przykładowy Pełny Test

```typescript
import { test, expect } from './fixtures';
import { waitForToast, extractFlashcardId } from './helpers';

test.describe('Complete E2E Flow', () => {
  test('Auth → Generate → Review → Save → CRUD', async ({
    authPage,
    generatePage,
    candidatesReviewPage,
    flashcardsPage,
    testUser,
    longText,
  }) => {
    // 1. LOGIN
    await authPage.login(testUser.email, testUser.password);
    await expect(authPage.page).toHaveURL('/flashcards');
    
    // 2. NAVIGATE TO GENERATE
    await flashcardsPage.goToGenerate();
    await expect(generatePage.page).toHaveURL('/generations');
    
    // 3. GENERATE FLASHCARDS
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();
    
    // 4. REVIEW CANDIDATES
    await candidatesReviewPage.waitForReview();
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.acceptCandidate(2);
    await candidatesReviewPage.editCandidate(3, 'Edited front', 'Edited back');
    
    // 5. SAVE FLASHCARDS
    const counterText = await candidatesReviewPage.getSaveCounterText();
    expect(counterText).toContain('3 fiszki');
    
    await candidatesReviewPage.save();
    await waitForToast(candidatesReviewPage.page, 'zapisano');
    
    // 6. VERIFY REDIRECT AND FILTER
    await expect(flashcardsPage.page).toHaveURL(/\/flashcards\?source=ai-full/);
    
    // 7. CRUD - ADD MANUAL FLASHCARD
    await flashcardsPage.addFlashcard('Manual front', 'Manual back');
    await flashcardsPage.modal.waitForClose();
    
    // 8. CRUD - EDIT FLASHCARD
    const firstCard = flashcardsPage.getFirstFlashcardCard();
    const cardId = await extractFlashcardId(firstCard);
    const card = flashcardsPage.getFlashcardCard(cardId);
    
    await card.clickEdit();
    await flashcardsPage.modal.fill('Updated front', 'Updated back');
    await flashcardsPage.modal.submit();
    
    // 9. CRUD - DELETE FLASHCARD
    await card.clickDelete();
    await flashcardsPage.deleteDialog.confirm();
    await flashcardsPage.deleteDialog.waitForClose();
    
    // Verify deletion
    await expect(card.card).not.toBeVisible();
  });
});
```

---

## 🎯 Best Practices

### **1. Używaj data-testid jako głównego selektora**
```typescript
// ✅ GOOD
this.emailInput = page.getByTestId("auth-email-input");

// ❌ BAD
this.emailInput = page.locator("input[type='email']");
```

### **2. Metody wysokiego poziomu**
```typescript
// ✅ GOOD - jedna metoda dla całego flow
async login(email: string, password: string) {
  await this.gotoLogin();
  await this.fillLoginCredentials(email, password);
  await this.submit();
}

// ❌ BAD - niski poziom abstrakcji w testach
test('login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]');
});
```

### **3. Async/await konsekwentnie**
```typescript
// ✅ GOOD
async isVisible(): Promise<boolean> {
  return await this.card.isVisible();
}

// ❌ BAD
isVisible() {
  return this.card.isVisible(); // brak async/await
}
```

### **4. Sprawdzaj stan przed akcją**
```typescript
// ✅ GOOD
async submit() {
  await expect(this.submitButton).toBeEnabled();
  await this.submitButton.click();
}
```

### **5. Używaj fixtures zamiast setup w każdym teście**
```typescript
// ✅ GOOD
test('my test', async ({ authPage, testUser }) => {
  await authPage.login(testUser.email, testUser.password);
});

// ❌ BAD
test('my test', async ({ page }) => {
  const authPage = new AuthPage(page);
  await authPage.login('test@example.com', 'password123');
});
```

---

## 🔄 Aktualizacja POM

### **Gdy dodajesz nowy element UI:**

1. Dodaj `data-testid` w komponencie React/Astro
2. Dodaj locator w odpowiedniej klasie POM:
```typescript
readonly newElement: Locator;

constructor(page: Page) {
  // ...
  this.newElement = page.getByTestId("new-element-testid");
}
```
3. Dodaj metodę interakcji (jeśli potrzebna):
```typescript
async clickNewElement() {
  await this.newElement.click();
}
```
4. Zaktualizuj dokumentację w tym pliku

### **Gdy zmieniasz istniejący element:**

1. Zaktualizuj `data-testid` w komponencie
2. Zaktualizuj locator w POM
3. Uruchom testy: `npm run test:e2e`
4. Napraw failing tests jeśli zachowanie się zmieniło

---

## 📊 Pokrycie POM

### **Obecne pokrycie:**

| Strona/Komponent | Klasa POM | Status | Selektory |
|------------------|-----------|--------|-----------|
| Login/Register | `AuthPage` | ✅ | 11 |
| Generations Form | `GeneratePage` | ✅ | 4 |
| Candidates Review | `CandidatesReviewPage` | ✅ | 9 |
| Flashcards List | `FlashcardsPage` | ✅ | 15 |
| **TOTAL** | **4 główne klasy** | ✅ | **39+** |

---

## 🚀 Uruchamianie Testów

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Generate tests with Codegen
npm run test:e2e:codegen
```

---

**Dokument zaktualizowany:** 2026-01-25  
**Wersja:** 1.0  
**Status:** Gotowe do pisania testów
