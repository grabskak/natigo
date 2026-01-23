import { useState } from "react";
import type { GenerateFlashcardsCommand, GenerateFlashcardsResponse, ApiError } from "../../types";

/**
 * Custom hook for generating flashcards from text using AI
 * Encapsulates POST /api/generations API call
 */
export function useGenerateFlashcards() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Generate flashcards from input text
   * @param inputText - Text to generate flashcards from (1000-10000 chars)
   * @returns GenerateFlashcardsResponse with generation_id, candidates, metadata
   * @throws ApiError on validation, auth, rate limit, or service errors
   */
  const generate = async (inputText: string): Promise<GenerateFlashcardsResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const command: GenerateFlashcardsCommand = {
        input_text: inputText,
      };

      const response = await fetch("/api/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TODO: Add Authorization header when auth is implemented
          // "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const apiError: ApiError = errorData.error || {
          code: "UNKNOWN_ERROR",
          message: "An unexpected error occurred",
        };
        setError(apiError);
        throw apiError;
      }

      const result: GenerateFlashcardsResponse = await response.json();
      return result;
    } catch (err) {
      // Network errors or JSON parsing errors
      if (err instanceof Error && !("code" in err)) {
        const networkError: ApiError = {
          code: "NETWORK_ERROR",
          message: "Failed to connect to the server. Please check your connection.",
        };
        setError(networkError);
        throw networkError;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generate,
    isLoading,
    error,
  };
}
