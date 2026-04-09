import type { Locale } from "./settings";

const LOCALE_STORAGE_KEY = "synchronicity-locale";
export const LOCALE_COOKIE_KEY = "synchronicity-locale";

export function saveLocale(lng: Locale) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  }
  if (typeof document !== "undefined") {
    document.cookie = `${LOCALE_COOKIE_KEY}=${lng}; path=/; max-age=31536000; samesite=lax`;
  }
}
