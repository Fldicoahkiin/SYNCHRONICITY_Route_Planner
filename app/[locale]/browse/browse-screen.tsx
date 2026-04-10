"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/client";
import { useDay } from "@/lib/hooks/use-day";
import { useFavorites } from "@/lib/hooks/use-favorites";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Locale } from "@/lib/i18n/settings";
import type { TimetableSet } from "@/lib/data/timetable";
import type { Venue } from "@/lib/data/venues";
import { Route, ArrowRight, Heart, Trash2, Search, X } from "lucide-react";
import { ImportFromImageButton } from "@/components/import-from-image";
import { DaySwitcher } from "@/components/day-switcher";
import { TimetableBoard } from "@/components/timetable-board";

function BrowsePageHeader({
  day,
  query,
  onDayChange,
  onQueryChange,
  onQueryClear,
}: {
  day: "1" | "2";
  query: string;
  onDayChange: (day: "1" | "2") => void;
  onQueryChange: (value: string) => void;
  onQueryClear: () => void;
}) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-background/92 px-4 py-3 backdrop-blur-md md:px-6 md:py-4">
      <div className="mx-auto max-w-md md:max-w-7xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              SYNCHRONICITY&apos;26
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50 md:text-[1.8rem]">
              {t("browse.title")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <LocaleSwitcher />
            </div>
            <ImportFromImageButton onDayChange={onDayChange} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[18rem_minmax(0,1fr)] md:items-center">
          <DaySwitcher
            value={day}
            onChangeAction={onDayChange}
            day1Label={t("plan.tabs.day1")}
            day2Label={t("plan.tabs.day2")}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-1 [&_[data-slot='tabs-list']]:bg-transparent"
          />

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t("timetable.searchPlaceholder")}
              className="w-full rounded-2xl border-zinc-800 bg-zinc-950/60 pl-9 pr-10 text-zinc-200"
            />
            {query ? (
              <button
                type="button"
                onClick={onQueryClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function VenueFilterRow({
  venues,
  query,
  activeVenueId,
  onReset,
  onSelectVenue,
}: {
  venues: Venue[];
  query: string;
  activeVenueId: string | null;
  onReset: () => void;
  onSelectVenue: (venueId: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="-mx-4 px-4 pb-2 md:mx-0 md:px-0">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onReset}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            query === "" && activeVenueId === null
              ? "bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/50"
              : "border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {t("timetable.filterAll")}
        </button>
        {venues.map((venue) => (
          <button
            key={venue.id}
            onClick={() => onSelectVenue(venue.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              activeVenueId === venue.id ? "ring-1" : ""
            }`}
            style={{
              borderColor: `${venue.color}${activeVenueId === venue.id ? "aa" : "40"}`,
              backgroundColor: `${venue.color}${activeVenueId === venue.id ? "22" : "15"}`,
              color: venue.color,
              boxShadow:
                activeVenueId === venue.id
                  ? `0 0 0 1px ${venue.color}55 inset`
                  : undefined,
            }}
          >
            {venue.name.split(" ").pop()}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlanPromptCard({ locale }: { locale: Locale }) {
  const { t } = useTranslation();
  return (
    <Link
      href={`/${locale}/plan`}
      className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950">
          <Route className="h-4 w-4 text-cyan-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-zinc-200">{t("nav.plan")}</div>
          <div className="text-xs text-zinc-500">{t("browse.goToPlanHint")}</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-zinc-500" />
    </Link>
  );
}

export default function BrowsePage({
  timetableSets,
  venuesList,
}: {
  timetableSets: TimetableSet[];
  venuesList: Venue[];
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [day, setDay] = useDay();
  const { favorites, favoriteIds, toggleFavorite, clearFavorites } = useFavorites();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [activeVenueId, setActiveVenueId] = useState<string | null>(null);

  const venueMap = useMemo(
    () => new Map(venuesList.map((v) => [v.id, v])),
    [venuesList],
  );

  const dayNum = day === "1" ? 1 : 2;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const daySets = useMemo(
    () => timetableSets.filter((set) => set.day === dayNum),
    [timetableSets, dayNum],
  );
  const dayVenues = useMemo(
    () =>
      Array.from(new Set(daySets.map((set) => set.venueId || "").filter(Boolean)))
        .map((venueId) => venueMap.get(venueId))
        .filter((venue): venue is NonNullable<typeof venue> => Boolean(venue)),
    [daySets, venueMap],
  );
  const resolvedVenueId =
    activeVenueId && daySets.some((set) => set.venueId === activeVenueId)
      ? activeVenueId
      : null;

  const visibleSets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return daySets.filter((set) => {
      if (resolvedVenueId && set.venueId !== resolvedVenueId) {
        return false;
      }

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
  }, [daySets, favorites, query, resolvedVenueId, showFavoritesOnly]);

  // favoriteIds now comes from useFavorites hook
  const locale = (pathname.split("/")[1] as Locale) || "ja";

  return (
    <div className="flex min-h-full flex-col bg-background">
      <BrowsePageHeader
        day={day}
        query={query}
        onDayChange={setDay}
        onQueryChange={setQuery}
        onQueryClear={() => setQuery("")}
      />

      <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto max-w-md space-y-4 md:max-w-7xl">
          <PlanPromptCard locale={locale} />

          <VenueFilterRow
            venues={dayVenues}
            query={query}
            activeVenueId={resolvedVenueId}
            onReset={() => {
              setQuery("");
              setActiveVenueId(null);
            }}
            onSelectVenue={setActiveVenueId}
          />

          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{t("timetable.resultCount", { count: visibleSets.length })}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (window.confirm(t("timetable.clearConfirm") || "Clear all favorites?")) {
                    clearFavorites();
                    setShowFavoritesOnly(false);
                  }
                }}
                disabled={!mounted || favoriteIds.size === 0}
                className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:text-zinc-200 disabled:opacity-50"
                title={t("timetable.clearFavorites")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setShowFavoritesOnly((value) => !value)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  showFavoritesOnly
                    ? "bg-rose-500/30 text-rose-300 ring-1 ring-rose-500/50"
                    : "border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
                {t("timetable.favoritesOnly")}
              </button>
            </div>
          </div>

          {visibleSets.length === 0 ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 px-5 py-12 text-center text-sm text-zinc-400">
              {query.trim()
                ? t("timetable.noResults")
                : showFavoritesOnly
                  ? t("timetable.empty")
                  : t("browse.emptySelection")}
            </div>
          ) : (
            <TimetableBoard
              sets={visibleSets}
              frameSets={daySets}
              selectedIds={favoriteIds}
              compactLayout={showFavoritesOnly && query === ""}
              onlyActiveVenues={showFavoritesOnly || !!resolvedVenueId}
              onToggleFavorite={toggleFavorite}
            />
          )}
        </div>
      </main>
    </div>
  );
}
