import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateFlashcardsResponse, FlashcardDto, FlashcardInsert, ValidationErrorDetail, PaginatedFlashcardsResponse } from "../../types";
import type { CreateFlashcardInput, ListFlashcardsQueryInput } from "../schemas/flashcard.schema";
import { ValidationError, ForbiddenError } from "../errors/flashcard.errors";

/**
 * Validates business logic for a single flashcard
 * Checks source and generation_id consistency
 *
 * @param flashcard - Flashcard to validate
 * @param index - Index in array (for error reporting)
 * @returns ValidationErrorDetail if invalid, null if valid
 *
 * @example
 * const error = validateFlashcardCommand(flashcard, 0);
 * if (error) validationErrors.push(error);
 */
export function validateFlashcardCommand(flashcard: CreateFlashcardInput, index: number): ValidationErrorDetail | null {
  // Rule: manual source must have null generation_id
  if (flashcard.source === "manual" && flashcard.generation_id) {
    return {
      index,
      field: "generation_id",
      message: "generation_id must be null when source is 'manual'",
    };
  }

  // Rule: AI sources must have generation_id
  if (["ai-full", "ai-edited"].includes(flashcard.source) && !flashcard.generation_id) {
    return {
      index,
      field: "generation_id",
      message: `generation_id is required when source is '${flashcard.source}'`,
    };
  }

  return null;
}

/**
 * Verifies that all provided generation IDs belong to the user
 * Uses single query for efficiency
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to check ownership for
 * @param generationIds - Array of generation IDs to verify
 * @throws {ForbiddenError} When one or more generations don't belong to user
 *
 * @example
 * await verifyGenerationOwnership(supabase, userId, ["gen-id-1", "gen-id-2"]);
 */
export async function verifyGenerationOwnership(
  supabase: SupabaseClient,
  userId: string,
  generationIds: string[]
): Promise<void> {
  if (generationIds.length === 0) {
    return; // No generations to verify
  }

  const { data, error } = await supabase.from("generations").select("id").in("id", generationIds).eq("user_id", userId);

  if (error) {
    console.error("Failed to verify generation ownership:", error);
    throw new Error("Failed to verify generation ownership");
  }

  // Check if all generations were found
  if (!data || data.length !== generationIds.length) {
    const foundIds = new Set(data?.map((g) => g.id) || []);
    const missingIds = generationIds.filter((id) => !foundIds.has(id));

    throw new ForbiddenError(
      "One or more generations do not belong to the authenticated user",
      missingIds[0] // Include first missing ID in error
    );
  }
}

/**
 * Performs bulk insert of flashcards to database
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the flashcards
 * @param flashcards - Validated flashcard data
 * @returns Promise resolving to array of created flashcard DTOs
 * @throws {Error} When database insert fails
 *
 * @example
 * const created = await createFlashcards(supabase, userId, flashcards);
 */
export async function createFlashcards(
  supabase: SupabaseClient,
  userId: string,
  flashcards: CreateFlashcardInput[]
): Promise<FlashcardDto[]> {
  // Prepare insert data
  const insertData: FlashcardInsert[] = flashcards.map((card) => ({
    user_id: userId,
    front: card.front.trim(),
    back: card.back.trim(),
    source: card.source,
    generation_id: card.generation_id || null,
  }));

  // Bulk insert with RETURNING
  const { data, error } = await supabase.from("flashcards").insert(insertData).select();

  if (error || !data) {
    console.error("Failed to insert flashcards:", error);
    throw new Error("Failed to create flashcards");
  }

  // Map to DTOs (exclude user_id)
  return data.map((flashcard) => ({
    id: flashcard.id,
    generation_id: flashcard.generation_id,
    front: flashcard.front,
    back: flashcard.back,
    source: flashcard.source,
    created_at: flashcard.created_at,
    updated_at: flashcard.updated_at,
  }));
}

/**
 * Main orchestration function for flashcard creation
 * Coordinates validation, ownership verification, and database insert
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user ID
 * @param flashcards - Validated flashcard data from request
 * @returns Promise resolving to CreateFlashcardsResponse with created flashcards
 * @throws {ValidationError} When business validation fails
 * @throws {ForbiddenError} When generation ownership verification fails
 * @throws {Error} When database operations fail
 *
 * @example
 * const response = await processFlashcardCreation(supabase, userId, flashcards);
 */
export async function processFlashcardCreation(
  supabase: SupabaseClient,
  userId: string,
  flashcards: CreateFlashcardInput[]
): Promise<CreateFlashcardsResponse> {
  // Step 1: Validate business logic for each flashcard
  const validationErrors: ValidationErrorDetail[] = [];

  for (const [index, flashcard] of flashcards.entries()) {
    const error = validateFlashcardCommand(flashcard, index);
    if (error) {
      validationErrors.push(error);
    }
  }

  if (validationErrors.length > 0) {
    throw new ValidationError(validationErrors);
  }

  // Step 2: Extract unique generation IDs that need verification
  const uniqueGenerationIds = Array.from(
    new Set(flashcards.filter((f) => f.generation_id).map((f) => f.generation_id!))
  );

  // Step 3: Verify generation ownership (single query for all IDs)
  if (uniqueGenerationIds.length > 0) {
    await verifyGenerationOwnership(supabase, userId, uniqueGenerationIds);
  }

  // Step 4: Create flashcards in database
  const createdFlashcards = await createFlashcards(supabase, userId, flashcards);

  // Step 5: Build response
  return {
    created_count: createdFlashcards.length,
    flashcards: createdFlashcards,
  };
}

/**
 * Fetches paginated list of flashcards for a user with optional filtering and sorting
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch flashcards for
 * @param query - Query parameters for filtering, sorting, and pagination
 * @returns Promise resolving to paginated flashcards response
 * @throws {Error} When database query fails
 *
 * @example
 * const response = await listFlashcards(supabase, userId, { page: 1, limit: 20, sort: 'created_at', order: 'desc' });
 */
export async function listFlashcards(
  supabase: SupabaseClient,
  userId: string,
  query: ListFlashcardsQueryInput
): Promise<PaginatedFlashcardsResponse> {
  // Step 1: Build base query
  let queryBuilder = supabase
    .from("flashcards")
    .select("id, generation_id, front, back, source, created_at, updated_at", { count: "exact" })
    .eq("user_id", userId);

  // Step 2: Apply optional filters
  if (query.source) {
    queryBuilder = queryBuilder.eq("source", query.source);
  }

  if (query.generation_id) {
    queryBuilder = queryBuilder.eq("generation_id", query.generation_id);
  }

  // Step 3: Apply sorting
  queryBuilder = queryBuilder.order(query.sort, { ascending: query.order === "asc" });

  // Step 4: Apply pagination
  const from = (query.page - 1) * query.limit;
  const to = from + query.limit - 1;
  queryBuilder = queryBuilder.range(from, to);

  // Step 5: Execute query
  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error("Failed to fetch flashcards:", error);
    throw new Error("Failed to fetch flashcards");
  }

  // Step 6: Build response
  const total = count || 0;
  const totalPages = Math.ceil(total / query.limit);

  return {
    data: data || [],
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      total_pages: totalPages,
    },
  };
}

/**
 * Updates an existing flashcard's front and back content
 * Verifies ownership before updating
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the flashcard
 * @param flashcardId - ID of the flashcard to update
 * @param updateData - New content for front and back
 * @returns Promise resolving to updated flashcard DTO
 * @throws {Error} When flashcard not found or doesn't belong to user
 * @throws {Error} When database update fails
 *
 * @example
 * const updated = await updateFlashcard(supabase, userId, flashcardId, { front: "New front", back: "New back" });
 */
export async function updateFlashcard(
  supabase: SupabaseClient,
  userId: string,
  flashcardId: string,
  updateData: { front: string; back: string }
): Promise<FlashcardDto> {
  // Step 1: Verify flashcard exists and belongs to user
  const { data: existingFlashcard, error: fetchError } = await supabase
    .from("flashcards")
    .select("id, user_id")
    .eq("id", flashcardId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existingFlashcard) {
    throw new Error("Flashcard not found or you don't have permission to update it");
  }

  // Step 2: Update flashcard in database
  const { data: updatedFlashcard, error: updateError } = await supabase
    .from("flashcards")
    .update({
      front: updateData.front.trim(),
      back: updateData.back.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", flashcardId)
    .select("id, generation_id, front, back, source, created_at, updated_at")
    .single();

  if (updateError || !updatedFlashcard) {
    console.error("Failed to update flashcard:", updateError);
    throw new Error("Failed to update flashcard");
  }

  // Step 3: Return updated flashcard DTO
  return {
    id: updatedFlashcard.id,
    generation_id: updatedFlashcard.generation_id,
    front: updatedFlashcard.front,
    back: updatedFlashcard.back,
    source: updatedFlashcard.source,
    created_at: updatedFlashcard.created_at,
    updated_at: updatedFlashcard.updated_at,
  };
}

/**
 * Permanently deletes a flashcard
 * Verifies ownership before deletion
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the flashcard
 * @param flashcardId - ID of the flashcard to delete
 * @returns Promise resolving when deletion is complete
 * @throws {Error} When flashcard not found or doesn't belong to user
 * @throws {Error} When database deletion fails
 *
 * @example
 * await deleteFlashcard(supabase, userId, flashcardId);
 */
export async function deleteFlashcard(
  supabase: SupabaseClient,
  userId: string,
  flashcardId: string
): Promise<void> {
  // Step 1: Verify flashcard exists and belongs to user
  const { data: existingFlashcard, error: fetchError } = await supabase
    .from("flashcards")
    .select("id, user_id")
    .eq("id", flashcardId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existingFlashcard) {
    throw new Error("Flashcard not found or you don't have permission to delete it");
  }

  // Step 2: Delete flashcard from database
  const { error: deleteError } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", flashcardId);

  if (deleteError) {
    console.error("Failed to delete flashcard:", deleteError);
    throw new Error("Failed to delete flashcard");
  }
}
