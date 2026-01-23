/**
 * FlashcardsHeader - Nagłówek strony z tytułem i przyciskiem dodawania
 */

import { Button } from '@/components/ui/button';

interface FlashcardsHeaderProps {
  onAddClick: () => void;
}

export default function FlashcardsHeader({ onAddClick }: FlashcardsHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">My Flashcards</h1>
      <Button variant="default" onClick={onAddClick}>
        Add Manual Flashcard
      </Button>
    </div>
  );
}
