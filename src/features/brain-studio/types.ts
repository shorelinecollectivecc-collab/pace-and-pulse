export type BrainActivityType =
  | "sudoku"
  | "crossword"
  | "drawing"
  | "music";

export type Difficulty =
  | "gentle"
  | "easy"
  | "medium"
  | "hard";

export interface BrainActivity {
  id: BrainActivityType;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  colour: string;
  duration: number;
  difficulty: Difficulty;
  skills: string[];
  available: boolean;
}

export interface DailyTrailItem {
  activity: BrainActivityType;
  duration: number;
}

export interface LittleWin {
  id: string;
  title: string;
  completed: boolean;
}

export interface BrainStudioState {
  selectedActivity: BrainActivityType;
  completedToday: string[];
  streak: number;
}
