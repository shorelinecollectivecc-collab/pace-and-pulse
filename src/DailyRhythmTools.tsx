import { useEffect, useMemo, useState } from "react";
import { useAppSettings } from "./AppSettingsContext";
import {
  annotationMilestones,
  moodOptions,
  movementOptions,
  optionalRoutineItems,
  progressPhrases,
  timerPresets,
} from "./features/daily-rhythm/constants";
import {
  formatTime,
  getEnergyLabel,
  getTemperatureLabel,
} from "./features/daily-rhythm/formatters";
import {
  getTodayKey,
  loadCheckIn,
  loadMilestoneRewards,
  loadRoutine,
  loadTasks,
  loadTimer,
} from "./features/daily-rhythm/storage";
import type {
  DailyRhythmToolsProps,
  DailyTask,
  GentleCheckIn,
  MovementType,
  RoutineState,
} from "./features/daily-rhythm/types";
import "./DailyRhythmTools.css";


type WorkPeriod = "morning" | "afternoon" | "evening";

type WorkSession = {
  id: string;
  minutes: number;
};

type WorkFocusState = Record<WorkPeriod, WorkSession[]>;

type RoutineDisplayItem = {
  id: string;
  label: string;
  prompt?: string;
  showNote?: boolean;
};

const dailyRoutineGroups: Array<{
  title: WorkPeriod;
  items: RoutineDisplayItem[];
}> = [
  {
    title: "morning",
    items: [
      {
        id: "wake-up",
        label: "wake up",
        prompt: "what time did you get up?",
        showNote: true,
      },
      {
        id: "morning-drink",
        label: "morning drink",
        prompt: "what are you drinking?",
        showNote: true,
      },
      {
        id: "breakfast",
        label: "breakfast",
        prompt: "what did you have?",
        showNote: true,
      },
      {
        id: "brush-teeth-morning",
        label: "brush teeth",
        showNote: false,
      },
      {
        id: "shower-morning",
        label: "shower",
        showNote: false,
      },
      {
        id: "meds-vitamins-morning",
        label: "meds + vitamins",
        prompt: "what did you take?",
        showNote: true,
      },
      {
        id: "get-dressed",
        label: "get dressed",
        prompt: "what feels comfortable?",
        showNote: true,
      },
      {
        id: "make-bed",
        label: "make bed",
        prompt: "tiny reset complete",
        showNote: true,
      },
      {
        id: "tidy-area",
        label: "tidy area",
        prompt: "which area?",
        showNote: true,
      },
    ],
  },
  {
    title: "afternoon",
    items: [
      {
        id: "chores",
        label: "do chores",
        prompt: "what needs doing?",
        showNote: true,
      },
      {
        id: "lunch",
        label: "have lunch",
        prompt: "what did you eat?",
        showNote: true,
      },
      {
        id: "meds-afternoon",
        label: "meds",
        prompt: "what did you take?",
        showNote: true,
      },
    ],
  },
  {
    title: "evening",
    items: [
      {
        id: "make-dinner",
        label: "make dinner",
        prompt: "what are you making?",
        showNote: true,
      },
      {
        id: "shower-evening",
        label: "shower",
        showNote: false,
      },
      {
        id: "pack-away",
        label: "pack away",
        prompt: "what needs putting away?",
        showNote: true,
      },
      {
        id: "rest",
        label: "rest",
        prompt: "how do you want to rest?",
        showNote: true,
      },
      {
        id: "meds-evening",
        label: "meds",
        prompt: "what did you take?",
        showNote: true,
      },
      {
        id: "brush-teeth-evening",
        label: "brush teeth",
        showNote: false,
      },
      {
        id: "bedtime",
        label: "bedtime",
        prompt: "what time are you aiming for?",
        showNote: true,
      },
    ],
  },
];

const emptyWorkFocus: WorkFocusState = {
  morning: [],
  afternoon: [],
  evening: [],
};

function makeWorkSessionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function loadWorkFocus(): WorkFocusState {
  try {
    const saved = localStorage.getItem(
      `pace-pulse-work-focus-${getTodayKey()}`
    );

    if (!saved) {
      return emptyWorkFocus;
    }

    const parsed = JSON.parse(saved) as Partial<WorkFocusState>;

    return {
      morning: Array.isArray(parsed.morning) ? parsed.morning : [],
      afternoon: Array.isArray(parsed.afternoon) ? parsed.afternoon : [],
      evening: Array.isArray(parsed.evening) ? parsed.evening : [],
    };
  } catch {
    return emptyWorkFocus;
  }
}

export default function DailyRhythmTools({
  annotationCount,
}: DailyRhythmToolsProps) {
  const { settings } = useAppSettings();
  const initialTimer = useMemo(loadTimer, []);
  const [duration, setDuration] = useState(
    initialTimer.duration
  );
  const [remaining, setRemaining] = useState(
    initialTimer.remaining
  );
  const [endAt, setEndAt] = useState<number | null>(
    initialTimer.endAt
  );
  const [tasks, setTasks] = useState<DailyTask[]>(loadTasks);
  const [checkIn, setCheckIn] =
    useState<GentleCheckIn>(loadCheckIn);
  const [routine, setRoutine] =
    useState<RoutineState>(loadRoutine);
  const [rewardMessage, setRewardMessage] = useState(
    "every checked box counts"
  );
  const [milestoneRewards, setMilestoneRewards] = useState<
    Record<string, string>
  >(loadMilestoneRewards);

  const [workFocus, setWorkFocus] =
    useState<WorkFocusState>(loadWorkFocus);
  const [workMinuteDrafts, setWorkMinuteDrafts] = useState<
    Record<WorkPeriod, string>
  >({
    morning: "",
    afternoon: "",
    evening: "",
  });

  const timerRunning = endAt !== null;
  const timerProgress =
    duration > 0
      ? Math.max(0, Math.min(100, (remaining / duration) * 100))
      : 0;

  useEffect(() => {
    if (endAt === null) {
      return;
    }

    function updateTimer() {
      const nextRemaining = Math.max(
        0,
        Math.ceil((endAt! - Date.now()) / 1000)
      );

      setRemaining(nextRemaining);

      if (nextRemaining === 0) {
        setEndAt(null);
      }
    }

    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);

    return () => window.clearInterval(interval);
  }, [endAt]);

  useEffect(() => {
    if (settings.autoSaveEnabled) {
      localStorage.setItem(
        `pace-pulse-work-timer-${getTodayKey()}`,
        JSON.stringify({ duration, remaining, endAt })
      );
    }
  }, [duration, remaining, endAt, settings.autoSaveEnabled]);

  useEffect(() => {
    if (settings.autoSaveEnabled) {
      localStorage.setItem(
        `pace-pulse-small-plan-${getTodayKey()}`,
        JSON.stringify(tasks)
      );
    }
  }, [tasks, settings.autoSaveEnabled]);

  useEffect(() => {
    if (settings.autoSaveEnabled) {
      localStorage.setItem(
        `pace-pulse-check-in-${getTodayKey()}`,
        JSON.stringify(checkIn)
      );
    }
  }, [checkIn, settings.autoSaveEnabled]);

  useEffect(() => {
    if (settings.autoSaveEnabled) {
      localStorage.setItem(
        `pace-pulse-routine-${getTodayKey()}`,
        JSON.stringify(routine)
      );
    }
  }, [routine, settings.autoSaveEnabled]);


  useEffect(() => {
    if (settings.autoSaveEnabled) {
      localStorage.setItem(
        `pace-pulse-work-focus-${getTodayKey()}`,
        JSON.stringify(workFocus)
      );
    }
  }, [workFocus, settings.autoSaveEnabled]);

  useEffect(() => {
    if (settings.autoSaveEnabled) {
      localStorage.setItem(
        "pace-pulse-milestone-rewards",
        JSON.stringify(milestoneRewards)
      );
    }
  }, [milestoneRewards, settings.autoSaveEnabled]);

  useEffect(() => {
    const reachedMilestone = [...annotationMilestones]
      .reverse()
      .find(
        (milestone) => annotationCount === milestone.count
      );

    if (reachedMilestone) {
      const customReward =
        milestoneRewards[String(reachedMilestone.count)]?.trim();

      setRewardMessage(
        customReward
          ? `${reachedMilestone.title} · ${reachedMilestone.message} · your reward: ${customReward}`
          : `${reachedMilestone.title} · ${reachedMilestone.message}`
      );
    }
  }, [annotationCount, milestoneRewards]);

  function chooseTimer(minutes: number) {
    const nextDuration = minutes * 60;

    setDuration(nextDuration);
    setRemaining(nextDuration);
    setEndAt(null);
  }

  function startTimer() {
    const secondsToUse = remaining > 0 ? remaining : duration;

    setRemaining(secondsToUse);
    setEndAt(Date.now() + secondsToUse * 1000);
  }

  function pauseTimer() {
    if (endAt === null) {
      return;
    }

    setRemaining(
      Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
    );
    setEndAt(null);
  }

  function resetTimer() {
    setRemaining(duration);
    setEndAt(null);
  }

  function updateTaskText(index: number, text: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task, taskIndex) =>
        taskIndex === index ? { ...task, text } : task
      )
    );
  }

  function toggleTask(index: number) {
    const completing = !tasks[index]?.done;
    const nextCompletedCount =
      tasks.filter((task) => task.done).length +
      (completing ? 1 : -1);

    setTasks((currentTasks) =>
      currentTasks.map((task, taskIndex) =>
        taskIndex === index
          ? { ...task, done: !task.done }
          : task
      )
    );

    setRewardMessage(
      completing
        ? progressPhrases[
            Math.max(0, nextCompletedCount - 1) %
              progressPhrases.length
          ]
        : "plans can change · your progress still counts"
    );
  }

  function changeCareCount(
    item: "waterCount" | "peeingCount",
    amount: number
  ) {
    setCheckIn((current) => {
      const nextValue = Math.max(0, current[item] + amount);

      return {
        ...current,
        [item]:
          item === "peeingCount"
            ? Math.min(8, nextValue)
            : nextValue,
      };
    });
  }

  function addMovement(movement: MovementType) {
    setCheckIn((current) => ({
      ...current,
      movementLog: [...current.movementLog, movement],
    }));
  }

  function undoLastMovement() {
    setCheckIn((current) => ({
      ...current,
      movementLog: current.movementLog.slice(0, -1),
    }));
  }

  function toggleRoutineItem(id: string) {
    const completing = !routine.done.includes(id);
    const currentCompleted =
      routine.done.length +
      tasks.filter((task) => task.done).length;
    const nextCompletedCount =
      currentCompleted + (completing ? 1 : -1);

    setRoutine((current) => ({
      ...current,
      done: current.done.includes(id)
        ? current.done.filter((item) => item !== id)
        : [...current.done, id],
    }));

    setRewardMessage(
      completing
        ? progressPhrases[
            Math.max(0, nextCompletedCount - 1) %
              progressPhrases.length
          ]
        : "unchecked without guilt · you can return when ready"
    );
  }

  function toggleRoutineExtra(id: string) {
    const selecting = !routine.extras.includes(id);
    const nextCompletedCount =
      routine.done.length +
      tasks.filter((task) => task.done).length +
      (selecting ? 1 : -1);

    setRoutine((current) => {
      const removing = current.extras.includes(id);

      return {
        extras: removing
          ? current.extras.filter((item) => item !== id)
          : [...current.extras, id],
        done: removing
          ? current.done.filter((item) => item !== id)
          : current.done.includes(id)
            ? current.done
            : [...current.done, id],
        extraDetails: removing
          ? Object.fromEntries(
              Object.entries(current.extraDetails ?? {}).filter(
                ([item]) => item !== id
              )
            )
          : current.extraDetails ?? {},
      };
    });

    setRewardMessage(
      selecting
        ? progressPhrases[
            Math.max(0, nextCompletedCount - 1) %
              progressPhrases.length
          ]
        : "plans can shift · removing it does not erase your progress"
    );
  }

  function updateExtraDetail(id: string, value: string) {
    setRoutine((current) => ({
      ...current,
      extraDetails: {
        ...(current.extraDetails ?? {}),
        [id]: value,
      },
    }));
  }

  function updateWorkMinutes(
    period: WorkPeriod,
    value: string
  ) {
    const cleanValue = value.replace(/[^\d]/g, "");

    setWorkMinuteDrafts((current) => ({
      ...current,
      [period]: cleanValue,
    }));
  }

  function addWorkSession(period: WorkPeriod) {
    const minutes = Number(workMinuteDrafts[period]);

    if (!Number.isFinite(minutes) || minutes <= 0) {
      setRewardMessage("add the minutes worked for this session");
      return;
    }

    setWorkFocus((current) => ({
      ...current,
      [period]: [
        ...current[period],
        {
          id: makeWorkSessionId(),
          minutes,
        },
      ],
    }));

    setWorkMinuteDrafts((current) => ({
      ...current,
      [period]: "",
    }));

    setRewardMessage(
      `${period} work session logged · ${minutes} minutes`
    );
  }

  function undoWorkSession(period: WorkPeriod) {
    setWorkFocus((current) => ({
      ...current,
      [period]: current[period].slice(0, -1),
    }));

    setRewardMessage(`${period} work session removed`);
  }

  function getWorkMinutes(period: WorkPeriod) {
    return workFocus[period].reduce(
      (total, session) => total + session.minutes,
      0
    );
  }

  const lastMovement =
    checkIn.movementLog.length > 0
      ? movementOptions.find(
          (option) =>
            option.id ===
            checkIn.movementLog[checkIn.movementLog.length - 1]
        )?.label
      : null;

  const routineItemIds = [
    ...dailyRoutineGroups.flatMap((group) =>
      group.items.map((item) => item.id)
    ),
    ...routine.extras,
  ];
  const workPeriodsStarted = (
    ["morning", "afternoon", "evening"] as WorkPeriod[]
  ).filter((period) => workFocus[period].length > 0).length;
  const routineDoneCount =
    routineItemIds.filter((id) => routine.done.includes(id)).length +
    workPeriodsStarted;
  const routineTotalCount = routineItemIds.length + 3;
  const completedSmallThings = tasks.filter(
    (task) => task.done
  ).length;
  const milestonePoints = annotationMilestones
    .filter((milestone) => annotationCount >= milestone.count)
    .reduce((total, milestone) => total + milestone.points, 0);
  const totalWorkSessions = (
    ["morning", "afternoon", "evening"] as WorkPeriod[]
  ).reduce(
    (total, period) => total + workFocus[period].length,
    0
  );
  const rhythmPoints =
    routineDoneCount * 5 +
    completedSmallThings * 5 +
    checkIn.movementLog.length * 2 +
    totalWorkSessions * 5 +
    milestonePoints;

  return (
    <section className="daily-tools-grid">
      <article className="daily-tool-card timer-card">
        <div className="daily-tool-heading">
          <div>
            <p>my work block</p>
            <h3>settle into one thing</h3>
          </div>

          <span>{timerRunning ? "working" : "ready"}</span>
        </div>

        <div className="timer-presets">
          {timerPresets.map((preset) => {
            const selected = duration === preset.minutes * 60;

            return (
              <button
                key={preset.minutes}
                className={selected ? "preset-selected" : ""}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseTimer(preset.minutes)}
              >
                {preset.label} · {preset.minutes}
              </button>
            );
          })}
        </div>

        <strong className="timer-display">
          {formatTime(remaining)}
        </strong>

        <div className="mini-progress-track">
          <div
            className="mini-progress-fill"
            style={{ width: `${timerProgress}%` }}
          />
        </div>

        <div className="timer-actions">
          <button
            className="timer-main-button"
            type="button"
            onClick={timerRunning ? pauseTimer : startTimer}
          >
            {timerRunning ? "pause" : "start"}
          </button>

          <button
            className="timer-reset-button"
            type="button"
            onClick={resetTimer}
          >
            reset
          </button>
        </div>
      </article>

      <article className="daily-tool-card small-plan-card">
        <div className="daily-tool-heading">
          <div>
            <p>today’s small plan</p>
            <h3>only what matters now</h3>
          </div>

          <span>saved</span>
        </div>

        <div className="small-plan-list">
          {tasks.map((task, index) => (
            <div
              className={
                task.done
                  ? "small-plan-row small-plan-row-done"
                  : "small-plan-row"
              }
              key={index}
            >
              <button
                type="button"
                aria-label={
                  task.done
                    ? `mark task ${index + 1} unfinished`
                    : `mark task ${index + 1} finished`
                }
                aria-pressed={task.done}
                onClick={() => toggleTask(index)}
              >
                {task.done ? "✓" : ""}
              </button>

              <input
                value={task.text}
                maxLength={70}
                aria-label={`small task ${index + 1}`}
                placeholder={`small thing ${index + 1}`}
                onChange={(event) =>
                  updateTaskText(index, event.target.value)
                }
              />
            </div>
          ))}
        </div>
      </article>

      <article className="daily-tool-card check-in-card">
        <div className="daily-tool-heading">
          <div>
            <p>gentle check-in</p>
            <h3>notice what you need</h3>
          </div>

          <span>today</span>
        </div>

        <div className="mood-section">
          <p>how do you feel?</p>

          <div className="mood-options">
            {moodOptions.map((mood) => (
              <button
                key={mood.id}
                className={
                  checkIn.mood === mood.id
                    ? "mood-option mood-option-selected"
                    : "mood-option"
                }
                type="button"
                aria-label={mood.label}
                aria-pressed={checkIn.mood === mood.id}
                title={mood.label}
                onClick={() =>
                  setCheckIn((current) => ({
                    ...current,
                    mood: mood.id,
                  }))
                }
              >
                <img src={mood.image} alt="" />
                {checkIn.mood === mood.id && (
                  <span className="mood-check">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="check-in-bottom">
          <div className="body-sliders">
            <label className="body-slider">
              <span className="slider-heading">
                <span>energy</span>
                <output>{getEnergyLabel(checkIn.energy)}</output>
              </span>

              <input
                type="range"
                min="0"
                max="100"
                step="25"
                value={checkIn.energy}
                aria-label="energy level"
                onChange={(event) =>
                  setCheckIn((current) => ({
                    ...current,
                    energy: Number(event.target.value),
                  }))
                }
              />

              <span className="slider-markers" aria-hidden="true">
                <span>low</span>
                <i />
                <i />
                <i />
                <span>high</span>
              </span>
            </label>

            <label className="body-slider temperature-slider">
              <span className="slider-heading">
                <span>temperature</span>
                <output>
                  {getTemperatureLabel(checkIn.temperature)}
                </output>
              </span>

              <span className="thermometer-row">
                <span className="thermometer-icon" aria-hidden="true">
                  <i />
                </span>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="25"
                  value={checkIn.temperature}
                  aria-label="body temperature from cold to hot"
                  onChange={(event) =>
                    setCheckIn((current) => ({
                      ...current,
                      temperature: Number(event.target.value),
                    }))
                  }
                />
              </span>

              <span className="slider-markers" aria-hidden="true">
                <span>cold</span>
                <i />
                <i />
                <i />
                <span>hot</span>
              </span>
            </label>
          </div>

          <div className="body-counters">
            <div className="body-counter">
              <p>water</p>

              <div className="counter-circle">
                <button
                  type="button"
                  aria-label="remove one glass of water"
                  onClick={() => changeCareCount("waterCount", -1)}
                >
                  −
                </button>
                <strong>{checkIn.waterCount}</strong>
                <button
                  type="button"
                  aria-label="add one glass of water"
                  onClick={() => changeCareCount("waterCount", 1)}
                >
                  +
                </button>
              </div>

              <span>glasses</span>
            </div>

            <div className="body-counter">
              <p>pee breaks</p>

              <div className="counter-circle">
                <button
                  type="button"
                  aria-label="remove one pee break"
                  onClick={() => changeCareCount("peeingCount", -1)}
                >
                  −
                </button>
                <strong>{checkIn.peeingCount}</strong>
                <button
                  type="button"
                  aria-label="add one pee break"
                  onClick={() => changeCareCount("peeingCount", 1)}
                >
                  +
                </button>
              </div>

              <span>
                {checkIn.peeingCount >= 3
                  ? "3–8 daily range"
                  : "aiming for 3–8"}
              </span>
            </div>
          </div>

          <div className="movement-tracker">
            <div className="movement-heading">
              <p>movement breaks</p>
              <span>{checkIn.movementLog.length} total</span>
            </div>

            <div className="movement-options">
              {movementOptions.map((movement) => {
                const count = checkIn.movementLog.filter(
                  (item) => item === movement.id
                ).length;

                return (
                  <button
                    key={movement.id}
                    type="button"
                    onClick={() => addMovement(movement.id)}
                  >
                    + {movement.label}
                    {count > 0 && <span> · {count}</span>}
                  </button>
                );
              })}
            </div>

            <div className="movement-last">
              <span>
                {lastMovement
                  ? `last · ${lastMovement}`
                  : "nothing logged yet"}
              </span>

              {lastMovement && (
                <button type="button" onClick={undoLastMovement}>
                  undo last
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      <article className="daily-tool-card routine-card">
        <div className="daily-tool-heading">
          <div>
            <p>my daily rhythm</p>
            <h3>one small step at a time</h3>
          </div>

          <span>
            {routineDoneCount} / {routineTotalCount} done
          </span>
        </div>

        <div className="reward-strip" aria-live="polite">
          <div>
            <span>you can do it</span>
            <strong>{rewardMessage}</strong>
          </div>

          <div className="rhythm-points">
            <strong>{rhythmPoints}</strong>
            <span>rhythm points</span>
          </div>
        </div>

        <section className="daily-milestones">
          <div className="milestone-heading">
            <p>today’s milestones</p>
            <span>{annotationCount} annotations logged</span>
          </div>

          <div className="milestone-list">
            {annotationMilestones.map((milestone) => {
              const reached =
                annotationCount >= milestone.count;

              return (
                <div
                  className={
                    reached
                      ? "milestone milestone-reached"
                      : "milestone"
                  }
                  key={milestone.count}
                >
                  <span>{reached ? "✓" : milestone.count}</span>
                  <div>
                    <strong>{milestone.title}</strong>
                    <small>
                      {milestone.count} annotations · +
                      {milestone.points} points
                    </small>
                  </div>

                  <input
                    value={
                      milestoneRewards[
                        String(milestone.count)
                      ] ?? ""
                    }
                    maxLength={70}
                    aria-label={`reward for ${milestone.count} annotations`}
                    placeholder="choose my reward"
                    onChange={(event) =>
                      setMilestoneRewards((current) => ({
                        ...current,
                        [String(milestone.count)]:
                          event.target.value,
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>

        <div className="routine-layout">
          {dailyRoutineGroups.map((group) => {
            const sessions = workFocus[group.title];
            const totalMinutes = getWorkMinutes(group.title);

            return (
              <section className="routine-column" key={group.title}>
                <h4>{group.title}</h4>

                <div className="work-focus-box">
                  <div className="work-focus-heading">
                    <div>
                      <strong>work focus</strong>
                      <span>
                        {sessions.length} session
                        {sessions.length === 1 ? "" : "s"} ·{" "}
                        {totalMinutes} min
                      </span>
                    </div>
                  </div>

                  <div className="work-focus-entry">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={workMinuteDrafts[group.title]}
                      aria-label={`${group.title} work session minutes`}
                      placeholder="minutes worked"
                      onChange={(event) =>
                        updateWorkMinutes(
                          group.title,
                          event.target.value
                        )
                      }
                    />

                    <button
                      type="button"
                      onClick={() => addWorkSession(group.title)}
                    >
                      + session
                    </button>
                  </div>

                  {sessions.length > 0 && (
                    <div className="work-session-log">
                      <div className="work-session-chips">
                        {sessions.map((session, index) => (
                          <span key={session.id}>
                            {index + 1} · {session.minutes} min
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => undoWorkSession(group.title)}
                      >
                        undo last
                      </button>
                    </div>
                  )}
                </div>

                <div className="routine-list">
                  {group.items.map((item) => {
                    const done = routine.done.includes(item.id);

                    return (
                      <div
                        className={
                          item.showNote === false
                            ? "routine-detail-row routine-detail-row-simple"
                            : "routine-detail-row"
                        }
                        key={item.id}
                      >
                        <button
                          className={done ? "routine-item-done" : ""}
                          type="button"
                          aria-pressed={done}
                          onClick={() => toggleRoutineItem(item.id)}
                        >
                          <span>{done ? "✓" : ""}</span>
                          {item.label}
                        </button>

                        {item.showNote !== false && (
                          <input
                            value={routine.extraDetails?.[item.id] ?? ""}
                            maxLength={90}
                            aria-label={`${item.label} note`}
                            placeholder={item.prompt}
                            onChange={(event) =>
                              updateExtraDetail(
                                item.id,
                                event.target.value
                              )
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section className="routine-column routine-extras">
            <h4>sometimes</h4>
            <p>select it, then add the useful details</p>

            <div className="optional-routine-list">
              {optionalRoutineItems.map((item) => {
                const selected = routine.extras.includes(item.id);

                return (
                  <div className="optional-routine-row" key={item.id}>
                    <button
                      className={selected ? "optional-selected" : ""}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleRoutineExtra(item.id)}
                    >
                      <span>{selected ? "✓" : ""}</span>
                      {item.label}
                    </button>

                    <input
                      value={routine.extraDetails?.[item.id] ?? ""}
                      maxLength={90}
                      aria-label={`${item.label} details`}
                      placeholder={
                        item.id === "meeting"
                          ? "for example · 3:30 pm monday meeting"
                          : "add what, when or where"
                      }
                      onFocus={() => {
                        if (!selected) {
                          toggleRoutineExtra(item.id);
                        }
                      }}
                      onChange={(event) =>
                        updateExtraDetail(item.id, event.target.value)
                      }
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </article>
    </section>
  );
}
