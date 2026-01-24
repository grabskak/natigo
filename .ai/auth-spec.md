# Specyfikacja architektury modułu uwierzytelniania (Auth) – natigo (MVP)

Dokument opisuje architekturę funkcjonalności **rejestracji, logowania, wylogowania i resetu hasła** zgodnie z `@.ai/prd.md` (**US-001, US-002, US-003, US-004**) oraz stackiem `Astro 5 + React 19 + TypeScript 5 + Tailwind 4 + Shadcn/ui + Supabase`.

To jest **specyfikacja techniczna**: wskazuje moduły, komponenty, kontrakty i przepływy, ale **nie zawiera docelowej implementacji**.

---

## 0. Kontekst, założenia i ograniczenia

### 0.1. Stan obecny repo (istotny dla kompatybilności)

- Aplikacja działa w trybie SSR: `astro.config.mjs` ma `output: "server"` oraz adapter `@astrojs/node` (standalone).
- `src/middleware/index.ts` ustawia `context.locals.supabase`, ale obecny klient Supabase jest singletonem (`createClient` z `@supabase/supabase-js`) i **nie zarządza sesją cookie dla SSR**.
- Endpointy domenowe (`/api/flashcards`, `/api/generations`) mają tymczasowo “hardcoded” `user.id` / `getAuthenticatedUser()` i w komentarzach przewidują docelowe `Authorization: Bearer ...`.
- Frontend **już** ma wzorzec “po 401 redirect do `/login`” (np. `FlashcardsApiService`) oraz używa `credentials: 'include'` w części wywołań.

### 0.2. Wymagania PRD (must-have)

- **Rejestracja**: email + hasło + potwierdzenie hasła; walidacje; błąd dla istniejącego emaila ma być czytelny (US-001).
- **Logowanie**: email + hasło; błąd ma być neutralny i nie ujawniać, czy email istnieje (US-002).
- **Wylogowanie**: dostępne w UI; po wylogowaniu zasoby wymagające auth są niedostępne (US-003).
- **Reset hasła**: inicjacja przez email z neutralnym komunikatem + ustawienie nowego hasła poprawnym flow (US-004).
- **Walidacja backendowa**: nie ufamy klientowi, walidujemy dane wejściowe po stronie backendu (PRD 3.1).
- **Autoryzacja danych (kontekst dla całej aplikacji)**: izolacja danych użytkowników jest wymagana (US-005, PRD 3.1) — ta specyfikacja Auth musi umożliwiać RLS poprzez poprawny “auth context” w zapytaniach do Supabase (bez użycia `service_role` do operacji per-user).

### 0.3. Wymagania architektoniczne (repo rules + spójność)

- Uwierzytelnienie budujemy na **Supabase Auth**.
- W Astro SSR stosujemy `@supabase/ssr` (nie `auth-helpers`).
- Cookie management w `@supabase/ssr` realizujemy wyłącznie przez `getAll()` / `setAll()` (bez pojedynczych `get/set/remove`).
- W API routes używamy Supabase clienta z `Astro.locals` (nie importujemy singletona bezpośrednio).

### 0.4. Docelowy model autoryzacji w MVP

W MVP wprowadzamy **cookie-based session** (httpOnly) dla aplikacji webowej:

- **SSR**: umożliwia server-side redirect zanim strona się wyrenderuje.
- **Client-side fetch**: działa z `credentials: 'include'` bez ręcznego przechowywania tokenów.

Jednocześnie, dla zgodności z `@.ai/api-plan.md`, projektujemy możliwość **opcjonalnego** wsparcia `Authorization: Bearer {access_token}` (np. dla przyszłego klienta mobilnego/CLI) — ale web UI domyślnie używa cookies.

---

## 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1. Routing: strony publiczne vs chronione

#### Strony publiczne (non-auth)

- **`/`** (`src/pages/index.astro`): landing (pozostaje publiczny).
- **`/login`** (`src/pages/login.astro`): logowanie.
- **`/register`** (`src/pages/register.astro`): rejestracja.
- **`/reset-password`** (`src/pages/reset-password.astro`): inicjacja resetu hasła.
- **`/reset-password/confirm`** (`src/pages/reset-password/confirm.astro`): ustawienie nowego hasła po kliknięciu linku z emaila.
- **`/auth/callback`** (`src/pages/auth/callback.astro`): techniczny callback Supabase (wymiana `code` na sesję cookie + redirect do `next`).

#### Strony chronione (auth required)

Zgodnie z PRD (US-025) funkcjonalności “aplikacyjne” wymagają konta:

- **`/flashcards`** (`src/pages/flashcards.astro`)
- **`/generations`** (`src/pages/generations.astro`)
- (opcjonalnie) **`/users` / `/settings`** — jeśli zostanie wykorzystane jako “Moje konto” w MVP; w przeciwnym razie pozostaje poza zakresem.

### 1.2. Layouty: tryb auth i non-auth

Obecnie repo ma wyłącznie `src/layouts/Layout.astro` jako bazowy shell (HTML + `<slot/>` + `Toaster`).

Docelowo wprowadzamy dwa “tryby” UI **bez naruszania bazowego Layoutu**:

- **`Layout.astro` (bazowy)**:
  - tylko “document shell”, meta i globalne style/toasty.
  - brak logiki auth.

- **`AuthLayout.astro` (nowy)**:
  - używany na: `/login`, `/register`, `/reset-password`, `/reset-password/confirm`.
  - renderuje “centered card” (shadcn/ui `Card`) + logo + krótkie copy.
  - nie pokazuje nawigacji aplikacji.

- **`AppLayout.astro` (nowy)**:
  - używany na: `/flashcards`, `/generations` i kolejnych stronach po zalogowaniu.
  - zawiera `NavigationBar` (React client-side lub Astro + mały React dropdown).
  - może wyświetlać email użytkownika (z `Astro.locals.user`) oraz akcję “Logout”.

### 1.3. Podział odpowiedzialności: Astro vs React

#### Astro (strony + SSR)

- **Ochrona routingu (SSR guard)**:
  - strony chronione sprawdzają sesję/użytkownika (np. `Astro.locals.user` ustawiony w middleware),
  - jeśli brak auth → `Astro.redirect('/login?next=...')`.
- **Odwrotna ochrona stron auth**:
  - jeśli użytkownik już zalogowany i wejdzie na `/login` lub `/register` → `Astro.redirect('/generations')` (lub `next` jeśli podane i bezpieczne).
- **Przekazanie parametrów do React**:
  - np. `next`, `initialMode`, `prefillEmail` (z query) jako props do komponentów React.
- **Brak stanu formularzy**:
  - Astro nie zarządza stanem pól; formularze i logika UX są w React.

#### React (formularze + UX)

- Obsługa formularzy (shadcn/ui `Input`, `Label`, `Button`), walidacji client-side i stanów UI.
- Wywołania API do `/api/auth/*` przez cienką warstwę serwisu (np. `AuthApiService`).
- Zarządzanie scenariuszami runtime:
  - blokada double-submit,
  - toasty sukcesu/błędu (`sonner`),
  - obsługa `401` z API (redirect do `/login?next=currentPath`) + komunikat “sesja wygasła / zaloguj się ponownie” (US-026).

### 1.4. Nowe komponenty UI (proponowane)

#### 1.4.1. Komponenty React: `src/components/auth/*`

- **`AuthForm.tsx`**:
  - tryby: `login` i `register` (lub dwa osobne ekrany, ale wspólny komponent upraszcza UI).
  - props:
    - `initialMode?: 'login' | 'register'`
    - `next?: string`
  - pola:
    - login: `email`, `password`
    - register: `email`, `password`, `confirmPassword`
  - submit:
    - login → `POST /api/auth/login`
    - register → `POST /api/auth/register`

- **`ResetPasswordRequestForm.tsx`**:
  - pole: `email`
  - submit → `POST /api/auth/reset-password`
  - zawsze pokazuje neutralny komunikat sukcesu (po walidacji formatu email).

- **`ResetPasswordConfirmForm.tsx`**:
  - pola: `password`, `confirmPassword`
  - submit → `POST /api/auth/update-password`

- **`AuthErrorAlert.tsx`** (opcjonalnie):
  - ustandaryzowane renderowanie błędów (inline alert + CTA “Spróbuj ponownie”).

#### 1.4.2. Nawigacja: `src/components/navigation/*`

- **`NavigationBar.tsx`**:
  - linki: `/generations`, `/flashcards`
  - user dropdown (shadcn/ui `DropdownMenu`) z akcją “Wyloguj”.
  - wylogowanie wywołuje `POST /api/auth/logout` i redirect do `/login`.

### 1.5. Walidacje i komunikaty błędów (UI)

Walidacje client-side mają poprawiać UX, ale **nie zastępują** walidacji backendowej.

#### 1.5.1. Rejestracja (`/register`)

- **Email**:
  - wymagany
  - format email
- **Hasło**:
  - min 8 znaków (zgodne z `@.ai/ui-plan.md`; szczegóły polityki hasła można rozszerzyć później)
  - nie trimujemy hasła
- **Potwierdzenie hasła**:
  - musi być identyczne jak hasło

Komunikaty:

- email zajęty (US-001): czytelny błąd, np. “This email is already registered”.
- inne błędy: ogólne, np. “Registration failed. Please try again later.”

#### 1.5.2. Logowanie (`/login`)

- Email + hasło wymagane.
- Błąd logowania (US-002) zawsze neutralny:
  - “Invalid email or password”.
- Neutralność dotyczy **wszystkich** scenariuszy niepowodzenia, w tym m.in.:
  - nieistniejącego konta,
  - błędnego hasła,
  - konta nieaktywowanego / “email not confirmed” (jeśli włączono email confirmation).
  W praktyce: UI nie renderuje bezpośrednio `error.message` z Supabase; serwer mapuje to na `INVALID_CREDENTIALS`.

#### 1.5.3. Reset hasła – inicjacja (`/reset-password`)

- Email wymagany + format email.
- Po submit zawsze neutralnie (US-004):
  - “If an account exists for this email, we sent a password reset link.”

#### 1.5.4. Reset hasła – ustawienie nowego hasła (`/reset-password/confirm`)

- Hasło min 8.
- Potwierdzenie hasła musi się zgadzać.
- Obsługa “brak/wygaśnięcie recovery session”:
  - inline: “Reset link is invalid or expired. Request a new one.”
  - CTA: link do `/reset-password`.

### 1.6. Scenariusze kluczowe (E2E)

#### S1: Rejestracja (US-001)

1. Wejście na `/register` (opcjonalnie `/register?next=/generations`).
2. Client-side walidacja → `POST /api/auth/register`.
3. Backend zakłada konto w Supabase Auth; ustawiana jest sesja cookie (jeśli Supabase zwraca sesję) lub aplikacja pokazuje krok “sprawdź email” (jeżeli włączono email confirmation).
4. Po sukcesie:
   - jeśli sesja aktywna: redirect do `next` lub `/generations`,
   - jeśli wymagana weryfikacja email: ekran “Sprawdź email” (bez ujawniania detali technicznych).

#### S2: Logowanie (US-002)

1. Wejście na `/login?next=/flashcards`.
2. Submit → `POST /api/auth/login`.
3. Sukces: redirect do `next` lub `/generations`.
4. Błąd: zawsze neutralny komunikat (bez różnicujących komunikatów typu “email not confirmed”), aby nie ujawniać, czy konto istnieje.

#### S3: Wylogowanie (US-003)

1. Dropdown w `NavigationBar` → “Wyloguj”.
2. `POST /api/auth/logout` → backend czyści sesję cookie.
3. Redirect do `/login`.
4. Próba wejścia na `/flashcards` lub `/generations` skutkuje redirectem do `/login`.

#### S4: Reset hasła (US-004)

1. `/reset-password` → wpis email → `POST /api/auth/reset-password`.
2. UI pokazuje neutralny komunikat.
3. Użytkownik klika link z emaila → trafia na `/auth/callback?next=/reset-password/confirm` (po drodze Supabase przekazuje `code`).
4. `/auth/callback` wymienia `code` na sesję cookie (recovery) i przekierowuje na `/reset-password/confirm`.
5. `/reset-password/confirm` → nowe hasło → `POST /api/auth/update-password` → sukces → redirect do `/login` (bezpieczny default).

---

## 2. LOGIKA BACKENDOWA

### 2.1. Struktura endpointów API

Docelowo tworzymy endpointy w `src/pages/api/auth/*`:

- **`POST /api/auth/register`**
- **`POST /api/auth/login`**
- **`POST /api/auth/logout`**
- **`POST /api/auth/reset-password`**
- **`POST /api/auth/update-password`**
- (opcjonalnie) **`GET /api/auth/session`** – diagnostyka/UX (np. sprawdzenie, czy user jest zalogowany)

Wszystkie endpointy:

- walidują input (Zod),
- zwracają błędy w formacie `ErrorResponse` (z `src/types.ts`),
- w logach serwera mogą zawierać szczegóły techniczne, ale **nie** ujawniają ich użytkownikowi.

### 2.2. Kontrakty request/response (DTO)

Dodajemy do `src/types.ts` (lub wydzielamy `src/types.ts` → sekcja “Auth DTOs”):

- `AuthUserDto`:
  - `{ id: string; email: string | null }`
- `AuthSessionDto` (opcjonalne, jeśli chcemy zwracać tokeny zgodnie z `@.ai/api-plan.md`):
  - `{ access_token: string; refresh_token?: string; expires_at?: number }`

#### `POST /api/auth/register`

- Request:
  - `{ email: string; password: string; confirmPassword: string; next?: string }`
- Success (200/201):
  - `{ user: AuthUserDto; session?: AuthSessionDto }`
- Uwaga (email confirmation): jeśli w Supabase jest włączone potwierdzenie email, rejestracja może zakończyć się sukcesem z `user`, ale **bez aktywnej sesji** (`session` pominięte / puste). UI traktuje to jako sukces i pokazuje krok “Sprawdź email” (US-001).
- Errors:
  - 400 `VALIDATION_FAILED`
  - 409 `EMAIL_ALREADY_IN_USE` (czytelny komunikat – zgodnie z US-001)
  - 429 `RATE_LIMIT_EXCEEDED` (jeśli wprowadzimy limit)

#### `POST /api/auth/login`

- Request:
  - `{ email: string; password: string; next?: string }`
- Success (200):
  - `{ user: AuthUserDto; session?: AuthSessionDto }`
- Errors:
  - 400 `VALIDATION_FAILED`
  - 401 `INVALID_CREDENTIALS` (neutralny komunikat – US-002; obejmuje również przypadki typu “email not confirmed”, aby nie ujawniać istnienia konta)
  - 429 `RATE_LIMIT_EXCEEDED`

#### `POST /api/auth/logout`

- Request: brak body
- Success: 204 No Content
- Errors:
  - 401 `AUTH_REQUIRED` (opcjonalnie; logout może być “best-effort” i zwracać 204 nawet bez sesji)

#### `POST /api/auth/reset-password`

- Request:
  - `{ email: string }`
- Success (200):
  - `{ message: string }` (neutralny)
- Non-disclosure (US-004): po poprawnej walidacji formatu email endpoint zwraca **zawsze** neutralny sukces (200) niezależnie od tego, czy konto istnieje; błędy Supabase nie są przekazywane do UI w sposób, który ujawnia istnienie konta.
- Errors:
  - 400 `VALIDATION_FAILED`
  - 429 `RATE_LIMIT_EXCEEDED`

#### `POST /api/auth/update-password`

- Request:
  - `{ password: string; confirmPassword: string }`
- Success (200):
  - `{ message: string }`
- Errors:
  - 400 `VALIDATION_FAILED`
  - 401 `AUTH_REQUIRED` (brak recovery session)

### 2.3. Walidacja danych wejściowych (Zod)

Nowy moduł schematów:

- `src/lib/schemas/auth.schema.ts`:
  - `RegisterSchema`
  - `LoginSchema`
  - `ResetPasswordRequestSchema`
  - `UpdatePasswordSchema`

Zasady:

- email `.trim().toLowerCase()` (opcjonalnie; w MVP można tylko `.trim()`).
- hasło i confirmPassword **bez trim**.
- `next` walidujemy jako “safe path”:
  - tylko ścieżki względne zaczynające się od `/`,
  - blokujemy pełne URL-e i `//` (zapobieganie open redirect).

### 2.4. Obsługa wyjątków i mapowanie błędów Supabase

Proponowane “app error codes” (stabilny kontrakt dla UI):

- `VALIDATION_FAILED` (400)
- `INVALID_CREDENTIALS` (401; neutralny)
- `EMAIL_ALREADY_IN_USE` (409)
- `AUTH_REQUIRED` (401)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_SERVER_ERROR` (500)

Mapowanie z Supabase:

- błędy logowania/rejestracji mapujemy na powyższe kody; szczegóły z `error.message` Supabase nie są bezpośrednio renderowane (poza `EMAIL_ALREADY_IN_USE`).
- Reguły krytyczne dla zgodności z PRD:
  - **Logowanie (US-002)**: wszystkie błędy “auth” z Supabase, które mogłyby zdradzać istnienie konta (np. “Invalid login credentials”, “Email not confirmed”, “User not found”), mapujemy do **jednego** kodu `INVALID_CREDENTIALS` i jednej, neutralnej wiadomości dla UI.
  - **Reset hasła (US-004)**: endpoint inicjujący reset nie może zdradzać istnienia konta — po walidacji formatu email zwraca neutralny sukces, a ewentualne błędy Supabase są logowane po stronie serwera.

Wspólne helpery:

- rozszerzamy `src/lib/utils/api-helpers.ts` o:
  - `safeJson(request)` (parsing JSON z czytelnym błędem),
  - `requireUser(locals)` / `getUserOrNull(locals)` (dla API),
  - `normalizeAuthError(error)` (Supabase → app codes).

### 2.5. Aktualizacja SSR renderowania stron (w kontekście `astro.config.mjs`)

Ponieważ `output: "server"`:

- chronione strony **mogą** (i powinny) wykonać guard serwerowy przed renderem.
- strony auth/protected ustawiają jawnie `export const prerender = false;` (dla uniknięcia regresji, gdy ktoś włączy prerendering per-route).

W praktyce:

- `/flashcards` i `/generations` odkomentowują docelowy guard, ale korzystają z `Astro.locals.user` (z middleware), a nie z singletona.

---

## 3. SYSTEM AUTENTYKACJI (Supabase Auth + Astro SSR)

### 3.1. Supabase Auth – konfiguracja projektu

W Supabase:

- Włączony provider: **Email + Password** (bez social loginów).
- (Opcjonalnie) Email confirmation:
  - jeśli włączone: UI po rejestracji informuje o konieczności potwierdzenia email.
- Dozwolone Redirect URLs:
  - środowisko dev/prod + ścieżka callback: `/auth/callback`.

### 3.2. Server-side Supabase client w Astro (cookie session)

Docelowa architektura klienta Supabase w `src/db/supabase.client.ts`:

- `createSupabaseServerClient({ cookies, headers })` oparty o `@supabase/ssr`:
  - implementacja cookies wyłącznie `getAll()` i `setAll()` (zgodnie z regułami repo),
  - cookie options:
    - `httpOnly: true`
    - `sameSite: 'lax'`
    - `secure: true` w prod (w dev dopuszczalne `false`, jeśli localhost bez https).

Uwaga bezpieczeństwa:

- `SUPABASE_KEY` (anon) pozostaje po stronie serwera (env bez prefiksu `PUBLIC_`), a UI komunikuje się z Supabase przez nasze API routes.
- Aby spełnić wymagania izolacji danych (US-005 / RLS): do operacji per-user **nie używamy** klucza `service_role`. Zapytania do tabel aplikacyjnych wykonujemy w kontekście sesji użytkownika (cookie/Bearer), aby polityki RLS w Supabase były egzekwowane.

### 3.3. Middleware: inicjalizacja session i ochrona ścieżek

`src/middleware/index.ts` zostaje rozszerzony:

1. Tworzy request-scoped Supabase client SSR.
2. Wywołuje `supabase.auth.getUser()` (lub `getSession()` + `getUser()` — zależnie od rekomendacji Supabase dla SSR) i ustawia:
   - `locals.supabase`
   - `locals.user?: { id: string; email: string | null }`
3. Dla ścieżek chronionych:
   - brak user → redirect do `/login?next=${pathname + search}`.
4. Dla ścieżek publicznych auth:
   - jeśli user istnieje i wejście na `/login` lub `/register` → redirect do `/generations`.

Lista publicznych ścieżek (MVP):

- `/`
- `/login`
- `/register`
- `/reset-password`
- `/reset-password/confirm`
- `/auth/callback`
- `/api/auth/*` (wszystkie)

Chronione:

- `/flashcards`
- `/generations`
- `/api/*` poza `/api/auth/*` (docelowo wszystkie endpointy domenowe wymagają auth).

### 3.4. Callback (`/auth/callback`) i reset hasła

Docelowy flow resetu:

- `/api/auth/reset-password` wywołuje `supabase.auth.resetPasswordForEmail(email, { redirectTo })`, gdzie `redirectTo` wskazuje na:
  - `/auth/callback?next=/reset-password/confirm`
- `/auth/callback`:
  - pobiera `code` (query param) i wykonuje `exchangeCodeForSession(code)` (ustawiając cookies),
  - redirectuje do `next` (po walidacji `next` jako safe path) lub do `/reset-password/confirm`.
- `/reset-password/confirm`:
  - działa tylko, jeśli istnieje recovery session (inaczej przekierowuje na `/reset-password` z komunikatem).
- `/api/auth/update-password`:
  - wymaga recovery session; ustawia nowe hasło i kończy flow.

### 3.5. Wylogowanie

- `POST /api/auth/logout` wykonuje `supabase.auth.signOut()` na server-side Supabase client (SSR), co czyści cookies.
- UI po sukcesie redirectuje do `/login`.

### 3.6. Kompatybilność z Bearer JWT (opcjonalnie)

Jeśli utrzymujemy spójność z `@.ai/api-plan.md`:

- `/api/auth/login` i `/api/auth/register` mogą (opcjonalnie) zwracać `session.access_token` w body (równolegle do cookies).
- Endpointy domenowe (`/api/flashcards`, `/api/generations`) mogą akceptować:
  - sesję cookie (domyślnie w web),
  - lub `Authorization: Bearer ...` (dla alternatywnych klientów).

Priorytet interpretacji auth w backendzie:

1. Jeśli jest `Authorization: Bearer ...` → walidacja tokenu przez Supabase.
2. W przeciwnym razie → sesja z cookies (SSR).

---

## 4. Wpływ na istniejące elementy aplikacji (co rozszerzamy)

### 4.1. Strony istniejące

- `src/pages/flashcards.astro`:
  - aktywuje docelowy SSR guard (redirect do `/login`) i przechodzi na `locals.user`.
  - opcjonalnie przechodzi na `AppLayout` (nawigacja).

- `src/pages/generations.astro`:
  - włącza ochronę auth (zgodnie z PRD) i redirect do `/login`.
  - pozostaje `prerender = false`.

### 4.2. Frontendowe wywołania API

Aby cookie-based session działała spójnie:

- wszystkie `fetch('/api/...')` wykonywane z React powinny mieć `credentials: 'include'`.
  - dziś ma to `FlashcardsApiService`, ale nie mają tego np. `useGenerateFlashcards` i `useSaveFlashcards`.
- wszystkie miejsca powinny obsłużyć `401` jednolicie:
  - redirect do `/login?next=currentPath`.

Rekomendacja:

- dodać wspólny wrapper `apiFetch()` w `src/lib/services` lub `src/lib/utils`, który:
  - dokleja `credentials: 'include'`,
  - mapuje `ErrorResponse` na wyjątek z `{ code, message }`,
  - w przypadku `401` wykonuje redirect.

### 4.3. Backendowe endpointy domenowe

Docelowo usuwamy “hardcoded user id” i `getAuthenticatedUser()`:

- wszystkie endpointy `/api/*` (poza `/api/auth/*`) pobierają usera z auth context (cookie/Bearer).
- brak usera → `401 AUTH_REQUIRED`.

---

## 5. Proponowane moduły i pliki (bez implementacji)

### 5.1. Frontend (Astro/React)

- Strony:
  - `src/pages/login.astro`
  - `src/pages/register.astro`
  - `src/pages/reset-password.astro`
  - `src/pages/reset-password/confirm.astro`
  - `src/pages/auth/callback.astro`
- Layouty:
  - `src/layouts/AuthLayout.astro`
  - `src/layouts/AppLayout.astro`
  - `src/layouts/Layout.astro` (bez zmian semantycznych; baza)
- Komponenty:
  - `src/components/auth/AuthForm.tsx`
  - `src/components/auth/ResetPasswordRequestForm.tsx`
  - `src/components/auth/ResetPasswordConfirmForm.tsx`
  - `src/components/navigation/NavigationBar.tsx`
- Serwisy:
  - `src/lib/services/auth-api.service.ts` (client → `/api/auth/*`)
  - (opcjonalnie) `src/lib/utils/api-fetch.ts` (wspólny wrapper fetch)

### 5.2. Backend (API routes + walidacje)

- `src/pages/api/auth/login.ts`
- `src/pages/api/auth/register.ts`
- `src/pages/api/auth/logout.ts`
- `src/pages/api/auth/reset-password.ts`
- `src/pages/api/auth/update-password.ts`
- (opcjonalnie) `src/pages/api/auth/session.ts`
- `src/lib/schemas/auth.schema.ts`
- `src/lib/utils/api-helpers.ts` (rozszerzenie o helpery auth)

### 5.3. System (middleware + typy)

- `src/middleware/index.ts` (rozszerzenie o SSR auth + route guards)
- `src/db/supabase.client.ts` (dodanie server-side clienta na `@supabase/ssr`)
- `src/env.d.ts`:
  - aktualizacja typów `locals.user` i docelowego typu `locals.supabase` (preferowany typ z `src/db/supabase.client.ts`, zgodnie z regułami repo).

---

## 6. Checklista akceptacyjna architektury

- (US-001) Dedykowana strona rejestracji, walidacje, czytelny błąd “email już istnieje”.
- (US-002) Dedykowana strona logowania, neutralny błąd dla niepoprawnych danych.
- (US-003) Wylogowanie dostępne w UI; po wylogowaniu strony i API wymagające auth są niedostępne.
- (US-004) Reset hasła: neutralna inicjacja + ustawienie nowego hasła w poprawnym flow.
- (US-026) Wygasła sesja: czytelny komunikat + prośba o ponowne zalogowanie + zachowanie `next` (powrót po zalogowaniu).
- Walidacja backendowa Zod dla wszystkich requestów auth.
- SSR: chronione strony przekierowują zanim się wyrenderują (bez “flash of protected content”).
- Spójny kontrakt błędów `ErrorResponse` i stabilne `error.code`.
- Brak przechowywania tokenów w localStorage w web MVP (cookie-based session).

