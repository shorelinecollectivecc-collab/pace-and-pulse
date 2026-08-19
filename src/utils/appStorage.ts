import { fontOptions, themeOptions } from "../constants/app";
import type {
  AnnotationRecord,
  FontId,
  ThemeId,
} from "../types/app";
import { getDateKey, getMonthKey, getWeekKey } from "./dateKeys";

export function getSavedAnnotations(): AnnotationRecord[] {
  try {
    const saved = localStorage.getItem("pace-pulse-annotation-log-all");

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved) as AnnotationRecord[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((annotation) => {
      const createdAt = new Date(annotation.createdAt);

      if (Number.isNaN(createdAt.getTime())) {
        return annotation;
      }

      return {
        ...annotation,
        dateKey: getDateKey(createdAt),
        weekKey: getWeekKey(createdAt),
        monthKey: getMonthKey(createdAt),
      };
    });
  } catch {
    return [];
  }
}

export function getSavedTheme(): ThemeId {
  const savedTheme = localStorage.getItem("pace-pulse-theme");
  const validTheme = themeOptions.some((theme) => theme.id === savedTheme);

  return validTheme ? (savedTheme as ThemeId) : "sand-sage";
}

export function getSavedFont(): FontId {
  const savedFont = localStorage.getItem("pace-pulse-font");
  const validFont = fontOptions.some((font) => font.id === savedFont);

  return validFont ? (savedFont as FontId) : "shadows-into-light";
}
