"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import useLocalStorageState from "use-local-storage-state";
import { useTranslation } from "@/lib/i18n/client";
import { useDay } from "@/lib/hooks/use-day";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { timetable } from "@/lib/data/timetable";
import { venueMap } from "@/lib/data/venues";
import { planRoute, formatTime } from "@/lib/utils/route-planner";
import { buildGoogleMapsUrl, buildAppleMapsUrl } from "@/lib/utils/map-urls";
import { cn } from "@/lib/utils";
import { MapPin, ExternalLink, Navigation, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

function MapLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-sm text-zinc-400">
      {t("map.loading")}
    </div>
  );
}

const VenueMap = dynamic(() => import("@/components/venue-map"), {
  ssr: false,
  loading: () => <MapLoading />,
});

export default function MapPage() {
  const { t } = useTranslation();
  const [day, setDay] = useDay();
  const [favorites] = useLocalStorageState<Record<string, boolean>>(
    "synchronicity-favorites",
    { defaultValue: {} }
  );

  const dayNum = day === "1" ? 1 : 2;
  const daySets = useMemo(
    () => timetable.filter((t) => t.day === dayNum),
    [dayNum]
  );
  const favoriteSets = useMemo(
    () => daySets.filter((t) => favorites[t.id]),
    [daySets, favorites]
  );

  const route = useMemo(
    () => planRoute(favoriteSets, dayNum),
    [favoriteSets, dayNum]
  );
  const [routeOpen, setRouteOpen] = useState(true);

  return (
    <div className="flex h-full flex-col">
      <header className="absolute left-0 right-0 top-0 z-[1000] border-b border-zinc-800/80 bg-[#0a0a0a]/80 px-4 py-3 backdrop-blur md:left-56">
        <div className="mx-auto max-w-md md:max-w-3xl">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">
              {t("map.title")}
            </h1>
            <span className="text-xs text-zinc-400">
              {t("map.selectedCount", { count: favoriteSets.length })}
            </span>
          </div>
          <Tabs
            value={day}
            onValueChange={(v) => { setDay(v as "1" | "2"); document.getElementById("main-scroll")?.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="mt-3"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-900/90 md:max-w-sm">
              <TabsTrigger value="1">{t("map.tabs.day1")}</TabsTrigger>
              <TabsTrigger value="2">{t("map.tabs.day2")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <div className="relative flex-1 pt-[104px] md:pt-[104px]">
        <VenueMap favorites={favoriteSets} daySets={daySets} />

        {route.totalSets > 0 && (
          <div
            className={cn(
              "pointer-events-none absolute z-[1000] overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a]/90 backdrop-blur transition-all",
              routeOpen
                ? "bottom-4 left-4 right-4 top-auto max-h-[40vh] md:bottom-4 md:left-auto md:right-4 md:top-[104px] md:w-80 md:max-h-[calc(100%-120px)]"
                : "bottom-4 left-auto right-4 top-auto w-auto md:bottom-4 md:right-4 md:top-auto"
            )}
          >
            <div className="pointer-events-auto">
              <button
                onClick={() => setRouteOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 p-3 text-sm font-semibold text-zinc-100"
              >
                <span>
                  {t("plan.title")} · {t("map.routeSets", { count: route.totalSets })}
                </span>
                {routeOpen ? (
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-zinc-400" />
                )}
              </button>
              {routeOpen && (
                <div className="h-full max-h-[calc(40vh-44px)] overflow-y-auto px-3 pb-3 md:max-h-[calc(100%-148px)]">
                  <div className="space-y-2">
                    {route.legs.map((leg, idx) => {
                      const venue = venueMap.get(leg.set.venueId || "");
                      const nextVenue = leg.nextSet
                        ? venueMap.get(leg.nextSet.venueId || "")
                        : undefined;
                      const isLast = idx === route.legs.length - 1;

                      return (
                        <div key={leg.set.id}>
                          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
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
                            <div className="mt-0.5 text-sm font-medium text-zinc-100">
                              {leg.set.artistName}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {leg.set.stageName}
                            </div>
                          </div>

                          {!isLast && nextVenue && (
                            <div className="my-1.5 flex items-center gap-2 px-1">
                              <div
                                className={
                                  leg.status === "impossible"
                                    ? "flex-1 border-l-2 border-dashed border-rose-500 pl-2 text-xs text-rose-400"
                                    : leg.status === "tight"
                                    ? "flex-1 border-l-2 border-dashed border-amber-500 pl-2 text-xs text-amber-400"
                                    : "flex-1 border-l-2 border-dashed border-cyan-500 pl-2 text-xs text-cyan-400"
                                }
                              >
                                <div className="flex items-center gap-1">
                                  <Navigation className="h-3 w-3" />
                                  {t("plan.leg.walk", { minutes: leg.walkMinutes })}
                                  <ArrowRight className="h-3 w-3" />
                                  {nextVenue.name}
                                </div>
                                <div className="mt-0.5 text-[10px] text-zinc-500">
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

                              <div className="flex shrink-0 gap-1.5">
                                <a
                                  href={buildGoogleMapsUrl(
                                    venue!.lat,
                                    venue!.lng,
                                    nextVenue.lat,
                                    nextVenue.lng
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                  title="Google Maps"
                                >
                                  <MapPin className="h-3 w-3" />
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
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                  title="Apple Maps"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
