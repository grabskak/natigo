import { useState } from "react";
import type { CreateFlashcardCommand, CreateFlashcardsResponse, ApiError } from "../../types";

/**
 * Custom hook for saving accepted/edited flashcards
 * Encapsulates POST /api/flashcards API call
 */
export function useSaveFlashcards() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Save multiple flashcards to database
   * @param flashcards - Array of flashcards to save with source and generation_id
   * @returns CreateFlashcardsResponse with created_count and flashcards
   * @throws ApiError on validation, auth, or database errors
   */
  const save = async (flashcards: CreateFlashcardCommand[]): Promise<CreateFlashcardsResponse> => {
    // Guard clause: empty array
    if (flashcards.length === 0) {
      const emptyError: ApiError = {
        code: "VALIDATION_FAILED",
        message: "Cannot save empty flashcard list",
      };
      setError(emptyError);
      throw emptyError;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TODO: Add Authorization header when auth is implemented
          // "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(flashcards),
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

      const result: CreateFlashcardsResponse = await response.json();
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
      setIsSaving(false);
    }
  };

  return {
    save,
    isSaving,
    error,
  };
}
