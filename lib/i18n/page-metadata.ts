import type { Metadata } from "next";
import { resources } from "./locales";
import { defaultLocale, locales, type Locale } from "./settings";

export type LocalizedPageKey = "home" | "browse" | "plan" | "map" | "timetable";

type PageMetadataCopy = {
  title: string;
  description: string;
};

type LocaleMetadataCopy = {
  title: string;
  description: string;
  pages: Record<LocalizedPageKey, PageMetadataCopy>;
};

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

function getLocaleMetadataCopy(locale: LocaleMetadataCopy | undefined) {
  return locale ?? (resources[defaultLocale].common.meta as LocaleMetadataCopy);
}

export function getPageMetadata(locale: Locale, page: LocalizedPageKey): Metadata {
  const safeLocale = isLocale(locale) ? locale : defaultLocale;
  const metadataCopy = getLocaleMetadataCopy(
    resources[safeLocale].common.meta as LocaleMetadataCopy | undefined,
  );

  return metadataCopy.pages[page];
}
