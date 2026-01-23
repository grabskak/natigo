import { cn } from "@/lib/utils";

interface CharacterCounterProps {
  /** Current character count */
  current: number;
  /** Maximum allowed characters */
  max: number;
  /** Minimum required characters (optional) */
  min?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable character counter with color-coding based on validation state
 * - Grey: below minimum
 * - Green: within valid range
 * - Red: above maximum
 */
export function CharacterCounter({
  current,
  max,
  min = 0,
  className,
}: CharacterCounterProps) {
  // Determine color based on current count
  const getColorClass = () => {
    if (current > max) {
      return "text-red-600 dark:text-red-400 font-semibold";
    }
    if (current >= min && current <= max) {
      return "text-green-600 dark:text-green-400 font-medium";
    }
    return "text-gray-500 dark:text-gray-400";
  };

  // Format number with thousand separators
  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US");
  };

  return (
    <div className={cn("text-sm", getColorClass(), className)} role="status" aria-live="polite">
      {formatNumber(current)} / {formatNumber(max)} characters
    </div>
  );
}
