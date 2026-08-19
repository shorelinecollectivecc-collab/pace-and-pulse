import { useEffect, useMemo, useState } from "react";
import { useAppSettings } from "./AppSettingsContext";
import "./WorkMapPage.css";

type ProjectKind = "music" | "video";

type ProjectDayPlan = {
  dateKey: string;
  annotationTarget: number;
  plannedMinutes: number;
  focus: string;
  restDay: boolean;
};

type SavedWeekPlan = {
  weekKey: string;
  musicDays: ProjectDayPlan[];
  videoDays: ProjectDayPlan[];
  musicNote: string;
  videoNote: string;
};

type LegacyDayPlan = {
  dateKey?: string;
  annotationTarget?: number;
  musicTarget?: number;
  videoTarget?: number;
  plannedMinutes?: number;
  focus?: string;
  restDay?: boolean;
};

type LegacyWeekPlan = {
  days?: LegacyDayPlan[];
  weekNote?: string;
};

const dayNames = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function getDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

function getMonday(date: Date) {
  const monday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const day = monday.getDay() || 7;

  monday.setDate(monday.getDate() - day + 1);
  monday.setHours(12, 0, 0, 0);

  return monday;
}

function addDays(date: Date, numberOfDays: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + numberOfDays);
  return nextDate;
}

function createProjectDays(
  monday: Date,
  target: number
): ProjectDayPlan[] {
  return dayNames.map((_, index) => ({
    dateKey: getDateKey(addDays(monday, index)),
    annotationTarget: target,
    plannedMinutes: 60,
    focus: "",
    restDay: false,
  }));
}

function createWeekPlan(
  monday: Date,
  musicTarget: number,
  videoTarget: number
): SavedWeekPlan {
  return {
    weekKey: getDateKey(monday),
    musicDays: createProjectDays(monday, musicTarget),
    videoDays: createProjectDays(monday, videoTarget),
    musicNote: "",
    videoNote: "",
  };
}

function normaliseDays(
  fallbackDays: ProjectDayPlan[],
  savedDays: LegacyDayPlan[] | undefined,
  legacyTarget: "musicTarget" | "videoTarget"
) {
  return fallbackDays.map((fallbackDay, index) => {
    const savedDay = savedDays?.[index];

    if (!savedDay) {
      return fallbackDay;
    }

    const savedTarget =
      typeof savedDay.annotationTarget === "number"
        ? savedDay.annotationTarget
        : typeof savedDay[legacyTarget] === "number"
          ? Number(savedDay[legacyTarget])
          : fallbackDay.annotationTarget;

    return {
      dateKey: fallbackDay.dateKey,
      annotationTarget: savedTarget,
      plannedMinutes:
        typeof savedDay.plannedMinutes === "number"
          ? savedDay.plannedMinutes
          : fallbackDay.plannedMinutes,
      focus:
        typeof savedDay.focus === "string"
          ? savedDay.focus
          : "",
      restDay: Boolean(savedDay.restDay),
    };
  });
}

function readWeekPlan(
  monday: Date,
  musicTarget: number,
  videoTarget: number
): SavedWeekPlan {
  const fallback = createWeekPlan(
    monday,
    musicTarget,
    videoTarget
  );

  try {
    const saved = localStorage.getItem(
      `pace-pulse-work-map-${fallback.weekKey}`
    );

    if (!saved) {
      return fallback;
    }

    const parsed = JSON.parse(saved) as
      | Partial<SavedWeekPlan>
      | LegacyWeekPlan;

    if (
      Array.isArray(
        (parsed as Partial<SavedWeekPlan>).musicDays
      ) ||
      Array.isArray(
        (parsed as Partial<SavedWeekPlan>).videoDays
      )
    ) {
      const current = parsed as Partial<SavedWeekPlan>;

      return {
        weekKey: fallback.weekKey,
        musicDays: normaliseDays(
          fallback.musicDays,
          current.musicDays,
          "musicTarget"
        ),
        videoDays: normaliseDays(
          fallback.videoDays,
          current.videoDays,
          "videoTarget"
        ),
        musicNote:
          typeof current.musicNote === "string"
            ? current.musicNote
            : "",
        videoNote:
          typeof current.videoNote === "string"
            ? current.videoNote
            : "",
      };
    }

    const legacy = parsed as LegacyWeekPlan;

    return {
      weekKey: fallback.weekKey,
      musicDays: normaliseDays(
        fallback.musicDays,
        legacy.days,
        "musicTarget"
      ),
      videoDays: normaliseDays(
        fallback.videoDays,
        legacy.days,
        "videoTarget"
      ),
      musicNote:
        typeof legacy.weekNote === "string"
          ? legacy.weekNote
          : "",
      videoNote: "",
    };
  } catch {
    return fallback;
  }
}

function formatWeekRange(monday: Date) {
  const sunday = addDays(monday, 6);
  const start = new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
  })
    .format(monday)
    .toLowerCase();
  const end = new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(sunday)
    .toLowerCase();

  return `${start} – ${end}`;
}

function clampNumber(value: number, maximum: number) {
  return Math.max(0, Math.min(maximum, Math.round(value)));
}

export default function WorkMapPage() {
  const { settings } = useAppSettings();
  const currentMonday = useMemo(
    () => getMonday(new Date()),
    []
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeProject, setActiveProject] =
    useState<ProjectKind>("music");
  const selectedMonday = useMemo(
    () => addDays(currentMonday, weekOffset * 7),
    [currentMonday, weekOffset]
  );
  const [weekPlan, setWeekPlan] = useState<SavedWeekPlan>(
    () =>
      readWeekPlan(
        selectedMonday,
        settings.dailyTarget,
        settings.videoDailyTarget
      )
  );

  useEffect(() => {
    setWeekPlan(
      readWeekPlan(
        selectedMonday,
        settings.dailyTarget,
        settings.videoDailyTarget
      )
    );
  }, [
    selectedMonday,
    settings.dailyTarget,
    settings.videoDailyTarget,
  ]);

  useEffect(() => {
    if (settings.autoSaveEnabled) {
      localStorage.setItem(
        `pace-pulse-work-map-${weekPlan.weekKey}`,
        JSON.stringify(weekPlan)
      );
    }
  }, [settings.autoSaveEnabled, weekPlan]);

  const musicSummary = getProjectSummary(
    weekPlan.musicDays
  );
  const videoSummary = getProjectSummary(
    weekPlan.videoDays
  );
  const activeDays =
    activeProject === "music"
      ? weekPlan.musicDays
      : weekPlan.videoDays;
  const activeNote =
    activeProject === "music"
      ? weekPlan.musicNote
      : weekPlan.videoNote;
  const todayKey = getDateKey(new Date());

  function updateDay(
    index: number,
    change: Partial<ProjectDayPlan>
  ) {
    const field =
      activeProject === "music"
        ? "musicDays"
        : "videoDays";

    setWeekPlan((current) => ({
      ...current,
      [field]: current[field].map((day, dayIndex) =>
        dayIndex === index
          ? { ...day, ...change }
          : day
      ),
    }));
  }

  function updateNote(value: string) {
    setWeekPlan((current) => ({
      ...current,
      [activeProject === "music"
        ? "musicNote"
        : "videoNote"]: value,
    }));
  }

  return (
    <section className="work-map-page">
      <header className="work-map-heading">
        <div>
          <p>my work map</p>
          <h2>two jobs · two separate weeks</h2>
        </div>

        <span>
          {settings.autoSaveEnabled
            ? "saving automatically"
            : "saving is paused"}
        </span>
      </header>

      <section className="work-map-toolbar">
        <div className="work-map-week-picker">
          <button
            type="button"
            aria-label="previous week"
            onClick={() =>
              setWeekOffset((current) => current - 1)
            }
          >
            ‹
          </button>

          <div>
            <span>
              {weekOffset === 0
                ? "this week"
                : weekOffset < 0
                  ? "earlier week"
                  : "coming week"}
            </span>
            <strong>{formatWeekRange(selectedMonday)}</strong>
          </div>

          <button
            type="button"
            aria-label="next week"
            onClick={() =>
              setWeekOffset((current) => current + 1)
            }
          >
            ›
          </button>
        </div>

        <div className="work-map-project-tabs">
          <ProjectTab
            active={activeProject === "music"}
            label="music week"
            summary={musicSummary}
            onClick={() => setActiveProject("music")}
          />
          <ProjectTab
            active={activeProject === "video"}
            label="video week"
            summary={videoSummary}
            onClick={() => setActiveProject("video")}
          />
        </div>

        {weekOffset !== 0 && (
          <button
            className="work-map-today-button"
            type="button"
            onClick={() => setWeekOffset(0)}
          >
            return to this week
          </button>
        )}
      </section>

      <div className="work-map-active-label">
        <div>
          <p>
            {activeProject === "music"
              ? "music annotation schedule"
              : "video annotation schedule"}
          </p>
          <h3>
            {activeProject === "music"
              ? "plan the tracks"
              : "plan the frames"}
          </h3>
        </div>
        <span>
          {activeProject === "music"
            ? musicSummary.target
            : videoSummary.target}{" "}
          annotations ·{" "}
          {activeProject === "music"
            ? musicSummary.minutes
            : videoSummary.minutes}{" "}
          minutes
        </span>
      </div>

      <section className="work-map-days">
        {activeDays.map((day, index) => {
          const date = new Date(
            `${day.dateKey}T12:00:00`
          );
          const isToday = day.dateKey === todayKey;

          return (
            <article
              className={[
                "work-map-day",
                isToday ? "work-map-day-today" : "",
                day.restDay
                  ? "work-map-day-rest"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={`${activeProject}-${day.dateKey}`}
            >
              <div className="work-map-day-heading">
                <div>
                  <p>{dayNames[index]}</p>
                  <span>
                    {new Intl.DateTimeFormat("en-ZA", {
                      day: "numeric",
                      month: "short",
                    })
                      .format(date)
                      .toLowerCase()}
                  </span>
                </div>

                {isToday && <strong>today</strong>}
              </div>

              <label className="work-map-rest-toggle">
                <input
                  type="checkbox"
                  checked={day.restDay}
                  onChange={(event) =>
                    updateDay(index, {
                      restDay: event.target.checked,
                    })
                  }
                />
                <span>
                  {day.restDay
                    ? "resting from this job"
                    : "work day"}
                </span>
              </label>

              {!day.restDay ? (
                <>
                  <div className="work-map-number-row">
                    <label>
                      <span>
                        {activeProject === "music"
                          ? "tracks"
                          : "videos"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={day.annotationTarget}
                        onChange={(event) =>
                          updateDay(index, {
                            annotationTarget: clampNumber(
                              Number(
                                event.target.value
                              ),
                              100
                            ),
                          })
                        }
                      />
                    </label>

                    <label>
                      <span>minutes</span>
                      <input
                        type="number"
                        min="0"
                        max="1440"
                        step="5"
                        value={day.plannedMinutes}
                        onChange={(event) =>
                          updateDay(index, {
                            plannedMinutes: clampNumber(
                              Number(
                                event.target.value
                              ),
                              1440
                            ),
                          })
                        }
                      />
                    </label>
                  </div>

                  <label className="work-map-focus-field">
                    <span>
                      {activeProject === "music"
                        ? "music focus"
                        : "video focus"}
                    </span>
                    <textarea
                      rows={3}
                      value={day.focus}
                      placeholder="one useful note..."
                      onChange={(event) =>
                        updateDay(index, {
                          focus: event.target.value,
                        })
                      }
                    />
                  </label>
                </>
              ) : (
                <p className="work-map-rest-note">
                  rest belongs in this schedule too
                </p>
              )}
            </article>
          );
        })}
      </section>

      <section className="work-map-week-note">
        <div>
          <p>{activeProject} notes</p>
          <h3>
            anything this job should remember
          </h3>
        </div>

        <textarea
          value={activeNote}
          placeholder="deadlines, project notes, a day that may need more breathing room..."
          onChange={(event) =>
            updateNote(event.target.value)
          }
        />
      </section>
    </section>
  );
}

function getProjectSummary(days: ProjectDayPlan[]) {
  const activeDays = days.filter((day) => !day.restDay);

  return {
    target: activeDays.reduce(
      (total, day) =>
        total + day.annotationTarget,
      0
    ),
    minutes: activeDays.reduce(
      (total, day) =>
        total + day.plannedMinutes,
      0
    ),
    restDays: 7 - activeDays.length,
  };
}

type ProjectTabProps = {
  active: boolean;
  label: string;
  summary: ReturnType<typeof getProjectSummary>;
  onClick: () => void;
};

function ProjectTab({
  active,
  label,
  summary,
  onClick,
}: ProjectTabProps) {
  return (
    <button
      className={
        active
          ? "work-map-project-tab work-map-project-tab-active"
          : "work-map-project-tab"
      }
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <strong>{label}</strong>
      <span>
        {summary.target} annotations ·{" "}
        {summary.minutes} min ·{" "}
        {summary.restDays} rest
      </span>
    </button>
  );
}
