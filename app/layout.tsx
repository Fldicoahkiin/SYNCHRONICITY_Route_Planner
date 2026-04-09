import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/settings";

export const metadata: Metadata = {
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  viewportFit: "cover",
};

function isLocale(value: string | undefined): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get("x-synch-locale") ?? undefined;
  const htmlLang = isLocale(requestedLocale) ? requestedLocale : defaultLocale;

  return (
    <html lang={htmlLang} className="h-full antialiased dark">
      <body className="min-h-full bg-[#0a0a0a] text-zinc-100">
        {children}
      </body>
    </html>
  );
}
