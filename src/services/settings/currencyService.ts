import { FALLBACK_CURRENCIES } from "../../constants/settings";
import type { CurrencyOption } from "../../types/settings";

export function getCurrencyOptions(): CurrencyOption[] {
  const supportedValuesOf = (
    Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;
  const codes = supportedValuesOf
    ? supportedValuesOf("currency")
    : FALLBACK_CURRENCIES;
  const names =
    typeof Intl.DisplayNames === "function"
      ? new Intl.DisplayNames(["en"], { type: "currency" })
      : null;

  return [...new Set(codes)]
    .sort()
    .map((code) => {
      const parts = new Intl.NumberFormat("en", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 0,
      }).formatToParts(0);

      return {
        code,
        name: (names?.of(code) ?? code).toLowerCase(),
        symbol: parts.find((part) => part.type === "currency")?.value ?? code,
      };
    });
}

export async function fetchUsdCurrencyRate(currency: string): Promise<number> {
  if (currency === "USD") return 1;

  const response = await fetch(
    `https://api.frankfurter.dev/v2/rates?base=USD&quotes=${encodeURIComponent(currency)}`
  );
  if (!response.ok) throw new Error("currency rate unavailable");

  const result = (await response.json()) as Array<{
    quote?: string;
    rate?: number;
  }>;
  const match = result.find((item) => item.quote === currency);
  if (!match || typeof match.rate !== "number") {
    throw new Error("currency rate unavailable");
  }
  return match.rate;
}
