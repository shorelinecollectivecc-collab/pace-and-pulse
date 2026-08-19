import {
  annotationMilestones,
  moodOptions,
  movementOptions,
  optionalRoutineItems,
  routineGroups,
} from "./constants";
import type {
  DailyTask,
  GentleCheckIn,
  MovementType,
  RoutineState,
  SavedTimer,
} from "./types";

export function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

export function loadTasks(): DailyTask[] {
  const emptyTasks = Array.from({ length: 5 }, () => ({ text: "", done: false }));

  try {
    const saved = localStorage.getItem(`pace-pulse-small-plan-${getTodayKey()}`);
    if (!saved) return emptyTasks;
    const parsed = JSON.parse(saved) as DailyTask[];
    return emptyTasks.map((emptyTask, index) => ({
      text: typeof parsed[index]?.text === "string" ? parsed[index].text : emptyTask.text,
      done: typeof parsed[index]?.done === "boolean" ? parsed[index].done : emptyTask.done,
    }));
  } catch {
    return emptyTasks;
  }
}

export function loadCheckIn(): GentleCheckIn {
  const emptyCheckIn: GentleCheckIn = {
    mood: null,
    energy: 50,
    temperature: 50,
    waterCount: 0,
    peeingCount: 0,
    movementLog: [],
  };

  try {
    const saved = localStorage.getItem(`pace-pulse-check-in-${getTodayKey()}`);
    if (!saved) return emptyCheckIn;
    const parsed = JSON.parse(saved) as Partial<GentleCheckIn>;
    const validMood = moodOptions.some((mood) => mood.id === parsed.mood);

    return {
      mood: validMood ? parsed.mood ?? null : null,
      energy: typeof parsed.energy === "number" && Number.isFinite(parsed.energy)
        ? Math.max(0, Math.min(100, parsed.energy))
        : 50,
      temperature: typeof parsed.temperature === "number" && Number.isFinite(parsed.temperature)
        ? Math.max(0, Math.min(100, parsed.temperature))
        : 50,
      waterCount: typeof parsed.waterCount === "number" && Number.isFinite(parsed.waterCount) && parsed.waterCount > 0
        ? Math.floor(parsed.waterCount)
        : 0,
      peeingCount: typeof parsed.peeingCount === "number" && Number.isFinite(parsed.peeingCount) && parsed.peeingCount > 0
        ? Math.floor(parsed.peeingCount)
        : 0,
      movementLog: Array.isArray(parsed.movementLog)
        ? parsed.movementLog.filter((movement): movement is MovementType =>
            movementOptions.some((option) => option.id === movement))
        : [],
    };
  } catch {
    return emptyCheckIn;
  }
}

export function loadRoutine(): RoutineState {
  const emptyRoutine: RoutineState = { done: [], extras: [], extraDetails: {} };

  try {
    const saved = localStorage.getItem(`pace-pulse-routine-${getTodayKey()}`);
    if (!saved) return emptyRoutine;
    const parsed = JSON.parse(saved) as RoutineState;
    const allowedDetailIds = [
      ...routineGroups.flatMap((group) => group.items.map((item) => item.id)),
      ...optionalRoutineItems.map((item) => item.id),
    ];
    const validExtras = Array.isArray(parsed.extras)
      ? parsed.extras.filter((item) => optionalRoutineItems.some((option) => option.id === item))
      : [];
    const validDone = Array.isArray(parsed.done)
      ? parsed.done.filter((item) => typeof item === "string")
      : [];

    return {
      done: [...new Set([...validDone, ...validExtras])],
      extras: validExtras,
      extraDetails: parsed.extraDetails && typeof parsed.extraDetails === "object"
        ? Object.fromEntries(Object.entries(parsed.extraDetails).filter(
            ([id, value]) => allowedDetailIds.includes(id) && typeof value === "string"))
        : {},
    };
  } catch {
    return emptyRoutine;
  }
}

export function loadTimer(): SavedTimer {
  const fallback: SavedTimer = { duration: 60 * 60, remaining: 60 * 60, endAt: null };

  try {
    const saved = localStorage.getItem(`pace-pulse-work-timer-${getTodayKey()}`);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved) as SavedTimer;
    const duration = Number.isFinite(parsed.duration) && parsed.duration > 0
      ? parsed.duration
      : fallback.duration;

    if (typeof parsed.endAt === "number" && Number.isFinite(parsed.endAt)) {
      const remaining = Math.max(0, Math.ceil((parsed.endAt - Date.now()) / 1000));
      return { duration, remaining, endAt: remaining > 0 ? parsed.endAt : null };
    }

    return {
      duration,
      remaining: Number.isFinite(parsed.remaining) && parsed.remaining >= 0
        ? Math.min(parsed.remaining, duration)
        : duration,
      endAt: null,
    };
  } catch {
    return fallback;
  }
}

export function loadMilestoneRewards(): Record<string, string> {
  try {
    const saved = localStorage.getItem("pace-pulse-milestone-rewards");
    if (!saved) return {};
    const parsed = JSON.parse(saved) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).filter(
      ([key, value]) => annotationMilestones.some(
        (milestone) => String(milestone.count) === key) && typeof value === "string")) as Record<string, string>;
  } catch {
    return {};
  }
}
