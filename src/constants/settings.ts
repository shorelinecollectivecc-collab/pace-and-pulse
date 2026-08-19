import type { AppSettings, LanguageOption } from "../types/settings";

export const APP_SETTINGS_STORAGE_KEY = "pace-pulse-app-settings";
export const TRANSLATION_CACHE_PREFIX = "pace-pulse-translations-";
export const DAILY_TARGET_OPTIONS = [10, 15, 20, 25, 30] as const;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: "en",
  currency: "ZAR",
  dailyTarget: 10,
  videoDailyTarget: 10,
  videoAnnotationRateUsd: "20",
  notificationsEnabled: false,
  autoSaveEnabled: true,
};

export const FALLBACK_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "english", nativeName: "english", dir: "ltr" },
  { code: "af", name: "afrikaans", nativeName: "afrikaans", dir: "ltr" },
  { code: "zu", name: "zulu", nativeName: "isizulu", dir: "ltr" },
  { code: "xh", name: "xhosa", nativeName: "isixhosa", dir: "ltr" },
  { code: "es", name: "spanish", nativeName: "español", dir: "ltr" },
  { code: "fr", name: "french", nativeName: "français", dir: "ltr" },
  { code: "de", name: "german", nativeName: "deutsch", dir: "ltr" },
  { code: "pt", name: "portuguese", nativeName: "português", dir: "ltr" },
];

export const FALLBACK_CURRENCIES = [
  "ZAR", "USD", "EUR", "GBP", "AUD", "CAD", "NZD", "JPY", "CNY",
  "INR", "BRL", "MXN", "CHF", "SEK", "NOK", "DKK", "AED",
];
