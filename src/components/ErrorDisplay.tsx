import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types";

interface ErrorDisplayProps {
  /** API error object */
  error: ApiError;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Callback to go back to form */
  onBackToForm?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Error display component with retry and back-to-form actions
 * Shows appropriate error messages based on error code
 */
export function ErrorDisplay({
  error,
  onRetry,
  onBackToForm,
  className,
}: ErrorDisplayProps) {
  // Determine if retry is available based on error code
  const canRetry =
    error.code === "AI_SERVICE_ERROR" ||
    error.code === "AI_TIMEOUT" ||
    error.code === "NETWORK_ERROR" ||
    error.code === "RATE_LIMIT_EXCEEDED";

  // Get user-friendly title based on error code
  const getErrorTitle = () => {
    switch (error.code) {
      case "RATE_LIMIT_EXCEEDED":
        return "Przekroczono limit zapytań";
      case "AI_TIMEOUT":
        return "Upłynął czas żądania";
      case "AI_SERVICE_ERROR":
        return "Błąd usługi AI";
      case "NETWORK_ERROR":
        return "Błąd połączenia";
      case "VALIDATION_FAILED":
        return "Nieprawidłowe dane";
      case "AUTH_REQUIRED":
        return "Wymagane uwierzytelnienie";
      default:
        return "Wystąpił błąd";
    }
  };

  // Get additional details if available
  const getErrorDetails = () => {
    if (!error.details) return null;

    // Rate limit details
    if (error.code === "RATE_LIMIT_EXCEEDED" && typeof error.details === "object" && "retry_after_seconds" in error.details) {
      return `Spróbuj ponownie za ${error.details.retry_after_seconds} sekund.`;
    }

    return null;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Error Icon */}
      <div className="w-16 h-16 mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Error Title */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
        {getErrorTitle()}
      </h2>

      {/* Error Message */}
      <p className="text-base text-gray-700 dark:text-gray-300 mb-2 text-center max-w-md">
        {error.message}
      </p>

      {/* Additional Details */}
      {getErrorDetails() && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
          {getErrorDetails()}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        {canRetry && onRetry && (
          <Button onClick={onRetry} variant="default">
            Spróbuj ponownie
          </Button>
        )}
        {onBackToForm && (
          <Button onClick={onBackToForm} variant="outline">
            Powrót do formularza
          </Button>
        )}
      </div>
    </div>
  );
}
