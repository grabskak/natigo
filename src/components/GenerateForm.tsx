import { useState, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CharacterCounter } from "@/components/CharacterCounter";
import { cn } from "@/lib/utils";
import type { ValidationState } from "@/types";

interface GenerateFormProps {
  /** Callback when generate button is clicked */
  onGenerate: (text: string) => void;
  /** Whether generation is in progress */
  isLoading: boolean;
  /** Additional CSS classes */
  className?: string;
}

const MIN_CHARS = 1000;
const MAX_CHARS = 10000;

/**
 * Form component for entering text to generate flashcards from
 * Includes textarea, character counter, and validation
 */
export function GenerateForm({
  onGenerate,
  isLoading,
  className,
}: GenerateFormProps) {
  const [text, setText] = useState("");
  const [validation, setValidation] = useState<ValidationState>({
    isValid: false,
    message: null,
  });

  /**
   * Validate input text length (after trim)
   */
  const validateText = useCallback((value: string): ValidationState => {
    const trimmed = value.trim();
    const length = trimmed.length;

    if (length === 0) {
      return {
        isValid: false,
        message: null, // No message when empty
      };
    }

    if (length < MIN_CHARS) {
      return {
        isValid: false,
        message: `Tekst musi mieć co najmniej ${MIN_CHARS.toLocaleString()} znaków (obecnie ${length.toLocaleString()})`,
      };
    }

    if (length > MAX_CHARS) {
      return {
        isValid: false,
        message: `Tekst nie może przekraczać ${MAX_CHARS.toLocaleString()} znaków (obecnie ${length.toLocaleString()})`,
      };
    }

    return {
      isValid: true,
      message: null,
    };
  }, []);

  /**
   * Handle textarea change
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setText(value);
      setValidation(validateText(value));
    },
    [validateText]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      const trimmed = text.trim();
      const currentValidation = validateText(trimmed);

      if (currentValidation.isValid) {
        onGenerate(trimmed);
      }
    },
    [text, validateText, onGenerate]
  );

  /**
   * Handle clear button click
   */
  const handleClear = useCallback(() => {
    setText("");
    setValidation({
      isValid: false,
      message: null,
    });
  }, []);

  const trimmedLength = text.trim().length;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-4", className)}
      noValidate
      data-testid="generate-form"
    >
      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
          Instrukcja
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Wklej swój tekst poniżej (od {MIN_CHARS.toLocaleString()} do{" "}
          {MAX_CHARS.toLocaleString()} znaków). Nasze AI przeanalizuje go i
          wygeneruje fiszki do przejrzenia.
        </p>
      </div>

      {/* Textarea Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="input-text"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Twój tekst
          </label>
          <CharacterCounter
            current={trimmedLength}
            max={MAX_CHARS}
            min={MIN_CHARS}
          />
        </div>

        <Textarea
          id="input-text"
          value={text}
          onChange={handleChange}
          placeholder="Wklej tutaj swój tekst..."
          rows={18}
          autoFocus
          disabled={isLoading}
          className={cn(
            "resize-none font-mono text-sm",
            !validation.isValid && validation.message && "border-red-500 dark:border-red-400"
          )}
          aria-invalid={!validation.isValid && validation.message ? "true" : "false"}
          aria-describedby={validation.message ? "text-error" : undefined}
          data-testid="generate-input-textarea"
        />

        {/* Validation Message */}
        {validation.message && (
          <p
            id="text-error"
            className="text-sm text-red-600 dark:text-red-400"
            role="alert"
            data-testid="generate-validation-error"
          >
            {validation.message}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 items-center">
        <Button
          type="submit"
          disabled={!validation.isValid || isLoading}
          className="min-w-[180px]"
          data-testid="generate-submit-button"
        >
          {isLoading ? "Generowanie..." : "Generuj fiszki"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={isLoading || text.length === 0}
          data-testid="generate-clear-button"
        >
          Wyczyść
        </Button>

        {isLoading && (
          <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
            To może potrwać do 60 sekund...
          </span>
        )}
      </div>
    </form>
  );
}
