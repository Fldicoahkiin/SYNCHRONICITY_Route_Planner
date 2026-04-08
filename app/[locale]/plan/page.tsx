"use client";

import { useMemo, useState } from "react";
import useLocalStorageState from "use-local-storage-state";
import { useTranslation } from "@/lib/i18n/client";
import { useDay } from "@/lib/hooks/use-day";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { timetable } from "@/lib/data/timetable";
import { venueMap } from "@/lib/data/venues";
import { planRoute, formatTime } from "@/lib/utils/route-planner";
import { calculateScore } from "@/lib/utils/scoring";
import { buildGoogleMapsUrl, buildAppleMapsUrl } from "@/lib/utils/map-urls";
import { downloadIcal } from "@/lib/utils/ical";
import Link from "next/link";
import { Navigation, ArrowRight, MapPin, ExternalLink, Copy, Check, CalendarPlus, Share2 } from "lucide-react";

export default function PlanPage() {
  const { t } = useTranslation();
  const [day, setDay] = useDay();
  const [copied, setCopied] = useState(false);
  const [favorites] = useLocalStorageState<Record<string, boolean>>(
    "synchronicity-favorites",
    { defaultValue: {} }
  );

  const favoriteSets = useMemo(
    () => timetable.filter((t) => favorites[t.id]),
    [favorites]
  );

  const dayNum = day === "1" ? 1 : 2;
  const route = useMemo(
    () => planRoute(favoriteSets, dayNum),
    [favoriteSets, dayNum]
  );
  const score = useMemo(() => calculateScore(route, t), [route, t]);

  const copyPlan = async () => {
    if (route.totalSets === 0) return;
    const dayLabel = day === "1" ? t("plan.tabs.day1") : t("plan.tabs.day2");
    const lines: string[] = [`SYNCHRONICITY'26 - ${dayLabel}`, ""];
    route.legs.forEach((leg) => {
      const venue = venueMap.get(leg.set.venueId || "");
      lines.push(
        `${formatTime(leg.set.startAt)}-${formatTime(leg.set.finishAt)} ${leg.set.artistName} @ ${venue?.name ?? leg.set.stageName}`
      );
      if (leg.nextSet) {
        const nextVenue = venueMap.get(leg.nextSet.venueId || "");
        lines.push(
          `  ↳ ${t("plan.leg.walk", { minutes: leg.walkMinutes })} → ${nextVenue?.name ?? ""}`
        );
      }
    });
    lines.push("");
    lines.push(`${t("plan.scoreLabel")}: ${score.badge}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const exportToCalendar = () => {
    const daySets = route.legs.map((l) => l.set);
    if (daySets.length === 0) return;
    const dayLabel = day === "1" ? t("plan.tabs.day1") : t("plan.tabs.day2");
    downloadIcal(
      daySets,
      `synchronicity26-plan-day${day}.ics`,
      `SYNCHRONICITY'26 ${dayLabel}`,
      `${t("plan.title")} - ${dayLabel}`
    );
  };

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const sharePlan = async () => {
    if (route.totalSets === 0) return;
    const dayLabel = day === "1" ? t("plan.tabs.day1") : t("plan.tabs.day2");
    const lines: string[] = [`SYNCHRONICITY'26 - ${dayLabel}`, ""];
    route.legs.forEach((leg) => {
      const venue = venueMap.get(leg.set.venueId || "");
      lines.push(
        `${formatTime(leg.set.startAt)}-${formatTime(leg.set.finishAt)} ${leg.set.artistName} @ ${venue?.name ?? leg.set.stageName}`
      );
      if (leg.nextSet) {
        const nextVenue = venueMap.get(leg.nextSet.venueId || "");
        lines.push(
          `  ↳ ${t("plan.leg.walk", { minutes: leg.walkMinutes })} → ${nextVenue?.name ?? ""}`
        );
      }
    });
    lines.push("");
    lines.push(`${t("plan.scoreLabel")}: ${score.badge}`);
    try {
      await navigator.share({
        title: `SYNCHRONICITY'26 - ${dayLabel}`,
        text: lines.join("\n"),
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a0a]/80">
        <div className="mx-auto max-w-md md:max-w-3xl">
          <h1 className="text-lg font-semibold tracking-tight">
            {t("plan.title")}
          </h1>
          <Tabs
            value={day}
            onValueChange={(v) => { setDay(v as "1" | "2"); document.getElementById("main-scroll")?.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="mt-3"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-900 md:max-w-sm">
              <TabsTrigger value="1">{t("plan.tabs.day1")}</TabsTrigger>
              <TabsTrigger value="2">{t("plan.tabs.day2")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 md:mx-auto md:max-w-3xl">
        {route.totalSets === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-400">
            <p>{t("plan.empty")}</p>
            <Link
              href="timetable"
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20"
            >
              {t("plan.browseTimetable")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
                      {t("plan.scoreLabel")}
                    </div>
                    <div className="text-3xl font-bold text-cyan-400">
                      {score.badge}
                    </div>
                    <div className="max-w-md space-y-1.5">
                      <p className="text-sm leading-relaxed text-zinc-300">{score.advice}</p>
                      <p className="text-xs text-zinc-500">
                        {t("plan.scoreDetail", {
                          impossible: score.impossibleJumps,
                          buffer: score.averageBufferMinutes,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {canShare && (
                      <button
                        onClick={sharePlan}
                        className="flex items-center gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-200"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        {t("plan.share")}
                      </button>
                    )}
                    <button
                      onClick={exportToCalendar}
                      className="flex items-center gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-200"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      {t("plan.exportCalendar")}
                    </button>
                    <button
                      onClick={copyPlan}
                      className="flex items-center gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-200"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">{t("plan.copied")}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          {t("plan.copyPlan")}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {route.legs.map((leg) => {
                const venue = venueMap.get(leg.set.venueId || "");
                const nextVenue = leg.nextSet
                  ? venueMap.get(leg.nextSet.venueId || "")
                  : undefined;
                return (
                  <div key={leg.set.id} className="relative">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span className="font-mono">
                          {formatTime(leg.set.startAt)} -{" "}
                          {formatTime(leg.set.finishAt)}
                        </span>
                        {venue && (
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: venue.color }}
                            />
                            {venue.name}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-zinc-100">
                        {leg.set.artistName}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {leg.set.stageName}
                      </div>
                    </div>

                    {nextVenue && (
                      <div className="my-2 flex items-center gap-2 px-1">
                        <div
                          className={
                            leg.status === "impossible"
                              ? "flex-1 border-l-2 border-dashed border-rose-500 pl-3 text-sm text-rose-400"
                              : leg.status === "tight"
                              ? "flex-1 border-l-2 border-dashed border-amber-500 pl-3 text-sm text-amber-400"
                              : "flex-1 border-l-2 border-dashed border-cyan-500 pl-3 text-sm text-cyan-400"
                          }
                        >
                          <div className="flex items-center gap-1">
                            <Navigation className="h-3.5 w-3.5" />
                            {t("plan.leg.walk", { minutes: leg.walkMinutes })}
                            <ArrowRight className="h-3.5 w-3.5" />
                            {nextVenue.name}
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-500">
                            {t("plan.leg.buffer", {
                              minutes: leg.bufferMinutes,
                            })}
                            {leg.status === "impossible" &&
                              t("plan.leg.statusImpossible")}
                            {leg.status === "tight" &&
                              t("plan.leg.statusTight")}
                            {leg.status === "just-right" &&
                              t("plan.leg.statusJustRight")}
                            {leg.status === "comfortable" &&
                              t("plan.leg.statusComfortable")}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <a
                            href={buildGoogleMapsUrl(
                              venue!.lat,
                              venue!.lng,
                              nextVenue.lat,
                              nextVenue.lng
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            title="Google Maps"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={buildAppleMapsUrl(
                              venue!.lat,
                              venue!.lng,
                              nextVenue.lat,
                              nextVenue.lng
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            title="Apple Maps"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
