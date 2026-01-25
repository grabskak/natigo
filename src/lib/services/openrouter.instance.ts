import { OpenRouterService } from "./openrouter.service";
import { OpenRouterConfigError } from "../errors/openrouter.errors";

/**
 * Tworzy i konfiguruje instancję OpenRouter Service ze zmiennych środowiskowych
 *
 * Wymagane zmienne środowiskowe:
 * - OPENROUTER_API_KEY: Klucz API OpenRouter (wymagany, chyba że tryb mock)
 *
 * Opcjonalne zmienne środowiskowe:
 * - OPENROUTER_API_URL: URL API OpenRouter (domyślnie: https://openrouter.ai/api/v1/chat/completions)
 * - OPENROUTER_MODEL: Domyślny model (domyślnie: anthropic/claude-3-haiku)
 *
 * @throws {OpenRouterConfigError} Gdy brakuje wymaganej konfiguracji
 */
function createOpenRouterService(): OpenRouterService {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  // W trybie mock lub gdy brak klucza API, nie tworzymy serwisu
  // Usługa AI będzie używać trybu mock
  if (!apiKey || apiKey === "mock") {
    throw new OpenRouterConfigError(
      "OpenRouter API key nie jest skonfigurowany lub działa w trybie mock. " +
        "Ustaw zmienną OPENROUTER_API_KEY aby korzystać z prawdziwego API.",
    );
  }

  // Twórz serwis z konfiguracją ze zmiennych środowiskowych
  return new OpenRouterService({
    apiKey,
    baseUrl: import.meta.env.OPENROUTER_API_URL,
    defaultModel: import.meta.env.OPENROUTER_MODEL || "anthropic/claude-3-haiku",
    defaultSystemMessage: undefined,
    timeout: 60000, // 60 sekund
    maxRetries: 3,
    retryDelay: 1000,
    httpReferer: "https://natigo.app",
    appTitle: "Natigo Flashcard Generator",
  });
}

/**
 * Singleton instancja OpenRouter Service
 *
 * @example
 * ```typescript
 * import { openRouterService } from './services/openrouter.instance';
 *
 * const flashcards = await openRouterService.generateFlashcards(inputText);
 * ```
 */
let openRouterServiceInstance: OpenRouterService | null = null;

/**
 * Zwraca instancję OpenRouter Service (lazy initialization)
 *
 * @returns OpenRouter Service instance
 * @throws {OpenRouterConfigError} Gdy brakuje konfiguracji
 */
export function getOpenRouterService(): OpenRouterService {
  if (!openRouterServiceInstance) {
    openRouterServiceInstance = createOpenRouterService();
  }
  return openRouterServiceInstance;
}

/**
 * Sprawdza czy OpenRouter Service jest dostępny (czy klucz API jest skonfigurowany)
 *
 * @returns true jeśli serwis może być utworzony, false w trybie mock
 */
export function isOpenRouterAvailable(): boolean {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  return !!(apiKey && apiKey !== "mock");
}

/**
 * Resetuje instancję serwisu (głównie do celów testowych)
 */
export function resetOpenRouterService(): void {
  openRouterServiceInstance = null;
}
