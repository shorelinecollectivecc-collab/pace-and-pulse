import {
  APP_SETTINGS_STORAGE_KEY,
  DAILY_TARGET_OPTIONS,
  DEFAULT_APP_SETTINGS,
} from "../../constants/settings";
import type { AppSettings, DailyTarget } from "../../types/settings";
import { readJsonStorage, writeJsonStorage } from "../storage/localStorageService";

function isDailyTarget(value: unknown): value is DailyTarget {
  return DAILY_TARGET_OPTIONS.includes(Number(value) as DailyTarget);
}

export function readAppSettings(): AppSettings {
  const parsed = readJsonStorage<Partial<AppSettings>>(
    APP_SETTINGS_STORAGE_KEY,
    {}
  );

  return {
    language:
      typeof parsed.language === "string"
        ? parsed.language
        : DEFAULT_APP_SETTINGS.language,
    currency:
      typeof parsed.currency === "string"
        ? parsed.currency
        : DEFAULT_APP_SETTINGS.currency,
    dailyTarget: isDailyTarget(parsed.dailyTarget)
      ? parsed.dailyTarget
      : DEFAULT_APP_SETTINGS.dailyTarget,
    videoDailyTarget: isDailyTarget(parsed.videoDailyTarget)
      ? parsed.videoDailyTarget
      : DEFAULT_APP_SETTINGS.videoDailyTarget,
    // Kept in the settings shape for backwards compatibility.
    // Video work is now always paid at the fixed $20 hourly rate.
    videoAnnotationRateUsd: DEFAULT_APP_SETTINGS.videoAnnotationRateUsd,
    notificationsEnabled:
      typeof parsed.notificationsEnabled === "boolean"
        ? parsed.notificationsEnabled
        : DEFAULT_APP_SETTINGS.notificationsEnabled,
    autoSaveEnabled:
      typeof parsed.autoSaveEnabled === "boolean"
        ? parsed.autoSaveEnabled
        : DEFAULT_APP_SETTINGS.autoSaveEnabled,
  };
}

export function saveAppSettings(settings: AppSettings) {
  writeJsonStorage(APP_SETTINGS_STORAGE_KEY, settings);
}
