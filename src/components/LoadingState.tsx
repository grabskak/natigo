import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Custom message to display (optional) */
  message?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading state component with spinner and message
 * Used during AI generation process
 */
export function LoadingState({
  message = "Generowanie fiszek... To może potrwać do 60 sekund.",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-12 px-4", className)}
      role="status"
      aria-live="polite"
    >
      {/* Spinner */}
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>

      {/* Message */}
      <p className="text-lg text-gray-700 dark:text-gray-300 text-center max-w-md">{message}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
        Proszę czekać, nasze AI przetwarza Twój tekst...
      </p>
    </div>
  );
}
