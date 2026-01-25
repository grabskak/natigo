import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SaveActionsBarProps {
  /** Number of accepted flashcards */
  acceptedCount: number;
  /** Callback when save is clicked */
  onSave: () => void;
  /** Callback when cancel is clicked */
  onCancel: () => void;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Sticky bottom action bar for saving accepted flashcards
 * Displays count and provides save/cancel actions
 */
export function SaveActionsBar({
  acceptedCount,
  onSave,
  onCancel,
  isSaving,
  className,
}: SaveActionsBarProps) {
  const canSave = acceptedCount > 0 && !isSaving;

  return (
    <div
      className={cn(
        "sticky bottom-0 left-0 right-0 z-10",
        "bg-white dark:bg-gray-800",
        "border-t border-gray-200 dark:border-gray-700",
        "shadow-lg",
        className
      )}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Info */}
          <div className="flex items-center gap-3">
            {acceptedCount > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {acceptedCount} {acceptedCount === 1 ? "fiszka" : acceptedCount < 5 ? "fiszki" : "fiszek"} gotowa do zapisu
                  </span>
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Nie wybrano fiszek. Zaakceptuj lub edytuj kandydatów powyżej, aby kontynuować.
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={isSaving}
            >
              Anuluj
            </Button>
            <Button
              onClick={onSave}
              disabled={!canSave}
              className="min-w-[140px]"
            >
              {isSaving ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  Zapisywanie...
                </>
              ) : (
                `Zapisz ${acceptedCount} ${acceptedCount === 1 ? "fiszkę" : acceptedCount < 5 ? "fiszki" : "fiszek"}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
