import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

declare const process: {
  env: Record<string, string | undefined>;
};

type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (value: unknown) => void;
};

type Reminder = {
  id: string;
  name: string;
  gentleLine: string;
  enabled: boolean;
  mode: "interval" | "time";
  intervalMinutes: number;
  time: string;
  lastCompletedAt: string | null;
  snoozedUntil: string | null;
  createdAt: string;
};

type PushRow = {
  id: string;
  user_id: string;
  subscription: webPush.PushSubscription;
  timezone: string;
  last_sent: Record<string, string> | null;
};

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

function reminderIsDue(
  reminder: Reminder,
  now: Date,
  timezone: string,
  lastSent: string | undefined
) {
  if (!reminder.enabled) {
    return false;
  }

  if (
    reminder.snoozedUntil &&
    new Date(reminder.snoozedUntil).getTime() > now.getTime()
  ) {
    return false;
  }

  const nowLocal = localParts(now, timezone);

  if (
    reminder.lastCompletedAt &&
    localParts(new Date(reminder.lastCompletedAt), timezone).date ===
      nowLocal.date
  ) {
    return false;
  }

  if (reminder.mode === "time") {
    const [hour, minute] = reminder.time.split(":").map(Number);
    const dueMinutes = hour * 60 + minute;
    const alreadySentToday =
      Boolean(lastSent) &&
      localParts(new Date(lastSent as string), timezone).date ===
        nowLocal.date;

    return nowLocal.minutes >= dueMinutes && !alreadySentToday;
  }

  const startingPoint = lastSent
    ? new Date(lastSent)
    : reminder.lastCompletedAt
      ? new Date(reminder.lastCompletedAt)
      : new Date(reminder.createdAt);

  return (
    now.getTime() - startingPoint.getTime() >=
    Number(reminder.intervalMinutes || 15) * 60_000
  );
}

export default async function handler(
  request: ApiRequest,
  response: ApiResponse
) {
  const authorization = request.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (
    request.method !== "GET" ||
    !cronSecret ||
    authorization !== `Bearer ${cronSecret}`
  ) {
    response.status(401).json({ error: "not allowed" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (
    !supabaseUrl ||
    !serviceKey ||
    !publicKey ||
    !privateKey ||
    !subject
  ) {
    response.status(503).json({ error: "push is not configured" });
    return;
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [{ data: subscriptions }, { data: backups }] =
    await Promise.all([
      supabase.from("push_subscriptions").select("*"),
      supabase
        .from("workspace_backups")
        .select("user_id,snapshot"),
    ]);
  const backupMap = new Map(
    (backups ?? []).map((backup) => [
      backup.user_id,
      backup.snapshot,
    ])
  );
  const now = new Date();
  let sent = 0;

  for (const row of (subscriptions ?? []) as PushRow[]) {
    const snapshot = backupMap.get(row.user_id) as
      | { storage?: Record<string, string> }
      | undefined;
    const savedReminders =
      snapshot?.storage?.["pace-pulse-little-nudges-reminders"];

    if (!savedReminders) {
      continue;
    }

    let reminders: Reminder[];

    try {
      reminders = JSON.parse(savedReminders) as Reminder[];
    } catch {
      continue;
    }

    const lastSent = { ...(row.last_sent ?? {}) };
    let changed = false;

    for (const reminder of reminders) {
      if (
        !reminderIsDue(
          reminder,
          now,
          row.timezone || "UTC",
          lastSent[reminder.id]
        )
      ) {
        continue;
      }

      try {
        await webPush.sendNotification(
          row.subscription,
          JSON.stringify({
            title: `pace & pulse · ${reminder.name}`,
            body: reminder.gentleLine,
            url: "/",
          })
        );
        lastSent[reminder.id] = now.toISOString();
        changed = true;
        sent += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error &&
          "statusCode" in error
            ? Number(error.statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", row.id);
        }
      }
    }

    if (changed) {
      await supabase
        .from("push_subscriptions")
        .update({
          last_sent: lastSent,
          updated_at: now.toISOString(),
        })
        .eq("id", row.id);
    }
  }

  response.status(200).json({ sent });
}
