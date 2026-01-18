# Architektura UI dla natigo

## 1. Przegląd struktury UI

natigo MVP to aplikacja webowa zorientowana na desktop, która umożliwia użytkownikom szybkie tworzenie fiszek przy pomocy AI oraz zarządzanie nimi. Struktura obejmuje widoki uwierzytelniania, generowania fiszek, listy fiszek z modalem edycji, panel oraz widok sesji powtorek.Całość korzysta z responsywnego designu opartego na Tailwind, gotowych komponenów z Shadcn/ui oraz React.



### Główne ścieżki użytkownika

1. **Ścieżka AI (główna funkcjonalność):** Auth → Dashboard → Generate → Review Candidates → My Flashcards
2. **Ścieżka manualna:** Auth → Dashboard → My Flashcards (+ modal dodawania) → My Flashcards

### Odroczenia w MVP

- **Review Sessions (SRS):** Pełna funkcjonalność powtórek odroczona
- **Wyszukiwanie:** Brak search w My Flashcards
- **Statystyki:** Dashboard bez zaawansowanych metryk
- **Keyboard shortcuts:** Odroczone
- **Rate limiting UI:** Podstawowy komunikat błędu
- **SessionStorage backup:** Odświeżenie strony podczas recenzji = utrata stanu

---

## 2. Lista widoków

### 2.1 Auth Screen (`/login` i `/register`)

**Główny cel:**  
Umożliwienie użytkownikowi zalogowania się lub założenia konta w celu uzyskania dostępu do prywatnych fiszek.

**Kluczowe informacje:**  
- Logo aplikacji natigo
-Formularze z polami e-mail i hasło
- Komunikaty błędów

**Kluczowe komponenty:**

- **AuthForm **
  - Login mode: email, password, przycisk "Log In", link "Need an account?",komunikaty błędów


**UX, dostępność i bezpieczeństwo:**
- Centrowana karta na środku ekranu
-Zabezpieczenia JWT
- Automatyczne przekierowanie do /dashboard po sukcesie

**Edge cases:**
- Email już istnieje: komunikat "This email is already registered"
- Niepoprawne dane logowania: "Invalid email or password"
- Wygasła sesja z innej karty: automatyczne przekierowanie do /login

---

### 2.2 Dashboard (`/dashboard`)

**Główny cel:**  
Centralny punkt dostępu do głównych funkcji aplikacji oraz szybki podgląd ostatniej aktywności.

**Kluczowe informacje:**
- Welcome message z emailem użytkownika i datą
- 3 Quick Action Cards (grid-cols-3)
- Link do pełnej historii

**Kluczowe komponenty:**

- **WelcomeHeader (React)**
  - Wyświetla: "Welcome back, {email}" + data (format: "Sunday, January 18, 2026")
  - Pobiera user z AuthContext

- **QuickActionCard (React)**
  - 3 karty:
    1. "Generate New Flashcards" → /generate (ikona Sparkles, primary color)
    2. "My Flashcards" → /flashcards (ikona Library, counter z liczbą fiszek)
    3. "Start Review" → ukryty w MVP (SRS deferred)
  - Każda karta: ikona, tytuł, krótki opis, clickable

- **RecentActivityList (React, client:load)**
  - Lista 5 ostatnich generacji (fetch GET /api/generations?limit=5)
  - Każdy item: data/czas, metryki (Generated, Accepted, Rejected)
  - Empty state: "No generations yet. Start by generating flashcards!"

**UX, dostępność i bezpieczeństwo:**
- Dashboard dostępny tylko dla zalogowanych (ProtectedRoute)
- Jasna hierarchia wizualna (Welcome → Actions → Recent Activity)
- Quick actions podkreślają główny case use (Generate)


**Edge cases:**
- Brak historii generowania: empty state z CTA do /generate
- Błąd fetchu recent activity: komunikat + "Try Again"
- Zero fiszek w bazie: counter pokazuje "0 flashcards"

---

### 2.3 Generate Screen (`/generate`)

**Główny cel:**  
Umożliwienie użytkownikowi wklejenia tekstu (1000-10000 znaków) i uruchomienia generowania fiszek przez AI oraz ich rewizję (zaakceptuj ,edytuj lub odrzuć)

**Kluczowe informacje:**
- Large textarea (15-20 wierszy)
- Character counter z color-coding
- Inline validation messages
- Ograniczenia długości tekstu (1000-10000 chars)
- Przycisk "Generate Flashcards" (enabled tylko gdy valid)
-lista propozycji fiszek wygenerowanych przez AI, przycisk akceptacji,edycji lub odrzucenia dla każdej fiszki
- Przycisk "Clear"

**Kluczowe komponenty:**

- **GenerateForm (React, client:load)**
  - Textarea z autofocus
  - CharacterCounter component (reusable)
    - Format: "X / 10,000 characters"
    - Color-coding: grey (<1000), green (1000-10000), red (>10000)
  - Inline validation messages:
    - "Please enter at least 1,000 characters"
    - "Maximum 10,000 characters exceeded"
  - Przycisk "Generate Flashcards" (disabled gdy invalid)
  -Przyciski akcji (zapisz wszystkie,zapisz zaakceptowane)
  - Przycisk "Clear" (secondary)
  -wskaźnik ładowania (skeleton),
  -komunikaty o błędach


**UX, dostępność i bezpieczeństwo:**
-intuicyjny formularz
-walidacja długości tekstu (1000 - 10000 znaków)
-responsywność
-czytelne komuniakty i inline komunikaty o błędach



---

### 2.4 Review Candidates Screen (`/generate/review/:generation_id`)

**Główny cel:**  
Umożliwienie użytkownikowi szybkiej recenzji kandydatów fiszek zwróconych przez AI (zaakceptuj/edytuj/odrzuć) oraz zbiorczego zapisu zaakceptowanych fiszek do bazy.

**Kluczowe informacje:**
- Breadcrumbs: "Generate > Review Candidates"
- Sticky stats bar: Generated, Accepted, Edited, Rejected counts (live update)
- Lista kandydatów z sequential IDs (#1, #2, #3...)
- Two-column layout dla każdego kandydata (Front | Back)
- Edytowalne pola z character counters
- Action buttons: Accept (green outline), Reject (red outline)


**Kluczowe komponenty:**

- **ReviewBreadcrumbs (React)**
  - Breadcrumbs: "Generate > Review Candidates"
  - Klikalne linki

- **ReviewStatsBar (React, sticky top)**
  - Wyświetla: "Generated: X | Accepted: Y | Edited: Z | Rejected: W"
  - Live update na podstawie decisions Map
  - Color-coded (grey, green, orange, red)

- **CandidatesList (React, client:load)**
  - Fetch generation details: GET /api/generations/:id (metadata + candidates)
  - Local state:
    - candidates: Candidate[] (array z sequential IDs)
    - decisions: Map<number, 'accepted' | 'rejected' | 'edited'>
    - editedContent: Map<number, {front: string, back: string}>

- **CandidateCard (React)**
  - Sequential number badge (#1, #2, #3...)
  - Status badge (Accepted, Edited, Rejected, Pending)
  - Two-column layout:
    - Left: Front field (Input z character counter 1-200 chars)
    - Right: Back field (Textarea z character counter 1-500 chars)
  - Action buttons: "Accept" (green), "Reject" (red)
  - Auto-set status do "Edited" on first content change
  - Inline validation (character limits)

- **ReviewBottomBar (React, sticky bottom)**
  - "Save X flashcards" button (disabled gdy 0 accepted/edited)
  - "Cancel" button (secondary)
  - Save action:
    - Build payload: { flashcards: [...] } z was_edited flag
    - POST /api/generations/:generation_id/save
    - Success: toast "Successfully saved X flashcards!" + redirect /flashcards?source=ai-full
    - Error: inline message + "Try Again" button

**UX, dostępność i bezpieczeństwo:**
- Sticky stats bar i bottom bar zawsze widoczne podczas scrollowania
- Sequential IDs (#1, #2...) łatwiejsze do zapamiętania niż UUIDs
- Inline editing z character counters zapobiega błędom walidacji
- Keyboard shortcuts odroczone, ale tab navigation działa
- Status badges jasno komunikują stan każdego kandydata
- Bulk save transakcyjny (all or nothing)
- Disabled save button gdy brak zaakceptowanych

**Edge cases:**
- Page refresh podczas recenzji: utrata stanu, redirect /generate z komunikatem "Session lost. Please generate again."
- Exit bez zapisu: kandydaci lost, user musi regenerować (confirmation dialog opcjonalne)
- Wszystkie kandydaty odrzucone: disabled save button + informacja "No flashcards to save"
- AI zwrócił 0 kandydatów: redirect /generate z komunikatem "No flashcards generated. Try different text."
- Bulk save failed: inline error + "Try Again" (state persists w komponencie)
- Invalid edit (empty field): disabled accept button + inline validation
- Próba zapisu dwa razy (idempotencja): błąd 400 "Already saved" + redirect /flashcards

---

### 2.5 My Flashcards Screen (`/flashcards`)

**Główny cel:**  
Centralne miejsce do przeglądania, edycji i usuwania zapisanych fiszek.

**Kluczowe informacje:**
- Przycisk "Add Manual Flashcard"
- Grid layout (grid-cols-2) fiszek
- Pagination (20 items per page)
- Empty state z CTAs

**Kluczowe komponenty:**

- **FlashcardsHeader (React)**
  - Tytuł "My Flashcards"
  - Przycisk "Add Manual Flashcard" (primary, otwiera modal)

- **FlashcardsFilterBar (React)**
  - Source dropdown: All, Manual, AI-generated, AI-edited (mapuje do API: manual, ai-full, ai-edited)
  - Sort by dropdown: Created Date, Updated Date
  - Order dropdown: Newest First, Oldest First




- **FlashcardModal (React, Shadcn Dialog)**
  - Używany do Add i Edit
  - Pola: Front (Input, 1-200 chars), Back (Textarea, 1-500 chars)
  - Character counters
  - Validation inline
  - Save action:
    - Add: POST /api/flashcards (body: [{ front, back, source: "manual" }])
    - Edit: PUT /api/flashcards/:id (body: { front, back })
  - Success: toast + close modal + refetch list
  - Error: inline message + "Try Again"

- **DeleteFlashcardDialog (React, Shadcn AlertDialog)**
  - Trigger: "Delete" z dropdown menu
  - Treść: "Are you sure? This action cannot be undone."
  - Actions: "Cancel", "Delete" (destructive)
  - Delete action: DELETE /api/flashcards/:id
  - Success: toast "Flashcard deleted" + refetch list
  - Error: toast "Failed to delete. Try again."

- **Pagination (React, Shadcn Pagination)**
  - 20 items per page
  - Buttons: Previous, Next, page numbers
  - URL sync: ?page=X

**UX, dostępność i bezpieczeństwo:**
- Browser back/forward działa poprawnie
- Grid responsive (grid-cols-2, może zostać zmienione w przyszłości)
- Empty states z jasnym CTA ("Generate flashcards" lub "Add manual flashcard")
- Dropdown menu keyboard-accessible
- AlertDialog wyraźnie komunikuje nieodwracalność delete (hard delete)
- Source badge color-coded (Manual: grey, AI: blue, Edited: orange)

**Edge cases:**
- Brak fiszek: empty state "You don't have any flashcards yet. Start by generating or creating manually."
- Brak fiszek po filtrze: empty state "No flashcards match your filters. Try adjusting them."
- Delete podczas wyświetlania listy: refetch + toast notification
- Delete non-existent flashcard: 404 → toast "Flashcard not found"
- Edit validation failed: inline errors w modalu, save disabled
- Network error podczas fetch: error state z "Try Again"
- Page > total_pages: pokazuj empty last page lub redirect do page 1

---



### 2.7 Settings Screen (`/settings`)

**Główny cel:**  
Zarządzanie podstawowymi ustawieniami konta (email display, logout, delete account). Minimalna funkcjonalność w MVP.

**Kluczowe informacje:**
- Account Information section: email (read-only)
- Danger Zone: Delete Account button
- Logout button na dole
- About section: app version

**Kluczowe komponenty:**

- **SettingsHeader (React)**
  - Tytuł "Settings"

- **AccountInformationSection (React)**
  - Label "Email"
  - Value: user.email (read-only, grey text)
  - NO "Change Email" button w MVP (hidden)
  - NO "Change Password" button w MVP (hidden)

- **DangerZoneSection (React)**
  - Header "Danger Zone" (red text)
  - "Delete Account" button (destructive, red)
  - Trigger: AlertDialog
    - Treść: "Are you sure you want to delete your account? This action cannot be undone. All your flashcards will be permanently deleted."
    - Actions: "Cancel", "Delete Account" (destructive)
  - Delete action: DELETE /api/users/:id (mock w MVP, może być localStorage clear)
  - Success: logout + redirect /login + toast "Account deleted"

- **AboutSection (React)**
  - App version: "natigo v1.0.0 (MVP)"

- **LogoutButton (React)**
  - Secondary button na dole
  - Action: AuthContext.logout() → clear localStorage + redirect /login

**UX, dostępność i bezpieczeńność:**
- Settings minimalne w MVP (no clutter)
- Future features hidden (nie pokazywane jako disabled)
- Delete account wyraźnie w "Danger Zone"
- AlertDialog double-confirmation dla delete account
- Logout zawsze dostępny
- NO "type DELETE to confirm" complexity w MVP

**Edge cases:**
- Delete account error: toast "Failed to delete account. Try again."
- Logout error: force clear localStorage + redirect (best effort)

---

### 2.8 Navigation Topbar (obecny na wszystkich widokach po zalogowaniu)

**Główny cel:**  
Globalny punkt nawigacji między głównymi ekranami aplikacji.

**Kluczowe informacje:**
- Fixed top, full width, 64px height
- Logo (left) clickable → /dashboard
- Navigation links (center): Dashboard, Generate, My Flashcards
- User menu (right): avatar/initial + dropdown (email display, Settings, Logout)

**Kluczowe komponenty:**

- **NavigationBar (React, Shadcn Navigation Menu)**
  - Logo: "natigo" (font-bold, clickable)
  - Navigation links:
    - Dashboard → /dashboard
    - Generate → /generate
    - My Flashcards → /flashcards
    - NO "Review" link w MVP (SRS deferred)
  - Active state: underline + bold dla current page
  - User dropdown (Shadcn DropdownMenu):
    - Trigger: Avatar z initial (pierwsza litera email)
    - Menu items:
      - Email display (disabled, grey)
      - Separator
      - Settings → /settings
      - Logout (logout action)

**UX, dostępność i bezpieczeństwo:**
- Fixed position zapewnia zawsze widoczną nawigację
- Active state jasno komunikuje current location
- Keyboard navigation (tab, enter, escape)
- Dropdown accessible (ARIA)
- Logo jako home button (convention)
- NO badges z counters w MVP

**Edge cases:**
- Logout z dropdown: logout + redirect /login
- Active state update on route change (React Router lub Astro routing)

---

## 3. Mapa podróży użytkownika

### 3.1 Przepływ AI (główny case use)

```
[Landing] → [/login]
   ↓ (register/login)
[/dashboard]
   ↓ (click "Generate New Flashcards")
[/generate]
   ↓ (paste text, validate, click "Generate")
[Loading state] (30s max)
   ↓ (success)
[/generate/review/:id]
   ↓ (review: accept/edit/reject każdego kandydata)
   ↓ (click "Save X flashcards")
[API: POST /api/generations/:id/save]
   ↓ (success)
[Toast: "Successfully saved X flashcards!"]
   ↓ (redirect)
[/flashcards?source=ai-full]
```

**Kluczowe momenty:**
- **Moment 1:** User wkleja tekst → walidacja char counter → feedback
- **Moment 2:** Loading state AI → jasny komunikat "This may take up to 30 seconds"
- **Moment 3:** Recenzja kandydatów → inline editing, visual feedback (status badges)
- **Moment 4:** Bulk save → toast success → redirect do saved flashcards

**Punkty bólu i rozwiązania:**
- **Ból:** AI może zwrócić słabe kandydaty → **Rozwiązanie:** inline editing, reject action, jasne status badges
- **Ból:** Długi czas generowania → **Rozwiązanie:** loading state z komunikatem + progress indicator
- **Ból:** Przypadkowe odświeżenie strony → **Rozwiązanie:** komunikat "Session lost" + redirect /generate (no sessionStorage backup w MVP)
- **Ból:** Brak pewności czy zapisało się → **Rozwiązanie:** toast success + redirect do listy fiszek

---

### 3.2 Przepływ manualny

```
[/dashboard]
   ↓ (click "My Flashcards")
[/flashcards]
   ↓ (click "Add Manual Flashcard")
[FlashcardModal]
   ↓ (fill front/back, validate, save)
[API: POST /api/flashcards]
   ↓ (success)
[Toast: "Flashcard created!"]
   ↓ (modal close, refetch list)
[/flashcards] (updated list)
```

**Kluczowe momenty:**
- **Moment 1:** User otwiera modal → clear form
- **Moment 2:** Inline validation → character counters, disabled save gdy invalid
- **Moment 3:** Success → toast + modal close + list update

**Punkty bólu i rozwiązania:**
- **Ból:** Validation errors niejasne → **Rozwiązanie:** inline messages, character counters
- **Ból:** Modal nie zamyka się → **Rozwiązanie:** explicit close button + escape key
- **Ból:** Lista nie aktualizuje się → **Rozwiązanie:** refetch po success

---

### 3.3 Przepływ edycji/usuwania fiszki

```
[/flashcards]
   ↓ (click dropdown na karcie)
[Dropdown menu: Edit | Delete]
   ↓ (click Edit)
[FlashcardModal (pre-filled)]
   ↓ (edit fields, save)
[API: PUT /api/flashcards/:id]
   ↓ (success)
[Toast: "Flashcard updated!"]
   ↓ (modal close, refetch)
[/flashcards] (updated)

-- OR --

[Dropdown menu: Edit | Delete]
   ↓ (click Delete)
[AlertDialog: "Are you sure?"]
   ↓ (click Delete)
[API: DELETE /api/flashcards/:id]
   ↓ (success)
[Toast: "Flashcard deleted"]
   ↓ (refetch)
[/flashcards] (updated)
```

**Kluczowe momenty:**
- **Moment 1:** Dropdown menu → clear actions (Edit, Delete)
- **Moment 2:** Delete → AlertDialog confirmation (safety)
- **Moment 3:** Success → toast + list update

**Punkty bólu i rozwiązania:**
- **Ból:** Przypadkowe delete → **Rozwiązanie:** AlertDialog confirmation
- **Ból:** Edit nie zapisuje → **Rozwiązanie:** disabled save button gdy invalid + inline validation
- **Ból:** Deleted item nadal widoczny → **Rozwiązanie:** refetch list po delete

---


## 4. Układ i struktura nawigacji

### 4.1 Nawigacja globalna (Horizontal Topbar)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Dashboard | Generate | My Flashcards│
└─────────────────────────────────────────────────────────────┘
```

**Hierarchia:**
- **Level 1 (Primary):** Dashboard, Generate, My Flashcards
- **Level 2 (Dropdown):** Settings, Logout (w user menu)

**Navigation behavior:**
- Active state: underline + bold dla current page
- Logo clickable → /dashboard (convention)
- User dropdown: hover/click → show menu
- Keyboard: tab navigation, enter to activate, escape to close dropdown
- Mobile: NO mobile menu w MVP (desktop-only)

**Nawigacja hierarchiczna:**
- Dashboard = hub (central point)
- Generate → Review = parent-child relationship (breadcrumbs)
- My Flashcards → Modals = overlay navigation (nie zmienia route)




---

### 4.3 URL Structure i parametry

**Routes:**
- `/login` - Auth screen
- `/dashboard` - Dashboard
- `/generate` - Generate screen
- `/generate/review/:generation_id` - Review candidates (dynamic)
- `/flashcards` - My Flashcards list
- `/settings` - Settings

**URL Parameters:**
- `/flashcards?generation_id=xxx` - Filter by generation session

**Rationale:**
- Parametry w URL umożliwiają sharing links
- Browser back/forward działa poprawnie
- Bookmarking filtered views
- Consistent z web conventions

---

## 5. Kluczowe komponenty

### 5.1 Layout Components

#### NavigationBar
- **Typ:** React (client:load)
- **Użycie:** Wszystkie widoki po zalogowaniu
- **Props:** currentPath: string
- **State:** userMenuOpen: boolean
- **Responsywności:** Fixed top, 64px height, full width
- **Dependencies:** Shadcn Navigation Menu, Shadcn Dropdown Menu

#### ProtectedRoute
- **Typ:** React HOC (Higher Order Component)
- **Użycie:** Wrap wszystkie widoki wymagające auth
- **Logic:** Check user w AuthContext, redirect do /login jeśli null
- **Props:** children: ReactNode

#### Footer
- **Typ:** React
- **Użycie:** Opcjonalnie na wszystkich widokach
- **Content:** Copyright, links (Privacy, Terms - opcjonalne w MVP)

---

### 5.2 Auth Components

#### AuthForm
- **Typ:** React (client:load)
- **Użycie:** /login
- **Props:** initialMode?: 'login' | 'register'
- **State:** mode, email, password, confirmPassword, isLoading, error
- **Validation:** email format, password min 8 chars, passwords match
- **API Calls:** POST /api/auth/login, POST /api/auth/register (mock w MVP)
- **Dependencies:** Shadcn Input, Shadcn Button



---

### 5.3 Generate Components

#### GenerateForm
- **Typ:** React (client:load)
- **Użycie:** /generate
- **State:** inputText, isLoading, error
- **Validation:** 1000-10000 chars
- **API Call:** POST /api/generations
- **Dependencies:** Shadcn Textarea, CharacterCounter, LoadingSpinner

#### CharacterCounter
- **Typ:** React (reusable)
- **Props:** current: number, max: number, min?: number
- **Logic:** Color-coding (grey, green, red)
- **Render:** "{current} / {max} characters"

---

### 5.4 Review Components

#### CandidatesList
- **Typ:** React (client:load)
- **Użycie:** /generate/review/:id
- **State:** candidates, decisions Map, editedContent Map, isLoading, error, isSaving
- **API Calls:** GET /api/generations/:id, POST /api/generations/:id/save
- **Children:** CandidateCard (repeated), ReviewStatsBar, ReviewBottomBar

#### CandidateCard
- **Typ:** React (memo dla performance)
- **Props:** candidate, decision, onAccept, onReject, onEdit
- **State:** localFront, localBack (dla editing)
- **Validation:** inline character limits
- **Dependencies:** Shadcn Input, Shadcn Textarea, Shadcn Button, Shadcn Badge

#### ReviewStatsBar
- **Typ:** React
- **Props:** generated, accepted, edited, rejected
- **Render:** Sticky top, color-coded counts
- **Style:** flex layout, gap-4, background, border-bottom

#### ReviewBottomBar
- **Typ:** React
- **Props:** acceptedCount, onSave, onCancel, isSaving
- **Render:** Sticky bottom, "Save X flashcards" button
- **Logic:** Disabled button gdy acceptedCount === 0

---

### 5.5 Flashcards Components

#### FlashcardsGrid
- **Typ:** React (client:load)
- **Użycie:** /flashcards
- **State:** flashcards, filters, page, isLoading, error
- **API Call:** GET /api/flashcards (with query params)
- **Children:** FlashcardCard (repeated), Pagination

#### FlashcardCard
- **Typ:** React (memo)
- **Props:** flashcard, onEdit, onDelete
- **Render:** Truncated front/back, source badge, date, dropdown menu
- **Style:** Card z hover state, grid item
- **Dependencies:** Shadcn Card, Shadcn Dropdown Menu, Shadcn Badge

#### FlashcardModal
- **Typ:** React (Shadcn Dialog)
- **Props:** mode: 'add' | 'edit', flashcard?: Flashcard, onSuccess
- **State:** front, back, isLoading, error
- **Validation:** 1-200 chars (front), 1-500 chars (back)
- **API Calls:** POST /api/flashcards (add), PUT /api/flashcards/:id (edit)
- **Dependencies:** Shadcn Dialog, Shadcn Input, Shadcn Textarea, CharacterCounter

#### DeleteFlashcardDialog
- **Typ:** React (Shadcn AlertDialog)
- **Props:** flashcardId, onSuccess
- **API Call:** DELETE /api/flashcards/:id
- **Dependencies:** Shadcn AlertDialog



---





### 5.8 Mapowanie komponentów do API Endpoints

| Komponent | API Endpoint | Method | Purpose |
|-----------|--------------|--------|---------|
| AuthForm | /api/auth/login | POST | Login user (mock) |
| AuthForm | /api/auth/register | POST | Register user (mock) |
| GenerateForm | /api/generations | POST | Generate candidates |
| CandidatesList | /api/generations/:id | GET | Fetch generation details |
| ReviewBottomBar | /api/generations/:id/save | POST | Bulk save flashcards |
| FlashcardsGrid | /api/flashcards | GET | List flashcards (with filters) |
| FlashcardModal | /api/flashcards | POST | Create flashcard (manual) |
| FlashcardModal | /api/flashcards/:id | PUT | Update flashcard |
| DeleteFlashcardDialog | /api/flashcards/:id | DELETE | Delete flashcard |
| GenerationCard | /api/flashcards?generation_id=X | GET | Filter flashcards by generation |

---

