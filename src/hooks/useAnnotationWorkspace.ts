import { useEffect, useMemo, useState } from "react";
import type { SpotifyAnnotationTrack } from "../SpotifyFloatingPlayer";
import {
  USD_PER_ANNOTATION,
  emptyAnnotationDraft,
} from "../constants/app";
import type {
  AnnotationDraft,
  AnnotationRecord,
} from "../types/app";
import { getDateKey, getTodayKey, getWeekKey, getMonthKey } from "../utils/dateKeys";
import { loadAnnotations, saveAnnotations } from "../services/annotations/annotationStorageService";

type UseAnnotationWorkspaceOptions = {
  dailyGoal: number;
  autoSaveEnabled: boolean;
  notificationsEnabled: boolean;
};

export function useAnnotationWorkspace({
  dailyGoal,
  autoSaveEnabled,
  notificationsEnabled,
}: UseAnnotationWorkspaceOptions) {
  const [annotations, setAnnotations] =
    useState<AnnotationRecord[]>(loadAnnotations);
  const [annotationModalOpen, setAnnotationModalOpen] =
    useState(false);
  const [annotationDraft, setAnnotationDraft] =
    useState<AnnotationDraft>(emptyAnnotationDraft);
  const [annotationError, setAnnotationError] = useState("");
  const [showUndo, setShowUndo] = useState(false);

  const todayAnnotations = useMemo(
    () =>
      annotations.filter(
        (annotation) => annotation.dateKey === getTodayKey()
      ),
    [annotations]
  );

  const annotationCount = todayAnnotations.length;
  const progress = Math.min(
    (annotationCount / dailyGoal) * 100,
    100
  );
  const usdEarnings = annotationCount * USD_PER_ANNOTATION;

  useEffect(() => {
    if (!autoSaveEnabled) {
      return;
    }

    saveAnnotations(annotations);
  }, [annotations, annotationCount, autoSaveEnabled]);

  function openAnnotationModal() {
    setAnnotationDraft(emptyAnnotationDraft);
    setAnnotationError("");
    setAnnotationModalOpen(true);
  }

  function closeAnnotationModal() {
    setAnnotationModalOpen(false);
    setAnnotationError("");
  }

  function useSpotifyTrackForAnnotation(
    track: SpotifyAnnotationTrack
  ) {
    const totalSeconds = Math.floor(track.durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    setAnnotationDraft({
      ...emptyAnnotationDraft,
      trackName: track.name,
      artist: track.artist,
      spotifyId: track.id,
      trackDuration: `${minutes}:${String(seconds).padStart(
        2,
        "0"
      )}`,
    });
    setAnnotationError("");
    setAnnotationModalOpen(true);
  }

  function updateAnnotationDraft<K extends keyof AnnotationDraft>(
    field: K,
    value: AnnotationDraft[K]
  ) {
    setAnnotationDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function saveAnnotation() {
    if (!annotationDraft.trackName.trim()) {
      setAnnotationError("add the track name first");
      return;
    }

    if (!annotationDraft.artist.trim()) {
      setAnnotationError("add the artist first");
      return;
    }

    const annotationMinutes = Number(
      annotationDraft.annotationMinutes
    );

    if (
      !Number.isFinite(annotationMinutes) ||
      annotationMinutes <= 0
    ) {
      setAnnotationError(
        "add how many minutes the annotation took"
      );
      return;
    }

    const now = new Date();
    const record: AnnotationRecord = {
      id:
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${now.getTime()}-${Math.random()}`,
      createdAt: now.toISOString(),
      dateKey: getDateKey(now),
      weekKey: getWeekKey(now),
      monthKey: getMonthKey(now),
      trackName: annotationDraft.trackName.trim(),
      artist: annotationDraft.artist.trim(),
      spotifyId: annotationDraft.spotifyId.trim(),
      trackDuration: annotationDraft.trackDuration.trim(),
      mood: annotationDraft.mood,
      note: annotationDraft.note.trim(),
      annotationMinutes,
      earningsUsd: USD_PER_ANNOTATION,
    };

    setAnnotations((current) => [...current, record]);

    if (
      notificationsEnabled &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("pace & pulse", {
        body: `${annotationDraft.trackName.trim()} is safely logged · ${annotationCount + 1} of ${dailyGoal}`,
      });
    }

    setShowUndo(true);
    setAnnotationModalOpen(false);
    setAnnotationDraft(emptyAnnotationDraft);
    setAnnotationError("");
  }

  function undoLastAnnotation() {
    const lastTodayAnnotation = [...todayAnnotations].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )[0];

    if (!lastTodayAnnotation) {
      return;
    }

    setAnnotations((current) =>
      current.filter(
        (annotation) => annotation.id !== lastTodayAnnotation.id
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

  return {
    annotations,
    setAnnotations,
    annotationModalOpen,
    annotationDraft,
    annotationError,
    showUndo,
    annotationCount,
    progress,
    usdEarnings,
    openAnnotationModal,
    closeAnnotationModal,
    useSpotifyTrackForAnnotation,
    updateAnnotationDraft,
    saveAnnotation,
    undoLastAnnotation,
    getProgressMessage,
  };
}
