import { useEffect, useMemo, useState } from "react";
import "./BrainTeasersPage.css";

import BrainActivityEngine from "./features/brain-studio/components/BrainActivityEngine";
import "./features/brain-studio/engines/sudoku/SudokuStudio.css";
import "./features/brain-studio/engines/crossword/CrosswordStudio.css";
import "./features/brain-studio/engines/drawing/DrawingStudio.css";
import "./features/brain-studio/engines/music/MusicStudio.css";

import {
  brainActivities,
  getBrainActivity,
  getTodaysTrail,
} from "./features/brain-studio/data/activities";

import type {
  BrainActivity,
  BrainActivityType,
  LittleWin,
} from "./features/brain-studio/types";

type BrainTeasersPageProps = {
  formattedDate: string;
  themeName: string;
  themeDescription: string;
  themeBanner: string;
};

type SavedBrainStudioProgress = {
  date: string;
  completedActivities: BrainActivityType[];
  leaves: number;
  flowers: number;
  birds: number;
  trees: number;
};

const PROGRESS_STORAGE_KEY =
  "pace-pulse-brain-studio-progress";

const starterWins: LittleWin[] = [
  {
    id: "opened-studio",
    title: "visited the studio",
    completed: true,
  },
  {
    id: "started-activity",
    title: "started an activity",
    completed: false,
  },
  {
    id: "finished-activity",
    title: "finished an activity",
    completed: false,
  },
  {
    id: "followed-trail",
    title: "followed today’s trail",
    completed: false,
  },
];

function getTodayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

function createEmptyProgress(): SavedBrainStudioProgress {
  return {
    date: getTodayKey(),
    completedActivities: [],
    leaves: 0,
    flowers: 0,
    birds: 0,
    trees: 0,
  };
}

function loadProgress(): SavedBrainStudioProgress {
  const empty = createEmptyProgress();

  try {
    const stored = localStorage.getItem(
      PROGRESS_STORAGE_KEY,
    );

    if (!stored) {
      return empty;
    }

    const parsed = JSON.parse(
      stored,
    ) as Partial<SavedBrainStudioProgress>;

    if (parsed.date !== getTodayKey()) {
      return empty;
    }

    const completedActivities = Array.isArray(
      parsed.completedActivities,
    )
      ? parsed.completedActivities.filter(
          (
            activity,
          ): activity is BrainActivityType =>
            brainActivities.some(
              (item) => item.id === activity,
            ),
        )
      : [];

    return {
      date: getTodayKey(),
      completedActivities,
      leaves:
        typeof parsed.leaves === "number"
          ? parsed.leaves
          : 0,
      flowers:
        typeof parsed.flowers === "number"
          ? parsed.flowers
          : 0,
      birds:
        typeof parsed.birds === "number"
          ? parsed.birds
          : 0,
      trees:
        typeof parsed.trees === "number"
          ? parsed.trees
          : 0,
    };
  } catch {
    return empty;
  }
}

function buildLittleWins(
  selectedActivity: BrainActivityType,
  progress: SavedBrainStudioProgress,
): LittleWin[] {
  const completedCount =
    progress.completedActivities.length;

  return starterWins.map((win) => {
    if (win.id === "started-activity") {
      return {
        ...win,
        completed: Boolean(selectedActivity),
      };
    }

    if (win.id === "finished-activity") {
      return {
        ...win,
        completed: completedCount > 0,
      };
    }

    if (win.id === "followed-trail") {
      const trailIds = getTodaysTrail().map(
        (item) => item.activity,
      );

      return {
        ...win,
        completed: trailIds.every((activityId) =>
          progress.completedActivities.includes(
            activityId,
          ),
        ),
      };
    }

    return win;
  });
}

function activityStatusText(
  activity: BrainActivity,
  completed: boolean,
) {
  if (completed) {
    return "completed today";
  }

  if (!activity.available) {
    return "coming soon";
  }

  return `${activity.duration} min · ${activity.difficulty}`;
}

export default function BrainTeasersPage({
  formattedDate,
  themeName,
  themeDescription,
  themeBanner,
}: BrainTeasersPageProps) {
  const todaysTrail = useMemo(
    () => getTodaysTrail(),
    [],
  );

  const [selectedActivity, setSelectedActivity] =
    useState<BrainActivityType>(
      todaysTrail[0]?.activity ?? "sudoku",
    );

  const [progress, setProgress] =
    useState<SavedBrainStudioProgress>(
      loadProgress,
    );

  const [message, setMessage] = useState(
    "choose one activity and let the rest wait",
  );

  const activeActivity = getBrainActivity(
    selectedActivity,
  );

  const littleWins = useMemo(
    () =>
      buildLittleWins(
        selectedActivity,
        progress,
      ),
    [progress, selectedActivity],
  );

  const trailCompletedCount = todaysTrail.filter(
    (trailItem) =>
      progress.completedActivities.includes(
        trailItem.activity,
      ),
  ).length;

  const completedPercentage =
    todaysTrail.length === 0
      ? 0
      : Math.round(
          (trailCompletedCount /
            todaysTrail.length) *
            100,
        );

  useEffect(() => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify(progress),
    );
  }, [progress]);

  function selectActivity(
    activityId: BrainActivityType,
  ) {
    const activity = getBrainActivity(activityId);

    if (!activity.available) {
      setMessage(
        `${activity.title} is still being prepared`,
      );
      return;
    }

    setSelectedActivity(activityId);
    setMessage(
      `${activity.title} is ready when you are`,
    );
  }

  function completeActivity(
    activityId = selectedActivity,
  ) {
    const activity =
      getBrainActivity(activityId);

    if (
      progress.completedActivities.includes(
        activityId,
      )
    ) {
      setMessage(
        `${activity.title} is already resting in today’s woodland`,
      );
      return;
    }

    setProgress((current) => {
      if (
        current.completedActivities.includes(
          activityId,
        )
      ) {
        return current;
      }

      const nextLeaves = current.leaves + 1;

      const flowerEarned =
        nextLeaves % 3 === 0;

      const nextFlowers =
        current.flowers +
        (flowerEarned ? 1 : 0);

      const birdEarned =
        flowerEarned &&
        nextFlowers % 3 === 0;

      const nextBirds =
        current.birds +
        (birdEarned ? 1 : 0);

      const treeEarned =
        birdEarned &&
        nextBirds % 3 === 0;

      const nextTrees =
        current.trees +
        (treeEarned ? 1 : 0);

      return {
        ...current,
        completedActivities: [
          ...current.completedActivities,
          activityId,
        ],
        leaves: nextLeaves,
        flowers: nextFlowers,
        birds: nextBirds,
        trees: nextTrees,
      };
    });

    setMessage(
      `${activity.title} added a new leaf to your woodland`,
    );
  }

  function resetToday() {
    setProgress(createEmptyProgress());

    setMessage(
      "today’s woodland is ready to grow again",
    );
  }

  function chooseNextActivity() {
    const currentIndex =
      brainActivities.findIndex(
        (activity) =>
          activity.id === selectedActivity,
      );

    const nextActivity =
      brainActivities[
        (currentIndex + 1) %
          brainActivities.length
      ];

    selectActivity(nextActivity.id);
  }

  return (
    <main className="brain-page">
      <header className="brain-page-header">
        <div>
          <p>pace &amp; pulse</p>
          <h1>brain studio</h1>
        </div>

        <span>{formattedDate}</span>
      </header>

      <section
        className="brain-theme-banner"
        style={{
          backgroundImage: `linear-gradient(
            90deg,
            color-mix(
              in srgb,
              var(--surface) 76%,
              transparent
            ),
            color-mix(
              in srgb,
              var(--surface) 28%,
              transparent
            )
          ), url("${themeBanner}")`,
        }}
      >
        <div>
          <p>{themeName}</p>
          <span>{themeDescription}</span>
        </div>

        <small>
          stretch your thinking gently
          through music, patterns, words
          and play
        </small>
      </section>

      <section className="brain-needs-card">
        <div className="brain-section-heading">
          <div>
            <p>
              a gentle route through the
              studio
            </p>
            <h2>today’s trail</h2>
          </div>

          <span>
            {trailCompletedCount} of{" "}
            {todaysTrail.length} complete
          </span>
        </div>

        <div className="brain-needs-grid">
          {todaysTrail.map(
            (trailItem, index) => {
              const activity =
                getBrainActivity(
                  trailItem.activity,
                );

              const isSelected =
                activity.id ===
                selectedActivity;

              const isCompleted =
                progress.completedActivities.includes(
                  activity.id,
                );

              return (
                <button
                  key={activity.id}
                  className={
                    isSelected
                      ? "brain-need-button brain-need-button-active"
                      : "brain-need-button"
                  }
                  type="button"
                  onClick={() =>
                    selectActivity(
                      activity.id,
                    )
                  }
                >
                  <b>
                    {isCompleted
                      ? "✓"
                      : index + 1}
                  </b>

                  <span>
                    <strong>
                      {activity.title}
                    </strong>

                    <small>
                      {trailItem.duration} min
                      · {activity.difficulty}
                    </small>
                  </span>
                </button>
              );
            },
          )}
        </div>
      </section>

      <section className="brain-main-grid">
        <article className="brain-active-card">
          <div className="brain-activity-topline">
            <span>current activity</span>

            <small>
              {activeActivity.duration}{" "}
              minutes
            </small>
          </div>

          <h2>{activeActivity.title}</h2>

          <p className="brain-why">
            {activeActivity.description}
          </p>

          <div
            className={
              selectedActivity === "sudoku" ||
              selectedActivity === "crossword" ||
              selectedActivity === "drawing" ||
              selectedActivity === "music"
                ? "brain-active-body brain-active-body-engine"
                : "brain-active-body"
            }
          >
            {selectedActivity !== "sudoku" &&
              selectedActivity !== "crossword" &&
              selectedActivity !== "drawing" &&
              selectedActivity !== "music" && (
              <div className="brain-step-list">
                <div className="brain-step brain-step-done">
                  <span>1</span>
                  <p>
                    choose a comfortable pace
                  </p>
                </div>

                <div className="brain-step">
                  <span>2</span>
                  <p>
                    open the full{" "}
                    {activeActivity.title.toLowerCase()}{" "}
                    activity
                  </p>
                </div>

                <div className="brain-step">
                  <span>3</span>
                  <p>
                    complete it without
                    rushing
                  </p>
                </div>
              </div>
            )}

            <div
              className={
                selectedActivity === "sudoku" ||
                selectedActivity === "crossword" ||
                selectedActivity === "drawing" ||
                selectedActivity === "music"
                  ? "brain-tool-space brain-tool-space-engine"
                  : "brain-tool-space"
              }
            >
              <BrainActivityEngine
                activity={activeActivity}
                selectedActivity={selectedActivity}
                onComplete={completeActivity}
              />
            </div>
          </div>

          <div className="brain-timer-row">
            <div className="brain-timer">
              <span>studio note</span>
              <strong>{message}</strong>
            </div>

            <div className="brain-timer-actions">
              <button
                type="button"
                onClick={chooseNextActivity}
              >
                choose another
              </button>

              <button
                className="brain-done-button"
                type="button"
                onClick={() =>
                  completeActivity()
                }
              >
                mark complete
              </button>
            </div>
          </div>
        </article>

        <aside className="brain-progress-card">
          <div className="brain-section-heading">
            <div>
              <p>
                small progress still grows
              </p>
              <h2>little wins</h2>
            </div>
          </div>

          <div className="brain-progress-number">
            <strong>
              {completedPercentage}%
            </strong>

            <span>
              of today’s trail
            </span>
          </div>

          <div className="brain-little-wins-list">
            {littleWins.map((win) => (
              <div
                key={win.id}
                className={
                  win.completed
                    ? "brain-little-win brain-little-win-complete"
                    : "brain-little-win"
                }
              >
                <span>
                  {win.completed
                    ? "✓"
                    : "○"}
                </span>

                <p>{win.title}</p>
              </div>
            ))}
          </div>

          <div className="brain-progress-details">
            <div>
              <strong>
                {progress.leaves}
              </strong>
              <span>leaves</span>
            </div>

            <div>
              <strong>
                {progress.flowers}
              </strong>
              <span>flowers</span>
            </div>

            <div>
              <strong>
                {progress.birds}
              </strong>
              <span>birds</span>
            </div>

            <div>
              <strong>
                {progress.trees}
              </strong>
              <span>trees</span>
            </div>
          </div>

          <button
            className="brain-reset-progress"
            type="button"
            onClick={resetToday}
          >
            reset today
          </button>
        </aside>
      </section>

      <section className="brain-shelf-card">
        <div className="brain-section-heading">
          <div>
            <p>
              one activity opens at a time
            </p>
            <h2>
              today’s brain shelf
            </h2>
          </div>

          <span>
            choose what feels interesting
            now
          </span>
        </div>

        <div className="brain-shelf-grid">
          {brainActivities.map(
            (activity) => {
              const isSelected =
                activity.id ===
                selectedActivity;

              const isCompleted =
                progress.completedActivities.includes(
                  activity.id,
                );

              return (
                <button
                  key={activity.id}
                  className={
                    isSelected
                      ? "brain-shelf-activity brain-shelf-activity-active"
                      : "brain-shelf-activity"
                  }
                  type="button"
                  onClick={() =>
                    selectActivity(
                      activity.id,
                    )
                  }
                >
                  <span
                    className="brain-shelf-symbol"
                    aria-hidden="true"
                  >
                    {activity.icon}
                  </span>

                  <span className="brain-shelf-copy">
                    <strong>
                      {activity.title}
                    </strong>

                    <small>
                      {activity.subtitle}
                    </small>
                  </span>

                  <span className="brain-shelf-status">
                    {activityStatusText(
                      activity,
                      isCompleted,
                    )}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </section>
    </main>
  );
}