"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useLocalStorageState from "use-local-storage-state";
import { Input } from "@heroui/react";
import { useTranslation } from "@/lib/i18n/client";
import { useDay } from "@/lib/hooks/use-day";
import { usePlannedRoute } from "@/lib/hooks/use-planned-route";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { timetable } from "@/lib/data/timetable";
import { venueMap } from "@/lib/data/venues";
import { calculateScore } from "@/lib/utils/scoring";
import { buildAppleMapsRouteUrl, buildGoogleMapsRouteUrl } from "@/lib/utils/map-urls";
import { getRouteExportStops } from "@/lib/utils/routing";
import { TimetableBoard } from "@/components/timetable-board";
import { RoutePlannerPanel } from "@/components/route-planner-panel";
import { ImportFromImageButton } from "@/components/import-from-image";
import type { Locale } from "@/lib/i18n/settings";
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  Heart,
  Map,
  Route,
  Search,
  X,
} from "lucide-react";

function MapLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-sm text-zinc-400">
      地图加载中…
    </div>
  );
}

const VenueMap = dynamic(() => import("@/components/venue-map"), {
  ssr: false,
  loading: () => <MapLoading />,
});

export default function BrowsePage() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [day, setDay] = useDay();
  const [favorites, setFavorites] = useLocalStorageState<Record<string, boolean>>(
    "synchronicity-favorites",
    { defaultValue: {} },
  );
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [query, setQuery] = useState("");

  const dayNum = day === "1" ? 1 : 2;

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const daySets = useMemo(
    () => timetable.filter((set) => set.day === dayNum),
    [dayNum],
  );

  const visibleSets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return daySets.filter((set) => {
      if (showFavoritesOnly && !favorites[set.id]) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        set.artistName.toLowerCase().includes(normalizedQuery) ||
        set.stageName.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [daySets, favorites, query, showFavoritesOnly]);

  const favoriteSets = useMemo(
    () => timetable.filter((set) => favorites[set.id]),
    [favorites],
  );
  const favoriteIds = useMemo(
    () => new Set(Object.entries(favorites).filter(([, value]) => value).map(([id]) => id)),
    [favorites],
  );
  const {
    route,
    toggleOption,
    selectAllInGroup,
    clearGroup,
    setFocusedBranch,
    isLoadingDirections,
    hasRouteApiError,
  } = usePlannedRoute(favoriteSets, dayNum);
  const score = useMemo(() => calculateScore(route, t), [route, t]);
  const exportStops = useMemo(() => getRouteExportStops(route.legs), [route.legs]);
  const googleRouteUrl = useMemo(() => buildGoogleMapsRouteUrl(exportStops), [exportStops]);
  const appleRouteUrl = useMemo(() => buildAppleMapsRouteUrl(exportStops), [exportStops]);
  const canOpenRoute = exportStops.length > 1;
  const locale = (pathname.split("/")[1] as Locale) || "ja";

  return (
    <div className="flex min-h-full flex-col bg-[#050505]">
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#050505]/92 px-4 py-3 backdrop-blur-md md:px-6 md:py-4">
        <div className="mx-auto max-w-md md:max-w-7xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                SYNCHRONICITY&apos;26
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50 md:text-[1.8rem]">
                浏览
              </h1>
            </div>
            <ImportFromImageButton
              onImportAction={(ids) => {
                setFavorites((prev) => {
                  const next = { ...prev };
                  ids.forEach((id) => {
                    next[id] = true;
                  });
                  return next;
                });
              }}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[18rem_minmax(0,1fr)] md:items-center">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-1">
              <button
                className={`h-9 rounded-xl text-sm font-medium transition-colors ${
                  day === "1" ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
                }`}
                onClick={() => setDay("1")}
              >
                {t("plan.tabs.day1")}
              </button>
              <button
                className={`h-9 rounded-xl text-sm font-medium transition-colors ${
                  day === "2" ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
                }`}
                onClick={() => setDay("2")}
              >
                {t("plan.tabs.day2")}
              </button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("timetable.searchPlaceholder")}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 pl-9 pr-10 text-zinc-200"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto max-w-md md:max-w-7xl">
          <Tabs defaultValue="timetable" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-1">
              <TabsTrigger value="timetable" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">时间表</span>
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300">
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">地图</span>
              </TabsTrigger>
              <TabsTrigger value="route" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
                <Route className="h-4 w-4" />
                <span className="hidden sm:inline">路线</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timetable" className="mt-4 space-y-4">
              <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
                <div className="flex w-min gap-2 md:w-full">
                  <button
                    onClick={() => setQuery("")}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      query === ""
                        ? "bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/50"
                        : "border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    全部
                  </button>
                  {Array.from(new Set(daySets.map((set) => set.venueId || "").filter(Boolean)))
                    .map((venueId) => venueMap.get(venueId))
                    .filter(Boolean)
                    .map((venue) => (
                      <button
                        key={venue?.id}
                        onClick={() => setQuery("")}
                        className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
                        style={{
                          borderColor: `${venue?.color}40`,
                          backgroundColor: `${venue?.color}15`,
                          color: venue?.color,
                        }}
                      >
                        {venue?.name.split(" ").pop()}
                      </button>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{visibleSets.length} 场演出</span>
                <button
                  onClick={() => setShowFavoritesOnly((value) => !value)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    showFavoritesOnly
                      ? "bg-rose-500/30 text-rose-300 ring-1 ring-rose-500/50"
                      : "border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
                  收藏
                </button>
              </div>

              {visibleSets.length === 0 ? (
                <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 px-5 py-12 text-center text-sm text-zinc-400">
                  {query.trim() ? "没有找到匹配的演出" : "还没有选择任何演出"}
                </div>
              ) : (
                <TimetableBoard
                  sets={visibleSets}
                  frameSets={daySets}
                  selectedIds={favoriteIds}
                  onToggleFavorite={toggleFavorite}
                />
              )}
            </TabsContent>

            <TabsContent value="map" className="mt-4 space-y-4">
              <div className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950/70">
                <div className="h-[420px] w-full border-b border-zinc-800 bg-zinc-950">
                  <VenueMap favorites={favoriteSets.filter((set) => set.day === dayNum)} daySets={daySets} routeLegs={route.legs} />
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      {t("plan.routeDetailsTitle")}
                    </div>
                    <p className="text-sm text-zinc-300">
                      {score.advice}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {t("plan.riskDetail", {
                        impossible: route.impossibleLegs,
                        tight: route.tightLegs,
                      })}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      {t("plan.exportGoogleRoute")}
                    </div>
                    <div className="mt-3 grid gap-2">
                      <MapActionLink href={googleRouteUrl} disabled={!canOpenRoute}>
                        {t("plan.exportGoogleRoute")}
                      </MapActionLink>
                      <MapActionLink href={appleRouteUrl} disabled={!canOpenRoute}>
                        {t("plan.exportAppleRoute")}
                      </MapActionLink>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="route" className="mt-4 space-y-4">
              {route.totalSets === 0 ? (
                <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 px-5 py-12 text-center text-sm text-zinc-400">
                  <p>还没有规划路线</p>
                  <Link
                    href={`/${locale}/browse`}
                    className="mt-4 inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20"
                  >
                    选择演出
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
                        {t("plan.scoreLabel")}
                      </div>
                      <div className="text-3xl font-bold text-cyan-400">{score.badge}</div>
                      <div className="space-y-1.5">
                        <p className="text-sm leading-relaxed text-zinc-300">{score.advice}</p>
                        <p className="text-xs text-zinc-500">
                          {t("plan.scoreDetail", {
                            impossible: score.impossibleJumps,
                            buffer: score.averageBufferMinutes,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <RoutePlannerPanel
                    route={route}
                    onToggleOption={toggleOption}
                    onSelectAllInGroup={selectAllInGroup}
                    onClearGroup={clearGroup}
                    onFocusBranch={setFocusedBranch}
                    isLoadingDirections={isLoadingDirections}
                    hasRouteApiError={hasRouteApiError}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
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
      <span className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs font-medium text-zinc-600">
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-center gap-2 rounded-lg bg-blue-500/20 px-3 py-2 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-500/30"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
