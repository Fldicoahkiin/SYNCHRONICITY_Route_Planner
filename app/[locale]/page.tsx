"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/client";
import { CalendarDays, Map, Route, ChevronRight } from "lucide-react";
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
      label: "浏览全景",
      icon: CalendarDays,
      accentClass:
        "border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-300 group-hover:border-cyan-400/40",
      iconClass: "bg-cyan-400/10 text-cyan-300 ring-cyan-400/20",
    },
    {
      href: href("browse") + "?tab=route",
      label: "规划路线",
      icon: Route,
      accentClass:
        "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-300 group-hover:border-emerald-400/40",
      iconClass: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
    },
    {
      href: href("browse") + "?tab=map",
      label: "查看地图",
      icon: Map,
      accentClass:
        "border-violet-500/20 bg-violet-500/[0.08] text-violet-300 group-hover:border-violet-400/40",
      iconClass: "bg-violet-400/10 text-violet-300 ring-violet-400/20",
    },
  ];

  return (
    <div className="flex min-h-full flex-col px-5 py-8 sm:px-6 lg:px-10 lg:py-14 2xl:px-12">
      <div className="flex flex-col gap-12 lg:gap-16">
        {/* Hero Section - Centered */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-[11px] font-semibold leading-none tracking-[0.16em] text-zinc-400">
            {t("home.subtitle")}
          </div>

          <div className="mt-6 space-y-4 lg:space-y-6 lg:max-w-3xl">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-4xl lg:text-5xl xl:text-6xl">
              {t("home.title")}
            </h1>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-zinc-500 sm:text-sm">
              <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-1.5">
                {t("home.date")}
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-1.5">
                Shibuya Live Circuit
              </span>
            </div>
          </div>
        </div>

        {/* Statistics Grid - Large and Centered */}
        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 xl:gap-8 w-full sm:w-auto">
            {[
              { value: stats.venues, label: t("home.stats.venues") },
              { value: stats.artists, label: t("home.stats.artists") },
              { value: stats.sets, label: t("home.stats.sets") },
            ].map((s) => (
              <div
                key={s.label}
                className="group relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-gradient-to-br from-zinc-900/30 to-zinc-950/50 p-5 text-center backdrop-blur-sm transition-all duration-300 hover:border-zinc-700/60 sm:p-6 lg:p-8 lg:min-w-[200px] xl:min-w-[240px]"
              >
                {/* Animated background on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/10 group-hover:to-cyan-500/5 transition-all duration-500" />
                
                <div className="relative z-10 flex flex-col gap-2 sm:gap-3">
                  <div className="text-3xl font-bold text-cyan-300 sm:text-4xl lg:text-5xl xl:text-6xl">
                    {s.value}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500 sm:text-[11px] lg:text-[12px]">
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call-to-Action Cards */}
        <div className="flex justify-center">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 w-full lg:w-auto lg:max-w-4xl">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`group relative overflow-hidden rounded-2xl border px-4 py-5 transition-all duration-300 hover:scale-[1.02] sm:px-5 sm:py-6 lg:px-6 lg:py-7 ${card.accentClass}`}
                >
                  <div className="flex flex-col gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 sm:h-11 sm:w-11 lg:h-12 lg:w-12 ${card.iconClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-zinc-100 sm:text-base lg:text-lg">
                        {card.label}
                      </span>
                      <ChevronRight className="h-4 w-4 text-zinc-600 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
