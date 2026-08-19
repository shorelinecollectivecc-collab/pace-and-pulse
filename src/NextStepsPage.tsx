import { useEffect, useMemo, useState } from "react";
import { useAppSettings } from "./AppSettingsContext";
import type { VideoAnnotationRecord } from "./VideoRhythmPage";
import { getVideoRecordEarningsUsd } from "./utils/videoEarnings";
import "./NextStepsPage.css";

type AnnotationRecord = {
  id: string;
  createdAt: string;
  dateKey: string;
  weekKey: string;
  monthKey: string;
  earningsUsd: number;
};

type NextStepsPageProps = {
  annotations: AnnotationRecord[];
  videoAnnotations: VideoAnnotationRecord[];
};

type PeriodGoals = {
  daily: number;
  weekly: number;
  monthly: number;
};

type GoalSettings = {
  music: PeriodGoals;
  video: PeriodGoals;
};

type MonthlyGoalItem = {
  id: string;
  text: string;
  done: boolean;
};

type SavedNextSteps = {
  monthKey: string;
  monthlyGoals: MonthlyGoalItem[];
  kindNote: string;
  reward: string;
  canWait: string;
};

const defaultGoals: GoalSettings = {
  music: {
    daily: 10,
    weekly: 70,
    monthly: 300,
  },
  video: {
    daily: 10,
    weekly: 70,
    monthly: 300,
  },
};

const defaultMonthlyGoals: MonthlyGoalItem[] = Array.from(
  { length: 5 },
  (_, index) => ({
    id: `monthly-goal-${index + 1}`,
    text: "",
    done: false,
  })
);

const encouragement = [
  "nothing has to be done all at once",
  "one clear next step is enough",
  "small progress still changes the day",
  "you are allowed to work with your brain",
];

function getDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

function getMonthKey(date: Date) {
  return getDateKey(date).slice(0, 7);
}

function getWeekKey(date: Date) {
  const workingDate = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    )
  );
  const dayNumber = workingDate.getUTCDay() || 7;

  workingDate.setUTCDate(
    workingDate.getUTCDate() + 4 - dayNumber
  );

  const yearStart = new Date(
    Date.UTC(workingDate.getUTCFullYear(), 0, 1)
  );
  const weekNumber = Math.ceil(
    ((workingDate.getTime() - yearStart.getTime()) /
      86400000 +
      1) /
      7
  );

  return `${workingDate.getUTCFullYear()}-w${String(
    weekNumber
  ).padStart(2, "0")}`;
}

function readGoals(): GoalSettings {
  try {
    const saved = localStorage.getItem(
      "pace-pulse-next-step-goals"
    );

    if (!saved) {
      return defaultGoals;
    }

    const parsed = JSON.parse(saved) as
      | Partial<GoalSettings>
      | Partial<PeriodGoals>;

    if (
      "music" in parsed ||
      "video" in parsed
    ) {
      const separated = parsed as Partial<GoalSettings>;

      return {
        music: {
          ...defaultGoals.music,
          ...(separated.music ?? {}),
        },
        video: {
          ...defaultGoals.video,
          ...(separated.video ?? {}),
        },
      };
    }

    const legacy = parsed as Partial<PeriodGoals>;

    return {
      music: {
        daily:
          typeof legacy.daily === "number"
            ? legacy.daily
            : defaultGoals.music.daily,
        weekly:
          typeof legacy.weekly === "number"
            ? legacy.weekly
            : defaultGoals.music.weekly,
        monthly:
          typeof legacy.monthly === "number"
            ? legacy.monthly
            : defaultGoals.music.monthly,
      },
      video: defaultGoals.video,
    };
  } catch {
    return defaultGoals;
  }
}

function readNextSteps(monthKey: string): SavedNextSteps {
  try {
    const saved = localStorage.getItem(
      "pace-pulse-next-steps"
    );

    if (!saved) {
      throw new Error("no saved next steps");
    }

    const parsed = JSON.parse(saved) as SavedNextSteps;

    if (parsed.monthKey !== monthKey) {
      throw new Error("saved goals belong to another month");
    }

    return {
      monthKey,
      monthlyGoals: Array.isArray(parsed.monthlyGoals)
        ? [
            ...parsed.monthlyGoals.slice(0, 5),
            ...defaultMonthlyGoals.slice(
              parsed.monthlyGoals.length,
              5
            ),
          ]
        : defaultMonthlyGoals,
      kindNote:
        typeof parsed.kindNote === "string"
          ? parsed.kindNote
          : "",
      reward:
        typeof parsed.reward === "string"
          ? parsed.reward
          : "",
      canWait:
        typeof parsed.canWait === "string"
          ? parsed.canWait
          : "",
    };
  } catch {
    return {
      monthKey,
      monthlyGoals: defaultMonthlyGoals,
      kindNote: "",
      reward: "",
      canWait: "",
    };
  }
}

function clampGoal(value: number) {
  return Math.max(1, Math.min(999, Math.round(value)));
}

export default function NextStepsPage({
  annotations,
  videoAnnotations,
}: NextStepsPageProps) {
  const { settings, formatCurrency } = useAppSettings();
  const now = new Date();
  const todayKey = getDateKey(now);
  const weekKey = getWeekKey(now);
  const monthKey = getMonthKey(now);
  const [goals, setGoals] = useState<GoalSettings>(readGoals);
  const [savedSteps, setSavedSteps] = useState<SavedNextSteps>(
    () => readNextSteps(monthKey)
  );

  const totals = useMemo(() => {
    const emptyPeriod = () => ({
      music: 0,
      video: 0,
      musicEarningsUsd: 0,
      videoEarningsUsd: 0,
    });
    const result = {
      daily: emptyPeriod(),
      weekly: emptyPeriod(),
      monthly: emptyPeriod(),
    };

    annotations.forEach((annotation) => {
      const earnings = Number(
        annotation.earningsUsd || 0
      );

      if (annotation.dateKey === todayKey) {
        result.daily.music += 1;
        result.daily.musicEarningsUsd += earnings;
      }

      if (annotation.weekKey === weekKey) {
        result.weekly.music += 1;
        result.weekly.musicEarningsUsd += earnings;
      }

      if (annotation.monthKey === monthKey) {
        result.monthly.music += 1;
        result.monthly.musicEarningsUsd += earnings;
      }
    });

    videoAnnotations.forEach((annotation) => {
      const earnings =
        getVideoRecordEarningsUsd(annotation);

      if (annotation.dateKey === todayKey) {
        result.daily.video += 1;
        result.daily.videoEarningsUsd += earnings;
      }

      if (annotation.weekKey === weekKey) {
        result.weekly.video += 1;
        result.weekly.videoEarningsUsd += earnings;
      }

      if (annotation.monthKey === monthKey) {
        result.monthly.video += 1;
        result.monthly.videoEarningsUsd += earnings;
      }
    });

    return result;
  }, [
    annotations,
    monthKey,
    todayKey,
    videoAnnotations,
    weekKey,
  ]);

  useEffect(() => {
    if (settings.autoSaveEnabled) {
      localStorage.setItem(
        "pace-pulse-next-step-goals",
        JSON.stringify(goals)
      );
    }
  }, [goals, settings.autoSaveEnabled]);

  useEffect(() => {
    if (settings.autoSaveEnabled) {
      localStorage.setItem(
        "pace-pulse-next-steps",
        JSON.stringify(savedSteps)
      );
    }
  }, [savedSteps, settings.autoSaveEnabled]);

  useEffect(() => {
    setGoals((current) =>
      current.music.daily === settings.dailyTarget &&
      current.video.daily === settings.videoDailyTarget
        ? current
        : {
            ...current,
            music: {
              ...current.music,
              daily: settings.dailyTarget,
            },
            video: {
              ...current.video,
              daily: settings.videoDailyTarget,
            },
          }
    );
  }, [settings.dailyTarget, settings.videoDailyTarget]);

  const completedMonthlyGoals = savedSteps.monthlyGoals.filter(
    (goal) => goal.done
  ).length;

  const encouragementText =
    encouragement[
      Math.min(
        completedMonthlyGoals,
        encouragement.length - 1
      )
    ];

  function updateGoal(
    project: keyof GoalSettings,
    period: keyof PeriodGoals,
    value: number
  ) {
    setGoals((current) => ({
      ...current,
      [project]: {
        ...current[project],
        [period]: clampGoal(value),
      },
    }));
  }

  function updateMonthlyGoal(
    id: string,
    change: Partial<MonthlyGoalItem>
  ) {
    setSavedSteps((current) => ({
      ...current,
      monthlyGoals: current.monthlyGoals.map((goal) =>
        goal.id === id ? { ...goal, ...change } : goal
      ),
    }));
  }

  const musicGoalCards = [
    {
      id: "daily" as const,
      eyebrow: "today",
      title: "just this day",
      current: totals.daily.music,
      earningsUsd: totals.daily.musicEarningsUsd,
      goal: goals.music.daily,
    },
    {
      id: "weekly" as const,
      eyebrow: "this week",
      title: "a gentle rhythm",
      current: totals.weekly.music,
      earningsUsd: totals.weekly.musicEarningsUsd,
      goal: goals.music.weekly,
    },
    {
      id: "monthly" as const,
      eyebrow: "this month",
      title: "the wider picture",
      current: totals.monthly.music,
      earningsUsd: totals.monthly.musicEarningsUsd,
      goal: goals.music.monthly,
    },
  ];
  const videoGoalCards = [
    {
      id: "daily" as const,
      eyebrow: "today",
      title: "just this day",
      current: totals.daily.video,
      earningsUsd: totals.daily.videoEarningsUsd,
      goal: goals.video.daily,
    },
    {
      id: "weekly" as const,
      eyebrow: "this week",
      title: "a gentle rhythm",
      current: totals.weekly.video,
      earningsUsd: totals.weekly.videoEarningsUsd,
      goal: goals.video.weekly,
    },
    {
      id: "monthly" as const,
      eyebrow: "this month",
      title: "the wider picture",
      current: totals.monthly.video,
      earningsUsd: totals.monthly.videoEarningsUsd,
      goal: goals.video.monthly,
    },
  ];

  return (
    <section className="next-steps-page">
      <header className="next-steps-heading">
        <div>
          <p>my next steps</p>
          <h2>only look a little way ahead</h2>
        </div>

        <span>
          {settings.autoSaveEnabled
            ? "saving automatically"
            : "saving is paused"}
        </span>
      </header>

      <section className="next-project-goals">
        {[
          {
            project: "music" as const,
            title: "music annotation job",
            subtitle: "tracks, music targets and music earnings",
            unit: "tracks completed",
            cards: musicGoalCards,
          },
          {
            project: "video" as const,
            title: "video annotation job",
            subtitle: "videos, video targets and video earnings",
            unit: "videos completed",
            cards: videoGoalCards,
          },
        ].map((group) => (
          <section
            className="next-project-group"
            key={group.project}
          >
            <div className="next-project-group-heading">
              <div>
                <p>{group.title}</p>
                <h3>{group.subtitle}</h3>
              </div>
              <span>kept separate</span>
            </div>

            <div className="next-goal-grid">
              {group.cards.map((card) => {
                const percentage = Math.min(
                  100,
                  (card.current / card.goal) * 100
                );
                const videoRateMissing =
                  group.project === "video" &&
                  settings.videoAnnotationRateUsd.trim() === "";

                return (
                  <article
                    className="next-goal-card"
                    key={`${group.project}-${card.id}`}
                  >
                    <div className="next-goal-card-heading">
                      <div>
                        <p>{card.eyebrow}</p>
                        <h3>{card.title}</h3>
                      </div>

                      <span>
                        {card.current} / {card.goal}
                      </span>
                    </div>

                    <div className="next-goal-progress">
                      <span
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="next-goal-details">
                      <div>
                        <span>{group.unit}</span>
                        <strong>{card.current}</strong>
                      </div>

                      <div>
                        <span>earned from this job</span>
                        <strong>
                          {videoRateMissing
                            ? "rate not set"
                            : formatCurrency(card.earningsUsd)}
                        </strong>
                      </div>
                    </div>

                    <div className="next-goal-adjuster">
                      <span>my {group.project} target</span>

                      <div>
                        <button
                          type="button"
                          aria-label={`lower ${group.project} ${card.eyebrow} target`}
                          onClick={() =>
                            updateGoal(
                              group.project,
                              card.id,
                              card.goal - 1
                            )
                          }
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={card.goal}
                          aria-label={`${group.project} ${card.eyebrow} annotation target`}
                          onChange={(event) =>
                            updateGoal(
                              group.project,
                              card.id,
                              Number(event.target.value) || 1
                            )
                          }
                        />

                        <button
                          type="button"
                          aria-label={`raise ${group.project} ${card.eyebrow} target`}
                          onClick={() =>
                            updateGoal(
                              group.project,
                              card.id,
                              card.goal + 1
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>

      <section className="next-lower-grid">
        <article className="next-priorities-card">
          <div className="next-section-heading">
            <div>
              <p>monthly goals</p>
              <h3>this month’s pathway</h3>
            </div>

            <span>{completedMonthlyGoals} / 5 done</span>
          </div>

          <div className="next-priority-list">
            {savedSteps.monthlyGoals.map(
              (goal, index) => (
                <label
                  className={
                    goal.done
                      ? "next-priority next-priority-done"
                      : "next-priority"
                  }
                  key={goal.id}
                >
                  <input
                    type="checkbox"
                    checked={goal.done}
                    onChange={(event) =>
                      updateMonthlyGoal(goal.id, {
                        done: event.target.checked,
                      })
                    }
                  />

                  <span className="next-priority-check">
                    {goal.done ? "✓" : index + 1}
                  </span>

                  <input
                    type="text"
                    value={goal.text}
                    placeholder={`monthly goal ${index + 1}`}
                    onChange={(event) =>
                      updateMonthlyGoal(goal.id, {
                        text: event.target.value,
                      })
                    }
                  />
                </label>
              )
            )}
          </div>

          <p className="next-encouragement">
            {encouragementText}
          </p>
        </article>

        <article className="next-kind-card">
          <div className="next-section-heading">
            <div>
              <p>a note for my brain</p>
              <h3>make room for the human part</h3>
            </div>
          </div>

          <label className="next-writing-field">
            <span>what would make today easier?</span>
            <textarea
              value={savedSteps.kindNote}
              placeholder="less pressure, headphones, a snack, a quieter room..."
              onChange={(event) =>
                setSavedSteps((current) => ({
                  ...current,
                  kindNote: event.target.value,
                }))
              }
            />
          </label>

          <label className="next-writing-field next-reward-field">
            <span>when i am done, i choose...</span>
            <input
              type="text"
              value={savedSteps.reward}
              placeholder="a favourite song, tea, outside time..."
              onChange={(event) =>
                setSavedSteps((current) => ({
                  ...current,
                  reward: event.target.value,
                }))
              }
            />
          </label>

          <label className="next-writing-field">
            <span>what can wait until later?</span>
            <input
              type="text"
              value={savedSteps.canWait}
              placeholder="anything that does not need today’s energy..."
              onChange={(event) =>
                setSavedSteps((current) => ({
                  ...current,
                  canWait: event.target.value,
                }))
              }
            />
          </label>
        </article>
      </section>
    </section>
  );
}
