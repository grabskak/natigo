# Dokument wymagań produktu (PRD) - natigo

## 1. Przegląd produktu

natigo to webowa aplikacja do nauki z wykorzystaniem fiszek i spaced repetition, która minimalizuje koszt czasowy tworzenia materiału. Kluczową wartością MVP jest generowanie propozycji fiszek przez modele LLM (poprzez API) na podstawie wklejonego tekstu oraz szybka recenzja tych propozycji przez użytkownika (zaakceptuj/edytuj/odrzuć), z możliwością zbiorczego zapisu do bazy.Głównym założeniem biznesowym na pierwsze 3 miesiące działania jest pozyskanie grupy 100 aktywnych użytkowników, bez nacisku na monetyzację.

Grupa docelowa (MVP):
- Osoby uczące się 
- Użytkownicy, którzy chcą szybko zamieniać notatki/artykuły na fiszki, bez ręcznego formatowania materiału.

Kluczowe założenia MVP:
- Aplikacja webowa (brak aplikacji mobilnych).
- Użytkownicy mają konta, aby fiszki były prywatne i trwałe.
- Powtórki działają w oparciu o gotowy algorytm SRS (integracja), bez budowania własnego zaawansowanego systemu.
- Generowanie AI odbywa się synchronicznie z perspektywy użytkownika (po zakończeniu procesu pojawia się lista kandydatów).

Definicje pojęć:
- Fiszka: para pól przód/tył, gdzie dla MVP domyślny kierunek to EN→PL (przód: EN, tył: PL).
- Kandydat fiszki: propozycja fiszki zwrócona przez AI, przed zapisem do bazy.
- Sesja generowania: pojedyncze uruchomienie generowania AI dla wklejonego tekstu i wyświetlenie listy kandydatów.
- Decyzja użytkownika: akcja na kandydacie (zaakceptuj/edytuj/odrzuć) oraz finalny zbiorczy zapis.

## 2. Problem użytkownika

Główny problem:
- Manualne tworzenie wysokiej jakości fiszek jest czasochłonne, co zniechęca do korzystania z efektywnej metody spaced repetition.

Konsekwencje problemu:
- Użytkownicy rezygnują z tworzenia fiszek lub tworzą ich zbyt mało, aby utrzymać regularność powtórek.
- Użytkownicy tworzą fiszki o niskiej jakości (zbyt długie, niejednoznaczne, bez kontekstu), co obniża efektywność nauki.

Jak MVP rozwiązuje problem:
- AI generuje propozycje fiszek z wklejonego tekstu (1000–10 000 znaków), a użytkownik w krótkim czasie recenzuje i zapisuje tylko dobre pozycje.
- Użytkownik może w razie potrzeby tworzyć fiszki manualnie oraz zarządzać bazą (przegląd, edycja, usuwanie).
- Gotowy algorytm SRS pozwala od razu korzystać z harmonogramu powtórek bez budowy własnego, złożonego systemu.

Ryzyka i czynniki krytyczne:
- Niska jakość kandydatów AI obniży adopcję (cel: wysoki poziom akceptacji).
- Zbyt długi lub zbyt złożony proces recenzji obniży udział AI w tworzeniu fiszek (cel: większość fiszek tworzona z AI).
- Błędy w autoryzacji/izolacji danych zniszczą zaufanie (wymóg: standardy bezpieczeństwa, RLS, walidacja).

## 3. Wymagania funkcjonalne

3.1 Konta użytkowników i bezpieczeństwo
- Rejestracja konta za pomocą email + hasło.
- Logowanie email + hasło.
- Wylogowanie.
- Reset hasła (minimalnie: przepływ inicjowany przez email).
- Autoryzacja dostępu do zasobów: użytkownik ma dostęp tylko do własnych fiszek i własnych sesji generowania.
- Walidacja danych wejściowych po stronie backendu (nie ufać klientowi).
- Standardowe praktyki bezpieczeństwa:
  - Hasła przechowywane wyłącznie jako bezpieczne hashe (po stronie dostawcy auth).
  - Wymuszona kontrola dostępu na poziomie bazy (RLS).
  - Ochrona przed podstawowymi nadużyciami (rate limiting lub limity na generowanie; minimalny zestaw).

3.2 Model fiszek (CRUD)
- Utworzenie fiszki manualnie:
  - Pola: przód (tekst), tył (tekst).
  - Minimalne walidacje: niepuste, limity długości, trimming białych znaków.
- Przegląd fiszek:
  - Lista zapisanych fiszek użytkownika i wyświetlanie w ramach listy "Moje fiszki".
  - Możliwość wejścia w szczegóły.
- Edycja fiszki:
  - Zmiana pól przód/tył z walidacją.
- Usunięcie fiszki:
  - Możliwość trwałego usunięcia (MVP).


3.3 AI generowanie fiszek (kopiuj-wklej)
- Wejście tekstu:
  - Użytkownik wkleja tekst o długości 1000–10 000 znaków.
  - System informuje o limitach i blokuje start generowania, gdy warunki nie są spełnione.
- Uruchomienie generowania:
  - Backend przesyła treść do LLM przez API.
  - Obsługa błędów: time-out, błąd dostawcy, błąd walidacji, przekroczenie limitów.
  - Proces synchroniczny z perspektywy UI: po zakończeniu generowania wyświetla się lista kandydatów.
- Wynik generowania:
  - Lista kandydatów fiszek: każdy kandydat ma przód/tył.
  - Kandydaci są wyświetlani pod formularzem po zakończeniu procesu.
  - Kandydaci nie są automatycznie zapisywani jako fiszki w bazie.
- Recenzja kandydatów:
  - Dla każdego kandydata użytkownik może:
    - zaakceptować bez zmian,
    - edytować (przód i/lub tył) i zaakceptować,
    - odrzucić.
 

3.4 Logowanie danych do metryk 
 -zbieranie informacji o tym. ile fiszek zostało wygenerowanych przez AI i ile z nich ostatecznie zaakceptowano

3.5 Powtórki (SRS) – integracja z gotowym algorytmem
 -zapewnienie mechanizmu przepisywania fiszek do harmonogramu powtórek (korzystanie z gotowego algorytmu)
 -brak dodatkowych metadanych i zaawansowanych funkcji powiadomień w MVP

3.6 Wymagania niefunkcjonalne (MVP)
- Dostępność i UX (minimum):
  - jasne komunikaty walidacyjne dla limitów tekstu i pól fiszki,
  - obsługa stanów ładowania i błędów dla generowania AI i bulk save,
  - brak utraty pracy w oczywistych sytuacjach (np. przypadkowe odświeżenie podczas recenzji: w MVP dopuszczalne, ale preferowane ostrzeżenie lub autosave stanu w pamięci przeglądarki).
- Wydajność:
  - generowanie AI może trwać dłużej; UI musi jasno to komunikować.
- Niezawodność:
  - bulk save powinien być transakcyjny (albo zapis całości, albo czytelny błąd i brak częściowych efektów).

## 4. Granice produktu

4.1 W zakresie MVP
- Aplikacja webowa.
- Konta użytkowników (email + hasło) do przechowywania prywatnych fiszek.
- Manualne tworzenie fiszek (przód/tył).
- AI generowanie kandydatów fiszek z wklejonego tekstu (1000–10 000 znaków).
- Recenzja kandydatów (zaakceptuj/edytuj/odrzuć) oraz zbiorczy zapis.
- Przeglądanie, edycja i usuwanie zapisanych fiszek.
- Integracja z gotowym algorytmem powtórek i ekran wykonywania powtórek.
- Logi do pomiaru metryk sukcesu w bazie danych (bez zewnętrznych narzędzi).

4.2 Poza zakresem MVP
- Własny, zaawansowany algorytm powtórek (np. systemy na poziomie SuperMemo/Anki z rozbudowaną konfiguracją).
- Import wielu formatów (PDF, DOCX itp.).
- Współdzielenie zestawów fiszek między użytkownikami.
- Integracje z innymi platformami edukacyjnymi.
- Aplikacje mobilne.

4.3 Założenia i ograniczenia
- Długość wejściowego tekstu jest ograniczona (1000–10 000 znaków), aby kontrolować koszt i jakość generowania.
- Produkt nie wymaga zaawansowanej analityki zewnętrznej; metryki liczymy na podstawie tabel logów.

## 5. Historyjki użytkowników

US-001
- Tytuł: Rejestracja konta
- Opis: Jako nowy użytkownik chcę założyć konto przez email i hasło, aby moje fiszki były prywatne i zapisane na stałe.
- Kryteria akceptacji:
  - Rejestracja odbywa się na dedykowanej stronie.
  - Użytkownik musi podać email i hasło , potwierdzić hasło oraz utworzyć konto.
  - System waliduje poprawność formatu email i minimalne wymagania hasła.
  - Po poprawnej rejestracji użytkownik jest zalogowany lub otrzymuje jasną informację o kolejnym kroku (np. potwierdzenie email, jeśli stosowane).
  - Próba rejestracji z istniejącym emailem kończy się czytelnym błędem.

US-002
- Tytuł: Logowanie
- Opis: Jako użytkownik chcę zalogować się emailem i hasłem, aby uzyskać dostęp do moich fiszek i powtórek.
- Kryteria akceptacji:
  - Logowanie odbywa się na dedykowanej stronie.
  - Poprawne dane logowania umożliwiają dostęp do aplikacji.
  - Niepoprawne dane logowania zwracają czytelny komunikat błędu bez ujawniania, czy email istnieje.
  - Po zalogowaniu użytkownik widzi tylko własne dane.
   - Nie korzystamy z zewnętrznych serwisów logowania (np. Google, GitHub).

US-003
- Tytuł: Wylogowanie
- Opis: Jako użytkownik chcę się wylogować, aby zakończyć sesję na danym urządzeniu.
- Kryteria akceptacji:
  - Użytkownik może wylogować się z poziomu interfejsu.
  - Po wylogowaniu zasoby wymagające logowania są niedostępne.

US-004
- Tytuł: Reset hasła
- Opis: Jako użytkownik, który nie pamięta hasła, chcę je zresetować, aby odzyskać dostęp do konta.
- Kryteria akceptacji:
  - Użytkownik może zainicjować reset hasła, podając email.
  - System pokazuje neutralny komunikat (nie ujawnia, czy konto istnieje).
  - Użytkownik może ustawić nowe hasło w ramach poprawnego przepływu resetu.

US-005
- Tytuł: Ochrona dostępu do fiszek (autoryzacja)
- Opis: Jako użytkownik chcę mieć pewność, że nikt poza mną nie zobaczy ani nie zmieni moich fiszek.
- Kryteria akceptacji:
  - Użytkownik nie może odczytać fiszek innego użytkownika nawet przy bezpośrednim odwołaniu do identyfikatorów.
  - Użytkownik nie może edytować ani usuwać fiszek innego użytkownika.
  - System wymusza kontrolę dostępu po stronie backendu i bazy danych (RLS).

US-006
- Tytuł: Utworzenie fiszki manualnie
- Opis: Jako użytkownik chcę dodać fiszkę ręcznie, aby tworzyć materiał bez AI.
- Kryteria akceptacji:
  - Formularz ma pola przód i tył.
  - Nie można zapisać fiszki z pustym przodem lub tyłem.
  - Po zapisie fiszka pojawia się na liście fiszek użytkownika.

US-007
- Tytuł: Walidacja długości i formatowania fiszki
- Opis: Jako użytkownik chcę, aby system odrzucał ewidentnie błędne treści, aby utrzymać jakość danych.
- Kryteria akceptacji:
  - System przycina wiodące i końcowe białe znaki w polach.
  - System odrzuca treści przekraczające ustalone limity długości (limity muszą być zdefiniowane w specyfikacji implementacyjnej).
  - Komunikaty walidacyjne są czytelne i wskazują, co poprawić.

US-008
- Tytuł: Lista zapisanych fiszek
- Opis: Jako użytkownik chcę przeglądać moje fiszki, aby widzieć stan mojego zbioru.
- Kryteria akceptacji:
  - Użytkownik widzi listę swoich fiszek.
  - Lista nie zawiera fiszek innych użytkowników.
  - Gdy brak fiszek, system pokazuje stan pusty z sugestią dodania fiszki lub wygenerowania przez AI.

US-009
- Tytuł: Podgląd szczegółów fiszki
- Opis: Jako użytkownik chcę otworzyć fiszkę, aby zobaczyć pełną treść przodu i tyłu.
- Kryteria akceptacji:
  - Użytkownik może przejść z listy do widoku fiszki.
  - Widok pokazuje przód i tył oraz podstawowe akcje (edycja, usunięcie).

US-010
- Tytuł: Edycja fiszki
- Opis: Jako użytkownik chcę edytować fiszkę, aby poprawiać błędy lub doprecyzować treść.
- Kryteria akceptacji:
  - Użytkownik może zmienić przód i/lub tył.
  - Obowiązują te same walidacje co przy tworzeniu.
  - Po zapisie zmiany są widoczne na liście i w szczegółach.

US-011
- Tytuł: Usunięcie fiszki
- Opis: Jako użytkownik chcę usuwać niepotrzebne fiszki, aby utrzymać porządek w zbiorze.
- Kryteria akceptacji:
  - Użytkownik może usunąć fiszkę z widoku listy lub szczegółów.
  - Po usunięciu fiszka nie jest widoczna ani używana w powtórkach.
  - Próba usunięcia nieistniejącej fiszki lub cudzej fiszki kończy się błędem autoryzacji lub stanem “nie znaleziono”.

US-012
- Tytuł: Wejście w ekran generowania AI
- Opis: Jako użytkownik chcę przejść do ekranu generowania, aby wkleić tekst i wygenerować kandydatów fiszek.
- Kryteria akceptacji:
  - Ekran jest dostępny tylko dla zalogowanych.
  - Ekran zawiera pole do wklejenia tekstu i akcję startu generowania.
  - Ekran informuje o limitach 1000–10 000 znaków.

US-013
- Tytuł: Walidacja długości wklejonego tekstu
- Opis: Jako użytkownik chcę, aby system blokował generowanie poza limitami, aby uniknąć błędów i marnowania czasu.
- Kryteria akceptacji:
  - Dla tekstu krótszego niż 1000 znaków start generowania jest zablokowany z komunikatem.
  - Dla tekstu dłuższego niż 10 000 znaków start generowania jest zablokowany z komunikatem.
  - System liczy znaki w sposób spójny (definicja: liczba znaków w polu tekstowym po trim, ustalone w implementacji).

US-014
- Tytuł: Uruchomienie generowania AI
- Opis: Jako użytkownik chcę uruchomić generowanie AI, aby otrzymać listę kandydatów fiszek.
- Kryteria akceptacji:
  - Po kliknięciu startu system pokazuje stan ładowania i blokuje ponowne wysłanie (lub obsługuje idempotencję).
  - Po zakończeniu generowania system wyświetla listę kandydatów pod formularzem.
  - Jeśli generowanie się nie powiedzie, użytkownik widzi czytelny błąd i możliwość ponowienia.

US-015
- Tytuł: Obsługa time-out i błędów dostawcy LLM
- Opis: Jako użytkownik chcę otrzymać jasną informację, gdy AI nie odpowiada, aby wiedzieć, co zrobić dalej.
- Kryteria akceptacji:
  - Dla time-out użytkownik widzi komunikat sugerujący ponowienie.
  - Dla błędu dostawcy użytkownik widzi komunikat błędu bez szczegółów technicznych.
  - System nie zapisuje niekompletnego wyniku jako kandydatów.

US-016
- Tytuł: Ograniczenie nadużyć generowania (limity)
- Opis: Jako właściciel produktu chcę ograniczyć nadużycia generowania, aby kontrolować koszty i stabilność usługi.
- Kryteria akceptacji:
  - System ma limit uruchomień generowania na użytkownika w danym oknie czasowym lub równoważny mechanizm MVP.
  - Po przekroczeniu limitu użytkownik widzi komunikat i informację kiedy może spróbować ponownie.

US-017
- Tytuł: Wyświetlanie listy kandydatów fiszek
- Opis: Jako użytkownik chcę zobaczyć kandydatów w formie listy, aby szybko je ocenić.
- Kryteria akceptacji:
  - Każdy kandydat pokazuje przód i tył.
  - Lista jest wyświetlana dopiero po zakończeniu generowania.
  - Gdy AI zwróci 0 kandydatów, system pokazuje komunikat i sugestię zmiany tekstu.

US-018
- Tytuł: Zaakceptowanie kandydata bez zmian
- Opis: Jako użytkownik chcę zaakceptować dobrego kandydata jednym kliknięciem, aby szybko zapisać wartościowe fiszki.
- Kryteria akceptacji:
  - Użytkownik może oznaczyć kandydata jako zaakceptowany.
  - Stan kandydata jest widoczny w UI.
  - Kandydat nie jest jeszcze zapisany w bazie przed bulk save.

US-019
- Tytuł: Edycja kandydata i zaakceptowanie
- Opis: Jako użytkownik chcę poprawić kandydata, aby dopasować treść do mojego stylu nauki i uniknąć błędów.
- Kryteria akceptacji:
  - Użytkownik może edytować przód i/lub tył kandydata.
  - Po edycji może oznaczyć kandydata jako zaakceptowany.
  - Walidacje dla pól stosują się również do kandydata.

US-020
- Tytuł: Odrzucenie kandydata
- Opis: Jako użytkownik chcę odrzucić słabego kandydata, aby nie zaśmiecać bazy.
- Kryteria akceptacji:
  - Użytkownik może oznaczyć kandydata jako odrzucony.
  - Stan odrzucenia jest widoczny w UI.

US-021
- Tytuł: Zmiana decyzji dla kandydata przed zapisem
- Opis: Jako użytkownik chcę móc zmienić decyzję przed bulk save, aby korygować wybory podczas recenzji.
- Kryteria akceptacji:
  - Użytkownik może przełączać decyzję (np. odrzuć → zaakceptuj).
  - UI zawsze pokazuje aktualny stan decyzji.

US-022
- Tytuł: Bulk save zaakceptowanych fiszek
- Opis: Jako użytkownik chcę zapisać wszystkie decyzje jedną akcją, aby zakończyć proces recenzji i dodać fiszki do mojej bazy.
- Kryteria akceptacji:
  - Po kliknięciu zapisu system tworzy fiszki tylko dla kandydatów zaakceptowanych.
  - Po zapisie użytkownik widzi potwierdzenie oraz liczby zaakceptowanych/odrzuconych.
  - Zapis jest odporny na podwójne kliknięcie (brak duplikatów) lub jest jasno zablokowany w UI.

US-023
- Tytuł: Transakcyjność bulk save
- Opis: Jako użytkownik chcę, aby zapis był spójny, aby uniknąć sytuacji częściowego zapisu bez jasnej informacji.
- Kryteria akceptacji:
  - Jeśli zapis nie powiedzie się, system nie tworzy częściowego zestawu fiszek albo wyraźnie raportuje co zapisano (preferencja MVP: brak częściowych efektów).
  - Użytkownik dostaje komunikat umożliwiający ponowienie.

US-024
- Tytuł: Log sesji generowania i decyzji użytkownika
- Opis: Jako właściciel produktu chcę rejestrować sesje generowania i decyzje, aby mierzyć metryki sukcesu bez narzędzi zewnętrznych.
- Kryteria akceptacji:
  - Dla każdej sesji generowania zapisuje się liczba kandydatów oraz liczba zaakceptowanych i odrzuconych.
  - Akceptacja liczy się niezależnie od tego, czy kandydat był edytowany.
  - Dane logów są powiązane z użytkownikiem i niedostępne dla innych użytkowników.

US-025
- Tytuł: Generowanie a brak zalogowania (wymuszenie auth)
- Opis: Jako niezalogowany użytkownik nie powinienem móc generować ani zapisywać fiszek, aby dane były prywatne i powiązane z kontem.
- Kryteria akceptacji:
  - Niezalogowany użytkownik jest przekierowany do logowania/rejestracji przy próbie wejścia w funkcje wymagające konta.
  - Endpointy backendu odrzucają żądania bez uprawnień.

US-026
- Tytuł: Wygasła sesja podczas generowania lub zapisu
- Opis: Jako użytkownik chcę zrozumieć, co się stało, jeśli moja sesja wygaśnie, aby nie tracić czasu.
- Kryteria akceptacji:
  - Gdy sesja wygasa, użytkownik dostaje komunikat i prośbę o ponowne zalogowanie.
  - System nie zapisuje danych bez autoryzacji.

US-027
- Tytuł: Obsługa pustych/niepoprawnych kandydatów z AI
- Opis: Jako użytkownik chcę, aby system odfiltrował lub zablokował zapisywanie kandydatów z brakującymi polami, aby nie powstały uszkodzone fiszki.
- Kryteria akceptacji:
  - System nie pozwala zaakceptować kandydata z pustym przodem lub tyłem.
  - Jeśli AI zwróci kandydata niezgodnego ze schematem, kandydat nie jest wyświetlany lub jest oznaczony jako błąd z informacją dla użytkownika (MVP: preferencja odfiltrowania i komunikat).

US-028
- Tytuł: Przegląd fiszek dodanych przez AI
- Opis: Jako użytkownik chcę zobaczyć zapisane fiszki po bulk save, aby kontynuować pracę lub przejść do powtórek.
- Kryteria akceptacji:
  - Po zapisie użytkownik może przejść do listy fiszek i zobaczyć nowe pozycje.
  - Nowe fiszki należą do użytkownika i są gotowe do użycia w SRS.

US-029
- Tytuł: Ekran powtórek i pobranie kolejki
- Opis: Jako użytkownik chcę uruchomić powtórki, aby uczyć się zgodnie z harmonogramem.
- Kryteria akceptacji:
  - Użytkownik może wejść do ekranu powtórek.
  - System pokazuje kolejkę fiszek do powtórzenia “teraz” zgodnie z gotowym algorytmem SRS.
  - Gdy brak fiszek do powtórki, system pokazuje stan pusty.

US-030
- Tytuł: Przebieg pojedynczej powtórki (pytanie → odpowiedź)
- Opis: Jako użytkownik chcę zobaczyć przód fiszki, a potem odsłonić tył, aby wykonać próbę przypomnienia.
- Kryteria akceptacji:
  - System pokazuje przód fiszki.
  - Użytkownik może odsłonić odpowiedź (tył).
  - Bez odsłonięcia odpowiedzi nie można ocenić wyniku (MVP: preferencja, aby redukować przypadkowe kliknięcia).

US-031
- Tytuł: Ocena wyniku powtórki i aktualizacja harmonogramu
- Opis: Jako użytkownik chcę ocenić, czy pamiętałem, aby algorytm ustalił kolejną datę powtórki.
- Kryteria akceptacji:
  - Użytkownik może wybrać ocenę z ustalonego zestawu (np. Again/Good/Easy lub równoważne).
  - Po ocenie system aktualizuje parametry SRS i wyznacza następną powtórkę.
  - Fiszka znika z bieżącej kolejki zgodnie z regułami algorytmu.

US-032
- Tytuł: Odporność powtórek na odświeżenie strony
- Opis: Jako użytkownik chcę, aby odświeżenie strony nie powodowało niespójnego stanu powtórek.
- Kryteria akceptacji:
  - Po odświeżeniu system potrafi kontynuować w sposób spójny (np. pobiera aktualną kolejkę z backendu).
  - Nie dochodzi do podwójnego zaliczenia tej samej oceny dla tej samej fiszki w oczywistym scenariuszu odświeżenia.

US-033
- Tytuł: Usunięcie fiszki a kolejka powtórek
- Opis: Jako użytkownik chcę, aby usunięte fiszki nie pojawiały się w kolejce powtórek.
- Kryteria akceptacji:
  - Po usunięciu fiszki nie jest ona zwracana w kolejce “do powtórzenia”.
  - Jeśli użytkownik usunie fiszkę w trakcie sesji powtórek, system obsługuje to bez błędu (np. przechodzi do następnej).

US-034
- Tytuł: Manualne fiszki w harmonogramie SRS
- Opis: Jako użytkownik chcę, aby fiszki utworzone ręcznie również trafiały do SRS.
- Kryteria akceptacji:
  - Nowo utworzona manualnie fiszka ma zainicjalizowany stan SRS zgodnie z integracją.
  - Fiszka może pojawić się w kolejce powtórek zgodnie z regułami algorytmu.

US-035
- Tytuł: Brak duplikatów przy wielokrotnym bulk save tej samej sesji
- Opis: Jako użytkownik chcę uniknąć powielania fiszek, jeśli przypadkowo ponowię zapis.
- Kryteria akceptacji:
  - System uniemożliwia ponowny zapis tej samej sesji generowania albo zapewnia idempotencję.
  - Użytkownik dostaje czytelny komunikat, jeśli próbuje zapisać ponownie.

US-036
- Tytuł: Przerwanie recenzji bez zapisu
- Opis: Jako użytkownik chcę móc zrezygnować z recenzji bez konsekwencji, jeśli kandydaci są słabi lub muszę przerwać pracę.
- Kryteria akceptacji:
  - Użytkownik może opuścić ekran bez zapisu.
  - System nie tworzy fiszek bez bulk save.
  - System nie raportuje tych kandydatów jako zaakceptowanych (logi decyzji zapisują się dopiero przy bulk save; definicja MVP).

US-037
- Tytuł: Jednoczesne generowanie (ochrona przed równoległymi sesjami)
- Opis: Jako użytkownik chcę uniknąć konfliktów, gdy przypadkowo uruchomię generowanie wielokrotnie.
- Kryteria akceptacji:
  - UI blokuje uruchomienie kolejnego generowania, gdy poprzednie trwa, albo system obsługuje to bez utraty spójności.
  - Użytkownik widzi czytelny stan, co się aktualnie dzieje.

US-038
- Tytuł: Informacja o kosztach czasowych generowania
- Opis: Jako użytkownik chcę wiedzieć, że generowanie może potrwać, aby nie uznać aplikacji za zepsutą.
- Kryteria akceptacji:
  - Podczas generowania system pokazuje stan ładowania i krótką informację, że proces może potrwać.
  - Użytkownik nie widzi “pustej strony” bez informacji.

US-039
- Tytuł: Rozdzielenie źródeł tworzenia fiszek w metrykach
- Opis: Jako właściciel produktu chcę odróżnić fiszki tworzone manualnie od tych z AI, aby mierzyć udział AI w tworzeniu fiszek.
- Kryteria akceptacji:
  - Każda nowa fiszka ma informację o źródle (manual/AI) albo istnieje spójna metoda wyliczenia na podstawie logów sesji generowania.
  - Metryka udziału AI jest możliwa do policzenia w bazie danych.

US-040
- Tytuł: Metryka akceptacji kandydatów AI
- Opis: Jako właściciel produktu chcę mierzyć odsetek zaakceptowanych kandydatów, aby weryfikować jakość generowania.
- Kryteria akceptacji:
  - System umożliwia policzenie: zaakceptowane / wszystkie kandydaty w obrębie sesji i w agregacji.
  - Akceptacja obejmuje zaakceptowane kandydaty niezależnie od edycji.

US-041
- Tytuł: Brak wycieku danych w logach
- Opis: Jako użytkownik chcę, aby moje dane nie były niepotrzebnie przechowywane, aby zachować prywatność.
- Kryteria akceptacji:
  - Logi nie przechowują pełnej treści wklejanego tekstu w MVP lub przechowują ją tylko, jeśli produkt jawnie to komunikuje (decyzja wdrożeniowa).
  - Użytkownik nie ma dostępu do logów innych użytkowników.

US-042
- Tytuł: Obsługa błędów sieci po stronie klienta
- Opis: Jako użytkownik chcę zobaczyć jasny komunikat, gdy mam problem z połączeniem, aby wiedzieć, co zrobić.
- Kryteria akceptacji:
  - Dla błędów sieci UI pokazuje komunikat i opcję ponowienia.
  - UI nie pozostaje w nieskończonym stanie ładowania bez informacji.

US-043
- Tytuł: Ochrona przed XSS w treściach fiszek (sanityzacja wyświetlania)
- Opis: Jako użytkownik chcę, aby treści fiszek były bezpiecznie wyświetlane, aby nie dało się uruchomić złośliwego kodu.
- Kryteria akceptacji:
  - Treści fiszek są renderowane jako tekst (a nie wykonywany HTML/JS) lub są bezpiecznie sanityzowane.
  - Wklejenie tagów HTML do pól nie skutkuje wykonaniem skryptów.

## 6. Metryki sukcesu

6.1 Metryki główne (kryteria sukcesu MVP)
- Metryka M1: Odsetek akceptacji kandydatów AI
  - Definicja: liczba kandydatów zaakceptowanych / liczba wszystkich kandydatów wygenerowanych.
  - Reguła: akceptacja liczy się niezależnie od tego, czy kandydat był edytowany.
  - Cel: 75%.
  - Pomiar: na podstawie tabel logów sesji generowania w bazie danych (bez zewnętrznych narzędzi).

- Metryka M2: Udział fiszek tworzonych z wykorzystaniem AI
  - Definicja: liczba fiszek zapisanych jako rezultat akceptacji kandydatów AI / liczba wszystkich fiszek utworzonych.
  - Cel: 75%.
  - Pomiar: na podstawie logów sesji generowania i/lub pola źródła utworzenia fiszki w bazie danych.

6.2 Metryki pomocnicze (diagnostyczne)
- Metryka D1: Średnia liczba kandydatów na sesję generowania
  - Cel: brak twardego celu w MVP; obserwacja dla jakości promptu i doświadczenia recenzji.
- Metryka D2: Odsetek sesji generowania zakończonych błędem
  - Cel: trend malejący; monitorowanie stabilności integracji z LLM.
- Metryka D3: Czas od startu generowania do wyświetlenia kandydatów
  - Cel: możliwie krótki przy akceptowalnych kosztach i jakości; monitorowanie opóźnień.
- Metryka D4: Odsetek użytkowników, którzy wykonali co najmniej jedną sesję powtórek
  - Cel: weryfikacja, czy użytkownicy docierają do wartości SRS.

6.3 Zasady interpretacji metryk
- Metryki M1 i M2 powinny być liczone w oknie czasowym (np. tygodniowym) oraz w ujęciu kohortowym (nowi użytkownicy vs powracający), jeśli dane na to pozwolą.
- Jeśli M1 jest poniżej celu, priorytetem jest poprawa jakości kandydatów (prompt, format, walidacja wyjścia).
- Jeśli M2 jest poniżej celu przy wysokim M1, priorytetem jest usprawnienie UX generowania i recenzji (czas, czytelność, mniej kroków).

***

Lista kontrolna (weryfikacja PRD)
- Czy każdą historię użytkownika można przetestować? Tak; każda ma konkretne, sprawdzalne kryteria akceptacji.
- Czy kryteria akceptacji są jasne i konkretne? Tak; zawierają warunki wejścia/wyjścia i oczekiwane zachowania systemu.
- Czy mamy wystarczająco dużo historyjek użytkownika, aby zbudować w pełni funkcjonalną aplikację? Tak; pokrywają konta, CRUD fiszek, generowanie AI, recenzję i zapis, logowanie metryk oraz powtórki.
- Czy uwzględniliśmy wymagania dotyczące uwierzytelniania i autoryzacji? Tak; dedykowane historie (US-001–US-005, US-025–US-026) oraz wymagania w sekcji 3.1.


