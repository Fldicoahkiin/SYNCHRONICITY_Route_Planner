import { NextResponse, type NextRequest } from "next/server";
import { locales } from "@/lib/i18n/settings";

function getPathLocale(pathname: string) {
  return locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

export function proxy(request: NextRequest) {
  const locale = getPathLocale(request.nextUrl.pathname);

  if (!locale) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-synch-locale", locale);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|icon.svg|manifest.webmanifest).*)",
  ],
};
