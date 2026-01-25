import type { APIRoute } from "astro";
import { errorResponse } from "../../../lib/utils/api-helpers";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;
  if (!supabase) {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", "Supabase client is not initialized");
  }

  // Best-effort logout: clear cookies if possible, but do not leak details.
  const { error } = await supabase.auth.signOut();
  if (error) {
    return errorResponse(500, "INTERNAL_SERVER_ERROR", "Logout failed");
  }

  return new Response(null, { status: 204 });
};

