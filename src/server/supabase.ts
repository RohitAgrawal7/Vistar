import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/server/http";

let client: SupabaseClient | null = null;

function supabaseUrl() {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  );
}

function supabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseKey());
}

export function getSupabase() {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) {
    throw new ApiError(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_PUBLISHABLE_KEY) in Vercel env / .env.local",
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
