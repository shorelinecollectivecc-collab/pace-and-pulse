import { getCurrentUser } from "../auth/authService";
import { getSupabaseClient } from "../supabase/client";

const vapidPublicKey = String(import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "").trim();

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function backgroundNudgesAreConfigured() {
  return Boolean(vapidPublicKey);
}

export async function enableBackgroundNudges() {
  if (!backgroundNudgesAreConfigured()) {
    throw new Error("background nudges still need the public push key");
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("this browser does not support background nudges");
  }

  const client = getSupabaseClient();
  const user = await getCurrentUser();
  if (!client || !user) throw new Error("sign in before enabling background nudges");

  const { data } = await client.auth.getSession();
  if (!data.session?.access_token) {
    throw new Error("sign in before enabling background nudges");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? (await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
  }));

  const response = await fetch("/api/push-subscribe", {
    method: "POST",
    headers: {
      authorization: `Bearer ${data.session.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    }),
  });

  if (!response.ok) throw new Error("background nudges could not be connected");
  return true;
}
