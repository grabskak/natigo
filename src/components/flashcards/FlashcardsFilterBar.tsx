/**
 * FlashcardsFilterBar - Pasek filtrów ze źródłem, sortowaniem i kolejnością
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FlashcardsFilters, FlashcardSource } from '@/types';

interface FlashcardsFilterBarProps {
  filters: FlashcardsFilters;
  onFilterChange: (filters: FlashcardsFilters) => void;
}

export default function FlashcardsFilterBar({
  filters,
  onFilterChange,
}: FlashcardsFilterBarProps) {
  const handleSourceChange = (value: string) => {
    onFilterChange({
      ...filters,
      source: value as 'all' | FlashcardSource,
    });
  };

  const handleSortChange = (value: string) => {
    onFilterChange({
      ...filters,
      sort: value as 'created_at' | 'updated_at',
    });
  };

  const handleOrderChange = (value: string) => {
    onFilterChange({
      ...filters,
      order: value as 'asc' | 'desc',
    });
  };

  return (
    <div className="flex gap-4 mb-6 flex-wrap">
      {/* Source Filter */}
      <div className="w-full sm:w-auto sm:min-w-[180px]">
        <Select value={filters.source} onValueChange={handleSourceChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filtruj według źródła" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie źródła</SelectItem>
            <SelectItem value="manual">Ręczne</SelectItem>
            <SelectItem value="ai-full">Wygenerowane przez AI</SelectItem>
            <SelectItem value="ai-edited">Edytowane AI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort By Filter */}
      <div className="w-full sm:w-auto sm:min-w-[180px]">
        <Select value={filters.sort} onValueChange={handleSortChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sortuj według" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Data utworzenia</SelectItem>
            <SelectItem value="updated_at">Data aktualizacji</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Order Filter */}
      <div className="w-full sm:w-auto sm:min-w-[180px]">
        <Select value={filters.order} onValueChange={handleOrderChange}>
          <SelectTrigger>
            <SelectValue placeholder="Kolejność" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Najnowsze najpierw</SelectItem>
            <SelectItem value="asc">Najstarsze najpierw</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
