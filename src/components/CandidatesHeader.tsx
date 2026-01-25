import { cn } from "@/lib/utils";
import type { DecisionStats, GenerationMetadata } from "@/types";

interface CandidatesHeaderProps {
  /** Statistics about decisions */
  stats: DecisionStats;
  /** Metadata from generation */
  metadata: GenerationMetadata;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Header component for candidates review section
 * Displays generation metadata and decision statistics
 */
export function CandidatesHeader({
  stats,
  metadata,
  className,
}: CandidatesHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Title and Metadata */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Przejrzyj wygenerowane fiszki
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Wygenerowano {metadata.generated_count} {metadata.generated_count === 1 ? "fiszkę" : metadata.generated_count < 5 ? "fiszki" : "fiszek"} z{" "}
          {metadata.input_text_length.toLocaleString()} znaków w{" "}
          {(metadata.duration_ms / 1000).toFixed(1)}s
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.total}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Wszystkie
          </div>
        </div>

        {/* Pending */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {stats.pending}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Oczekujące
          </div>
        </div>

        {/* Accepted */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
            {stats.accepted}
          </div>
          <div className="text-xs text-green-600 dark:text-green-500 mt-1">
            Zaakceptowane
          </div>
        </div>

        {/* Edited */}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
            {stats.edited}
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-500 mt-1">
            Edytowane
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">
            {stats.rejected}
          </div>
          <div className="text-xs text-red-600 dark:text-red-500 mt-1">
            Odrzucone
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Przejrzyj każdą fiszkę poniżej. Możesz je <strong>Zaakceptować</strong> bez zmian,{" "}
          <strong>Edytować</strong>, aby wprowadzić zmiany, lub <strong>Odrzucić</strong>, jeśli nie są potrzebne.
          Kiedy skończysz, kliknij <strong>Zapisz</strong> na dole, aby dodać zaakceptowane fiszki do swojej kolekcji.
        </p>
      </div>
    </div>
  );
}
