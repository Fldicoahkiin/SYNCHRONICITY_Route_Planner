"use client";

import { useMemo, memo } from "react";
import { venues, venueMap } from "@/lib/data/venues";
import type { TimetableSet } from "@/lib/data/timetable";
import { formatTime } from "@/lib/utils/route-planner";
import { cn } from "@/lib/utils";

const HEADER_HEIGHT = 44;
const TIME_COLUMN_WIDTH = 54;
const COLUMN_WIDTH = 120;
const MINUTE_HEIGHT = 2.35;
const BLOCK_GAP = 4;

const shortVenueLabel: Record<string, string> = {
  "o-east": "O-EAST",
  duo: "duo",
  "o-west": "O-WEST",
  clubasia: "clubasia",
  "o-nest": "O-nest",
  quattro: "QUATTRO",
  veats: "Veats",
  www: "WWW",
  wwwx: "WWWX",
  "tokio-tokyo": "TOKIO",
  fows: "FOWS",
  "7thfloor": "7thFLOOR",
};

interface TimetableBoardProps {
  sets: TimetableSet[];
  frameSets?: TimetableSet[];
  selectedIds?: Set<string>;
  routeOrder?: Map<string, number>;
  onlyActiveVenues?: boolean;
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
  onSelectSet,
  onToggleFavorite,
  className,
}: TimetableBoardProps) {
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
  }, [framingSets]);

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
    for (const venue of visibleVenues) {
      map.set(venue.id, []);
    }
    
    for (const set of sets) {
      if (!set.venueId || !map.has(set.venueId)) continue;
      map.get(set.venueId)!.push({ set, groupCount: 1, groupIndex: 0 });
    }

    for (const items of map.values()) {
      if (items.length === 0) continue;
      
      items.sort((a, b) => a.set.startAt - b.set.startAt);
      
      const columns: typeof items[] = [];
      for (const item of items) {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
          const lastInColumn = columns[i][columns[i].length - 1];
          if (lastInColumn.set.finishAt <= item.set.startAt) {
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
      for (const item of items) {
        item.groupCount = maxCols;
      }
    }
    
    return map;
  }, [sets, visibleVenues]);

  return (
    <div
      className={cn("group relative overflow-x-auto rounded-3xl border border-zinc-800 bg-background", className)}
      style={{ overflowY: "clip" }}
    >
      {/* Horizontal scroll indicator gradient - left */}
      <div className="pointer-events-none sticky left-0 top-0 z-40 h-full w-0.5 bg-gradient-to-b from-cyan-500/60 via-cyan-500/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Horizontal scroll indicator gradient - right */}
      <div className="pointer-events-none sticky right-0 top-0 z-40 h-full w-0.5 bg-gradient-to-b from-cyan-500/60 via-cyan-500/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div
        className="relative min-w-max"
        style={{
          width: TIME_COLUMN_WIDTH + visibleVenues.length * COLUMN_WIDTH,
          height: HEADER_HEIGHT + timeRange.height,
        }}
      >
        <div className="sticky top-0 z-20 flex h-11 border-b border-zinc-800 bg-background/95 backdrop-blur">
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

        <div className="absolute inset-x-0 top-11 bottom-0">
          {/* Sticky time column background + labels */}
          <div className="sticky left-0 z-10 h-full w-[54px]">
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

          {visibleVenues.map((venue, index) => (
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
                  className="absolute left-[54px] right-0 border-t border-zinc-800/80"
                  style={{ top }}
                />
                <div
                  className="absolute left-[54px] right-0 border-t border-dashed border-zinc-900/70"
                  style={{ top: top + 30 * MINUTE_HEIGHT }}
                />
              </div>
            );
          })}

          {Array.from(venueGroups.entries()).flatMap(([venueId, items]) => {
            const column = venueIndex.get(venueId)!;
            const venue = venueMap.get(venueId);
            if (!venue) return null;

            return items.map(({ set, groupCount, groupIndex }) => {
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

            return (
              <button
                key={set.id}
                type="button"
                onClick={() => {
                  if (onSelectSet) {
                    onSelectSet(set);
                  } else {
                    onToggleFavorite?.(set.id);
                  }
                }}
                className={cn(
                  "group absolute flex flex-col rounded-lg border px-2 py-1 text-left transition-all duration-300 hover:-translate-y-0.5",
                  onSelectSet || onToggleFavorite ? "cursor-pointer" : "cursor-default",
                  isSelected
                    ? "ring-2 ring-white/30"
                    : "opacity-85 hover:opacity-100",
                )}
                style={{
                  left: TIME_COLUMN_WIDTH + column * COLUMN_WIDTH + BLOCK_GAP + ((COLUMN_WIDTH - BLOCK_GAP * 2) / groupCount) * groupIndex,
                  top,
                  width: (COLUMN_WIDTH - BLOCK_GAP * 2) / groupCount,
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
                <div className="flex min-w-0 items-center justify-between gap-1">
                  <div className="text-[10px] font-semibold leading-none text-white/90">
                    {formatTime(set.startAt)}
                    <span className="text-white/60">-{formatTime(set.finishAt)}</span>
                  </div>
                  {order ? (
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-black/30 text-[9px] font-bold text-white">
                      {order}
                    </span>
                  ) : null}
                </div>
                <div className={cn("mt-1 min-w-0 text-xs font-bold leading-tight", isSelected ? "text-white" : "text-gray-300")}>
                  {set.artistName}
                </div>
                <div className={cn("mt-auto min-w-0 text-[10px] leading-tight", isSelected ? "text-white/78" : "text-gray-400")}>
                  {set.stageName}
                </div>
              </button>
            );
          })})}
        </div>
      </div>
    </div>
  );
});
