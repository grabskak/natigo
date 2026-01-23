/**
 * Flashcard validators - walidacja pól formularza fiszki
 * Zgodne z business rules: front 1-200 znaków, back 1-500 znaków (po trim)
 */

import type { ValidationState, FlashcardFormData } from '@/types';

/**
 * Walidacja pola Front
 * Zasady:
 * - Wymagane (required): nie może być puste po trim
 * - Minimalna długość: 1 znak po trim
 * - Maksymalna długość: 200 znaków po trim
 */
export function validateFront(value: string): ValidationState {
  const trimmed = value.trim();
  
  // Empty check
  if (trimmed.length === 0) {
    return {
      isValid: false,
      message: 'Front is required',
    };
  }
  
  // Max length check
  if (trimmed.length > 200) {
    return {
      isValid: false,
      message: 'Front must not exceed 200 characters',
    };
  }
  
  // Valid
  return {
    isValid: true,
    message: null,
  };
}

/**
 * Walidacja pola Back
 * Zasady:
 * - Wymagane (required): nie może być puste po trim
 * - Minimalna długość: 1 znak po trim
 * - Maksymalna długość: 500 znaków po trim
 */
export function validateBack(value: string): ValidationState {
  const trimmed = value.trim();
  
  // Empty check
  if (trimmed.length === 0) {
    return {
      isValid: false,
      message: 'Back is required',
    };
  }
  
  // Max length check
  if (trimmed.length > 500) {
    return {
      isValid: false,
      message: 'Back must not exceed 500 characters',
    };
  }
  
  // Valid
  return {
    isValid: true,
    message: null,
  };
}

/**
 * Walidacja całego formularza fiszki
 * Zwraca obiekt z walidacją dla obu pól
 */
export function validateFlashcardForm(data: FlashcardFormData): {
  front: ValidationState;
  back: ValidationState;
  isValid: boolean;
} {
  const frontValidation = validateFront(data.front);
  const backValidation = validateBack(data.back);
  
  return {
    front: frontValidation,
    back: backValidation,
    isValid: frontValidation.isValid && backValidation.isValid,
  };
}
