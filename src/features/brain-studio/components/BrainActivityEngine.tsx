import SudokuStudio from "../engines/sudoku/SudokuStudio";
import CrosswordStudio from "../engines/crossword/CrosswordStudio";
import DrawingStudio from "../engines/drawing/DrawingStudio";
import MusicStudio from "../engines/music/MusicStudio";

import type {
  BrainActivity,
  BrainActivityType,
} from "../types";

type BrainActivityEngineProps = {
  activity: BrainActivity;
  selectedActivity: BrainActivityType;
  onComplete: (
    activityId: BrainActivityType,
  ) => void;
};

export default function BrainActivityEngine({
  activity,
  selectedActivity,
  onComplete,
}: BrainActivityEngineProps) {
  if (selectedActivity === "sudoku") {
    return (
      <SudokuStudio
        onComplete={() =>
          onComplete("sudoku")
        }
      />
    );
  }

  if (selectedActivity === "crossword") {
    return (
      <CrosswordStudio
        onComplete={() =>
          onComplete("crossword")
        }
      />
    );
  }

  if (selectedActivity === "drawing") {
    return (
      <DrawingStudio
        onComplete={() =>
          onComplete("drawing")
        }
      />
    );
  }

  if (selectedActivity === "music") {
    return (
      <MusicStudio
        onComplete={() =>
          onComplete("music")
        }
      />
    );
  }

  return (
    <div className="brain-studio-preview">
      <span
        className="brain-studio-preview-icon"
        aria-hidden="true"
      >
        {activity.icon}
      </span>

      <strong>{activity.subtitle}</strong>
    </div>
  );
}
