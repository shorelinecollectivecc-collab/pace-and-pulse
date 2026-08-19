import { useEffect, useMemo, useState } from "react";
import { useAppSettings } from "./AppSettingsContext";
import type { VideoAnnotationRecord } from "./VideoRhythmPage";
import "./LittleWinsPage.css";

type AnnotationRecord = {
  id: string;
  createdAt: string;
  dateKey: string;
  annotationMinutes: number;
};

type LittleWinsPageProps = {
  annotations: AnnotationRecord[];
  videoAnnotations: VideoAnnotationRecord[];
};

type ProudNote = {
  id: string;
  text: string;
};

type RoutineState = {
  done?: string[];
};

type SmallPlanTask = {
  done?: boolean;
};

type CheckInState = {
  movementLog?: string[];
};

type ProjectKind = "music" | "video";

const dailyMilestones = [
  { count: 1, points: 5, title: "you began" },
  { count: 3, points: 15, title: "momentum found" },
  { count: 5, points: 25, title: "halfway glow" },
  { count: 10, points: 60, title: "daily rhythm" },
  { count: 15, points: 80, title: "extra-mile magic" },
  { count: 20, points: 120, title: "full rhythm day" },
  { count: 25, points: 150, title: "super day" },
  { count: 30, points: 200, title: "super-duper day" },
];

const musicLifetimeMilestones = [
  { count: 1, title: "first track" },
  { count: 10, title: "finding the beat" },
  { count: 25, title: "little playlist" },
  { count: 50, title: "steady listening" },
  { count: 100, title: "one hundred tracks" },
  { count: 250, title: "deep catalogue" },
  { count: 500, title: "music in bloom" },
  { count: 1000, title: "a whole constellation" },
];

const videoLifetimeMilestones = [
  { count: 1, title: "first frame" },
  { count: 10, title: "finding the cut" },
  { count: 25, title: "little reel" },
  { count: 50, title: "steady viewing" },
  { count: 100, title: "one hundred videos" },
  { count: 250, title: "deep archive" },
  { count: 500, title: "frames in bloom" },
  { count: 1000, title: "a whole film sky" },
];

const dayNames = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

function getDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
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

function readJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function createProudNotes(): ProudNote[] {
  return Array.from({ length: 3 }, (_, index) => ({
    id: `proud-note-${index + 1}`,
    text: "",
  }));
}

function readProudNotes(todayKey: string) {
  const fallback = createProudNotes();
  const saved = readJson<ProudNote[]>(
    `pace-pulse-little-wins-${todayKey}`,
    fallback
  );

  if (!Array.isArray(saved)) {
    return fallback;
  }

  return fallback.map((note, index) => ({
    id: note.id,
    text:
      typeof saved[index]?.text === "string"
        ? saved[index].text
        : "",
  }));
}

function calculateStreak(dateKeys: Set<string>) {
  if (dateKeys.size === 0) {
    return 0;
  }

  let streak = 0;
  let cursor = new Date();
  const todayKey = getDateKey(cursor);

  if (!dateKeys.has(todayKey)) {
    cursor = addDays(cursor, -1);
  }

  while (dateKeys.has(getDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function formatMinutes(totalMinutes: number) {
  return `${Math.round(totalMinutes)} min`;
}

function milestonePoints(count: number) {
  return dailyMilestones
    .filter((milestone) => count >= milestone.count)
    .reduce((total, milestone) => total + milestone.points, 0);
}

export default function LittleWinsPage({
  annotations,
  videoAnnotations,
}: LittleWinsPageProps) {
  const { settings } = useAppSettings();
  const today = new Date();
  const todayKey = getDateKey(today);
  const monday = getMonday(today);
  const [proudNotes, setProudNotes] = useState<ProudNote[]>(
    () => readProudNotes(todayKey)
  );

  useEffect(() => {
    if (settings.autoSaveEnabled) {
      localStorage.setItem(
        `pace-pulse-little-wins-${todayKey}`,
        JSON.stringify(proudNotes)
      );
    }
  }, [proudNotes, settings.autoSaveEnabled, todayKey]);

  const musicToday = annotations.filter(
    (annotation) => annotation.dateKey === todayKey
  ).length;
  const videoToday = videoAnnotations.filter(
    (annotation) => annotation.dateKey === todayKey
  ).length;
  const routine = readJson<RoutineState>(
    `pace-pulse-routine-${todayKey}`,
    {}
  );
  const smallPlan = readJson<SmallPlanTask[]>(
    `pace-pulse-small-plan-${todayKey}`,
    []
  );
  const checkIn = readJson<CheckInState>(
    `pace-pulse-check-in-${todayKey}`,
    {}
  );

  const routineDone = Array.isArray(routine.done)
    ? new Set(routine.done).size
    : 0;
  const smallThingsDone = Array.isArray(smallPlan)
    ? smallPlan.filter((task) => task.done).length
    : 0;
  const movementCount = Array.isArray(checkIn.movementLog)
    ? checkIn.movementLog.length
    : 0;
  const carePoints =
    routineDone * 5 + smallThingsDone * 5 + movementCount * 2;
  const musicPoints = milestonePoints(musicToday);
  const videoPoints = milestonePoints(videoToday);

  const allDateKeys = useMemo(
    () =>
      new Set([
        ...annotations.map((annotation) => annotation.dateKey),
        ...videoAnnotations.map(
          (annotation) => annotation.dateKey
        ),
      ]),
    [annotations, videoAnnotations]
  );
  const currentStreak = calculateStreak(allDateKeys);
  const musicMinutes = annotations.reduce(
    (total, annotation) =>
      total + (annotation.annotationMinutes || 0),
    0
  );
  const videoMinutes = videoAnnotations.reduce(
    (total, annotation) =>
      total + (annotation.annotationMinutes || 0),
    0
  );

  function createWeek(
    projectAnnotations: Array<{ dateKey: string }>
  ) {
    return dayNames.map((name, index) => {
      const date = addDays(monday, index);
      const dateKey = getDateKey(date);
      return {
        name,
        date,
        dateKey,
        count: projectAnnotations.filter(
          (annotation) => annotation.dateKey === dateKey
        ).length,
        isToday: dateKey === todayKey,
      };
    });
  }

  const musicWeek = createWeek(annotations);
  const videoWeek = createWeek(videoAnnotations);

  function updateProudNote(id: string, text: string) {
    setProudNotes((current) =>
      current.map((note) =>
        note.id === id ? { ...note, text } : note
      )
    );
  }

  function renderWeek(
    project: ProjectKind,
    weekDays: ReturnType<typeof createWeek>
  ) {
    const total = weekDays.reduce(
      (sum, day) => sum + day.count,
      0
    );

    return (
      <article className="wins-week-card">
        <div className="wins-section-heading">
          <div>
            <p>{project} annotation week</p>
            <h3>
              {project === "music"
                ? "each track has its own rhythm"
                : "each frame has its own rhythm"}
            </h3>
          </div>
          <span>
            {total} {project === "music" ? "tracks" : "videos"}
          </span>
        </div>

        <div className="wins-week-days">
          {weekDays.map((day) => (
            <div
              className={[
                "wins-week-day",
                day.count > 0 ? "wins-week-day-lit" : "",
                day.isToday ? "wins-week-day-today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={`${project}-${day.dateKey}`}
            >
              <span>{day.name}</span>
              <strong>{day.count}</strong>
              <small>
                {new Intl.DateTimeFormat("en-ZA", {
                  day: "numeric",
                }).format(day.date)}
              </small>
            </div>
          ))}
        </div>
      </article>
    );
  }

  function renderPath(
    project: ProjectKind,
    total: number,
    todayTotal: number
  ) {
    const path =
      project === "music"
        ? musicLifetimeMilestones
        : videoLifetimeMilestones;
    const nextLifetime = path.find(
      (milestone) => total < milestone.count
    );
    const reachedToday = dailyMilestones.filter(
      (milestone) => todayTotal >= milestone.count
    );
    const nextToday = dailyMilestones.find(
      (milestone) => todayTotal < milestone.count
    );

    return (
      <section className="wins-path-card">
        <div className="wins-section-heading">
          <div>
            <p>{project} annotation milestones</p>
            <h3>
              {project === "music"
                ? "every track adds another footprint"
                : "every video adds another frame"}
            </h3>
          </div>
          <span>
            {nextLifetime
              ? `${nextLifetime.count - total} until ${nextLifetime.title}`
              : "every pathway reached"}
          </span>
        </div>

        <div className="wins-path">
          {path.map((milestone) => {
            const reached = total >= milestone.count;
            return (
              <div
                className={
                  reached
                    ? "wins-path-step wins-path-step-reached"
                    : "wins-path-step"
                }
                key={`${project}-${milestone.count}`}
              >
                <span>{reached ? "✓" : milestone.count}</span>
                <strong>{milestone.title}</strong>
                <small>
                  {milestone.count}{" "}
                  {project === "music" ? "tracks" : "videos"}
                </small>
              </div>
            );
          })}
        </div>

        <div className="wins-today-milestones">
          <div>
            <span>today’s {project} milestones reached</span>
            <strong>{reachedToday.length}</strong>
          </div>
          <p>
            {nextToday
              ? `${nextToday.count - todayTotal} more to reach ${nextToday.title}`
              : "every daily milestone reached · super-duper day"}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="little-wins-page">
      <header className="little-wins-heading">
        <div>
          <p>little wins</p>
          <h2>notice what you did</h2>
        </div>
        <span>each job keeps its own progress</span>
      </header>

      <section className="wins-summary">
        <article className="wins-hero-card">
          <div>
            <p>today’s separate rewards</p>
            <h3>nothing gets mixed together</h3>
          </div>

          <div className="wins-project-points">
            <div>
              <strong>{carePoints}</strong>
              <span>care points</span>
            </div>
            <div>
              <strong>{musicPoints}</strong>
              <span>music points</span>
            </div>
            <div>
              <strong>{videoPoints}</strong>
              <span>video points</span>
            </div>
          </div>

          <p className="wins-hero-message">
            your effort counts without combining your jobs
          </p>
        </article>

        <div className="wins-stat-grid">
          <article>
            <span>music annotations</span>
            <strong>{annotations.length}</strong>
            <small>{formatMinutes(musicMinutes)}</small>
          </article>
          <article>
            <span>video annotations</span>
            <strong>{videoAnnotations.length}</strong>
            <small>{formatMinutes(videoMinutes)}</small>
          </article>
          <article>
            <span>days shown up</span>
            <strong>{allDateKeys.size}</strong>
            <small>each day mattered</small>
          </article>
          <article>
            <span>current streak</span>
            <strong>{currentStreak}</strong>
            <small>
              {currentStreak === 1 ? "day" : "days"}
            </small>
          </article>
        </div>
      </section>

      <section className="wins-week-pair">
        {renderWeek("music", musicWeek)}
        {renderWeek("video", videoWeek)}
      </section>

      <article className="wins-proud-card wins-proud-wide">
        <div className="wins-section-heading">
          <div>
            <p>worth remembering</p>
            <h3>three things i’m proud of</h3>
          </div>
        </div>

        <div className="wins-proud-list">
          {proudNotes.map((note, index) => (
            <label key={note.id}>
              <span>{index + 1}</span>
              <input
                value={note.text}
                placeholder="a win that deserves noticing..."
                onChange={(event) =>
                  updateProudNote(note.id, event.target.value)
                }
              />
            </label>
          ))}
        </div>
      </article>

      <section className="wins-project-paths">
        {renderPath("music", annotations.length, musicToday)}
        {renderPath(
          "video",
          videoAnnotations.length,
          videoToday
        )}
      </section>
    </section>
  );
}
