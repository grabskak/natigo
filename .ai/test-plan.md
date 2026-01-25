
1. Wprowadzenie i cele testowania
Celem testów jest potwierdzenie jakości i bezpieczeństwa aplikacji Natigo (Astro 5 + React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui), która umożliwia:
rejestrację i logowanie użytkownika (Supabase Auth),
generowanie kandydatów fiszek przez AI (OpenRouter),
przegląd/edycję/odrzucanie kandydatów,
zapis zaakceptowanych fiszek do bazy (Supabase Postgres + RLS),
zarządzanie fiszkami (lista, filtrowanie, paginacja, dodawanie manualne, edycja, usuwanie).
Cele szczegółowe:
potwierdzić poprawność przepływów krytycznych: Auth → Generowanie → Review → Zapis → Zarządzanie fiszkami,
zweryfikować spójność kontraktów API (kody błędów, walidacje Zod, statusy HTTP),
potwierdzić izolację danych użytkowników (RLS + weryfikacja ownership),
potwierdzić odporność na błędy usług zewnętrznych (OpenRouter) i sytuacje brzegowe,
potwierdzić dostępność (a11y), podstawową wydajność i stabilność UI.
2. Zakres testów
W zakresie (In-scope):
Middleware (src/middleware/index.ts): ochrona /api/* (z wyjątkiem /api/auth/*), ochrona stron /generations, /flashcards, polityka dla niepotwierdzonych kont (wymuszanie email confirmation), obsługa next.
API (Astro server endpoints):
Auth: POST /api/auth/login, POST /api/auth/register, POST /api/auth/reset-password, POST /api/auth/update-password, POST /api/auth/logout.
Generacje: POST /api/generations.
Fiszki: GET /api/flashcards, POST /api/flashcards, PUT /api/flashcards/:id, DELETE /api/flashcards/:id.
Warstwa usług (src/lib/services/*): generowanie, walidacja kandydatów, rate limit, logowanie błędów, CRUD fiszek, weryfikacja ownership generacji, hash tekstu.
Baza i RLS (supabase/migrations/*): tabele generations, flashcards, generation_error_logs, constraints, indeksy.
UI (Astro + React):
Strony: src/pages/index.astro, src/pages/generations.astro, src/pages/flashcards.astro, src/pages/login.astro, src/pages/register.astro, src/pages/reset-password.astro, src/pages/reset-password/confirm.astro, src/pages/auth/callback.astro.
Komponenty generowania: GenerateScreenContainer, GenerateForm, CandidatesReview, CandidateCard, SaveActionsBar, ErrorDisplay, LoadingState.
Komponenty zarządzania fiszkami: FlashcardsView + modal/dialoги + filtry/paginacja.
Hooki: useGenerateFlashcards, useSaveFlashcards, useFlashcards, useDecisions.
Poza zakresem (Out-of-scope) / tylko smoke:
integracja SRS/study sessions (w README wskazana jako cel, ale nie jest widoczna jako kompletna funkcja w aktualnym kodzie),
strona users.astro (obecnie pusta) – tylko test “nie psuje routingu”.
3. Typy testów do przeprowadzenia

3.1. Testy statyczne
lint/format: ESLint + Prettier (już w repo).
TypeScript: kompilacja TS (tsc --noEmit w CI; realizowane też przez build Astro).
Dependency security: Snyk + npm audit w CI pipeline.

3.2. Testy jednostkowe (Unit)
Framework: Vitest + @testing-library/react + @testing-library/user-event.
Zakres:
- logika bez IO: safe-next, walidacje pomocnicze, mapowanie błędów,
- logika decyzji kandydatów (useDecisions),
- walidacja biznesowa fiszek (validateFlashcardCommand),
- pure functions: formatery, parsery, utility functions.
Mockowanie: MSW dla HTTP, vi.mock dla modułów wewnętrznych.

3.3. Testy komponentów (Component)
Framework: Vitest + @vitest/browser (dla złożonych komponentów z Astro islands).
Zakres:
- komponenty React z logiką: GenerateForm, CandidatesReview, FlashcardsView,
- hooki niestandardowe: useGenerateFlashcards, useSaveFlashcards, useFlashcards, useDecisions,
- interakcje użytkownika: formularze, dialogi, modale, filtry,
- edge cases: loading states, error states, empty states.
Mockowanie: MSW dla API calls, mock danych testowych z @faker-js/faker.

3.4. Testy integracyjne (API + services)
Framework: Vitest + Playwright API Testing.
Zakres:
- Astro API endpoints: auth, generations, flashcards,
- warstwa services (src/lib/services/*): generation.service.ts, flashcard.service.ts,
- integracja z Supabase local (prawdziwe zapytania do bazy),
- weryfikacja: walidacje Zod, statusy HTTP, kody błędów, struktura ErrorResponse,
- logowanie błędów: generation_error_logs, message truncation.
Środowisko: Supabase local CLI + seed data + env variables.

3.5. Testy kontraktowe API (Contract)
Framework: Vitest + zod-to-json-schema.
Zakres:
- zgodność payloadów/DTO z src/types.ts (GenerateFlashcardsResponse, CreateFlashcardsResponse, PaginatedFlashcardsResponse),
- snapshot testing schematów Zod (wykrywanie nieintencjonalnych zmian w API),
- opcjonalnie: generowanie dokumentacji OpenAPI z @anatine/zod-openapi.
Podejście: Zod schemas jako single source of truth.

3.6. Testy E2E (end-to-end)
Framework: Playwright Test Runner.
Zakres:
- kluczowe ścieżki użytkownika: Auth → Generowanie → Review → Save → Lista fiszek → CRUD,
- krytyczne scenariusze: rejestracja, email confirmation, login, reset hasła, logout,
- edge cases: ostatnia fiszka na stronie, filtry + paginacja, błędy API w UI,
- cross-browser: smoke tests w Chromium, Firefox, WebKit.
Features: traces, screenshots on failure, video recording, parallelizacja.

3.7. Testy bezpieczeństwa (Security)
Framework: Playwright + manualne audyty.
Zakres:
- RLS / izolacja danych: użytkownik A ↔ B (flashcards, generations, error_logs),
- open redirect: safe-next validation (brak //, ://, \, ścieżki muszą zaczynać się od /),
- CSRF protection: cookie settings (httpOnly, secure, sameSite),
- non-disclosure: enumeracja kont (login, reset-password zwracają neutralne komunikaty),
- dependency vulnerabilities: Snyk + npm audit w CI,
- opcjonalnie: OWASP ZAP dla penetration testing.

3.8. Testy dostępności (A11y)
Framework: @axe-core/playwright + Lighthouse CI + manual testing.
Zakres:
- formularze: label, aria-invalid, aria-describedby, role="alert" dla błędów,
- dialogi/modale (shadcn/Radix): focus trap, ESC closing, focus return,
- nawigacja klawiaturowa: wszystkie interaktywne elementy dostępne przez Tab,
- kontrast: WCAG AA w light i dark mode,
- screen readers: podstawowa weryfikacja z NVDA/VoiceOver.

3.9. Testy wizualne (Visual Regression)
Framework: Playwright Visual Comparisons (MVP) → Chromatic (scale).
Zakres:
- kluczowe ekrany: /generations, /flashcards, dialogi, error states,
- responsywność: desktop, tablet, mobile breakpoints,
- dark mode: porównanie light vs dark theme.
Podejście:
- Faza 1 (MVP): Playwright screenshots + manual review,
- Faza 2 (scale): Chromatic dla automatycznej detekcji zmian wizualnych.

3.10. Testy wydajnościowe (Performance)
Framework: Artillery (load testing) + Lighthouse CI (frontend metrics).
Zakres:
- API: czas odpowiedzi endpointów (<200ms dla GET, <500ms dla POST),
- load testing: symulacja 10-100 równoczesnych użytkowników (Artillery),
- UI responsywność: TTFB, FCP, LCP, TTI (Lighthouse),
- odporność na błędy zewnętrzne: timeouts OpenRouter, rate limits, retry logic.
Performance budgets: ustalić w Lighthouse CI (np. LCP < 2.5s, FID < 100ms).

3.11. Testy mutacyjne (Mutation Testing) - opcjonalnie
Framework: Stryker Mutator + Vitest runner.
Zakres: krytyczna logika biznesowa (auth, RLS verification, payment logic w przyszłości).
Uwaga: NIE dla MVP; rozważyć w fazie production-ready gdy kod stabilny i pokryty testami.

3.12. Testy dymne (Smoke Tests)
Framework: Playwright (podzbiór E2E).
Zakres: szybkie testy krytycznych funkcji (login, generowanie, lista fiszek) po każdym deploy.
Środowisko: staging + production (nieinwazyjne, bez masowego generowania AI).
Częstotliwość: na każdy merge do main, przed release do production.

4. Scenariusze testowe dla kluczowych funkcjonalności

4.1. Middleware / autoryzacja routingu (SSR)
Ochrona stron
wejście na /generations bez sesji → redirect do /login?next=....
wejście na /flashcards bez sesji → redirect do /login?next=....
wejście na /login lub /register z aktywną sesją → redirect do /generations.
Ochrona API
request na /api/flashcards bez sesji → 401 { error: { code: "AUTH_REQUIRED" } }.
request na /api/generations bez sesji → 401 AUTH_REQUIRED.
request na /api/auth/* bez sesji → brak blokady przez middleware.
Niepotwierdzony email
sesja istnieje, ale email_confirmed_at/confirmed_at puste → middleware wylogowuje (best-effort), czyści cookies, traktuje jako brak usera.
brak pętli przekierowań (szczególnie /login i /register).
Public assets
request do /_astro/*, .css, .js, .map, obrazki → nie wywołuje logiki auth/redirect.

4.2. Auth API (Supabase Auth)
POST /api/auth/register
poprawne dane → 200 oraz { requiresEmailConfirmation: true/false }.
email już istnieje → 409 EMAIL_ALREADY_IN_USE.
walidacja: email niepoprawny, hasło < 8, brak confirm, różne hasła → 400 VALIDATION_FAILED.
SITE_URL źle skonfigurowany → 500 INTERNAL_SERVER_ERROR.
przypadek “session mimo braku potwierdzenia” → endpoint wymusza signOut; potwierdzić brak zalogowania po rejestracji.
POST /api/auth/login
poprawne dane → 200 (user).
błędne dane → 401 INVALID_CREDENTIALS (neutralne).
invalid JSON → 400 VALIDATION_FAILED.
POST /api/auth/reset-password
poprawny email → zawsze 200 (non-disclosure), niezależnie czy konto istnieje.
invalid email / invalid JSON → 400 VALIDATION_FAILED.
SITE_URL źle skonfigurowany → 500.
POST /api/auth/update-password
poprawne hasło + confirm → 200.
link nieważny/expired (brak sesji reset) → 401 AUTH_REQUIRED z odpowiednim komunikatem.
hasło < 8 / mismatch → 400 VALIDATION_FAILED.
POST /api/auth/logout
poprawne wylogowanie → 204.
błąd supabase signOut → 500 INTERNAL_SERVER_ERROR.

4.3. Generowanie fiszek (AI) – API + services
POST /api/generations
happy path: input 1000–10000 znaków → 201, zwraca generation_id, candidates[], metadata.
invalid JSON body → 422 VALIDATION_FAILED (zgodnie z implementacją).
walidacja: <1000 lub >10000 → 400 VALIDATION_FAILED z details.{min,max,length,field}.
rate limit: >10 generacji/1h → 429 RATE_LIMIT_EXCEEDED + retry_after_seconds.
timeout OpenRouter → 504 AI_TIMEOUT.
błędy OpenRouter (401/402/429/5xx) → mapowanie na AI_SERVICE_ERROR (500) lub timeout (504); potwierdzić poprawne kody i brak wycieku danych w komunikatach.
Warstwa generation.service.ts
tworzy rekord generations z hash’em tekstu (bez zapisu surowego inputu).
validateFlashcardCandidates filtruje kandydatów spoza limitów (front 1–200, back 1–500).
jeśli po filtracji 0 kandydatów → błąd AI_SERVICE_ERROR + zapis do generation_error_logs.
logowanie błędów zawsze ogranicza message do 1000 znaków.

4.4. Zapis fiszek (review → save) – API + UI
POST /api/flashcards (bulk)
body nie jest tablicą → 400 VALIDATION_FAILED.
body = [] → 400 VALIDATION_FAILED.
>100 elementów → 400 VALIDATION_FAILED.
walidacja każdego elementu: front/back długość, source enum, generation_id uuid/null.
walidacja biznesowa:
source=manual + generation_id!=null → 422 VALIDATION_FAILED (biznes).
source=ai-full/ai-edited + generation_id==null → 422 VALIDATION_FAILED (biznes).
ownership generacji:
generation_id nie należy do usera → 403 FORBIDDEN + details.generation_id.
sukces → 201 created_count oraz flashcards[].
UI: CandidatesReview
brak zaakceptowanych/edytowanych → lokalny błąd NO_FLASHCARDS i brak requestu.
accept/edit/reject wpływa na licznik i stan przycisku “Save”.
cancel z potwierdzeniem → reset decyzji i powrót do formularza.
po sukcesie: toast + przekierowanie na /flashcards?source=ai-full (sprawdzić, że filtr po wejściu jest ustawiony).

4.5. Zarządzanie fiszkami (lista/filtry/paginacja/CRUD)
GET /api/flashcards
domyślne parametry (page=1, limit=20, sort=created_at, order=desc) → 200, poprawna pagination.total_pages.
walidacja query: page<1, limit>100, złe enumy sort/order/source, generation_id nie-uuid → 400 VALIDATION_FAILED.
filtrowanie: source, generation_id.
sortowanie: created_at, updated_at, order asc/desc.
PUT /api/flashcards/:id
id brak → 400.
id nie-uuid → 400.
body invalid JSON → 400.
front/back puste lub za długie → 400 VALIDATION_FAILED.
próba edycji cudzej fiszki → 404 NOT_FOUND (zgodnie z aktualną obsługą).
sukces → 200.
DELETE /api/flashcards/:id
id brak / nie-uuid → 400.
cudza fiszka → 404.
sukces → 204.
UI: FlashcardsView
initial state z query string (page, source, sort, order) – poprawne parsowanie i ustawienie filtrów.
zmiana filtrów aktualizuje URL bez reload (history.replaceState).
paginacja: zmiana strony scroll do top.
pusty stan: różny wariant “total-empty” vs “filtered-empty”.
modal add/edit: walidacje UI (min/ max długości), obsługa błędów API.
delete dialog: potwierdzenie, edge case “ostatnia fiszka na stronie” → cofnięcie page.

4.6. Bezpieczeństwo i prywatność
RLS: użytkownik A nie widzi/nie modyfikuje danych użytkownika B (flashcards/generations/error_logs).
Open redirect: next nie pozwala na //, ://, \ i ścieżki bez /.
Non-disclosure
login: zawsze neutralny komunikat.
reset-password: zawsze 200 po walidacji wejścia (bez ujawniania istnienia konta).
Cookies
w prod: secure=true, httpOnly=true, sameSite=lax.
brak utrzymywania cookies dla niepotwierdzonych kont (po rejestracji i w middleware).

4.7. A11y i UX
formularze: poprawne label, aria-invalid, aria-describedby, komunikaty błędów z role="alert".
dialogi/modale (shadcn/Radix): focus trap, zamykanie ESC, powrót focus.
kontrast i dark mode podstawowo (Tailwind dark:).
copy (PL/EN): spójność komunikatów w krytycznych flow (nie musi być w 100% PL, ale brak “mieszanych” błędów w jednym widoku tam, gdzie to mylące).

5. Środowisko testowe

Local dev
Node.js zgodnie z repo (README wskazuje 24.11.1),
npm install, npm run dev,
Supabase local (CLI) + zastosowane migracje,
zmienne .env: SUPABASE_URL, SUPABASE_KEY (server), SITE_URL, OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_API_URL.

Staging
osobny projekt Supabase (oddzielna baza i auth),
klucze OpenRouter z limitami finansowymi,
SITE_URL wskazujące staging.
Production (weryfikacja smoke)
tylko testy nieinwazyjne + monitoring (brak masowego generowania AI).
Dane testowe
min. 2 użytkowników testowych (A i B),
seed fiszek: manual + ai-full + ai-edited, kilka generacji z różnymi czasami,
testowe przypadki z granicznymi długościami front/back i input_text.

6. Narzędzia do testowania

6.1. Testy jednostkowe i integracyjne
Vitest (v2.0+) - framework testowy (natywna integracja z Vite/Astro, szybki, kompatybilny z Jest API).
@vitest/browser - uruchamianie testów w prawdziwej przeglądarce (React 19, Astro islands).
@testing-library/react - testowanie komponentów React zgodnie z best practices.
@testing-library/user-event - realistyczne symulacje interakcji użytkownika (lepsze niż fireEvent).
happy-dom lub jsdom - środowisko DOM dla podstawowych testów (gdy nie potrzeba prawdziwej przeglądarki).

6.2. Mockowanie HTTP
MSW (Mock Service Worker) v2.0+ - mockowanie na poziomie sieci (działa identycznie w testach i dev mode).
node-mocks-http - mockowanie Request/Response dla testów Astro endpoints (opcjonalnie).

6.3. Testy E2E
Playwright (v1.45+) - pełne E2E w prawdziwych przeglądarkach (Chromium, Firefox, WebKit).
features: traces, screenshots, video recording, test generator, debugging tools.
Playwright Test Runner - wbudowany runner z parallelizacją, retries, raportowaniem.

6.4. Testy API i kontraktowe
Playwright API Testing - testowanie REST API w TypeScript (zamiast Postman/Bruno collections).
@anatine/zod-openapi - generowanie dokumentacji OpenAPI ze schematów Zod.
zod-to-json-schema - konwersja Zod → JSON Schema (snapshot testing kontraktów).
Hoppscotch - open-source narzędzie do manualnego testowania API (alternatywa dla Postman, selfhosted, collections w Git).

6.5. Testy bezpieczeństwa
@playwright/test - zautomatyzowane testy RLS, open redirect, CSRF.
Snyk - skanowanie zależności (CI integration, darmowy dla open source).
npm audit / pnpm audit - wbudowane narzędzie do wykrywania znanych vulnerabilities.
OWASP ZAP - opcjonalnie dla zaawansowanego security scanning (penetration testing).

6.6. Testy dostępności (a11y)
@axe-core/playwright - automatyczne testy a11y (integracja z Playwright).
Lighthouse CI - audyt a11y, performance, SEO w pipeline CI/CD.
Manualna weryfikacja - screen readers (NVDA, VoiceOver), nawigacja klawiaturą.

6.7. Testy wizualne (Visual Regression)
Playwright Visual Comparisons - wbudowane screenshot testing (darmowe, podstawowe).
Chromatic - zaawansowane visual testing dla Storybook (płatne, $150/m, opcjonalnie w fazie scale).
Percy by BrowserStack - alternatywa dla Chromatic (opcjonalnie).

6.8. Testy wydajnościowe
Artillery (v2.0+) - load testing, łatwy w konfiguracji (YAML), dobre raportowanie.
Grafana k6 - zaawansowane performance testing (opcjonalnie, gdy potrzeba większej mocy).
Playwright traces + metrics - analiza TTFB, FCP, LCP dla E2E.
Lighthouse CI - performance budgets w CI/CD.

6.9. Testy mutacyjne (opcjonalnie)
@stryker-mutator/core + @stryker-mutator/vitest-runner - mutation testing (weryfikacja jakości testów).
Uwaga: Overkill dla MVP, rozważyć w fazie production-ready dla krytycznej logiki biznesowej.

6.10. CI/CD
GitHub Actions - automatyzacja testów (lint, unit, integration, e2e smoke).
Supabase CLI - local development + migracje w CI.
GitHub Environments - separacja staging/production secrets.

6.11. Narzędzia pomocnicze
Faker.js (@faker-js/faker) - generowanie realistycznych danych testowych.
dotenv-cli - zarządzanie zmiennymi środowiskowymi w testach.
c8 / @vitest/coverage-v8 - code coverage (wbudowane w Vitest).

6.12. Stack dependencies (rekomendowany)
```json
{
  "devDependencies": {
    // Core testing
    "vitest": "^2.0.0",
    "@vitest/browser": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    
    // Component testing
    "@testing-library/react": "^15.0.0",
    "@testing-library/user-event": "^14.5.0",
    "happy-dom": "^14.0.0",
    
    // HTTP mocking
    "msw": "^2.0.0",
    
    // E2E & API
    "@playwright/test": "^1.45.0",
    "@axe-core/playwright": "^4.9.0",
    
    // Contract testing
    "@anatine/zod-openapi": "^2.0.0",
    "zod-to-json-schema": "^3.22.0",
    
    // Performance
    "artillery": "^2.0.0",
    
    // Security
    "snyk": "^1.1200.0",
    
    // Utilities
    "@faker-js/faker": "^8.4.0",
    "dotenv-cli": "^7.4.0"
  }
}
```
7. Harmonogram testów i implementacji

7.1. Faza 1: MVP Testing (Tydzień 1-2)

Tydzień 1: Setup + Unit + Integration
Dzień 1-2: Przygotowanie środowiska
- setup Vitest + Playwright + MSW,
- konfiguracja Supabase local + migracje + seed data,
- utworzenie 2 użytkowników testowych (A, B),
- setup GitHub Actions (basic workflow: lint + typecheck).

Dzień 3-4: Testy jednostkowe
- logika bez IO: safe-next, walidacje, mapowanie błędów,
- useDecisions hook,
- validateFlashcardCommand,
- pure functions (formatery, parsery).

Dzień 5-7: Testy integracyjne API
- Auth endpoints: login, register, reset-password, update-password, logout,
- Generations endpoint: happy path, walidacje, rate limit, błędy OpenRouter,
- Flashcards endpoints: GET (paginacja, filtry), POST (bulk), PUT, DELETE,
- weryfikacja kontraktów Zod (snapshot testing).

Tydzień 2: E2E + Security + A11y
Dzień 1-3: E2E krytycznych ścieżek
- Auth flow: rejestracja → email confirmation → login → logout,
- Generowanie: input tekstu → kandydaci → review → save → przekierowanie,
- Flashcards CRUD: lista → filtry → paginacja → add/edit/delete,
- edge cases: pusta lista, ostatnia fiszka, błędy API w UI.

Dzień 4-5: Testy bezpieczeństwa
- RLS: user A nie widzi danych user B (zautomatyzowane w Playwright),
- open redirect: safe-next validation,
- non-disclosure: login/reset-password (neutralne komunikaty),
- cookies: httpOnly, secure, sameSite (manualna weryfikacja + testy).

Dzień 6-7: A11y + raport
- @axe-core/playwright na kluczowych stronach,
- manualna nawigacja klawiaturą + screen reader (smoke),
- raport z wyników testów + lista bugów do naprawy.

7.2. Faza 2: Production-Ready (Tydzień 3-4)

Tydzień 3: Advanced Testing
- Playwright API testing (zamiana manualnych testów Postman/Hoppscotch),
- Contract testing: Zod schemas → JSON Schema → snapshot tests,
- Visual regression: Playwright screenshots dla /generations, /flashcards, dialogi,
- Component testing: @vitest/browser dla złożonych komponentów (CandidatesReview, FlashcardsView).

Tydzień 4: Performance + CI/CD
- Artillery: load testing API (10-100 concurrent users),
- Lighthouse CI: performance budgets (LCP < 2.5s, FID < 100ms),
- GitHub Actions: rozszerzenie pipeline (unit + integration + e2e smoke + security),
- Setup staging environment + smoke tests po każdym deploy.

7.3. Faza 3: Scale (Miesiąc 2+)

Opcjonalnie, gdy aplikacja w production:
- Chromatic: visual regression testing (płatne, gdy jest budżet),
- Stryker: mutation testing dla krytycznej logiki biznesowej,
- OWASP ZAP: penetration testing,
- Monitoring: error tracking (Sentry), performance monitoring (Vercel Analytics).

7.4. Ciągłe testowanie (Continuous)

Na każdy PR:
- lint + format (ESLint + Prettier),
- typecheck (tsc --noEmit),
- unit tests (Vitest),
- dependency audit (npm audit + Snyk).

Na każdy merge do main:
- wszystkie testy z PR,
- integration tests (API + services),
- e2e smoke tests (krytyczne ścieżki),
- deploy do staging + smoke tests na staging.

Przed release do production:
- pełny regression suite (wszystkie E2E),
- security tests (RLS, open redirect, cookies),
- performance tests (Artillery + Lighthouse),
- manual QA review (krytyczne funkcje).

7.5. Timeline summary
- Tydzień 1-2: MVP testing (unit + integration + E2E critical paths + security + a11y),
- Tydzień 3-4: Production-ready (API contracts + visual regression + performance + CI/CD),
- Miesiąc 2+: Scale (advanced tools gdy jest traction i budżet).
8. Kryteria akceptacji testów

8.1. Funkcjonalność
- 100% przejście krytycznych scenariuszy E2E: rejestracja, email confirmation, login, reset hasła, generowanie, review kandydatów, zapis fiszek, CRUD fiszek.
- API zwraca spójne kody błędów i statusy zgodnie z kontraktem (Zod schemas).
- Wszystkie walidacje Zod działają poprawnie (frontend i backend).
- Error handling: graceful degradation, user-friendly messages, proper logging.

8.2. Bezpieczeństwo
- Potwierdzone RLS: brak dostępu krzyżowego (user A ↔ user B) dla flashcards, generations, error_logs.
- Open redirect: safe-next validation (brak //, ://, \, ścieżki bez /).
- Non-disclosure: brak enumeracji kont (login/reset zawsze neutralne komunikaty).
- Cookies: httpOnly=true, secure=true (prod), sameSite=lax.
- Dependency vulnerabilities: brak Critical/High w Snyk + npm audit.
- Niepotwierdzony email: middleware poprawnie wylogowuje i czyści cookies.

8.3. Jakość kodu
- Zero błędów krytycznych (Blocker/Critical).
- Błędy High: tylko z akceptacją PO i planem naprawy.
- Błędy Medium/Low: w backlogu z priorytetem.
- Code coverage: minimum 80% dla logiki biznesowej (services, validators, hooks).
- Linter: zero errors, warnings do akceptacji.

8.4. Stabilność
- Generowanie w trybie mock: 100% success rate.
- Generowanie z prawdziwym OpenRouter: poprawna obsługa timeout (504), rate limit (429), błędów (500).
- Flaky tests: maksymalnie 2% (retry do 3 razy, potem fix).
- E2E stability: minimum 95% pass rate na staging.

8.5. Wydajność
- API endpoints: GET < 200ms (p95), POST < 500ms (p95).
- Generowanie AI: timeout po 30s z graceful error.
- Frontend metrics (Lighthouse):
  - LCP (Largest Contentful Paint) < 2.5s,
  - FID (First Input Delay) < 100ms,
  - CLS (Cumulative Layout Shift) < 0.1,
  - Performance Score > 90.
- Load testing: aplikacja wytrzymuje 50 concurrent users bez degradacji (Artillery).

8.6. Dostępność (A11y)
- Axe-core: zero Critical/Serious violations.
- Moderate/Minor violations: z planem naprawy.
- Nawigacja klawiaturą: wszystkie interaktywne elementy osiągalne przez Tab.
- Screen reader: podstawowa nawigacja działa w NVDA/VoiceOver.
- WCAG 2.1 Level AA: minimum 90% zgodności.
- Kontrast: minimum 4.5:1 dla tekstu (normal), 3:1 dla large text.

8.7. UX i User Acceptance
- Spójność komunikatów błędów (PL/EN bez mieszania w jednym widoku).
- Loading states: użytkownik zawsze wie co się dzieje.
- Error states: jasne komunikaty + sugestie akcji (np. "Try again", "Contact support").
- Empty states: różnicowanie "total-empty" vs "filtered-empty".
- Responsywność: aplikacja działa na mobile (320px), tablet (768px), desktop (1920px).

8.8. Dokumentacja i proces
- Test plan: aktualny, zsynchronizowany z kodem.
- Test cases: dokumentowane w kodzie testów (describe/it z jsdoc).
- Bug reports: wypełnione według szablonu (tytuł, środowisko, kroki, dowody, priorytet).
- CI/CD: testy automatyczne na każdy PR + merge.
- Regression: smoke tests na staging po każdym deploy.

9. Role i odpowiedzialności w procesie testowania

QA / Inżynier jakości
przygotowanie planu i przypadków testowych,
automatyzacja (unit/integration/e2e) + raportowanie,
walidacja regresji.
Developer
naprawa defektów, wsparcie w seed/fixture,
doprecyzowanie kontraktów API/DTO.
PO / PM
akceptacja kryteriów biznesowych i priorytetów,
decyzje dot. scope/regresji.
DevOps
wsparcie CI/CD, staging, sekrety, monitoring.

10. Procedury raportowania błędów

Kanał: GitHub Issues (lub Jira – jeśli używane w zespole).
Szablon zgłoszenia
Tytuł: krótko + moduł (np. [API][flashcards] 422 przy manual flashcard bez powodu),
Środowisko: local/staging/prod + commit,
Kroki odtworzenia (dokładne),
Oczekiwany rezultat vs aktualny rezultat,
Dowody: response body, status HTTP, logi, screenshot/trace Playwright,
Priorytet/Severity: Blocker/Critical/High/Medium/Low,
Sugestia (opcjonalnie): podejrzany plik/komponent/endpiont.
SLA reakcji (propozycja)
Blocker/Critical: natychmiast,
High: 24h,
Medium: do następnego sprintu,
Low: backlog.

11. Przykłady implementacji testów

11.1. Vitest - Unit test (walidacja)
```typescript
// tests/unit/validators/safe-next.test.ts
import { describe, it, expect } from 'vitest';
import { safeNext } from '@/lib/validators/safe-next';

describe('safeNext validator', () => {
  it('should accept valid internal paths', () => {
    expect(safeNext('/generations')).toBe('/generations');
    expect(safeNext('/flashcards?page=2')).toBe('/flashcards?page=2');
  });

  it('should reject open redirect patterns', () => {
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('://evil.com')).toBe('/');
    expect(safeNext('\\evil.com')).toBe('/');
    expect(safeNext('https://evil.com')).toBe('/');
  });

  it('should reject paths without leading slash', () => {
    expect(safeNext('generations')).toBe('/');
  });
});
```

11.2. @testing-library/react - Component test
```typescript
// tests/components/CandidateCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CandidateCard } from '@/components/CandidateCard';

describe('CandidateCard', () => {
  const mockCandidate = {
    id: '1',
    front: 'Question?',
    back: 'Answer!',
  };

  it('should render candidate with front and back', () => {
    render(<CandidateCard candidate={mockCandidate} onAccept={vi.fn()} onReject={vi.fn()} />);
    
    expect(screen.getByText('Question?')).toBeInTheDocument();
    expect(screen.getByText('Answer!')).toBeInTheDocument();
  });

  it('should call onAccept when accept button clicked', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    
    render(<CandidateCard candidate={mockCandidate} onAccept={onAccept} onReject={vi.fn()} />);
    
    const acceptButton = screen.getByRole('button', { name: /accept/i });
    await user.click(acceptButton);
    
    expect(onAccept).toHaveBeenCalledWith('1');
  });
});
```

11.3. MSW - HTTP mocking for hooks
```typescript
// tests/hooks/useFlashcards.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useFlashcards } from '@/hooks/useFlashcards';

const server = setupServer(
  http.get('/api/flashcards', () => {
    return HttpResponse.json({
      flashcards: [
        { id: '1', front: 'Q1', back: 'A1', source: 'manual' },
        { id: '2', front: 'Q2', back: 'A2', source: 'ai-full' },
      ],
      pagination: { page: 1, limit: 20, total_pages: 1, total_count: 2 },
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useFlashcards', () => {
  it('should fetch flashcards on mount', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.flashcards).toHaveLength(2);
    expect(result.current.flashcards[0].front).toBe('Q1');
  });
});
```

11.4. Playwright - E2E test
```typescript
// tests/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register, login and logout user', async ({ page }) => {
    // Register
    await page.goto('/register');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // Login
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/generations');
    
    // Logout
    await page.click('button[aria-label="User menu"]');
    await page.click('text=Logout');
    
    await expect(page).toHaveURL('/login');
  });
});
```

11.5. Playwright API Testing - Contract test
```typescript
// tests/api/flashcards.api.test.ts
import { test, expect } from '@playwright/test';

test.describe('Flashcards API', () => {
  test('GET /api/flashcards returns valid paginated response', async ({ request }) => {
    const response = await request.get('/api/flashcards', {
      headers: {
        'Cookie': 'session=valid-token-here', // Use test session
      },
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // Contract validation
    expect(data).toMatchObject({
      flashcards: expect.any(Array),
      pagination: {
        page: expect.any(Number),
        limit: expect.any(Number),
        total_pages: expect.any(Number),
        total_count: expect.any(Number),
      },
    });
    
    // Validate first flashcard structure
    if (data.flashcards.length > 0) {
      expect(data.flashcards[0]).toMatchObject({
        id: expect.any(String),
        front: expect.any(String),
        back: expect.any(String),
        source: expect.stringMatching(/^(manual|ai-full|ai-edited)$/),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    }
  });

  test('POST /api/flashcards validates generation ownership', async ({ request }) => {
    const response = await request.post('/api/flashcards', {
      headers: {
        'Cookie': 'session=user-a-token',
      },
      data: [
        {
          front: 'Test Q',
          back: 'Test A',
          source: 'ai-full',
          generation_id: 'user-b-generation-id', // Different user's generation
        },
      ],
    });
    
    expect(response.status()).toBe(403);
    
    const error = await response.json();
    expect(error.error.code).toBe('FORBIDDEN');
  });
});
```

11.6. Zod Contract Testing - Schema snapshot
```typescript
// tests/contracts/api-schemas.test.ts
import { describe, it, expect } from 'vitest';
import zodToJsonSchema from 'zod-to-json-schema';
import { 
  GenerateFlashcardsResponseSchema,
  CreateFlashcardsResponseSchema,
  PaginatedFlashcardsResponseSchema,
} from '@/types';

describe('API Contract Schemas', () => {
  it('GenerateFlashcardsResponse schema matches snapshot', () => {
    const jsonSchema = zodToJsonSchema(GenerateFlashcardsResponseSchema);
    expect(jsonSchema).toMatchSnapshot();
  });

  it('CreateFlashcardsResponse schema matches snapshot', () => {
    const jsonSchema = zodToJsonSchema(CreateFlashcardsResponseSchema);
    expect(jsonSchema).toMatchSnapshot();
  });

  it('PaginatedFlashcardsResponse schema matches snapshot', () => {
    const jsonSchema = zodToJsonSchema(PaginatedFlashcardsResponseSchema);
    expect(jsonSchema).toMatchSnapshot();
  });
});
```

11.7. Playwright Security Testing - RLS
```typescript
// tests/security/rls.test.ts
import { test, expect } from '@playwright/test';

test.describe('RLS - Row Level Security', () => {
  test('User A cannot access User B flashcards via API', async ({ request, context }) => {
    // Login as User A
    const userAResponse = await request.post('/api/auth/login', {
      data: { email: 'userA@test.com', password: 'password123' },
    });
    
    // Get User B's flashcard ID (from seed data)
    const userBFlashcardId = 'known-user-b-flashcard-id';
    
    // Try to access User B's flashcard as User A
    const response = await request.get(`/api/flashcards/${userBFlashcardId}`);
    
    // Should return 404 (not 403 to avoid information disclosure)
    expect(response.status()).toBe(404);
  });

  test('User A cannot delete User B flashcards', async ({ request }) => {
    const userBFlashcardId = 'known-user-b-flashcard-id';
    
    const response = await request.delete(`/api/flashcards/${userBFlashcardId}`);
    
    expect(response.status()).toBe(404);
  });
});
```

11.8. @axe-core/playwright - A11y testing
```typescript
// tests/a11y/pages.a11y.test.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('generations page should not have a11y violations', async ({ page }) => {
    await page.goto('/generations');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('flashcards page should not have a11y violations', async ({ page }) => {
    await page.goto('/flashcards');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('forms should have proper labels and aria attributes', async ({ page }) => {
    await page.goto('/login');
    
    // Check email input
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute('aria-label');
    
    // Trigger validation error
    await page.click('button[type="submit"]');
    
    // Check error has aria-invalid and aria-describedby
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(emailInput).toHaveAttribute('aria-describedby');
    
    // Check error message has role="alert"
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
  });
});
```

11.9. Playwright Visual Regression
```typescript
// tests/visual/pages.visual.test.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('generations page matches screenshot', async ({ page }) => {
    await page.goto('/generations');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('generations-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('flashcards page with filters matches screenshot', async ({ page }) => {
    await page.goto('/flashcards?source=ai-full');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('flashcards-filtered.png');
  });

  test('dark mode matches screenshot', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/generations');
    
    await expect(page).toHaveScreenshot('generations-dark.png');
  });
});
```

11.10. Artillery - Performance/Load testing
```yaml
# tests/performance/api-load.yml
config:
  target: "http://localhost:4321"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Peak load"
  processor: "./processor.js"
  
scenarios:
  - name: "Generate flashcards flow"
    weight: 70
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "{{ $randomEmail }}"
            password: "password123"
          capture:
            - json: "$.session"
              as: "session"
      
      - post:
          url: "/api/generations"
          headers:
            Cookie: "session={{ session }}"
          json:
            input_text: "{{ $randomText }}"
          expect:
            - statusCode: 201
      
      - get:
          url: "/api/flashcards"
          headers:
            Cookie: "session={{ session }}"
          expect:
            - statusCode: 200
            - contentType: json

  - name: "Browse flashcards"
    weight: 30
    flow:
      - get:
          url: "/api/flashcards?page={{ $randomPage }}"
          expect:
            - statusCode: [200, 401]
```

11.11. Lighthouse CI - Performance budgets
```javascript
// .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4321/',
        'http://localhost:4321/generations',
        'http://localhost:4321/flashcards',
      ],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-input-delay': ['error', { maxNumericValue: 100 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

12. Konfiguracja CI/CD (GitHub Actions)

12.1. Przykładowy workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npx tsc --noEmit

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
      
      - run: npm ci
      - run: supabase start
      - run: npm run test:integration
      - run: supabase stop

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
      
      - run: supabase start
      - run: npm run build
      - run: npm run test:e2e
      
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm audit --audit-level=high
      
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

13. Struktura katalogów testowych

Rekomendowana organizacja testów:
```
tests/
├── unit/
│   ├── lib/
│   │   ├── validators/
│   │   │   ├── safe-next.test.ts
│   │   │   └── flashcard-validation.test.ts
│   │   └── services/
│   │       ├── generation.service.test.ts
│   │       └── flashcard.service.test.ts
│   └── hooks/
│       ├── useDecisions.test.ts
│       └── useFlashcards.test.ts
│
├── component/
│   ├── CandidateCard.test.tsx
│   ├── FlashcardsView.test.tsx
│   └── GenerateForm.test.tsx
│
├── integration/
│   ├── api/
│   │   ├── auth.integration.test.ts
│   │   ├── generations.integration.test.ts
│   │   └── flashcards.integration.test.ts
│   └── services/
│       └── full-flow.integration.test.ts
│
├── contracts/
│   ├── api-schemas.test.ts
│   └── __snapshots__/
│       └── api-schemas.test.ts.snap
│
├── e2e/
│   ├── auth-flow.spec.ts
│   ├── generation-flow.spec.ts
│   ├── flashcards-crud.spec.ts
│   └── fixtures/
│       ├── users.ts
│       └── test-data.ts
│
├── api/
│   ├── auth.api.test.ts
│   ├── generations.api.test.ts
│   └── flashcards.api.test.ts
│
├── security/
│   ├── rls.test.ts
│   ├── open-redirect.test.ts
│   └── csrf.test.ts
│
├── a11y/
│   ├── pages.a11y.test.ts
│   └── components.a11y.test.ts
│
├── visual/
│   ├── pages.visual.test.ts
│   └── __screenshots__/
│       ├── generations-page.png
│       └── flashcards-page.png
│
├── performance/
│   ├── api-load.yml (Artillery)
│   ├── processor.js
│   └── lighthouse.test.ts
│
└── helpers/
    ├── test-utils.tsx
    ├── msw-handlers.ts
    ├── supabase-mock.ts
    └── faker-data.ts
```

14. Najlepsze praktyki testowania

14.1. Zasady pisania testów
- **AAA Pattern**: Arrange (setup) → Act (execute) → Assert (verify).
- **Jeden koncept na test**: każdy test weryfikuje jedną konkretną funkcjonalność.
- **Niezależność testów**: testy nie powinny zależeć od siebie nawzajem, mogą być uruchamiane w dowolnej kolejności.
- **Deterministyczność**: test zawsze daje ten sam rezultat przy tych samych danych wejściowych.
- **Czytelne nazwy**: describe/it z pełnymi zdaniami wyjaśniającymi CO i DLACZEGO testujemy.
- **Unikaj test doubles dla wszystkiego**: mockuj tylko zewnętrzne zależności (API, baza), nie logikę biznesową.

14.2. Test naming conventions
```typescript
// ✅ GOOD - describes behavior and expected outcome
describe('CandidateCard', () => {
  it('should call onAccept when accept button is clicked', () => {});
  it('should display validation error when front text exceeds 200 characters', () => {});
});

// ❌ BAD - vague, doesn't explain behavior
describe('CandidateCard', () => {
  it('should work', () => {});
  it('test button click', () => {});
});
```

14.3. Dane testowe
- **Faker.js** dla realistycznych danych (email, imiona, daty).
- **Factory functions** dla złożonych obiektów (flashcard factory, user factory).
- **Seed scripts** dla Supabase local (consistent test data).
- **Fixtures** dla Playwright (logged-in state, common scenarios).

Przykład factory:
```typescript
// tests/helpers/factories.ts
import { faker } from '@faker-js/faker';

export function createFlashcard(overrides = {}) {
  return {
    id: faker.string.uuid(),
    front: faker.lorem.sentence(),
    back: faker.lorem.paragraph(),
    source: 'manual' as const,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}
```

14.4. Mockowanie
- **MSW** dla HTTP requests (realistische mocking on network level).
- **vi.mock()** dla internal modules (rzadko, tylko gdy konieczne).
- **Supabase local** zamiast mocków dla integration tests (real database).
- **Nie mockuj** bibliotek third-party całkowicie - użyj stubs/spies dla konkretnych metod.

14.5. Async testing
```typescript
// ✅ GOOD - proper async/await
it('should fetch flashcards', async () => {
  const { result } = renderHook(() => useFlashcards());
  
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
  
  expect(result.current.flashcards).toHaveLength(2);
});

// ❌ BAD - missing await, test might pass incorrectly
it('should fetch flashcards', () => {
  const { result } = renderHook(() => useFlashcards());
  expect(result.current.flashcards).toHaveLength(2); // Fails immediately
});
```

14.6. Error handling testing
- Testuj zarówno happy path JAK I error scenarios.
- Weryfikuj error messages i kody błędów.
- Testuj edge cases (empty arrays, null, undefined, extreme values).

14.7. Flaky tests prevention
- **Unikaj sleep/setTimeout** - użyj waitFor/waitForElementToBeVisible.
- **Deterministic data** - nie polegaj na random values w assertions.
- **Proper cleanup** - afterEach/afterAll dla reset state.
- **Stable selectors** - używaj data-testid zamiast class names dla Playwright.
- **Network idle** - wait for networkidle przed screenshots.

14.8. Code coverage guidelines
- **Target**: 80% dla business logic (services, validators, hooks).
- **NIE gonić 100%** - quality over quantity.
- **Ignoruj**: UI-only code, types, configs, generated files.
- **Focus**: critical paths (auth, payment, data manipulation).

14.9. Test maintenance
- **Refactor testy razem z kodem** - broken tests = broken contract.
- **Usuwaj obsolete tests** - jeśli feature został usunięty.
- **Aktualizuj snapshots świadomie** - review zmian przed update.
- **DRY principle** - extract common setup do helpers/fixtures.

14.10. Performance testów
- **Parallel execution** - Vitest i Playwright wspierają parallelizację out-of-the-box.
- **Selective testing** - w CI uruchamiaj tylko testy związane ze zmienionymi plikami (CI cache).
- **Fast feedback loop** - unit tests <10s, integration <30s, e2e <5min.
- **Optimize setup** - reuse browser contexts w Playwright, database connections w integration tests.

15. Zasoby i dokumentacja

15.1. Dokumentacja narzędzi
- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/
- Testing Library: https://testing-library.com/
- MSW: https://mswjs.io/
- Artillery: https://www.artillery.io/
- Axe Core: https://github.com/dequelabs/axe-core
- Lighthouse CI: https://github.com/GoogleChrome/lighthouse-ci

15.2. Best practices guides
- Kent C. Dodds - Testing Implementation Details: https://kentcdodds.com/blog/testing-implementation-details
- Martin Fowler - Test Pyramid: https://martinfowler.com/articles/practical-test-pyramid.html
- OWASP Testing Guide: https://owasp.org/www-project-web-security-testing-guide/

15.3. Astro-specific
- Astro Testing Guide: https://docs.astro.build/en/guides/testing/
- Testing Astro Components: https://docs.astro.build/en/recipes/testing/

15.4. Supabase testing
- Supabase Local Development: https://supabase.com/docs/guides/cli/local-development
- Testing RLS policies: https://supabase.com/docs/guides/database/testing

16. Podsumowanie i next steps

16.1. Tech stack decision summary
**Zachowane z oryginalnego planu:**
- ✅ Vitest - unit/integration testing
- ✅ Playwright - E2E testing
- ✅ MSW - HTTP mocking
- ✅ GitHub Actions - CI/CD
- ✅ @axe-core/playwright - a11y testing

**Zaktualizowane/rozszerzone:**
- 🔄 Postman/Bruno → Playwright API Testing + Hoppscotch (manual)
- 🔄 k6 → Artillery (prostsze, YAML config)
- ➕ @vitest/browser - component testing w prawdziwej przeglądarce
- ➕ @testing-library/user-event - realistic user interactions
- ➕ Zod contract testing - schemas jako source of truth
- ➕ Playwright Visual Comparisons - screenshot testing
- ➕ Snyk - dependency security scanning
- ➕ Lighthouse CI - performance budgets

**Opcjonalnie (scale):**
- 📦 Chromatic - advanced visual regression (płatne)
- 📦 Stryker Mutator - mutation testing (dla critical business logic)
- 📦 OWASP ZAP - penetration testing

16.2. Implementation priorities
**Faza 1 (Tydzień 1-2) - MVP Testing:**
1. Setup: Vitest + Playwright + MSW + Supabase local
2. Unit tests: validators, services, hooks
3. Integration tests: API endpoints + Supabase
4. E2E tests: critical user flows (auth, generate, CRUD)
5. Security tests: RLS, open redirect, cookies
6. A11y tests: axe-core podstawowe

**Faza 2 (Tydzień 3-4) - Production Ready:**
7. API contract testing: Playwright API + Zod schemas
8. Component testing: @vitest/browser dla complex components
9. Visual regression: Playwright screenshots
10. Performance: Artillery load testing + Lighthouse CI
11. CI/CD: GitHub Actions full pipeline

**Faza 3 (Miesiąc 2+) - Scale:**
12. Chromatic: advanced visual testing (jeśli budżet)
13. Stryker: mutation testing (critical logic)
14. Monitoring: Sentry, performance tracking

16.3. Success metrics
- **Coverage**: 80%+ dla business logic
- **E2E stability**: 95%+ pass rate
- **CI/CD speed**: <10min full pipeline
- **Security**: zero Critical/High vulnerabilities
- **A11y**: zero Critical/Serious axe violations
- **Performance**: Lighthouse score >90

16.4. Next actions
1. Review i approval tego planu przez zespół
2. Setup środowiska testowego (Vitest + Playwright config)
3. Utworzenie seed data dla Supabase local
4. Implementacja pierwszych testów jednostkowych (Tydzień 1)
5. Setup GitHub Actions basic workflow
6. Iteracyjne rozbudowywanie test coverage zgodnie z harmonogramem

---

**Dokument zaktualizowany**: 2026-01-24
**Wersja**: 2.0 (z rekomendacjami tech stack)
**Status**: Ready for implementation
