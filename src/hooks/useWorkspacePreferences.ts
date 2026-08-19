import { useEffect, useState } from "react";
import {
  fontOptions,
  themeOptions,
} from "../constants/app";
import type { FontId, ThemeId } from "../types/app";
import {
  getSavedFont,
  getSavedTheme,
} from "../utils/appStorage";

export function useWorkspacePreferences(autoSaveEnabled: boolean) {
  const [activeTheme, setActiveTheme] =
    useState<ThemeId>(getSavedTheme);
  const [activeFont, setActiveFont] =
    useState<FontId>(getSavedFont);

  const currentTheme =
    themeOptions.find((theme) => theme.id === activeTheme) ??
    themeOptions[0];
  const currentFont =
    fontOptions.find((font) => font.id === activeFont) ??
    fontOptions[0];

  useEffect(() => {
    if (autoSaveEnabled) {
      localStorage.setItem("pace-pulse-theme", activeTheme);
    }
  }, [activeTheme, autoSaveEnabled]);

  useEffect(() => {
    if (autoSaveEnabled) {
      localStorage.setItem("pace-pulse-font", activeFont);
    }
  }, [activeFont, autoSaveEnabled]);

  return {
    activeTheme,
    setActiveTheme,
    activeFont,
    setActiveFont,
    currentTheme,
    currentFont,
  };
}
