import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FALLBACK_LANGUAGES } from "./constants/settings";
import { usePageTranslation } from "./hooks/usePageTranslation";
import {
  fetchUsdCurrencyRate,
  getCurrencyOptions,
} from "./services/settings/currencyService";
import { fetchLanguageOptions } from "./services/settings/languageService";
import {
  readAppSettings,
  saveAppSettings,
} from "./services/settings/settingsStorageService";
import type {
  AppSettings,
  AsyncStatus,
  CurrencyOption,
  LanguageOption,
} from "./types/settings";

export type { AppSettings, CurrencyOption, LanguageOption } from "./types/settings";

type AppSettingsContextValue = {
  settings: AppSettings;
  updateSettings: (change: Partial<AppSettings>) => void;
  languages: LanguageOption[];
  currencies: CurrencyOption[];
  languageLoading: boolean;
  translationStatus: AsyncStatus;
  currencyRate: number | null;
  currencyStatus: AsyncStatus;
  requestNotifications: (enabled: boolean) => Promise<boolean>;
  formatCurrency: (usdAmount: number) => string;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(readAppSettings);
  const [languages, setLanguages] = useState<LanguageOption[]>(FALLBACK_LANGUAGES);
  const [languageLoading, setLanguageLoading] = useState(true);
  const [translationStatus, setTranslationStatus] = useState<AsyncStatus>("idle");
  const [currencyRate, setCurrencyRate] = useState<number | null>(
    settings.currency === "USD" ? 1 : null
  );
  const [currencyStatus, setCurrencyStatus] = useState<AsyncStatus>("idle");
  const currencies = useMemo(getCurrencyOptions, []);

  useEffect(() => {
    let active = true;

    fetchLanguageOptions()
      .then((options) => {
        if (active && options.length > 0) setLanguages(options);
      })
      .catch(() => {
        if (active) setLanguages(FALLBACK_LANGUAGES);
      })
      .finally(() => {
        if (active) setLanguageLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    saveAppSettings(settings);
    document.documentElement.lang = settings.language;
    const selectedLanguage = languages.find(
      (language) => language.code === settings.language
    );
    document.documentElement.dir = selectedLanguage?.dir ?? "ltr";
  }, [languages, settings]);

  useEffect(() => {
    let active = true;
    setCurrencyStatus("working");

    fetchUsdCurrencyRate(settings.currency)
      .then((rate) => {
        if (active) {
          setCurrencyRate(rate);
          setCurrencyStatus("ready");
        }
      })
      .catch(() => {
        if (active) {
          setCurrencyRate(null);
          setCurrencyStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, [settings.currency]);

  const updateSettings = useCallback((change: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...change }));
  }, []);

  const requestNotifications = useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        updateSettings({ notificationsEnabled: false });
        return true;
      }

      if (!("Notification" in window)) return false;

      const permission =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;
      const allowed = permission === "granted";
      updateSettings({ notificationsEnabled: allowed });
      return allowed;
    },
    [updateSettings]
  );

  const formatCurrency = useCallback(
    (usdAmount: number) => {
      const amount = currencyRate === null ? usdAmount : usdAmount * currencyRate;
      const currency = currencyRate === null ? "USD" : settings.currency;

      return new Intl.NumberFormat(settings.language || "en", {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      })
        .format(amount)
        .toLowerCase();
    },
    [currencyRate, settings.currency, settings.language]
  );

  usePageTranslation(settings.language, setTranslationStatus);

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      settings,
      updateSettings,
      languages,
      currencies,
      languageLoading,
      translationStatus,
      currencyRate,
      currencyStatus,
      requestNotifications,
      formatCurrency,
    }),
    [
      settings,
      updateSettings,
      languages,
      currencies,
      languageLoading,
      translationStatus,
      currencyRate,
      currencyStatus,
      requestNotifications,
      formatCurrency,
    ]
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used inside AppSettingsProvider");
  }
  return context;
}
