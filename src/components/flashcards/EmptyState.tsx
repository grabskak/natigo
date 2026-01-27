/**
 * EmptyState - Stan pusty dla listy fiszek (brak fiszek lub brak wyników po filtrze)
 */

import { Button } from "@/components/ui/button";
import { FileQuestion, Filter } from "lucide-react";
import type { EmptyStateVariant } from "@/types";

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onGenerateClick?: () => void;
  onAddManualClick?: () => void;
  onClearFilters?: () => void;
}

export default function EmptyState({ variant, onGenerateClick, onAddManualClick, onClearFilters }: EmptyStateProps) {
  if (variant === "total-empty") {
    return (
      <div className="text-center py-12">
        <FileQuestion className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground mb-2">Nie masz jeszcze żadnych fiszek</p>
        <p className="text-sm text-muted-foreground mb-6">
          Zacznij od wygenerowania fiszek z tekstu lub dodaj je ręcznie
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button onClick={onGenerateClick}>Generuj fiszki</Button>
          <Button variant="outline" onClick={onAddManualClick}>
            Dodaj fiszkę ręcznie
          </Button>
        </div>
      </div>
    );
  }

  // filtered-empty variant
  return (
    <div className="text-center py-12">
      <Filter className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
      <p className="text-lg text-muted-foreground mb-2">Brak fiszek pasujących do filtrów</p>
      <p className="text-sm text-muted-foreground mb-6">
        Spróbuj dostosować filtry lub wyczyść je, aby zobaczyć wszystkie fiszki
      </p>
      <Button onClick={onClearFilters}>Wyczyść filtry</Button>
    </div>
  );
}
