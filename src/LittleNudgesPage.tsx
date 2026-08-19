import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppSettings } from "./AppSettingsContext";
import { showPacePulseNotification } from "./pwa";
import waterSound from "./assets/sounds/water-drops.wav";
import medicationSound from "./assets/sounds/bamboo-chime.wav";
import peeSound from "./assets/sounds/tiny-stream.wav";
import movementSound from "./assets/sounds/leaves-and-twigs.wav";
import restSound from "./assets/sounds/dusk-crickets.wav";
import foodSound from "./assets/sounds/wooden-bowl.wav";
import sensorySound from "./assets/sounds/ocean-hush.wav";
import unclenchSound from "./assets/sounds/soft-exhale.wav";
import transitionSound from "./assets/sounds/woodland-birds.wav";
import freshAirSound from "./assets/sounds/open-breeze.wav";
import "./LittleNudges.css";

const REMINDERS_KEY = "pace-pulse-little-nudges-reminders";
const OLD_REMINDERS_KEY =
  "pace-pulse-little-journal-reminders";
const REMINDER_LOG_KEY = "pace-pulse-little-nudges-log";
const OLD_REMINDER_LOG_KEY =
  "pace-pulse-little-journal-log";

type ReminderId = string;

type ReminderMode = "interval" | "time";

type Reminder = {
  id: ReminderId;
  name: string;
  gentleLine: string;
  symbol: string;
  enabled: boolean;
  mode: ReminderMode;
  intervalMinutes: number;
  time: string;
  lastCompletedAt: string | null;
  snoozedUntil: string | null;
  createdAt: string;
};

type ReminderLog = {
  id: string;
  reminderId: ReminderId;
  name: string;
  completedAt: string;
  dateKey: string;
};

type LittleNudgesPageProps = {
  formattedDate: string;
  themeName: string;
  themeDescription: string;
  themeBanner: string;
};

const intervalChoices = [
  15,
  30,
  45,
  60,
  76,
  90,
  120,
  180,
  240,
  300,
  360,
  420,
  480,
  540,
  600,
];

const nudgeSounds: Record<string, string> = {
  water: waterSound,
  medication: medicationSound,
  pee: peeSound,
  movement: movementSound,
  rest: restSound,
  food: foodSound,
  sensory: sensorySound,
  unclench: unclenchSound,
  transition: transitionSound,
  "fresh-air": freshAirSound,
};

function createDefaultReminders(): Reminder[] {
  const createdAt = new Date().toISOString();

  return [
    {
      id: "water",
      name: "water",
      gentleLine: "a few sips still count",
      symbol: "◌",
      enabled: true,
      mode: "interval",
      intervalMinutes: 60,
      time: "09:00",
      lastCompletedAt: createdAt,
      snoozedUntil: null,
      createdAt,
    },
    {
      id: "medication",
      name: "medication",
      gentleLine: "take what supports you",
      symbol: "◇",
      enabled: false,
      mode: "interval",
      intervalMinutes: 240,
      time: "08:00",
      lastCompletedAt: null,
      snoozedUntil: null,
      createdAt,
    },
    {
      id: "pee",
      name: "pee break",
      gentleLine: "your body should not have to shout",
      symbol: "○",
      enabled: true,
      mode: "interval",
      intervalMinutes: 120,
      time: "10:00",
      lastCompletedAt: createdAt,
      snoozedUntil: null,
      createdAt,
    },
    {
      id: "movement",
      name: "movement",
      gentleLine: "tiny movement is still movement",
      symbol: "⌁",
      enabled: true,
      mode: "interval",
      intervalMinutes: 60,
      time: "10:30",
      lastCompletedAt: createdAt,
      snoozedUntil: null,
      createdAt,
    },
    {
      id: "rest",
      name: "rest break",
      gentleLine: "pausing is part of the work",
      symbol: "☾",
      enabled: true,
      mode: "interval",
      intervalMinutes: 90,
      time: "11:00",
      lastCompletedAt: createdAt,
      snoozedUntil: null,
      createdAt,
    },
    {
      id: "food",
      name: "eat something",
      gentleLine: "your brain needs fuel too",
      symbol: "◒",
      enabled: false,
      mode: "interval",
      intervalMinutes: 180,
      time: "12:00",
      lastCompletedAt: null,
      snoozedUntil: null,
      createdAt,
    },
    {
      id: "sensory",
      name: "sensory reset",
      gentleLine: "check sound, light and clothing",
      symbol: "⌇",
      enabled: false,
      mode: "interval",
      intervalMinutes: 90,
      time: "11:00",
      lastCompletedAt: null,
      snoozedUntil: null,
      createdAt,
    },
    {
      id: "unclench",
      name: "soften your body",
      gentleLine: "drop your shoulders and unclench your jaw",
      symbol: "⌄",
      enabled: false,
      mode: "interval",
      intervalMinutes: 45,
      time: "10:00",
      lastCompletedAt: null,
      snoozedUntil: null,
      createdAt,
    },
    {
      id: "transition",
      name: "transition warning",
      gentleLine: "wrap up gently before switching",
      symbol: "↝",
      enabled: false,
      mode: "interval",
      intervalMinutes: 30,
      time: "15:00",
      lastCompletedAt: null,
      snoozedUntil: null,
      createdAt,
    },
    {
      id: "fresh-air",
      name: "fresh air",
      gentleLine: "a window or doorway still counts",
      symbol: "≋",
      enabled: false,
      mode: "interval",
      intervalMinutes: 240,
      time: "14:00",
      lastCompletedAt: null,
      snoozedUntil: null,
      createdAt,
    },
  ];
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

function makeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function parseStoredArray<T>(key: string): T[] {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadReminders(): Reminder[] {
  const savedReminders =
    parseStoredArray<Reminder>(REMINDERS_KEY);
  const oldReminders =
    parseStoredArray<Reminder>(OLD_REMINDERS_KEY);
  const parsed =
    savedReminders.length > 0
      ? savedReminders
      : oldReminders;

  if (parsed.length === 0) {
    return createDefaultReminders();
  }

  const defaults = createDefaultReminders();

  const restoredDefaults = defaults.map((defaultReminder) => {
    const savedReminder = parsed.find(
      (reminder) => reminder.id === defaultReminder.id
    );

    if (!savedReminder) {
      return defaultReminder;
    }

    const savedMinutes = Number(
      savedReminder.intervalMinutes
    );
    const intervalMinutes = intervalChoices.includes(
      savedMinutes
    )
      ? savedMinutes
      : defaultReminder.intervalMinutes;

    return {
      ...defaultReminder,
      ...savedReminder,
      intervalMinutes,
      snoozedUntil: savedReminder.snoozedUntil ?? null,
    };
  });

  return restoredDefaults;
}

function loadLog(): ReminderLog[] {
  const savedLog =
    parseStoredArray<ReminderLog>(REMINDER_LOG_KEY);

  if (savedLog.length > 0) {
    return savedLog;
  }

  return parseStoredArray<ReminderLog>(
    OLD_REMINDER_LOG_KEY
  );
}

function getNextReminderTime(reminder: Reminder) {
  const now = new Date();

  if (reminder.snoozedUntil) {
    const snoozedUntil = new Date(reminder.snoozedUntil);

    if (snoozedUntil.getTime() > now.getTime()) {
      return snoozedUntil;
    }
  }

  if (reminder.mode === "time") {
    const [hours, minutes] = reminder.time
      .split(":")
      .map(Number);
    const next = new Date();

    next.setHours(hours || 0, minutes || 0, 0, 0);

    const completedToday =
      reminder.lastCompletedAt &&
      dateKey(new Date(reminder.lastCompletedAt)) ===
        dateKey(now);

    if (next.getTime() <= now.getTime() || completedToday) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  const startingPoint = reminder.lastCompletedAt
    ? new Date(reminder.lastCompletedAt)
    : new Date(reminder.createdAt);

  return new Date(
    startingPoint.getTime() +
      reminder.intervalMinutes * 60_000
  );
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function playNudgeSound(
  reminderId: string,
  volume = 0.34
) {
  const sound = nudgeSounds[reminderId];

  if (!sound) {
    return;
  }

  const audio = new Audio(sound);
  audio.volume = volume;

  void audio.play().catch(() => {
    // the browser may wait for one click before allowing sound
  });
}

function notifyReminder(reminder: Reminder) {
  playNudgeSound(reminder.id);

  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  void showPacePulseNotification(
    `pace & pulse · ${reminder.name}`,
    {
      body: reminder.gentleLine,
      silent: true,
      tag: `pace-pulse-nudge-${reminder.id}`,
      data: { url: "/" },
    }
  );
}

export function useLittleNudgesReminderEngine() {
  const { settings } = useAppSettings();

  useEffect(() => {
    if (!settings.notificationsEnabled) {
      return;
    }

    function checkReminders() {
      const reminders = loadReminders();
      const now = new Date();

      reminders
        .filter((reminder) => reminder.enabled)
        .forEach((reminder) => {
          const nextTime = getNextReminderTime(reminder);

          if (nextTime.getTime() > now.getTime()) {
            return;
          }

          const alertKey =
            `pace-pulse-nudge-alert-${reminder.id}`;
          const lastAlert = localStorage.getItem(alertKey);
          const minimumGap =
            reminder.mode === "interval"
              ? reminder.intervalMinutes * 60_000
              : 12 * 60 * 60_000;

          if (
            lastAlert &&
            now.getTime() -
              new Date(lastAlert).getTime() <
              minimumGap
          ) {
            return;
          }

          notifyReminder(reminder);
          localStorage.setItem(
            alertKey,
            now.toISOString()
          );
        });
    }

    checkReminders();

    const timer = window.setInterval(
      checkReminders,
      30_000
    );

    return () => window.clearInterval(timer);
  }, [settings.notificationsEnabled]);
}

export default function LittleNudgesPage({
  formattedDate,
  themeName,
  themeDescription,
  themeBanner,
}: LittleNudgesPageProps) {
  const { settings, requestNotifications } =
    useAppSettings();
  const [reminders, setReminders] =
    useState<Reminder[]>(loadReminders);
  const [reminderLog, setReminderLog] =
    useState<ReminderLog[]>(loadLog);
  const [now, setNow] = useState(new Date());
  const [savedMessage, setSavedMessage] =
    useState("saved gently");

  const today = dateKey(now);

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(new Date()),
      30_000
    );

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!settings.autoSaveEnabled) {
      setSavedMessage("autosave is resting");
      return;
    }

    localStorage.setItem(
      REMINDERS_KEY,
      JSON.stringify(reminders)
    );
    setSavedMessage("saved gently");
  }, [reminders, settings.autoSaveEnabled]);

  useEffect(() => {
    if (!settings.autoSaveEnabled) {
      return;
    }

    localStorage.setItem(
      REMINDER_LOG_KEY,
      JSON.stringify(reminderLog)
    );
  }, [reminderLog, settings.autoSaveEnabled]);

  const todayLog = useMemo(
    () =>
      reminderLog.filter((item) => item.dateKey === today),
    [reminderLog, today]
  );

  const todayCounts = useMemo(() => {
    return reminders.reduce<Record<string, number>>(
      (counts, reminder) => {
        counts[reminder.id] = todayLog.filter(
          (item) => item.reminderId === reminder.id
        ).length;

        return counts;
      },
      {}
    );
  }, [reminders, todayLog]);

  const nextReminder = useMemo(() => {
    void now;
    return reminders
      .filter((reminder) => reminder.enabled)
      .map((reminder) => ({
        reminder,
        nextTime: getNextReminderTime(reminder),
      }))
      .sort(
        (first, second) =>
          first.nextTime.getTime() -
          second.nextTime.getTime()
      )[0];
  }, [reminders, now]);

  function updateReminder(
    id: ReminderId,
    changes: Partial<Reminder>
  ) {
    setSavedMessage("saving");
    setReminders((current) =>
      current.map((reminder) =>
        reminder.id === id
          ? { ...reminder, ...changes }
          : reminder
      )
    );
  }

  function markReminderDone(reminder: Reminder) {
    const completedAt = new Date();

    updateReminder(reminder.id, {
      lastCompletedAt: completedAt.toISOString(),
      snoozedUntil: null,
    });

    setReminderLog((current) => [
      ...current,
      {
        id: makeId(),
        reminderId: reminder.id,
        name: reminder.name,
        completedAt: completedAt.toISOString(),
        dateKey: dateKey(completedAt),
      },
    ]);
  }

  function undoLatestReminder(reminderId: ReminderId) {
    const latest = [...reminderLog]
      .filter(
        (item) =>
          item.reminderId === reminderId &&
          item.dateKey === today
      )
      .sort(
        (first, second) =>
          new Date(second.completedAt).getTime() -
          new Date(first.completedAt).getTime()
      )[0];

    if (!latest) {
      return;
    }

    setReminderLog((current) =>
      current.filter((item) => item.id !== latest.id)
    );
  }

  function snoozeReminder(
    reminder: Reminder,
    minutes: number
  ) {
    const snoozedUntil = new Date(
      Date.now() + minutes * 60_000
    );

    updateReminder(reminder.id, {
      snoozedUntil: snoozedUntil.toISOString(),
    });

    localStorage.removeItem(
      `pace-pulse-nudge-alert-${reminder.id}`
    );
  }

  async function enableBrowserNudges() {
    await requestNotifications(true);
    playNudgeSound("fresh-air", 0.26);
  }

  return (
    <div className="little-journal-page">
      <header className="little-journal-header">
        <div>
          <p>little nudges</p>
          <h2>small reminders, softly held</h2>
        </div>

        <span>{savedMessage}</span>
        <time>{formattedDate}</time>
      </header>

      <section
        className="little-journal-banner"
        style={{ backgroundImage: `url(${themeBanner})` }}
      >
        <div>
          <p>{themeName}</p>
          <span>{themeDescription}</span>
        </div>
      </section>

      <section className="journal-now-card">
        <div className="journal-clock">
          <p>right now</p>
          <strong>{formatClock(now)}</strong>
        </div>

        <div className="journal-next-nudge">
          <p>next gentle nudge</p>

          {nextReminder ? (
            <>
              <strong>{nextReminder.reminder.name}</strong>

              <span>
                around {formatClock(nextReminder.nextTime)}
                {" · "}
                {nextReminder.reminder.gentleLine}
              </span>
            </>
          ) : (
            <>
              <strong>nothing waiting</strong>
              <span>your reminders are resting</span>
            </>
          )}
        </div>

        <div className="journal-notification-state">
          <p>browser nudges</p>

          <button
            type="button"
            onClick={enableBrowserNudges}
          >
            {settings.notificationsEnabled
              ? "ready"
              : "turn them on"}
          </button>
        </div>
      </section>

      <section className="journal-reminders-section">
        <div className="journal-section-heading">
          <div>
            <p>my reminder rhythm</p>
            <h3>let the app remember for you</h3>
          </div>

          <span>
            {todayLog.length} little check-ins today
          </span>
        </div>

        <div className="journal-reminder-grid">
          {reminders.map((reminder) => {
            const nextTime = getNextReminderTime(reminder);
            const count = todayCounts[reminder.id];

            return (
              <article
                key={reminder.id}
                className={
                  reminder.enabled
                    ? "journal-reminder-card"
                    : "journal-reminder-card journal-reminder-card-off"
                }
              >
                <div className="journal-reminder-title">
                  <span>{reminder.symbol}</span>

                  <div>
                    <h4>{reminder.name}</h4>
                    <p>{reminder.gentleLine}</p>
                  </div>

                  <button
                    className="journal-reminder-toggle"
                    type="button"
                    role="switch"
                    aria-checked={reminder.enabled}
                    onClick={() =>
                      updateReminder(reminder.id, {
                        enabled: !reminder.enabled,
                      })
                    }
                  >
                    <span />
                  </button>
                </div>

                <div className="journal-reminder-settings">
                  <select
                    value={reminder.mode}
                    aria-label={`${reminder.name} reminder type`}
                    onChange={(event) =>
                      updateReminder(reminder.id, {
                        mode: event.target.value as ReminderMode,
                      })
                    }
                  >
                    <option value="interval">
                      repeat gently
                    </option>

                    <option value="time">
                      at one time
                    </option>
                  </select>

                  {reminder.mode === "interval" ? (
                    <select
                      value={reminder.intervalMinutes}
                      aria-label={`${reminder.name} interval`}
                      onChange={(event) =>
                        updateReminder(reminder.id, {
                          intervalMinutes: Number(
                            event.target.value
                          ),
                        })
                      }
                    >
                      {intervalChoices.map((minutes) => (
                        <option
                          key={minutes}
                          value={minutes}
                        >
                          every {minutes} minutes
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="time"
                      value={reminder.time}
                      aria-label={`${reminder.name} time`}
                      onChange={(event) =>
                        updateReminder(reminder.id, {
                          time: event.target.value,
                        })
                      }
                    />
                  )}
                </div>

                <div className="journal-reminder-footer">
                  <div>
                    <span>
                      next · {formatClock(nextTime)}
                    </span>

                    <strong>{count} today</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      markReminderDone(reminder)
                    }
                  >
                    done now
                  </button>
                </div>

                <div className="nudge-snooze-row">
                  <div className="nudge-sound-row">
                    <span>snooze gently</span>

                    <button
                      type="button"
                      onClick={() =>
                        playNudgeSound(
                          reminder.id,
                          0.3
                        )
                      }
                    >
                      ♪ hear sound
                    </button>
                  </div>

                  <div className="nudge-snooze-buttons">
                    {[5, 15, 30].map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() =>
                          snoozeReminder(
                            reminder,
                            minutes
                          )
                        }
                      >
                        {minutes} min
                      </button>
                    ))}
                  </div>
                </div>

                {reminder.snoozedUntil &&
                  new Date(
                    reminder.snoozedUntil
                  ).getTime() > now.getTime() && (
                    <p className="nudge-snoozed-message">
                      resting until{" "}
                      {formatClock(
                        new Date(
                          reminder.snoozedUntil
                        )
                      )}
                    </p>
                  )}

                {count > 0 && (
                  <button
                    className="journal-reminder-undo"
                    type="button"
                    onClick={() =>
                      undoLatestReminder(reminder.id)
                    }
                  >
                    undo latest
                  </button>
                )}

              </article>
            );
          })}
        </div>
      </section>

    </div>
  );
}
