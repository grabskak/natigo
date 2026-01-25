import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { SupabaseClient as SupabaseClientBase } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

export type SupabaseClient = SupabaseClientBase<Database>;

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  // In dev (http://localhost) secure cookies won't be set. In prod we always want secure cookies.
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: "lax",
};

type AstroCookieOptions = Parameters<AstroCookies["set"]>[2];
interface CookiesToSet {
  name: string;
  value: string;
  options?: AstroCookieOptions;
}

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet: CookiesToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};
