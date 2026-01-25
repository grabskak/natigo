import type { APIRoute } from "astro";
import type { ErrorResponse } from "../../../types";
import { errorResponse } from "../../../lib/utils/api-helpers";
import { LoginSchema } from "../../../lib/schemas/auth.schema";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // Guard: supabase should always be set by middleware
  const supabase = locals.supabase;
  if (!supabase) {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", "Supabase client is not initialized");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "VALIDATION_FAILED", "Invalid JSON in request body");
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return errorResponse(400, "VALIDATION_FAILED", firstError?.message ?? "Validation failed", {
      field: firstError?.path?.join(".") ?? "body",
    });
  }

  const { email, password } = parsed.data;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // US-002: always neutral.
  if (error || !data.user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      } satisfies ErrorResponse),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      user: { id: data.user.id, email: data.user.email },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

