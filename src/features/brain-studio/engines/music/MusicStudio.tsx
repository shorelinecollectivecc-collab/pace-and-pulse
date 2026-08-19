import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./MusicStudio.css";

type MusicStudioProps = {
  onComplete?: () => void;
};

type Difficulty =
  | "gentle"
  | "easy"
  | "medium"
  | "hard"
  | "genius";

type TaskId =
  | "notes"
  | "rhythm"
  | "piano"
  | "symbols"
  | "staff"
  | "instruments"
  | "chords"
  | "clues";

type Puzzle = {
  id: string;
  title: string;
  instruction: string;
  question: string;
  visual?: string;
  options: string[];
  answer: string;
  explanation: string;
};

type SavedProgress = {
  difficulty: Difficulty;
  taskId: TaskId;
  indexes: Record<string, number>;
  answers: Record<string, string>;
  completed: string[];
  mistakes: number;
  hints: number;
};

type PianoKey = {
  note: string;
  label: string;
  isBlack: boolean;
  whiteIndex: number;
};

const STORAGE_KEY =
  "pace-pulse-music-studio-v4";

const DIFFICULTIES: Difficulty[] = [
  "gentle",
  "easy",
  "medium",
  "hard",
  "genius",
];

const TASKS: Array<{
  id: TaskId;
  label: string;
  icon: string;
}> = [
  { id: "notes", label: "notes", icon: "♪" },
  { id: "rhythm", label: "rhythm", icon: "♩" },
  { id: "piano", label: "piano", icon: "▥" },
  { id: "symbols", label: "symbols", icon: "𝄐" },
  { id: "staff", label: "staff", icon: "𝄞" },
  { id: "instruments", label: "instruments", icon: "♬" },
  { id: "chords", label: "chords", icon: "△" },
  { id: "clues", label: "clues", icon: "Aa" },
];

const NATURAL_NOTES = [
  "C",
  "D",
  "E",
  "F",
  "G",
  "A",
  "B",
];

const CHROMATIC_NOTES = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
];

const SYMBOLS = [
  ["𝄐", "fermata"],
  ["♯", "sharp"],
  ["♭", "flat"],
  ["♮", "natural"],
  ["𝄆 𝄇", "repeat"],
  [">", "accent"],
  [".", "staccato"],
  ["𝄞", "treble clef"],
] as const;

const INSTRUMENTS = [
  ["violin", "strings"],
  ["cello", "strings"],
  ["flute", "woodwind"],
  ["clarinet", "woodwind"],
  ["trumpet", "brass"],
  ["trombone", "brass"],
  ["timpani", "percussion"],
  ["xylophone", "percussion"],
] as const;

const CHORDS = [
  ["C major", "C · E · G"],
  ["D minor", "D · F · A"],
  ["E minor", "E · G · B"],
  ["F major", "F · A · C"],
  ["G major", "G · B · D"],
  ["A minor", "A · C · E"],
  ["B diminished", "B · D · F"],
] as const;

const CLUES = [
  ["the speed of music", "tempo"],
  ["the main tune", "melody"],
  ["several notes sounded together", "chord"],
  ["a sign that raises a note", "sharp"],
  ["the distance between pitches", "interval"],
  ["gradually becoming louder", "crescendo"],
  ["the home note of a key", "tonic"],
  ["a pattern of strong and weak beats", "meter"],
] as const;

const RHYTHMS = [
  ["𝅝", "4 beats"],
  ["𝅗𝅥", "2 beats"],
  ["♩", "1 beat"],
  ["♪", "half a beat"],
] as const;

const SAMPLE_BASE =
  "https://tonejs.github.io/audio/salamander/";

const SAMPLE_NOTES = [
  "C3",
  "D♯3",
  "F♯3",
  "A3",
  "C4",
  "D♯4",
  "F♯4",
  "A4",
  "C5",
  "D♯5",
  "F♯5",
  "A5",
];

const SAMPLE_FILES: Record<string, string> = {
  C3: "C3.mp3",
  "D♯3": "Ds3.mp3",
  "F♯3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D♯4": "Ds4.mp3",
  "F♯4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D♯5": "Ds5.mp3",
  "F♯5": "Fs5.mp3",
  A5: "A5.mp3",
};

function seedRandom(seedText: string) {
  let seed = 2166136261;

  for (let i = 0; i < seedText.length; i += 1) {
    seed ^= seedText.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(
      value ^ (value >>> 15),
      value | 1,
    );
    value ^=
      value +
      Math.imul(
        value ^ (value >>> 7),
        value | 61,
      );

    return (
      ((value ^ (value >>> 14)) >>> 0) /
      4294967296
    );
  };
}

function shuffle<T>(
  items: T[],
  random: () => number,
) {
  const copy = [...items];

  for (
    let index = copy.length - 1;
    index > 0;
    index -= 1
  ) {
    const nextIndex = Math.floor(
      random() * (index + 1),
    );

    [copy[index], copy[nextIndex]] = [
      copy[nextIndex],
      copy[index],
    ];
  }

  return copy;
}

function choices(
  answer: string,
  pool: string[],
  random: () => number,
) {
  return shuffle(
    [
      answer,
      ...shuffle(
        pool.filter(
          (item) => item !== answer,
        ),
        random,
      ).slice(0, 3),
    ],
    random,
  );
}

function difficultyIndex(
  difficulty: Difficulty,
) {
  return DIFFICULTIES.indexOf(
    difficulty,
  );
}

function createPuzzle(
  taskId: TaskId,
  difficulty: Difficulty,
  index: number,
): Puzzle {
  const random = seedRandom(
    `${taskId}-${difficulty}-${index}`,
  );

  const depth =
    difficultyIndex(difficulty);

  if (taskId === "piano") {
    const octave =
      depth <= 1
        ? 4
        : depth === 2
          ? 3 + (index % 2)
          : 3 + (index % 3);

    const notePool =
      depth <= 1
        ? NATURAL_NOTES
        : CHROMATIC_NOTES;

    const pitch =
      notePool[
        (index * 2 + depth) %
        notePool.length
      ];

    const answer =
      `${pitch}${octave}`;

    return {
      id: `piano-${difficulty}-${index}`,
      title: "find the key",
      instruction:
        "use the full piano to choose the written key",
      question:
        depth <= 1
          ? `play ${answer}`
          : depth === 2
            ? `find ${answer} on the keyboard`
            : `choose the exact written pitch ${answer}`,
      visual: "press the matching piano key",
      options: [],
      answer,
      explanation: `${answer} is the correct piano key.`,
    };
  }

  if (taskId === "notes") {
    const note =
      NATURAL_NOTES[
        (index + depth) %
        NATURAL_NOTES.length
      ];

    const answer =
      depth <= 1
        ? note
        : NATURAL_NOTES[
            (NATURAL_NOTES.indexOf(note) +
              Math.min(depth, 3)) %
              NATURAL_NOTES.length
          ];

    return {
      id: `notes-${difficulty}-${index}`,
      title:
        depth <= 1
          ? "note name"
          : "note order",
      instruction:
        depth <= 1
          ? "choose the matching written note"
          : "follow the written pitch order",
      question:
        depth <= 1
          ? "which note is shown?"
          : `${Math.min(
              depth,
              3,
            )} note steps above ${note}`,
      visual:
        depth <= 1
          ? note
          : `${note}  →  ?`,
      options: choices(
        answer,
        NATURAL_NOTES,
        random,
      ),
      answer,
      explanation: `${answer} is correct.`,
    };
  }

  if (taskId === "rhythm") {
    const [
      symbol,
      answer,
    ] =
      RHYTHMS[
        (index + depth) %
        RHYTHMS.length
      ];

    return {
      id: `rhythm-${difficulty}-${index}`,
      title: "rhythm value",
      instruction:
        "match the written note to its beat value",
      question:
        "how many beats does this note receive?",
      visual: symbol,
      options: choices(
        answer,
        RHYTHMS.map(
          ([, value]) => value,
        ),
        random,
      ),
      answer,
      explanation: `${symbol} receives ${answer}.`,
    };
  }

  if (taskId === "symbols") {
    const [
      symbol,
      answer,
    ] =
      SYMBOLS[
        (index + depth) %
        SYMBOLS.length
      ];

    return {
      id: `symbols-${difficulty}-${index}`,
      title: "symbol meaning",
      instruction:
        "match the written symbol to its meaning",
      question:
        "what does this symbol mean?",
      visual: symbol,
      options: choices(
        answer,
        SYMBOLS.map(
          ([, value]) => value,
        ),
        random,
      ),
      answer,
      explanation: `${symbol} means ${answer}.`,
    };
  }

  if (taskId === "staff") {
    const start =
      NATURAL_NOTES[
        (index + depth) %
        NATURAL_NOTES.length
      ];

    const scale = Array.from(
      { length: depth >= 3 ? 7 : 5 },
      (_, offset) =>
        NATURAL_NOTES[
          (NATURAL_NOTES.indexOf(
            start,
          ) +
            offset) %
            NATURAL_NOTES.length
        ],
    );

    const missingIndex =
      1 +
      (index %
        Math.max(
          1,
          scale.length - 2,
        ));

    const answer =
      scale[missingIndex];

    return {
      id: `staff-${difficulty}-${index}`,
      title: "melody path",
      instruction:
        "complete the written pitch pattern",
      question:
        "which note is missing?",
      visual: scale
        .map(
          (note, position) =>
            position === missingIndex
              ? "?"
              : note,
        )
        .join("  –  "),
      options: choices(
        answer,
        NATURAL_NOTES,
        random,
      ),
      answer,
      explanation: `${answer} completes the pattern.`,
    };
  }

  if (taskId === "instruments") {
    const [
      instrument,
      family,
    ] =
      INSTRUMENTS[
        (index + depth) %
        INSTRUMENTS.length
      ];

    return {
      id: `instruments-${difficulty}-${index}`,
      title: "instrument family",
      instruction:
        "match the instrument to its family",
      question: `which family contains the ${instrument}?`,
      visual: instrument,
      options: choices(
        family,
        [
          "strings",
          "woodwind",
          "brass",
          "percussion",
        ],
        random,
      ),
      answer: family,
      explanation: `${instrument} belongs to ${family}.`,
    };
  }

  if (taskId === "chords") {
    const [
      chord,
      notes,
    ] =
      CHORDS[
        (index + depth) %
        CHORDS.length
      ];

    const identify =
      depth >= 3;

    return {
      id: `chords-${difficulty}-${index}`,
      title:
        identify
          ? "name the chord"
          : "build the chord",
      instruction:
        identify
          ? "identify the chord from its written notes"
          : "choose the correct notes for the chord",
      question:
        identify
          ? "which chord is written?"
          : `which notes build ${chord}?`,
      visual:
        identify
          ? notes
          : chord,
      options: choices(
        identify ? chord : notes,
        CHORDS.map(
          ([name, chordNotes]) =>
            identify
              ? name
              : chordNotes,
        ),
        random,
      ),
      answer:
        identify
          ? chord
          : notes,
      explanation: `${chord} contains ${notes}.`,
    };
  }

  const [
    clue,
    answer,
  ] =
    CLUES[
      (index + depth) %
      CLUES.length
    ];

  return {
    id: `clues-${difficulty}-${index}`,
    title: "music clue",
    instruction:
      "solve the short written music clue",
    question: clue,
    visual:
      depth >= 3
        ? answer
            .split("")
            .map(
              (letter, position) =>
                position % 2 === 0
                  ? letter
                  : "_",
            )
            .join(" ")
        : "_ ".repeat(
            answer.length,
          ),
    options: choices(
      answer,
      CLUES.map(
        ([, value]) => value,
      ),
      random,
    ),
    answer,
    explanation: `${answer} matches the clue.`,
  };
}

function createLibrary() {
  return TASKS.reduce(
    (taskLibrary, task) => {
      taskLibrary[task.id] =
        DIFFICULTIES.reduce(
          (
            difficultyLibrary,
            difficulty,
          ) => {
            difficultyLibrary[
              difficulty
            ] = Array.from(
              { length: 24 },
              (_, index) =>
                createPuzzle(
                  task.id,
                  difficulty,
                  index,
                ),
            );

            return difficultyLibrary;
          },
          {} as Record<
            Difficulty,
            Puzzle[]
          >,
        );

      return taskLibrary;
    },
    {} as Record<
      TaskId,
      Record<
        Difficulty,
        Puzzle[]
      >
    >,
  );
}

function loadProgress(): SavedProgress {
  const fallback: SavedProgress = {
    difficulty: "gentle",
    taskId: "notes",
    indexes: {},
    answers: {},
    completed: [],
    mistakes: 0,
    hints: 0,
  };

  try {
    const stored =
      localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return fallback;
    }

    const parsed = JSON.parse(
      stored,
    ) as Partial<SavedProgress>;

    return {
      difficulty: DIFFICULTIES.includes(
        parsed.difficulty as Difficulty,
      )
        ? (parsed.difficulty as Difficulty)
        : fallback.difficulty,
      taskId: TASKS.some(
        (task) =>
          task.id === parsed.taskId,
      )
        ? (parsed.taskId as TaskId)
        : fallback.taskId,
      indexes: parsed.indexes ?? {},
      answers: parsed.answers ?? {},
      completed: Array.isArray(
        parsed.completed,
      )
        ? parsed.completed.filter(
            (
              item,
            ): item is string =>
              typeof item === "string",
          )
        : [],
      mistakes:
        typeof parsed.mistakes ===
        "number"
          ? parsed.mistakes
          : 0,
      hints:
        typeof parsed.hints === "number"
          ? parsed.hints
          : 0,
    };
  } catch {
    return fallback;
  }
}

function midiNumber(note: string) {
  const match =
    note.match(
      /^([A-G])([♯]?)(\d)$/,
    );

  if (!match) {
    return 60;
  }

  const [, letter, sharp, octaveText] =
    match;

  const semitones: Record<
    string,
    number
  > = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };

  return (
    (Number(octaveText) + 1) *
      12 +
    semitones[letter] +
    (sharp ? 1 : 0)
  );
}

function nearestSample(note: string) {
  const targetMidi =
    midiNumber(note);

  return SAMPLE_NOTES.reduce(
    (best, candidate) =>
      Math.abs(
        midiNumber(candidate) -
          targetMidi,
      ) <
      Math.abs(
        midiNumber(best) -
          targetMidi,
      )
        ? candidate
        : best,
    SAMPLE_NOTES[0],
  );
}

function createPianoKeys(): PianoKey[] {
  const keys: PianoKey[] = [];
  let whiteIndex = 0;

  for (
    let octave = 3;
    octave <= 5;
    octave += 1
  ) {
    CHROMATIC_NOTES.forEach(
      (noteName) => {
        const isBlack =
          noteName.includes("♯");

        keys.push({
          note: `${noteName}${octave}`,
          label: `${noteName}${octave}`,
          isBlack,
          whiteIndex:
            isBlack
              ? whiteIndex - 1
              : whiteIndex,
        });

        if (!isBlack) {
          whiteIndex += 1;
        }
      },
    );
  }

  keys.push({
    note: "C6",
    label: "C6",
    isBlack: false,
    whiteIndex,
  });

  return keys;
}

const PIANO_KEYS =
  createPianoKeys();

export default function MusicStudio({
  onComplete,
}: MusicStudioProps) {
  const library = useMemo(
    () => createLibrary(),
    [],
  );

  const initial = useMemo(
    () => loadProgress(),
    [],
  );

  const audioContextRef = useRef<AudioContext | null>(null);

  const audioBufferCache = useRef<
    Map<string, AudioBuffer>
  >(new Map());

  const loadingBufferCache = useRef<
    Map<string, Promise<AudioBuffer>>
  >(new Map());

  const [difficulty, setDifficulty] =
    useState<Difficulty>(
      initial.difficulty,
    );

  const [taskId, setTaskId] =
    useState<TaskId>(
      initial.taskId,
    );

  const [indexes, setIndexes] =
    useState<Record<string, number>>(
      initial.indexes,
    );

  const [answers, setAnswers] =
    useState<Record<string, string>>(
      initial.answers,
    );

  const [completed, setCompleted] =
    useState<string[]>(
      initial.completed,
    );

  const [mistakes, setMistakes] =
    useState(initial.mistakes);

  const [hints, setHints] =
    useState(initial.hints);

  const [checked, setChecked] =
    useState(false);

  const [message, setMessage] =
    useState(
      "choose one answer when you are ready",
    );

  const [browserOpen, setBrowserOpen] =
    useState(false);

  const currentKey =
    `${taskId}-${difficulty}`;

  const puzzles =
    library[taskId][difficulty];

  const puzzleIndex =
    indexes[currentKey] ?? 0;

  const puzzle =
    puzzles[puzzleIndex];

  const selectedAnswer =
    answers[puzzle.id] ?? "";

  const isComplete =
    completed.includes(
      puzzle.id,
    );

  const completedInSet =
    completed.filter(
      (id) =>
        id.startsWith(
          `${taskId}-${difficulty}`,
        ),
    ).length;

  const progress =
    Math.round(
      (completedInSet /
        puzzles.length) *
        100,
    );

  useEffect(() => {
    const saved: SavedProgress = {
      difficulty,
      taskId,
      indexes,
      answers,
      completed,
      mistakes,
      hints,
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(saved),
    );
  }, [
    answers,
    completed,
    difficulty,
    hints,
    indexes,
    mistakes,
    taskId,
  ]);

  useEffect(() => {
    setChecked(false);
    setMessage(
      isComplete
        ? puzzle.explanation
        : "choose one answer when you are ready",
    );
  }, [puzzle.id]);

  function getAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current =
        new AudioContext();
    }

    return audioContextRef.current;
  }

  async function loadPianoSample(
    sample: string,
  ) {
    const cached =
      audioBufferCache.current.get(
        sample,
      );

    if (cached) {
      return cached;
    }

    const loading =
      loadingBufferCache.current.get(
        sample,
      );

    if (loading) {
      return loading;
    }

    const context =
      getAudioContext();

    const request = fetch(
      `${SAMPLE_BASE}${SAMPLE_FILES[sample]}`,
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `sample request failed: ${response.status}`,
          );
        }

        return response.arrayBuffer();
      })
      .then((data) =>
        context.decodeAudioData(data),
      )
      .then((buffer) => {
        audioBufferCache.current.set(
          sample,
          buffer,
        );

        loadingBufferCache.current.delete(
          sample,
        );

        return buffer;
      })
      .catch((error) => {
        loadingBufferCache.current.delete(
          sample,
        );
        throw error;
      });

    loadingBufferCache.current.set(
      sample,
      request,
    );

    return request;
  }

  async function playPianoNote(
    note: string,
  ) {
    try {
      const context =
        getAudioContext();

      if (context.state === "suspended") {
        await context.resume();
      }

      const sample =
        nearestSample(note);

      const buffer =
        await loadPianoSample(sample);

      const source =
        context.createBufferSource();

      const gain =
        context.createGain();

      const sampleMidi =
        midiNumber(sample);

      const targetMidi =
        midiNumber(note);

      source.buffer = buffer;

      source.playbackRate.value =
        Math.pow(
          2,
          (targetMidi - sampleMidi) /
            12,
        );

      source.connect(gain);
      gain.connect(context.destination);

      const now =
        context.currentTime;

      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(
        0.001,
        now,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.72,
        now + 0.012,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.42,
        now + 0.34,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 1.08,
      );

      source.start(now);
      source.stop(now + 1.12);
    } catch {
      setMessage(
        "piano sound needs an internet connection",
      );
    }
  }

  function selectAnswer(
    answer: string,
  ) {
    setAnswers((current) => ({
      ...current,
      [puzzle.id]: answer,
    }));

    setChecked(false);
    setMessage("answer selected");
  }

  function pressPianoKey(
    note: string,
  ) {
    playPianoNote(note);
    selectAnswer(note);
  }

  function checkAnswer() {
    if (!selectedAnswer) {
      setMessage(
        taskId === "piano"
          ? "press one piano key first"
          : "choose an answer first",
      );
      return;
    }

    setChecked(true);

    if (
      selectedAnswer !==
      puzzle.answer
    ) {
      setMistakes(
        (current) =>
          current + 1,
      );
      setMessage(
        "that answer needs another look",
      );
      return;
    }

    setCompleted((current) =>
      current.includes(
        puzzle.id,
      )
        ? current
        : [
            ...current,
            puzzle.id,
          ],
    );

    setMessage(
      puzzle.explanation,
    );

    onComplete?.();
  }

  function revealHint() {
    setHints(
      (current) =>
        current + 1,
    );

    setAnswers((current) => ({
      ...current,
      [puzzle.id]:
        puzzle.answer,
    }));

    if (taskId === "piano") {
      playPianoNote(
        puzzle.answer,
      );
    }

    setMessage(
      `hint: ${puzzle.answer}`,
    );
  }

  function movePuzzle(
    direction: number,
  ) {
    const nextIndex =
      (puzzleIndex +
        direction +
        puzzles.length) %
      puzzles.length;

    setIndexes((current) => ({
      ...current,
      [currentKey]: nextIndex,
    }));

    setBrowserOpen(false);
  }

  function choosePuzzle(
    index: number,
  ) {
    setIndexes((current) => ({
      ...current,
      [currentKey]: index,
    }));

    setBrowserOpen(false);
  }

  function newPuzzle() {
    const uncompleted =
      puzzles
        .map(
          (item, index) => ({
            item,
            index,
          }),
        )
        .filter(
          ({ item }) =>
            !completed.includes(
              item.id,
            ),
        );

    const source =
      uncompleted.length > 0
        ? uncompleted
        : puzzles.map(
            (item, index) => ({
              item,
              index,
            }),
          );

    choosePuzzle(
      source[
        Math.floor(
          Math.random() *
            source.length,
        )
      ].index,
    );
  }

  return (
    <section
      className="music-studio"
      aria-label="music studio"
    >
      <header className="music-studio-top">
        <div className="music-levels">
          <span>difficulty</span>

          <div>
            {DIFFICULTIES.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  className={
                    item === difficulty
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setDifficulty(
                      item,
                    );
                    setBrowserOpen(
                      false,
                    );
                  }}
                >
                  {item}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="music-stats">
          <span>
            puzzle
            <strong>
              {puzzleIndex + 1} / 24
            </strong>
          </span>

          <span>
            complete
            <strong>
              {completedInSet} / 24
            </strong>
          </span>

          <span>
            progress
            <strong>
              {progress}%
            </strong>
          </span>

          <span>
            mistakes
            <strong>
              {mistakes}
            </strong>
          </span>

          <span>
            hints
            <strong>
              {hints}
            </strong>
          </span>
        </div>
      </header>

      <div className="music-task-buttons">
        {TASKS.map((task) => (
          <button
            key={task.id}
            type="button"
            className={
              task.id === taskId
                ? "active"
                : ""
            }
            onClick={() => {
              setTaskId(task.id);
              setBrowserOpen(false);
            }}
          >
            <span aria-hidden="true">
              {task.icon}
            </span>

            <small>
              {task.label}
            </small>
          </button>
        ))}
      </div>

      {browserOpen && (
        <div className="music-browser">
          {puzzles.map(
            (item, index) => (
              <button
                key={item.id}
                type="button"
                className={[
                  index === puzzleIndex
                    ? "current"
                    : "",
                  completed.includes(
                    item.id,
                  )
                    ? "done"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  choosePuzzle(index)
                }
              >
                {index + 1}
                {completed.includes(
                  item.id,
                )
                  ? " ✓"
                  : ""}
              </button>
            ),
          )}
        </div>
      )}

      <main
        className={
          taskId === "piano"
            ? "music-puzzle music-piano-puzzle"
            : "music-puzzle"
        }
      >
        <div className="music-puzzle-heading">
          <div>
            <span>
              {
                TASKS.find(
                  (task) =>
                    task.id ===
                    taskId,
                )?.label
              }
            </span>

            <h3>
              {puzzle.title}
            </h3>

            <p>
              {puzzle.instruction}
            </p>
          </div>

          <small>
            {puzzleIndex + 1} of 24
          </small>
        </div>

        <section className="music-question">
          <p>{puzzle.question}</p>

          {puzzle.visual && (
            <strong>
              {puzzle.visual}
            </strong>
          )}
        </section>

        {taskId === "piano" ? (
          <section className="piano-area">
            <div className="piano-scroll">
              <div className="piano-keyboard">
                {PIANO_KEYS.filter(
                  (key) =>
                    !key.isBlack,
                ).map((key) => (
                  <button
                    key={key.note}
                    type="button"
                    className={[
                      "piano-white-key",
                      selectedAnswer ===
                      key.note
                        ? "selected"
                        : "",
                      checked &&
                      key.note ===
                        puzzle.answer
                        ? "correct"
                        : "",
                      checked &&
                      selectedAnswer ===
                        key.note &&
                      key.note !==
                        puzzle.answer
                        ? "wrong"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      pressPianoKey(
                        key.note,
                      )
                    }
                    aria-label={`play ${key.label}`}
                  >
                    <span>
                      {difficulty ===
                      "gentle"
                        ? key.label
                        : key.note.endsWith(
                              "4",
                            ) &&
                            !key.note.includes(
                              "♯",
                            )
                          ? key.note.replace(
                              "4",
                              "",
                            )
                          : ""}
                    </span>
                  </button>
                ))}

                {PIANO_KEYS.filter(
                  (key) =>
                    key.isBlack,
                ).map((key) => (
                  <button
                    key={key.note}
                    type="button"
                    className={[
                      "piano-black-key",
                      selectedAnswer ===
                      key.note
                        ? "selected"
                        : "",
                      checked &&
                      key.note ===
                        puzzle.answer
                        ? "correct"
                        : "",
                      checked &&
                      selectedAnswer ===
                        key.note &&
                      key.note !==
                        puzzle.answer
                        ? "wrong"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      left: `calc((${
                        key.whiteIndex
                      } + 1) * var(--white-key-width))`,
                    }}
                    onClick={() =>
                      pressPianoKey(
                        key.note,
                      )
                    }
                    aria-label={`play ${key.label}`}
                  />
                ))}
              </div>
            </div>

            <div className="piano-selected">
              <span>
                selected key
              </span>

              <strong>
                {selectedAnswer ||
                  "none"}
              </strong>

              <small>
                each key plays a sampled
                grand piano sound
              </small>
            </div>
          </section>
        ) : (
          <div className="music-options">
            {puzzle.options.map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  className={[
                    selectedAnswer ===
                    option
                      ? "selected"
                      : "",
                    checked &&
                    option ===
                      puzzle.answer
                      ? "correct"
                      : "",
                    checked &&
                    selectedAnswer ===
                      option &&
                    option !==
                      puzzle.answer
                      ? "wrong"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    selectAnswer(
                      option,
                    )
                  }
                >
                  {option}
                </button>
              ),
            )}
          </div>
        )}

        <div
          className={
            isComplete
              ? "music-message complete"
              : "music-message"
          }
          aria-live="polite"
        >
          <span aria-hidden="true">
            {isComplete ? "✓" : "♪"}
          </span>

          <p>{message}</p>
        </div>
      </main>

      <div className="music-answer-actions">
        <button
          type="button"
          onClick={revealHint}
          disabled={isComplete}
        >
          hint
        </button>

        <button
          type="button"
          className="check"
          onClick={checkAnswer}
          disabled={isComplete}
        >
          check answer
        </button>
      </div>

      <nav className="music-navigation">
        <button
          type="button"
          onClick={() =>
            movePuzzle(-1)
          }
        >
          ← previous puzzle
        </button>

        <button
          type="button"
          onClick={() =>
            setBrowserOpen(
              (current) => !current,
            )
          }
        >
          choose puzzle
        </button>

        <button
          type="button"
          onClick={newPuzzle}
        >
          new puzzle
        </button>

        <button
          type="button"
          onClick={() =>
            movePuzzle(1)
          }
        >
          next puzzle →
        </button>
      </nav>
    </section>
  );
}
