export function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export function writeStorage(key: string, value: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, value);
}

export function removeStorage(key: string) {
  if (typeof window !== "undefined") window.localStorage.removeItem(key);
}

export function readJsonStorage<T>(key: string, fallback: T): T {
  const value = readStorage(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonStorage<T>(key: string, value: T) {
  writeStorage(key, JSON.stringify(value));
}
