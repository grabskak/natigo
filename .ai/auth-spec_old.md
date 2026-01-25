## Specyfikacja architektury modułu uwierzytelniania (Auth) – natigo

Dokument opisuje architekturę funkcjonalności **rejestracji, logowania, wylogowania i resetu hasła** (US-001..US-005 z `@.ai/prd.md`) w stacku `Astro 5 + React 19 + TypeScript 5 + Tailwind 4 + Shadcn/ui + Supabase`.

### Zakres i cele
- **US-001 Rejestracja**: email + hasło + potwierdzenie hasła, walidacje, czytelne błędy, po sukcesie zalogowanie lub jasna informacja o kolejnym kroku (np. email confirmation).
- **US-002 Logowanie**: dedykowana strona, neutralny błąd (nie ujawnia, czy email istnieje), po sukcesie dostęp tylko do własnych danych.
- **US-003 Wylogowanie**: możliwe z interfejsu, po wylogowaniu zasoby wymagające logowania są niedostępne.
- **US-004 Reset hasła**: inicjacja przez email z neutralnym komunikatem + ustawienie nowego hasła w poprawnym flow.
- **US-005 Autoryzacja/RLS**: brak możliwości odczytu/edycji/usunięcia cudzych danych (wymuszone na backendzie i w bazie – RLS).

### Kluczowe ograniczenia i zgodność z istniejącą aplikacją/dokumentacją
- Aplikacja działa w trybie SSR: `astro.config.mjs` ma `output: "server"` i adapter node.
- W repo istnieją już założenia o ochronie stron i przekierowaniach do `/login` (TODO w `src/pages/flashcards.astro`, `src/pages/generations.astro`, serwisy frontowe przekierowujące na `/login` przy `401`).
- W planach `.ai/*` występuje model **JWT Bearer** dla endpointów API (`Authorization: Bearer {access_token}`) oraz **RLS** (np. `@.ai/api-plan.md`, `@.ai/db-plan.md`).
- Specyfikacja poniżej projektuje rozwiązanie **kompatybilne z Bearer** i jednocześnie umożliwiające **SSR-ową ochronę stron** (wymagane przez SSR i UX). W praktyce oznacza to wsparcie **dwóch kanałów autoryzacji**:
  - **A: Cookie-based session (zalecane)** – dla SSR i wygodnych redirectów po stronie serwera.
  - **B: Bearer JWT (kompatybilność z planem API)** – dla wywołań API z React (opcjonalnie, równolegle).

### Weryfikacja spójności z PRD (`@.ai/prd.md`) i redukcja nadmiarowych założeń

Poniżej doprecyzowujemy, które elementy są **wymaganiami PRD** (must-have), a które są **decyzjami implementacyjnymi** (nice-to-have / opcjonalne), żeby uniknąć niezamierzonego „rozszerzania zakresu”.

#### Wymagania twarde z PRD (US-001..US-005)
- **Email + hasło** (bez social loginów) – US-001/US-002.
- **Login**: błąd ma być **neutralny** i nie ujawniać, czy email istnieje – US-002.
- **Reset hasła (inicjacja)**: komunikat ma być **neutralny** i nie ujawniać, czy konto istnieje – US-004.
- **Rejestracja**: próba rejestracji na istniejący email kończy się **czytelnym błędem** – US-001 (to może ujawnić istnienie konta i jest akceptowane w PRD).
- **Wylogowanie**: dostępne z UI; po wylogowaniu zasoby chronione są niedostępne (redirect / 401) – US-003.
- **Autoryzacja danych**: użytkownik widzi/zmienia tylko swoje dane; wymuszone po stronie backendu i bazy (RLS) – US-005.

#### Decyzje implementacyjne (nie wynikają wprost z PRD)
- **Preferowany kanał auth w MVP**: **cookies + SSR** (kanał A). Kanał **Bearer JWT** (B) jest tylko dla kompatybilności z `@.ai/api-plan.md` i może być wdrożony później.
- **Email confirmations**: opcjonalne ustawienie Supabase; jeśli włączone, po rejestracji pokazujemy jasny komunikat „sprawdź email” (zgodne z PRD).
- **Treści komunikatów**: przykładowe stringi w tej specyfikacji są **copy-propozycją**, nie twardym kontraktem (docelowo copy może być PL/EN).
- **Walidacje hasła**: PRD wymaga minimalnych wymagań; limit maks. (np. 72 znaki) i reguły złożoności są decyzją implementacyjną/UX.

#### Traceability (czy każdą User Story da się zrealizować planem)
- **US-001 Rejestracja**: UI `/register` (+ `AuthForm`) → API `POST /api/auth/register` → Supabase Auth signUp; obsługa 409 dla istniejącego emaila; po sukcesie auto-login **albo** komunikat o potwierdzeniu email.
- **US-002 Logowanie**: UI `/login` → API `POST /api/auth/login` → Supabase Auth signIn; każdy błąd uwierzytelnienia mapowany na neutralny `INVALID_CREDENTIALS`.
- **US-003 Wylogowanie**: UI (menu) → API `POST /api/auth/logout` (czyszczenie sesji cookies) → strony protected robią SSR guard i redirectują na `/login`.
- **US-004 Reset hasła**: UI `/reset-password` → API `POST /api/auth/reset-password` (zawsze neutralna odpowiedź po walidacji) → link z emaila → `/auth/callback?...` → UI `/reset-password/confirm` → API `POST /api/auth/update-password`.
- **US-005 Autoryzacja/RLS**: middleware tworzy server-side Supabase client; API endpoints używają `requireUser()` i nie przyjmują `user_id` z klienta; RLS w DB egzekwuje izolację.

---

## 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1. Strony (Astro) i routing

#### Strony publiczne (non-auth)
- **`/`** (`src/pages/index.astro`): landing (może pozostać publiczny).
- (Opcjonalnie) publiczne treści marketingowe/FAQ – poza zakresem MVP.

#### Strony auth
- **`/login`** (`src/pages/login.astro`): ekran logowania.
- **`/register`** (`src/pages/register.astro`): ekran rejestracji (alternatywnie: `/login?mode=register` – zgodnie z `@.ai/ui-plan.md`).
- **`/reset-password`** (`src/pages/reset-password.astro`): inicjacja resetu hasła (formularz z emailem).
- **`/reset-password/confirm`** (`src/pages/reset-password/confirm.astro`): ustawienie nowego hasła po kliknięciu linku z emaila.
- **`/auth/callback`** (`src/pages/auth/callback.astro`): techniczna strona do obsługi callbacków Supabase (wymiana kodu na sesję i redirect do `next`).

#### Strony wymagające auth (protected)
- **`/flashcards`** (`src/pages/flashcards.astro`): lista fiszek (już istnieje) – musi być chroniona.
- **`/generations`** (`src/pages/generations.astro`): generowanie (już istnieje, `prerender = false`) – musi być chronione.
- (Opcjonalnie) **`/users`** (`src/pages/users.astro` – aktualnie puste): może stać się “Moje konto/Ustawienia” albo zostać usunięte poza zakresem auth.

### 1.2. Layouty: auth vs non-auth

#### `src/layouts/Layout.astro` (obecny – bazowy)
Pozostaje jako **najprostszy BaseLayout** (meta + `<slot />` + toaster). Nie zmieniamy jego “semantyki”, by nie naruszyć obecnego zachowania.

#### Nowy `src/layouts/AuthLayout.astro` (auth mode)
Zastosowanie: `/login`, `/register`, `/reset-password`, `/reset-password/confirm`.
- Renderuje centrowaną “kartę” (zgodnie z `@.ai/ui-plan.md`).
- Udostępnia spójne meta (tytuł/opis) oraz opcjonalnie link powrotny do `/`.
- Brak navbaru aplikacji (ułatwia fokus na auth).

#### Nowy `src/layouts/AppLayout.astro` (authenticated mode)
Zastosowanie: `/flashcards`, `/generations` i przyszłe widoki po zalogowaniu.
- Renderuje globalną nawigację (zgodnie z `@.ai/ui-plan.md` – “Generate”, “My Flashcards”, user menu + “Logout”).
- Wykorzystuje komponent React `NavigationBar` (client:load) lub statyczny navbar w Astro + mały React dropdown (w zależności od docelowej interakcji).

### 1.3. Rozdzielenie odpowiedzialności: Astro vs React

#### Odpowiedzialność stron Astro
- **SSR Guard (ochrona routingu)**: przed renderem sprawdzają, czy użytkownik ma sesję; jeśli nie, wykonują `Astro.redirect('/login?next=...')`.
- **Wstrzyknięcie danych “startowych”** do komponentów React jako props (np. `initialMode`, `next`, `prefillEmail`).
- Utrzymanie prostego HTML i layoutów; Astro nie przejmuje stanu formularzy.

#### Odpowiedzialność komponentów React (client-side)
- Obsługa formularzy, walidacji client-side i UX (loading, disable button, toasty).
- Wywołania backendu auth (najlepiej przez dedykowany `AuthApiService`).
- Obsługa scenariuszy sesji w runtime:
  - `401` z API → toast + redirect do `/login` (to już jest wzorzec w `FlashcardsApiService`).
  - “Wygasła sesja z innej karty” → wykrycie zmiany sesji i redirect.

### 1.4. Nowe komponenty UI (proponowana struktura)

#### React: `src/components/auth/*`
- **`AuthForm.tsx`**: wspólny formularz logowania/rejestracji (zgodnie z `@.ai/ui-plan.md`).
  - Props: `initialMode?: 'login' | 'register'`, `next?: string`
  - Stan: `email`, `password`, `confirmPassword?`, `isLoading`, `error?`
- **`ForgotPasswordForm.tsx`**: inicjacja resetu (email).
- **`ResetPasswordForm.tsx`**: ustawienie nowego hasła (password + confirm).
- **`AuthErrorAlert.tsx`**: ustandaryzowana prezentacja błędu (Shadcn `Card/Alert` + opcjonalny “Try again”).
- **`PasswordRequirementsHint.tsx`**: opis wymagań hasła (wspólny UX).

#### React: `src/components/navigation/NavigationBar.tsx` (po zalogowaniu)
- Linki: `/generations`, `/flashcards`
- User menu: “Logout”
- (Opcjonalnie) “Settings”/“Account” w przyszłości (zgodnie z UI planem).

#### Wspólne komponenty
Można reużyć istniejące shadcn/ui (`Button`, `Input`, `Label`, `Card`, `DropdownMenu`, `sonner`).

### 1.5. Walidacja i komunikaty błędów (UI)

#### Walidacje client-side (minimum)
- **Email**: wymagany, poprawny format.
- **Hasło**:
  - min. 8 znaków (zgodnie z `@.ai/ui-plan.md`, oraz “minimal requirements” z PRD),
  - max np. 72 (rekomendacja implementacyjna; do potwierdzenia w specyfikacji walidacji),
  - (opcjonalnie) reguła złożoności: co najmniej 1 litera i 1 cyfra – decyzja product/UX (nie jest wymaganiem PRD).
- **Potwierdzenie hasła (register/reset-confirm)**: musi się zgadzać z hasłem.

#### Komunikaty błędów (treść i neutralność)
- **Login** (US-002): zawsze neutralnie:
  - `Invalid email or password` (bez rozróżnienia “email istnieje/nie istnieje”).
- **Register** (US-001): czytelny błąd dla istniejącego emaila:
  - `This email is already registered` (może ujawniać istnienie konta – wymagane przez kryteria US-001).
- **Reset password init** (US-004): zawsze neutralnie (nie ujawnia istnienia konta):
  - `If an account exists for this email, we sent a password reset link.`
- **Reset confirm**: błędy tokenu/czasu:
  - `The reset link is invalid or expired. Please request a new one.`
- **Sieć**:
  - `Network error. Please check your connection and try again.`

#### Stany UI
- Loading: przyciski disabled, spinner, brak podwójnych submitów.
- Sukces: toast + redirect (np. `/flashcards` albo `next`).
- Błąd: inline w karcie + toast tylko dla błędów globalnych (opcjonalnie).

### 1.6. Najważniejsze scenariusze użytkownika (end-to-end)

#### S1: Rejestracja (US-001)
1. `/register` (lub `/login?mode=register`) → wypełnienie email/hasło/potwierdź.
2. Client: walidacja → POST `/api/auth/register`.
3. Backend: tworzy konto w Supabase Auth.
4. Front:
   - jeśli “auto-login”: redirect do `/flashcards`.
   - jeśli wymagane potwierdzenie email: komunikat “Sprawdź skrzynkę email”.

#### S2: Logowanie (US-002)
1. `/login?next=/flashcards` → submit.
2. POST `/api/auth/login`.
3. Po sukcesie: redirect do `next` lub `/flashcards`.
4. Po błędzie: neutralny komunikat.

#### S3: Wylogowanie (US-003)
1. User menu → “Logout” → POST `/api/auth/logout` (lub wywołanie Supabase Auth signOut).
2. Front: redirect do `/login`.
3. Próba wejścia na `/flashcards`, `/generations` → redirect do `/login`.

#### S4: Reset hasła (US-004)
1. `/reset-password` → email → POST `/api/auth/reset-password`.
2. Komunikat neutralny (zawsze).
3. Użytkownik klika link w mailu → trafia do `/auth/callback?next=/reset-password/confirm` (lub bezpośrednio do `/reset-password/confirm` zależnie od konfiguracji).
4. `/reset-password/confirm` → nowe hasło + confirm → POST `/api/auth/update-password`.
5. Po sukcesie: redirect do `/login` lub od razu do `/flashcards` (decyzja UX; bezpieczniej: `/login`).

---

## 2. LOGIKA BACKENDOWA

### 2.1. Endpointy API (Astro Server Endpoints)

Wszystkie endpointy zwracają błędy w formacie zgodnym z `src/types.ts`:
- `ErrorResponse = { error: { code: string; message: string; details?: ... } }`

#### Auth endpoints (nowe)
- **POST `/api/auth/register`**
  - Body: `{ email: string; password: string; confirm_password: string }`
  - 201/200: `{ user: { id: string; email: string }, session?: { access_token?: string; expires_at?: number } }`
  - 400: walidacja
  - 409: email zajęty

- **POST `/api/auth/login`**
  - Body: `{ email: string; password: string }`
  - 200: jw.
  - 401: neutralny `INVALID_CREDENTIALS`

- **POST `/api/auth/logout`**
  - 204: no content (lub 200)

- **POST `/api/auth/reset-password`**
  - Body: `{ email: string }`
  - 200: `{ message: string }` (neutralnie zawsze po przejściu walidacji; nie ujawniamy, czy konto istnieje)

- **POST `/api/auth/update-password`**
  - Body: `{ password: string; confirm_password: string }`
  - 200: `{ message: string }`
  - 401/400: brak/nieprawidłowa sesja recovery

- **GET `/api/auth/session`**
  - 200: `{ user: { id: string; email: string } | null }`
  - (opcjonalnie) `{ session: ... }` jeśli potrzebne do client-side refresh.

#### Protected endpoints (już istniejące)
Wszystkie dotychczasowe endpointy wymagające auth (np. `/api/flashcards`, `/api/generations`) muszą:
- przestać używać “hardcoded user id”
- wymuszać `401` dla braku autoryzacji
- działać zgodnie z RLS (US-005)

### 2.2. Modele/kontrakty danych (DTO)

Nowe DTO (proponowane do dodania w `src/types.ts`):
- `AuthUserDto`: `{ id: string; email: string }`
- `AuthSessionDto` (opcjonalnie): `{ access_token: string; expires_at: number }`
- `LoginResponse`, `RegisterResponse`, `SessionResponse`

Uwaga: **nie tworzymy własnej tabeli “users” dla auth** – Supabase Auth utrzymuje `auth.users`. Opcjonalnie można dodać tabelę `profiles` na dodatkowe dane (poza zakresem US-001..US-005).

### 2.3. Walidacja danych wejściowych (Zod)

Nowy moduł:
- `src/lib/schemas/auth.schema.ts` (Zod):
  - `LoginSchema`
  - `RegisterSchema`
  - `ResetPasswordRequestSchema`
  - `UpdatePasswordSchema`

Zasady:
- walidujemy **zawsze po stronie backendu** (PRD 3.1).
- używamy `.trim()` dla email (ostrożnie: hasła nie trimujemy).

### 2.4. Obsługa wyjątków i mapowanie błędów Supabase

W API implementujemy mapowanie błędów Supabase Auth na stabilne kody aplikacji:
- `INVALID_CREDENTIALS` → 401 (neutralny komunikat)
- `EMAIL_ALREADY_IN_USE` → 409
- `EMAIL_NOT_CONFIRMED` → 401 (mapujemy do neutralnego komunikatu loginu; nie ujawniamy istnienia konta)
- `VALIDATION_FAILED` → 400
- `AUTH_REQUIRED` → 401
- `INTERNAL_SERVER_ERROR` → 500

Szczegóły techniczne z Supabase (np. surowe error messages) nie powinny trafiać wprost do użytkownika, z wyjątkiem czytelnych przypadków typu “email already registered”.

### 2.5. SSR i renderowanie stron (w kontekście `astro.config.mjs`)

Ponieważ `output: "server"`, strony mogą wykonywać logikę auth **przed renderem**.

Zalecenia:
- Strony auth i protected powinny mieć `export const prerender = false` (jawnie), aby uniknąć przypadkowego prerenderingu w przyszłości.
- Ochrona stron:
  - w `src/pages/flashcards.astro` i `src/pages/generations.astro` odkomentować i docelowo używać `Astro.locals.supabase.auth.getSession()` (albo dedykowanej funkcji guard).
- Dla API routes: używać `locals.supabase` (zgodnie z regułą repo) i wspólnej funkcji `requireUser()` / `getAuthContext()`.

---

## 3. SYSTEM AUTENTYKACJI (Supabase Auth + Astro)

### 3.1. Konfiguracja Supabase Auth

Minimalna konfiguracja w Supabase:
- Provider: **Email + Password** (bez social loginów – zgodnie z US-002).
- (Opcjonalnie) **Email confirmations**:
  - Jeśli włączone: po rejestracji wyświetlamy “sprawdź email”.
  - Jeśli wyłączone: auto-login po rejestracji.
- **Redirect URLs**:
  - dodać domeny środowisk (dev/prod) i ścieżkę callback: `/auth/callback`.
- Reset hasła: backend powinien przekazywać `redirectTo` wskazujące na `/auth/callback?next=/reset-password/confirm` (alternatywnie można dopiąć to w szablonie maila, ale nie jest to jedyna droga).

### 3.2. Sesja i integracja z Astro (cookies + SSR)

Docelowy mechanizm (zalecany):
- Middleware (`src/middleware/index.ts`) tworzy **server-side Supabase client** oparty o cookies i zapisuje go w `context.locals.supabase`.
- Middleware (opcjonalnie) ustawia także:
  - `context.locals.session`
  - `context.locals.user`
  aby strony mogły robić szybkie guardy.

Dlaczego:
- pozwala na **SSR redirect** zanim zrenderuje się strona protected,
- unika przechowywania tokenów w localStorage,
- pasuje do `output: "server"`.

### 3.3. Kompatybilność z Bearer JWT (plan API)

Żeby zachować zgodność z `@.ai/api-plan.md`:
- API endpoints akceptują `Authorization: Bearer {access_token}` jako alternatywę dla cookies.
- Wspólny helper `getAuthenticatedUser()` (serwer) powinien:
  - jeśli jest Bearer → `supabase.auth.getUser(token)`
  - w przeciwnym razie → `supabase.auth.getSession()`/`getUser()` z sesji cookie
  - jeśli brak user → zwrócić `401`.

Na kliencie (React) można wdrożyć:
- `AuthContext` + `AuthApiService`:
  - przechowuje minimalny stan user,
  - opcjonalnie access token (jeśli potrzebny do Bearer),
  - reaguje na `401` globalnie (redirect do `/login`).

### 3.4. RLS i autoryzacja danych (US-005)

Wymuszamy izolację danych w bazie zgodnie z `@.ai/db-plan.md`:
- `flashcards.user_id`, `generations.user_id`, `generation_error_logs.user_id` referencją do `auth.users(id)`.
- RLS policies (minimum):
  - SELECT/UPDATE/DELETE: `USING (user_id = auth.uid())`
  - INSERT: `WITH CHECK (user_id = auth.uid())`

Konsekwencja w aplikacji:
- Backend **nie ufa klientowi** w zakresie `user_id`.
- W insertach/updates:
  - `user_id` jest ustawiany na podstawie uwierzytelnionego użytkownika (z tokenu/cookies),
  - a RLS dodatkowo blokuje przypadki niezgodności.

### 3.5. Bezpieczeństwo i nadużycia (minimum)
- **Brute force / abuse**:
  - wprowadzić podstawowy rate limiting na `/api/auth/login`, `/api/auth/register`, `/api/auth/reset-password` (np. per IP + email).
- **Neutralne komunikaty**:
  - login i reset inicjacji nie zdradzają, czy konto istnieje.
- **Nagłówki bezpieczeństwa**:
  - rekomendowane zgodnie z `@.ai/api-plan.md` (nosniff/deny/HSTS), o ile nie koliduje to z hostingiem i lokalnym dev.

---

## 4. Mapowanie proponowanych modułów (bez implementacji)

### Frontend (Astro/React)
- `src/pages/login.astro`, `src/pages/register.astro`, `src/pages/reset-password.astro`, `src/pages/reset-password/confirm.astro`, `src/pages/auth/callback.astro`
- `src/layouts/AuthLayout.astro`, `src/layouts/AppLayout.astro` (opcjonalnie pozostawiając `src/layouts/Layout.astro` jako BaseLayout)
- `src/components/auth/AuthForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- `src/components/navigation/NavigationBar.tsx`
- `src/lib/hooks/useAuth.ts` (opcjonalnie)
- `src/lib/services/auth-api.service.ts` (client → `/api/auth/*`)

### Backend (Astro API)
- `src/pages/api/auth/login.ts`
- `src/pages/api/auth/register.ts`
- `src/pages/api/auth/logout.ts`
- `src/pages/api/auth/reset-password.ts`
- `src/pages/api/auth/update-password.ts`
- `src/pages/api/auth/session.ts`
- `src/lib/schemas/auth.schema.ts`
- `src/lib/utils/api-helpers.ts` (rozszerzenie o wspólne helpery auth i error mapping)

### System (middleware + Supabase)
- `src/middleware/index.ts` – rozszerzenie o tworzenie serverowego klienta Supabase “SSR” i ustawianie locals user/session.
- `src/db/supabase.client.ts` – rozdzielenie na klient browser/server (jeśli przyjmujemy wariant cookie SSR).

---

## 5. Kryteria akceptacji architektonicznej (checklista)
- Dedykowane strony dla rejestracji i logowania (US-001, US-002).
- Reset hasła: inicjacja email + ustawienie nowego hasła w poprawnym flow (US-004) z neutralnym komunikatem.
- Wylogowanie dostępne z UI, po wylogowaniu zasoby chronione niedostępne (US-003).
- Wszystkie zasoby chronione (strony i API) wymagają auth; brak auth → `401` albo redirect do `/login` (US-003/US-005).
- RLS w Supabase blokuje dostęp do cudzych danych nawet przy ręcznym podaniu ID (US-005).
- Walidacja backendowa Zod dla auth requestów (PRD 3.1).

