import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabasePublicKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    ""
).trim();

export const supabaseConfigured = Boolean(supabaseUrl && supabasePublicKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabasePublicKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function getSupabaseClient() {
  return supabaseConfigured ? supabase : null;
}
