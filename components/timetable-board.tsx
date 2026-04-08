"use client";

import { useMemo } from "react";
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

export function TimetableBoard({
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

  return (
    <div className={cn("group relative overflow-auto rounded-[28px] border border-zinc-800 bg-[#050505]", className)}>
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
        <div className="sticky top-0 z-20 flex h-11 border-b border-zinc-800 bg-[#050505]/95 backdrop-blur">
          <div className="sticky left-0 z-30 w-[54px] border-r border-zinc-800 bg-[#050505]/95" />
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
            const label = `${String(Math.floor(minute / 60)).padStart(2, "0")}:00`;
            return (
              <div key={minute}>
                <div
                  className="absolute left-0 right-0 border-t border-zinc-800/80"
                  style={{ top }}
                />
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-zinc-900/70"
                  style={{ top: top + 30 * MINUTE_HEIGHT }}
                />
                <div
                  className="sticky left-0 z-10 flex h-0 w-[54px] justify-center"
                  style={{ top }}
                >
                  <span className="translate-y-[-8px] rounded-full bg-[#050505] px-1 text-[10px] font-medium text-zinc-500">
                    {label}
                  </span>
                </div>
              </div>
            );
          })}

          {sets.map((set) => {
            if (!set.venueId || !venueIndex.has(set.venueId)) {
              return null;
            }

            const column = venueIndex.get(set.venueId)!;
            const venue = venueMap.get(set.venueId);
            if (!venue) {
              return null;
            }

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
                onClick={() => onSelectSet?.(set)}
                className={cn(
                  "group absolute overflow-hidden rounded-2xl border px-2 py-1.5 text-left transition-all duration-300 hover:-translate-y-0.5",
                  onSelectSet ? "cursor-pointer" : "cursor-default",
                  isSelected
                    ? "ring-2 ring-white/30"
                    : "opacity-85 hover:opacity-100",
                )}
                style={{
                  left: TIME_COLUMN_WIDTH + column * COLUMN_WIDTH + BLOCK_GAP,
                  top,
                  width: COLUMN_WIDTH - BLOCK_GAP * 2,
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
                {/* Favorite heart button on the left */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite?.(set.id);
                  }}
                  className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/40 text-xs opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
                  aria-label="Toggle favorite"
                >
                  <span className={`transition-colors ${isSelected ? "text-red-400" : "text-white/60"}`}>
                    {isSelected ? "♥" : "♡"}
                  </span>
                </button>

                {order ? (
                  <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/30 text-[10px] font-bold text-white">
                    {order}
                  </span>
                ) : null}
                <div className="pr-6 text-[10px] font-semibold leading-none text-white/90">
                  {formatTime(set.startAt)}
                </div>
                <div className={cn("mt-1 line-clamp-3 text-sm font-bold leading-4", isSelected ? "text-white" : "text-gray-300")}>
                  {set.artistName}
                </div>
                {height >= 66 ? (
                  <div className={cn("mt-1 text-[10px] leading-3", isSelected ? "text-white/78" : "text-gray-400")}>
                    {formatTime(set.finishAt)} · {set.stageName}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
