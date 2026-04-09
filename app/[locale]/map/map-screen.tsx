"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "@/lib/i18n/client";
import { useDay } from "@/lib/hooks/use-day";
import { usePersistentState } from "@/lib/hooks/use-persistent-state";
import { usePlannedRoute } from "@/lib/hooks/use-planned-route";
import { buildAppleMapsRouteUrl, buildGoogleMapsRouteUrl } from "@/lib/utils/map-urls";
import { getRouteExportStops } from "@/lib/utils/routing";
import { RoutePlannerPanel } from "@/components/route-planner-panel";
import { DaySwitcher } from "@/components/day-switcher";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { TimetableSet } from "@/lib/data/timetable";

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

export default function MapPage({
  timetableSets,
}: {
  timetableSets: TimetableSet[];
}) {
  const { t } = useTranslation();
  const [day, setDay] = useDay();
  const [routeOpen, setRouteOpen] = useState(true);
  const [favorites] = usePersistentState<Record<string, boolean>>(
    "synchronicity-favorites",
    {},
  );

  const dayNum = day === "1" ? 1 : 2;
  const daySets = useMemo(
    () => timetableSets.filter((set) => set.day === dayNum),
    [timetableSets, dayNum],
  );
  const favoriteSets = useMemo(
    () => timetableSets.filter((set) => favorites[set.id]),
    [timetableSets, favorites],
  );
  const dayFavoriteSets = useMemo(
    () => daySets.filter((set) => favorites[set.id]),
    [daySets, favorites],
  );
  const {
    route,
    toggleOption,
    selectAllInGroup,
    clearGroup,
    isLoadingDirections,
  } = usePlannedRoute(favoriteSets, dayNum);
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

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="absolute left-0 right-0 top-0 z-[1000] border-b border-zinc-800/80 bg-background/80 px-4 py-3 backdrop-blur md:left-56 md:px-6 md:py-4">
        <div className="mx-auto max-w-md md:max-w-6xl">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight md:text-[1.7rem]">
              {t("map.title")}
            </h1>
            <span className="text-xs text-zinc-400 md:text-sm" suppressHydrationWarning>
              {t("map.selectedCount", { count: dayFavoriteSets.length })}
            </span>
          </div>
          <DaySwitcher
            value={day}
            onChangeAction={(value) => {
              setDay(value);
              document
                .getElementById("main-scroll")
                ?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            day1Label={t("map.tabs.day1")}
            day2Label={t("map.tabs.day2")}
            className="mt-3 w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900/80 p-1 shadow-sm md:max-w-sm [&_[data-slot='tabs-list']]:bg-transparent"
          />
        </div>
      </header>

      <div className="relative flex-1 pt-[104px]">
        <VenueMap favorites={dayFavoriteSets} routeLegs={route.legs} />

        {route.totalSets > 0 ? (
          <div
            className={cn(
              "pointer-events-none absolute z-[1000] overflow-hidden rounded-3xl border border-zinc-800 bg-background/92 backdrop-blur transition-all",
              routeOpen
                ? "bottom-4 left-4 right-4 max-h-[72vh] md:bottom-4 md:left-auto md:right-6 md:top-[118px] md:w-[440px] md:max-h-[calc(100%-134px)]"
                : "bottom-4 right-4 w-auto",
            )}
          >
            <div className="pointer-events-auto">
              <button
                onClick={() => setRouteOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-zinc-100"
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

              {routeOpen ? (
                <div className="max-h-[calc(72vh-52px)] overflow-y-auto border-t border-zinc-900 px-4 pb-4 pt-3 md:max-h-[calc(100%-52px)]">
                  <div className="mb-4 grid gap-2 sm:grid-cols-2">
                    <MapActionLink href={googleRouteUrl} disabled={!canOpenRoute}>
                      {t("plan.exportGoogleRoute")}
                    </MapActionLink>
                    <MapActionLink href={appleRouteUrl} disabled={!canOpenRoute}>
                      {t("plan.exportAppleRoute")}
                    </MapActionLink>
                  </div>

                  <RoutePlannerPanel
                    route={route}
                    onToggleOption={toggleOption}
                    onSelectAllInGroup={selectAllInGroup}
                    onClearGroup={clearGroup}
                    isLoadingDirections={isLoadingDirections}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MapActionLink({
  children,
  href,
  disabled = false,
}: {
  children: React.ReactNode;
  href: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs font-medium text-zinc-600">
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900/80 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
