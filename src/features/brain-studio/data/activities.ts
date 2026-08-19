import type {
  BrainActivity,
  BrainActivityType,
  DailyTrailItem,
} from "../types";

export const brainActivities: BrainActivity[] = [
  {
    id: "sudoku",
    title: "Sudoku",
    subtitle: "number patterns and quiet focus",
    description:
      "Solve thoughtful number grids with hints, checking, difficulty choices and saved progress.",
    icon: "◇",
    colour: "sage",
    duration: 10,
    difficulty: "easy",
    skills: [
      "number patterns",
      "logic",
      "focus",
    ],
    available: true,
  },
  {
    id: "crossword",
    title: "Crossword",
    subtitle: "words, clues and connections",
    description:
      "Work through written clues, fill the grid and move between gentle and more challenging word puzzles.",
    icon: "✎",
    colour: "sage",
    duration: 10,
    difficulty: "easy",
    skills: [
      "words",
      "clues",
      "connections",
    ],
    available: true,
  },
  {
    id: "drawing",
    title: "Drawing Studio",
    subtitle: "make marks without pressure",
    description:
      "Draw freely or follow gentle guided prompts using pencils, markers, colours and a spacious drawing area.",
    icon: "✦",
    colour: "sage",
    duration: 8,
    difficulty: "gentle",
    skills: [
      "drawing",
      "creativity",
      "visual focus",
    ],
    available: true,
  },
  {
    id: "music",
    title: "Music Studio",
    subtitle: "written music puzzles and theory",
    description:
      "Explore written notes, rhythm, piano keys, symbols, staff patterns, instruments, chords and music clues.",
    icon: "♪",
    colour: "sage",
    duration: 7,
    difficulty: "easy",
    skills: [
      "music theory",
      "notation",
      "patterns",
    ],
    available: true,
  },
];

const todaysTrail: DailyTrailItem[] = [
  {
    activity: "sudoku",
    duration: 10,
  },
  {
    activity: "crossword",
    duration: 10,
  },
  {
    activity: "drawing",
    duration: 8,
  },
  {
    activity: "music",
    duration: 7,
  },
];

export function getBrainActivity(
  activityId: BrainActivityType,
): BrainActivity {
  return (
    brainActivities.find(
      (activity) =>
        activity.id === activityId,
    ) ?? brainActivities[0]
  );
}

export function getTodaysTrail(): DailyTrailItem[] {
  return todaysTrail;
}
