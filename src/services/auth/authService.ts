import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, supabase } from "../supabase/client";

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}

export function listenForAuthChanges(
  listener: (event: AuthChangeEvent, session: Session | null) => void
) {
  const client = getSupabaseClient();
  if (!client) return () => undefined;

  const { data } = client.auth.onAuthStateChange(listener);
  return () => data.subscription.unsubscribe();
}

export async function sendSignInLink(email: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error("cloud sync still needs its public app keys");

  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
