import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import "./DrawingStudio.css";

type DrawingStudioProps = {
  onComplete?: () => void;
};

type DrawingTool =
  | "pencil"
  | "marker"
  | "eraser";

type DrawingPoint = {
  x: number;
  y: number;
};

type DrawingStroke = {
  id: string;
  tool: DrawingTool;
  colour: string;
  width: number;
  points: DrawingPoint[];
};

type SavedDrawingStudio = {
  version: 1;
  promptIndex: number;
  strokes: DrawingStroke[];
  completedDrawings: number;
  lastUpdated: number;
};

const STORAGE_KEY =
  "pace-pulse-brain-studio-drawing-v1";

const PROMPTS = [
  "draw the shape of today’s energy",
  "make a tiny landscape from three lines",
  "draw a plant that does not exist yet",
  "turn one circle into something unexpected",
  "draw the sound of rain without using words",
  "make a pattern that feels calm",
  "draw a path leading somewhere gentle",
  "fill the page with small marks that belong together",
  "draw what a quiet thought might look like",
  "make a picture using only curves",
  "draw a moonlit place from memory",
  "turn a scribble into a creature",
];

const COLOURS = [
  "#334d3c",
  "#6f8762",
  "#9a6f2b",
  "#7b6656",
  "#51666b",
  "#8a6f84",
  "#b99c68",
  "#2f2f2b",
];

const TOOL_LABELS: Record<
  DrawingTool,
  string
> = {
  pencil: "pencil",
  marker: "soft marker",
  eraser: "eraser",
};

const TOOL_WIDTHS: Record<
  DrawingTool,
  number
> = {
  pencil: 4,
  marker: 14,
  eraser: 26,
};

function createStrokeId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function isDrawingTool(
  value: unknown,
): value is DrawingTool {
  return (
    value === "pencil" ||
    value === "marker" ||
    value === "eraser"
  );
}

function isDrawingPoint(
  value: unknown,
): value is DrawingPoint {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const point =
    value as Partial<DrawingPoint>;

  return (
    typeof point.x === "number" &&
    Number.isFinite(point.x) &&
    typeof point.y === "number" &&
    Number.isFinite(point.y)
  );
}

function isDrawingStroke(
  value: unknown,
): value is DrawingStroke {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const stroke =
    value as Partial<DrawingStroke>;

  return (
    typeof stroke.id === "string" &&
    isDrawingTool(stroke.tool) &&
    typeof stroke.colour === "string" &&
    typeof stroke.width === "number" &&
    Number.isFinite(stroke.width) &&
    Array.isArray(stroke.points) &&
    stroke.points.every(isDrawingPoint)
  );
}

function loadDrawingStudio(): SavedDrawingStudio {
  const fallback: SavedDrawingStudio = {
    version: 1,
    promptIndex: 0,
    strokes: [],
    completedDrawings: 0,
    lastUpdated: Date.now(),
  };

  try {
    const raw =
      localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(
      raw,
    ) as Partial<SavedDrawingStudio>;

    return {
      version: 1,

      promptIndex:
        typeof parsed.promptIndex ===
        "number"
          ? Math.max(
              0,
              Math.min(
                PROMPTS.length - 1,
                Math.floor(
                  parsed.promptIndex,
                ),
              ),
            )
          : 0,

      strokes: Array.isArray(
        parsed.strokes,
      )
        ? parsed.strokes.filter(
            isDrawingStroke,
          )
        : [],

      completedDrawings:
        typeof parsed.completedDrawings ===
        "number"
          ? Math.max(
              0,
              Math.floor(
                parsed.completedDrawings,
              ),
            )
          : 0,

      lastUpdated:
        typeof parsed.lastUpdated ===
        "number"
          ? parsed.lastUpdated
          : Date.now(),
    };
  } catch {
    return fallback;
  }
}

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: DrawingStroke,
) {
  if (stroke.points.length === 0) {
    return;
  }

  const firstPoint = stroke.points[0];

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = stroke.width;

  if (stroke.tool === "eraser") {
    context.globalCompositeOperation =
      "destination-out";

    context.strokeStyle =
      "rgba(0, 0, 0, 1)";

    context.fillStyle =
      "rgba(0, 0, 0, 1)";
  } else {
    context.globalCompositeOperation =
      "source-over";

    context.strokeStyle =
      stroke.colour;

    context.fillStyle =
      stroke.colour;

    context.globalAlpha =
      stroke.tool === "marker"
        ? 0.48
        : 1;
  }

  if (stroke.points.length === 1) {
    context.beginPath();

    context.arc(
      firstPoint.x,
      firstPoint.y,
      stroke.width / 2,
      0,
      Math.PI * 2,
    );

    context.fill();
    context.restore();

    return;
  }

  context.beginPath();

  context.moveTo(
    firstPoint.x,
    firstPoint.y,
  );

  for (
    let index = 1;
    index < stroke.points.length;
    index += 1
  ) {
    const point = stroke.points[index];

    context.lineTo(
      point.x,
      point.y,
    );
  }

  context.stroke();
  context.restore();
}

function createDownloadName() {
  const date = new Date();

  const datePart =
    new Intl.DateTimeFormat(
      "en-CA",
    ).format(date);

  return `pace-pulse-drawing-${datePart}.png`;
}

export default function DrawingStudio({
  onComplete,
}: DrawingStudioProps) {
  const savedStudio = useMemo(
    () => loadDrawingStudio(),
    [],
  );

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );

  const canvasWrapRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const activePointerRef =
    useRef<number | null>(null);

  const activeStrokeRef =
    useRef<DrawingStroke | null>(
      null,
    );

  const strokesRef =
    useRef<DrawingStroke[]>(
      savedStudio.strokes,
    );

  const [strokes, setStrokes] =
    useState<DrawingStroke[]>(
      savedStudio.strokes,
    );

  const [
    redoStack,
    setRedoStack,
  ] = useState<DrawingStroke[]>([]);

  const [tool, setTool] =
    useState<DrawingTool>("pencil");

  const [colour, setColour] =
    useState(COLOURS[0]);

  const [
    brushScale,
    setBrushScale,
  ] = useState(1);

  const [
    promptIndex,
    setPromptIndex,
  ] = useState(
    savedStudio.promptIndex,
  );

  const [
    completedDrawings,
    setCompletedDrawings,
  ] = useState(
    savedStudio.completedDrawings,
  );

  const [message, setMessage] =
    useState(
      savedStudio.strokes.length >
        0
        ? "your saved drawing is ready"
        : "make one mark and let the rest follow",
    );

  const [
    isDrawing,
    setIsDrawing,
  ] = useState(false);

  const [
    canvasSize,
    setCanvasSize,
  ] = useState({
    width: 900,
    height: 520,
  });

  const prompt =
    PROMPTS[promptIndex];

  const strokeCount =
    strokes.length;

  const hasDrawing =
    strokeCount > 0;

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const redrawCanvas =
    useCallback(() => {
      const canvas =
        canvasRef.current;

      if (!canvas) {
        return;
      }

      const context =
        canvas.getContext("2d");

      if (!context) {
        return;
      }

      const pixelRatio =
        window.devicePixelRatio || 1;

      canvas.width = Math.round(
        canvasSize.width *
          pixelRatio,
      );

      canvas.height = Math.round(
        canvasSize.height *
          pixelRatio,
      );

      canvas.style.width = `${canvasSize.width}px`;
      canvas.style.height = `${canvasSize.height}px`;

      context.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0,
      );

      context.clearRect(
        0,
        0,
        canvasSize.width,
        canvasSize.height,
      );

      strokesRef.current.forEach(
        (stroke) => {
          drawStroke(
            context,
            stroke,
          );
        },
      );
    }, [canvasSize]);

  useEffect(() => {
    const wrapper =
      canvasWrapRef.current;

    if (!wrapper) {
      return undefined;
    }

    const wrapperElement = wrapper;

    function updateCanvasSize() {
      const nextWidth = Math.max(
        280,
        Math.floor(
          wrapperElement.clientWidth,
        ),
      );

      const nextHeight = Math.max(
        280,
        Math.min(
          480,
          Math.round(
            nextWidth * 0.38,
          ),
        ),
      );

      setCanvasSize((current) => {
        if (
          current.width ===
            nextWidth &&
          current.height ===
            nextHeight
        ) {
          return current;
        }

        return {
          width: nextWidth,
          height: nextHeight,
        };
      });
    }

    updateCanvasSize();

    const observer =
      new ResizeObserver(
        updateCanvasSize,
      );

    observer.observe(wrapperElement);

    return () =>
      observer.disconnect();
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [
    redrawCanvas,
    strokes,
  ]);

  useEffect(() => {
    const saved: SavedDrawingStudio =
      {
        version: 1,
        promptIndex,
        strokes,
        completedDrawings,
        lastUpdated: Date.now(),
      };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(saved),
    );
  }, [
    completedDrawings,
    promptIndex,
    strokes,
  ]);

  function getCanvasPoint(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): DrawingPoint {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return {
        x: 0,
        y: 0,
      };
    }

    const bounds =
      canvas.getBoundingClientRect();

    return {
      x: Math.max(
        0,
        Math.min(
          canvasSize.width,
          event.clientX -
            bounds.left,
        ),
      ),

      y: Math.max(
        0,
        Math.min(
          canvasSize.height,
          event.clientY -
            bounds.top,
        ),
      ),
    };
  }

  function beginStroke(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (
      activePointerRef.current !==
      null
    ) {
      return;
    }

    event.preventDefault();

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    activePointerRef.current =
      event.pointerId;

    const nextStroke: DrawingStroke =
      {
        id: createStrokeId(),
        tool,
        colour,
        width:
          TOOL_WIDTHS[tool] *
          brushScale,
        points: [
          getCanvasPoint(event),
        ],
      };

    activeStrokeRef.current =
      nextStroke;

    setRedoStack([]);
    setIsDrawing(true);

    setMessage(
      tool === "eraser"
        ? "gently clearing the page"
        : "keep following the line",
    );

    const context =
      canvasRef.current?.getContext(
        "2d",
      );

    if (context) {
      drawStroke(
        context,
        nextStroke,
      );
    }
  }

  function continueStroke(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (
      activePointerRef.current !==
        event.pointerId ||
      !activeStrokeRef.current
    ) {
      return;
    }

    event.preventDefault();

    const point =
      getCanvasPoint(event);

    activeStrokeRef.current = {
      ...activeStrokeRef.current,

      points: [
        ...activeStrokeRef.current
          .points,
        point,
      ],
    };

    redrawCanvas();

    const context =
      canvasRef.current?.getContext(
        "2d",
      );

    if (context) {
      drawStroke(
        context,
        activeStrokeRef.current,
      );
    }
  }

  function finishStroke(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (
      activePointerRef.current !==
      event.pointerId
    ) {
      return;
    }

    event.preventDefault();

    const finishedStroke =
      activeStrokeRef.current;

    if (finishedStroke) {
      setStrokes((current) => [
        ...current,
        finishedStroke,
      ]);
    }

    activePointerRef.current =
      null;

    activeStrokeRef.current =
      null;

    setIsDrawing(false);

    setMessage(
      "your page is holding the idea",
    );
  }

  function cancelStroke(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (
      activePointerRef.current !==
      event.pointerId
    ) {
      return;
    }

    activePointerRef.current =
      null;

    activeStrokeRef.current =
      null;

    setIsDrawing(false);

    redrawCanvas();

    setMessage(
      "the unfinished mark was released",
    );
  }

  function undo() {
    if (strokes.length === 0) {
      setMessage(
        "there is nothing to undo yet",
      );

      return;
    }

    const lastStroke =
      strokes[
        strokes.length - 1
      ];

    setStrokes((current) =>
      current.slice(0, -1),
    );

    setRedoStack((current) => [
      ...current,
      lastStroke,
    ]);

    setMessage(
      "one mark stepped back",
    );
  }

  function redo() {
    if (redoStack.length === 0) {
      setMessage(
        "there is nothing to redo yet",
      );

      return;
    }

    const nextStroke =
      redoStack[
        redoStack.length - 1
      ];

    setRedoStack((current) =>
      current.slice(0, -1),
    );

    setStrokes((current) => [
      ...current,
      nextStroke,
    ]);

    setMessage(
      "the mark returned",
    );
  }

  function clearCanvas() {
    if (!hasDrawing) {
      setMessage(
        "the page is already clear",
      );

      return;
    }

    const confirmed =
      window.confirm(
        "clear this whole drawing?",
      );

    if (!confirmed) {
      return;
    }

    setStrokes([]);
    setRedoStack([]);
    setMessage(
      "the page is clear again",
    );
  }

  function choosePrompt(
    nextIndex: number,
  ) {
    const normalisedIndex =
      ((nextIndex %
        PROMPTS.length) +
        PROMPTS.length) %
      PROMPTS.length;

    setPromptIndex(
      normalisedIndex,
    );

    setMessage(
      "a new idea is waiting",
    );
  }

  function randomPrompt() {
    const availableIndexes =
      PROMPTS.map(
        (_, index) => index,
      ).filter(
        (index) =>
          index !== promptIndex,
      );

    const nextIndex =
      availableIndexes[
        Math.floor(
          Math.random() *
            availableIndexes.length,
        )
      ];

    choosePrompt(
      nextIndex ?? 0,
    );
  }

  function downloadDrawing() {
    const sourceCanvas =
      canvasRef.current;

    if (!sourceCanvas) {
      setMessage(
        "the drawing could not be saved",
      );

      return;
    }

    const exportCanvas =
      document.createElement(
        "canvas",
      );

    const pixelRatio = 2;

    exportCanvas.width =
      canvasSize.width *
      pixelRatio;

    exportCanvas.height =
      canvasSize.height *
      pixelRatio;

    const context =
      exportCanvas.getContext("2d");

    if (!context) {
      setMessage(
        "the drawing could not be saved",
      );

      return;
    }

    context.scale(
      pixelRatio,
      pixelRatio,
    );

    context.fillStyle =
      getComputedStyle(
        document.documentElement,
      )
        .getPropertyValue(
          "--surface",
        )
        .trim() || "#f2edcf";

    context.fillRect(
      0,
      0,
      canvasSize.width,
      canvasSize.height,
    );

    strokes.forEach(
      (stroke) => {
        drawStroke(
          context,
          stroke,
        );
      },
    );

    const link =
      document.createElement("a");

    link.download =
      createDownloadName();

    link.href =
      exportCanvas.toDataURL(
        "image/png",
      );

    link.click();

    setMessage(
      "your drawing has been saved",
    );
  }

  function finishDrawing() {
    if (!hasDrawing) {
      setMessage(
        "make at least one mark before finishing",
      );

      return;
    }

    setCompletedDrawings(
      (current) => current + 1,
    );

    setMessage(
      "beautifully done — this drawing is complete",
    );

    onComplete?.();
  }

  return (
    <section
      className="drawing-studio"
      aria-label="drawing studio"
    >
      <header className="drawing-toolbar">
        <div className="drawing-prompt-block">
          <span>drawing prompt</span>
          <strong>{prompt}</strong>
        </div>

        <div className="drawing-stats">
          <span>
            marks
            <strong>{strokeCount}</strong>
          </span>
          <span>
            finished
            <strong>{completedDrawings}</strong>
          </span>
          <span>
            tool
            <strong>{TOOL_LABELS[tool]}</strong>
          </span>
        </div>
      </header>

      <nav
        className="drawing-prompt-navigation"
        aria-label="drawing prompts"
      >
        <button
          type="button"
          onClick={() => choosePrompt(promptIndex - 1)}
        >
          ← previous idea
        </button>
        <button type="button" onClick={randomPrompt}>
          surprise me
        </button>
        <button
          type="button"
          onClick={() => choosePrompt(promptIndex + 1)}
        >
          next idea →
        </button>
      </nav>

      <div className="drawing-workspace">
        <div className="drawing-controls drawing-controls-top">
          <section className="drawing-control-card drawing-tools-card">
            <span className="drawing-control-label">tools</span>
            <div className="drawing-tool-list">
              {(["pencil", "marker", "eraser"] as DrawingTool[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    className={
                      tool === item ? "drawing-tool-active" : undefined
                    }
                    onClick={() => {
                      setTool(item);
                      setMessage(`${TOOL_LABELS[item]} selected`);
                    }}
                  >
                    <span aria-hidden="true">
                      {item === "pencil"
                        ? "✎"
                        : item === "marker"
                          ? "▬"
                          : "⌫"}
                    </span>
                    {TOOL_LABELS[item]}
                  </button>
                ),
              )}
            </div>
          </section>

          <section className="drawing-control-card drawing-colours-card">
            <span className="drawing-control-label">colours</span>
            <div className="drawing-colour-list">
              {COLOURS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={
                    colour === item ? "drawing-colour-active" : undefined
                  }
                  style={{ backgroundColor: item }}
                  aria-label={`choose colour ${item}`}
                  onClick={() => {
                    setColour(item);
                    if (tool === "eraser") {
                      setTool("pencil");
                    }
                    setMessage("a new colour is ready");
                  }}
                />
              ))}
            </div>
          </section>

          <section className="drawing-control-card drawing-brush-card">
            <label
              className="drawing-control-label"
              htmlFor="drawing-brush-size"
            >
              brush size
            </label>
            <input
              id="drawing-brush-size"
              type="range"
              min="0.65"
              max="2"
              step="0.15"
              value={brushScale}
              onChange={(event) =>
                setBrushScale(Number(event.target.value))
              }
            />
            <div className="drawing-brush-markers">
              <span>small</span>
              <span>large</span>
            </div>
          </section>
        </div>

        <div className="drawing-canvas-panel">
          <div
            ref={canvasWrapRef}
            className={
              isDrawing
                ? "drawing-canvas-wrap drawing-canvas-wrap-active"
                : "drawing-canvas-wrap"
            }
          >
            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              aria-label="drawing canvas"
              onPointerDown={beginStroke}
              onPointerMove={continueStroke}
              onPointerUp={finishStroke}
              onPointerCancel={cancelStroke}
              onPointerLeave={(event) => {
                if (activePointerRef.current === event.pointerId) {
                  finishStroke(event);
                }
              }}
            />

            {!hasDrawing && !isDrawing && (
              <div className="drawing-empty-note">
                <span aria-hidden="true">✦</span>
                <p>begin anywhere</p>
              </div>
            )}
          </div>
        </div>

        <div className="drawing-controls drawing-controls-bottom">
          <section className="drawing-control-card drawing-action-card">
            <button
              type="button"
              onClick={undo}
              disabled={strokes.length === 0}
            >
              undo
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={redoStack.length === 0}
            >
              redo
            </button>
            <button
              type="button"
              onClick={clearCanvas}
              disabled={!hasDrawing}
            >
              clear page
            </button>
            <button
              type="button"
              onClick={downloadDrawing}
              disabled={!hasDrawing}
            >
              save picture
            </button>
          </section>

          <div className="drawing-message" aria-live="polite">
            <span aria-hidden="true">{hasDrawing ? "✎" : "✦"}</span>
            <p>{message}</p>
          </div>

          <button
            className="drawing-finish-button"
            type="button"
            onClick={finishDrawing}
            disabled={!hasDrawing}
          >
            finish this drawing
          </button>
        </div>
      </div>
    </section>
  );
}
