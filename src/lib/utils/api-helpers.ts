/**
 * API Helper Functions
 * Reusable utility functions for API endpoints
 */

import type { ErrorResponse } from "../../types";

/**
 * Helper function to create standardized error responses
 *
 * @param status - HTTP status code
 * @param code - Application-specific error code
 * @param message - Human-readable error message
 * @param details - Optional additional error details
 * @returns Response object with JSON error body
 *
 * @example
 * return errorResponse(404, "NOT_FOUND", "Resource not found");
 */
export function errorResponse(status: number, code: string, message: string, details?: unknown): Response {
  return new Response(
    JSON.stringify({
      error: { code, message, ...(details && { details }) },
    } satisfies ErrorResponse),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Helper function to validate UUID format
 *
 * @param id - String to validate as UUID
 * @returns true if valid UUID format, false otherwise
 *
 * @example
 * if (!isValidUUID(id)) {
 *   return errorResponse(400, "VALIDATION_FAILED", "Invalid ID format");
 * }
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Helper function to get authenticated user
 * Currently returns hardcoded user ID for testing
 * TODO: Replace with actual auth when login is ready
 *
 * @returns User object with id
 *
 * @example
 * const user = getAuthenticatedUser();
 * console.log("User ID:", user.id);
 */
export function getAuthenticatedUser() {
  // TEMPORARY: Hardcoded user ID for testing
  return {
    id: "e3772e64-42ce-4cbf-b16c-89696e01a6e3",
  };

  /*
  // TODO: Uncomment when auth is ready
  // This should be called within async context with request and supabase
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("AUTH_REQUIRED");
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new Error("AUTH_REQUIRED");
  }

  return user;
  */
}
