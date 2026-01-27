/**
 * FlashcardModal - Modal do tworzenia/edycji fiszki z walidacją
 */

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { validateFront, validateBack } from "@/lib/validators/flashcard.validator";
import type { FlashcardDto, FlashcardFormData, ValidationState } from "@/types";

interface FlashcardModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  flashcard: FlashcardDto | null;
  isSubmitting: boolean;
  error: { message: string } | null;
  onClose: () => void;
  onSubmit: (data: FlashcardFormData) => Promise<void>;
}

export default function FlashcardModal({
  isOpen,
  mode,
  flashcard,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: FlashcardModalProps) {
  // ========================================================================
  // Local State
  // ========================================================================

  const [formData, setFormData] = useState<FlashcardFormData>({
    front: "",
    back: "",
  });

  const [validation, setValidation] = useState<{
    front: ValidationState;
    back: ValidationState;
  }>({
    front: { isValid: true, message: null },
    back: { isValid: true, message: null },
  });

  const [touched, setTouched] = useState({
    front: false,
    back: false,
  });

  // ========================================================================
  // Effects
  // ========================================================================

  // Initialize form data when modal opens or flashcard changes
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && flashcard) {
        setFormData({
          front: flashcard.front,
          back: flashcard.back,
        });
      } else {
        setFormData({
          front: "",
          back: "",
        });
      }

      // Reset validation and touched state
      setValidation({
        front: { isValid: true, message: null },
        back: { isValid: true, message: null },
      });
      setTouched({
        front: false,
        back: false,
      });
    }
  }, [isOpen, mode, flashcard]);

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, front: value }));

    // Validate immediately
    const frontValidation = validateFront(value);
    setValidation((prev) => ({ ...prev, front: frontValidation }));
  };

  const handleBackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, back: value }));

    // Validate immediately
    const backValidation = validateBack(value);
    setValidation((prev) => ({ ...prev, back: backValidation }));
  };

  const handleFrontBlur = () => {
    setTouched((prev) => ({ ...prev, front: true }));
  };

  const handleBackBlur = () => {
    setTouched((prev) => ({ ...prev, back: true }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ front: true, back: true });

    // Validate all fields
    const frontValidation = validateFront(formData.front);
    const backValidation = validateBack(formData.back);

    setValidation({
      front: frontValidation,
      back: backValidation,
    });

    // Check if form is valid
    if (!frontValidation.isValid || !backValidation.isValid) {
      return;
    }

    // Submit
    await onSubmit(formData);
  };

  // ========================================================================
  // Computed Values
  // ========================================================================

  const frontLength = formData.front.trim().length;
  const backLength = formData.back.trim().length;
  const isValid = validation.front.isValid && validation.back.isValid;
  const canSubmit = isValid && frontLength > 0 && backLength > 0 && !isSubmitting;

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="flashcard-modal">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Dodaj fiszkę ręcznie" : "Edytuj fiszkę"}</DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Utwórz nową fiszkę, wypełniając zawartość przodu i tyłu."
              : "Edytuj zawartość swojej fiszki."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Front Field */}
            <div className="space-y-2">
              <Label htmlFor="front" className="text-sm font-medium">
                Przód
              </Label>
              <Input
                id="front"
                value={formData.front}
                onChange={handleFrontChange}
                onBlur={handleFrontBlur}
                placeholder="Wpisz przód fiszki..."
                disabled={isSubmitting}
                className={touched.front && !validation.front.isValid ? "border-destructive" : ""}
                data-testid="flashcard-modal-front-input"
              />

              {/* Character Counter */}
              <div className="flex justify-between items-center">
                <p className={`text-sm ${frontLength > 200 ? "text-destructive" : "text-muted-foreground"}`}>
                  {frontLength}/200 znaków
                </p>
              </div>

              {/* Validation Error */}
              {touched.front && !validation.front.isValid && (
                <p className="text-sm text-destructive">{validation.front.message}</p>
              )}
            </div>

            {/* Back Field */}
            <div className="space-y-2">
              <Label htmlFor="back" className="text-sm font-medium">
                Tył
              </Label>
              <Textarea
                id="back"
                value={formData.back}
                onChange={handleBackChange}
                onBlur={handleBackBlur}
                placeholder="Wpisz tył fiszki..."
                rows={4}
                disabled={isSubmitting}
                className={touched.back && !validation.back.isValid ? "border-destructive" : ""}
                data-testid="flashcard-modal-back-textarea"
              />

              {/* Character Counter */}
              <div className="flex justify-between items-center">
                <p className={`text-sm ${backLength > 500 ? "text-destructive" : "text-muted-foreground"}`}>
                  {backLength}/500 znaków
                </p>
              </div>

              {/* Validation Error */}
              {touched.back && !validation.back.isValid && (
                <p className="text-sm text-destructive">{validation.back.message}</p>
              )}
            </div>

            {/* API Error */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3" data-testid="flashcard-modal-error">
                <p className="text-sm text-destructive">{error.message}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="flashcard-modal-cancel-button"
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={!canSubmit} data-testid="flashcard-modal-submit-button">
              {isSubmitting ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
