Frontend - Astro z React dla komponentów interaktywnych:
- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:
- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami przez usługę Openrouter.ai:
- Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

Testowanie:
- Vitest do testów jednostkowych i integracyjnych (natywna integracja z Vite/Astro, kompatybilny z Jest API)
- @testing-library/react do testowania komponentów React zgodnie z best practices
- @testing-library/user-event do realistycznych symulacji interakcji użytkownika
- MSW (Mock Service Worker) do mockowania HTTP na poziomie sieci
- Playwright do testów end-to-end w prawdziwych przeglądarkach (Chromium, Firefox, WebKit)
- @axe-core/playwright do automatycznych testów dostępności (a11y)
- Artillery do testów wydajnościowych i load testing
- Lighthouse CI do monitorowania performance budgets

CI/CD i Hosting:
- Github Actions do tworzenia pipeline'ów CI/CD
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu docker