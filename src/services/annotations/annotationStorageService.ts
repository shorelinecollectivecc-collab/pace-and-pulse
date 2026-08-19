import type { AnnotationRecord } from "../../types/app";
import { getMonthKey, getTodayKey, getWeekKey } from "../../utils/dateKeys";
import { readJsonStorage, writeJsonStorage, writeStorage } from "../storage/localStorageService";

const ALL_ANNOTATIONS_KEY = "pace-pulse-annotation-log-all";

export function loadAnnotations() {
  return readJsonStorage<AnnotationRecord[]>(ALL_ANNOTATIONS_KEY, []);
}

export function saveAnnotations(annotations: AnnotationRecord[]) {
  const todayKey = getTodayKey();
  const now = new Date();
  const weekKey = getWeekKey(now);
  const monthKey = getMonthKey(now);

  writeJsonStorage(ALL_ANNOTATIONS_KEY, annotations);
  writeJsonStorage(
    `pace-pulse-daily-log-${todayKey}`,
    annotations.filter((annotation) => annotation.dateKey === todayKey)
  );
  writeJsonStorage(
    `pace-pulse-weekly-log-${weekKey}`,
    annotations.filter((annotation) => annotation.weekKey === weekKey)
  );
  writeJsonStorage(
    `pace-pulse-monthly-log-${monthKey}`,
    annotations.filter((annotation) => annotation.monthKey === monthKey)
  );
  writeStorage(
    `pace-pulse-count-${todayKey}`,
    String(annotations.filter((annotation) => annotation.dateKey === todayKey).length)
  );
}
