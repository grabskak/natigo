/**
 * EmptyState - Stan pusty dla listy fiszek (brak fiszek lub brak wyników po filtrze)
 */

import { Button } from '@/components/ui/button';
import { FileQuestion, Filter } from 'lucide-react';
import type { EmptyStateVariant } from '@/types';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onGenerateClick?: () => void;
  onAddManualClick?: () => void;
  onClearFilters?: () => void;
}

export default function EmptyState({
  variant,
  onGenerateClick,
  onAddManualClick,
  onClearFilters,
}: EmptyStateProps) {
  if (variant === 'total-empty') {
    return (
      <div className="text-center py-12">
        <FileQuestion className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground mb-2">
          You don't have any flashcards yet
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Get started by generating flashcards from text or adding them manually
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button onClick={onGenerateClick}>Generate Flashcards</Button>
          <Button variant="outline" onClick={onAddManualClick}>
            Add Manual Flashcard
          </Button>
        </div>
      </div>
    );
  }

  // filtered-empty variant
  return (
    <div className="text-center py-12">
      <Filter className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
      <p className="text-lg text-muted-foreground mb-2">
        No flashcards match your filters
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        Try adjusting your filters or clear them to see all flashcards
      </p>
      <Button onClick={onClearFilters}>Clear Filters</Button>
    </div>
  );
}
