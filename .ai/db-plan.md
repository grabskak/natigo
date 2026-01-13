1. Lista tabel z ich kolumnami, typami danych i ograniczeniami

#### Typy pomocnicze
- `flashcard_source` enum: `'manual' | 'ai-full' | 'ai-edited' ` (utrzymuje spójność źródeł fiszek i metryk).

#### `flashcards`
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
- `generation_id uuid REFERENCES generations(id) ON DELETE SET NULL`.
- `front text NOT NULL CHECK (char_length(btrim(front)) BETWEEN 1 AND 200)`.
- `back text NOT NULL CHECK (char_length(btrim(back)) BETWEEN 1 AND 500)`.
- `source flashcard_source NOT NULL`.
- `created_at timestamptz NOT NULL DEFAULT now()`.
- `updated_at timestamptz NOT NULL DEFAULT now()`.
- `CHECK ( (source IN ('manual','flashcard') AND generation_id IS NULL) OR (source IN ('ai-full','ai-edited') AND generation_id IS NOT NULL) )` zapewnia spójność powiązań z generacjami.

#### `generations`
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
- `input_text_hash varchar(128) NOT NULL`.
- `input_text_length integer NOT NULL CHECK (input_text_length BETWEEN 1000 AND 10000)`.
- `duration_ms integer NOT NULL`.
- `generated_count integer NOT NULL CHECK (generated_count >= 0)`.
- `accepted_edited_count integer NULLABLE`.
- `accepted_unedited_count integer NULLABLE`.
- `created_at timestamptz NOT NULL DEFAULT now()`.
- `updated_at timestamptz NOT NULL DEFAULT now()`.
- `CHECK (accepted_edited_count + accepted_unedited_count <= generated_count)`.

#### `generation_error_logs`
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
- `generation_id uuid REFERENCES generations(id) ON DELETE CASCADE`.
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
- `error_code varchar(64) NOT NULL`.
- `error_message text NOT NULL CHECK (char_length(error_message) <= 1000)`.
- `created_at timestamptz NOT NULL DEFAULT now()`.

2. Relacje między tabelami
- `auth.users (1) → flashcards (N)` poprzez `flashcards.user_id`.
- `auth.users (1) → generations (N)` poprzez `generations.user_id`.
- `auth.users (1) → generation_error_logs (N)` poprzez `generation_error_logs.user_id`.
- `generations (1) → flashcards (N)` poprzez `flashcards.generation_id` (tylko dla źródeł AI).
- `generations (1) → generation_error_logs (N)` poprzez `generation_error_logs.generation_id`.

3. Indeksy
- `flashcards_user_id_idx` na (`user_id`, `created_at`) dla listowania i sortowania.
- `flashcards_generation_id_idx` na (`generation_id`) dla szybkiego pobierania fiszek z danej sesji.
- `generations_user_id_idx` na (`user_id`, `created_at`) dla historii generacji.
- `generation_error_logs_user_id_idx` na (`user_id`, `created_at`) dla panelu błędów użytkownika.
- `generation_error_logs_generation_id_idx` na (`generation_id`) do diagnostyki błędów konkretnej sesji.

4. Zasady PostgreSQL (RLS)
- `flashcards`: `ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;`  
  - SELECT/UPDATE/DELETE policy: `USING (user_id = auth.uid())`.  
  - INSERT policy: `WITH CHECK (user_id = auth.uid())`.
- `generations`: `ALTER TABLE generations ENABLE ROW LEVEL SECURITY;`  
  - SELECT/UPDATE/DELETE policy: `USING (user_id = auth.uid())`.  
  - INSERT policy: `WITH CHECK (user_id = auth.uid())`.
- `generation_error_logs`: `ALTER TABLE generation_error_logs ENABLE ROW LEVEL SECURITY;`  
  - SELECT policy: `USING (user_id = auth.uid())` (pozwala użytkownikowi przeglądać własne błędy).  
  - INSERT policy: `WITH CHECK (user_id = auth.uid())` (backend zapisuje log tylko dla właściwego użytkownika).  
  - Opcjonalnie brak UPDATE/DELETE policy (tylko system) lub restrykcja dla administratorów przez osobne role.

5. Dodatkowe uwagi i wyjaśnienia
- `gen_random_uuid()` wymaga rozszerzenia `pgcrypto`, które jest domyślnie aktywne w Supabase.
- `updated_at` powinien być automatycznie aktualizowany przez trigger (np. `SET updated_at = now()` w `BEFORE UPDATE`), aby zachować spójność znaczników czasu.
- `input_text_hash` przechowuje wyłącznie skrót treści wejściowej, co spełnia wymagania prywatności PRD.
- `error_message` powinien być sanityzowany w warstwie aplikacji przed zapisem; długość ograniczona do 1000 znaków zapobiega nadużyciom.
- Idempotencja bulk save powinna wykorzystywać `flashcards.id` (lub inny deterministyczny identyfikator przekazywany z klienta) i operację UPSERT, aby aktualizacja decyzji nie tworzyła duplikatów.

