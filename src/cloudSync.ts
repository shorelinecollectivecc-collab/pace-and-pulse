import type {
  AuthChangeEvent,
  Session,
  User,
} from "@supabase/supabase-js";
import {
  createWorkspaceSnapshot,
  parseWorkspaceSnapshot,
  type WorkspaceSnapshot,
} from "./workspaceData";
import {
  supabase,
  supabaseConfigured,
} from "./supabase";

export function cloudSyncIsConfigured() {
  return supabaseConfigured;
}

export function getCloudClient() {
  return supabaseConfigured
    ? supabase
    : null;
}

export async function getCloudUser(): Promise<User | null> {
  const activeClient = getCloudClient();

  if (!activeClient) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await activeClient.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export function listenForCloudAuth(
  listener: (
    event: AuthChangeEvent,
    session: Session | null
  ) => void
) {
  const activeClient = getCloudClient();

  if (!activeClient) {
    return () => undefined;
  }

  const {
    data: { subscription },
  } = activeClient.auth.onAuthStateChange(listener);

  return () => subscription.unsubscribe();
}

export async function sendCloudSignInLink(email: string) {
  const activeClient = getCloudClient();

  if (!activeClient) {
    throw new Error("cloud sync still needs its public app keys");
  }

  const { error } = await activeClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOutOfCloud() {
  const activeClient = getCloudClient();

  if (!activeClient) {
    return;
  }

  const { error } = await activeClient.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function saveWorkspaceToCloud() {
  const activeClient = getCloudClient();

  if (!activeClient) {
    throw new Error("cloud sync still needs its public app keys");
  }

  const user = await getCloudUser();

  if (!user) {
    throw new Error("sign in before saving to your account");
  }

  const snapshot = createWorkspaceSnapshot();
  const { error } = await activeClient.from("workspace_backups").upsert(
    {
      user_id: user.id,
      snapshot,
      client_updated_at: snapshot.createdAt,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }

  return snapshot;
}

export async function loadWorkspaceFromCloud(): Promise<WorkspaceSnapshot> {
  const activeClient = getCloudClient();

  if (!activeClient) {
    throw new Error("cloud sync still needs its public app keys");
  }

  const user = await getCloudUser();

  if (!user) {
    throw new Error("sign in before restoring from your account");
  }

  const { data, error } = await activeClient
    .from("workspace_backups")
    .select("snapshot")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.snapshot) {
    throw new Error("there is no cloud backup yet");
  }

  return parseWorkspaceSnapshot(JSON.stringify(data.snapshot));
}
