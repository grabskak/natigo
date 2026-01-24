import type { APIRoute } from "astro";
import type { ErrorResponse } from "../../../types";
import { errorResponse } from "../../../lib/utils/api-helpers";
import { RegisterSchema } from "../../../lib/schemas/auth.schema";

export const prerender = false;

function isEmailAlreadyInUse(message: string) {
  const msg = message.toLowerCase();
  return (
    msg.includes("already registered") ||
    msg.includes("already exists") ||
    msg.includes("user already") ||
    msg.includes("duplicate")
  );
}

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

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return errorResponse(400, "VALIDATION_FAILED", firstError?.message ?? "Validation failed", {
      field: firstError?.path?.join(".") ?? "body",
    });
  }

  const { email, password, next } = parsed.data;

  let emailRedirectTo: string;
  try {
    const callbackUrl = new URL("/auth/callback", import.meta.env.SITE_URL);
    callbackUrl.searchParams.set("next", next ?? "/generations");
    emailRedirectTo = callbackUrl.toString();
  } catch {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", "SITE_URL is not configured correctly");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    if (isEmailAlreadyInUse(error.message)) {
      return new Response(
        JSON.stringify({
          error: {
            code: "EMAIL_ALREADY_IN_USE",
            message: "This email is already registered.",
          },
        } satisfies ErrorResponse),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error("Register error:", error);
    return errorResponse(500, "INTERNAL_SERVER_ERROR", "Registration failed");
  }

  if (!data.user) {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", "Registration failed");
  }

  // Supabase usually returns `session: null` when email confirmation is required.
  // However, depending on project configuration (or accidental use of a privileged key),
  // a session may still be created even though the email isn't confirmed yet.
  // In that case we must NOT treat the user as fully authenticated.
  const confirmedAt = data.user.email_confirmed_at ?? data.user.confirmed_at;
  const isEmailConfirmed = typeof confirmedAt === "string" && confirmedAt.length > 0;
  const requiresEmailConfirmation = !data.session || !isEmailConfirmed;

  if (requiresEmailConfirmation && data.session) {
    // Ensure we don't leave a valid session cookie around for an unconfirmed account.
    // (This also prevents redirect loops caused by middleware treating the user as logged-in.)
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error("Register: failed to sign out unconfirmed session:", signOutError);
    }
  }

  return new Response(
    JSON.stringify({
      user: { id: data.user.id, email: data.user.email },
      requiresEmailConfirmation,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

