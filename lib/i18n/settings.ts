export const locales = ["ja", "zh", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ja";
