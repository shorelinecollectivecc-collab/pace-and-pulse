import { createClient } from "@supabase/supabase-js";

declare const process: {
  env: Record<string, string | undefined>;
};

type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: {
    subscription?: {
      endpoint?: unknown;
      keys?: unknown;
      expirationTime?: unknown;
    };
    timezone?: unknown;
  };
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (value: unknown) => void;
};

export default async function handler(
  request: ApiRequest,
  response: ApiResponse
) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "method not allowed" });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.authorization;
  const token =
    typeof authorization === "string" &&
    authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";
  const subscription = request.body?.subscription;
  const endpoint =
    typeof subscription?.endpoint === "string"
      ? subscription.endpoint
      : "";

  if (!url || !serviceKey || !token) {
    response.status(503).json({ error: "push is not configured" });
    return;
  }

  if (!endpoint || !subscription?.keys) {
    response.status(400).json({ error: "invalid subscription" });
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    response.status(401).json({ error: "sign in required" });
    return;
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        subscription,
        timezone:
          typeof request.body?.timezone === "string"
            ? request.body.timezone
            : "UTC",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

  if (error) {
    response.status(500).json({ error: "subscription was not saved" });
    return;
  }

  response.status(200).json({ ok: true });
}
