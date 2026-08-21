import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/server/http";

let client: SupabaseClient | null = null;

/** Static process.env reads so Next/Vercel keep these bindings in the server bundle. */
function readEnv(...names: string[]) {
  for (const name of names) {
    // Keep each access as a literal key for the bundler.
    let value = "";
    switch (name) {
      case "SUPABASE_URL":
        value = process.env.SUPABASE_URL ?? "";
        break;
      case "NEXT_PUBLIC_SUPABASE_URL":
        value = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
        break;
      case "SUPABASE_SERVICE_ROLE_KEY":
        value = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
        break;
      case "SUPABASE_SECRET_KEY":
        value = process.env.SUPABASE_SECRET_KEY ?? "";
        break;
      case "SUPABASE_PUBLISHABLE_KEY":
        value = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        break;
      case "SUPABASE_ANON_KEY":
        value = process.env.SUPABASE_ANON_KEY ?? "";
        break;
      case "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY":
        value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
        break;
      case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
        value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
        break;
      default:
        break;
    }
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function supabaseUrl() {
  return readEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
}

function supabaseKey() {
  return readEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export function supabaseEnvStatus() {
  const url = Boolean(supabaseUrl());
  const key = Boolean(supabaseKey());
  // Names only — never values — so /api/health can show what Vercel actually injected.
  const present = [
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter((name) => {
    const value =
      name === "SUPABASE_URL"
        ? process.env.SUPABASE_URL
        : name === "NEXT_PUBLIC_SUPABASE_URL"
          ? process.env.NEXT_PUBLIC_SUPABASE_URL
          : name === "SUPABASE_SERVICE_ROLE_KEY"
            ? process.env.SUPABASE_SERVICE_ROLE_KEY
            : name === "SUPABASE_SECRET_KEY"
              ? process.env.SUPABASE_SECRET_KEY
              : name === "SUPABASE_PUBLISHABLE_KEY"
                ? process.env.SUPABASE_PUBLISHABLE_KEY
                : name === "SUPABASE_ANON_KEY"
                  ? process.env.SUPABASE_ANON_KEY
                  : name === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
                    ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                    : name === "NEXT_PUBLIC_SUPABASE_ANON_KEY"
                      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                      : undefined;
    return Boolean(value?.trim());
  });
  return {
    hasUrl: url,
    hasKey: key,
    configured: url && key,
    present,
    onVercel: Boolean(process.env.VERCEL),
  };
}

export function isSupabaseConfigured() {
  return supabaseEnvStatus().configured;
}

export function getSupabase() {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) {
    const missing = [
      !url ? "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)" : null,
      !key
        ? "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)"
        : null,
    ]
      .filter(Boolean)
      .join(" and ");
    throw new ApiError(
      `Supabase is not configured. Missing ${missing}. Set them in Vercel → Settings → Environment Variables, then Redeploy (Framework Preset: Next.js, not Services).`,
      503,
    );
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
