# Playwright Cache Cleanup

## Metody czyszczenia cache Playwright:

### 1. Wyczyść katalog .cache (jeśli istnieje)
```bash
# Windows PowerShell
Remove-Item -Recurse -Force .\.cache

# Linux/Mac
rm -rf .cache
```

### 2. Wyczyść katalog node_modules/.cache
```bash
# Windows PowerShell
Remove-Item -Recurse -Force .\node_modules\.cache

# Linux/Mac
rm -rf node_modules/.cache
```

### 3. Przebuduj zależności
```bash
npm run build  # jeśli masz skrypt build
```

### 4. Wyczyść cache TypeScript
```bash
# Windows PowerShell
Remove-Item -Recurse -Force .\tsconfig.tsbuildinfo

# Linux/Mac
rm -f tsconfig.tsbuildinfo
```

### 5. Ponownie zainstaluj Playwright browsers (jeśli problem dotyczy przeglądarek)
```bash
npx playwright install --force
```

### 6. W ostateczności - reinstalacja zależności
```bash
# Windows PowerShell
Remove-Item -Recurse -Force .\node_modules
npm install

# Linux/Mac
rm -rf node_modules
npm install
```

## Kiedy czyścić cache?

- Zmiana w plikach fixtures.ts nie jest rozpoznawana
- Stare testy są cache'owane
- Błędy kompilacji TypeScript mimo poprawnego kodu
- Problemy z importami modułów
