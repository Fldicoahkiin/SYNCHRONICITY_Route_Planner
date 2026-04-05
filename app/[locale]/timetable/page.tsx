"use client";

import { useMemo, useState } from "react";
import { Heart, MapPin, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import useLocalStorageState from "use-local-storage-state";
import { useTranslation } from "@/lib/i18n/client";
import { useDay } from "@/lib/hooks/use-day";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { timetable, type TimetableSet } from "@/lib/data/timetable";
import { venues, venueMap } from "@/lib/data/venues";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/route-planner";

export default function TimetablePage() {
  const { t } = useTranslation();
  const [day, setDay] = useDay();
  const [favorites, setFavorites] = useLocalStorageState<Record<string, boolean>>("synchronicity-favorites", {
    defaultValue: {},
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState<TimetableSet | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const dayNum = day === "1" ? 1 : 2;

  const rows = useMemo(() => {
    const sets = timetable.filter((t) => t.day === dayNum);
    const venueOrder = venues.map((v) => v.id);
    const grouped: Record<string, TimetableSet[]> = {};
    venueOrder.forEach((v) => (grouped[v] = []));
    sets.forEach((s) => {
      if (s.venueId && grouped[s.venueId]) {
        grouped[s.venueId].push(s);
      }
    });
    const normalizedQuery = query.trim().toLowerCase();
    return venueOrder
      .map((venueId) => ({
        venueId,
        venue: venueMap.get(venueId)!,
        sets: grouped[venueId]
          .filter((s) => {
            if (showFavoritesOnly && !favorites[s.id]) return false;
            if (normalizedQuery) {
              return (
                s.artistName.toLowerCase().includes(normalizedQuery) ||
                s.stageName.toLowerCase().includes(normalizedQuery)
              );
            }
            return true;
          })
          .sort((a, b) => a.startAt - b.startAt),
      }))
      .filter((r) => r.sets.length > 0);
  }, [dayNum, query, showFavoritesOnly, favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hasAnyFavorites = Object.values(favorites).some(Boolean);
  const clearAllFavorites = () => {
    if (typeof window !== "undefined" && window.confirm(t("timetable.clearConfirm"))) {
      setFavorites({});
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a0a]/80">
        <div className="mx-auto flex max-w-md items-center justify-between md:max-w-5xl">
          <h1 className="text-lg font-semibold tracking-tight">{t("timetable.title")}</h1>
          <div className="flex items-center gap-2">
            {hasAnyFavorites && (
              <button
                onClick={clearAllFavorites}
                className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
              >
                {t("timetable.clearFavorites")}
              </button>
            )}
            <Toggle
              pressed={showFavoritesOnly}
              onPressedChange={setShowFavoritesOnly}
              className="h-8 border border-zinc-700 px-3 text-xs data-[state=on]:bg-cyan-500/20 data-[state=on]:text-cyan-400"
            >
              <Heart className="mr-1 h-3.5 w-3.5" />
              {t("timetable.favoritesOnly")}
            </Toggle>
          </div>
        </div>
        <div className="relative mx-auto mt-3 max-w-md md:max-w-5xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder={t("timetable.searchPlaceholder")}
            className="h-9 border-zinc-700 bg-zinc-900 pl-9 pr-8 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-cyan-500"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              aria-label={t("timetable.clearSearch")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Tabs value={day} onValueChange={(v) => { setDay(v as "1" | "2"); document.getElementById("main-scroll")?.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-3">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-900 md:max-w-sm">
            <TabsTrigger value="1">{t("timetable.tabs.day1")}</TabsTrigger>
            <TabsTrigger value="2">{t("timetable.tabs.day2")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main className="flex-1 space-y-6 px-4 py-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0 lg:grid-cols-3">
        {rows.length === 0 ? (
          <div className="col-span-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-12 text-center text-sm text-zinc-400">
            {query.trim()
              ? t("timetable.noResults")
              : showFavoritesOnly
              ? t("timetable.empty")
              : t("timetable.empty")}
          </div>
        ) : (
          rows.map((row) => (
            <section key={row.venueId} className="md:rounded-xl md:border md:border-zinc-800 md:bg-zinc-900/30 md:p-4">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: row.venue.color }}
                />
                <h2 className="text-sm font-semibold text-zinc-200">{row.venue.name}</h2>
                <span className="text-xs text-zinc-500">
                  {row.venue.area === "A"
                    ? t("timetable.areaA")
                    : row.venue.area === "B"
                    ? t("timetable.areaB")
                    : t("timetable.areaOther")}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {row.sets.map((s) => {
                    const isFav = !!favorites[s.id];
                    return (
                      <div
                        key={s.id}
                        onClick={() => { setSelectedSet(s); setSheetOpen(true); }}
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className="font-mono">
                              {formatTime(s.startAt)} - {formatTime(s.finishAt)}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-[15px] font-medium text-zinc-100">
                            {s.artistName}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{s.stageName}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(s.id); }}
                          className={cn(
                            "ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                            isFav
                              ? "bg-pink-500/15 text-pink-500"
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          )}
                          aria-label={isFav ? t("timetable.removeFavorite") : t("timetable.addFavorite")}
                        >
                          <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </section>
          ))
        )}
      </main>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="border-zinc-800 bg-[#0a0a0a] text-zinc-100 md:max-w-md md:self-end">
          {selectedSet && (
            <>
              <SheetHeader>
                <SheetTitle className="text-zinc-100">{selectedSet.artistName}</SheetTitle>
                <SheetDescription className="text-zinc-400">
                  {formatTime(selectedSet.startAt)} - {formatTime(selectedSet.finishAt)} · {" "}
                  {venueMap.get(selectedSet.venueId || "")?.name ?? selectedSet.stageName}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6 pt-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: venueMap.get(selectedSet.venueId || "")?.color,
                    }}
                  />
                  <span className="text-sm text-zinc-300">
                    {venueMap.get(selectedSet.venueId || "")?.name ?? selectedSet.stageName}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {(venueMap.get(selectedSet.venueId || "")?.area === "A"
                      ? t("timetable.areaA")
                      : venueMap.get(selectedSet.venueId || "")?.area === "B"
                      ? t("timetable.areaB")
                      : t("timetable.areaOther")) || ""}
                  </span>
                </div>

                <button
                  onClick={() => {
                    toggleFavorite(selectedSet.id);
                  }}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors",
                    favorites[selectedSet.id]
                      ? "bg-pink-500/15 text-pink-500"
                      : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  )}
                >
                  <Heart
                    className={cn("h-4 w-4", favorites[selectedSet.id] && "fill-current")}
                  />
                  {favorites[selectedSet.id]
                    ? t("timetable.removeFavorite")
                    : t("timetable.addFavorite")}
                </button>

                {(() => {
                  const sameVenueSets = timetable
                    .filter(
                      (t) =>
                        t.venueId === selectedSet.venueId && t.id !== selectedSet.id
                    )
                    .sort((a, b) => a.startAt - b.startAt);
                  if (sameVenueSets.length === 0) return null;
                  return (
                    <div>
                      <div className="mb-2 text-xs font-semibold text-zinc-300">
                        {t("timetable.otherAtVenue")}
                      </div>
                      <div className="space-y-2">
                        {sameVenueSets.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => setSelectedSet(s)}
                            className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 transition-colors hover:border-zinc-700"
                          >
                            <div className="text-xs text-zinc-400">
                              <span className="font-mono">
                                {formatTime(s.startAt)} - {formatTime(s.finishAt)}
                              </span>
                              <span className="ml-2 text-[10px]">
                                {s.day === 1 ? t("timetable.tabs.day1") : t("timetable.tabs.day2")}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-zinc-100">{s.artistName}</div>
                            <div className="text-[10px] text-zinc-500">{s.stageName}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const sameArtistSets = timetable
                    .filter(
                      (t) =>
                        t.artistName === selectedSet.artistName && t.id !== selectedSet.id
                    )
                    .sort((a, b) => a.startAt - b.startAt);
                  if (sameArtistSets.length === 0) return null;
                  return (
                    <div>
                      <div className="mb-2 text-xs font-semibold text-zinc-300">
                        {t("timetable.otherDays")}
                      </div>
                      <div className="space-y-2">
                        {sameArtistSets.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => setSelectedSet(s)}
                            className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 transition-colors hover:border-zinc-700"
                          >
                            <div className="text-xs text-zinc-400">
                              <span className="font-mono">
                                {formatTime(s.startAt)} - {formatTime(s.finishAt)}
                              </span>
                              <span className="ml-2 text-[10px]">
                                {s.day === 1 ? t("timetable.tabs.day1") : t("timetable.tabs.day2")}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-zinc-100">{s.stageName}</div>
                            <div className="text-[10px] text-zinc-500">
                              {venueMap.get(s.venueId || "")?.name ?? s.venueId}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
