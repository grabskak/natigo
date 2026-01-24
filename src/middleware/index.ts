import { defineMiddleware } from "astro:middleware";

import type { APIContext } from "astro";
import { createSupabaseServerInstance } from "../db/supabase.client.ts";

function isEmailConfirmed(user: { email_confirmed_at?: string | null; confirmed_at?: string | null }): boolean {
  const confirmedAt = user.email_confirmed_at ?? user.confirmed_at;
  return typeof confirmedAt === "string" && confirmedAt.length > 0;
}

function isPublicAssetPath(pathname: string) {
  if (pathname.startsWith("/_astro/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/favicon.png") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap-index.xml") return true;
  if (pathname.endsWith(".css")) return true;
  if (pathname.endsWith(".js")) return true;
  if (pathname.endsWith(".map")) return true;
  if (pathname.endsWith(".png")) return true;
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return true;
  if (pathname.endsWith(".webp")) return true;
  if (pathname.endsWith(".svg")) return true;
  if (pathname.endsWith(".ico")) return true;
  return false;
}

function buildNextParam(url: URL) {
  const next = `${url.pathname}${url.search}`;
  return encodeURIComponent(next);
}

function jsonAuthRequired() {
  return new Response(
    JSON.stringify({
      error: { code: "AUTH_REQUIRED", message: "Authentication is required" },
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

function shouldProtectApi(pathname: string) {
  if (!pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/api/auth/")) return false;
  return true;
}

export const onRequest = defineMiddleware(async (context: APIContext, next) => {
  const { locals, cookies, request, url, redirect } = context;

  if (isPublicAssetPath(url.pathname)) {
    return next();
  }

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  locals.supabase = supabase;

  // IMPORTANT: Always get user session first before any other operations
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let effectiveUser = user ?? null;
  if (effectiveUser && !isEmailConfirmed(effectiveUser)) {
    // Treat unconfirmed accounts as logged out to enforce email confirmation.
    // Also clear cookies to avoid redirect loops.
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error("Middleware: failed to sign out unconfirmed session:", signOutError);
    }
    effectiveUser = null;
  }

  if (effectiveUser) {
    locals.user = { id: effectiveUser.id, email: effectiveUser.email };
  }

  // If already logged in, keep login/register inaccessible (always redirect to /generations).
  if (effectiveUser && (url.pathname === "/login" || url.pathname === "/register")) {
    return redirect("/generations");
  }

  // Protect all API routes except /api/auth/*
  if (shouldProtectApi(url.pathname) && !effectiveUser) {
    return jsonAuthRequired();
  }

  // Protect selected pages
  if ((url.pathname === "/flashcards" || url.pathname === "/generations") && !effectiveUser) {
    return redirect(`/login?next=${buildNextParam(url)}`);
  }

  return next();
});
