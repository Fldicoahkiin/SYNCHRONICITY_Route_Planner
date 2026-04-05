"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/settings";
import { CalendarDays, Map, Route, Home, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

type TabDef = {
  path: string;
  labelKey: "nav.home" | "nav.timetable" | "nav.map" | "nav.plan";
  icon: typeof CalendarDays;
};

const tabs: TabDef[] = [
  { path: "", labelKey: "nav.home", icon: Home },
  { path: "timetable", labelKey: "nav.timetable", icon: CalendarDays },
  { path: "map", labelKey: "nav.map", icon: Map },
  { path: "plan", labelKey: "nav.plan", icon: Route },
];

export function BottomNav() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const locale = (params?.locale as Locale) || "ja";

  const switchLocale = () => {
    const locales = ["ja", "zh", "en"];
    const idx = locales.indexOf(locale);
    const next = locales[(idx + 1) % locales.length];
    const newPath = pathname.replace(`/${locale}`, `/${next}`) || `/${next}`;
    router.push(newPath);
  };

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-[#0a0a0a]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a0a]/80 md:hidden">
        <div className="mx-auto flex max-w-md justify-around">
          {tabs.map((tab) => {
            const href = tab.path ? `/${locale}/${tab.path}` : `/${locale}`;
            const active = tab.path
              ? pathname === href || pathname.startsWith(`${href}/`)
              : pathname === href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  active ? "text-cyan-400" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t(tab.labelKey)}</span>
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 z-50 hidden w-56 flex-col border-r border-zinc-800 bg-[#0a0a0a] md:flex">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-4">
          <Link
            href={`/${locale}`}
            className="text-sm font-bold tracking-tight text-cyan-400"
          >
            SYNCHRONICITY&apos;26
          </Link>
        </div>
        <div className="flex flex-1 flex-col gap-1 px-3 py-4">
          {tabs.map((tab) => {
            const href = tab.path ? `/${locale}/${tab.path}` : `/${locale}`;
            const active = tab.path
              ? pathname === href || pathname.startsWith(`${href}/`)
              : pathname === href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-zinc-900 text-cyan-400"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                )}
              >
                <Icon className="h-5 w-5" />
                {t(tab.labelKey)}
              </Link>
            );
          })}
        </div>
        <div className="border-t border-zinc-800 px-3 py-3">
          <button
            onClick={switchLocale}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
          >
            <Languages className="h-4 w-4" />
            <span className="uppercase">{locale}</span>
            <span className="ml-auto text-xs text-zinc-600">{t("localeSwitcher.label")}</span>
          </button>
        </div>
      </aside>

      {/* Mobile locale switcher floating button */}
      <button
        onClick={switchLocale}
        className="fixed right-3 top-3 z-50 flex h-8 items-center gap-1 rounded-full border border-zinc-700 bg-[#0a0a0a]/80 px-3 text-xs font-medium text-zinc-300 backdrop-blur transition-colors hover:bg-zinc-800 md:hidden"
      >
        <Languages className="h-3.5 w-3.5" />
        <span className="uppercase">{locale}</span>
      </button>
    </>
  );
}
