import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(
  import.meta.env.VITE_SUPABASE_URL ?? ""
).trim();

const supabaseKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    ""
).trim();

export const supabaseConfigured = Boolean(
  supabaseUrl && supabaseKey
);

export const supabase = createClient(
  supabaseUrl ||
    "https://placeholder.supabase.co",
  supabaseKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
