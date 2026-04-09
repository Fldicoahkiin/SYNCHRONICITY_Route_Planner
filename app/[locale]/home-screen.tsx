"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/client";
import { CalendarDays, Route, ChevronRight } from "lucide-react";
import { venues } from "@/lib/data/venues";
import { timetable } from "@/lib/data/timetable";
import { useLocalePath } from "@/lib/hooks/use-locale-path";

export default function Home() {
  const { t } = useTranslation();
  const { href } = useLocalePath();

  const stats = useMemo(() => {
    const artistNames = new Set(timetable.map((t) => t.artistName));
    return {
      venues: venues.length,
      artists: artistNames.size,
      sets: timetable.length,
    };
  }, []);

  const cards = [
    {
      href: href("browse"),
      label: t("home.cards.browse"),
      icon: CalendarDays,
      accent: "border-cyan-500/25 bg-cyan-500/[0.06] hover:bg-cyan-500/[0.1]",
      iconBg: "bg-cyan-400/10 text-cyan-400",
    },
    {
      href: href("plan"),
      label: t("home.cards.plan"),
      icon: Route,
      accent: "border-emerald-500/25 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.1]",
      iconBg: "bg-emerald-400/10 text-emerald-400",
    },
  ];

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-6 sm:px-6">
      <div className="flex w-full max-w-md flex-col gap-5 lg:max-w-lg">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            <span className="text-cyan-400">SYNC</span>HRONICITY&apos;26
          </h1>
          <div className="mt-1.5 text-xs text-zinc-500">
            {t("home.date")}
          </div>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={`group flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200 ${card.accent}`}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="flex-1 text-base font-semibold text-zinc-100">
                  {card.label}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
              </Link>
            );
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { value: stats.venues, label: t("home.stats.venues") },
            { value: stats.artists, label: t("home.stats.artists") },
            { value: stats.sets, label: t("home.stats.sets") },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-2 py-2.5 text-center"
            >
              <div className="text-lg font-semibold tracking-tight text-zinc-200">
                {s.value}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* GitHub */}
        <div className="flex justify-center pt-1">
          <a
            href="https://github.com/Fldicoahkiin/SYNCHRONICITY_Route_Planner"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
