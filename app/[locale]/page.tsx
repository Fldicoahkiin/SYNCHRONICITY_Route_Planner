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
      label: t("home.cards.browse"),
      icon: CalendarDays,
      accentClass:
        "border-cyan-500/25 bg-cyan-500/[0.09] text-cyan-300 group-hover:border-cyan-400/50 group-hover:bg-cyan-500/[0.12]",
      iconClass: "bg-cyan-400/10 text-cyan-300 ring-cyan-400/20",
    },
    {
      href: href("plan"),
      label: t("home.cards.plan"),
      icon: Route,
      accentClass:
        "border-emerald-500/25 bg-emerald-500/[0.09] text-emerald-300 group-hover:border-emerald-400/50 group-hover:bg-emerald-500/[0.12]",
      iconClass: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
    },
    {
      href: href("map"),
      label: t("home.cards.map"),
      icon: Map,
      accentClass:
        "border-violet-500/25 bg-violet-500/[0.09] text-violet-300 group-hover:border-violet-400/50 group-hover:bg-violet-500/[0.12]",
      iconClass: "bg-violet-400/10 text-violet-300 ring-violet-400/20",
    },
  ];

  return (
    <div className="flex min-h-full flex-col px-5 py-8 sm:px-6 lg:px-10 lg:py-14 2xl:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 lg:gap-14">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-[11px] font-semibold leading-none tracking-[0.16em] text-zinc-400">
            {t("home.subtitle")}
          </div>

          <div className="mt-6 space-y-4 lg:max-w-3xl">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-4xl lg:text-5xl xl:text-6xl">
              {t("home.title")}
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              {t("home.tagline")}
            </p>
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

        <div className="flex justify-center">
          <div className="grid w-full gap-4 md:max-w-5xl md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`group relative flex min-h-[208px] overflow-hidden rounded-[34px] border p-6 transition-all duration-300 hover:-translate-y-1 sm:min-h-[232px] sm:p-7 xl:min-h-[264px] xl:p-8 ${card.accentClass}`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_55%)] opacity-70" />
                  <div className="relative flex w-full flex-col justify-between gap-10">
                    <div
                      className={`flex h-20 w-20 items-center justify-center rounded-[28px] ring-1 sm:h-24 sm:w-24 ${card.iconClass}`}
                    >
                      <Icon className="h-8 w-8 sm:h-9 sm:w-9" />
                    </div>
                    <div className="flex items-end justify-between gap-4">
                      <span className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-[2rem] xl:text-[2.35rem]">
                        {card.label}
                      </span>
                      <ChevronRight className="mb-1 h-7 w-7 shrink-0 text-zinc-500 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-zinc-200" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="grid w-full max-w-5xl gap-3 sm:grid-cols-3">
            {[
              { value: stats.venues, label: t("home.stats.venues") },
              { value: stats.artists, label: t("home.stats.artists") },
              { value: stats.sets, label: t("home.stats.sets") },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-4 text-center"
              >
                <div className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
                  {s.value}
                </div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
