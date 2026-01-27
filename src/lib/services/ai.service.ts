import { AIServiceError, AITimeoutError } from "../errors/generation.errors";
import { getOpenRouterService, isOpenRouterAvailable } from "./openrouter.instance";
import {
  OpenRouterError,
  OpenRouterTimeoutError,
  OpenRouterAuthenticationError,
  OpenRouterRateLimitError,
  OpenRouterInsufficientCreditsError,
  getUserFriendlyErrorMessage,
} from "../errors/openrouter.errors";

/**
 * Structure of a flashcard returned by AI service
 */
export interface AIFlashcard {
  front: string;
  back: string;
}

/**
 * Generates flashcards from input text using OpenRouter.ai API
 *
 * @param inputText - Text content to generate flashcards from (1000-10000 chars)
 * @param timeoutMs - Timeout in milliseconds (default: 60000ms = 60s)
 * @returns Array of flashcard objects with front/back pairs
 * @throws {AITimeoutError} When AI service doesn't respond within timeout
 * @throws {AIServiceError} When AI service returns error or invalid response
 *
 * @example
 * const flashcards = await generateFlashcardsWithAI(inputText);
 * console.log(flashcards); // [{ front: "Q1", back: "A1" }, ...]
 */
export async function generateFlashcardsWithAI(inputText: string, timeoutMs = 60000): Promise<AIFlashcard[]> {
  // Tryb mock - gdy brak klucza API lub ustawiony na "mock"
  if (!isOpenRouterAvailable()) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Return mock flashcards
    return [
      { front: "What is TypeScript?", back: "A typed superset of JavaScript" },
      { front: "What is Astro?", back: "A modern web framework for content-focused websites" },
      { front: "What is Supabase?", back: "An open-source Firebase alternative" },
      { front: "What is REST API?", back: "Representational State Transfer - architectural style for APIs" },
      { front: "What is JWT?", back: "JSON Web Token - compact way to transmit information securely" },
      { front: "What is rate limiting?", back: "Controlling the number of requests a user can make" },
      { front: "What is SHA-256?", back: "Cryptographic hash function producing 256-bit output" },
      { front: "What is Zod?", back: "TypeScript-first schema validation library" },
    ];
  }

  // Use OpenRouter Service
  try {
    const openRouterService = getOpenRouterService();

    //console.info("🤖 Wywołuję openRouterService.generateFlashcards...");
    // Call generateFlashcards method from our service
    const flashcards = await openRouterService.generateFlashcards(inputText, {
      model: import.meta.env.OPENROUTER_MODEL,
      temperature: 0.3,
      minFlashcards: 8,
      maxFlashcards: 15,
      timeout: timeoutMs,
    });

    // console.info(`✅ openRouterService zwróciło ${flashcards.length} fiszek`);
    // OpenRouter service already returns properly formatted flashcards of type AIFlashcard
    return flashcards;
  } catch (error) {
    // console.error("❌ Błąd w generateFlashcardsWithAI:", error);

    // Map OpenRouter errors to existing AI errors for backward compatibility
    if (error instanceof OpenRouterTimeoutError) {
      throw new AITimeoutError(`AI service did not respond within ${timeoutMs / 1000} seconds`);
    }

    if (error instanceof OpenRouterAuthenticationError) {
      // console.error("   -> OpenRouterAuthenticationError:", error.message, error.details);
      throw new AIServiceError(
        "Authentication failed. Check your OpenRouter API key or account limits.",
        error.details
      );
    }

    if (error instanceof OpenRouterRateLimitError) {
      // console.error("   -> OpenRouterRateLimitError:", error.message);
      const retryMessage = error.retryAfter ? ` Retry after ${error.retryAfter} seconds.` : " Please try again later.";
      throw new AIServiceError(`Rate limit exceeded.${retryMessage}`, error.details);
    }

    if (error instanceof OpenRouterInsufficientCreditsError) {
      // console.error("   -> OpenRouterInsufficientCreditsError:", error.message);
      throw new AIServiceError(
        "Insufficient credits on OpenRouter account. Please add credits at https://openrouter.ai/settings/keys",
        error.details
      );
    }

    if (error instanceof OpenRouterError) {
      // console.error("   -> OpenRouterError (kod: " + error.code + "):", error.message, error.details);
      // Use user-friendly message
      const friendlyMessage = getUserFriendlyErrorMessage(error);
      throw new AIServiceError(friendlyMessage, error.details);
    }

    // Other unknown errors
    // console.error("   -> Nieznany błąd:", error);
    throw new AIServiceError("Unexpected error calling AI service", error);
  }
}
