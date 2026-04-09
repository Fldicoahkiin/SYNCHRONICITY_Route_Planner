import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/settings";
import { LOCALE_COOKIE_KEY } from "@/lib/i18n/utils";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

function isLocale(value: string | undefined): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}

function getLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  const candidates = acceptLanguage
    .split(",")
    .map((part) => part.trim().split(";")[0]?.split("-")[0]?.toLowerCase())
    .filter((part): part is string => Boolean(part));

  for (const candidate of candidates) {
    if (isLocale(candidate)) {
      return candidate;
    }
  }

  return defaultLocale;
}

export default async function RootPage() {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_KEY)?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : getLocaleFromAcceptLanguage(requestHeaders.get("accept-language"));

  redirect(`/${locale}`);
}
