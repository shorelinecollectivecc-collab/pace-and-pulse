import { annotationMoodOptions } from "../../constants/app";
import type { AnnotationDraft } from "../../types/app";

type AnnotationModalProps = {
  open: boolean;
  draft: AnnotationDraft;
  error: string;
  onClose: () => void;
  onSave: () => void;
  onDraftChange: <K extends keyof AnnotationDraft>(
    field: K,
    value: AnnotationDraft[K]
  ) => void;
};

export default function AnnotationModal({
  open,
  draft,
  error,
  onClose,
  onSave,
  onDraftChange,
}: AnnotationModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="annotation-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="annotation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="annotation-modal-title"
      >
        <div className="annotation-modal-heading">
          <div>
            <p>one track at a time</p>
            <h2 id="annotation-modal-title">save this annotation</h2>
          </div>

          <button
            type="button"
            aria-label="close annotation form"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="annotation-form-grid">
          <label>
            <span>track name</span>
            <input
              autoFocus
              value={draft.trackName}
              maxLength={120}
              placeholder="track name"
              onChange={(event) =>
                onDraftChange("trackName", event.target.value)
              }
            />
          </label>

          <label>
            <span>artist</span>
            <input
              value={draft.artist}
              maxLength={120}
              placeholder="artist name"
              onChange={(event) =>
                onDraftChange("artist", event.target.value)
              }
            />
          </label>

          <label>
            <span>spotify id</span>
            <input
              value={draft.spotifyId}
              maxLength={100}
              placeholder="spotify track id"
              onChange={(event) =>
                onDraftChange("spotifyId", event.target.value)
              }
            />
          </label>

          <label>
            <span>track duration</span>
            <input
              value={draft.trackDuration}
              maxLength={12}
              placeholder="for example · 3:42"
              onChange={(event) =>
                onDraftChange("trackDuration", event.target.value)
              }
            />
          </label>

          <label className="annotation-time-field">
            <span>annotation time</span>
            <div>
              <input
                type="number"
                min="1"
                step="1"
                value={draft.annotationMinutes}
                placeholder="minutes"
                onChange={(event) =>
                  onDraftChange(
                    "annotationMinutes",
                    event.target.value
                  )
                }
              />
              <span>minutes</span>
            </div>
          </label>
        </div>

        <fieldset className="annotation-mood-field">
          <legend>how did the track make you feel?</legend>
          <div className="annotation-mood-options">
            {annotationMoodOptions.map((mood) => {
              const selected = draft.mood === mood.id;

              return (
                <button
                  key={mood.id}
                  className={
                    selected ? "annotation-mood-selected" : ""
                  }
                  type="button"
                  aria-label={mood.label}
                  aria-pressed={selected}
                  title={mood.label}
                  onClick={() => onDraftChange("mood", mood.id)}
                >
                  <img src={mood.image} alt="" />
                  {selected && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="annotation-note-field">
          <span>small note</span>
          <textarea
            value={draft.note}
            maxLength={500}
            rows={3}
            placeholder="anything useful you want to remember"
            onChange={(event) =>
              onDraftChange("note", event.target.value)
            }
          />
        </label>

        <div className="annotation-modal-footer">
          <p>{error}</p>
          <div>
            <button
              className="annotation-cancel-button"
              type="button"
              onClick={onClose}
            >
              not yet
            </button>
            <button
              className="annotation-save-button"
              type="button"
              onClick={onSave}
            >
              save annotation
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
