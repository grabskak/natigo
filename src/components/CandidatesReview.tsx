import { useState, useCallback } from "react";
import { CandidatesHeader } from "@/components/CandidatesHeader";
import { CandidateCard } from "@/components/CandidateCard";
import { SaveActionsBar } from "@/components/SaveActionsBar";
import { useDecisions } from "@/lib/hooks/useDecisions";
import { useSaveFlashcards } from "@/lib/hooks/useSaveFlashcards";
import { cn } from "@/lib/utils";
import type { FlashcardCandidateDto, GenerationMetadata, CreateFlashcardCommand, ApiError } from "@/types";

interface CandidatesReviewProps {
  /** Generation ID from API */
  generationId: string;
  /** Array of flashcard candidates */
  candidates: FlashcardCandidateDto[];
  /** Generation metadata */
  metadata: GenerationMetadata;
  /** Callback when save is successful */
  onSaveSuccess: () => void;
  /** Callback when cancel is clicked */
  onCancel: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Main component for reviewing and managing flashcard candidates
 * Handles user decisions, validation, and saving to database
 */
export function CandidatesReview({
  generationId,
  candidates,
  metadata,
  onSaveSuccess,
  onCancel,
  className,
}: CandidatesReviewProps) {
  const {
    accept,
    reject,
    edit,
    cancelEdit,
    getDecision,
    getState,
    getStats,
    getAcceptedCount,
  } = useDecisions(candidates.length);

  const { save, isSaving, error: saveError } = useSaveFlashcards();
  const [localError, setLocalError] = useState<ApiError | null>(null);

  const stats = getStats();
  const acceptedCount = getAcceptedCount();

  /**
   * Handle save action
   */
  const handleSave = useCallback(async () => {
    setLocalError(null);

    // Build array of flashcards to save
    const flashcardsToSave: CreateFlashcardCommand[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const decision = getDecision(i);
      if (!decision) continue;

      if (decision.state === "accepted") {
        // Accepted without edits
        flashcardsToSave.push({
          front: candidates[i].front,
          back: candidates[i].back,
          source: "ai-full",
          generation_id: generationId,
        });
      } else if (decision.state === "edited" && decision.editedContent) {
        // Accepted with edits
        flashcardsToSave.push({
          front: decision.editedContent.front,
          back: decision.editedContent.back,
          source: "ai-edited",
          generation_id: generationId,
        });
      }
    }

    // Guard clause: no flashcards to save
    if (flashcardsToSave.length === 0) {
      setLocalError({
        code: "NO_FLASHCARDS",
        message: "Brak fiszek do zapisania. Zaakceptuj lub edytuj co najmniej jednego kandydata.",
      });
      return;
    }

    try {
      await save(flashcardsToSave);
      onSaveSuccess();
    } catch (err) {
      // Error is already set in useSaveFlashcards hook
      setLocalError(err as ApiError);
    }
  }, [candidates, getDecision, generationId, save, onSaveSuccess]);

  /**
   * Handle cancel action
   */
  const handleCancel = useCallback(() => {
    if (window.confirm("Czy na pewno chcesz anulować? Wszystkie decyzje zostaną utracone.")) {
      onCancel();
    }
  }, [onCancel]);

  const displayError = localError || saveError;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with stats */}
      <CandidatesHeader stats={stats} metadata={metadata} />

      {/* Error Display */}
      {displayError && (
        <div
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                {displayError.code === "NO_FLASHCARDS" ? "Nie wybrano fiszek" : "Zapisywanie nie powiodło się"}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400">
                {displayError.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Candidates List */}
      <div className="space-y-4">
        {candidates.map((candidate, index) => {
          const decision = getDecision(index);
          return (
            <CandidateCard
              key={index}
              candidate={candidate}
              sequenceNumber={index + 1}
              decision={getState(index)}
              editedContent={decision?.editedContent}
              onAccept={() => accept(index)}
              onReject={() => reject(index)}
              onEdit={(front, back) => edit(index, front, back)}
              onCancelEdit={() => cancelEdit(index)}
            />
          );
        })}
      </div>

      {/* Bottom padding for sticky bar */}
      <div className="h-20"></div>

      {/* Sticky Save Actions Bar */}
      <SaveActionsBar
        acceptedCount={acceptedCount}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
      />
    </div>
  );
}
