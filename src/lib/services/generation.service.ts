import type { SupabaseClient } from "../../db/supabase.client";
import type {
  FlashcardCandidateDto,
  GenerationInsert,
  GenerationErrorLogInsert,
  GenerateFlashcardsResponse,
  GenerationMetadata,
} from "../../types";
import { RateLimitError, AIServiceError, AITimeoutError } from "../errors/generation.errors";
import type { AIFlashcard } from "./ai.service";
import { generateFlashcardsWithAI } from "./ai.service";
import { generateSHA256Hash } from "./hash.service";

/**
 * Rate limit configuration
 */
const RATE_LIMIT_WINDOW_HOURS = 1;
const RATE_LIMIT_MAX_GENERATIONS = 10;

/**
 * Checks if user has exceeded rate limit for generations
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to check rate limit for
 * @returns Promise resolving to current generation count
 * @throws {RateLimitError} When user has exceeded rate limit
 *
 * @example
 * await checkRateLimit(supabase, userId); // throws if exceeded
 */
export async function checkRateLimit(supabase: SupabaseClient, userId: string): Promise<void> {
  // Calculate time window (last hour)
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS);

  // Query generations count in time window
  const { count, error } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", windowStart.toISOString());

  if (error) {
    console.error("Rate limit check failed:", error);
    throw new Error("Failed to check rate limit");
  }

  const currentCount = count || 0;

  // Check if limit exceeded
  if (currentCount >= RATE_LIMIT_MAX_GENERATIONS) {
    // Calculate retry_after in seconds
    const oldestGenerationTime = new Date();
    oldestGenerationTime.setHours(oldestGenerationTime.getHours() - RATE_LIMIT_WINDOW_HOURS);
    const retryAfter = Math.ceil(
      (oldestGenerationTime.getTime() + RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000 - Date.now()) / 1000
    );

    throw new RateLimitError(
      `Maximum ${RATE_LIMIT_MAX_GENERATIONS} generations per hour allowed`,
      retryAfter,
      currentCount,
      RATE_LIMIT_MAX_GENERATIONS
    );
  }
}

/**
 * Creates a generation record in the database
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID who initiated the generation
 * @param inputTextHash - SHA-256 hash of input text
 * @param inputTextLength - Length of input text in characters
 * @param durationMs - Time taken for generation in milliseconds
 * @param generatedCount - Number of flashcards generated
 * @returns Promise resolving to generation ID
 * @throws {Error} When database insert fails
 *
 * @example
 * const generationId = await createGeneration(supabase, userId, hash, 5000, 3500, 12);
 */
export async function createGeneration(
  supabase: SupabaseClient,
  userId: string,
  inputTextHash: string,
  inputTextLength: number,
  durationMs: number,
  generatedCount: number
): Promise<string> {
  const generationData: GenerationInsert = {
    user_id: userId,
    input_text_hash: inputTextHash,
    input_text_length: inputTextLength,
    duration_ms: durationMs,
    generated_count: generatedCount,
    accepted_edited_count: null,
    accepted_unedited_count: null,
  };

  const { data, error } = await supabase.from("generations").insert(generationData).select("id").single();

  if (error || !data) {
    console.error("Failed to create generation record:", error);
    throw new Error("Failed to save generation data");
  }

  return data.id;
}

/**
 * Logs generation error to database
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID associated with the error
 * @param errorCode - Standardized error code (e.g., "AI_TIMEOUT", "RATE_LIMIT_EXCEEDED")
 * @param errorMessage - Sanitized error message (max 1000 chars)
 * @param generationId - Optional generation ID if error occurred after generation created
 * @returns Promise resolving when log is saved
 *
 * @example
 * await logGenerationError(supabase, userId, "AI_TIMEOUT", "Service timeout", generationId);
 */
export async function logGenerationError(
  supabase: SupabaseClient,
  userId: string,
  errorCode: string,
  errorMessage: string,
  generationId?: string | null
): Promise<void> {
  // Sanitize and limit error message length
  const sanitizedMessage = errorMessage.slice(0, 1000);

  const errorLog: GenerationErrorLogInsert = {
    generation_id: generationId || null,
    user_id: userId,
    error_code: errorCode,
    error_message: sanitizedMessage,
  };

  const { error } = await supabase.from("generation_error_logs").insert(errorLog);

  if (error) {
    // Log to console but don't throw - error logging failure shouldn't break the flow
    console.error("Failed to log generation error:", error);
  }
}

/**
 * Validates and filters AI-generated flashcard candidates
 * Ensures each candidate meets length requirements and has valid content
 *
 * @param aiFlashcards - Raw flashcards from AI service
 * @returns Array of validated flashcard candidates with source field
 *
 * @example
 * const candidates = validateFlashcardCandidates(aiFlashcards);
 */
export function validateFlashcardCandidates(aiFlashcards: AIFlashcard[]): FlashcardCandidateDto[] {
  return aiFlashcards
    .map((card) => ({
      front: card.front.trim(),
      back: card.back.trim(),
      source: "ai-full" as const,
    }))
    .filter((card) => {
      // Validate front length (1-200 characters)
      if (card.front.length < 1 || card.front.length > 200) {
        return false;
      }
      // Validate back length (1-500 characters)
      if (card.back.length < 1 || card.back.length > 500) {
        return false;
      }
      return true;
    });
}

/**
 * Main orchestration function for flashcard generation process
 * Handles the complete flow from validation to database storage
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user ID
 * @param inputText - Input text to generate flashcards from (already validated)
 * @returns Promise resolving to complete generation response
 * @throws {RateLimitError} When user exceeds rate limit
 * @throws {AITimeoutError} When AI service times out
 * @throws {AIServiceError} When AI service fails
 * @throws {Error} When database operations fail
 *
 * @example
 * const response = await processGeneration(supabase, userId, inputText);
 */
export async function processGeneration(
  supabase: SupabaseClient,
  userId: string,
  inputText: string
): Promise<GenerateFlashcardsResponse> {
  const startTime = Date.now();
  let generationId: string | null = null;

  try {
    // Step 1: Check rate limit
    await checkRateLimit(supabase, userId);
    console.info("after checkRateLimit");
    // Step 2: Generate hash of input text (for privacy and duplicate detection)
    const inputTextHash = generateSHA256Hash(inputText);
    const inputTextLength = inputText.length;
    console.info("after inputTextLength");
    // Step 3: Call AI service to generate flashcards
    const aiFlashcards = await generateFlashcardsWithAI(inputText);

    // Calculate duration
    const durationMs = Date.now() - startTime;

    // Step 4: Validate and filter candidates
    const candidates = validateFlashcardCandidates(aiFlashcards);

    if (candidates.length === 0) {
      throw new AIServiceError("No valid flashcards could be generated from the input");
    }

    // Step 5: Save generation record to database
    generationId = await createGeneration(
      supabase,
      userId,
      inputTextHash,
      inputTextLength,
      durationMs,
      candidates.length
    );

    // Step 6: Build metadata
    const metadata: GenerationMetadata = {
      input_text_length: inputTextLength,
      duration_ms: durationMs,
      generated_count: candidates.length,
    };

    // Step 7: Return complete response
    return {
      generation_id: generationId,
      candidates,
      metadata,
    };
  } catch (error) {
    // Log errors to database (except validation errors)
    if (error instanceof RateLimitError) {
      await logGenerationError(supabase, userId, "RATE_LIMIT_EXCEEDED", error.message, generationId);
      throw error;
    }

    if (error instanceof AITimeoutError) {
      await logGenerationError(supabase, userId, "AI_TIMEOUT", error.message, generationId);
      throw error;
    }

    if (error instanceof AIServiceError) {
      await logGenerationError(supabase, userId, "AI_SERVICE_ERROR", error.message, generationId);
      throw error;
    }

    // Log unknown errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logGenerationError(supabase, userId, "INTERNAL_ERROR", errorMessage, generationId);

    throw error;
  }
}
