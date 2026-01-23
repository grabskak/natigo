import type { APIRoute } from "astro";
import { CreateFlashcardsRequestSchema, ListFlashcardsQuerySchema } from "../../../lib/schemas/flashcard.schema";
import { processFlashcardCreation, listFlashcards } from "../../../lib/services/flashcard.service";
import { ValidationError, ForbiddenError } from "../../../lib/errors/flashcard.errors";
import type { ErrorResponse } from "../../../types";

export const prerender = false;

/**
 * GET /api/flashcards
 * Retrieves paginated list of flashcards with optional filtering and sorting
 *
 * @returns 200 with PaginatedFlashcardsResponse on success
 * @returns 400 for validation errors (invalid query params)
 * @returns 401 for authentication errors
 * @returns 500 for server errors
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Get Supabase client from locals (set by middleware)
    const supabase = locals.supabase;
    const user = {
      id: "e3772e64-42ce-4cbf-b16c-89696e01a6e3",
    };

    console.log("✅ GET /api/flashcards - User ID:", user.id);

    /*
    // Step 2: Extract and validate Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AUTH_REQUIRED",
            message: "Valid authentication token is required",
          },
        } satisfies ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Validate JWT token and get user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AUTH_REQUIRED",
            message: "Valid authentication token is required",
          },
        } satisfies ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    */

    // Step 4: Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams: Record<string, string> = {};

    // Only include non-null parameters
    const page = url.searchParams.get("page");
    const limit = url.searchParams.get("limit");
    const sort = url.searchParams.get("sort");
    const order = url.searchParams.get("order");
    const source = url.searchParams.get("source");
    const generation_id = url.searchParams.get("generation_id");

    if (page) queryParams.page = page;
    if (limit) queryParams.limit = limit;
    if (sort) queryParams.sort = sort;
    if (order) queryParams.order = order;
    if (source) queryParams.source = source;
    if (generation_id) queryParams.generation_id = generation_id;

    const validation = ListFlashcardsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      const firstError = validation.error.errors[0];

      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: firstError.message,
            details: {
              field: firstError.path.join("."),
              issue: firstError.message,
            },
          },
        } satisfies ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Fetch flashcards from database
    const result = await listFlashcards(supabase, user.id, validation.data);

    console.log("✅ Fetched flashcards:", result.data.length, "total:", result.pagination.total);

    // Step 6: Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Generic server error (500)
    console.error("Unexpected error in GET /api/flashcards:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while fetching flashcards",
        },
      } satisfies ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * POST /api/flashcards
 * Creates one or multiple flashcards (manual or AI-generated)
 *
 * @returns 201 with CreateFlashcardsResponse on success
 * @returns 400 for validation errors
 * @returns 401 for authentication errors
 * @returns 403 for forbidden operations (generation ownership)
 * @returns 422 for unprocessable entity (business validation)
 * @returns 500 for server errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Get Supabase client from locals (set by middleware)
    const supabase = locals.supabase;
    const user = {
      id: "e3772e64-42ce-4cbf-b16c-89696e01a6e3", // np. "123e4567-e89b-12d3-a456-426614174000"
    };

    console.log("✅ User ID:", user.id);
    /*
    // Step 2: Extract and validate Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AUTH_REQUIRED",
            message: "Valid authentication token is required",
          },
        } satisfies ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Validate JWT token and get user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AUTH_REQUIRED",
            message: "Valid authentication token is required",
          },
        } satisfies ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
*/
    // Step 4: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: "Invalid JSON in request body",
            details: {
              issue: "Request body must be valid JSON",
            },
          },
        } satisfies ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Quick validation before Zod (fail fast)
    if (!Array.isArray(body)) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: "Request body must be an array",
            details: {
              issue: "Expected array of flashcards",
            },
          },
        } satisfies ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (body.length === 0) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: "At least one flashcard is required",
            details: {
              issue: "Request body must be a non-empty array",
            },
          },
        } satisfies ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Validate request body with Zod schema
    const validation = CreateFlashcardsRequestSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];

      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: firstError.message,
            details: {
              field: firstError.path.join(".") || "flashcards",
              issue: firstError.message,
            },
          },
        } satisfies ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 7: Process flashcard creation (main business logic)
    const result = await processFlashcardCreation(supabase, user.id, validation.data);

    // Step 8: Return success response
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific error types with appropriate HTTP status codes

    // Business validation failed (422)
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: error.message,
            details: error.validationErrors,
          },
        } satisfies ErrorResponse),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Forbidden operation (403)
    if (error instanceof ForbiddenError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: error.message,
            ...(error.generationId && {
              details: { generation_id: error.generationId },
            }),
          },
        } satisfies ErrorResponse),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generic server error (500)
    //console.error("Unexpected error in POST /api/flashcards:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while creating flashcards",
        },
      } satisfies ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
