"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/client";
import { CalendarDays, Map, Route, ChevronRight } from "lucide-react";
import { venues } from "@/lib/data/venues";
import { timetable } from "@/lib/data/timetable";

export default function Home() {
  const { t } = useTranslation();

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
      href: "timetable",
      label: t("home.ctaTimetable"),
      icon: CalendarDays,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      href: "plan",
      label: t("home.ctaPlan"),
      icon: Route,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      href: "map",
      label: t("home.ctaMap"),
      icon: Map,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="flex min-h-full flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-sm md:max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-3xl font-bold text-white shadow-lg shadow-cyan-500/20">
              26
            </div>
            <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-400"></div>
          </div>

          <div className="mt-6 space-y-1">
            <div className="text-xs font-semibold tracking-[0.2em] text-cyan-400">
              {t("home.subtitle")}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {t("home.title")}
            </h1>
            <p className="text-sm text-zinc-400">{t("home.tagline")}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { value: stats.venues, label: t("home.stats.venues") },
            { value: stats.artists, label: t("home.stats.artists") },
            { value: stats.sets, label: t("home.stats.sets") },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-3 text-center">
              <div className="text-lg font-bold text-zinc-100">{s.value}</div>
              <div className="text-[10px] text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${card.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <span className="font-medium text-zinc-100">{card.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-zinc-400" />
              </Link>
            );
          })}
        </div>

        <div className="mt-10 text-center text-xs text-zinc-500">
          {t("home.date")}
        </div>
      </div>
    </div>
  );
}
