"use client";

import { useMemo, useState } from "react";
import { Button, Input, Modal } from "@heroui/react";
import { Heart, MapPin, Search, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/client";
import { useDay } from "@/lib/hooks/use-day";
import { usePersistentState } from "@/lib/hooks/use-persistent-state";
import { timetable, type TimetableSet } from "@/lib/data/timetable";
import { venueMap } from "@/lib/data/venues";
import { formatTime } from "@/lib/utils/route-planner";
import { ImportFromImageButton } from "@/components/import-from-image";
import { TimetableBoard } from "@/components/timetable-board";

export default function TimetablePage() {
  const { t } = useTranslation();
  const [day, setDay] = useDay();
  const [favorites, setFavorites] = usePersistentState<Record<string, boolean>>(
    "synchronicity-favorites",
    {},
  );
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [activeVenueId, setActiveVenueId] = useState<string | null>(null);
  const [selectedSet, setSelectedSet] = useState<TimetableSet | null>(null);

  const dayNum = day === "1" ? 1 : 2;
  const daySets = useMemo(
    () => timetable.filter((set) => set.day === dayNum),
    [dayNum],
  );
  const dayVenues = useMemo(
    () =>
      Array.from(new Set(daySets.map((set) => set.venueId || "").filter(Boolean)))
        .map((venueId) => venueMap.get(venueId))
        .filter((venue): venue is NonNullable<typeof venue> => Boolean(venue)),
    [daySets],
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

  const favoriteIds = useMemo(
    () => new Set(Object.entries(favorites).filter(([, value]) => value).map(([id]) => id)),
    [favorites],
  );

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex min-h-full flex-col bg-[#050505]">
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#050505]/92 px-4 py-3 backdrop-blur-md md:px-6 md:py-4">
        <div className="mx-auto max-w-md md:max-w-7xl">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  SYNCHRONICITY&apos;26
                </div>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50 md:text-[1.8rem]">
                  {t("timetable.title")}
                </h1>
              </div>
              <div className="flex items-center gap-2">
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
                <Button
                  onPress={() => setShowFavoritesOnly((value) => !value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    showFavoritesOnly
                      ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                      : "bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
                  {t("timetable.favoritesOnly")}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[18rem_minmax(0,1fr)] md:items-center">
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-1">
                <button
                  className={`h-9 rounded-xl text-sm font-medium transition-colors ${
                    day === "1" ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  onClick={() => setDay("1")}
                  aria-label={t("timetable.tabs.day1")}
                >
                  {t("timetable.tabs.day1")}
                </button>
                <button
                  className={`h-9 rounded-xl text-sm font-medium transition-colors ${
                    day === "2" ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  onClick={() => setDay("2")}
                  aria-label={t("timetable.tabs.day2")}
                >
                  {t("timetable.tabs.day2")}
                </button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("timetable.searchPlaceholder")}
                  aria-label={t("timetable.searchPlaceholder")}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 pl-9 pr-10 text-zinc-200"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                    aria-label={t("timetable.clearSearch")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto max-w-md space-y-4 md:max-w-7xl">
          {/* Venue Quick Navigation */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
            <div className="flex gap-2 w-min md:w-full">
              <button
                onClick={() => {
                  setQuery("");
                  setActiveVenueId(null);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  query === "" && resolvedVenueId === null
                    ? "bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/50"
                    : "border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t("timetable.filterAll")}
              </button>
              {dayVenues.map((venue) => (
                  <button
                    key={venue.id}
                    onClick={() => setActiveVenueId(venue.id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      resolvedVenueId === venue.id ? "ring-1" : ""
                    }`}
                    style={{
                      borderColor: `${venue.color}${resolvedVenueId === venue.id ? "aa" : "40"}`,
                      backgroundColor: `${venue.color}${resolvedVenueId === venue.id ? "22" : "15"}`,
                      color: venue.color,
                      boxShadow:
                        resolvedVenueId === venue.id
                          ? `0 0 0 1px ${venue.color}55 inset`
                          : undefined,
                    }}
                  >
                    {venue.name.split(" ").pop()}
                  </button>
                ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {showFavoritesOnly
                ? t("timetable.favoritesOnly")
                : t("timetable.resultCount", { count: visibleSets.length })}
            </span>
            <span>{visibleSets.length} / {daySets.length}</span>
          </div>

          {visibleSets.length === 0 ? (
            <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 px-5 py-12 text-center text-sm text-zinc-400">
              {query.trim() ? t("timetable.noResults") : t("timetable.empty")}
            </div>
          ) : (
            <TimetableBoard
              sets={visibleSets}
              frameSets={daySets}
              selectedIds={favoriteIds}
              onSelectSet={setSelectedSet}
              onToggleFavorite={toggleFavorite}
            />
          )}
        </div>
      </main>

      <Modal.Root
        isOpen={!!selectedSet}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSet(null);
          }
        }}
      >
        <Modal.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Modal.Container className="fixed inset-x-0 bottom-0 z-50 w-full sm:bottom-auto sm:inset-y-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2">
          <Modal.Dialog className="rounded-t-[28px] border border-zinc-800 bg-[#050505] outline-none sm:rounded-[28px]">
            {selectedSet ? (
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      {formatTime(selectedSet.startAt)} - {formatTime(selectedSet.finishAt)}
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
                      {selectedSet.artistName}
                    </h2>
                    <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                      <MapPin className="h-4 w-4" />
                      <span>{venueMap.get(selectedSet.venueId || "")?.name ?? selectedSet.stageName}</span>
                    </div>
                  </div>
                  <Modal.CloseTrigger
                    aria-label={t("common.close")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-400"
                  >
                    <X className="h-4 w-4" />
                  </Modal.CloseTrigger>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-400">
                    {selectedSet.stageName}
                  </div>
                  <button
                    onClick={() => toggleFavorite(selectedSet.id)}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                      favorites[selectedSet.id]
                        ? "bg-blue-500/30 text-blue-300 border border-blue-500/50 hover:bg-blue-500/40"
                        : "bg-zinc-800/50 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/70"
                    }`}
                  >
                    <Heart className={`inline-block h-4 w-4 mr-2 ${favorites[selectedSet.id] ? "fill-current" : ""}`} />
                    {favorites[selectedSet.id]
                      ? t("timetable.removeFavorite")
                      : t("timetable.addFavorite")}
                  </button>
                </div>
              </div>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Root>
    </div>
  );
}
