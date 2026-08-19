export const WORKSPACE_BACKUP_KIND = "pace-pulse-workspace-backup";
export const WORKSPACE_BACKUP_VERSION = 1;

const PRIVATE_STORAGE_KEYS = new Set([
  "pace-pulse-spotify-token",
  "pace-pulse-spotify-verifier",
  "pace-pulse-spotify-state",
]);

const CACHE_KEY_PREFIXES = ["pace-pulse-translations-"];

export type WorkspaceSnapshot = {
  kind: typeof WORKSPACE_BACKUP_KIND;
  version: typeof WORKSPACE_BACKUP_VERSION;
  createdAt: string;
  appVersion: string;
  storage: Record<string, string>;
};

function shouldIncludeKey(key: string) {
  return (
    key.startsWith("pace-pulse") &&
    !PRIVATE_STORAGE_KEYS.has(key) &&
    !CACHE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

export function createWorkspaceSnapshot(): WorkspaceSnapshot {
  const storage: Record<string, string> = {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);

    if (!key || !shouldIncludeKey(key)) {
      continue;
    }

    const value = localStorage.getItem(key);

    if (value !== null) {
      storage[key] = value;
    }
  }

  return {
    kind: WORKSPACE_BACKUP_KIND,
    version: WORKSPACE_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: "1.0.0",
    storage,
  };
}

export function parseWorkspaceSnapshot(value: string): WorkspaceSnapshot {
  const parsed = JSON.parse(value) as Partial<WorkspaceSnapshot>;

  if (
    parsed.kind !== WORKSPACE_BACKUP_KIND ||
    parsed.version !== WORKSPACE_BACKUP_VERSION ||
    typeof parsed.createdAt !== "string" ||
    !parsed.storage ||
    typeof parsed.storage !== "object" ||
    Array.isArray(parsed.storage)
  ) {
    throw new Error("this is not a pace & pulse backup");
  }

  const storage = Object.fromEntries(
    Object.entries(parsed.storage).filter(
      ([key, item]) =>
        shouldIncludeKey(key) && typeof item === "string"
    )
  );

  return {
    kind: WORKSPACE_BACKUP_KIND,
    version: WORKSPACE_BACKUP_VERSION,
    createdAt: parsed.createdAt,
    appVersion:
      typeof parsed.appVersion === "string"
        ? parsed.appVersion
        : "unknown",
    storage,
  };
}

export function restoreWorkspaceSnapshot(snapshot: WorkspaceSnapshot) {
  const existingKeys = Array.from(
    { length: localStorage.length },
    (_, index) => localStorage.key(index)
  ).filter((key): key is string => Boolean(key && shouldIncludeKey(key)));

  existingKeys.forEach((key) => localStorage.removeItem(key));
  Object.entries(snapshot.storage).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}

export function saveWorkspaceBackupFile() {
  const snapshot = createWorkspaceSnapshot();
  const date = snapshot.createdAt.slice(0, 10);
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `pace-pulse-full-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export async function readWorkspaceBackupFile(file: File) {
  return parseWorkspaceSnapshot(await file.text());
}

export function getWorkspaceItemCount(snapshot: WorkspaceSnapshot) {
  return Object.keys(snapshot.storage).length;
}
