import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import angryMood from "./assets/moods/grumpy-emoji.png";
import confusedMood from "./assets/moods/confused-emoji.png";
import coolMood from "./assets/moods/cool-emoji.png";
import fireMood from "./assets/moods/fire-emoji.png";
import happyTearsMood from "./assets/moods/sincere-emoji.png";
import inLoveMood from "./assets/moods/in-love-emoji.png";
import openMood from "./assets/moods/hooray-emoji.png";
import playfulMood from "./assets/moods/silly-emoji.png";
import shyMood from "./assets/moods/shy-emoji.png";
import sickMood from "./assets/moods/ill-emoji.png";
import tearfulMood from "./assets/moods/cry-emoji.png";
import wowMood from "./assets/moods/wow-emoji.png";
import DailyRhythmTools from "./DailyRhythmTools";
import { useAppSettings } from "./AppSettingsContext";
import { VIDEO_LOG_STORAGE_KEY } from "./constants/video";
import {
  BONUS_VIDEO_HOURLY_RATE_USD,
  STANDARD_VIDEO_HOURLY_RATE_USD,
  calculateVideoEarningsUsd,
  calculateVideoRecordsEarningsUsd,
  formatVideoPayRate,
  getVideoPayMode,
  getVideoPayRateUsd,
  parseVideoDurationToMilliseconds,
  type VideoPayMode,
} from "./utils/videoEarnings";

type VideoMood =
  | "cool"
  | "energised"
  | "happy-tears"
  | "in-love"
  | "open"
  | "surprised"
  | "angry"
  | "tearful"
  | "confused"
  | "sick"
  | "shy"
  | "playful";

export type VideoAnnotationRecord = {
  id: string;
  createdAt: string;
  dateKey: string;
  weekKey: string;
  monthKey: string;
  videoType: string;
  contentId: string;
  videoDuration: string;
  mood: VideoMood | null;
  note: string;
  annotationMinutes: number;
  payMode: VideoPayMode;
  payRateUsd: number;
  hourlyRateUsd?: number;
  earningsUsd: number | null;
};

type VideoDraft = {
  videoType: string;
  contentId: string;
  videoDuration: string;
  mood: VideoMood | null;
  note: string;
  annotationMinutes: string;
  payMode: VideoPayMode;
  payRateUsd: string;
};

type VideoRhythmPageProps = {
  formattedDate: string;
  themeName: string;
  themeDescription: string;
  themeBanner: string;
  annotations: VideoAnnotationRecord[];
  onAnnotationsChange: Dispatch<
    SetStateAction<VideoAnnotationRecord[]>
  >;
};

const videoMoodOptions: Array<{
  id: VideoMood;
  label: string;
  image: string;
}> = [
  { id: "cool", label: "cool", image: coolMood },
  {
    id: "energised",
    label: "energised",
    image: fireMood,
  },
  {
    id: "happy-tears",
    label: "happy tears",
    image: happyTearsMood,
  },
  {
    id: "in-love",
    label: "in love",
    image: inLoveMood,
  },
  { id: "open", label: "open", image: openMood },
  {
    id: "surprised",
    label: "surprised",
    image: wowMood,
  },
  {
    id: "angry",
    label: "angry",
    image: angryMood,
  },
  {
    id: "tearful",
    label: "tearful",
    image: tearfulMood,
  },
  {
    id: "confused",
    label: "confused",
    image: confusedMood,
  },
  { id: "sick", label: "sick", image: sickMood },
  { id: "shy", label: "shy", image: shyMood },
  {
    id: "playful",
    label: "playful",
    image: playfulMood,
  },
];

const emptyVideoDraft: VideoDraft = {
  videoType: "",
  contentId: "",
  videoDuration: "",
  mood: null,
  note: "",
  annotationMinutes: "",
  payMode: "per-hour",
  payRateUsd: "20",
};

function getDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

function getTodayKey() {
  return getDateKey(new Date());
}

function getMonthKey(date: Date) {
  return getDateKey(date).slice(0, 7);
}

function getWeekKey(date: Date) {
  const workingDate = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    )
  );

  const dayNumber = workingDate.getUTCDay() || 7;

  workingDate.setUTCDate(
    workingDate.getUTCDate() + 4 - dayNumber
  );

  const yearStart = new Date(
    Date.UTC(workingDate.getUTCFullYear(), 0, 1)
  );

  const weekNumber = Math.ceil(
    ((workingDate.getTime() - yearStart.getTime()) /
      86400000 +
      1) /
      7
  );

  return `${workingDate.getUTCFullYear()}-w${String(
    weekNumber
  ).padStart(2, "0")}`;
}

function makeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

export function loadVideoAnnotations(): VideoAnnotationRecord[] {
  try {
    const saved = localStorage.getItem(VIDEO_LOG_STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed =
      JSON.parse(saved) as VideoAnnotationRecord[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((annotation) => {
      const createdAt = new Date(annotation.createdAt);

      if (Number.isNaN(createdAt.getTime())) {
        return annotation;
      }

      const payMode =
        getVideoPayMode(annotation);
      const payRateUsd =
        getVideoPayRateUsd(annotation);

      return {
        ...annotation,
        dateKey: getDateKey(createdAt),
        weekKey: getWeekKey(createdAt),
        monthKey: getMonthKey(createdAt),
        payMode,
        payRateUsd,
        hourlyRateUsd:
          payMode === "per-hour"
            ? payRateUsd
            : undefined,
        earningsUsd: calculateVideoEarningsUsd(
          annotation.videoDuration,
          payRateUsd,
          payMode
        ),
      };
    });
  } catch {
    return [];
  }
}

export default function VideoRhythmPage({
  formattedDate,
  themeName,
  themeDescription,
  themeBanner,
  annotations,
  onAnnotationsChange,
}: VideoRhythmPageProps) {
  const { settings, formatCurrency } = useAppSettings();

  const dailyGoal = settings.videoDailyTarget;

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] =
    useState<VideoDraft>(emptyVideoDraft);
  const [error, setError] = useState("");
  const [showUndo, setShowUndo] = useState(false);
  const [payMethodOpen, setPayMethodOpen] =
    useState(false);

  const todayAnnotations = annotations.filter(
    (annotation) => annotation.dateKey === getTodayKey()
  );

  const annotationCount = todayAnnotations.length;

  const progress = Math.min(
    (annotationCount / dailyGoal) * 100,
    100
  );

  const usdEarnings =
    calculateVideoRecordsEarningsUsd(todayAnnotations);

  const formattedEarnings = formatCurrency(usdEarnings);

  const formattedUsd =
    `$${usdEarnings.toFixed(2)}`.toLowerCase();


  const todayRates = Array.from(
    new Set(
      todayAnnotations.map(
        (annotation) =>
          formatVideoPayRate(annotation)
      )
    )
  );

  const rateSummary =
    todayRates.length === 0
      ? `$${STANDARD_VIDEO_HOURLY_RATE_USD.toFixed(2)}/hr`
      : todayRates.length === 1
        ? todayRates[0]
        : "mixed rates";

  useEffect(() => {
    if (!settings.autoSaveEnabled) {
      return;
    }

    const now = new Date();
    const todayKey = getTodayKey();
    const weekKey = getWeekKey(now);
    const monthKey = getMonthKey(now);

    localStorage.setItem(
      VIDEO_LOG_STORAGE_KEY,
      JSON.stringify(annotations)
    );

    localStorage.setItem(
      `pace-pulse-video-daily-log-${todayKey}`,
      JSON.stringify(
        annotations.filter(
          (annotation) =>
            annotation.dateKey === todayKey
        )
      )
    );

    localStorage.setItem(
      `pace-pulse-video-weekly-log-${weekKey}`,
      JSON.stringify(
        annotations.filter(
          (annotation) =>
            annotation.weekKey === weekKey
        )
      )
    );

    localStorage.setItem(
      `pace-pulse-video-monthly-log-${monthKey}`,
      JSON.stringify(
        annotations.filter(
          (annotation) =>
            annotation.monthKey === monthKey
        )
      )
    );
  }, [annotations, settings.autoSaveEnabled]);

  useEffect(() => {
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModalOpen(false);
        setPayMethodOpen(false);
        setError("");
      }
    }

    window.addEventListener(
      "keydown",
      closeWithEscape
    );

    return () =>
      window.removeEventListener(
        "keydown",
        closeWithEscape
      );
  }, []);

  function updateDraft<K extends keyof VideoDraft>(
    field: K,
    value: VideoDraft[K]
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openModal() {
    setDraft(emptyVideoDraft);
    setError("");
    setPayMethodOpen(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setPayMethodOpen(false);
    setError("");
  }

  function saveAnnotation() {
    if (!draft.videoType.trim()) {
      setError("add the video type first");
      return;
    }

    const durationMilliseconds =
      parseVideoDurationToMilliseconds(
        draft.videoDuration
      );

    if (
      durationMilliseconds === null ||
      durationMilliseconds <= 0
    ) {
      setError(
        "add video duration as 00:00:00:0"
      );
      return;
    }

    const payRateUsd = Number(
      draft.payRateUsd
    );

    if (
      !Number.isFinite(payRateUsd) ||
      payRateUsd <= 0
    ) {
      setError(
        draft.payMode === "per-video"
          ? "add the pay amount per video"
          : "add the hourly video rate"
      );
      return;
    }

    const annotationMinutes = Number(
      draft.annotationMinutes
    );

    if (
      !Number.isFinite(annotationMinutes) ||
      annotationMinutes <= 0
    ) {
      setError(
        "add how many minutes the annotation took"
      );
      return;
    }

    const now = new Date();

    const record: VideoAnnotationRecord = {
      id: makeId(),
      createdAt: now.toISOString(),
      dateKey: getDateKey(now),
      weekKey: getWeekKey(now),
      monthKey: getMonthKey(now),
      videoType: draft.videoType.trim(),
      contentId: draft.contentId.trim(),
      videoDuration: draft.videoDuration.trim(),
      mood: draft.mood,
      note: draft.note.trim(),
      annotationMinutes,
      payMode: draft.payMode,
      payRateUsd,
      hourlyRateUsd:
        draft.payMode === "per-hour"
          ? payRateUsd
          : undefined,
      earningsUsd: calculateVideoEarningsUsd(
        draft.videoDuration,
        payRateUsd,
        draft.payMode
      ),
    };

    onAnnotationsChange((current) => [
      ...current,
      record,
    ]);

    if (
      settings.notificationsEnabled &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("pace & pulse", {
        body: `video annotation safely logged · ${annotationCount + 1} of ${dailyGoal}`,
      });
    }

    setModalOpen(false);
    setDraft(emptyVideoDraft);
    setError("");
    setShowUndo(true);
  }

  function undoLastAnnotation() {
    const latest = [...todayAnnotations].sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime()
    )[0];

    if (!latest) {
      return;
    }

    onAnnotationsChange((current) =>
      current.filter(
        (annotation) => annotation.id !== latest.id
      )
    );

    setShowUndo(false);
  }

  function getProgressMessage() {
    if (annotationCount === 0) {
      return "start when you feel ready";
    }

    if (annotationCount < dailyGoal) {
      return `${dailyGoal - annotationCount} remaining today`;
    }

    if (annotationCount === dailyGoal) {
      return "today’s pace is complete";
    }

    return `${annotationCount - dailyGoal} beyond today’s pace`;
  }

  return (
    <>
      <header className="page-header">
        <h2>find your frame</h2>
        <time>{formattedDate}</time>
      </header>

      <section className="workspace-banner">
        <img src={themeBanner} alt="" />

        <div className="workspace-banner-shade" />

        <div className="workspace-banner-copy">
          <p>{themeName}</p>
          <span>{themeDescription}</span>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="progress-card">
          <div className="card-heading">
            <div>
              <p>daily video annotations</p>
              <h3>one frame at a time</h3>
            </div>

            <span className="saving-status">
              <span />

              {settings.autoSaveEnabled
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
            aria-label="daily video annotation progress"
            aria-valuemin={0}
            aria-valuemax={dailyGoal}
            aria-valuenow={annotationCount}
          >
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="progress-message">
            {getProgressMessage()}
          </p>

          <div className="annotation-actions">
            <button
              className="add-button"
              type="button"
              onClick={openModal}
            >
              <span>+</span>
              add video annotation
            </button>

            <div className="undo-space">
              {showUndo && annotationCount > 0 && (
                <button
                  className="undo-button"
                  type="button"
                  onClick={undoLastAnnotation}
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

            {settings.currency !== "USD" && (
              <span>{formattedUsd}</span>
            )}
          </div>

          <div className="earnings-detail">
            <div>
              <span>completed</span>
              <strong>{annotationCount}</strong>
            </div>

            <div>
              <span>video rate</span>
              <strong>{rateSummary}</strong>
            </div>
          </div>

          <p className="earnings-note">
            {`default · $${STANDARD_VIDEO_HOURLY_RATE_USD}/hour by video duration · $${BONUS_VIDEO_HOURLY_RATE_USD}/hour bonus · per-video pay can be selected when needed`}
          </p>
        </article>
      </section>

      <DailyRhythmTools
        annotationCount={annotationCount}
      />

      {modalOpen && (
        <div
          className="annotation-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <section
            className="annotation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-modal-title"
          >
            <div className="annotation-modal-heading">
              <div>
                <p>one frame at a time</p>

                <h2 id="video-modal-title">
                  save this video annotation
                </h2>
              </div>

              <button
                type="button"
                aria-label="close video annotation form"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="annotation-form-grid">

              <label>
                <span>video type</span>

                <input
                  autoFocus
                  value={draft.videoType}
                  maxLength={80}
                  placeholder="video type"
                  onChange={(event) =>
                    updateDraft(
                      "videoType",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                <span>video id</span>

                <input
                  value={draft.contentId}
                  maxLength={120}
                  placeholder="video or content id"
                  onChange={(event) =>
                    updateDraft(
                      "contentId",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                <span>video duration · hh:mm:ss:ms</span>

                <input
                  value={draft.videoDuration}
                  maxLength={20}
                  inputMode="numeric"
                  placeholder="00:00:00:0"
                  onChange={(event) =>
                    updateDraft(
                      "videoDuration",
                      event.target.value
                    )
                  }
                />
              </label>

              <div className="annotation-pay-method-field">
                <span>pay method</span>

                <div
                  className={
                    payMethodOpen
                      ? "annotation-pay-select open"
                      : "annotation-pay-select"
                  }
                >
                  <button
                    className="annotation-pay-select-trigger"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={payMethodOpen}
                    onClick={() =>
                      setPayMethodOpen(
                        (current) => !current
                      )
                    }
                  >
                    <span>
                      {draft.payMode === "per-video"
                        ? "per video"
                        : "per hour"}
                    </span>

                    <span
                      className="annotation-pay-chevron"
                      aria-hidden="true"
                    />
                  </button>

                  {payMethodOpen && (
                    <div
                      className="annotation-pay-options"
                      role="listbox"
                      aria-label="pay method"
                    >
                      {(
                        [
                          {
                            id: "per-hour",
                            label: "per hour",
                          },
                          {
                            id: "per-video",
                            label: "per video",
                          },
                        ] as Array<{
                          id: VideoPayMode;
                          label: string;
                        }>
                      ).map((option) => {
                        const selected =
                          draft.payMode ===
                          option.id;

                        return (
                          <button
                            key={option.id}
                            className={
                              selected
                                ? "annotation-pay-option selected"
                                : "annotation-pay-option"
                            }
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setDraft(
                                (current) => ({
                                  ...current,
                                  payMode:
                                    option.id,
                                  payRateUsd:
                                    option.id ===
                                    "per-hour"
                                      ? "20"
                                      : "",
                                })
                              );

                              setPayMethodOpen(
                                false
                              );
                            }}
                          >
                            <span>
                              {option.label}
                            </span>

                            {selected && (
                              <span
                                className="annotation-pay-check"
                                aria-hidden="true"
                              >
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <label>
                <span>
                  {draft.payMode === "per-video"
                    ? "pay per video"
                    : "video hourly rate"}
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draft.payRateUsd}
                  placeholder={
                    draft.payMode === "per-video"
                      ? "for example · 2.50"
                      : "20 standard · 40 bonus"
                  }
                  onChange={(event) =>
                    updateDraft(
                      "payRateUsd",
                      event.target.value
                    )
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
                      updateDraft(
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
              <legend>
                how did the video make you feel?
              </legend>

              <div className="annotation-mood-options">
                {videoMoodOptions.map((mood) => {
                  const selected =
                    draft.mood === mood.id;

                  return (
                    <button
                      key={mood.id}
                      className={
                        selected
                          ? "annotation-mood-selected"
                          : ""
                      }
                      type="button"
                      aria-label={mood.label}
                      aria-pressed={selected}
                      title={mood.label}
                      onClick={() =>
                        updateDraft("mood", mood.id)
                      }
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
                  updateDraft(
                    "note",
                    event.target.value
                  )
                }
              />
            </label>

            <div className="annotation-modal-footer">
              <p>{error}</p>

              <div>
                <button
                  className="annotation-cancel-button"
                  type="button"
                  onClick={closeModal}
                >
                  not yet
                </button>

                <button
                  className="annotation-save-button"
                  type="button"
                  onClick={saveAnnotation}
                >
                  save video annotation
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
