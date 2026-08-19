import {
  createWorkspaceSnapshot,
  parseWorkspaceSnapshot,
  type WorkspaceSnapshot,
} from "../../workspaceData";
import { getCurrentUser } from "../auth/authService";
import { getSupabaseClient, supabaseConfigured } from "../supabase/client";

export function cloudSyncIsConfigured() {
  return supabaseConfigured;
}

export async function saveWorkspaceToCloud() {
  const client = getSupabaseClient();
  if (!client) throw new Error("cloud sync still needs its public app keys");

  const user = await getCurrentUser();
  if (!user) throw new Error("sign in before saving to your account");

  const snapshot = createWorkspaceSnapshot();
  const { error } = await client.from("workspace_backups").upsert(
    {
      user_id: user.id,
      snapshot,
      client_updated_at: snapshot.createdAt,
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
  return snapshot;
}

export async function loadWorkspaceFromCloud(): Promise<WorkspaceSnapshot> {
  const client = getSupabaseClient();
  if (!client) throw new Error("cloud sync still needs its public app keys");

  const user = await getCurrentUser();
  if (!user) throw new Error("sign in before restoring from your account");

  const { data, error } = await client
    .from("workspace_backups")
    .select("snapshot")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data?.snapshot) throw new Error("there is no cloud backup yet");

  return parseWorkspaceSnapshot(JSON.stringify(data.snapshot));
}
