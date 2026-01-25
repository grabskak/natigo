import type { APIRoute } from "astro";
import { z } from "zod";
import type { ErrorResponse } from "../../../types";
import { updateFlashcard, deleteFlashcard } from "../../../lib/services/flashcard.service";
import { errorResponse, isValidUUID } from "../../../lib/utils/api-helpers";

export const prerender = false;

// ============================================================================
// Zod Schema for Update
// ============================================================================

const UpdateFlashcardSchema = z.object({
  front: z
    .string()
    .trim()
    .min(1, "Front text cannot be empty")
    .max(200, "Front text must not exceed 200 characters"),

  back: z
    .string()
    .trim()
    .min(1, "Back text cannot be empty")
    .max(500, "Back text must not exceed 500 characters"),
});

type UpdateFlashcardInput = z.infer<typeof UpdateFlashcardSchema>;

// ============================================================================
// PUT /api/flashcards/{id} - Update Flashcard
// ============================================================================

/**
 * PUT /api/flashcards/{id}
 * Updates an existing flashcard's front and back content
 *
 * @returns 200 with updated FlashcardDto on success
 * @returns 400 for validation errors
 * @returns 401 for authentication errors
 * @returns 404 for not found or unauthorized access
 * @returns 422 for unprocessable entity (validation failed)
 * @returns 500 for server errors
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    // Step 1: Get Supabase client from locals
    const supabase = locals.supabase;

    const user = locals.user;
    if (!user) {
      return errorResponse(401, "AUTH_REQUIRED", "Authentication is required");
    }

    // Step 3: Get flashcard ID from params
    const { id } = params;

    if (!id) {
      return errorResponse(400, "VALIDATION_FAILED", "Flashcard ID is required");
    }

    // Step 4: Validate ID is a UUID
    if (!isValidUUID(id)) {
      return errorResponse(400, "VALIDATION_FAILED", "Invalid flashcard ID format");
    }

    // Step 5: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        400,
        "VALIDATION_FAILED",
        "Invalid JSON in request body",
        {
          issue: "Request body must be valid JSON",
        }
      );
    }

    // Step 6: Validate request body with Zod schema
    const validation = UpdateFlashcardSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];

      return errorResponse(400, "VALIDATION_FAILED", firstError.message, {
        field: firstError.path.join(".") || "flashcard",
        issue: firstError.message,
      });
    }

    const updateData: UpdateFlashcardInput = validation.data;

    // Step 7: Update flashcard using service layer
    try {
      const updatedFlashcard = await updateFlashcard(
        supabase,
        user.id,
        id,
        updateData
      );

      console.log("✅ Flashcard updated successfully:", id);

      // Step 8: Return success response
      return new Response(JSON.stringify(updatedFlashcard), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (serviceError) {
      // Handle service layer errors
      if (serviceError instanceof Error) {
        if (serviceError.message.includes("not found") || serviceError.message.includes("permission")) {
          console.log("❌ Flashcard not found or doesn't belong to user:", id);
          return errorResponse(
            404,
            "NOT_FOUND",
            serviceError.message
          );
        }
      }
      
      // Generic error from service
      throw serviceError;
    }
  } catch (error) {
    // Generic server error (500)
    console.error("Unexpected error in PUT /api/flashcards/:id:", error);
    return errorResponse(
      500,
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while updating flashcard"
    );
  }
};

// ============================================================================
// DELETE /api/flashcards/{id} - Delete Flashcard
// ============================================================================

/**
 * DELETE /api/flashcards/{id}
 * Permanently deletes a flashcard
 *
 * @returns 204 No Content on success
 * @returns 401 for authentication errors
 * @returns 404 for not found or unauthorized access
 * @returns 500 for server errors
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Get Supabase client from locals
    const supabase = locals.supabase;

    const user = locals.user;
    if (!user) {
      return errorResponse(401, "AUTH_REQUIRED", "Authentication is required");
    }

    // Step 3: Get flashcard ID from params
    const { id } = params;

    if (!id) {
      return errorResponse(400, "VALIDATION_FAILED", "Flashcard ID is required");
    }

    // Step 4: Validate ID is a UUID
    if (!isValidUUID(id)) {
      return errorResponse(400, "VALIDATION_FAILED", "Invalid flashcard ID format");
    }

    // Step 5: Delete flashcard using service layer
    try {
      await deleteFlashcard(supabase, user.id, id);

      console.log("✅ Flashcard deleted successfully:", id);

      // Step 6: Return 204 No Content (empty response)
      return new Response(null, {
        status: 204,
      });
    } catch (serviceError) {
      // Handle service layer errors
      if (serviceError instanceof Error) {
        if (serviceError.message.includes("not found") || serviceError.message.includes("permission")) {
          console.log("❌ Flashcard not found or doesn't belong to user:", id);
          return errorResponse(
            404,
            "NOT_FOUND",
            serviceError.message
          );
        }
      }
      
      // Generic error from service
      throw serviceError;
    }
  } catch (error) {
    // Generic server error (500)
    console.error("Unexpected error in DELETE /api/flashcards/:id:", error);
    return errorResponse(
      500,
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while deleting flashcard"
    );
  }
};
