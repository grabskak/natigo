# E2E Testing with Page Object Model

Kompletna struktura testów E2E dla projektu Natigo z wykorzystaniem Page Object Model (POM).

---

## 📁 Struktura Projektu

```
e2e/
├── pages/                          # Page Object Models
│   ├── index.ts                   # ✅ Centralized exports
│   ├── auth.page.ts               # ✅ Authentication (11 selectors)
│   ├── generate.page.ts           # ✅ Generation form (4 selectors)
│   ├── candidates-review.page.ts  # ✅ Review flow (9 selectors)
│   └── flashcards.page.ts         # ✅ CRUD operations (15 selectors)
├── fixtures.ts                    # ✅ Test fixtures & data
├── helpers.ts                     # ✅ Utilities & helpers
├── critical-path.spec.ts          # ✅ Main E2E tests
├── POM-DOCUMENTATION.md           # 📖 Full POM docs
└── README.md                      # 📖 This file
```

**Status:** ✅ **Gotowe do pisania testów**

---

## 🚀 Quick Start

### **1. Install dependencies**
```bash
npm install
```

### **2. Start dev server**
```bash
npm run dev
# Serwer uruchomi się na http://localhost:3000
```

### **3. Run E2E tests**
```bash
# Run all tests
npm run test:e2e

# Run with UI (recommended for development)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Generate new tests with Codegen
npm run test:e2e:codegen
```

---

## 📚 Dostępne Page Objects

### **1. AuthPage** - Logowanie i rejestracja
```typescript
import { test } from './fixtures';

test('login test', async ({ authPage, testUser }) => {
  await authPage.login(testUser.email, testUser.password);
  await expect(authPage.page).toHaveURL('/flashcards');
});
```

### **2. GeneratePage** - Generowanie fiszek
```typescript
test('generate test', async ({ generatePage, longText }) => {
  await generatePage.goto();
  await generatePage.generate(longText);
  await generatePage.waitForGenerationComplete();
});
```

### **3. CandidatesReviewPage** - Przegląd kandydatów
```typescript
test('review test', async ({ candidatesReviewPage }) => {
  await candidatesReviewPage.acceptCandidate(1);
  await candidatesReviewPage.editCandidate(2, 'New', 'Content');
  await candidatesReviewPage.save();
});
```

### **4. FlashcardsPage** - CRUD fiszek
```typescript
test('CRUD test', async ({ flashcardsPage }) => {
  await flashcardsPage.goto();
  await flashcardsPage.addFlashcard('Q?', 'A!');
  await flashcardsPage.filterBySource('ai-full');
});
```

---

## 🎯 Przykładowy Test

```typescript
import { test, expect } from './fixtures';
import { waitForToast } from './helpers';

test('Complete flow', async ({
  authPage,
  generatePage,
  candidatesReviewPage,
  flashcardsPage,
  testUser,
  longText,
}) => {
  // 1. Login
  await authPage.login(testUser.email, testUser.password);
  
  // 2. Generate
  await flashcardsPage.goToGenerate();
  await generatePage.generate(longText);
  
  // 3. Review
  await candidatesReviewPage.acceptCandidate(1);
  await candidatesReviewPage.acceptCandidate(2);
  await candidatesReviewPage.save();
  
  // 4. Verify
  await expect(flashcardsPage.page).toHaveURL(/\/flashcards\?source=ai-full/);
  await waitForToast(flashcardsPage.page);
});
```

---

## 🔧 Configuration

### **Playwright Config** (`playwright.config.ts`)

```typescript
{
  testDir: "./e2e",
  baseURL: "http://localhost:3000",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } }
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  }
}
```

---

## 📖 Dokumentacja

### **Pełna dokumentacja POM:**
👉 [POM-DOCUMENTATION.md](./POM-DOCUMENTATION.md)

**Zawiera:**
- Szczegółowy opis każdej klasy POM
- Wszystkie dostępne metody
- Przykłady użycia
- Best practices
- Architektura i zasady projektowania

### **Lista selektorów data-testid:**
👉 [.ai/e2e-test-selectors.md](../.ai/e2e-test-selectors.md)

**Zawiera:**
- Mapowanie wszystkich 45+ selektorów
- Przykłady użycia w Playwright
- Konwencje nazewnictwa
- Kompletny scenariusz E2E

---

## 🛠️ Narzędzia i Utilities

### **Fixtures** (`fixtures.ts`)

Pre-configured page objects i dane testowe:
```typescript
import { test, expect } from './fixtures';

test('my test', async ({ 
  authPage,           // AuthPage instance
  generatePage,       // GeneratePage instance
  candidatesReviewPage, // CandidatesReviewPage instance
  flashcardsPage,     // FlashcardsPage instance
  testUser,           // Test user credentials
  longText,           // Valid text for generation (~1500 chars)
}) => {
  // Your test here
});
```

### **Helpers** (`helpers.ts`)

Funkcje pomocnicze:

#### **Toast notifications:**
```typescript
await waitForToast(page, 'success');
await waitForToastClose(page);
```

#### **Data extraction:**
```typescript
const id = await extractFlashcardId(cardLocator);
const params = await getSearchParams(page);
```

#### **Text generation:**
```typescript
const text = generateText(1500);
const email = generateTestEmail();
const password = generateTestPassword();
```

#### **Network:**
```typescript
await waitForNetworkIdle(page);
await mockApiResponse(page, '/api/flashcards', mockData);
await waitForApiCall(page, /\/api\/generations/);
```

#### **Auth:**
```typescript
await quickLogin(page, email, password);
await clearAuth(page);
```

---

## 🎨 Best Practices

### **1. Używaj fixtures zamiast new instances**
```typescript
// ✅ GOOD
test('my test', async ({ flashcardsPage }) => {
  await flashcardsPage.goto();
});

// ❌ BAD
test('my test', async ({ page }) => {
  const flashcardsPage = new FlashcardsPage(page);
  await flashcardsPage.goto();
});
```

### **2. Używaj data-testid selectors**
```typescript
// ✅ GOOD - używa testid z POM
await flashcardsPage.addButton.click();

// ❌ BAD - bezpośredni selektor
await page.click('button:has-text("Dodaj")');
```

### **3. Metody wysokiego poziomu**
```typescript
// ✅ GOOD - jedna metoda na flow
await authPage.login(email, password);

// ❌ BAD - niski poziom
await authPage.emailInput.fill(email);
await authPage.passwordInput.fill(password);
await authPage.submitButton.click();
```

### **4. Async/await konsekwentnie**
```typescript
// ✅ GOOD
const count = await flashcardsPage.getFlashcardCount();

// ❌ BAD
const count = flashcardsPage.getFlashcardCount(); // Missing await
```

### **5. Test isolation**
```typescript
// ✅ GOOD - cleanup after test
test.afterEach(async ({ page }) => {
  await clearAuth(page);
});

// Each test is independent
```

---

## 🐛 Debugging

### **1. Run with UI**
Najlepszy sposób na debugging:
```bash
npm run test:e2e:ui
```

### **2. Debug mode**
Step-by-step debugging:
```bash
npm run test:e2e:debug
```

### **3. Trace viewer**
Po failed test, otwórz trace:
```bash
npx playwright show-trace test-results/trace.zip
```

### **4. Screenshots**
Automatyczne screenshots przy błędach w `test-results/`

### **5. Codegen**
Generuj testy automatycznie:
```bash
npm run test:e2e:codegen
```

---

## 📊 Test Coverage

### **Aktualne pokrycie:**

| Obszar | Klasa POM | Selektory | Status |
|--------|-----------|-----------|--------|
| **Auth** | AuthPage | 11 | ✅ |
| **Generation** | GeneratePage | 4 | ✅ |
| **Review** | CandidatesReviewPage | 9 | ✅ |
| **CRUD** | FlashcardsPage | 15 | ✅ |
| **Helpers** | - | - | ✅ |
| **Fixtures** | - | - | ✅ |
| **TOTAL** | **4 klasy** | **39+** | ✅ |

---

## 🔄 Workflow

### **Development:**
1. Write tests locally
2. Run: `npm run test:e2e:ui`
3. Debug failures
4. Commit changes

### **CI/CD:**
```yaml
# .github/workflows/e2e.yml
- name: Install Playwright
  run: npx playwright install --with-deps
  
- name: Run E2E tests
  run: npm run test:e2e
  
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
```

---

## 🆘 Troubleshooting

### **Problem: Testy timeout**
```bash
# Zwiększ timeout w playwright.config.ts
timeout: 60000, // 60 sekund
```

### **Problem: Flaky tests**
```bash
# Dodaj retries w config
retries: 2,
```

### **Problem: Selektory nie działają**
1. Sprawdź czy komponent ma `data-testid`
2. Sprawdź czy POM używa prawidłowego selektora
3. Użyj Playwright Inspector: `npx playwright test --debug`

### **Problem: Auth nie działa**
1. Sprawdź czy Supabase local działa
2. Sprawdź zmienne środowiskowe
3. Sprawdź czy test user istnieje w bazie

---

## 📝 TODO

- [ ] Dodać testy accessibility (axe-core)
- [ ] Dodać testy visual regression
- [ ] Dodać testy performance
- [ ] Rozszerzyć coverage o edge cases
- [ ] Dodać testy cross-browser (Firefox, WebKit)
- [ ] Dodać testy mobile viewport
- [ ] Integracja z CI/CD

---

## 🤝 Contributing

### **Dodawanie nowego testu:**

1. Utwórz nowy plik: `e2e/my-feature.spec.ts`
2. Importuj fixtures: `import { test, expect } from './fixtures'`
3. Użyj existing POM lub stwórz nowy
4. Dodaj test:
```typescript
test('my feature', async ({ flashcardsPage }) => {
  // Your test
});
```
5. Run: `npm run test:e2e:ui`
6. Commit

### **Dodawanie nowego POM:**

1. Dodaj `data-testid` w komponencie React
2. Utwórz: `e2e/pages/my-feature.page.ts`
3. Zaimplementuj klasę POM
4. Export w `e2e/pages/index.ts`
5. Dodaj fixture w `e2e/fixtures.ts`
6. Zaktualizuj dokumentację
7. Napisz testy

---

## 📞 Support

**Pytania?** Sprawdź:
- [POM Documentation](./POM-DOCUMENTATION.md)
- [Selectors List](../.ai/e2e-test-selectors.md)
- [Playwright Docs](https://playwright.dev/)

---

**Zaktualizowano:** 2026-01-25  
**Wersja:** 1.0  
**Status:** ✅ Ready for Testing
