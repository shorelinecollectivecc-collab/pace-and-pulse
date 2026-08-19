import { useMemo, useState } from "react";
import { useAppSettings } from "./AppSettingsContext";
import type { VideoAnnotationRecord } from "./VideoRhythmPage";
import { getVideoRecordEarningsUsd } from "./utils/videoEarnings";
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
import "./WorkTrailPage.css";

type AnnotationMood =
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

type MusicAnnotationRecord = {
  id: string;
  createdAt: string;
  dateKey: string;
  weekKey: string;
  monthKey: string;
  trackName: string;
  artist: string;
  spotifyId: string;
  trackDuration: string;
  mood: AnnotationMood | null;
  note: string;
  annotationMinutes: number;
  earningsUsd: number;
};

type WorkTrailPageProps = {
  annotations: MusicAnnotationRecord[];
  videoAnnotations: VideoAnnotationRecord[];
};

type TrailAnnotation = {
  id: string;
  kind: "music" | "video";
  createdAt: string;
  dateKey: string;
  weekKey: string;
  monthKey: string;
  title: string;
  secondary: string;
  externalId: string;
  duration: string;
  mood: AnnotationMood | null;
  note: string;
  annotationMinutes: number;
  earningsUsd: number;
};

type TrailRange = "today" | "week" | "month" | "all";
type SortOrder = "newest" | "oldest";
type MediaFilter = "all" | "music" | "video";

const moodDetails: Record<
  AnnotationMood,
  { label: string; image: string }
> = {
  cool: { label: "cool", image: coolMood },
  energised: { label: "energised", image: fireMood },
  "happy-tears": {
    label: "happy tears",
    image: happyTearsMood,
  },
  "in-love": { label: "in love", image: inLoveMood },
  open: { label: "open", image: openMood },
  surprised: { label: "surprised", image: wowMood },
  angry: { label: "angry", image: angryMood },
  tearful: { label: "tearful", image: tearfulMood },
  confused: { label: "confused", image: confusedMood },
  sick: { label: "sick", image: sickMood },
  shy: { label: "shy", image: shyMood },
  playful: { label: "playful", image: playfulMood },
};

const rangeOptions: Array<{
  id: TrailRange;
  label: string;
}> = [
  { id: "today", label: "today" },
  { id: "week", label: "this week" },
  { id: "month", label: "this month" },
  { id: "all", label: "all time" },
];

function getDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA").format(date);
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

function formatDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);

  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(date)
    .toLowerCase();
}

function formatTime(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDuration(totalMinutes: number) {
  const roundedMinutes = Math.round(totalMinutes);
  return `${roundedMinutes} min`;
}

function formatMonth(monthKey: string) {
  const date = new Date(`${monthKey}-01T12:00:00`);

  return new Intl.DateTimeFormat("en-ZA", {
    month: "long",
    year: "numeric",
  })
    .format(date)
    .toLowerCase();
}

export default function WorkTrailPage({
  annotations,
  videoAnnotations,
}: WorkTrailPageProps) {
  const { settings, formatCurrency } = useAppSettings();
  const trailAnnotations = useMemo<TrailAnnotation[]>(
    () => [
      ...annotations.map((annotation) => ({
        id: annotation.id,
        kind: "music" as const,
        createdAt: annotation.createdAt,
        dateKey: annotation.dateKey,
        weekKey: annotation.weekKey,
        monthKey: annotation.monthKey,
        title: annotation.trackName,
        secondary: annotation.artist,
        externalId: annotation.spotifyId,
        duration: annotation.trackDuration,
        mood: annotation.mood,
        note: annotation.note,
        annotationMinutes:
          annotation.annotationMinutes,
        earningsUsd: Number(
          annotation.earningsUsd || 0
        ),
      })),
      ...videoAnnotations.map((annotation) => ({
        id: annotation.id,
        kind: "video" as const,
        createdAt: annotation.createdAt,
        dateKey: annotation.dateKey,
        weekKey: annotation.weekKey,
        monthKey: annotation.monthKey,
        title:
          annotation.contentId ||
          annotation.videoType ||
          "video annotation",
        secondary: annotation.videoType,
        externalId: annotation.contentId,
        duration: annotation.videoDuration,
        mood: annotation.mood,
        note: annotation.note,
        annotationMinutes:
          annotation.annotationMinutes,
        earningsUsd:
          getVideoRecordEarningsUsd(annotation),
      })),
    ],
    [annotations, videoAnnotations]
  );
  const [activeRange, setActiveRange] =
    useState<TrailRange>("today");
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] =
    useState<SortOrder>("newest");
  const [mediaFilter, setMediaFilter] =
    useState<MediaFilter>("all");
  const [monthMenuOpen, setMonthMenuOpen] =
    useState(false);
  const currentMonthKey = getMonthKey(new Date());
  const [selectedMonth, setSelectedMonth] =
    useState(currentMonthKey);

  const monthOptions = useMemo(() => {
    return Array.from(
      new Set([
        currentMonthKey,
        ...trailAnnotations.map(
          (annotation) => annotation.monthKey
        ),
      ])
    )
      .filter(Boolean)
      .sort((first, second) =>
        second.localeCompare(first)
      );
  }, [currentMonthKey, trailAnnotations]);

  const filteredAnnotations = useMemo(() => {
    const now = new Date();
    const todayKey = getDateKey(now);
    const weekKey = getWeekKey(now);
    const search = searchText.trim().toLowerCase();

    return trailAnnotations
      .filter((annotation) => {
        if (
          mediaFilter !== "all" &&
          annotation.kind !== mediaFilter
        ) {
          return false;
        }

        const inSelectedRange =
          activeRange === "all" ||
          (activeRange === "today" &&
            annotation.dateKey === todayKey) ||
          (activeRange === "week" &&
            annotation.weekKey === weekKey) ||
          (activeRange === "month" &&
            annotation.monthKey === selectedMonth);

        if (!inSelectedRange) {
          return false;
        }

        if (!search) {
          return true;
        }

        return [
          annotation.title,
          annotation.secondary,
          annotation.externalId,
          annotation.note,
          annotation.kind,
        ].some((value) =>
          value.toLowerCase().includes(search)
        );
      })
      .sort((first, second) => {
        const firstTime = new Date(
          first.createdAt
        ).getTime();
        const secondTime = new Date(
          second.createdAt
        ).getTime();

        return sortOrder === "newest"
          ? secondTime - firstTime
          : firstTime - secondTime;
      });
  }, [
    activeRange,
    mediaFilter,
    trailAnnotations,
    searchText,
    selectedMonth,
    sortOrder,
  ]);

  const groupedAnnotations = useMemo(() => {
    const groups = new Map<
      string,
      TrailAnnotation[]
    >();

    filteredAnnotations.forEach((annotation) => {
      const currentGroup =
        groups.get(annotation.dateKey) ?? [];

      currentGroup.push(annotation);
      groups.set(annotation.dateKey, currentGroup);
    });

    return Array.from(groups.entries());
  }, [filteredAnnotations]);

  const totals = useMemo(() => {
    const music = filteredAnnotations.filter(
      (annotation) => annotation.kind === "music"
    );
    const video = filteredAnnotations.filter(
      (annotation) => annotation.kind === "video"
    );
    const musicMinutes = music.reduce(
      (total, annotation) =>
        total + annotation.annotationMinutes,
      0
    );
    const videoMinutes = video.reduce(
      (total, annotation) =>
        total + annotation.annotationMinutes,
      0
    );

    return {
      musicCount: music.length,
      videoCount: video.length,
      musicMinutes,
      videoMinutes,
      musicAverageMinutes:
        music.length > 0
          ? musicMinutes / music.length
          : 0,
      videoAverageMinutes:
        video.length > 0
          ? videoMinutes / video.length
          : 0,
      musicEarningsUsd: music.reduce(
        (total, annotation) =>
          total + annotation.earningsUsd,
        0
      ),
      videoEarningsUsd: video.reduce(
        (total, annotation) =>
          total + annotation.earningsUsd,
        0
      ),
    };
  }, [filteredAnnotations]);

  const activeRangeLabel =
    activeRange === "month"
      ? formatMonth(selectedMonth)
      : rangeOptions.find(
          (option) => option.id === activeRange
        )?.label ?? "today";
  const visibleCount =
    totals.musicCount + totals.videoCount;

  return (
    <section className="work-trail-page">
      <header className="work-trail-heading">
        <div>
          <p>my work trail</p>
          <h2>every annotation leaves a little mark</h2>
        </div>

        <span>
          showing {activeRangeLabel}
        </span>
      </header>

      <section className="trail-summary">
        <div className="trail-summary-intro">
          <p>your work so far</p>
          <h3>
            {visibleCount === 0
              ? "a clear space for the next annotation"
              : `${visibleCount} ${
                  visibleCount === 1
                    ? "annotation"
                    : "annotations"
                } shown without mixing the jobs`}
          </h3>
        </div>

        <div className="trail-stat trail-project-stat">
          <span>music job</span>
          <strong>{totals.musicCount}</strong>
          <small>
            {formatDuration(totals.musicMinutes)}
          </small>
        </div>

        <div className="trail-stat trail-project-stat">
          <span>music average pace</span>
          <strong>
            {totals.musicCount > 0
              ? `${Math.round(
                  totals.musicAverageMinutes
                )} min`
              : "—"}
          </strong>
          <small>
            {formatCurrency(totals.musicEarningsUsd)}
          </small>
        </div>

        <div className="trail-stat trail-project-stat">
          <span>video job</span>
          <strong>{totals.videoCount}</strong>
          <small>
            {formatDuration(totals.videoMinutes)}
          </small>
        </div>

        <div className="trail-stat trail-project-stat trail-earnings-stat">
          <span>video average pace</span>
          <strong>
            {totals.videoCount > 0
              ? `${Math.round(
                  totals.videoAverageMinutes
                )} min`
              : "—"}
          </strong>
          <small>
            {settings.videoAnnotationRateUsd.trim() === ""
              ? "rate not set"
              : formatCurrency(totals.videoEarningsUsd)}
          </small>
        </div>
      </section>

      <section className="trail-controls">
        <div
          className="trail-range-options"
          aria-label="annotation date range"
        >
          {rangeOptions.map((option) => {
            if (option.id === "month") {
              return (
                <div
                  className="trail-month-control"
                  key={option.id}
                >
                  <button
                    className={
                      activeRange === "month"
                        ? "trail-range-active"
                        : ""
                    }
                    type="button"
                    aria-pressed={
                      activeRange === "month"
                    }
                    aria-expanded={monthMenuOpen}
                    onClick={() => {
                      setActiveRange("month");
                      setMonthMenuOpen(
                        (current) => !current
                      );
                    }}
                  >
                    this month
                  </button>

                  {monthMenuOpen && (
                    <div className="trail-month-menu">
                      <p>choose a month</p>

                      {monthOptions.map((monthKey) => (
                        <button
                          className={
                            selectedMonth === monthKey
                              ? "trail-month-selected"
                              : ""
                          }
                          key={monthKey}
                          type="button"
                          onClick={() => {
                            setSelectedMonth(monthKey);
                            setActiveRange("month");
                            setMonthMenuOpen(false);
                          }}
                        >
                          {formatMonth(monthKey)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={option.id}
                className={
                  activeRange === option.id
                    ? "trail-range-active"
                    : ""
                }
                type="button"
                aria-pressed={
                  activeRange === option.id
                }
                onClick={() => {
                  setActiveRange(option.id);
                  setMonthMenuOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div
          className="trail-kind-options"
          aria-label="annotation type"
        >
          {(["all", "music", "video"] as MediaFilter[]).map(
            (kind) => (
              <button
                key={kind}
                className={
                  mediaFilter === kind
                    ? "trail-kind-active"
                    : ""
                }
                type="button"
                aria-pressed={mediaFilter === kind}
                onClick={() => setMediaFilter(kind)}
              >
                {kind === "all" ? "all work" : kind}
              </button>
            )
          )}
        </div>

        <label className="trail-search">
          <span>find an annotation</span>
          <input
            type="search"
            value={searchText}
            placeholder="track, video, artist, type, id or note"
            onChange={(event) =>
              setSearchText(event.target.value)
            }
          />
        </label>

        <button
          className="trail-sort-button"
          type="button"
          onClick={() =>
            setSortOrder((current) =>
              current === "newest"
                ? "oldest"
                : "newest"
            )
          }
        >
          {sortOrder === "newest"
            ? "newest first"
            : "oldest first"}
        </button>
      </section>

      {groupedAnnotations.length === 0 ? (
        <section className="trail-empty-state">
          <span>♪</span>
          <div>
            <p>nothing here yet</p>
            <h3>
              your next saved annotation will
              appear here
            </h3>
            <small>
              the empty space is not a failure —
              it is simply where you begin
            </small>
          </div>
        </section>
      ) : (
        <div className="trail-days">
          {groupedAnnotations.map(
            ([dateKey, dayAnnotations]) => {
              const dayMinutes =
                dayAnnotations.reduce(
                  (total, annotation) =>
                    total +
                    annotation.annotationMinutes,
                  0
                );
              const musicDay = dayAnnotations.filter(
                (annotation) =>
                  annotation.kind === "music"
              );
              const videoDay = dayAnnotations.filter(
                (annotation) =>
                  annotation.kind === "video"
              );
              const musicDayEarnings = musicDay.reduce(
                (total, annotation) =>
                  total + annotation.earningsUsd,
                0
              );
              const videoDayEarnings = videoDay.reduce(
                (total, annotation) =>
                  total + annotation.earningsUsd,
                0
              );

              return (
                <section
                  className="trail-day"
                  key={dateKey}
                >
                  <div className="trail-day-heading">
                    <div>
                      <p>{formatDate(dateKey)}</p>
                      <span>
                        {dayAnnotations.length}{" "}
                        {dayAnnotations.length === 1
                          ? "annotation"
                          : "annotations"}{" "}
                        ·{" "}
                        {formatDuration(dayMinutes)}
                      </span>
                    </div>

                    <div className="trail-day-project-totals">
                      <span>
                        music · {musicDay.length} ·{" "}
                        {formatCurrency(musicDayEarnings)}
                      </span>
                      <span>
                        video · {videoDay.length} ·{" "}
                        {settings.videoAnnotationRateUsd.trim() === ""
                          ? "rate not set"
                          : formatCurrency(videoDayEarnings)}
                      </span>
                    </div>
                  </div>

                  <div className="trail-entries">
                    {dayAnnotations.map(
                      (annotation, index) => {
                        const mood =
                          annotation.mood
                            ? moodDetails[
                                annotation.mood
                              ]
                            : null;

                        return (
                          <article
                            className="trail-entry"
                            key={annotation.id}
                          >
                            <span className="trail-entry-number">
                              {String(
                                index + 1
                              ).padStart(2, "0")}
                            </span>

                            <div className="trail-track">
                              <strong>
                                {annotation.title}
                              </strong>
                              <span>
                                {annotation.kind === "video"
                                  ? `video · ${
                                      annotation.secondary ||
                                      "type not added"
                                    }`
                                  : `music · ${
                                      annotation.secondary ||
                                      "artist not added"
                                    }`}
                              </span>
                            </div>

                            <div className="trail-entry-detail">
                              <span>
                                {annotation.kind === "video"
                                  ? "video id"
                                  : "spotify id"}
                              </span>
                              <strong>
                                {annotation.externalId ||
                                  "not added"}
                              </strong>
                            </div>

                            <div className="trail-entry-detail">
                              <span>
                                {annotation.kind === "video"
                                  ? "video length"
                                  : "track length"}
                              </span>
                              <strong>
                                {annotation.duration ||
                                  "not added"}
                              </strong>
                            </div>

                            <div className="trail-entry-detail">
                              <span>annotation time</span>
                              <strong>
                                {
                                  annotation.annotationMinutes
                                }{" "}
                                min
                              </strong>
                            </div>

                            <div className="trail-entry-mood">
                              {mood ? (
                                <>
                                  <img
                                    src={mood.image}
                                    alt=""
                                  />
                                  <span>
                                    {mood.label}
                                  </span>
                                </>
                              ) : (
                                <span>
                                  no feeling chosen
                                </span>
                              )}
                            </div>

                            <div className="trail-entry-earning">
                              <strong>
                                {annotation.kind === "video" &&
                                settings.videoAnnotationRateUsd.trim() === "" &&
                                annotation.earningsUsd === 0
                                  ? "rate not set"
                                  : formatCurrency(
                                      annotation.earningsUsd
                                    )}
                              </strong>
                            </div>

                            <time
                              dateTime={
                                annotation.createdAt
                              }
                            >
                              {formatTime(
                                annotation.createdAt
                              )}
                            </time>

                            {annotation.note && (
                              <p className="trail-entry-note">
                                <span>little note</span>
                                {annotation.note}
                              </p>
                            )}
                          </article>
                        );
                      }
                    )}
                  </div>
                </section>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}
