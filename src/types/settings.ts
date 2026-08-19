export type DailyTarget = 10 | 15 | 20 | 25 | 30;

export type AppSettings = {
  language: string;
  currency: string;
  dailyTarget: DailyTarget;
  videoDailyTarget: DailyTarget;
  videoAnnotationRateUsd: string;
  notificationsEnabled: boolean;
  autoSaveEnabled: boolean;
};

export type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
};

export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
};

export type AsyncStatus = "idle" | "working" | "ready" | "error";
