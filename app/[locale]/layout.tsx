import type { Metadata } from "next";
import "../globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { I18nProvider } from "@/lib/i18n/client";
import { Providers } from "@/app/providers";
import { locales, type Locale } from "@/lib/i18n/settings";
import { resources } from "@/lib/i18n/locales";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = resources[locale as Locale]?.common.meta;
  return {
    title: meta?.title || "SYNCHRONICITY'26 Route Planner",
    description: meta?.description || "Plan your SYNCHRONICITY'26 festival route",
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  return (
    <div className="flex min-h-full flex-col">
      <Providers>
        <I18nProvider lng={locale as Locale}>
          <div id="main-scroll" className="flex-1 overflow-y-auto pb-32 md:pb-0 md:pl-56">
            {children}
          </div>
          <BottomNav />
        </I18nProvider>
      </Providers>
    </div>
  );
}
