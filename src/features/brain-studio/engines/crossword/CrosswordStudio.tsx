import { useEffect, useMemo, useState } from "react";
import "./CrosswordStudio.css";

type Direction = "across" | "down";
type Difficulty = "gentle" | "easy" | "medium" | "hard" | "genius";

type WordEntry = { answer: string; clue: string };
type ThemePack = { id: string; title: string; subtitle: string; words: WordEntry[] };
type Clue = WordEntry & { id: string; number: number; row: number; column: number; direction: Direction };
type Cell = {
  row: number;
  column: number;
  answer: string;
  value: string;
  blocked: boolean;
  number?: number;
  acrossClueId?: string;
  downClueId?: string;
  revealed: boolean;
  checked: "idle" | "correct" | "wrong";
};
type Puzzle = {
  id: string;
  difficulty: Difficulty;
  title: string;
  subtitle: string;
  size: number;
  cells: Cell[];
  clues: Clue[];
};
type Progress = {
  values: string[];
  revealed: boolean[];
  selectedCell: number | null;
  selectedDirection: Direction;
  mistakes: number;
  hintsUsed: number;
  completed: boolean;
};
type SavedState = {
  difficulty: Difficulty;
  indexes: Partial<Record<Difficulty, number>>;
  progress: Record<string, Progress>;
  completedIds: string[];
};
type Props = { onComplete?: () => void };

const STORAGE_KEY = "pace-pulse-brain-studio-crossword-v2";
const DIFFICULTIES: Difficulty[] = ["gentle", "easy", "medium", "hard", "genius"];
const SETTINGS: Record<Difficulty, { size: number; words: number; puzzles: number }> = {
  gentle: { size: 9, words: 7, puzzles: 5 },
  easy: { size: 10, words: 9, puzzles: 6 },
  medium: { size: 11, words: 11, puzzles: 7 },
  hard: { size: 12, words: 13, puzzles: 8 },
  genius: { size: 13, words: 15, puzzles: 9 },
};

const THEMES: ThemePack[] = [
  {
    id: "woodland",
    title: "woodland hush",
    subtitle: "forest paths, rain and growing things",
    words: [
      ["MOSS", "Soft green growth on damp stone"], ["FERN", "Feathery plant of shaded places"],
      ["OWL", "Wide-eyed bird heard after dark"], ["RIVER", "Water travelling through the land"],
      ["BARK", "A tree's protective outer layer"], ["ACORN", "Small seed held in a tiny cup"],
      ["ROOT", "Plant part hidden beneath the soil"], ["GROVE", "A small gathering of trees"],
      ["CANOPY", "Leafy ceiling above a forest"], ["TRAIL", "A narrow path through nature"],
      ["CEDAR", "Evergreen tree with fragrant wood"], ["THICKET", "Dense growth of shrubs or trees"],
      ["MEADOW", "Open grassland filled with plants"], ["BIRCH", "Tree often known for pale bark"],
      ["DEW", "Morning drops resting on leaves"], ["WILLOW", "Tree with long hanging branches"],
      ["FOREST", "Large land covered in trees"], ["LANTERN", "Portable light for a night trail"],
      ["BRAMBLE", "Tangled thorny woodland shrub"], ["PINECONE", "Seed-bearing shape from a pine tree"],
    ].map(([answer, clue]) => ({ answer, clue })),
  },
  {
    id: "music",
    title: "midnight studio",
    subtitle: "sound, rhythm and song",
    words: [
      ["BEAT", "The steady pulse in music"], ["CHORD", "Several notes sounded together"],
      ["MELODY", "The tune you remember"], ["RHYTHM", "Pattern of sound and silence"],
      ["TEMPO", "The speed of a piece of music"], ["VERSE", "A song section with changing words"],
      ["CHORUS", "Song section built around the main hook"], ["BRIDGE", "Contrasting section connecting song parts"],
      ["BASS", "The lower range of musical sound"], ["DRUM", "Instrument played by striking"],
      ["PIANO", "Keyboard instrument with black and white keys"], ["GUITAR", "String instrument often played by strumming"],
      ["HARMONY", "Notes supporting the main tune"], ["LYRIC", "A line of words in a song"],
      ["REVERB", "Sound that lingers like an echo"], ["MIXING", "Balancing recorded musical elements"],
      ["VOCAL", "A sung part of a recording"], ["STUDIO", "Room made for recording sound"],
      ["OCTAVE", "Interval between matching note names"], ["CADENCE", "A musical phrase coming to rest"],
    ].map(([answer, clue]) => ({ answer, clue })),
  },
  {
    id: "coast",
    title: "moonlit tide",
    subtitle: "shorelines, salt air and open water",
    words: [
      ["TIDE", "The sea's regular rise and fall"], ["SHELL", "Hard covering found along a shore"],
      ["WAVE", "Moving ridge of water"], ["CORAL", "Sea life that builds colourful reefs"],
      ["DUNE", "Hill of sand shaped by wind"], ["ANCHOR", "Heavy object that holds a boat in place"],
      ["HARBOR", "Sheltered water where boats rest"], ["FOAM", "White bubbles at a breaking wave"],
      ["DRIFTWOOD", "Weathered timber carried by water"], ["SEAGLASS", "Smooth coloured glass shaped by the sea"],
      ["CURRENT", "Flowing movement within water"], ["REEF", "Rock or coral ridge beneath the sea"],
      ["BEACON", "Guiding light seen from far away"], ["MARINA", "Harbour built for small boats"],
      ["HORIZON", "Line where sea and sky appear to meet"], ["SEABIRD", "Bird adapted to life near the ocean"],
      ["LAGOON", "Shallow water separated from the sea"], ["SAILOR", "Person who works or travels on a boat"],
      ["BREEZE", "A light wind from the water"], ["COASTLINE", "The edge where land meets the sea"],
    ].map(([answer, clue]) => ({ answer, clue })),
  },
  {
    id: "sky",
    title: "night sky",
    subtitle: "moonlight, stars and distant worlds",
    words: [
      ["MOON", "Earth's natural satellite"], ["STAR", "A distant glowing sun"],
      ["COMET", "Icy traveller with a bright tail"], ["ORBIT", "Curved path around another body"],
      ["SOLAR", "Relating to the sun"], ["ECLIPSE", "One space body blocking another"],
      ["GALAXY", "Huge family of stars and dust"], ["NEBULA", "Cloud of gas and dust in space"],
      ["PLANET", "World travelling around a star"], ["METEOR", "Streak of light from space debris"],
      ["COSMOS", "The universe seen as one vast whole"], ["CRATER", "Bowl-shaped hollow on a moon or planet"],
      ["SATURN", "Planet famous for its rings"], ["VENUS", "Bright planet sometimes seen at dusk"],
      ["AURORA", "Natural coloured lights near the poles"], ["PHASE", "One changing shape of the visible moon"],
      ["ROCKET", "Vehicle launched into space"], ["ZENITH", "Point directly overhead"],
      ["STELLAR", "Relating to stars"], ["TELESCOPE", "Instrument for viewing distant objects"],
    ].map(([answer, clue]) => ({ answer, clue })),
  },
  {
    id: "everyday",
    title: "little things",
    subtitle: "warm rooms, routines and familiar moments",
    words: [
      ["MUG", "Handled cup for a warm drink"], ["BOOK", "Pages gathered for reading"],
      ["SOCK", "Soft covering worn on a foot"], ["CLOCK", "Object that shows the time"],
      ["WINDOW", "Opening that lets light into a room"], ["PILLOW", "Soft support for your head"],
      ["KETTLE", "Container used to boil water"], ["BASKET", "Woven container for carrying things"],
      ["CANDLE", "Wax light with a wick"], ["BLANKET", "Warm covering used on a bed or sofa"],
      ["JOURNAL", "Notebook for thoughts and memories"], ["PANTRY", "Small space used for storing food"],
      ["PORCH", "Covered entrance outside a home"], ["BUTTON", "Small fastener on clothing"],
      ["POCKET", "Small sewn space for carrying items"], ["MIRROR", "Surface that reflects an image"],
      ["CURTAIN", "Fabric covering a window"], ["TEAPOT", "Pot used for brewing and serving tea"],
      ["CUSHION", "Soft padded support for a chair"], ["DOORBELL", "Signal pressed by a visitor"],
    ].map(([answer, clue]) => ({ answer, clue })),
  },
];

function randomFrom(seedText: string) {
  let seed = 2166136261;
  for (const char of seedText) { seed ^= char.charCodeAt(0); seed = Math.imul(seed, 16777619); }
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function normalise(answer: string) { return answer.toUpperCase().replace(/[^A-Z]/g, ""); }

function canPlace(grid: string[][], answer: string, row: number, column: number, direction: Direction) {
  const size = grid.length;
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;
  const endRow = row + dr * (answer.length - 1);
  const endColumn = column + dc * (answer.length - 1);
  if (row < 0 || column < 0 || endRow >= size || endColumn >= size) return { valid: false, crossings: 0 };
  const beforeRow = row - dr, beforeColumn = column - dc;
  const afterRow = endRow + dr, afterColumn = endColumn + dc;
  if (beforeRow >= 0 && beforeColumn >= 0 && beforeRow < size && beforeColumn < size && grid[beforeRow][beforeColumn]) return { valid: false, crossings: 0 };
  if (afterRow >= 0 && afterColumn >= 0 && afterRow < size && afterColumn < size && grid[afterRow][afterColumn]) return { valid: false, crossings: 0 };
  let crossings = 0;
  for (let offset = 0; offset < answer.length; offset += 1) {
    const r = row + dr * offset, c = column + dc * offset;
    const existing = grid[r][c];
    if (existing && existing !== answer[offset]) return { valid: false, crossings: 0 };
    if (existing === answer[offset]) { crossings += 1; continue; }
    if (direction === "across") {
      if ((r > 0 && grid[r - 1][c]) || (r < size - 1 && grid[r + 1][c])) return { valid: false, crossings: 0 };
    } else if ((c > 0 && grid[r][c - 1]) || (c < size - 1 && grid[r][c + 1])) return { valid: false, crossings: 0 };
  }
  return { valid: true, crossings };
}

function writeWord(grid: string[][], answer: string, row: number, column: number, direction: Direction) {
  answer.split("").forEach((letter, offset) => {
    grid[row + (direction === "down" ? offset : 0)][column + (direction === "across" ? offset : 0)] = letter;
  });
}

function generatePuzzle(difficulty: Difficulty, puzzleIndex: number): Puzzle {
  const settings = SETTINGS[difficulty];
  const theme = THEMES[(puzzleIndex + DIFFICULTIES.indexOf(difficulty)) % THEMES.length];
  const random = randomFrom(`${difficulty}-${puzzleIndex}-${theme.id}`);
  const grid = Array.from({ length: settings.size }, () => Array(settings.size).fill("")) as string[][];
  const candidates = shuffle(theme.words.map((word) => ({ ...word, answer: normalise(word.answer) })).filter((word) => word.answer.length >= 3 && word.answer.length < settings.size), random)
    .sort((a, b) => b.answer.length - a.answer.length);
  const placed: Array<WordEntry & { row: number; column: number; direction: Direction }> = [];
  const first = candidates.shift();
  if (first) {
    const direction: Direction = puzzleIndex % 2 === 0 ? "across" : "down";
    const row = direction === "across" ? Math.floor(settings.size / 2) : Math.floor((settings.size - first.answer.length) / 2);
    const column = direction === "down" ? Math.floor(settings.size / 2) : Math.floor((settings.size - first.answer.length) / 2);
    writeWord(grid, first.answer, row, column, direction);
    placed.push({ ...first, row, column, direction });
  }
  for (const entry of candidates) {
    if (placed.length >= settings.words) break;
    const options: Array<{ row: number; column: number; direction: Direction; crossings: number; distance: number }> = [];
    for (const oldWord of placed) {
      for (let newOffset = 0; newOffset < entry.answer.length; newOffset += 1) {
        for (let oldOffset = 0; oldOffset < oldWord.answer.length; oldOffset += 1) {
          if (entry.answer[newOffset] !== oldWord.answer[oldOffset]) continue;
          const direction: Direction = oldWord.direction === "across" ? "down" : "across";
          const crossingRow = oldWord.row + (oldWord.direction === "down" ? oldOffset : 0);
          const crossingColumn = oldWord.column + (oldWord.direction === "across" ? oldOffset : 0);
          const row = direction === "down" ? crossingRow - newOffset : crossingRow;
          const column = direction === "across" ? crossingColumn - newOffset : crossingColumn;
          const check = canPlace(grid, entry.answer, row, column, direction);
          if (!check.valid || check.crossings === 0) continue;
          const centreRow = row + (direction === "down" ? (entry.answer.length - 1) / 2 : 0);
          const centreColumn = column + (direction === "across" ? (entry.answer.length - 1) / 2 : 0);
          options.push({ row, column, direction, crossings: check.crossings, distance: Math.abs(centreRow - settings.size / 2) + Math.abs(centreColumn - settings.size / 2) });
        }
      }
    }
    if (!options.length) continue;
    options.sort((a, b) => b.crossings - a.crossings || a.distance - b.distance || random() - 0.5);
    const best = options[0];
    writeWord(grid, entry.answer, best.row, best.column, best.direction);
    placed.push({ ...entry, row: best.row, column: best.column, direction: best.direction });
  }
  const starts = Array.from(new Map(placed.map((word) => [`${word.row}-${word.column}`, { row: word.row, column: word.column }])).values())
    .sort((a, b) => a.row - b.row || a.column - b.column);
  const numbers = new Map(starts.map((start, index) => [`${start.row}-${start.column}`, index + 1]));
  const clues: Clue[] = placed.map((word, index) => ({ ...word, id: `${puzzleIndex}-${index}-${word.direction}`, number: numbers.get(`${word.row}-${word.column}`) ?? 0 }));
  const cells: Cell[] = Array.from({ length: settings.size * settings.size }, (_, index) => {
    const row = Math.floor(index / settings.size), column = index % settings.size, answer = grid[row][column];
    return { row, column, answer, value: "", blocked: answer === "", revealed: false, checked: "idle" };
  });
  clues.forEach((clue) => {
    cells[clue.row * settings.size + clue.column].number = clue.number;
    clue.answer.split("").forEach((_, offset) => {
      const row = clue.row + (clue.direction === "down" ? offset : 0);
      const column = clue.column + (clue.direction === "across" ? offset : 0);
      const cell = cells[row * settings.size + column];
      if (clue.direction === "across") cell.acrossClueId = clue.id;
      else cell.downClueId = clue.id;
    });
  });
  return { id: `${difficulty}-${puzzleIndex}-${theme.id}`, difficulty, title: theme.title, subtitle: theme.subtitle, size: settings.size, cells, clues };
}

function createLibrary() {
  return DIFFICULTIES.reduce((library, difficulty) => {
    library[difficulty] = Array.from({ length: SETTINGS[difficulty].puzzles }, (_, index) => generatePuzzle(difficulty, index));
    return library;
  }, {} as Record<Difficulty, Puzzle[]>);
}

function blankProgress(puzzle: Puzzle): Progress {
  return { values: puzzle.cells.map(() => ""), revealed: puzzle.cells.map(() => false), selectedCell: null, selectedDirection: "across", mistakes: 0, hintsUsed: 0, completed: false };
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    return {
      difficulty: DIFFICULTIES.includes(parsed.difficulty as Difficulty) ? parsed.difficulty as Difficulty : "easy",
      indexes: parsed.indexes ?? {},
      progress: parsed.progress ?? {},
      completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds.filter((id): id is string => typeof id === "string") : [],
    };
  } catch { return null; }
}

function hydrate(puzzle: Puzzle, progress: Progress): Cell[] {
  return puzzle.cells.map((cell, index) => ({ ...cell, value: typeof progress.values[index] === "string" ? progress.values[index].slice(0, 1).toUpperCase() : "", revealed: Boolean(progress.revealed[index]), checked: "idle" }));
}

export default function CrosswordStudio({ onComplete }: Props) {
  const library = useMemo(() => createLibrary(), []);
  const saved = useMemo(() => loadState(), []);
  const [difficulty, setDifficulty] = useState<Difficulty>(saved?.difficulty ?? "easy");
  const [indexes, setIndexes] = useState<Partial<Record<Difficulty, number>>>(saved?.indexes ?? {});
  const [progressMap, setProgressMap] = useState<Record<string, Progress>>(saved?.progress ?? {});
  const [completedIds, setCompletedIds] = useState<string[]>(saved?.completedIds ?? []);
  const [browserOpen, setBrowserOpen] = useState(false);
  const puzzles = library[difficulty];
  const puzzleIndex = Math.min(Math.max(indexes[difficulty] ?? 0, 0), puzzles.length - 1);
  const puzzle = puzzles[puzzleIndex];
  const initial = progressMap[puzzle.id] ?? blankProgress(puzzle);
  const [cells, setCells] = useState<Cell[]>(() => hydrate(puzzle, initial));
  const [selectedCell, setSelectedCell] = useState<number | null>(initial.selectedCell);
  const [selectedDirection, setSelectedDirection] = useState<Direction>(initial.selectedDirection);
  const [mistakes, setMistakes] = useState(initial.mistakes);
  const [hintsUsed, setHintsUsed] = useState(initial.hintsUsed);
  const [completed, setCompleted] = useState(initial.completed);
  const [message, setMessage] = useState(initial.completed ? "this crossword is already complete" : "choose a clue or square to begin");

  useEffect(() => {
    const next = progressMap[puzzle.id] ?? blankProgress(puzzle);
    setCells(hydrate(puzzle, next));
    setSelectedCell(next.selectedCell);
    setSelectedDirection(next.selectedDirection);
    setMistakes(next.mistakes);
    setHintsUsed(next.hintsUsed);
    setCompleted(next.completed);
    setMessage(next.completed ? "this crossword is already complete" : "choose a clue or square to begin");
  }, [puzzle.id]);

  useEffect(() => {
    const current: Progress = { values: cells.map((cell) => cell.value), revealed: cells.map((cell) => cell.revealed), selectedCell, selectedDirection, mistakes, hintsUsed, completed };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ difficulty, indexes, progress: { ...progressMap, [puzzle.id]: current }, completedIds } satisfies SavedState));
  }, [cells, completed, completedIds, difficulty, hintsUsed, indexes, mistakes, puzzle.id, selectedCell, selectedDirection]);

  const getClueCells = (clue: Clue) => clue.answer.split("").map((_, offset) => (clue.row + (clue.direction === "down" ? offset : 0)) * puzzle.size + clue.column + (clue.direction === "across" ? offset : 0));
  const activeClue = useMemo(() => {
    if (selectedCell === null) return null;
    const cell = cells[selectedCell];
    const preferred = selectedDirection === "across" ? cell.acrossClueId : cell.downClueId;
    const fallback = selectedDirection === "across" ? cell.downClueId : cell.acrossClueId;
    return puzzle.clues.find((clue) => clue.id === (preferred ?? fallback)) ?? null;
  }, [cells, puzzle.clues, selectedCell, selectedDirection]);
  const playable = cells.filter((cell) => !cell.blocked);
  const correct = playable.filter((cell) => cell.value === cell.answer).length;
  const progress = playable.length ? Math.round((correct / playable.length) * 100) : 0;
  const difficultyCompleted = completedIds.filter((id) => id.startsWith(`${difficulty}-`)).length;

  function saveCurrent(nextCells = cells, overrides: Partial<Progress> = {}) {
    setProgressMap((current) => ({ ...current, [puzzle.id]: { values: nextCells.map((cell) => cell.value), revealed: nextCells.map((cell) => cell.revealed), selectedCell, selectedDirection, mistakes, hintsUsed, completed, ...overrides } }));
  }
  function openPuzzle(nextDifficulty: Difficulty, nextIndex: number) {
    saveCurrent();
    setDifficulty(nextDifficulty);
    setIndexes((current) => ({ ...current, [nextDifficulty]: Math.min(Math.max(nextIndex, 0), library[nextDifficulty].length - 1) }));
    setBrowserOpen(false);
  }
  function movePuzzle(change: number) { openPuzzle(difficulty, (puzzleIndex + change + puzzles.length) % puzzles.length); }
  function restartPuzzle() {
    setProgressMap((current) => { const next = { ...current }; delete next[puzzle.id]; return next; });
    const blank = blankProgress(puzzle);
    setCells(hydrate(puzzle, blank)); setSelectedCell(null); setSelectedDirection("across"); setMistakes(0); setHintsUsed(0); setCompleted(false); setMessage("the puzzle has been restarted");
  }
  function chooseClue(clue: Clue) {
    const clueCells = getClueCells(clue);
    setSelectedCell(clueCells.find((index) => !cells[index].value) ?? clueCells[0]);
    setSelectedDirection(clue.direction);
    setMessage(clue.clue);
  }
  function chooseCell(index: number) {
    if (cells[index].blocked || completed) return;
    const cell = cells[index];
    if (selectedCell === index && cell.acrossClueId && cell.downClueId) { setSelectedDirection((current) => current === "across" ? "down" : "across"); return; }
    setSelectedCell(index);
    if (selectedDirection === "across" && !cell.acrossClueId && cell.downClueId) setSelectedDirection("down");
    if (selectedDirection === "down" && !cell.downClueId && cell.acrossClueId) setSelectedDirection("across");
  }
  function finishIfComplete(nextCells: Cell[]) {
    if (!nextCells.filter((cell) => !cell.blocked).every((cell) => cell.value === cell.answer)) return;
    setCompleted(true); setMessage("beautifully solved — every word is complete");
    setCompletedIds((current) => current.includes(puzzle.id) ? current : [...current, puzzle.id]);
    saveCurrent(nextCells, { completed: true }); onComplete?.();
  }
  function moveWithinClue(index: number, step: number) {
    const cell = cells[index];
    const clueId = selectedDirection === "across" ? cell.acrossClueId : cell.downClueId;
    const clue = puzzle.clues.find((item) => item.id === clueId);
    if (!clue) return;
    const clueCells = getClueCells(clue), position = clueCells.indexOf(index), next = clueCells[position + step];
    if (next !== undefined) setSelectedCell(next);
  }
  function enterLetter(letter: string) {
    if (selectedCell === null || completed) { setMessage("choose a square before adding a letter"); return; }
    const selected = cells[selectedCell];
    if (selected.blocked || selected.revealed) return;
    const upper = letter.slice(0, 1).toUpperCase();
    if (!/^[A-Z]$/.test(upper)) return;
    const next = cells.map((cell, index) => index === selectedCell ? { ...cell, value: upper, checked: "idle" as const } : { ...cell, checked: "idle" as const });
    setCells(next); setMessage("letter added"); moveWithinClue(selectedCell, 1); finishIfComplete(next);
  }
  function eraseCell() {
    if (selectedCell === null || completed) return;
    if (cells[selectedCell].revealed) { setMessage("revealed letters stay in place"); return; }
    setCells((current) => current.map((cell, index) => index === selectedCell ? { ...cell, value: "", checked: "idle" } : cell));
    moveWithinClue(selectedCell, -1);
  }
  function checkPuzzle() {
    let wrong = 0;
    const next = cells.map((cell) => {
      if (cell.blocked || !cell.value) return { ...cell, checked: "idle" as const };
      const ok = cell.value === cell.answer;
      if (!ok) wrong += 1;
      return { ...cell, checked: ok ? "correct" as const : "wrong" as const };
    });
    setCells(next);
    if (wrong) { setMistakes((current) => current + wrong); setMessage(`${wrong} ${wrong === 1 ? "letter needs" : "letters need"} another look`); }
    else setMessage(progress === 100 ? "every letter is correct" : "everything entered so far is correct");
    finishIfComplete(next);
  }
  function revealLetter() {
    if (selectedCell === null || completed) { setMessage("choose a square for a hint"); return; }
    const next = cells.map((cell, index) => index === selectedCell ? { ...cell, value: cell.answer, revealed: true, checked: "correct" as const } : cell);
    setCells(next); setHintsUsed((current) => current + 1); setMessage("one letter has been revealed"); finishIfComplete(next);
  }
  function revealWord() {
    if (!activeClue || completed) { setMessage("choose a clue for a word hint"); return; }
    const clueCells = getClueCells(activeClue);
    const next = cells.map((cell, index) => clueCells.includes(index) ? { ...cell, value: cell.answer, revealed: true, checked: "correct" as const } : cell);
    setCells(next); setHintsUsed((current) => current + 1); setMessage(`${activeClue.number} ${activeClue.direction} has been revealed`); finishIfComplete(next);
  }
  function handleKeyDown(event: React.KeyboardEvent) {
    if (/^[a-zA-Z]$/.test(event.key)) { event.preventDefault(); enterLetter(event.key); return; }
    if (event.key === "Backspace" || event.key === "Delete") { event.preventDefault(); eraseCell(); return; }
    if (selectedCell === null) return;
    const selected = cells[selectedCell]; let row = selected.row, column = selected.column;
    if (event.key === "ArrowUp") { row -= 1; setSelectedDirection("down"); }
    else if (event.key === "ArrowDown") { row += 1; setSelectedDirection("down"); }
    else if (event.key === "ArrowLeft") { column -= 1; setSelectedDirection("across"); }
    else if (event.key === "ArrowRight") { column += 1; setSelectedDirection("across"); }
    else return;
    event.preventDefault();
    if (row < 0 || row >= puzzle.size || column < 0 || column >= puzzle.size) return;
    const next = row * puzzle.size + column;
    if (!cells[next].blocked) setSelectedCell(next);
  }

  return (
    <section className="crossword-studio" tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="crossword-toolbar">
        <div className="crossword-difficulty">
          <span>difficulty</span>
          <div>{DIFFICULTIES.map((item) => <button key={item} type="button" className={item === difficulty ? "crossword-difficulty-active" : ""} onClick={() => openPuzzle(item, indexes[item] ?? 0)}>{item}</button>)}</div>
        </div>
        <div className="crossword-toolbar-actions">
          <button type="button" onClick={() => movePuzzle(-1)}>← previous</button>
          <button type="button" onClick={() => setBrowserOpen((current) => !current)}>puzzle {puzzleIndex + 1} of {puzzles.length}</button>
          <button type="button" onClick={() => movePuzzle(1)}>next →</button>
          <button type="button" onClick={() => movePuzzle(1)}>new puzzle</button>
        </div>
      </div>

      {browserOpen && <div className="crossword-browser">
        <div><strong>{difficulty} puzzles</strong><span>{difficultyCompleted} of {puzzles.length} complete</span></div>
        <div className="crossword-browser-grid">{puzzles.map((item, index) => {
          const done = completedIds.includes(item.id);
          return <button key={item.id} type="button" className={[index === puzzleIndex ? "crossword-browser-active" : "", done ? "crossword-browser-complete" : ""].filter(Boolean).join(" ")} onClick={() => openPuzzle(difficulty, index)}><span>puzzle {index + 1}</span><small>{item.title}</small><b>{done ? "✓" : ""}</b></button>;
        })}</div>
      </div>}

      <div className="crossword-stats">
        <span><strong>{progress}%</strong>complete</span>
        <span><strong>{mistakes}</strong>mistakes</span>
        <span><strong>{hintsUsed}</strong>hints</span>
        <span><strong>{difficultyCompleted}/{puzzles.length}</strong>solved</span>
      </div>

      <div className="crossword-workspace">
        <div className="crossword-board-panel">
          <div className="crossword-title"><div><h3>{puzzle.title}</h3><p>{puzzle.subtitle}</p></div><span>{selectedDirection}</span></div>
          <div className="crossword-grid" style={{ gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${puzzle.size}, minmax(0, 1fr))` }} role="grid" aria-label={`${puzzle.title} crossword`}>
            {cells.map((cell, index) => {
              if (cell.blocked) return <div key={index} className="crossword-cell crossword-cell-blocked" aria-hidden="true" />;
              const classes = ["crossword-cell", selectedCell === index ? "crossword-cell-selected" : "", activeClue && getClueCells(activeClue).includes(index) ? "crossword-cell-active-word" : "", cell.revealed ? "crossword-cell-revealed" : "", cell.checked === "correct" ? "crossword-cell-correct" : "", cell.checked === "wrong" ? "crossword-cell-wrong" : ""].filter(Boolean).join(" ");
              return <button key={index} type="button" role="gridcell" className={classes} onClick={() => chooseCell(index)} aria-label={`row ${cell.row + 1}, column ${cell.column + 1}${cell.value ? `, letter ${cell.value}` : ", empty"}`}>{cell.number && <small>{cell.number}</small>}<strong>{cell.value}</strong></button>;
            })}
          </div>
          <div className="crossword-letter-pad">{"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => <button key={letter} type="button" onClick={() => enterLetter(letter)} disabled={completed}>{letter}</button>)}</div>
        </div>

        <aside className="crossword-clue-panel">
          <div className="crossword-current-clue"><span>current clue</span><strong>{activeClue ? `${activeClue.number} ${activeClue.direction}` : "choose a clue"}</strong><p>{activeClue?.clue ?? "Across and Down clues will appear here."}</p></div>
          <div className="crossword-clue-columns">{(["across", "down"] as Direction[]).map((direction) => <div key={direction}><h4>{direction}</h4><div className="crossword-clue-list">{puzzle.clues.filter((clue) => clue.direction === direction).sort((a, b) => a.number - b.number).map((clue) => {
            const active = activeClue?.id === clue.id;
            const done = getClueCells(clue).every((index) => cells[index].value === cells[index].answer);
            return <button key={clue.id} type="button" className={[active ? "crossword-clue-active" : "", done ? "crossword-clue-complete" : ""].filter(Boolean).join(" ")} onClick={() => chooseClue(clue)}><b>{clue.number}</b><span>{clue.clue}</span>{done && <small>✓</small>}</button>;
          })}</div></div>)}</div>
          <div className="crossword-actions">
            <button type="button" onClick={eraseCell} disabled={completed}>erase</button>
            <button type="button" onClick={checkPuzzle} disabled={completed}>check</button>
            <button type="button" onClick={revealLetter} disabled={completed}>reveal letter</button>
            <button type="button" onClick={revealWord} disabled={completed}>reveal word</button>
            <button type="button" onClick={restartPuzzle}>restart</button>
          </div>
          <div className={completed ? "crossword-message crossword-message-complete" : "crossword-message"} aria-live="polite"><span>{completed ? "✓" : "✎"}</span><p>{message}</p></div>
          <small className="crossword-save-note">every puzzle saves automatically on this device</small>
        </aside>
      </div>
    </section>
  );
}
