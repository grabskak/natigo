import type { APIRoute } from "astro";
import { errorResponse } from "../../../lib/utils/api-helpers";
import { ResetPasswordRequestSchema } from "../../../lib/schemas/auth.schema";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
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

  const parsed = ResetPasswordRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return errorResponse(400, "VALIDATION_FAILED", firstError?.message ?? "Validation failed", {
      field: firstError?.path?.join(".") ?? "body",
    });
  }

  // US-004 non-disclosure: after validating input, always return success.
  let redirectTo: string;
  try {
    redirectTo = new URL("/auth/callback?next=/reset-password/confirm", import.meta.env.SITE_URL).toString();
  } catch {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", "SITE_URL is not configured correctly");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  if (error) {
    // Intentionally do not return error details (non-disclosure).
    console.error("Reset password error:", error);
  }

  return new Response(
    JSON.stringify({
      message: "If an account exists for this email, we sent a password reset link.",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

