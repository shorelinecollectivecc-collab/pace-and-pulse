import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./SudokuStudio.css";

type SudokuDifficulty =
  | "gentle"
  | "easy"
  | "medium"
  | "hard"
  | "genius";

type SudokuCell = {
  value: number;
  solution: number;
  fixed: boolean;
  notes: number[];
  revealed: boolean;
};

type SudokuPuzzle = {
  id: string;
  difficulty: SudokuDifficulty;
  index: number;
  cells: SudokuCell[];
};

type SavedPuzzleProgress = {
  values: number[];
  notes: number[][];
  revealed: boolean[];
  mistakes: number;
  hintsUsed: number;
  completed: boolean;
  elapsedSeconds: number;
  startedAt: number;
  updatedAt: number;
};

type DifficultyStats = {
  played: number;
  completed: number;
  bestSeconds: number | null;
  totalMistakes: number;
  totalHints: number;
};

type SudokuStorage = {
  version: 2;
  selectedDifficulty: SudokuDifficulty;
  lastPuzzleByDifficulty: Record<SudokuDifficulty, number>;
  progressByPuzzle: Record<string, SavedPuzzleProgress>;
  completedPuzzleIds: string[];
  statsByDifficulty: Record<SudokuDifficulty, DifficultyStats>;
};

type SudokuStudioProps = {
  onComplete?: () => void;
};

const STORAGE_KEY = "pace-pulse-brain-studio-sudoku-v2";
const LEGACY_STORAGE_KEY = "pace-pulse-brain-studio-sudoku";
const GRID_SIZE = 9;
const BOX_SIZE = 3;
const EMPTY_VALUE = 0;
const PUZZLES_PER_DIFFICULTY = 24;

const DIFFICULTIES: SudokuDifficulty[] = [
  "gentle",
  "easy",
  "medium",
  "hard",
  "genius",
];

const DIFFICULTY_LABELS: Record<
  SudokuDifficulty,
  string
> = {
  gentle: "gentle",
  easy: "easy",
  medium: "medium",
  hard: "hard",
  genius: "genius",
};

const CLUE_RANGES: Record<
  SudokuDifficulty,
  readonly [number, number]
> = {
  gentle: [40, 45],
  easy: [34, 39],
  medium: [28, 33],
  hard: [22, 27],
  genius: [17, 21],
};

const DEFAULT_STATS: DifficultyStats = {
  played: 0,
  completed: 0,
  bestSeconds: null,
  totalMistakes: 0,
  totalHints: 0,
};

const EMPTY_LAST_PUZZLE: Record<
  SudokuDifficulty,
  number
> = {
  gentle: 0,
  easy: 0,
  medium: 0,
  hard: 0,
  genius: 0,
};


function createSeededRandom(seedText: string) {
  let seed = 2166136261;

  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRandom<T>(
  values: readonly T[],
  random: () => number,
): T[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [
      result[swapIndex],
      result[index],
    ];
  }

  return result;
}

function pattern(row: number, column: number) {
  return (
    (BOX_SIZE * (row % BOX_SIZE) +
      Math.floor(row / BOX_SIZE) +
      column) %
    GRID_SIZE
  );
}

function createSolvedGrid(seed: string): number[] {
  const random = createSeededRandom(seed);
  const rows = shuffleWithRandom([0, 1, 2], random).flatMap(
    (boxRow) =>
      shuffleWithRandom([0, 1, 2], random).map(
        (row) => boxRow * BOX_SIZE + row,
      ),
  );
  const columns = shuffleWithRandom([0, 1, 2], random).flatMap(
    (boxColumn) =>
      shuffleWithRandom([0, 1, 2], random).map(
        (column) => boxColumn * BOX_SIZE + column,
      ),
  );
  const numbers = shuffleWithRandom(
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    random,
  );

  return rows.flatMap((row) =>
    columns.map((column) => numbers[pattern(row, column)]),
  );
}

function getRow(index: number) {
  return Math.floor(index / GRID_SIZE);
}

function getColumn(index: number) {
  return index % GRID_SIZE;
}

function getBox(index: number) {
  return (
    Math.floor(getRow(index) / BOX_SIZE) * BOX_SIZE +
    Math.floor(getColumn(index) / BOX_SIZE)
  );
}

function cellsAreRelated(firstIndex: number, secondIndex: number) {
  return (
    getRow(firstIndex) === getRow(secondIndex) ||
    getColumn(firstIndex) === getColumn(secondIndex) ||
    getBox(firstIndex) === getBox(secondIndex)
  );
}

function isValidCandidate(
  board: number[],
  index: number,
  value: number,
) {
  const row = getRow(index);
  const column = getColumn(index);
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxColumn = Math.floor(column / BOX_SIZE) * BOX_SIZE;

  for (let cursor = 0; cursor < GRID_SIZE; cursor += 1) {
    if (board[row * GRID_SIZE + cursor] === value) {
      return false;
    }

    if (board[cursor * GRID_SIZE + column] === value) {
      return false;
    }
  }

  for (let rowOffset = 0; rowOffset < BOX_SIZE; rowOffset += 1) {
    for (
      let columnOffset = 0;
      columnOffset < BOX_SIZE;
      columnOffset += 1
    ) {
      const boxIndex =
        (boxRow + rowOffset) * GRID_SIZE +
        boxColumn +
        columnOffset;

      if (board[boxIndex] === value) {
        return false;
      }
    }
  }

  return true;
}

function countSolutions(board: number[], limit = 2): number {
  let emptyIndex = -1;
  let candidates: number[] = [];

  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== EMPTY_VALUE) {
      continue;
    }

    const nextCandidates = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
      (value) => isValidCandidate(board, index, value),
    );

    if (nextCandidates.length === 0) {
      return 0;
    }

    if (
      emptyIndex === -1 ||
      nextCandidates.length < candidates.length
    ) {
      emptyIndex = index;
      candidates = nextCandidates;

      if (candidates.length === 1) {
        break;
      }
    }
  }

  if (emptyIndex === -1) {
    return 1;
  }

  let solutions = 0;

  for (const value of candidates) {
    board[emptyIndex] = value;
    solutions += countSolutions(board, limit - solutions);
    board[emptyIndex] = EMPTY_VALUE;

    if (solutions >= limit) {
      return solutions;
    }
  }

  return solutions;
}

function getTargetClues(
  difficulty: SudokuDifficulty,
  random: () => number,
) {
  const [minimum, maximum] = CLUE_RANGES[difficulty];
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function createSudokuPuzzle(
  difficulty: SudokuDifficulty,
  puzzleIndex: number,
): SudokuPuzzle {
  const id = `${difficulty}-${puzzleIndex + 1}`;
  const random = createSeededRandom(`pace-pulse-${id}`);
  const solution = createSolvedGrid(`solution-${id}`);
  const puzzle = [...solution];
  const targetClues = getTargetClues(difficulty, random);
  const removalOrder = shuffleWithRandom(
    Array.from({ length: 81 }, (_, index) => index),
    random,
  );

  let cluesRemaining = 81;

  for (const index of removalOrder) {
    if (cluesRemaining <= targetClues) {
      break;
    }

    const previous = puzzle[index];
    puzzle[index] = EMPTY_VALUE;

    const shouldCheckUniqueness =
      difficulty === "hard" || difficulty === "genius";

    if (
      shouldCheckUniqueness &&
      countSolutions([...puzzle], 2) !== 1
    ) {
      puzzle[index] = previous;
      continue;
    }

    cluesRemaining -= 1;
  }

  return {
    id,
    difficulty,
    index: puzzleIndex,
    cells: puzzle.map((value, index) => ({
      value,
      solution: solution[index],
      fixed: value !== EMPTY_VALUE,
      notes: [],
      revealed: false,
    })),
  };
}

function sanitizeDifficulty(value: unknown): SudokuDifficulty {
  return DIFFICULTIES.includes(value as SudokuDifficulty)
    ? (value as SudokuDifficulty)
    : "easy";
}

function sanitizePuzzleIndex(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(PUZZLES_PER_DIFFICULTY - 1, Math.floor(value)),
  );
}

function loadStorage(): SudokuStorage {
  const emptyStorage: SudokuStorage = {
    version: 2,
    selectedDifficulty: "easy",
    lastPuzzleByDifficulty: { ...EMPTY_LAST_PUZZLE },
    progressByPuzzle: {},
    completedPuzzleIds: [],
    statsByDifficulty: {
      gentle: { ...DEFAULT_STATS },
      easy: { ...DEFAULT_STATS },
      medium: { ...DEFAULT_STATS },
      hard: { ...DEFAULT_STATS },
      genius: { ...DEFAULT_STATS },
    },
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return emptyStorage;
    }

    const parsed = JSON.parse(raw) as Partial<SudokuStorage>;
    const selectedDifficulty = sanitizeDifficulty(
      parsed.selectedDifficulty,
    );
    const lastPuzzleByDifficulty = { ...EMPTY_LAST_PUZZLE };
    const statsByDifficulty = {
      gentle: { ...DEFAULT_STATS },
      easy: { ...DEFAULT_STATS },
      medium: { ...DEFAULT_STATS },
      hard: { ...DEFAULT_STATS },
      genius: { ...DEFAULT_STATS },
    };

    for (const difficulty of DIFFICULTIES) {
      lastPuzzleByDifficulty[difficulty] = sanitizePuzzleIndex(
        parsed.lastPuzzleByDifficulty?.[difficulty],
      );

      const sourceStats = parsed.statsByDifficulty?.[difficulty];

      if (sourceStats) {
        statsByDifficulty[difficulty] = {
          played:
            typeof sourceStats.played === "number"
              ? Math.max(0, sourceStats.played)
              : 0,
          completed:
            typeof sourceStats.completed === "number"
              ? Math.max(0, sourceStats.completed)
              : 0,
          bestSeconds:
            typeof sourceStats.bestSeconds === "number"
              ? Math.max(0, sourceStats.bestSeconds)
              : null,
          totalMistakes:
            typeof sourceStats.totalMistakes === "number"
              ? Math.max(0, sourceStats.totalMistakes)
              : 0,
          totalHints:
            typeof sourceStats.totalHints === "number"
              ? Math.max(0, sourceStats.totalHints)
              : 0,
        };
      }
    }

    return {
      version: 2,
      selectedDifficulty,
      lastPuzzleByDifficulty,
      progressByPuzzle:
        parsed.progressByPuzzle &&
        typeof parsed.progressByPuzzle === "object"
          ? parsed.progressByPuzzle
          : {},
      completedPuzzleIds: Array.isArray(parsed.completedPuzzleIds)
        ? parsed.completedPuzzleIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
      statsByDifficulty,
    };
  } catch {
    return emptyStorage;
  }
}

function applySavedProgress(
  puzzle: SudokuPuzzle,
  progress: SavedPuzzleProgress | undefined,
) {
  if (
    !progress ||
    !Array.isArray(progress.values) ||
    progress.values.length !== 81
  ) {
    return puzzle.cells;
  }

  return puzzle.cells.map((cell, index) => {
    if (cell.fixed) {
      return cell;
    }

    const savedValue = progress.values[index];
    const value =
      typeof savedValue === "number" &&
      savedValue >= 0 &&
      savedValue <= 9
        ? savedValue
        : EMPTY_VALUE;

    return {
      ...cell,
      value,
      notes: Array.isArray(progress.notes?.[index])
        ? progress.notes[index]
            .filter(
              (note) =>
                typeof note === "number" &&
                note >= 1 &&
                note <= 9,
            )
            .sort((first, second) => first - second)
        : [],
      revealed: Boolean(progress.revealed?.[index]),
    };
  });
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function createClassName(
  classes: Array<string | false | null | undefined>,
) {
  return classes.filter(Boolean).join(" ");
}

export default function SudokuStudio({
  onComplete,
}: SudokuStudioProps) {
  const initialStorage = useMemo(() => loadStorage(), []);
  const [storage, setStorage] = useState(initialStorage);
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>(
    initialStorage.selectedDifficulty,
  );
  const [puzzleIndex, setPuzzleIndex] = useState(
    initialStorage.lastPuzzleByDifficulty[
      initialStorage.selectedDifficulty
    ],
  );

  const basePuzzle = useMemo(
    () => createSudokuPuzzle(difficulty, puzzleIndex),
    [difficulty, puzzleIndex],
  );

  const savedProgress = storage.progressByPuzzle[basePuzzle.id];

  const [cells, setCells] = useState<SudokuCell[]>(() =>
    applySavedProgress(basePuzzle, savedProgress),
  );
  const [selectedCell, setSelectedCell] = useState<number | null>(
    null,
  );
  const [notesMode, setNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(
    savedProgress?.mistakes ?? 0,
  );
  const [hintsUsed, setHintsUsed] = useState(
    savedProgress?.hintsUsed ?? 0,
  );
  const [completed, setCompleted] = useState(
    savedProgress?.completed ?? false,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(
    savedProgress?.elapsedSeconds ?? 0,
  );
  const [message, setMessage] = useState(
    savedProgress
      ? "your saved puzzle is ready"
      : "choose a square and begin gently",
  );
  const [showPuzzlePicker, setShowPuzzlePicker] = useState(false);
  const completionReported = useRef(false);

  const selectedValue =
    selectedCell === null ? 0 : cells[selectedCell].value;
  const filledCount = cells.filter(
    (cell) => cell.value !== EMPTY_VALUE,
  ).length;
  const progress = Math.round((filledCount / cells.length) * 100);
  const difficultyStats = storage.statsByDifficulty[difficulty];
  const completedCount = Array.from(
    { length: PUZZLES_PER_DIFFICULTY },
    (_, index) => `${difficulty}-${index + 1}`,
  ).filter((id) => storage.completedPuzzleIds.includes(id)).length;

  useEffect(() => {
    const progressForPuzzle =
      storage.progressByPuzzle[basePuzzle.id];

    setCells(applySavedProgress(basePuzzle, progressForPuzzle));
    setSelectedCell(null);
    setNotesMode(false);
    setMistakes(progressForPuzzle?.mistakes ?? 0);
    setHintsUsed(progressForPuzzle?.hintsUsed ?? 0);
    setCompleted(progressForPuzzle?.completed ?? false);
    setElapsedSeconds(progressForPuzzle?.elapsedSeconds ?? 0);
    setMessage(
      progressForPuzzle
        ? "your saved puzzle is ready"
        : `puzzle ${puzzleIndex + 1} is ready`,
    );
    completionReported.current = Boolean(
      progressForPuzzle?.completed,
    );
  }, [basePuzzle.id]);

  useEffect(() => {
    if (completed) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [completed, basePuzzle.id]);

  useEffect(() => {
    const now = Date.now();

    setStorage((current) => {
      const previousProgress = current.progressByPuzzle[basePuzzle.id];
      const wasPlayed = Boolean(previousProgress);
      const nextProgress: SavedPuzzleProgress = {
        values: cells.map((cell) => cell.value),
        notes: cells.map((cell) => cell.notes),
        revealed: cells.map((cell) => cell.revealed),
        mistakes,
        hintsUsed,
        completed,
        elapsedSeconds,
        startedAt: previousProgress?.startedAt ?? now,
        updatedAt: now,
      };
      const nextStats = {
        ...current.statsByDifficulty,
        [difficulty]: {
          ...current.statsByDifficulty[difficulty],
          played:
            current.statsByDifficulty[difficulty].played +
            (wasPlayed ? 0 : 1),
        },
      };

      const nextStorage: SudokuStorage = {
        ...current,
        selectedDifficulty: difficulty,
        lastPuzzleByDifficulty: {
          ...current.lastPuzzleByDifficulty,
          [difficulty]: puzzleIndex,
        },
        progressByPuzzle: {
          ...current.progressByPuzzle,
          [basePuzzle.id]: nextProgress,
        },
        statsByDifficulty: nextStats,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStorage));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return nextStorage;
    });
  }, [
    basePuzzle.id,
    cells,
    completed,
    difficulty,
    elapsedSeconds,
    hintsUsed,
    mistakes,
    puzzleIndex,
  ]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key >= "1" && event.key <= "9") {
        event.preventDefault();
        enterNumber(Number(event.key));
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        eraseCell();
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setNotesMode((current) => !current);
        return;
      }

      if (selectedCell === null) {
        return;
      }

      const row = getRow(selectedCell);
      const column = getColumn(selectedCell);
      let nextIndex = selectedCell;

      if (event.key === "ArrowUp") {
        nextIndex = Math.max(0, row - 1) * 9 + column;
      } else if (event.key === "ArrowDown") {
        nextIndex = Math.min(8, row + 1) * 9 + column;
      } else if (event.key === "ArrowLeft") {
        nextIndex = row * 9 + Math.max(0, column - 1);
      } else if (event.key === "ArrowRight") {
        nextIndex = row * 9 + Math.min(8, column + 1);
      } else {
        return;
      }

      event.preventDefault();
      setSelectedCell(nextIndex);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function switchDifficulty(nextDifficulty: SudokuDifficulty) {
    if (nextDifficulty === difficulty) {
      return;
    }

    const nextIndex = storage.lastPuzzleByDifficulty[nextDifficulty];
    setDifficulty(nextDifficulty);
    setPuzzleIndex(nextIndex);
    setShowPuzzlePicker(false);
  }

  function openPuzzle(nextIndex: number) {
    setPuzzleIndex(sanitizePuzzleIndex(nextIndex));
    setShowPuzzlePicker(false);
  }

  function previousPuzzle() {
    openPuzzle(
      puzzleIndex === 0
        ? PUZZLES_PER_DIFFICULTY - 1
        : puzzleIndex - 1,
    );
  }

  function nextPuzzle() {
    openPuzzle((puzzleIndex + 1) % PUZZLES_PER_DIFFICULTY);
  }

  function newPuzzle() {
    const available = Array.from(
      { length: PUZZLES_PER_DIFFICULTY },
      (_, index) => index,
    ).filter((index) => index !== puzzleIndex);
    const unfinished = available.filter(
      (index) =>
        !storage.completedPuzzleIds.includes(
          `${difficulty}-${index + 1}`,
        ),
    );
    const pool = unfinished.length > 0 ? unfinished : available;
    const nextIndex = pool[Math.floor(Math.random() * pool.length)];
    openPuzzle(nextIndex ?? 0);
  }

  function resetCurrentPuzzle() {
    const confirmed = window.confirm(
      "reset this puzzle and clear its saved progress?",
    );

    if (!confirmed) {
      return;
    }

    setCells(basePuzzle.cells);
    setSelectedCell(null);
    setNotesMode(false);
    setMistakes(0);
    setHintsUsed(0);
    setCompleted(false);
    setElapsedSeconds(0);
    setMessage("the puzzle has been reset");
    completionReported.current = false;

    setStorage((current) => {
      const nextProgress = { ...current.progressByPuzzle };
      delete nextProgress[basePuzzle.id];
      const nextStorage = {
        ...current,
        progressByPuzzle: nextProgress,
        completedPuzzleIds: current.completedPuzzleIds.filter(
          (id) => id !== basePuzzle.id,
        ),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStorage));
      return nextStorage;
    });
  }

  function selectCell(index: number) {
    setSelectedCell(index);

    if (completed) {
      setMessage("this puzzle is already complete");
    } else if (cells[index].fixed) {
      setMessage("this number belongs to the original puzzle");
    } else if (notesMode) {
      setMessage("notes mode is on");
    } else {
      setMessage("choose a number below");
    }
  }

  function checkCompletion(nextCells: SudokuCell[]) {
    const isComplete = nextCells.every(
      (cell) => cell.value === cell.solution,
    );

    if (!isComplete || completionReported.current) {
      return;
    }

    completionReported.current = true;
    setCompleted(true);
    setMessage("beautifully done — the whole grid is complete");

    setStorage((current) => {
      const alreadyCompleted = current.completedPuzzleIds.includes(
        basePuzzle.id,
      );
      const previousStats = current.statsByDifficulty[difficulty];
      const nextStats: DifficultyStats = alreadyCompleted
        ? previousStats
        : {
            ...previousStats,
            completed: previousStats.completed + 1,
            bestSeconds:
              previousStats.bestSeconds === null
                ? elapsedSeconds
                : Math.min(previousStats.bestSeconds, elapsedSeconds),
            totalMistakes:
              previousStats.totalMistakes + mistakes,
            totalHints: previousStats.totalHints + hintsUsed,
          };
      const nextStorage: SudokuStorage = {
        ...current,
        completedPuzzleIds: alreadyCompleted
          ? current.completedPuzzleIds
          : [...current.completedPuzzleIds, basePuzzle.id],
        statsByDifficulty: {
          ...current.statsByDifficulty,
          [difficulty]: nextStats,
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStorage));
      return nextStorage;
    });

    onComplete?.();
  }

  function enterNumber(value: number) {
    if (selectedCell === null || completed) {
      setMessage("choose an empty square first");
      return;
    }

    const selected = cells[selectedCell];

    if (selected.fixed || selected.revealed) {
      setMessage("this square cannot be changed");
      return;
    }

    if (notesMode) {
      const hasNote = selected.notes.includes(value);
      setCells((current) =>
        current.map((cell, index) =>
          index === selectedCell
            ? {
                ...cell,
                notes: hasNote
                  ? cell.notes.filter((note) => note !== value)
                  : [...cell.notes, value].sort(
                      (first, second) => first - second,
                    ),
              }
            : cell,
        ),
      );
      setMessage(
        `note ${value} ${hasNote ? "removed" : "added"}`,
      );
      return;
    }

    if (value !== selected.solution) {
      setMistakes((current) => current + 1);
      setMessage("that number does not fit here yet");
      return;
    }

    const nextCells = cells.map((cell, index) => {
      if (index === selectedCell) {
        return {
          ...cell,
          value,
          notes: [],
        };
      }

      if (cellsAreRelated(index, selectedCell)) {
        return {
          ...cell,
          notes: cell.notes.filter((note) => note !== value),
        };
      }

      return cell;
    });

    setCells(nextCells);
    setMessage("that number fits beautifully");
    checkCompletion(nextCells);
  }

  function eraseCell() {
    if (selectedCell === null || completed) {
      return;
    }

    const selected = cells[selectedCell];

    if (selected.fixed || selected.revealed) {
      setMessage("this square cannot be erased");
      return;
    }

    setCells((current) =>
      current.map((cell, index) =>
        index === selectedCell
          ? {
              ...cell,
              value: EMPTY_VALUE,
              notes: [],
            }
          : cell,
      ),
    );
    setMessage("the square is clear");
  }

  function revealHint() {
    if (completed) {
      return;
    }

    const availableIndexes = cells
      .map((cell, index) =>
        !cell.fixed &&
        !cell.revealed &&
        cell.value !== cell.solution
          ? index
          : -1,
      )
      .filter((index) => index >= 0);

    if (availableIndexes.length === 0) {
      setMessage("there are no squares left to reveal");
      return;
    }

    const hintIndex =
      selectedCell !== null && availableIndexes.includes(selectedCell)
        ? selectedCell
        : availableIndexes[
            Math.floor(Math.random() * availableIndexes.length)
          ];
    const hintValue = cells[hintIndex].solution;
    const nextCells = cells.map((cell, index) => {
      if (index === hintIndex) {
        return {
          ...cell,
          value: cell.solution,
          notes: [],
          revealed: true,
        };
      }

      if (cellsAreRelated(index, hintIndex)) {
        return {
          ...cell,
          notes: cell.notes.filter((note) => note !== hintValue),
        };
      }

      return cell;
    });

    setCells(nextCells);
    setSelectedCell(hintIndex);
    setHintsUsed((current) => current + 1);
    setMessage(`a gentle hint placed ${hintValue}`);
    checkCompletion(nextCells);
  }

  function checkPuzzle() {
    const wrongCount = cells.filter(
      (cell) =>
        !cell.fixed &&
        cell.value !== EMPTY_VALUE &&
        cell.value !== cell.solution,
    ).length;
    const emptyCount = cells.filter(
      (cell) => cell.value === EMPTY_VALUE,
    ).length;

    if (wrongCount > 0) {
      setMessage(
        `${wrongCount} ${wrongCount === 1 ? "square needs" : "squares need"} another look`,
      );
      return;
    }

    if (emptyCount > 0) {
      setMessage(
        `everything filled so far fits — ${emptyCount} ${
          emptyCount === 1 ? "square remains" : "squares remain"
        }`,
      );
      return;
    }

    checkCompletion(cells);
  }

  return (
    <section className="sudoku-studio" aria-label="sudoku studio">
      <header className="sudoku-toolbar">
        <div className="sudoku-difficulty">
          <span>difficulty</span>
          <div>
            {DIFFICULTIES.map((item) => (
              <button
                key={item}
                type="button"
                className={
                  difficulty === item
                    ? "sudoku-difficulty-active"
                    : undefined
                }
                onClick={() => switchDifficulty(item)}
              >
                {DIFFICULTY_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="sudoku-stats" aria-label="puzzle statistics">
          <span>
            puzzle
            <strong>
              {puzzleIndex + 1} / {PUZZLES_PER_DIFFICULTY}
            </strong>
          </span>
          <span>
            complete
            <strong>
              {completedCount} / {PUZZLES_PER_DIFFICULTY}
            </strong>
          </span>
          <span>
            time
            <strong>{formatTime(elapsedSeconds)}</strong>
          </span>
          <span>
            progress
            <strong>{progress}%</strong>
          </span>
          <span>
            mistakes
            <strong>{mistakes}</strong>
          </span>
          <span>
            hints
            <strong>{hintsUsed}</strong>
          </span>
        </div>
      </header>

      <nav className="sudoku-puzzle-navigation" aria-label="puzzle navigation">
        <button type="button" onClick={previousPuzzle}>
          ← previous puzzle
        </button>
        <button
          type="button"
          onClick={() => setShowPuzzlePicker((current) => !current)}
          aria-expanded={showPuzzlePicker}
        >
          choose puzzle
        </button>
        <button type="button" onClick={newPuzzle}>
          new puzzle
        </button>
        <button type="button" onClick={nextPuzzle}>
          next puzzle →
        </button>
      </nav>

      {showPuzzlePicker && (
        <div className="sudoku-puzzle-picker" aria-label="choose a puzzle">
          {Array.from(
            { length: PUZZLES_PER_DIFFICULTY },
            (_, index) => {
              const id = `${difficulty}-${index + 1}`;
              const isComplete = storage.completedPuzzleIds.includes(id);
              const hasProgress = Boolean(storage.progressByPuzzle[id]);

              return (
                <button
                  key={id}
                  type="button"
                  className={createClassName([
                    index === puzzleIndex &&
                      "sudoku-puzzle-picker-current",
                    isComplete && "sudoku-puzzle-picker-complete",
                    hasProgress &&
                      !isComplete &&
                      "sudoku-puzzle-picker-started",
                  ])}
                  onClick={() => openPuzzle(index)}
                  aria-label={`puzzle ${index + 1}${
                    isComplete
                      ? ", complete"
                      : hasProgress
                        ? ", started"
                        : ""
                  }`}
                >
                  <span>{index + 1}</span>
                  <small>
                    {isComplete ? "✓" : hasProgress ? "•" : ""}
                  </small>
                </button>
              );
            },
          )}
        </div>
      )}

      <div className="sudoku-workspace">
        <div
          className="sudoku-grid"
          role="grid"
          aria-label={`${difficulty} sudoku puzzle ${puzzleIndex + 1}`}
        >
          {cells.map((cell, index) => {
            const row = getRow(index);
            const column = getColumn(index);
            const isSelected = selectedCell === index;
            const isRelated =
              selectedCell !== null &&
              cellsAreRelated(index, selectedCell);
            const isMatching =
              selectedValue !== EMPTY_VALUE &&
              cell.value === selectedValue;

            return (
              <button
                key={`${basePuzzle.id}-${index}`}
                type="button"
                role="gridcell"
                aria-label={`row ${row + 1}, column ${column + 1}${
                  cell.value ? `, ${cell.value}` : ", empty"
                }`}
                className={createClassName([
                  "sudoku-cell",
                  column === 2 || column === 5
                    ? "sudoku-cell-box-right"
                    : false,
                  row === 2 || row === 5
                    ? "sudoku-cell-box-bottom"
                    : false,
                  cell.fixed && "sudoku-cell-fixed",
                  cell.revealed && "sudoku-cell-revealed",
                  isRelated && "sudoku-cell-related",
                  isMatching && "sudoku-cell-matching",
                  isSelected && "sudoku-cell-selected",
                ])}
                onClick={() => selectCell(index)}
              >
                {cell.value !== EMPTY_VALUE ? (
                  <strong>{cell.value}</strong>
                ) : (
                  <span className="sudoku-notes" aria-hidden="true">
                    {Array.from({ length: 9 }, (_, noteIndex) => {
                      const note = noteIndex + 1;
                      return (
                        <small key={note}>
                          {cell.notes.includes(note) ? note : ""}
                        </small>
                      );
                    })}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <aside className="sudoku-controls">
          <div className="sudoku-number-pad" aria-label="number pad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => enterNumber(value)}
                disabled={completed}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="sudoku-action-row">
            <button
              type="button"
              className={
                notesMode ? "sudoku-action-active" : undefined
              }
              onClick={() => {
                setNotesMode((current) => !current);
                setMessage(
                  notesMode
                    ? "notes mode is off"
                    : "notes mode is on",
                );
              }}
              disabled={completed}
            >
              notes {notesMode ? "on" : "off"}
            </button>
            <button
              type="button"
              onClick={eraseCell}
              disabled={completed}
            >
              erase
            </button>
            <button
              type="button"
              onClick={checkPuzzle}
              disabled={completed}
            >
              check puzzle
            </button>
            <button
              type="button"
              onClick={revealHint}
              disabled={completed}
            >
              reveal hint
            </button>
            <button type="button" onClick={resetCurrentPuzzle}>
              reset puzzle
            </button>
            <button
              type="button"
              onClick={() => setSelectedCell(null)}
            >
              clear selection
            </button>
          </div>

          <div className="sudoku-message" aria-live="polite">
            <span aria-hidden="true">
              {completed ? "✓" : "✦"}
            </span>
            <p>{message}</p>
          </div>

          <div className="sudoku-progress-card">
            <div>
              <span>current puzzle</span>
              <strong>{progress}%</strong>
            </div>
            <div className="sudoku-progress-track" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="sudoku-record-card">
            <span>{difficulty} record</span>
            <div>
              <p>
                completed
                <strong>{difficultyStats.completed}</strong>
              </p>
              <p>
                best time
                <strong>
                  {difficultyStats.bestSeconds === null
                    ? "—"
                    : formatTime(difficultyStats.bestSeconds)}
                </strong>
              </p>
              <p>
                played
                <strong>{difficultyStats.played}</strong>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
