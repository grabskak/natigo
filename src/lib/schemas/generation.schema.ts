import { z } from "zod";

/**
 * Schema for validating flashcard generation request
 * Enforces input text length requirements (1000-10000 characters)
 */
export const GenerateFlashcardsSchema = z.object({
  input_text: z
    .string()
    .trim()
    .min(1000, "Input text must be at least 1000 characters")
    .max(10000, "Input text must not exceed 10000 characters"),
});

/**
 * Type inference from schema
 */
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsSchema>;
