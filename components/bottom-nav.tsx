"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/settings";
import { CalendarDays, Map, Route, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/locale-switcher";

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
  const { t } = useTranslation();
  const locale = (params?.locale as Locale) || "ja";

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-[#0a0a0a]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a0a]/80 md:hidden">
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
      <aside className="fixed left-0 top-0 bottom-0 z-40 hidden w-56 flex-col border-r border-zinc-800 bg-[#0a0a0a] md:flex">
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
          <LocaleSwitcher />
          <a
            href="https://github.com/Fldicoahkiin/SYNCHRONICITY_Route_Planner"
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            GitHub
          </a>
        </div>
      </aside>

      {/* Mobile locale switcher */}
      <LocaleSwitcher />

      {/* Mobile GitHub link */}
      <a
        href="https://github.com/Fldicoahkiin/SYNCHRONICITY_Route_Planner"
        target="_blank"
        rel="noreferrer"
        className="fixed right-[5.5rem] top-3 z-50 flex h-8 items-center justify-center rounded-full border border-zinc-700 bg-[#0a0a0a]/80 px-2.5 text-zinc-300 backdrop-blur transition-colors hover:bg-zinc-800 md:hidden"
        aria-label="GitHub"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
      </a>
    </>
  );
}
