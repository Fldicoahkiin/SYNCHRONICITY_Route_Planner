"use client";

import { useMemo, memo, useState } from "react";
import { venues, venueMap } from "@/lib/data/venues";
import type { TimetableSet } from "@/lib/data/timetable";
import { formatTime } from "@/lib/utils/route-planner";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut } from "lucide-react";

const HEADER_HEIGHT = 54;
const TIME_COLUMN_WIDTH = 64;
const BASE_COLUMN_WIDTH = 280;
const BASE_MINUTE_HEIGHT = 4.0;
const BLOCK_GAP = 6;

const shortVenueLabel: Record<string, string> = {
  "o-east": "O-EAST",
  "o-east-2nd": "O-EAST 2nd",
  "o-east-3f": "O-EAST 3F",
  duo: "duo",
  "o-west": "O-WEST",
  clubasia: "clubasia",
  "o-nest": "O-nest",
  "o-nest-2nd": "O-nest 2nd",
  quattro: "QUATTRO",
  veats: "Veats",
  www: "WWW",
  wwwx: "WWWX",
  "tokio-tokyo": "TOKIO",
  fows: "FOWS",
  "7thfloor": "7thFLOOR",
  linecube: "LINE CUBE",
};

interface TimetableBoardProps {
  sets: TimetableSet[];
  frameSets?: TimetableSet[];
  selectedIds?: Set<string>;
  routeOrder?: Map<string, number>;
  onlyActiveVenues?: boolean;
  compactLayout?: boolean;
  onSelectSet?: (set: TimetableSet) => void;
  onToggleFavorite?: (id: string) => void;
  className?: string;
}

function getTokyoMinutes(ts: number): number {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(ts * 1000))
    .split(":")
    .map(Number);

  return parts[0] * 60 + parts[1];
}

function floorToStep(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function ceilToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

function hexToRgba(hex: string, alpha: number): string {
  const safeHex = hex.replace("#", "");
  const expanded =
    safeHex.length === 3
      ? safeHex
        .split("")
        .map((part) => `${part}${part}`)
        .join("")
      : safeHex;

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export const TimetableBoard = memo(function TimetableBoard({
  sets,
  frameSets,
  selectedIds,
  routeOrder,
  onlyActiveVenues = false,
  compactLayout = false,
  onSelectSet,
  onToggleFavorite,
  className,
}: TimetableBoardProps) {
  const [zoom, setZoom] = useState(1);
  const COLUMN_WIDTH = BASE_COLUMN_WIDTH * zoom;
  const MINUTE_HEIGHT = BASE_MINUTE_HEIGHT * zoom;

  const framingSets = frameSets && frameSets.length > 0 ? frameSets : sets;

  const visibleVenues = useMemo(() => {
    if (!onlyActiveVenues) {
      return venues;
    }

    const activeIds = new Set(sets.map((set) => set.venueId).filter(Boolean));
    return venues.filter((venue) => activeIds.has(venue.id));
  }, [onlyActiveVenues, sets]);

  const venueIndex = useMemo(
    () => new Map(visibleVenues.map((venue, index) => [venue.id, index])),
    [visibleVenues],
  );

  const timeRange = useMemo(() => {
    if (framingSets.length === 0) {
      return {
        startMinutes: 13 * 60,
        endMinutes: 22 * 60,
        height: (22 * 60 - 13 * 60) * MINUTE_HEIGHT,
      };
    }

    const startMinutes = floorToStep(
      Math.min(...framingSets.map((set) => getTokyoMinutes(set.startAt))),
      30,
    );
    const endMinutes = ceilToStep(
      Math.max(...framingSets.map((set) => getTokyoMinutes(set.finishAt))),
      30,
    );

    return {
      startMinutes,
      endMinutes,
      height: Math.max(480, (endMinutes - startMinutes) * MINUTE_HEIGHT),
    };
  }, [framingSets, MINUTE_HEIGHT]);

  const hourLines = useMemo(() => {
    const lines: number[] = [];
    for (
      let minute = floorToStep(timeRange.startMinutes, 60);
      minute <= timeRange.endMinutes;
      minute += 60
    ) {
      lines.push(minute);
    }
    return lines;
  }, [timeRange.endMinutes, timeRange.startMinutes]);

  const venueGroups = useMemo(() => {
    const map = new Map<string, Array<{ set: TimetableSet; groupCount: number; groupIndex: number }>>();

    if (compactLayout) {
      map.set("ALL", sets.map((set) => ({ set, groupCount: 1, groupIndex: 0 })));
    } else {
      for (const venue of visibleVenues) {
        map.set(venue.id, []);
      }

      for (const set of sets) {
        if (!set.venueId || !map.has(set.venueId)) continue;
        map.get(set.venueId)!.push({ set, groupCount: 1, groupIndex: 0 });
      }
    }

    for (const items of map.values()) {
      if (items.length === 0) continue;

      items.sort((a, b) => getTokyoMinutes(a.set.startAt) - getTokyoMinutes(b.set.startAt));

      let currentCluster: typeof items = [];
      let clusterEnd = -1;

      const processCluster = (cluster: typeof items) => {
        if (cluster.length === 0) return;
        const columns: typeof items[] = [];
        for (const item of cluster) {
          let placed = false;
          for (let i = 0; i < columns.length; i++) {
            const lastInColumn = columns[i][columns[i].length - 1];
            if (getTokyoMinutes(lastInColumn.set.finishAt) <= getTokyoMinutes(item.set.startAt)) {
              columns[i].push(item);
              item.groupIndex = i;
              placed = true;
              break;
            }
          }
          if (!placed) {
            item.groupIndex = columns.length;
            columns.push([item]);
          }
        }
        const maxCols = columns.length;
        for (const item of cluster) {
          item.groupCount = maxCols;
        }
      };

      for (const item of items) {
        const start = getTokyoMinutes(item.set.startAt);
        const finish = getTokyoMinutes(item.set.finishAt);

        if (start >= clusterEnd) {
          processCluster(currentCluster);
          currentCluster = [item];
          clusterEnd = finish;
        } else {
          currentCluster.push(item);
          clusterEnd = Math.max(clusterEnd, finish);
        }
      }
      processCluster(currentCluster);
    }

    return map;
  }, [sets, visibleVenues, compactLayout]);

  return (
    <div
      className={cn("group relative overflow-auto rounded-3xl border border-zinc-800 bg-background", className)}
    >
      {/* Zoom Controls */}
      <div className="sticky left-0 right-0 top-0 h-0 w-full z-50">
        <div className="absolute right-4 top-4 flex flex-col gap-[1px] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 shadow-xl backdrop-blur-md">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
            className="flex h-9 w-9 items-center justify-center bg-zinc-900/90 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ZoomIn className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="flex h-9 w-9 items-center justify-center bg-zinc-900/90 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ZoomOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
      {/* Horizontal scroll indicator gradient - left */}
      <div className="pointer-events-none sticky left-0 top-0 z-40 h-full w-0.5 bg-gradient-to-b from-cyan-500/60 via-cyan-500/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Horizontal scroll indicator gradient - right */}
      <div className="pointer-events-none sticky right-0 top-0 z-40 h-full w-0.5 bg-gradient-to-b from-cyan-500/60 via-cyan-500/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div
        className={cn("relative", compactLayout ? "w-full" : "min-w-max")}
        style={{
          width: compactLayout ? "100%" : TIME_COLUMN_WIDTH + visibleVenues.length * COLUMN_WIDTH,
          height: HEADER_HEIGHT + timeRange.height,
        }}
      >
        {!compactLayout && (
          <div className="sticky top-0 z-20 flex h-11 border-b border-zinc-800 bg-background/95 backdrop-blur">
            <div className="shrink-0 border-r border-zinc-900" style={{ width: TIME_COLUMN_WIDTH }} />
            {visibleVenues.map((venue) => (
              <div
                key={venue.id}
                className="flex shrink-0 items-center justify-center border-r border-zinc-900 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400"
                style={{ width: COLUMN_WIDTH }}
              >
                {shortVenueLabel[venue.id] ?? venue.name}
              </div>
            ))}
          </div>
        )}
        {compactLayout && (
          <div className="sticky top-0 z-20 flex h-11 border-b border-zinc-800 bg-background/95 backdrop-blur items-center px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            MY TIMETABLE
          </div>
        )}

        <div className="absolute inset-x-0 top-11 bottom-0">
          {/* Sticky time column background + labels */}
          <div className="sticky left-0 z-10 h-full w-[64px]">
            <div className="absolute inset-y-0 left-0 w-full border-r border-zinc-800 bg-background" />
            {hourLines.map((minute) => {
              const top = (minute - timeRange.startMinutes) * MINUTE_HEIGHT;
              const label = `${String(Math.floor(minute / 60)).padStart(2, "0")}:00`;
              return (
                <div
                  key={minute}
                  className="absolute left-0 flex h-4 w-full -translate-y-1/2 items-center justify-center"
                  style={{ top }}
                >
                  <span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-medium leading-none text-zinc-500 ring-1 ring-zinc-800">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {!compactLayout && visibleVenues.map((venue, index) => (
            <div
              key={venue.id}
              className="absolute top-0 bottom-0 border-r border-zinc-900/80"
              style={{
                left: TIME_COLUMN_WIDTH + index * COLUMN_WIDTH,
                width: COLUMN_WIDTH,
              }}
            />
          ))}

          {hourLines.map((minute) => {
            const top = (minute - timeRange.startMinutes) * MINUTE_HEIGHT;
            return (
              <div key={`line-${minute}`}>
                <div
                  className="absolute left-[64px] right-0 border-t border-zinc-800/80"
                  style={{ top }}
                />
                <div
                  className="absolute left-[64px] right-0 border-t border-dashed border-zinc-900/70"
                  style={{ top: top + 30 * MINUTE_HEIGHT }}
                />
              </div>
            );
          })}

          {Array.from(venueGroups.entries()).flatMap(([venueId, items]) => {
            const column = compactLayout ? 0 : venueIndex.get(venueId) ?? 0;

            return items.map(({ set, groupCount, groupIndex }) => {
              const venue = venueMap.get(set.venueId || venueId);
              if (!venue) return null;
              const startMinutes = getTokyoMinutes(set.startAt);
              const finishMinutes = getTokyoMinutes(set.finishAt);
              const top =
                (startMinutes - timeRange.startMinutes) * MINUTE_HEIGHT + BLOCK_GAP / 2;
              const height = Math.max(
                40,
                (finishMinutes - startMinutes) * MINUTE_HEIGHT - BLOCK_GAP,
              );
              const isSelected = selectedIds?.has(set.id) ?? false;
              const order = routeOrder?.get(set.id);
              const isSmall = height <= 44;
              const isNarrow = groupCount >= 3;

              const leftPos = compactLayout
                ? `calc(${TIME_COLUMN_WIDTH}px + (100% - ${TIME_COLUMN_WIDTH}px) / ${groupCount} * ${groupIndex} + ${BLOCK_GAP}px)`
                : `${TIME_COLUMN_WIDTH + column * COLUMN_WIDTH + BLOCK_GAP + ((COLUMN_WIDTH - BLOCK_GAP * 2) / groupCount) * groupIndex + (groupIndex > 0 ? BLOCK_GAP / 2 : 0)}px`;
                
              const widthPos = compactLayout
                ? `calc((100% - ${TIME_COLUMN_WIDTH}px) / ${groupCount} - ${BLOCK_GAP * 2}px)`
                : `${((COLUMN_WIDTH - BLOCK_GAP * 2) / groupCount) - (groupCount > 1 ? BLOCK_GAP / 2 : 0)}px`;

              return (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => {
                    if (onSelectSet) onSelectSet(set);
                    else onToggleFavorite?.(set.id);
                  }}
                  className={cn(
                    "group absolute flex flex-col overflow-hidden rounded-lg border text-left transition-all duration-200 hover:brightness-110 active:scale-[0.97]",
                    isSmall ? "px-1 py-0.5 justify-center" : "px-2 py-1",
                    onSelectSet || onToggleFavorite ? "cursor-pointer" : "cursor-default",
                    isSelected
                      ? "ring-2 ring-white/30"
                      : "opacity-85 hover:opacity-100",
                  )}
                  style={{
                    left: leftPos,
                    top,
                    width: widthPos,
                    height,
                    background: isSelected
                      ? `linear-gradient(180deg, ${hexToRgba(
                        venue.color,
                        0.95,
                      )}, ${hexToRgba(venue.color, 0.88)})`
                      : `linear-gradient(180deg, rgba(60, 60, 60, 0.9), rgba(45, 45, 45, 0.85))`,
                    borderColor: isSelected
                      ? hexToRgba(venue.color, 0.95)
                      : "rgba(80, 80, 80, 0.6)",
                    boxShadow: isSelected
                      ? `0 8px 18px ${hexToRgba(venue.color, 0.24)}`
                      : "0 4px 8px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div className={cn("flex min-w-0 flex-1 flex-col", isSmall ? "justify-center w-full" : "")}>
                    {!isSmall && (
                      <div className={cn(
                        "flex w-full items-center justify-between",
                        isNarrow ? "gap-0 flex-col items-start" : "gap-1"
                      )}>
                        <div className={cn("font-semibold leading-none text-white/90", isNarrow ? "text-[9px]" : "text-[10px]")}>
                          {formatTime(set.startAt)}
                          <span className="text-white/60">-{formatTime(set.finishAt)}</span>
                        </div>
                        {order ? (
                          <span className={cn(
                            "inline-flex shrink-0 items-center justify-center rounded-full bg-black/30 font-bold text-white",
                            isNarrow ? "h-3 w-3 text-[8px] mt-0.5" : "h-4 w-4 text-[9px]"
                          )}>
                            {order}
                          </span>
                        ) : null}
                      </div>
                    )}
                    <div className={cn(
                      "min-w-0 font-bold leading-tight",
                      isSelected ? "text-white" : "text-gray-300",
                      isSmall ? "text-[11px] line-clamp-3 mt-0" : "mt-1 text-xs"
                    )}>
                      {set.artistName}
                    </div>
                    {!isSmall && compactLayout && (
                      <div className={cn("mt-auto min-w-0 text-[10px] leading-tight", isSelected ? "text-white/78" : "text-gray-400")}>
                        {set.stageName}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          })}
        </div>
      </div>
    </div>
  );
});
