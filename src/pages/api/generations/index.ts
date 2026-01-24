import type { APIRoute } from "astro";
import { GenerateFlashcardsSchema } from "../../../lib/schemas/generation.schema";
import { processGeneration } from "../../../lib/services/generation.service";
import type { ErrorResponse } from "../../../types";
import { RateLimitError, AITimeoutError, AIServiceError } from "../../../lib/errors/generation.errors";
import { errorResponse } from "../../../lib/utils/api-helpers";

export const prerender = false;

/**
 * POST /api/generations
 * Generates flashcard candidates from user-provided text using AI
 *
 * @returns 201 with GenerateFlashcardsResponse on success
 * @returns 400 for validation errors
 * @returns 401 for authentication errors
 * @returns 429 for rate limit exceeded
 * @returns 500/504 for server/AI service errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
    const user = locals.user;
    if (!user) {
      return errorResponse(401, "AUTH_REQUIRED", "Authentication is required");
    }
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
          status: 422,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Validate request body with Zod schema
    const validation = GenerateFlashcardsSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      const inputLength =
        typeof body === "object" && body !== null && "input_text" in body && typeof body.input_text === "string"
          ? body.input_text.trim().length
          : 0;

      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: firstError.message,
            details: {
              field: firstError.path.join(".") || "input_text",
              length: inputLength,
              min: 1000,
              max: 10000,
            },
          },
        } satisfies ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    // Step 6: Process generation (main business logic)
    // TEMPORARY: Mock response to test endpoint without Supabase
    const result = await processGeneration(supabase, user.id, validation.data.input_text);
    /*
    const result = {
      generation_id: "550e8400-e29b-41d4-a716-446655440000",
      candidates: [
        {
          front: "What is TypeScript?",
          back: "A typed superset of JavaScript that compiles to plain JavaScript",
          source: "ai-full" as const,
        },
        {
          front: "What is Astro?",
          back: "A modern web framework for building fast, content-focused websites",
          source: "ai-full" as const,
        },
        {
          front: "What is Supabase?",
          back: "An open-source Firebase alternative with PostgreSQL database",
          source: "ai-full" as const,
        },
        {
          front: "What is REST API?",
          back: "Representational State Transfer - an architectural style for APIs",
          source: "ai-full" as const,
        },
        {
          front: "What is JWT?",
          back: "JSON Web Token - a compact way to securely transmit information",
          source: "ai-full" as const,
        },
        {
          front: "What is rate limiting?",
          back: "A technique to control the number of requests a user can make",
          source: "ai-full" as const,
        },
        {
          front: "What is SHA-256?",
          back: "A cryptographic hash function that produces a 256-bit output",
          source: "ai-full" as const,
        },
        {
          front: "What is Zod?",
          back: "A TypeScript-first schema validation library",
          source: "ai-full" as const,
        },
      ],
      metadata: {
        input_text_length: validation.data.input_text.length,
        duration_ms: 2150,
        generated_count: 8,
      },
    };

    console.log("✅ Mock response created:", { id: result.generation_id, count: result.candidates.length });
    */
    // Step 7: Return success response
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific error types with appropriate HTTP status codes

    // Rate limit exceeded (429)
    if (error instanceof RateLimitError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: error.message,
            details: {
              current_count: error.currentCount,
              limit: error.limit,
              retry_after_seconds: error.retryAfter,
            },
          },
        } satisfies ErrorResponse),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // AI service timeout (504)
    if (error instanceof AITimeoutError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AI_TIMEOUT",
            message: "AI service did not respond within 60 seconds",
          },
        } satisfies ErrorResponse),
        {
          status: 504,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // AI service error (500)
    if (error instanceof AIServiceError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AI_SERVICE_ERROR",
            message: error.message,
            details: error.details as Record<string, unknown> | undefined,
          },
        } satisfies ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generic server error (500)
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        },
      } satisfies ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
