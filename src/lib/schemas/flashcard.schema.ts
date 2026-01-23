import { z } from "zod";

/**
 * Enum for flashcard source types
 * Matches the database enum
 */
const FlashcardSourceEnum = z.enum(["manual", "ai-full", "ai-edited"]);

/**
 * Schema for creating a single flashcard
 * Validates front, back, source, and generation_id
 */
export const CreateFlashcardSchema = z.object({
  front: z.string().trim().min(1, "Front text cannot be empty").max(200, "Front text must not exceed 200 characters"),

  back: z.string().trim().min(1, "Back text cannot be empty").max(500, "Back text must not exceed 500 characters"),

  source: FlashcardSourceEnum.default("manual"),

  generation_id: z.string().uuid().nullable().optional(),
});

/**
 * Schema for creating multiple flashcards in a single request
 * Enforces minimum 1 and maximum 100 flashcards per request
 */
export const CreateFlashcardsRequestSchema = z
  .array(CreateFlashcardSchema)
  .min(1, "At least one flashcard is required")
  .max(100, "Maximum 100 flashcards per request");

/**
 * TypeScript type inferred from CreateFlashcardSchema
 */
export type CreateFlashcardInput = z.infer<typeof CreateFlashcardSchema>;

/**
 * TypeScript type inferred from CreateFlashcardsRequestSchema
 */
export type CreateFlashcardsRequestInput = z.infer<typeof CreateFlashcardsRequestSchema>;

/**
 * Schema for validating query parameters for listing flashcards
 * Used for GET /api/flashcards
 */
export const ListFlashcardsQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)).pipe(z.number().int().min(1, "Page must be at least 1")),
  
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)).pipe(z.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100")),
  
  sort: z.enum(["created_at", "updated_at"]).optional().default("created_at"),
  
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  
  source: FlashcardSourceEnum.optional(),
  
  generation_id: z.string().uuid().optional(),
});

/**
 * TypeScript type inferred from ListFlashcardsQuerySchema
 */
export type ListFlashcardsQueryInput = z.infer<typeof ListFlashcardsQuerySchema>;
