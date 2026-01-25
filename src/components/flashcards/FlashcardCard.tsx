/**
 * FlashcardCard - Karta pojedynczej fiszki z akcjami
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import type { FlashcardDto } from '@/types';

interface FlashcardCardProps {
  flashcard: FlashcardDto;
  onEdit: (flashcard: FlashcardDto) => void;
  onDelete: (id: string) => void;
}

export default function FlashcardCard({
  flashcard,
  onEdit,
  onDelete,
}: FlashcardCardProps) {
  // Format dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get badge variant and label based on source
  const getBadgeConfig = () => {
    switch (flashcard.source) {
      case 'manual':
        return {
          variant: 'secondary' as const,
          label: 'Ręczne',
          className: '',
        };
      case 'ai-full':
        return {
          variant: 'default' as const,
          label: 'Wygenerowane przez AI',
          className: '',
        };
      case 'ai-edited':
        return {
          variant: 'outline' as const,
          label: 'Edytowane AI',
          className: 'border-orange-500 text-orange-700',
        };
      default:
        return {
          variant: 'secondary' as const,
          label: flashcard.source,
          className: '',
        };
    }
  };

  const badgeConfig = getBadgeConfig();

  return (
    <Card className="p-4 hover:shadow-md transition-shadow" data-testid={`flashcard-card-${flashcard.id}`}>
      {/* Header with Badge and Menu */}
      <div className="flex justify-between items-start mb-3">
        <Badge variant={badgeConfig.variant} className={badgeConfig.className}>
          {badgeConfig.label}
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`flashcard-menu-button-${flashcard.id}`}>
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(flashcard)} data-testid={`flashcard-edit-menu-item-${flashcard.id}`}>
              Edytuj
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(flashcard.id)}
              className="text-destructive focus:text-destructive"
              data-testid={`flashcard-delete-menu-item-${flashcard.id}`}
            >
              Usuń
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Front Content */}
      <div className="mb-3">
        <p className="text-sm text-muted-foreground mb-1">Przód:</p>
        <p className="font-medium break-words">{flashcard.front}</p>
      </div>

      {/* Back Content */}
      <div className="mb-3">
        <p className="text-sm text-muted-foreground mb-1">Tył:</p>
        <p className="break-words">{flashcard.back}</p>
      </div>

      {/* Dates */}
      <div className="mt-3 text-xs text-muted-foreground flex justify-between">
        <span>Utworzono: {formatDate(flashcard.created_at)}</span>
        {flashcard.updated_at !== flashcard.created_at && (
          <span>Zaktualizowano: {formatDate(flashcard.updated_at)}</span>
        )}
      </div>
    </Card>
  );
}
