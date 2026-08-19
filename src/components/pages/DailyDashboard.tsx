import DailyRhythmTools from "../../DailyRhythmTools";
import WorkspaceBanner from "../layout/WorkspaceBanner";

type DailyDashboardProps = {
  formattedDate: string;
  themeBanner: string;
  themeName: string;
  themeDescription: string;
  annotationCount: number;
  dailyGoal: number;
  progress: number;
  formattedEarnings: string;
  formattedUsd: string;
  showConvertedUsd: boolean;
  autoSaveEnabled: boolean;
  showUndo: boolean;
  progressMessage: string;
  onAddAnnotation: () => void;
  onUndoLast: () => void;
};

export default function DailyDashboard({
  formattedDate,
  themeBanner,
  themeName,
  themeDescription,
  annotationCount,
  dailyGoal,
  progress,
  formattedEarnings,
  formattedUsd,
  showConvertedUsd,
  autoSaveEnabled,
  showUndo,
  progressMessage,
  onAddAnnotation,
  onUndoLast,
}: DailyDashboardProps) {
  return (
    <>
      <header className="page-header">
        <h2>find your rhythm</h2>
        <time>{formattedDate}</time>
      </header>

      <WorkspaceBanner
        banner={themeBanner}
        name={themeName}
        description={themeDescription}
      />

      <section className="dashboard-grid">
        <article className="progress-card">
          <div className="card-heading">
            <div>
              <p>daily annotations</p>
              <h3>one track at a time</h3>
            </div>

            <span className="saving-status">
              <span />
              {autoSaveEnabled
                ? "saving automatically"
                : "saving is paused"}
            </span>
          </div>

          <div className="count">
            <strong>{annotationCount}</strong>
            <span>/ {dailyGoal}</span>
          </div>

          <div
            className="progress-track"
            role="progressbar"
            aria-label="daily annotation progress"
            aria-valuemin={0}
            aria-valuemax={dailyGoal}
            aria-valuenow={annotationCount}
          >
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="progress-message">{progressMessage}</p>

          <div className="annotation-actions">
            <button
              className="add-button"
              type="button"
              onClick={onAddAnnotation}
            >
              <span>+</span>
              add annotation
            </button>

            <div className="undo-space">
              {showUndo && annotationCount > 0 && (
                <button
                  className="undo-button"
                  type="button"
                  onClick={onUndoLast}
                >
                  undo last
                </button>
              )}
            </div>
          </div>
        </article>

        <article className="earnings-card">
          <div className="card-heading">
            <div>
              <p>today’s earnings</p>
              <h3>your work so far</h3>
            </div>
          </div>

          <div className="earnings-value">
            <strong>{formattedEarnings}</strong>
            {showConvertedUsd && <span>{formattedUsd}</span>}
          </div>

          <div className="earnings-detail">
            <div>
              <span>completed</span>
              <strong>{annotationCount}</strong>
            </div>
            <div>
              <span>each annotation</span>
              <strong>$3.13</strong>
            </div>
          </div>

          <p className="earnings-note">
            your earnings update with every annotation
          </p>
        </article>
      </section>

      <DailyRhythmTools annotationCount={annotationCount} />
    </>
  );
}
