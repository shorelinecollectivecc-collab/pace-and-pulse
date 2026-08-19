import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import "./BrainChallengeStudio.css";

type Difficulty = "easy" | "medium" | "hard";
type StudioTab = "sudoku" | "crossword" | "drawing" | "music" | "math" | "games";

const difficulties: Difficulty[] = ["easy", "medium", "hard"];

const sudokuSizes = {
  easy: 6,
  medium: 9,
  hard: 12,
} as const;

function makeSudokuSolution(size: number) {
  const boxRows = size === 6 ? 2 : 3;
  const boxCols = size / boxRows;
  const pattern = (row: number, column: number) =>
    (boxCols * (row % boxRows) + Math.floor(row / boxRows) + column) % size;

  return Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const column = index % size;
    return pattern(row, column) + 1;
  });
}

function makeSudokuPuzzle(size: number, difficulty: Difficulty) {
  const solution = makeSudokuSolution(size);
  const keepRatio = difficulty === "easy" ? 0.58 : difficulty === "medium" ? 0.44 : 0.32;
  const puzzle = solution.map((value, index) => {
    const pseudo = ((index * 17 + size * 11) % 100) / 100;
    return pseudo < keepRatio ? value : 0;
  });
  return { puzzle, solution };
}

const crosswordSets = {
  easy: {
    size: 7,
    entries: [
      { answer: "MOON", clue: "it glows at night", row: 1, col: 1, direction: "across" },
      { answer: "MOSS", clue: "soft green forest growth", row: 1, col: 1, direction: "down" },
      { answer: "SONG", clue: "music with words", row: 3, col: 1, direction: "across" },
      { answer: "NEST", clue: "a bird's little home", row: 3, col: 3, direction: "down" },
    ],
  },
  medium: {
    size: 9,
    entries: [
      { answer: "RHYTHM", clue: "the pulse underneath music", row: 1, col: 1, direction: "across" },
      { answer: "RIVER", clue: "moving water through land", row: 1, col: 1, direction: "down" },
      { answer: "VERSE", clue: "a song section before a chorus", row: 3, col: 1, direction: "across" },
      { answer: "ECHO", clue: "a sound that returns", row: 3, col: 2, direction: "down" },
      { answer: "TEMPO", clue: "how fast music moves", row: 5, col: 2, direction: "across" },
    ],
  },
  hard: {
    size: 11,
    entries: [
      { answer: "HARMONY", clue: "notes sounding together", row: 1, col: 1, direction: "across" },
      { answer: "HORIZON", clue: "where sky seems to meet earth", row: 1, col: 1, direction: "down" },
      { answer: "MELODY", clue: "the tune you remember", row: 3, col: 2, direction: "across" },
      { answer: "LYRIC", clue: "a line of words in a song", row: 3, col: 4, direction: "down" },
      { answer: "CADENCE", clue: "a resting or closing musical motion", row: 6, col: 1, direction: "across" },
      { answer: "OCTAVE", clue: "eight-note span", row: 1, col: 7, direction: "down" },
    ],
  },
} as const;

const drawingSets = {
  easy: [
    "draw one long line across the middle",
    "draw a circle to the left of the line",
    "add three short lines above the circle",
    "turn the shape into something from nature",
  ],
  medium: [
    "draw a wavy path from the bottom-left to the top-right",
    "place a triangle above the first bend",
    "add two circles that touch but do not overlap",
    "connect one circle to the path with a dotted line",
    "use five small marks to suggest movement",
  ],
  hard: [
    "draw a broken spiral without lifting your pointer",
    "add a square that overlaps exactly two spiral turns",
    "place a small circle outside each corner of the square",
    "join alternate circles with curved lines",
    "add a repeating three-mark rhythm around the outside",
    "turn the whole construction into an imagined map",
  ],
};

const rhythmPatterns = {
  easy: [0, 1, 0, 2],
  medium: [0, 2, 1, 0, 1, 2],
  hard: [0, 2, 1, 2, 0, 1, 0, 2],
};

const mathQuestions = {
  easy: [
    { prompt: "what comes next: 3, 6, 9, 12, ?", answer: "15" },
    { prompt: "half of 28 plus 3", answer: "17" },
    { prompt: "which number makes 8 + ? = 21", answer: "13" },
  ],
  medium: [
    { prompt: "what comes next: 2, 5, 11, 23, ?", answer: "47" },
    { prompt: "three quarters of 64", answer: "48" },
    { prompt: "if 5 notebooks cost 45, what do 8 cost?", answer: "72" },
  ],
  hard: [
    { prompt: "what comes next: 1, 4, 10, 22, 46, ?", answer: "94" },
    { prompt: "a number is doubled, then 9 is removed, leaving 37", answer: "23" },
    { prompt: "the average of 14, 19, 26 and x is 22", answer: "29" },
  ],
};

function SudokuGame({ difficulty }: { difficulty: Difficulty }) {
  const size = sudokuSizes[difficulty];
  const game = useMemo(() => makeSudokuPuzzle(size, difficulty), [size, difficulty]);
  const [board, setBoard] = useState(game.puzzle);
  const [message, setMessage] = useState("tap an empty square to cycle its number");

  useEffect(() => {
    setBoard(game.puzzle);
    setMessage("tap an empty square to cycle its number");
  }, [game]);

  const symbols = Array.from({ length: size }, (_, index) => index + 1);

  return (
    <div className="challenge-game-wrap">
      <div
        className={`challenge-sudoku challenge-sudoku-${size}`}
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {board.map((value, index) => {
          const fixed = game.puzzle[index] !== 0;
          return (
            <button
              key={index}
              type="button"
              className={fixed ? "challenge-number-fixed" : "challenge-number-open"}
              onClick={() => {
                if (fixed) return;
                setBoard((current) => current.map((cell, cellIndex) => (
                  cellIndex === index ? (cell % size) + 1 : cell
                )));
              }}
            >
              {value || "·"}
            </button>
          );
        })}
      </div>
      <div className="challenge-inline-actions">
        <button type="button" onClick={() => setBoard(game.puzzle)}>reset grid</button>
        <button
          type="button"
          onClick={() => setMessage(board.every((value, index) => value === game.solution[index])
            ? "every row, column and box is complete"
            : "not solved yet · check repeated numbers and empty spaces")}
        >
          check grid
        </button>
      </div>
      <p className="challenge-status">{message} · numbers {symbols[0]} to {symbols[symbols.length - 1]}</p>
    </div>
  );
}

function CrosswordGame({ difficulty }: { difficulty: Difficulty }) {
  const config = crosswordSets[difficulty];
  const cells = useMemo(() => {
    const next = Array.from({ length: config.size * config.size }, () => ({ active: false, answer: "", number: 0 }));
    config.entries.forEach((entry, entryIndex) => {
      [...entry.answer].forEach((letter, offset) => {
        const row = entry.row + (entry.direction === "down" ? offset : 0);
        const col = entry.col + (entry.direction === "across" ? offset : 0);
        const index = row * config.size + col;
        next[index] = { active: true, answer: letter, number: offset === 0 ? entryIndex + 1 : next[index].number };
      });
    });
    return next;
  }, [config]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("fill the white squares from the clues");

  useEffect(() => {
    setAnswers({});
    setMessage("fill the white squares from the clues");
  }, [difficulty]);

  return (
    <div className="challenge-crossword-layout">
      <div className="challenge-crossword" style={{ gridTemplateColumns: `repeat(${config.size}, 1fr)` }}>
        {cells.map((cell, index) => cell.active ? (
          <label key={index} className="challenge-crossword-cell">
            {cell.number > 0 && <small>{cell.number}</small>}
            <input
              maxLength={1}
              value={answers[index] ?? ""}
              aria-label={`crossword square ${index + 1}`}
              onChange={(event) => setAnswers((current) => ({
                ...current,
                [index]: event.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
              }))}
            />
          </label>
        ) : <span key={index} className="challenge-crossword-block" />)}
      </div>
      <div className="challenge-clues">
        {config.entries.map((entry, index) => (
          <p key={`${entry.answer}-${index}`}><b>{index + 1} {entry.direction}</b><span>{entry.clue}</span></p>
        ))}
        <button
          type="button"
          onClick={() => setMessage(cells.every((cell, index) => !cell.active || answers[index] === cell.answer)
            ? "all the crossing words fit"
            : "some letters still need another thought")}
        >
          check crossword
        </button>
        <p className="challenge-status">{message}</p>
      </div>
    </div>
  );
}

function DrawingGame({ difficulty }: { difficulty: Difficulty }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const [step, setStep] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setStep(0);
  }, [difficulty]);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function begin(event: ReactPointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    lastPoint.current = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;
    const next = point(event);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 4;
    context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#33443c";
    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    lastPoint.current = next;
  }

  return (
    <div className="challenge-drawing-layout">
      <div className="challenge-drawing-steps">
        {drawingSets[difficulty].map((instruction, index) => (
          <button
            key={instruction}
            type="button"
            className={index === step ? "challenge-drawing-step-active" : index < step ? "challenge-drawing-step-done" : ""}
            onClick={() => setStep(index)}
          >
            <span>{index + 1}</span>{instruction}
          </button>
        ))}
      </div>
      <div className="challenge-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={760}
          height={460}
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={() => { drawing.current = false; }}
          onPointerCancel={() => { drawing.current = false; }}
        />
        <div className="challenge-inline-actions">
          <button type="button" onClick={() => setStep((current) => Math.min(current + 1, drawingSets[difficulty].length - 1))}>next step</button>
          <button type="button" onClick={() => {
            const canvas = canvasRef.current;
            canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
            setStep(0);
          }}>clear drawing</button>
        </div>
      </div>
    </div>
  );
}

function MusicGame({ difficulty }: { difficulty: Difficulty }) {
  const pattern = rhythmPatterns[difficulty];
  const [played, setPlayed] = useState<number[]>([]);
  const [showPattern, setShowPattern] = useState(false);
  const [message, setMessage] = useState("study the rhythm, then copy it");
  const labels = ["low", "middle", "high"];

  useEffect(() => {
    setPlayed([]);
    setShowPattern(false);
    setMessage("study the rhythm, then copy it");
  }, [difficulty]);

  return (
    <div className="challenge-music-game">
      <div className="challenge-rhythm-strip">
        {(showPattern ? pattern : pattern.map(() => -1)).map((beat, index) => (
          <span key={index}>{beat < 0 ? "?" : beat + 1}</span>
        ))}
      </div>
      <div className="challenge-music-pads">
        {labels.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              const next = [...played, index];
              setPlayed(next);
              if (next.length === pattern.length) {
                setMessage(next.every((beat, beatIndex) => beat === pattern[beatIndex])
                  ? "you held the whole rhythm"
                  : "the rhythm shifted · reveal it and try again");
              }
            }}
          >
            <b>{index + 1}</b><span>{label}</span>
          </button>
        ))}
      </div>
      <div className="challenge-inline-actions">
        <button type="button" onClick={() => setShowPattern((current) => !current)}>{showPattern ? "hide rhythm" : "reveal rhythm"}</button>
        <button type="button" onClick={() => { setPlayed([]); setMessage("copy it once more"); }}>clear taps</button>
      </div>
      <p className="challenge-status">your taps: {played.length ? played.map((beat) => beat + 1).join(" · ") : "none yet"} · {message}</p>
    </div>
  );
}

function MathGame({ difficulty }: { difficulty: Difficulty }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("work it out in your own way");
  const questions = mathQuestions[difficulty];
  const question = questions[questionIndex];

  useEffect(() => {
    setQuestionIndex(0);
    setAnswer("");
    setMessage("work it out in your own way");
  }, [difficulty]);

  return (
    <div className="challenge-math-game">
      <p className="challenge-math-question">{question.prompt}</p>
      <label>
        <span>your answer</span>
        <input value={answer} onChange={(event) => setAnswer(event.target.value)} inputMode="numeric" />
      </label>
      <div className="challenge-inline-actions">
        <button type="button" onClick={() => setMessage(answer.trim() === question.answer ? "exactly right" : "not yet · try a different path")}>check answer</button>
        <button type="button" onClick={() => {
          setQuestionIndex((current) => (current + 1) % questions.length);
          setAnswer("");
          setMessage("a new number trail is ready");
        }}>next teaser</button>
      </div>
      <p className="challenge-status">{message}</p>
    </div>
  );
}

function MiniGames({ difficulty }: { difficulty: Difficulty }) {
  const total = difficulty === "easy" ? 8 : difficulty === "medium" ? 12 : 16;
  const [target, setTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const shuffled = useMemo(() => Array.from({ length: total }, (_, index) => index + 1).sort(() => Math.random() - 0.5), [total, score]);

  function moveTarget() {
    setTarget(Math.floor(Math.random() * total));
    setScore((current) => current + 1);
  }

  return (
    <div className="challenge-mini-games">
      <article>
        <h4>catch the firefly</h4>
        <p>tap the glow before it moves</p>
        <div className="challenge-firefly-field" style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(total))}, 1fr)` }}>
          {Array.from({ length: total }, (_, index) => (
            <button key={index} type="button" onClick={() => index === target && moveTarget()}>{index === target ? "✦" : "·"}</button>
          ))}
        </div>
        <span>{score} catches</span>
      </article>
      <article>
        <h4>number trail</h4>
        <p>tap the numbers in order</p>
        <div className="challenge-number-trail">
          {shuffled.map((number) => (
            <button
              key={number}
              type="button"
              className={sequence.includes(number) ? "challenge-trail-done" : ""}
              onClick={() => {
                if (number !== nextNumber) return;
                setSequence((current) => [...current, number]);
                setNextNumber((current) => current === total ? 1 : current + 1);
                if (number === total) setSequence([]);
              }}
            >{number}</button>
          ))}
        </div>
        <span>next: {nextNumber}</span>
      </article>
    </div>
  );
}

export default function BrainChallengeStudio() {
  const [tab, setTab] = useState<StudioTab>("sudoku");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  return (
    <section className="brain-challenge-studio">
      <div className="challenge-studio-heading">
        <div>
          <p>deeper play shelf</p>
          <h2>proper puzzles, drawing and mini games</h2>
        </div>
        <span>everything here is interactive</span>
      </div>

      <div className="challenge-tab-row">
        {(["sudoku", "crossword", "drawing", "music", "math", "games"] as StudioTab[]).map((item) => (
          <button key={item} type="button" className={tab === item ? "challenge-tab-active" : ""} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>

      <div className="challenge-difficulty-row">
        {difficulties.map((item) => (
          <button key={item} type="button" className={difficulty === item ? "challenge-difficulty-active" : ""} onClick={() => setDifficulty(item)}>{item}</button>
        ))}
      </div>

      <div className="challenge-stage">
        {tab === "sudoku" && <SudokuGame difficulty={difficulty} />}
        {tab === "crossword" && <CrosswordGame difficulty={difficulty} />}
        {tab === "drawing" && <DrawingGame difficulty={difficulty} />}
        {tab === "music" && <MusicGame difficulty={difficulty} />}
        {tab === "math" && <MathGame difficulty={difficulty} />}
        {tab === "games" && <MiniGames difficulty={difficulty} />}
      </div>
    </section>
  );
}
