/**
 * FlashcardsList - Grid kontener dla kart fiszek lub empty state
 */

import FlashcardCard from "./FlashcardCard";
import EmptyState from "./EmptyState";
import type { FlashcardDto, EmptyStateVariant } from "@/types";

interface FlashcardsListProps {
  flashcards: FlashcardDto[];
  isLoading: boolean;
  isEmpty: boolean;
  emptyVariant?: EmptyStateVariant;
  onEdit: (flashcard: FlashcardDto) => void;
  onDelete: (id: string) => void;
  onGenerateClick?: () => void;
  onAddManualClick?: () => void;
  onClearFilters?: () => void;
}

export default function FlashcardsList({
  flashcards,
  isLoading,
  isEmpty,
  emptyVariant = "total-empty",
  onEdit,
  onDelete,
  onGenerateClick,
  onAddManualClick,
  onClearFilters,
}: FlashcardsListProps) {
  // Loading state - skeleton placeholders
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <EmptyState
        variant={emptyVariant}
        onGenerateClick={onGenerateClick}
        onAddManualClick={onAddManualClick}
        onClearFilters={onClearFilters}
      />
    );
  }

  // Grid with flashcards
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {flashcards.map((flashcard) => (
        <FlashcardCard key={flashcard.id} flashcard={flashcard} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
