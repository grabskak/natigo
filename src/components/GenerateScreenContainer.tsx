import { useState, useCallback } from "react";
import { toast } from "sonner";
import { GenerateForm } from "@/components/GenerateForm";
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { CandidatesReview } from "@/components/CandidatesReview";
import { useGenerateFlashcards } from "@/lib/hooks/useGenerateFlashcards";
import type { GenerateScreenState } from "@/types";

/**
 * Main container component for the Generate Screen
 * Orchestrates the entire flow: form → loading → review
 * Manages state transitions and API integration
 */
export function GenerateScreenContainer() {
  const [screenState, setScreenState] = useState<GenerateScreenState>({
    status: "form",
  });

  const { generate, isLoading } = useGenerateFlashcards();

  /**
   * Handle generate action from form
   */
  const handleGenerate = useCallback(
    async (inputText: string) => {
      // Transition to loading state
      setScreenState({ status: "loading" });

      try {
        const result = await generate(inputText);

        // Transition to review state with data
        setScreenState({
          status: "review",
          data: {
            generationId: result.generation_id,
            candidates: result.candidates,
            metadata: result.metadata,
          },
        });
      } catch (error) {
        // Transition to error state
        setScreenState({
          status: "error",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },
    [generate]
  );

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    setScreenState({ status: "form" });
  }, []);

  /**
   * Handle back to form from error
   */
  const handleBackToForm = useCallback(() => {
    setScreenState({ status: "form" });
  }, []);

  /**
   * Handle successful save - redirect to flashcards page
   */
  const handleSaveSuccess = useCallback(() => {
    // Show success toast
    toast.success("Fiszki zapisane pomyślnie!", {
      description: "Twoje fiszki zostały dodane do kolekcji.",
      duration: 3000,
    });

    // Redirect to flashcards page with source filter after a short delay
    setTimeout(() => {
      window.location.href = "/flashcards?source=ai-full";
    }, 1000);
  }, []);

  /**
   * Handle cancel from review - back to form
   */
  const handleCancelReview = useCallback(() => {
    setScreenState({ status: "form" });
  }, []);

  // Render based on current state
  return (
    <div className="w-full">
      {/* Form State */}
      {screenState.status === "form" && <GenerateForm onGenerate={handleGenerate} isLoading={isLoading} />}

      {/* Loading State */}
      {screenState.status === "loading" && <LoadingState />}

      {/* Error State */}
      {screenState.status === "error" && (
        <ErrorDisplay error={screenState.error} onRetry={handleRetry} onBackToForm={handleBackToForm} />
      )}

      {/* Review State */}
      {screenState.status === "review" && (
        <CandidatesReview
          generationId={screenState.data.generationId}
          candidates={screenState.data.candidates}
          metadata={screenState.data.metadata}
          onSaveSuccess={handleSaveSuccess}
          onCancel={handleCancelReview}
        />
      )}
    </div>
  );
}
