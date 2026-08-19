export type MovementType =
  | "walk"
  | "swim"
  | "hanging-washing"
  | "chores"
  | "shower"
  | "taking-out-trash";

export type MoodId =
  | "cool"
  | "energised"
  | "happy-tears"
  | "in-love"
  | "open"
  | "surprised"
  | "angry"
  | "tearful"
  | "confused"
  | "sick"
  | "shy"
  | "playful";

export type DailyTask = {
  text: string;
  done: boolean;
};

export type GentleCheckIn = {
  mood: MoodId | null;
  energy: number;
  temperature: number;
  waterCount: number;
  peeingCount: number;
  movementLog: MovementType[];
};

export type RoutineState = {
  done: string[];
  extras: string[];
  extraDetails: Record<string, string>;
};

export type SavedTimer = {
  duration: number;
  remaining: number;
  endAt: number | null;
};

export type AnnotationMilestone = {
  count: number;
  points: number;
  title: string;
  message: string;
};

export type DailyRhythmToolsProps = {
  annotationCount: number;
};
