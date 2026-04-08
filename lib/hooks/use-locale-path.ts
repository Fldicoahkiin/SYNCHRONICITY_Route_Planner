"use client";

import { usePathname } from "next/navigation";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/settings";

function hasLocaleSegment(segment: string | undefined): segment is Locale {
  return locales.includes(segment as Locale);
}

export function useLocalePath() {
  const pathname = usePathname();
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  const locale = hasLocaleSegment(firstSegment)
    ? firstSegment
    : defaultLocale;

  const href = (path = "") => {
    if (!path || path === "/") {
      return `/${locale}`;
    }

    const normalizedPath = path.replace(/^\/+/, "");
    return `/${locale}/${normalizedPath}`;
  };

  return { locale, href };
}
