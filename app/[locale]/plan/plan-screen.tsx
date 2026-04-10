"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { toPng } from "html-to-image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/client";
import { useDay } from "@/lib/hooks/use-day";
import { useFavorites } from "@/lib/hooks/use-favorites";
import { usePlannedRoute } from "@/lib/hooks/use-planned-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateScore } from "@/lib/utils/scoring";
import { buildAppleMapsRouteUrl, buildGoogleMapsRouteUrl } from "@/lib/utils/map-urls";
import { venueMap } from "@/lib/data/venues";
import { getRouteExportStops } from "@/lib/utils/routing";
import { RoutePlannerPanel } from "@/components/route-planner-panel";
import { RouteExportSheet } from "@/components/route-export-sheet";
import { DaySwitcher } from "@/components/day-switcher";
import type { Locale } from "@/lib/i18n/settings";
import type { TimetableSet } from "@/lib/data/timetable";
import { cn } from "@/lib/utils";
import { Download, ExternalLink } from "lucide-react";

const VenueMap = dynamic(() => import("@/components/venue-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-sm text-zinc-400">
      Loading map…
    </div>
  ),
});

export default function PlanPage({
  timetableSets,
}: {
  timetableSets: TimetableSet[];
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [day, setDay] = useDay();
  const [isExportingPng, setIsExportingPng] = useState(false);
  const exportSheetRef = useRef<HTMLDivElement>(null);
  const { favorites, setFavorites, toggleFavorite } = useFavorites();

  const favoriteSets = useMemo(
    () => timetableSets.filter((set) => favorites[set.id]),
    [timetableSets, favorites],
  );

  const dayNum = day === "1" ? 1 : 2;
  const {
    route,
    isLoadingDirections,
  } = usePlannedRoute(favoriteSets, dayNum);


  const score = useMemo(() => calculateScore(route, t), [route, t]);
  const dayLabel = day === "1" ? t("plan.tabs.day1") : t("plan.tabs.day2");
  
  const areaJumpsCount = useMemo(() => {
    let count = 0;
    for (const leg of route.legs) {
      if (leg.nextSet) {
        const v1 = venueMap.get(leg.set.venueId || "")?.area;
        const v2 = venueMap.get(leg.nextSet.venueId || "")?.area;
        if (v1 && v2 && v1 !== v2 && v1 !== "other" && v2 !== "other") {
          count++;
        }
      }
    }
    return count;
  }, [route.legs]);

  const exportStops = useMemo(() => getRouteExportStops(route.legs), [route.legs]);
  const googleRouteUrl = useMemo(
    () => buildGoogleMapsRouteUrl(exportStops),
    [exportStops],
  );
  const appleRouteUrl = useMemo(
    () => buildAppleMapsRouteUrl(exportStops),
    [exportStops],
  );
  const canOpenRoute = exportStops.length > 1;
  const locale = (pathname.split("/")[1] as Locale) || "ja";

  const exportPng = async () => {
    if (!exportSheetRef.current || route.totalSets === 0) {
      return;
    }

    try {
      setIsExportingPng(true);
      const dataUrl = await toPng(exportSheetRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `synchronicity26-route-day${day}.png`;
      link.click();
    } finally {
      setIsExportingPng(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-md md:max-w-5xl">
          <h1 className="text-lg font-semibold tracking-tight">{t("plan.title")}</h1>
          <DaySwitcher
            value={day}
            onChangeAction={(value) => {
              setDay(value);
              document.getElementById("main-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            day1Label={t("plan.tabs.day1")}
            day2Label={t("plan.tabs.day2")}
            className="mt-3 max-w-md md:max-w-sm"
          />
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 md:mx-auto md:max-w-5xl md:px-6">
        {route.totalSets === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-400">
            <p>{t("plan.empty")}</p>
            <Link
              href={`/${locale}/browse`}
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20"
            >
              {t("plan.browseTimetable")}
            </Link>
          </div>
        ) : (
          <>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="p-0">
                <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center md:gap-6">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
                      {t("plan.scoreLabel")}
                    </div>
                    <div className="mt-1 text-4xl font-bold text-cyan-400">{score.badge}</div>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-300">
                      {score.advice}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:w-48">
                    <MetricItem
                      label={t("plan.branch.totalSets", { count: route.totalSets })}
                      value={String(route.totalSets)}
                    />
                    <MetricItem
                      label="跨区移动"
                      value={`${areaJumpsCount}次`}
                      tone={areaJumpsCount > 1 ? "amber" : "emerald"}
                    />
                    <MetricItem
                      label={t("plan.leg.buffer", { minutes: score.averageBufferMinutes })}
                      value={`${score.averageBufferMinutes}min`}
                      tone="emerald"
                    />
                    <MetricItem
                      label={t("plan.branch.impossible", { count: score.impossibleJumps })}
                      value={String(score.impossibleJumps)}
                      tone={score.impossibleJumps > 0 ? "rose" : "neutral"}
                    />
                    <MetricItem
                      label={t("plan.branch.tight", { count: route.tightLegs })}
                      value={String(route.tightLegs)}
                      tone={route.tightLegs > 0 ? "amber" : "neutral"}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 p-4">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={exportPng}
                    disabled={isExportingPng}
                  >
                    <Download className="h-4 w-4" />
                    {isExportingPng ? t("plan.exportingPng") : t("plan.exportPng")}
                  </Button>

                  <div className="mx-1 hidden h-4 w-px bg-zinc-800 sm:block" />

                  <ActionLink href={googleRouteUrl} disabled={!canOpenRoute}>
                    {t("plan.exportGoogleRoute")}
                  </ActionLink>
                  <ActionLink href={appleRouteUrl} disabled={!canOpenRoute}>
                    {t("plan.exportAppleRoute")}
                  </ActionLink>
                </div>
              </CardContent>
            </Card>

            <div className="overflow-hidden rounded-3xl border border-zinc-800">
              <div className="h-[320px] w-full bg-zinc-900">
                <VenueMap
                  favorites={route.legs.map((leg) => leg.set)}
                  routeLegs={route.legs}
                />
              </div>
            </div>

            <RoutePlannerPanel
              route={route}
              onToggleOption={(groupId, optionId) => {
                toggleFavorite(optionId);
              }}
              onSelectAllInGroup={(groupId, optionIds) => {
                setFavorites(prev => {
                  const next = { ...prev };
                  optionIds.forEach(id => { next[id] = true; });
                  return next;
                });
              }}
              onClearGroup={(groupId) => {
                const group = route.conflictGroups.find(g => g.id === groupId);
                if (group) {
                  setFavorites(prev => {
                    const next = { ...prev };
                    group.performanceIds.forEach(id => { delete next[id]; });
                    return next;
                  });
                }
              }}
              isLoadingDirections={isLoadingDirections}
            />
          </>
        )}
      </main>

      <div className="pointer-events-none fixed left-[-9999px] top-0 z-[-1] w-[1200px] p-6">
        <RouteExportSheet
          ref={exportSheetRef}
          route={route}
          dayLabel={dayLabel}
        />
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "rose" | "amber" | "emerald";
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-center">
      <div
        className={cn(
          "text-lg font-semibold leading-none",
          tone === "rose" && "text-rose-400",
          tone === "amber" && "text-amber-400",
          tone === "emerald" && "text-emerald-400",
          tone === "neutral" && "text-zinc-200",
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function ActionLink({
  children,
  href,
  disabled = false,
}: {
  children: ReactNode;
  href: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-xs font-medium text-zinc-600">
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-200"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
