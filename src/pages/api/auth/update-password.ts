import type { APIRoute } from "astro";
import type { ErrorResponse } from "../../../types";
import { errorResponse } from "../../../lib/utils/api-helpers";
import { UpdatePasswordSchema } from "../../../lib/schemas/auth.schema";

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

  const parsed = UpdatePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return errorResponse(400, "VALIDATION_FAILED", firstError?.message ?? "Validation failed", {
      field: firstError?.path?.join(".") ?? "body",
    });
  }

  const { password } = parsed.data;

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.status === 401) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AUTH_REQUIRED",
            message: "Reset link is invalid or expired. Request a new one.",
          },
        } satisfies ErrorResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error("Update password error:", error);
    return errorResponse(500, "INTERNAL_SERVER_ERROR", "Update password failed");
  }

  return new Response(JSON.stringify({ message: "Password updated." }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
