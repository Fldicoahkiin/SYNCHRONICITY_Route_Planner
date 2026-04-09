import { locales, defaultLocale, type Locale } from "./settings";

export const LOCALE_STORAGE_KEY = "synchronicity-locale";
export const LOCALE_COOKIE_KEY = "synchronicity-locale";

export function getBrowserLocale(): Locale | null {
  if (typeof navigator === "undefined") return null;
  const lang = navigator.language || (navigator as unknown as { languages?: string[] }).languages?.[0];
  if (!lang) return null;
  const primary = lang.split("-")[0].toLowerCase();
  const match = locales.find((l) => l === primary);
  return match || null;
}

export function getSavedLocale(): Locale | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (!raw) return null;
  const saved = raw as Locale;
  if (locales.includes(saved)) return saved;
  return null;
}

export function getPreferredLocale(): Locale {
  return getSavedLocale() || getBrowserLocale() || defaultLocale;
}

export function saveLocale(lng: Locale) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  }
  if (typeof document !== "undefined") {
    document.cookie = `${LOCALE_COOKIE_KEY}=${lng}; path=/; max-age=31536000; samesite=lax`;
  }
}
