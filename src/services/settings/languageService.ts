import { FALLBACK_LANGUAGES } from "../../constants/settings";
import type { LanguageOption } from "../../types/settings";

export async function fetchLanguageOptions(): Promise<LanguageOption[]> {
  const response = await fetch(
    "https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation",
    { headers: { "accept-language": "en" } }
  );

  if (!response.ok) throw new Error("language list unavailable");

  const data = (await response.json()) as {
    translation?: Record<
      string,
      { name?: string; nativeName?: string; dir?: string }
    >;
  };

  return Object.entries(data.translation ?? {})
    .map(([code, details]): LanguageOption => ({
      code,
      name: (details.name ?? code).toLowerCase(),
      nativeName: details.nativeName ?? details.name ?? code,
      dir: details.dir === "rtl" ? "rtl" : "ltr",
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function getFallbackLanguages() {
  return FALLBACK_LANGUAGES;
}
