import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CharacterCounter } from "@/components/CharacterCounter";
import { cn } from "@/lib/utils";
import type { FlashcardCandidateDto, CandidateDecisionState, ValidationState } from "@/types";

interface CandidateCardProps {
  /** The candidate data */
  candidate: FlashcardCandidateDto;
  /** Sequential number (1-based) */
  sequenceNumber: number;
  /** Current decision state */
  decision: CandidateDecisionState;
  /** Edited content if in edited state */
  editedContent?: { front: string; back: string };
  /** Callback when accept is clicked */
  onAccept: () => void;
  /** Callback when reject is clicked */
  onReject: () => void;
  /** Callback when edit is saved */
  onEdit: (front: string, back: string) => void;
  /** Callback when edit is cancelled */
  onCancelEdit: () => void;
  /** Additional CSS classes */
  className?: string;
}

const FRONT_MAX = 200;
const BACK_MAX = 500;

/**
 * Card component for a single flashcard candidate
 * Supports display mode and edit mode with inline validation
 */
export function CandidateCard({
  candidate,
  sequenceNumber,
  decision,
  editedContent,
  onAccept,
  onReject,
  onEdit,
  onCancelEdit,
  className,
}: CandidateCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localFront, setLocalFront] = useState(candidate.front);
  const [localBack, setLocalBack] = useState(candidate.back);
  const [frontValidation, setFrontValidation] = useState<ValidationState>({
    isValid: true,
    message: null,
  });
  const [backValidation, setBackValidation] = useState<ValidationState>({
    isValid: true,
    message: null,
  });

  // Determine displayed content (original or edited)
  const displayFront = editedContent?.front || candidate.front;
  const displayBack = editedContent?.back || candidate.back;

  /**
   * Validate front field
   */
  const validateFront = useCallback((value: string): ValidationState => {
    const trimmed = value.trim();
    const length = trimmed.length;

    if (length === 0) {
      return {
        isValid: false,
        message: "Przód nie może być pusty",
      };
    }

    if (length > FRONT_MAX) {
      return {
        isValid: false,
        message: `Przód nie może przekraczać ${FRONT_MAX} znaków (obecnie ${length})`,
      };
    }

    return {
      isValid: true,
      message: null,
    };
  }, []);

  /**
   * Validate back field
   */
  const validateBack = useCallback((value: string): ValidationState => {
    const trimmed = value.trim();
    const length = trimmed.length;

    if (length === 0) {
      return {
        isValid: false,
        message: "Tył nie może być pusty",
      };
    }

    if (length > BACK_MAX) {
      return {
        isValid: false,
        message: `Tył nie może przekraczać ${BACK_MAX} znaków (obecnie ${length})`,
      };
    }

    return {
      isValid: true,
      message: null,
    };
  }, []);

  /**
   * Start editing mode
   */
  const handleStartEdit = useCallback(() => {
    setLocalFront(displayFront);
    setLocalBack(displayBack);
    setFrontValidation(validateFront(displayFront));
    setBackValidation(validateBack(displayBack));
    setIsEditing(true);
  }, [displayFront, displayBack, validateFront, validateBack]);

  /**
   * Save edit
   */
  const handleSaveEdit = useCallback(() => {
    const trimmedFront = localFront.trim();
    const trimmedBack = localBack.trim();

    const frontVal = validateFront(trimmedFront);
    const backVal = validateBack(trimmedBack);

    if (frontVal.isValid && backVal.isValid) {
      onEdit(trimmedFront, trimmedBack);
      setIsEditing(false);
    }
  }, [localFront, localBack, validateFront, validateBack, onEdit]);

  /**
   * Cancel edit
   */
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    onCancelEdit();
  }, [onCancelEdit]);

  /**
   * Handle front change
   */
  const handleFrontChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalFront(value);
      setFrontValidation(validateFront(value));
    },
    [validateFront]
  );

  /**
   * Handle back change
   */
  const handleBackChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setLocalBack(value);
      setBackValidation(validateBack(value));
    },
    [validateBack]
  );

  /**
   * Get status badge styling
   */
  const getStatusBadge = () => {
    switch (decision) {
      case "accepted":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Zaakceptowana
          </span>
        );
      case "edited":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            Edytowana
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Odrzucona
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
            Oczekująca
          </span>
        );
    }
  };

  const isRejected = decision === "rejected";
  const canSaveEdit = frontValidation.isValid && backValidation.isValid;

  return (
    <div
      className={cn(
        "border rounded-lg p-4 transition-all",
        isRejected && "opacity-50 bg-gray-50 dark:bg-gray-900/50",
        !isRejected && "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
        className
      )}
    >
      {/* Header: Sequential Badge + Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          #{sequenceNumber}
        </span>
        {getStatusBadge()}
      </div>

      {/* Content: Display Mode */}
      {!isEditing && (
        <div className="space-y-4">
          {/* Front */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Przód
            </label>
            <div className="text-sm text-gray-900 dark:text-gray-100 p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              {displayFront}
            </div>
          </div>

          {/* Back */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Tył
            </label>
            <div className="text-sm text-gray-900 dark:text-gray-100 p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
              {displayBack}
            </div>
          </div>
        </div>
      )}

      {/* Content: Edit Mode */}
      {isEditing && (
        <div className="space-y-4">
          {/* Front Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`front-${sequenceNumber}`}
                className="block text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                Przód
              </label>
              <CharacterCounter
                current={localFront.trim().length}
                max={FRONT_MAX}
                min={1}
              />
            </div>
            <input
              id={`front-${sequenceNumber}`}
              type="text"
              value={localFront}
              onChange={handleFrontChange}
              className={cn(
                "w-full px-3 py-2 text-sm border rounded-md",
                "bg-white dark:bg-gray-900",
                "focus:outline-none focus:ring-2 focus:ring-primary",
                !frontValidation.isValid && "border-red-500 dark:border-red-400"
              )}
              aria-invalid={!frontValidation.isValid}
              aria-describedby={frontValidation.message ? `front-error-${sequenceNumber}` : undefined}
            />
            {frontValidation.message && (
              <p
                id={`front-error-${sequenceNumber}`}
                className="text-xs text-red-600 dark:text-red-400 mt-1"
                role="alert"
              >
                {frontValidation.message}
              </p>
            )}
          </div>

          {/* Back Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`back-${sequenceNumber}`}
                className="block text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                Tył
              </label>
              <CharacterCounter
                current={localBack.trim().length}
                max={BACK_MAX}
                min={1}
              />
            </div>
            <Textarea
              id={`back-${sequenceNumber}`}
              value={localBack}
              onChange={handleBackChange}
              rows={4}
              className={cn(
                "resize-none text-sm",
                !backValidation.isValid && "border-red-500 dark:border-red-400"
              )}
              aria-invalid={!backValidation.isValid}
              aria-describedby={backValidation.message ? `back-error-${sequenceNumber}` : undefined}
            />
            {backValidation.message && (
              <p
                id={`back-error-${sequenceNumber}`}
                className="text-xs text-red-600 dark:text-red-400 mt-1"
                role="alert"
              >
                {backValidation.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        {!isEditing && decision === "pending" && (
          <>
            <Button size="sm" onClick={onAccept} variant="default">
              Akceptuj
            </Button>
            <Button size="sm" onClick={handleStartEdit} variant="outline">
              Edytuj
            </Button>
            <Button size="sm" onClick={onReject} variant="destructive">
              Odrzuć
            </Button>
          </>
        )}

        {!isEditing && decision === "accepted" && (
          <>
            <Button size="sm" onClick={handleStartEdit} variant="outline">
              Edytuj
            </Button>
            <Button size="sm" onClick={onReject} variant="destructive">
              Odrzuć
            </Button>
          </>
        )}

        {!isEditing && decision === "edited" && (
          <>
            <Button size="sm" onClick={handleStartEdit} variant="outline">
              Edytuj ponownie
            </Button>
            <Button size="sm" onClick={onReject} variant="destructive">
              Odrzuć
            </Button>
          </>
        )}

        {!isEditing && decision === "rejected" && (
          <>
            <Button size="sm" onClick={onAccept} variant="default">
              Akceptuj
            </Button>
            <Button size="sm" onClick={handleStartEdit} variant="outline">
              Edytuj
            </Button>
          </>
        )}

        {isEditing && (
          <>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={!canSaveEdit}
              variant="default"
            >
              Zapisz edycję
            </Button>
            <Button size="sm" onClick={handleCancelEdit} variant="outline">
              Anuluj
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
