/**
 * FlashcardsHeader - Nagłówek strony z tytułem i przyciskami akcji
 */

import { Button } from "@/components/ui/button";

interface FlashcardsHeaderProps {
  onAddClick: () => void;
  onGenerateClick: () => void;
}

export default function FlashcardsHeader({ onAddClick, onGenerateClick }: FlashcardsHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">Moje fiszki</h1>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onGenerateClick} data-testid="flashcards-generate-button">
          Generuj nowe fiszki
        </Button>
        <Button variant="default" onClick={onAddClick} data-testid="flashcards-add-button">
          Dodaj fiszkę ręcznie
        </Button>
      </div>
    </div>
  );
}
